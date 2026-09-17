const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, successContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "withdraw",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Move coins from your bank back to your wallet")
    .addStringOption((option) => option.setName("amount").setDescription("Amount, or 'all'").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const user = economy.getUser(interaction.user.id);
    const raw = interaction.options.getString("amount", true).trim().toLowerCase();

    const amount = raw === "all" ? user.bank : Number(raw.replace(/,/g, ""));
    if (!Number.isInteger(amount) || amount <= 0) {
      return replyV2(interaction, errorContainer("Enter a positive whole number of coins, or `all`. 🪙"));
    }
    if (amount > user.bank) {
      return replyV2(interaction, errorContainer(`You only have **${formatFull(user.bank)}** coins in the bank. 🏦`));
    }

    economy.updateUser(interaction.user.id, { wallet: user.wallet + amount, bank: user.bank - amount });

    await replyV2(
      interaction,
      successContainer(`Withdrew **${formatFull(amount)}** coins 💸\n-# Wallet: \`${formatFull(
        user.wallet + amount
      )}\` • Bank: \`${formatFull(user.bank - amount)}\``, { title: "💸 Withdrawn" })
    );
  },
};
