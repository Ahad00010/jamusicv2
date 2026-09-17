const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { randomInt, formatFull } = require("../../utils/format");
const economy = require("../../database/economy");

module.exports = {
  name: "dice",
  category: "games",
  data: new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Roll dice (optionally wager on the total)")
    .addIntegerOption((option) => option.setName("sides").setDescription("Sides per die (default 6)").setMinValue(2).setMaxValue(100))
    .addIntegerOption((option) => option.setName("count").setDescription("Number of dice (default 2)").setMinValue(1).setMaxValue(5))
    .addIntegerOption((option) => option.setName("bet").setDescription("Bet on rolling above half the maximum").setMaxValue(5000)),
  cooldown: 3,
  async execute(interaction, client) {
    const sides = interaction.options.getInteger("sides") ?? 6;
    const count = interaction.options.getInteger("count") ?? 2;
    const bet = interaction.options.getInteger("bet") ?? 0;

    if (bet > 0) {
      const user = economy.getUser(interaction.user.id);
      if (user.wallet < bet) {
        return replyV2(interaction, errorContainer(`You only have **${formatFull(user.wallet)}** coins in your wallet. 🪙`));
      }
    }

    const rolls = Array.from({ length: count }, () => randomInt(1, sides));
    const total = rolls.reduce((a, b) => a + b, 0);
    const diceLine = rolls.map((r) => `🎲 \`${r}\``).join(" + ");
    const threshold = Math.ceil((sides * count) / 2);

    const children = [
      text(`## 🎲 Dice roll`),
      text(`${diceLine} = **${total}** (of ${sides * count})`),
    ];

    if (bet > 0) {
      const win = total > threshold;
      if (win) {
        economy.addMoney(interaction.user.id, "wallet", bet);
        children.push(separator(), text(`🎉 **Above ${threshold}** — you won **${formatFull(bet)}** coins! 🪙`));
        economy.addGameStat(interaction.user.id, "dice", true);
      } else {
        economy.removeMoney(interaction.user.id, "wallet", bet);
        children.push(separator(), text(`💀 **${threshold} or below** — you lost **${formatFull(bet)}** coins.`));
        economy.addGameStat(interaction.user.id, "dice", false);
      }
    }

    await replyV2(interaction, container(config.colors.games, children));
  },
};
