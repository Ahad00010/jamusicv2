const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");
const economy = require("../../database/economy");

const WORDS = [
  "javascript",
  "lavalink",
  "discord",
  "moonlink",
  "component",
  "economy",
  "guitar",
  "neon",
  "robot",
  "wizard",
  "galaxy",
  "pixel",
  "thunder",
  "shadow",
  "crystal",
  "horizon",
  "puzzle",
  "voyage",
  "melody",
  "rhythm",
];

const STAGES = ["😀", "🙂", "😐", "😟", "😰", "💀"];

module.exports = {
  name: "hangman",
  category: "games",
  data: new SlashCommandBuilder().setName("hangman").setDescription("Guess the word one letter at a time"),
  cooldown: 5,
  async execute(interaction, client) {
    const gameId = randomId();
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];

    const state = {
      type: "hang",
      word,
      guessed: new Set(),
      wrong: 0,
      player: interaction.user.id,
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 10 * 60 * 1000);

    const masked = word.replace(/[a-z]/g, "_");
    const select = new StringSelectMenuBuilder()
      .setCustomId(`hang:${gameId}:guess`)
      .setPlaceholder("Pick a letter…")
      .addOptions("abcdefghijklmnopqrstuvwxyz".split("").map((l) => ({ label: l.toUpperCase(), value: l, emoji: "🔤" })));

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🪢 Hangman`),
        text(`\`${masked.split("").join(" ")}\``),
        text(`-# Wrong guesses: 0/6 ${STAGES[0]}`),
        separator(),
        new ActionRowBuilder().addComponents(select),
        text(`-# Only you can guess — 6 wrong guesses and it's over!`),
      ])
    );
  },
};

module.exports.STAGES = STAGES;
