const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { isDJ } = require("../../utils/perms");
const config = require("../../config");

module.exports = {
  name: "volume",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Set the playback volume")
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription(`Volume level (1-${config.music.maxVolume})`)
        .setMinValue(1)
        .setMaxValue(config.music.maxVolume)
    ),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Changing volume requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    const level = interaction.options.getInteger("level");
    if (level == null) {
      return replyV2(
        interaction,
        successContainer(`Current volume: **${player.volume}%**. Pass a level between 1 and ${config.music.maxVolume} to change it. 🔊`, {
          title: "🔊 Volume",
        })
      );
    }
    player.setVolume(level);
    await sendOrUpdateCard(client, player);
    await replyV2(interaction, successContainer(`Volume set to **${level}%**. 🔊`, { title: "🔊 Volume updated" }));
  },
};
