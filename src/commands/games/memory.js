const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const EMOJIS = ["🍒", "🍋", "🍇", "⭐", "💎", "🔔", "🍀", "🌙"];

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = {
  name: "memory",
  category: "games",
  data: new SlashCommandBuilder().setName("memory").setDescription("Match all the emoji pairs!"),
  cooldown: 5,
  async execute(interaction, client) {
    const gameId = randomId();
    const deck = shuffle([...EMOJIS, ...EMOJIS]); // 16 cards
    const state = {
      type: "mem",
      deck,
      revealed: new Set(), // indexes currently face-up (max 2)
      matched: new Set(), // permanently matched
      player: interaction.user.id,
      moves: 0,
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 10 * 60 * 1000);

    const rows = buildRows(state, gameId);
    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🧠 Memory Match`),
        text(`**Moves:** 0 • **Matched:** 0/8`),
        separator(),
        ...rows,
        text(`-# Click two cards to reveal them — find all 8 pairs!`),
      ])
    );
  },
};

function buildRows(state, gameId) {
  const rows = [];
  for (let r = 0; r < 4; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 4; c++) {
      const index = r * 4 + c;
      const faceUp = state.matched.has(index) || state.revealed.has(index);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mem:${gameId}:${index}`)
          .setLabel(faceUp ? "\u200b" : "?")
          .setEmoji(faceUp ? state.deck[index] : undefined)
          .setStyle(state.matched.has(index) ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(state.matched.has(index))
      );
    }
    rows.push(row);
  }
  return rows;
}

module.exports.buildRows = buildRows;
module.exports.EMOJIS = EMOJIS;
