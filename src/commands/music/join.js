const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");

module.exports = {
  name: "join",
  category: "music",
  data: new SlashCommandBuilder().setName("join").setDescription("Summon the bot to your voice channel"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client, { requirePlayer: false });
    if (!player) return;
    await replyV2(
      interaction,
      successContainer(`Connected to <#${interaction.member.voice.channelId}>. Use </play:0> to start the party! 🎶`, {
        title: "🔌 Connected",
      })
    );
  },
};
