const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "coinflip",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Bet on a coin flip (50/50)")
    .addStringOption((option) =>
      option.setName("side").setDescription("Heads or tails?").addChoices({ name: "heads", value: "heads" }, { name: "tails", value: "tails" })
    )
    .addStringOption((option) => option.setName("bet").setDescription("Amount to bet, or 'all'")),
  cooldown: 3,
  async execute(interaction, client) {
    const side = interaction.options.getString("side") ?? (Math.random() < 0.5 ? "heads" : "tails");
    const betRaw = interaction.options.getString("bet")?.trim().toLowerCase();

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const emoji = result === "heads" ? "🪙" : "🌙";

    if (!betRaw || betRaw === "0") {
      return replyV2(
        interaction,
        container(config.colors.economy, [
          text(`## 🪙 Coinflip!`),
          text(`The coin landed on **${result.toUpperCase()}** ${emoji}`),
          text(`-# Add a side and a bet to wager on the outcome!`),
        ])
      );
    }

    const user = economy.getUser(interaction.user.id);
    const bet = betRaw === "all" ? user.wallet : Number(betRaw.replace(/,/g, ""));
    if (!Number.isInteger(bet) || bet <= 0) {
      return replyV2(interaction, errorContainer("Enter a positive whole number of coins, or `all`. 🪙"));
    }
    if (bet > user.wallet) {
      return replyV2(interaction, errorContainer(`You only have **${formatFull(user.wallet)}** coins in your wallet. 🪙`));
    }

    if (side === result) {
      economy.addMoney(interaction.user.id, "wallet", bet);
      await replyV2(
        interaction,
        container(config.colors.economy, [
          text(`## ${emoji} ${result.toUpperCase()} — you win!`),
          text(`You guessed right and doubled **${formatFull(bet)}** coins! Wallet: **${formatFull(user.wallet + bet)}** 🪙`),
        ])
      );
    } else {
      economy.removeMoney(interaction.user.id, "wallet", bet);
      await replyV2(
        interaction,
        container(config.colors.error, [
          text(`## ${emoji} ${result.toUpperCase()} — you lose`),
          text(`You lost **${formatFull(bet)}** coins. Wallet: **${formatFull(user.wallet - bet)}** 🪙`),
        ])
      );
    }
  },
};
