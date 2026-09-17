const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const TRUTHS = [
  "What's the most embarrassing song on your playlist?",
  "Who was your first crush?",
  "What's the weirdest thing you've eaten?",
  "What's a secret talent nobody knows about?",
  "What's the last lie you told?",
  "What app do you waste the most time on?",
  "What's your most irrational fear?",
];

const DARES = [
  "Text the 5th person in your DMs 'the pigeons know'.",
  "Do 10 jumping jacks right now.",
  "Change your status to 'professionally silly' for an hour.",
  "Send a voice message singing your favorite chorus.",
  "Say the alphabet backwards in this channel.",
  "Talk in an accent for the next 10 minutes.",
  "Post the last photo you took (safe ones only!).",
];

module.exports = {
  name: "truthdare",
  category: "games",
  data: new SlashCommandBuilder().setName("truthdare").setDescription("Truth or dare!"),
  cooldown: 3,
  async execute(interaction, client) {
    const gameId = randomId();
    const state = { type: "td", player: interaction.user.id, startedAt: Date.now() };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 5 * 60 * 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`td:${gameId}:truth`).setLabel("Truth 🙊").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`td:${gameId}:dare`).setLabel("Dare 🔥").setStyle(ButtonStyle.Danger)
    );

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🙊 Truth or Dare`),
        text(`<@${interaction.user.id}>, choose wisely…`),
        separator(),
        row,
      ])
    );
  },
};

module.exports.TRUTHS = TRUTHS;
module.exports.DARES = DARES;
