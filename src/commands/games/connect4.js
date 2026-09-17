const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");

const EMPTY = "⚪";
const DISCS = ["🔴", "🟡"];

function renderBoard(board) {
  // board: 6 rows x 7 cols (row 0 = top)
  return board.map((row) => row.join("")).join("\n");
}

module.exports = {
  name: "connect4",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("connect4")
    .setDescription("Play Connect 4 against another member")
    .addUserOption((option) => option.setName("opponent").setDescription("Who dares to challenge you?").setRequired(true)),
  cooldown: 5,
  async execute(interaction, client) {
    const opponent = interaction.options.getUser("opponent", true);
    if (opponent.bot || opponent.id === interaction.user.id) {
      return replyV2(interaction, errorContainer("Pick a human opponent other than yourself. 🧍"));
    }

    const gameId = randomId();
    const board = Array.from({ length: 6 }, () => Array(7).fill(EMPTY));
    const state = {
      type: "c4",
      board,
      players: [interaction.user.id, opponent.id],
      turn: 0,
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 15 * 60 * 1000);

    const rows = [0, 1].map((half) => {
      const row = new ActionRowBuilder();
      for (let c = 0; c < 4; c++) {
        const col = half * 4 + c;
        row.addComponents(
          new ButtonBuilder().setCustomId(`c4:${gameId}:${col}`).setLabel(`${col + 1}`).setStyle(ButtonStyle.Secondary)
        );
      }
      return row;
    });

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🔴🟡 Connect 4`),
        text(`${DISCS[0]} <@${state.players[0]}> vs ${DISCS[1]} <@${state.players[1]}>\n\n${renderBoard(board)}`),
        separator(),
        ...rows,
        text(`-# Turn: ${DISCS[0]} <@${state.players[0]}> • Click a column number to drop a disc`),
      ])
    );
  },
};

module.exports.renderBoard = renderBoard;
module.exports.DISCS = DISCS;
