const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator } = require("../../utils/v2");
const economy = require("../../database/economy");
const { getItem, ITEMS } = require("../../utils/shop");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "inventory",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Show your (or someone else's) inventory")
    .addUserOption((option) => option.setName("user").setDescription("Whose inventory? (defaults to you)")),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const inventory = economy.getInventory(user.id);
    const entries = Object.entries(inventory).filter(([, count]) => count > 0);

    const children = [
      text(`## 🎒 ${user.id === interaction.user.id ? "Your inventory" : `${user.tag}'s inventory`}`),
      separator(),
    ];

    if (!entries.length) {
      children.push(text(`Empty! Buy something from the shop with </buy:0>. 🛒`));
    } else {
      children.push(
        text(
          entries
            .map(([id, count]) => {
              const item = getItem(id) || { emoji: "❓", name: id, sell: 0 };
              return `${item.emoji} **${item.name}** × **${count}** -# (sells for ${formatFull(item.sell)} each)`;
            })
            .join("\n")
        )
      );
    }

    await replyV2(interaction, container(config.colors.economy, children));
  },
};
