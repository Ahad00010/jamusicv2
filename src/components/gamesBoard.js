const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");
const { container, text, errorContainer } = require("../utils/v2");
const { MARKS, renderBoard: renderTTT } = require("../commands/games/tictactoe");
const { DISCS, renderBoard: renderC4 } = require("../commands/games/connect4");
const { STAGES } = require("../commands/games/hangman");
const memoryModule = require("../commands/games/memory");
const economy = require("../database/economy");

function deny(interaction, message) {
  return interaction
    .reply({ components: [errorContainer(message)], flags: require("../utils/v2").V2_FLAG | 64 })
    .catch(() => {});
}

function finishGame(client, gameId, state, { winner, loser, draw } = {}) {
  client.games.delete(gameId);
  if (draw) return;
  if (winner) economy.addGameStat(winner, state.type, true);
  if (loser) economy.addGameStat(loser, state.type, false);
}

// ---------------- Tic-Tac-Toe ----------------
const TTT_WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

async function handleTTT(interaction, client, gameId, indexStr) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That game has ended or expired. 🏁");
  if (!state.players.includes(interaction.user.id)) {
    return deny(interaction, "This match is not yours — start your own with /tictactoe!");
  }
  const playerIndex = state.players.indexOf(interaction.user.id);
  if (playerIndex !== state.turn) {
    return deny(interaction, `It's not your turn — wait for ${MARKS[state.turn]}. ⏳`);
  }

  const index = Number(indexStr);
  if (state.board[index] !== "➖") return deny(interaction, "That cell is already taken. 🚫");
  state.board[index] = MARKS[playerIndex];

  const winnerRow = TTT_WINS.find(
    ([a, b, c]) => state.board[a] !== "➖" && state.board[a] === state.board[b] && state.board[b] === state.board[c]
  );
  const draw = !winnerRow && state.board.every((cell) => cell !== "➖");

  let resultText = null;
  if (winnerRow || draw) {
    state.over = true;
    if (draw) {
      resultText = text(`🤝 **It's a draw!** GG to both players.`);
      finishGame(client, gameId, state, { draw: true });
    } else {
      const winnerId = state.players[playerIndex];
      const loserId = state.players[1 - playerIndex];
      resultText = text(`🏆 <@${winnerId}> wins! GG!`);
      finishGame(client, gameId, state, { winner: winnerId, loser: loserId });
    }
  } else {
    state.turn = 1 - state.turn;
  }

  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## ❌⭕ Tic-Tac-Toe`),
        text(`${MARKS[0]} <@${state.players[0]}> vs ${MARKS[1]} <@${state.players[1]}>\n\n${renderTTT(state.board)}`),
        separator(),
        ...buildTTTRows(state, gameId, winnerRow),
        resultText ?? text(`-# Turn: ${MARKS[state.turn]} <@${state.players[state.turn]}>`),
      ]),
    ],
  });
}

function buildTTTRows(state, gameId, winnerRow) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const mark = state.board[i];
      const isWinnerCell = winnerRow?.includes(i);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:${gameId}:${i}`)
          .setEmoji(mark === "➖" ? undefined : mark)
          .setLabel(mark === "➖" ? "\u200b" : undefined)
          .setStyle(isWinnerCell ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(state.over || mark !== "➖")
      );
    }
    rows.push(row);
  }
  return rows;
}

// ---------------- Connect 4 ----------------
function checkC4Win(board, disc) {
  const rows = 6;
  const cols = 7;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== disc) continue;
      if (c + 3 < cols && [0, 1, 2, 3].every((i) => board[r][c + i] === disc)) return true;
      if (r + 3 < rows && [0, 1, 2, 3].every((i) => board[r + i][c] === disc)) return true;
      if (r + 3 < rows && c + 3 < cols && [0, 1, 2, 3].every((i) => board[r + i][c + i] === disc)) return true;
      if (r + 3 < rows && c - 3 >= 0 && [0, 1, 2, 3].every((i) => board[r + i][c - i] === disc)) return true;
    }
  }
  return false;
}

function buildC4Rows(state, gameId) {
  const rows = [];
  for (let half = 0; half < 2; half++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 4; c++) {
      const col = half * 4 + c;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`c4:${gameId}:${col}`)
          .setLabel(`${col + 1}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(state.over)
      );
    }
    rows.push(row);
  }
  return rows;
}

async function handleC4(interaction, client, gameId, colStr) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That game has ended or expired. 🏁");
  if (!state.players.includes(interaction.user.id)) {
    return deny(interaction, "This match is not yours — start your own with /connect4!");
  }
  const playerIndex = state.players.indexOf(interaction.user.id);
  if (playerIndex !== state.turn) {
    return deny(interaction, `It's not your turn — wait for ${DISCS[state.turn]}. ⏳`);
  }

  const col = Number(colStr);
  let row = -1;
  for (let r = 5; r >= 0; r--) {
    if (state.board[r][col] === "⚪") {
      row = r;
      break;
    }
  }
  if (row === -1) return deny(interaction, "That column is full. 🚫");
  state.board[row][col] = DISCS[playerIndex];

  const win = checkC4Win(state.board, DISCS[playerIndex]);
  const draw = !win && state.board[0].every((cell) => cell !== "⚪");

  let resultText = null;
  if (win || draw) {
    state.over = true;
    if (draw) {
      resultText = text(`🤝 **It's a draw!**`);
      finishGame(client, gameId, state, { draw: true });
    } else {
      const winnerId = state.players[playerIndex];
      const loserId = state.players[1 - playerIndex];
      resultText = text(`🏆 <@${winnerId}> connects four and wins! 🎉`);
      finishGame(client, gameId, state, { winner: winnerId, loser: loserId });
    }
  } else {
    state.turn = 1 - state.turn;
  }

  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## 🔴🟡 Connect 4`),
        text(`${DISCS[0]} <@${state.players[0]}> vs ${DISCS[1]} <@${state.players[1]}>\n\n${renderC4(state.board)}`),
        separator(),
        ...buildC4Rows(state, gameId),
        resultText ?? text(`-# Turn: ${DISCS[state.turn]} <@${state.players[state.turn]}>`),
      ]),
    ],
  });
}

// ---------------- Hangman ----------------
const { StringSelectMenuBuilder } = require("discord.js");

async function handleHangman(interaction, client, gameId) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That game has ended or expired. 🏁");
  if (interaction.user.id !== state.player) {
    return deny(interaction, "Only the player who started the game can guess. 🙅");
  }

  const letter = interaction.values[0];
  if (state.guessed.has(letter)) return deny(interaction, `You already tried **${letter.toUpperCase()}**. 🔁`);
  state.guessed.add(letter);

  const hit = state.word.includes(letter);
  if (!hit) state.wrong++;

  const masked = state.word
    .split("")
    .map((l) => (state.guessed.has(l) ? l : "_"))
    .join("");
  const won = masked === state.word;
  const lost = state.wrong >= 6;

  if (won || lost) {
    state.over = true;
    if (won) finishGame(client, gameId, state, { winner: state.player });
    else finishGame(client, gameId, state, { loser: state.player });
  }

  const remaining = "abcdefghijklmnopqrstuvwxyz"
    .split("")
    .filter((l) => !state.guessed.has(l));

  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## 🪢 Hangman`),
        text(`\`${masked.split("").join(" ")}\``),
        text(
          `-# Wrong guesses: ${state.wrong}/6 ${STAGES[Math.min(state.wrong, STAGES.length - 1)]}` +
            (lost ? `\n\n💀 **Game over** — the word was **${state.word}**.` : "") +
            (won ? `\n\n🎉 **You got it!** The word was **${state.word}**.` : "")
        ),
        separator(),
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`hang:${gameId}:guess`)
            .setPlaceholder("Pick a letter…")
            .setDisabled(state.over || !remaining.length)
            .addOptions(remaining.map((l) => ({ label: l.toUpperCase(), value: l, emoji: "🔤" })))
        ),
      ]),
    ],
  });
}

// ---------------- Memory ----------------
async function handleMemory(interaction, client, gameId, indexStr) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That game has ended or expired. 🏁");
  if (interaction.user.id !== state.player) {
    return deny(interaction, "Only the player who started the game can flip cards. 🙅");
  }
  if (state.revealed.size >= 2) return deny(interaction, "Two cards are already open — wait a moment! ⏳");

  const index = Number(indexStr);
  if (state.matched.has(index) || state.revealed.has(index)) return deny(interaction, "That card is already face-up. 🃏");

  state.revealed.add(index);
  state.moves++;

  if (state.revealed.size === 2) {
    const [a, b] = [...state.revealed];
    if (state.deck[a] === state.deck[b]) {
      state.matched.add(a);
      state.matched.add(b);
      state.revealed.clear();
    } else {
      setTimeout(() => state.revealed.clear(), 1200);
    }
  }

  const done = state.matched.size === 16;
  if (done) {
    state.over = true;
    finishGame(client, gameId, state, { winner: state.player });
  }

  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## 🧠 Memory Match`),
        text(`**Moves:** ${state.moves} • **Matched:** ${state.matched.size / 2}/8`),
        separator(),
        ...memoryModule.buildRows(state, gameId),
        text(
          done
            ? `🎉 **Complete in ${state.moves} moves!** Impressive memory!`
            : `-# Click two cards to reveal them — find all 8 pairs!`
        ),
      ]),
    ],
  });
}

module.exports = function registerBoardGames(register) {
  register("ttt:", (interaction, client) => {
    const [, gameId, index] = interaction.customId.split(":");
    return handleTTT(interaction, client, gameId, index);
  });
  register("c4:", (interaction, client) => {
    const [, gameId, col] = interaction.customId.split(":");
    return handleC4(interaction, client, gameId, col);
  });
  register("hang:", (interaction, client) => {
    const [, gameId] = interaction.customId.split(":");
    return handleHangman(interaction, client, gameId);
  });
  register("mem:", (interaction, client) => {
    const [, gameId, index] = interaction.customId.split(":");
    return handleMemory(interaction, client, gameId, index);
  });
};
