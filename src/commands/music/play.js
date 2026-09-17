const { SlashCommandBuilder } = require("discord.js");
const { handlePlayRequest } = require("../../music/playCore");

module.exports = {
  name: "play",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song or playlist by URL or search term")
    .addStringOption((option) =>
      option.setName("query").setDescription("Song name or URL (YouTube, SoundCloud, Spotify, …)").setRequired(true)
    ),
  cooldown: 3,
  async execute(interaction, client) {
    await handlePlayRequest(interaction, client, interaction.options.getString("query", true));
  },
};
