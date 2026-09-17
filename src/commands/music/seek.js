const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { parseDuration, formatDuration } = require("../../utils/format");
const { isDJ } = require("../../utils/perms");

module.exports = {
  name: "seek",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("Seek to a position in the current track")
    .addStringOption((option) =>
      option.setName("position").setDescription("Position — e.g. 90, 1:30 or 2m10s").setRequired(true)
    ),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Seeking requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    const track = player.current;
    if (!track) {
      return replyV2(interaction, errorContainer("Nothing is playing right now. 🤷"));
    }
    if (!track.isSeekable || track.isStream) {
      return replyV2(interaction, errorContainer("This track is a live stream and cannot be seeked. 🔴"));
    }
    const ms = parseDuration(interaction.options.getString("position", true));
    if (ms == null) {
      return replyV2(
        interaction,
        errorContainer("Couldn't understand that position. Use formats like `90`, `1:30` or `2m10s`. ⏱️")
      );
    }
    if (ms > track.duration) {
      return replyV2(
        interaction,
        errorContainer(`That position is beyond the track length (\`${formatDuration(track.duration)}\`). ⏱️`)
      );
    }
    await player.seek(ms);
    await sendOrUpdateCard(client, player);
    await replyV2(interaction, successContainer(`Seeked to \`${formatDuration(ms)}\`. ⏱️`, { title: "⏱️ Seeked" }));
  },
};
