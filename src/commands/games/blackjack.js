const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { randomId } = require("../../utils/ids");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

const SUITS = ["♠️", "♥️", "♦️", "♣️"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function newDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: rank === "A" ? 11 : ["J", "Q", "K", "10"].includes(rank) ? 10 : Number(rank) });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handValue(cards) {
  let total = cards.reduce((a, c) => a + c.value, 0);
  let aces = cards.filter((c) => c.rank === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function cardText(cards, hidden = false) {
  if (hidden) return `${cards[0].rank}${cards[0].suit} 🂠`;
  return cards.map((c) => `${c.rank}${c.suit}`).join(" ");
}

module.exports = {
  name: "blackjack",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("blackjack")
    .setDescription("Play blackjack against the dealer")
    .addStringOption((option) => option.setName("bet").setDescription("Coins to bet (optional)").setRequired(false)),
  cooldown: 5,
  async execute(interaction, client) {
    const betRaw = interaction.options.getString("bet")?.trim().toLowerCase();
    let bet = 0;

    if (betRaw && betRaw !== "0") {
      const user = economy.getUser(interaction.user.id);
      bet = betRaw === "all" ? Math.min(user.wallet, 5000) : Number(betRaw.replace(/,/g, ""));
      if (!Number.isInteger(bet) || bet <= 0) {
        return replyV2(interaction, errorContainer("Enter a positive whole number of coins, or `all` (max 5000). 🪙"));
      }
      if (bet > 5000) bet = 5000;
      if (bet > user.wallet) {
        return replyV2(interaction, errorContainer(`You only have **${formatFull(user.wallet)}** coins in your wallet. 🪙`));
      }
      economy.removeMoney(interaction.user.id, "wallet", bet);
    }

    const gameId = randomId();
    const deck = newDeck();
    const state = {
      type: "bj",
      player: interaction.user.id,
      bet,
      deck,
      playerHand: [deck.pop(), deck.pop()],
      dealerHand: [deck.pop(), deck.pop()],
      over: false,
      startedAt: Date.now(),
    };
    client.games.set(gameId, state);
    setTimeout(() => client.games.delete(gameId), 5 * 60 * 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj:${gameId}:hit`).setLabel("Hit").setEmoji("🃏").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj:${gameId}:stand`).setLabel("Stand").setEmoji("✋").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`bj:${gameId}:double`)
        .setLabel("Double")
        .setEmoji("💸")
        .setStyle(ButtonStyle.Success)
        .setDisabled(bet === 0)
    );

    const playerTotal = handValue(state.playerHand);
    const natural = playerTotal === 21;
    const dealerTotal = handValue(state.dealerHand);

    let resultLines = [];
    if (natural) {
      state.over = true;
      client.games.delete(gameId);
      if (dealerTotal === 21) {
        resultLines.push(text(`-# 😐 Both have blackjack — push (bet returned).`));
        if (bet) economy.addMoney(interaction.user.id, "wallet", bet);
      } else {
        resultLines.push(text(`🎉 **Blackjack!** ${bet ? `You win **${formatFull(bet * 2)}** coins!` : ""}`));
        if (bet) {
          economy.addMoney(interaction.user.id, "wallet", bet * 2);
          economy.addGameStat(interaction.user.id, "blackjack", true);
        }
      }
    }

    await replyV2(
      interaction,
      container(config.colors.games, [
        text(`## 🃏 Blackjack${bet ? ` — bet **${formatFull(bet)}** 🪙` : ""}`),
        text(
          `**Dealer:** ${cardText(state.dealerHand, true)}\n**You:** ${cardText(state.playerHand)} (\`${playerTotal}\`)`
        ),
        separator(),
        row,
        ...resultLines,
        text(`-# Get as close to 21 without going over. Dealer hits until 17.`),
      ])
    );
  },
};

module.exports.newDeck = newDeck;
module.exports.handValue = handValue;
module.exports.cardText = cardText;
