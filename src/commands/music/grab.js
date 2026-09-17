const { SlashCommandBuilder } = require("discord.js");
const { replyV2, text, separator, thumbnail, container } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const { gate } = require("../../music/utils");
const { formatDuration, truncate } = require("../../utils/format");
const { warningContainer } = require("../../utils/v2");

module.exports = {
  name: "grab",
  category: "music",
  data: new SlashCommandBuilder().setName("grab").setDescription("Get the current track info in a private message-style reply"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    const track = player.current;
    if (!track) {
      return replyV2(interaction, warningContainer("Nothing is playing right now. 🎶", { ephemeral: true }));
    }

    const children = [
      text(`### 🔖 Track Grabbed`),
    ];
    const info = `**${truncate(track.title, 90)}**\n-# ${truncate(track.author, 60)} • \`${
      track.isStream ? "LIVE" : formatDuration(track.duration)
    }\` • \`${track.sourceName}\`${track.uri ? `\n${track.uri}` : ""}`;

    if (track.artworkUrl) {
      children.push(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(info))
          .setThumbnailAccessory(thumbnail(track.artworkUrl, truncate(track.title, 80)))
      );
    } else {
      children.push(text(info));
    }
    children.push(separator());
    children.push(text(`-# Requested by ${track.requester ? `<@${track.requester.id ?? track.requester}>` : "unknown"} in ${interaction.guild.name}`));

    await replyV2(interaction, container(0x9b59b6, children), { ephemeral: true });
  },
};
