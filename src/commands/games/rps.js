const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const MOVES = { rock: "🪨", paper: "📄", scissors: "✂️" };
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };

module.exports = {
  name: "rps",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Rock-paper-scissors — against the bot or another member")
    .addUserOption((option) => option.setName("opponent").setDescription("Duel a member (empty = play vs bot)")),
  cooldown: 3,
  async execute(interaction, client) {
    const opponent = interaction.options.getUser("opponent");
    const gameId = randomId();

    if (opponent && (opponent.bot || opponent.id === interaction.user.id)) {
      return replyV2(interaction, errorContainer("Pick a human opponent other than yourself. 🧍"));
    }

    const state = {
      type: "rps",
      players: [interaction.user.id, opponent?.id ?? "BOT"],
      choices: new Map(),
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 5 * 60 * 1000);

    const row = new ActionRowBuilder().addComponents(
      ...Object.entries(MOVES).map(([move, emoji]) =>
        new ButtonBuilder().setCustomId(`rps:${gameId}:${move}`).setLabel(move).setEmoji(emoji).setStyle(ButtonStyle.Primary)
      )
    );

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## ✂️ Rock-Paper-Scissors`),
        text(
          opponent
            ? `<@${state.players[0]}> vs <@${state.players[1]}> — both pick secretly, then I reveal the winner!`
            : `Pick your move — the bot has already chosen… 👀`
        ),
        separator(),
        row,
        text(`-# Choices are hidden while picking.`),
      ])
    );
  },
};

module.exports.MOVES = MOVES;
module.exports.BEATS = BEATS;
