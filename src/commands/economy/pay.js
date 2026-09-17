const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, successContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "pay",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Send coins to another member")
    .addUserOption((option) => option.setName("user").setDescription("Who receives the coins?").setRequired(true))
    .addIntegerOption((option) => option.setName("amount").setDescription("How many coins?").setMinValue(1).setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.id === interaction.user.id) {
      return replyV2(interaction, errorContainer("You can't pay yourself. 🤷"));
    }
    if (target.bot) {
      return replyV2(interaction, errorContainer("Bots don't accept payments. 🤖"));
    }

    const sender = economy.getUser(interaction.user.id);
    if (sender.wallet < amount) {
      return replyV2(interaction, errorContainer(`You only have **${formatFull(sender.wallet)}** coins in your wallet. 🪙`));
    }

    const ok = economy.transfer(interaction.user.id, target.id, amount);
    if (!ok) return replyV2(interaction, errorContainer("The transfer failed — please try again."));

    await replyV2(
      interaction,
      successContainer(`**${formatFull(amount)}** coins sent to **${target.tag}** 🪙`, { title: "✅ Payment complete" })
    );
  },
};
