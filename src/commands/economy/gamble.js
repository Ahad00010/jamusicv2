const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

const MAX_BET = 10000;

module.exports = {
  name: "gamble",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("gamble")
    .setDescription("Gamble your coins (47% chance to double them)")
    .addStringOption((option) => option.setName("amount").setDescription("Amount to bet, or 'all' (max 10k)").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const user = economy.getUser(interaction.user.id);
    const raw = interaction.options.getString("amount", true).trim().toLowerCase();

    const amount = raw === "all" ? Math.min(user.wallet, MAX_BET) : Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) {
      return replyV2(interaction, errorContainer("Enter a positive whole number of coins, or `all`. 🪙"));
    }
    if (amount > MAX_BET) {
      return replyV2(interaction, errorContainer(`The maximum bet is **${formatFull(MAX_BET)}** coins. 🎰`));
    }
    if (amount > user.wallet) {
      return replyV2(interaction, errorContainer(`You only have **${formatFull(user.wallet)}** coins in your wallet. 🪙`));
    }

    if (Math.random() < 0.47) {
      economy.addMoney(interaction.user.id, "wallet", amount);
      await replyV2(
        interaction,
        container(config.colors.economy, [
          text(`## 🎰 WINNER!`),
          text(`You won **${formatFull(amount)}** coins! Your wallet now holds **${formatFull(user.wallet + amount)}** 🪙`),
        ])
      );
    } else {
      economy.removeMoney(interaction.user.id, "wallet", amount);
      await replyV2(
        interaction,
        container(config.colors.error, [
          text(`## 💀 You lost…`),
          text(`The house took your **${formatFull(amount)}** coins. Wallet: **${formatFull(user.wallet - amount)}** 🪙`),
        ])
      );
    }
  },
};
