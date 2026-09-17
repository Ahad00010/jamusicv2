const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SectionBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { container, text, separator, thumbnail } = require("../utils/v2");
const { formatDuration, progressBar, truncate } = require("../utils/format");
const { getActiveFilters } = require("./filters");

function button(customId, label, emoji, style, disabled = false) {
  return new ButtonBuilder().setCustomId(customId).setLabel(label).setEmoji(emoji).setStyle(style).setDisabled(disabled);
}

const LOOP_LABELS = { off: "Off", track: "Track", queue: "Queue" };

function controlRows() {
  return [
    new ActionRowBuilder().addComponents(
      button("music:back", "Back", "⏮", ButtonStyle.Secondary),
      button("music:playpause", "Pause / Resume", "⏯", ButtonStyle.Primary),
      button("music:skip", "Skip", "⏭", ButtonStyle.Secondary),
      button("music:loop", "Loop", "🔁", ButtonStyle.Secondary),
      button("music:shuffle", "Shuffle", "🔀", ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      button("music:showqueue", "Queue", "📜", ButtonStyle.Secondary),
      button("music:history", "History", "🕘", ButtonStyle.Secondary),
      button("music:volume", "Volume", "🔊", ButtonStyle.Secondary),
      button("music:filters", "Filters", "🎛️", ButtonStyle.Secondary),
      button("music:autoplay", "Autoplay", "🤖", ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      button("music:stop", "Stop & Leave", "⏹", ButtonStyle.Danger)
    ),
  ];
}

/** Builds the live Components V2 player card for a player. */
function buildPlayerCard(player) {
  const track = player.current;
  const filters = getActiveFilters(player);
  const children = [];

  if (track) {
    const title = `### 🎵 ${player.paused ? "⏸ Paused" : "▶ Now Playing"}`;
    const body = `**${truncate(track.title, 90)}**\n-# ${truncate(track.author, 60)} • \`${track.sourceName}\`${track.uri ? ` • [Link](${track.uri})` : ""}`;

    if (track.artworkUrl) {
      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(body))
        .setThumbnailAccessory(thumbnail(track.artworkUrl, truncate(track.title, 80)));
      children.push(section);
    } else {
      children.push(text(title), text(body));
    }

    children.push(separator());
    if (track.isStream) {
      children.push(text(`` + `**🔴 LIVE STREAM** • Elapsed: ${formatDuration(player.current.position)}`));
    } else {
      children.push(
        text(
          `**${progressBar(player.current.position, track.duration, 18)}**\n` +
            `\`${formatDuration(player.current.position)} / ${formatDuration(track.duration)}\``
        )
      );
    }
  } else {
    children.push(text(`### 🎵 JaMusic Player`), text(`Nothing is playing right now.`));
  }

  children.push(separator());
  for (const row of controlRows()) children.push(row);
  children.push(separator());

  const status = [
    `Requested by ${track?.requester ? `<@${track.requester.id ?? track.requester}>` : "unknown"}`,
    `Volume: **${player.volume}%**`,
    `Loop: **${LOOP_LABELS[player.loop] || "Off"}**`,
    `Queue: **${player.queue.size}** track${player.queue.size === 1 ? "" : "s"}`,
    `Autoplay: **${player.autoPlay ? "On" : "Off"}**`,
    filters.length ? `Filters: **${filters.join(", ")}**` : null,
  ].filter(Boolean);

  children.push(text(`-# ${status.join(" • ")}`));

  return container(0x9b59b6, children);
}

/** "Queue ended" / stopped state card. */
function buildEndedCard(reason = "Queue finished!") {
  return container(0x2f3136, [
    text(`### 🎵 JaMusic Player`),
    text(`👋 ${reason}`),
    separator(),
    text(`-# Use </play:0> to start the music again.`),
  ]);
}

module.exports = { buildPlayerCard, buildEndedCard, controlRows, LOOP_LABELS };
