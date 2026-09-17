const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { cleanupGuildMusic } = require("../../music/manager");

module.exports = {
  name: "leave",
  category: "music",
  data: new SlashCommandBuilder().setName("leave").setDescription("Disconnect the bot from voice"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    const channelName = interaction.guild.channels.cache.get(player.voiceChannelId)?.name || "voice";
    cleanupGuildMusic(client, interaction.guildId);
    await player.destroy().catch(() => {});
    await replyV2(
      interaction,
      successContainer(`Disconnected from **${channelName}**. See you soon! 👋`, { title: "👋 Left voice" })
    );
  },
};
