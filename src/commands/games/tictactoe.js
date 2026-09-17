const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const EMPTY = "➖";
const MARKS = ["❌", "⭕"];

function renderBoard(board) {
  const rows = [0, 1, 2].map((r) => board.slice(r * 3, r * 3 + 3).join(" "));
  return rows.join("\n");
}

module.exports = {
  name: "tictactoe",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("Play tic-tac-toe against another member")
    .addUserOption((option) => option.setName("opponent").setDescription("Who dares to challenge you?").setRequired(true)),
  cooldown: 5,
  async execute(interaction, client) {
    const opponent = interaction.options.getUser("opponent", true);
    if (opponent.bot || opponent.id === interaction.user.id) {
      return replyV2(interaction, errorContainer("Pick a human opponent other than yourself. 🧍"));
    }

    const gameId = randomId();
    const board = Array(9).fill(EMPTY);
    const state = {
      type: "ttt",
      board,
      players: [interaction.user.id, opponent.id],
      turn: 0,
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 10 * 60 * 1000);

    const rows = [0, 1, 2].map((r) => {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`ttt:${gameId}:${i}`)
            .setLabel("\u200b")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(false)
        );
      }
      return row;
    });

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## ❌⭕ Tic-Tac-Toe`),
        text(
          `${MARKS[0]} <@${state.players[0]}> vs ${MARKS[1]} <@${state.players[1]}>\n\n${renderBoard(board)}`
        ),
        separator(),
        ...rows,
        text(`-# Turn: ${MARKS[0]} <@${state.players[0]}> • Game ID \`${gameId}\``),
      ])
    );
  },
};

module.exports.renderBoard = renderBoard;
module.exports.MARKS = MARKS;
