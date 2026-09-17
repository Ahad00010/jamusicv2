const { SlashCommandBuilder } = require("discord.js");
const { gate } = require("../../music/utils");
const { sendQueueView } = require("../../music/views");

module.exports = {
  name: "history",
  category: "music",
  data: new SlashCommandBuilder().setName("history").setDescription("View tracks played in this session"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    await sendQueueView(interaction, player, "history");
  },
};
