const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const QUESTIONS = [
  ["Have unlimited music streaming forever", "Have every game ever made for free"],
  ["Be able to fly", "Be able to turn invisible"],
  ["Live without music", "Live without the internet"],
  ["Meet your favorite artist", "Get 10,000 coins right now"],
  ["Always be 10 minutes late", "Always be 20 minutes early"],
  ["Have a pause button for life", "Have a rewind button"],
  ["Explore deep space", "Explore the deep ocean"],
];

module.exports = {
  name: "wouldyourather",
  category: "games",
  data: new SlashCommandBuilder().setName("wouldyourather").setDescription("Would you rather… tough choices!"),
  cooldown: 3,
  async execute(interaction, client) {
    const gameId = randomId();
    const [a, b] = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const state = { type: "wyr", options: [a, b], votes: [new Set(), new Set()], startedAt: Date.now() };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 10 * 60 * 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`wyr:${gameId}:0`).setLabel("Option 1").setEmoji("🅰️").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`wyr:${gameId}:1`).setLabel("Option 2").setEmoji("🅱️").setStyle(ButtonStyle.Primary)
    );

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🤔 Would you rather…`),
        text(`**🅰️ ${a}**\n\n**🅱️ ${b}**`),
        separator(),
        row,
        text(`-# Vote to see the tally — everyone can vote!`),
      ])
    );
  },
};

module.exports.QUESTIONS = QUESTIONS;
