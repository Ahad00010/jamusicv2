const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, successContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { getItem } = require("../../utils/shop");
const { formatFull, randomInt } = require("../../utils/format");

module.exports = {
  name: "use",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("use")
    .setDescription("Use a consumable item from your inventory")
    .addStringOption((option) =>
      option.setName("item").setDescription("The item to use").setRequired(true).addChoices(...itemChoices())
    ),
  cooldown: 3,
  async execute(interaction, client) {
    const itemId = interaction.options.getString("item", true);
    const item = getItem(itemId);

    if (!item) return replyV2(interaction, errorContainer("That item doesn't exist. 🎒"));
    if (item.type !== "usable" && item.type !== "consumable") {
      return replyV2(interaction, errorContainer(`**${item.name}** is a passive item — it works automatically. ${item.emoji}`));
    }
    if (!economy.hasItem(interaction.user.id, itemId)) {
      return replyV2(interaction, errorContainer(`You don't own a **${item.name}**. Buy one in the shop! 🛒`));
    }

    if (itemId === "gift") {
      economy.removeItem(interaction.user.id, "gift", 1);
      const coins = randomInt(100, 5000);
      economy.addMoney(interaction.user.id, "wallet", coins);
      return replyV2(
        interaction,
        container(config.colors.economy, [
          text(`## 🎁 Gift opened!`),
          text(`Confetti everywhere! Inside you found **${formatFull(coins)}** coins 🪙`),
        ])
      );
    }

    // Booster & padlock are automatic — using them manually just explains that
    return replyV2(
      interaction,
      container(config.colors.warning, [
        text(`## ℹ️ ${item.name}`),
        text(`${item.description}\n\n-# This item activates automatically when relevant — no need to use it manually.`),
      ])
    );
  },
};

function itemChoices() {
  return ["gift", "booster", "padlock"].map((id) => {
    const item = getItem(id);
    return { name: `${item.emoji} ${item.name}`, value: item.id };
  });
}
