const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../config");
const { container, text, separator, errorContainer } = require("../utils/v2");
const { randomInt, formatFull } = require("../utils/format");
const economy = require("../database/economy");
const { newDeck, handValue, cardText } = require("../commands/games/blackjack");
const { MOVES, BEATS } = require("../commands/games/rps");
const { TRUTHS, DARES } = require("../commands/games/truthdare");
const { HP_BAR } = require("../commands/games/duel");

function deny(interaction, message) {
  return interaction
    .reply({ components: [errorContainer(message)], flags: require("../utils/v2").V2_FLAG | 64 })
    .catch(() => {});
}

function finish(client, gameId, state, { winner, loser } = {}) {
  client.games.delete(gameId);
  if (winner) economy.addGameStat(winner, state.type, true);
  if (loser) economy.addGameStat(loser, state.type, false);
}

// ---------------- Rock-Paper-Scissors ----------------
async function handleRPS(interaction, client, gameId, move) {
  const state = client.games.get(gameId);
  if (!state) return deny(interaction, "That game has expired. 🏁");
  const isPlayer0 = interaction.user.id === state.players[0];
  const isPlayer1 = state.players[1] !== "BOT" && interaction.user.id === state.players[1];
  if (!isPlayer0 && !isPlayer1) return deny(interaction, "This game is not yours. 🙅");
  if (state.choices.has(interaction.user.id)) return deny(interaction, "You already picked! 👀");

  state.choices.set(interaction.user.id, move);

  const vsBot = state.players[1] === "BOT";

  if (vsBot) {
    const botMove = ["rock", "paper", "scissors"][randomInt(0, 2)];
    const pMove = state.choices.get(state.players[0]);
    const outcome = pMove === botMove ? "draw" : BEATS[pMove] === botMove ? "win" : "lose";
    finish(client, gameId, state, outcome === "win" ? { winner: state.players[0] } : outcome === "lose" ? { loser: state.players[0] } : { draw: true });

    return interaction.update({
      components: [
        container(config.colors.games, [
          text(`## ✂️ Rock-Paper-Scissors`),
          text(
            `You: ${MOVES[pMove]} **${pMove}**\nBot: ${MOVES[botMove]} **${botMove}**\n\n${
              outcome === "win" ? "🎉 **You win!**" : outcome === "lose" ? "💀 **You lose!**" : "🤝 **It's a draw!**"
            }`
          ),
        ]),
      ],
    });
  }

  // duel: both must pick
  if (state.choices.size < 2) {
    return interaction.reply({
      components: [container(config.colors.success, [text(`## 🤫 Choice locked in`), text(`Waiting for your opponent to pick…`)])],
      flags: require("../utils/v2").V2_FLAG | 64,
    });
  }

  const p1 = state.choices.get(state.players[0]);
  const p2 = state.choices.get(state.players[1]);
  const outcome = p1 === p2 ? "draw" : BEATS[p1] === p2 ? "win0" : "win1";

  if (outcome === "draw") finish(client, gameId, state, { draw: true });
  else if (outcome === "win0") finish(client, gameId, state, { winner: state.players[0], loser: state.players[1] });
  else finish(client, gameId, state, { winner: state.players[1], loser: state.players[0] });

  const resultText =
    outcome === "draw"
      ? "🤝 **It's a draw!**"
      : `🏆 <@${outcome === "win0" ? state.players[0] : state.players[1]}> wins!`;

  return interaction.update({
    components: [
      container(config.colors.games, [
        text(`## ✂️ Rock-Paper-Scissors`),
        text(`<@${state.players[0]}>: ${MOVES[p1]} **${p1}**\n<@${state.players[1]}>: ${MOVES[p2]} **${p2}**\n\n${resultText}`),
      ]),
    ],
  });
}

// ---------------- Blackjack ----------------
async function handleBlackjack(interaction, client, gameId, action) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That game has ended or expired. 🏁");
  if (interaction.user.id !== state.player) return deny(interaction, "This game is not yours. 🙅");

  const bet = state.bet;

  if (action === "hit") {
    state.playerHand.push(state.deck.pop());
    const total = handValue(state.playerHand);
    if (total > 21) {
      state.over = true;
      finish(client, gameId, state, { loser: state.player });
      return interaction.update({
        components: [
          container(config.colors.error, [
            text(`## 💀 Busted!`),
            text(`**You:** ${cardText(state.playerHand)} (\`${total}\`)\n${bet ? `You lost **${formatFull(bet)}** coins 🪙` : ""}`),
          ]),
        ],
      });
    }
  }

  if (action === "double") {
    const user = economy.getUser(state.player);
    if (user.wallet < bet) return deny(interaction, "You don't have enough coins to double. 🪙");
    economy.removeMoney(state.player, "wallet", bet);
    state.bet *= 2;
    state.playerHand.push(state.deck.pop());
    const total = handValue(state.playerHand);
    if (total > 21) {
      state.over = true;
      finish(client, gameId, state, { loser: state.player });
      return interaction.update({
        components: [
          container(config.colors.error, [
            text(`## 💀 Busted on double!`),
            text(`**You:** ${cardText(state.playerHand)} (\`${total}\`)\nYou lost **${formatFull(state.bet)}** coins 🪙`),
          ]),
        ],
      });
    }
  }

  // resolve when stand or a successful double
  if (action === "stand" || action === "double") {
    while (handValue(state.dealerHand) < 17) state.dealerHand.push(state.deck.pop());
    const playerTotal = handValue(state.playerHand);
    const dealerTotal = handValue(state.dealerHand);
    state.over = true;

    let resultText;
    if (dealerTotal > 21 || playerTotal > dealerTotal) {
      economy.addMoney(state.player, "wallet", state.bet * 2);
      finish(client, gameId, state, { winner: state.player });
      resultText = `🎉 **You win** (\`${playerTotal}\` vs \`${dealerTotal}\`) — +**${formatFull(state.bet)}** coins!`;
    } else if (playerTotal === dealerTotal) {
      economy.addMoney(state.player, "wallet", state.bet);
      finish(client, gameId, state, { draw: true });
      resultText = `🤝 **Push** (\`${playerTotal}\` vs \`${dealerTotal}\`) — bet returned.`;
    } else {
      finish(client, gameId, state, { loser: state.player });
      resultText = `💀 **Dealer wins** (\`${playerTotal}\` vs \`${dealerTotal}\`) — bet lost.`;
    }

    return interaction.update({
      components: [
        container(config.colors.games, [
          text(`## 🃏 Blackjack`),
          text(`**Dealer:** ${cardText(state.dealerHand)} (\`${dealerTotal}\`)\n**You:** ${cardText(state.playerHand)} (\`${playerTotal}\`)`),
          separator(),
          text(resultText),
        ]),
      ],
    });
  }

  // hit that didn't bust
  const total = handValue(state.playerHand);
  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## 🃏 Blackjack${state.bet ? ` — bet **${formatFull(state.bet)}** 🪙` : ""}`),
        text(`**Dealer:** ${cardText(state.dealerHand, true)}\n**You:** ${cardText(state.playerHand)} (\`${total}\`)`),
        separator(),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`bj:${gameId}:hit`).setLabel("Hit").setEmoji("🃏").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`bj:${gameId}:stand`).setLabel("Stand").setEmoji("✋").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`bj:${gameId}:double`).setLabel("Double").setEmoji("💸").setStyle(ButtonStyle.Success)
        ),
        text(`-# Get as close to 21 without going over.`),
      ]),
    ],
  });
}

// ---------------- Higher or Lower ----------------
async function handleHigherLower(interaction, client, gameId, guess) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That game has ended or expired. 🏁");
  if (interaction.user.id !== state.player) return deny(interaction, "This game is not yours. 🙅");

  const wasHigher = state.next > state.current;
  const correct = (guess === "higher" && wasHigher) || (guess === "lower" && !wasHigher) || state.next === state.current;

  if (correct) {
    state.score++;
    state.current = state.next;
    state.next = Math.floor(Math.random() * 100) + 1;
    await interaction.update({
      components: [
        container(config.colors.success, [
          text(`## 📈 Higher or Lower?`),
          text(`✅ Correct! The next number is **${state.current}** — higher or lower again?`),
          separator(),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`hl:${gameId}:higher`).setLabel("Higher ⬆️").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`hl:${gameId}:lower`).setLabel("Lower ⬇️").setStyle(ButtonStyle.Danger)
          ),
          text(`-# Streak: **${state.score}**`),
        ]),
      ],
    });
    return;
  }

  state.over = true;
  finish(client, gameId, state, state.score > 0 ? { winner: state.player } : { loser: state.player });
  await interaction.update({
    components: [
      container(config.colors.error, [
        text(`## 📈 Higher or Lower?`),
        text(`❌ Wrong! After **${state.current}**, the number was **${state.next}** (you guessed **${guess}**).`),
        text(`🏁 Final streak: **${state.score}**`),
      ]),
    ],
  });
}

// ---------------- Duel ----------------
async function handleDuel(interaction, client, gameId, action) {
  const state = client.games.get(gameId);
  if (!state || state.over) return deny(interaction, "That duel has ended or expired. 🏁");
  const me = state.turn;
  const opponent = 1 - me;
  if (interaction.user.id !== state.players[me]) {
    return deny(interaction, `It's <@${state.players[me]}>'s turn! ⏳`);
  }

  if (action === "attack") {
    let damage = randomInt(15, 30);
    if (state.defending?.[opponent]) {
      damage = Math.ceil(damage / 2);
      state.defending[opponent] = false;
    }
    state.hp[opponent] = Math.max(0, state.hp[opponent] - damage);
  } else if (action === "defend") {
    state.defending = state.defending || [false, false];
    state.defending[me] = true;
    state.hp[me] = Math.min(100, state.hp[me] + 5);
  } else if (action === "heal") {
    state.hp[me] = Math.min(100, state.hp[me] + randomInt(10, 20));
  }

  if (state.hp[opponent] === 0) {
    state.over = true;
    finish(client, gameId, state, { winner: state.players[me], loser: state.players[opponent] });
    return interaction.update({
      components: [
        container(config.colors.games, [
          text(`## ⚔️ DUEL OVER!`),
          text(`🏆 <@${state.players[me]}> wins the duel!`),
          separator(),
          text(`<@${state.players[0]}>: ${HP_BAR(state.hp[0])}\n<@${state.players[1]}>: ${HP_BAR(state.hp[1])}`),
        ]),
      ],
    });
  }

  state.turn = opponent;
  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## ⚔️ DUEL!`),
        text(`<@${state.players[0]}>: ${HP_BAR(state.hp[0])}\n<@${state.players[1]}>: ${HP_BAR(state.hp[1])}`),
        separator(),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`duel:${gameId}:attack`).setLabel("Attack ⚔️").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`duel:${gameId}:defend`).setLabel("Defend 🛡️").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`duel:${gameId}:heal`).setLabel("Heal 💊").setStyle(ButtonStyle.Success)
        ),
        text(`-# Turn: <@${state.players[state.turn]}>`),
      ]),
    ],
  });
}

// ---------------- Truth or Dare ----------------
async function handleTruthDare(interaction, client, gameId, pick) {
  const state = client.games.get(gameId);
  if (!state) return deny(interaction, "That game has expired. 🏁");
  if (interaction.user.id !== state.player) return deny(interaction, "This game is not yours. 🙅");

  client.games.delete(gameId);
  const phrase = pick === "truth" ? TRUTHS[randomInt(0, TRUTHS.length - 1)] : DARES[randomInt(0, DARES.length - 1)];
  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## ${pick === "truth" ? "🙊 TRUTH" : "🔥 DARE"}`),
        text(`**${phrase}**`),
        separator(),
        text(`-# For <@${state.player}> — run /truthdare for another round!`),
      ]),
    ],
  });
}

// ---------------- Would You Rather ----------------
async function handleWYR(interaction, client, gameId, option) {
  const state = client.games.get(gameId);
  if (!state) return deny(interaction, "That game has expired. 🏁");

  const chosen = Number(option);
  const other = 1 - chosen;
  state.votes[chosen].add(interaction.user.id);
  state.votes[other].delete(interaction.user.id);

  const total = state.votes[0].size + state.votes[1].size;
  const pct0 = total ? Math.round((state.votes[0].size / total) * 100) : 0;
  const pct1 = total ? 100 - pct0 : 0;

  await interaction.update({
    components: [
      container(config.colors.games, [
        text(`## 🤔 Would you rather…`),
        text(
          `**🅰️ ${state.options[0]}** — \`${state.votes[0].size}\` votes (${pct0}%)\n\n` +
            `**🅱️ ${state.options[1]}** — \`${state.votes[1].size}\` votes (${pct1}%)`
        ),
        separator(),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`wyr:${gameId}:0`).setLabel("Option 1").setEmoji("🅰️").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`wyr:${gameId}:1`).setLabel("Option 2").setEmoji("🅱️").setStyle(ButtonStyle.Primary)
        ),
        text(`-# ${total} total vote${total === 1 ? "" : "s"} — you can change your vote!`),
      ]),
    ],
  });
}

module.exports = function registerDuelGames(register) {
  register("rps:", (interaction, client) => {
    const [, gameId, move] = interaction.customId.split(":");
    return handleRPS(interaction, client, gameId, move);
  });
  register("bj:", (interaction, client) => {
    const [, gameId, action] = interaction.customId.split(":");
    return handleBlackjack(interaction, client, gameId, action);
  });
  register("hl:", (interaction, client) => {
    const [, gameId, guess] = interaction.customId.split(":");
    return handleHigherLower(interaction, client, gameId, guess);
  });
  register("duel:", (interaction, client) => {
    const [, gameId, action] = interaction.customId.split(":");
    return handleDuel(interaction, client, gameId, action);
  });
  register("td:", (interaction, client) => {
    const [, gameId, pick] = interaction.customId.split(":");
    return handleTruthDare(interaction, client, gameId, pick);
  });
  register("wyr:", (interaction, client) => {
    const [, gameId, option] = interaction.customId.split(":");
    return handleWYR(interaction, client, gameId, option);
  });
};
