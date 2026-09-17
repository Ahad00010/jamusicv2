const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

module.exports = {
  name: "higherlower",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("higherlower")
    .setDescription("Will the next number be higher or lower? Build a streak!"),
  cooldown: 3,
  async execute(interaction, client) {
    const gameId = randomId();
    const state = {
      type: "hl",
      player: interaction.user.id,
      current: Math.floor(Math.random() * 100) + 1,
      next: Math.floor(Math.random() * 100) + 1,
      score: 0,
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 5 * 60 * 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`hl:${gameId}:higher`).setLabel("Higher ⬆️").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`hl:${gameId}:lower`).setLabel("Lower ⬇️").setStyle(ButtonStyle.Danger)
    );

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 📈 Higher or Lower?`),
        text(`Current number: **${state.current}**\nIs the next number higher or lower? (1-100)`),
        separator(),
        row,
        text(`-# Streak: **0**`),
      ])
    );
  },
};
