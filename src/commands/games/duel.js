const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const HP_BAR = (hp, max = 100) => {
  const filled = Math.round((hp / max) * 10);
  return `${"🟩".repeat(filled)}${"⬜".repeat(10 - filled)} \`${hp} HP\``;
};

module.exports = {
  name: "duel",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Turn-based HP battle against another member")
    .addUserOption((option) => option.setName("opponent").setDescription("Who are you fighting?").setRequired(true)),
  cooldown: 5,
  async execute(interaction, client) {
    const opponent = interaction.options.getUser("opponent", true);
    if (opponent.bot || opponent.id === interaction.user.id) {
      return replyV2(interaction, errorContainer("Pick a human opponent other than yourself. 🧍"));
    }

    const gameId = randomId();
    const state = {
      type: "duel",
      players: [interaction.user.id, opponent.id],
      hp: [100, 100],
      turn: 0,
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 10 * 60 * 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`duel:${gameId}:attack`).setLabel("Attack ⚔️").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`duel:${gameId}:defend`).setLabel("Defend 🛡️").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`duel:${gameId}:heal`).setLabel("Heal 💊").setStyle(ButtonStyle.Success)
    );

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## ⚔️ DUEL!`),
        text(
          `<@${state.players[0]}>: ${HP_BAR(state.hp[0])}\n<@${state.players[1]}>: ${HP_BAR(state.hp[1])}`
        ),
        separator(),
        row,
        text(`-# Turn: <@${state.players[0]}> • ⚔️ 15-30 dmg • 🛡️ halve next hit + 5 heal • 💊 10-20 heal`),
      ])
    );
  },
};

module.exports.HP_BAR = HP_BAR;
