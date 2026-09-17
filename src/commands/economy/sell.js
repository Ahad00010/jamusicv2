const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, successContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { getItem, ITEMS } = require("../../utils/shop");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "sell",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("sell")
    .setDescription("Sell an item from your inventory")
    .addStringOption((option) =>
      option.setName("item").setDescription("The item to sell").setRequired(true).addChoices(...itemChoices())
    )
    .addIntegerOption((option) => option.setName("quantity").setDescription("How many (default 1)").setMinValue(1).setMaxValue(25)),
  cooldown: 3,
  async execute(interaction, client) {
    const itemId = interaction.options.getString("item", true);
    const quantity = interaction.options.getInteger("quantity") ?? 1;
    const item = getItem(itemId);

    if (!item) return replyV2(interaction, errorContainer("That item doesn't exist. 🎒"));

    const owned = economy.countItem(interaction.user.id, itemId);
    if (owned < quantity) {
      return replyV2(
        interaction,
        errorContainer(`You own **${owned}**× **${item.name}** — you can't sell ${quantity}. 🎒`)
      );
    }

    const total = item.sell * quantity;
    economy.removeItem(interaction.user.id, itemId, quantity);
    economy.addMoney(interaction.user.id, "wallet", total);

    await replyV2(
      interaction,
      successContainer(`Sold **${quantity}× ${item.emoji} ${item.name}** for **${formatFull(total)}** coins 🪙`, {
        title: "💸 Item sold",
      })
    );
  },
};

function itemChoices() {
  return Object.values(ITEMS).map((item) => ({ name: `${item.emoji} ${item.name} (sells ${item.sell})`, value: item.id }));
}
