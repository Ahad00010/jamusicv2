const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator } = require("../../utils/v2");
const { allItems } = require("../../utils/shop");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "shop",
  category: "economy",
  data: new SlashCommandBuilder().setName("shop").setDescription("Browse the item shop"),
  cooldown: 3,
  async execute(interaction, client) {
    const items = allItems();

    await replyV2(
      interaction,
      container(config.colors.economy, [
        text(`## 🛒 JaMusic Shop`),
        text(`-# Buy with </buy:0> • Sell with </sell:0> • Use with </use:0>`),
        separator(),
        text(
          items
            .map(
              (item) =>
                `${item.emoji} **${item.name}** — \`${formatFull(item.price)}\` coins\n-# ${item.description} • Type: \`${item.type}\``
            )
            .join("\n\n")
        ),
        separator(),
        text(`-# Your wallet: run </balance:0> to check your funds.`),
      ])
    );
  },
};
