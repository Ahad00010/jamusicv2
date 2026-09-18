const { SlashCommandBuilder } = require("discord.js");
const { replyV2, text, separator, thumbnail, container } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { gate } = require("../../music/utils");
const { formatDuration, truncate, progressBar } = require("../../utils/format");
const { getActiveFilters } = require("../../music/filters");
const { warningContainer } = require("../../utils/v2");

module.exports = {
  name: "nowplaying",
  category: "music",
  data: new SlashCommandBuilder().setName("nowplaying").setDescription("Show what's currently playing"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    const track = player.current;
    if (!track) {
      return replyV2(interaction, warningContainer("Nothing is playing right now — start something with </play:0>! 🎶"));
    }

    const filters = getActiveFilters(player);
    const progress = track.isStream
      ? `**🔴 LIVE** • Elapsed: \`${formatDuration(player.current.position)}\``
      : `**${progressBar(player.current.position, track.duration, 22)}**\n\`${formatDuration(
          player.current.position
        )} / ${formatDuration(track.duration)}\``;

    const children = [];
    const infoLine = `**${truncate(track.title, 90)}**\n-# ${truncate(track.author, 60)} • \`${track.sourceName}\`${
      track.uri ? ` • [Link](${track.uri})` : ""
    }`;

    if (track.artworkUrl) {
      children.push(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🎵 Now Playing`))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(infoLine))
          .setThumbnailAccessory(thumbnail(track.artworkUrl, truncate(track.title, 80)))
      );
    } else {
      children.push(text(`### 🎵 Now Playing`), text(infoLine));
    }

    children.push(separator());
    children.push(text(progress));
    children.push(separator());
    children.push(
      text(
        [
          `-# Requested by ${track.requester ? `<@${track.requester.id ?? track.requester}>` : "unknown"}`,
          `-# Volume: **${player.volume}%** • Loop: **${player.loop}** • Queue: **${player.queue.size}** • Autoplay: **${player.autoPlay ? "On" : "Off"}**`,
          filters.length ? `-# Filters: **${filters.join(", ")}**` : null,
        ]
          .filter(Boolean)
          .join("\n")
      )
    );

    children.push(separator());
    children.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("music:lyrics").setLabel("View Lyrics").setEmoji("🎤").setStyle(ButtonStyle.Secondary)
      )
    );

    await replyV2(interaction, container(0x9b59b6, children));
  },
};
