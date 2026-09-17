const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, warningContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");

module.exports = {
  name: "replay",
  category: "music",
  data: new SlashCommandBuilder().setName("replay").setDescription("Restart the current track from the beginning"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!player.current) {
      return replyV2(interaction, warningContainer("Nothing is playing right now. 🤷", { title: "⚠️ Nothing playing" }));
    }
    await player.replay();
    await replyV2(
      interaction,
      successContainer(`Restarted **${player.current.title}** from the beginning. 🔄`, { title: "🔄 Replaying" })
    );
  },
};
