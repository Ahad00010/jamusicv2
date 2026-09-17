const { SlashCommandBuilder } = require("discord.js");
const { gate } = require("../../music/utils");
const { sendQueueView } = require("../../music/views");

module.exports = {
  name: "queue",
  category: "music",
  data: new SlashCommandBuilder().setName("queue").setDescription("View the current queue"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    await sendQueueView(interaction, player, "queue");
  },
};
