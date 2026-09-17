const { SlashCommandBuilder } = require("discord.js");
const { handlePlayRequest } = require("../../music/playCore");

module.exports = {
  name: "search",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for tracks and queue one from a selection menu")
    .addStringOption((option) =>
      option.setName("query").setDescription("What do you want to search for?").setRequired(true)
    ),
  cooldown: 3,
  async execute(interaction, client) {
    await handlePlayRequest(interaction, client, interaction.options.getString("query", true));
  },
};
