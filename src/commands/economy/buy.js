const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, successContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { getItem } = require("../../utils/shop");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "buy",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy an item from the shop")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The item to buy")
        .setRequired(true)
        .addChoices(...allChoices())
    )
    .addIntegerOption((option) => option.setName("quantity").setDescription("How many (default 1)").setMinValue(1).setMaxValue(10)),
  cooldown: 3,
  async execute(interaction, client) {
    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const item = getItem(itemId);

    if (!item) return replyV2(interaction, errorContainer("That item doesn't exist. 🛒"));

    const user = economy.getUser(interaction.user.id);
    const total = item.price * quantity;

    if (user.wallet < total) {
      return replyV2(
        interaction,
        errorContainer(`That costs **${formatFull(total)}** coins but you only have **${formatFull(user.wallet)}**. 🪙`)
      );
    }

    // One-per-person items
    if (item.type === "passive" && ["fishing_rod", "laptop", "smartphone", "shield", "ring"].includes(itemId)) {
      if (economy.hasItem(interaction.user.id, itemId)) {
        return replyV2(interaction, errorContainer(`You already own a **${item.name}**. 🎒`));
      }
    }

    economy.removeMoney(interaction.user.id, "wallet", total);
    economy.addItem(interaction.user.id, itemId, quantity);

    await replyV2(
      interaction,
      successContainer(`You bought **${quantity}× ${item.emoji} ${item.name}** for **${formatFull(total)}** coins 🪙\n-# ${item.description}`, {
        title: "🛍️ Purchase complete",
      })
    );
  },
};

function allChoices() {
  return Object.values(require("../../utils/shop").ITEMS).map((item) => ({ name: `${item.emoji} ${item.name}`, value: item.id }));
}
