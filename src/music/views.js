const { container, text, separator, paginate } = require("../utils/v2");
const { formatDuration, truncate } = require("../utils/format");
const { currentLineIndex, fetchLyricsFor } = require("./lyrics");
const config = require("../config");

const PAGE_SIZE = 10;

function trackLine(index, track, showRequester = true) {
  const num = String(index + 1).padStart(3, " ");
  const duration = track.isStream ? "LIVE" : formatDuration(track.duration);
  const requester = showRequester && track.requester ? ` — <@${track.requester.id ?? track.requester}>` : "";
  return `\`${num}.\` **${truncate(track.title, 64)}** • \`${duration}\`${requester}\n` +
    `-# ${truncate(track.author, 60)}${track.uri ? ` • <${track.uri}>` : ""}`;
}

/** Builds a paginated queue view (V2 container) for a player. */
function buildQueuePages(player) {
  const tracks = player.queue.all;
  const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  return totalPages;
}

function queuePage(player, page) {
  const tracks = player.queue.all;
  const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = tracks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const children = [
    text(`## 📜 Server Queue`),
    text(
      `-# ${player.queue.size} track${player.queue.size === 1 ? "" : "s"} queued • Total length: \`${formatDuration(
        player.queue.duration || player.queue.remainingDuration
      )}\`${player.loop !== "off" ? ` • 🔁 Loop: ${player.loop}` : ""}`
    ),
    separator(),
  ];

  if (!slice.length) {
    children.push(text(`The queue is empty. Add something with </play:0>! 🎶`));
  } else {
    children.push(text(slice.map((t, i) => trackLine((safePage - 1) * PAGE_SIZE + i, t)).join("\n\n")));
  }

  children.push(separator());
  children.push(
    text(
      `-# Now playing: ${player.current ? `**${truncate(player.current.title, 50)}**` : "*nothing*"} • Autoplay: **${
        player.autoPlay ? "On" : "Off"
      }**`
    )
  );

  const built = container(0x9b59b6, children);
  return { built, totalPages };
}

/** History view builder over player.previous (most recent first). */
function historyPage(player, page) {
  const tracks = [...player.previous].reverse();
  const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = tracks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const children = [
    text(`## 🕘 Playback History`),
    text(`-# ${tracks.length} played track${tracks.length === 1 ? "" : "s"} in this session (most recent first)`),
    separator(),
  ];

  if (!slice.length) {
    children.push(text(`No tracks have been played yet this session.`));
  } else {
    children.push(text(slice.map((t, i) => trackLine((safePage - 1) * PAGE_SIZE + i, t)).join("\n\n")));
  }

  return { built: container(0x9b59b6, children), totalPages };
}

/** Sends a paginated queue/history view as an ephemeral reply. */
async function sendQueueView(interaction, player, kind) {
  const id = kind === "history" ? `hist:${interaction.guildId}` : `queue:${interaction.guildId}`;
  // Returning the { built, totalPages } wrapper lets every page refresh the page
  // count, so the view stays truthful when the queue grows or shrinks.
  const buildPage = kind === "history" ? (page) => historyPage(player, page) : (page) => queuePage(player, page);
  const totalPages = kind === "history" ? historyPage(player, 1).totalPages : buildQueuePages(player);
  return paginate(interaction, { id, totalPages, buildPage, ephemeral: true });
}

/**
 * Renders one page of LRCLIB lyrics for the playing track.
 * Synced lyrics show their timestamp and the line being sung right now is
 * highlighted, so the view stays useful while the song keeps playing.
 */
function lyricsPage(player, lyrics, page) {
  const pageSize = config.music.lyricsPageLines;
  const lines = lyrics.lines;
  const totalPages = Math.max(1, Math.ceil(lines.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const slice = lines.slice((safePage - 1) * pageSize, safePage * pageSize);
  const position = player?.current?.position ?? 0;
  const current = lyrics.synced ? currentLineIndex(lines, position) : -1;

  const title = lyrics.name || player?.current?.title || "Unknown track";
  const artist = lyrics.artist || player?.current?.author || "Unknown artist";
  const meta = [
    truncate(artist, 60),
    lyrics.album ? truncate(lyrics.album, 40) : null,
    lyrics.synced ? "Synced" : "Plain",
    lyrics.provider,
  ]
    .filter(Boolean)
    .join(" • ");

  const children = [text(`## 🎤 Lyrics`), text(`**${truncate(title, 90)}**\n-# ${meta}`), separator()];

  if (!slice.length) {
    children.push(text(`These lyrics are only blank lines. 🎼`));
  } else {
    const first = (safePage - 1) * pageSize;
    children.push(
      text(
        slice
          .map((line, i) => {
            const index = first + i;
            const stamp = line.time === null ? "" : `\`[${formatDuration(line.time)}]\` `;
            const body = truncate(line.text, 120);
            return index === current ? `${stamp}**▶ ${body}**` : `${stamp}${body}`;
          })
          .join("\n")
      )
    );
  }

  children.push(separator());
  children.push(
    text(
      `-# Lines ${slice.length ? (safePage - 1) * pageSize + 1 : 0}–${(safePage - 1) * pageSize + slice.length} of ${
        lines.length
      }${lyrics.synced ? ` • Now at \`${formatDuration(position)}\`` : ""}`
    )
  );

  return container(0x9b59b6, children);
}

/** Identity of the track a view was built for (identifier > uri > title). */
function currentTrackKey(player) {
  const track = player?.current;
  if (!track) return null;
  return track.identifier || track.uri || track.title || null;
}

/**
 * Sends the paginated lyrics view as an ephemeral reply.
 * The interaction must already be deferred (network fetch), and the view opens on
 * the page holding the line that is playing right now. Pages never expire, so the
 * builder re-checks the song: if playback moved on while the view was open, the
 * lyrics are re-fetched so the page does not show the previous track.
 */
async function sendLyricsView(interaction, player, lyrics) {
  const pageSize = config.music.lyricsPageLines;
  const totalPages = Math.max(1, Math.ceil(lyrics.lines.length / pageSize));
  const position = player?.current?.position ?? 0;
  const current = lyrics.synced ? currentLineIndex(lyrics.lines, position) : -1;
  const startPage = current >= 0 ? Math.floor(current / pageSize) + 1 : 1;
  const trackKey = currentTrackKey(player);

  return paginate(interaction, {
    id: `lyrics:${interaction.guildId}`,
    totalPages,
    buildPage: async (page) => {
      let active = lyrics;
      if (currentTrackKey(player) !== trackKey) {
        const fresh = await fetchLyricsFor(player);
        if (fresh.status === "ok") active = fresh;
      }
      const pages = Math.max(1, Math.ceil(active.lines.length / pageSize));
      return { built: lyricsPage(player, active, Math.min(page, pages)), totalPages: pages };
    },
    ephemeral: true,
    deferred: true,
    startPage,
  });
}

module.exports = {
  queuePage,
  historyPage,
  buildQueuePages,
  sendQueueView,
  lyricsPage,
  sendLyricsView,
  trackLine,
  PAGE_SIZE,
};
