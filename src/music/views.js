const { container, text, separator, paginate } = require("../utils/v2");
const { formatDuration, truncate } = require("../utils/format");

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
  const buildPage =
    kind === "history"
      ? (page) => historyPage(player, page).built
      : (page) => queuePage(player, page).built;
  const totalPages = kind === "history" ? historyPage(player, 1).totalPages : buildQueuePages(player);
  return paginate(interaction, { id, totalPages, buildPage, ephemeral: true });
}

module.exports = { queuePage, historyPage, buildQueuePages, sendQueueView, trackLine, PAGE_SIZE };
