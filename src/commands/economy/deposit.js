const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, successContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "deposit",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Move coins from your wallet into the bank (safe from /rob)")
    .addStringOption((option) => option.setName("amount").setDescription("Amount, or 'all'").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const user = economy.getUser(interaction.user.id);
    const raw = interaction.options.getString("amount", true).trim().toLowerCase();

    const amount = raw === "all" ? user.wallet : Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) {
      return replyV2(interaction, errorContainer("Enter a positive whole number of coins, or `all`. 🪙"));
    }
    if (amount > user.wallet) {
      return replyV2(interaction, errorContainer(`You only have **${formatFull(user.wallet)}** coins in your wallet. 🪙`));
    }

    economy.updateUser(interaction.user.id, { wallet: user.wallet - amount, bank: user.bank + amount });

    await replyV2(
      interaction,
      successContainer(`Deposited **${formatFull(amount)}** coins 🏦\n-# Wallet: \`${formatFull(
        user.wallet - amount
      )}\` • Bank: \`${formatFull(user.bank + amount)}\``, { title: "🏦 Deposited" })
    );
  },
};
