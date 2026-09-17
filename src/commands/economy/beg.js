const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull, durationToHuman, randomInt, timestamp } = require("../../utils/format");

const COOLDOWN = 60 * 1000;

const MERCY = [
  "The gods of generosity smile upon you 🌟",
  "A kind stranger shares their lunch money 🥪",
  "You find coins in an old jacket 👕",
  "Your grandma sends you love (and coins) 💖",
];

module.exports = {
  name: "beg",
  category: "economy",
  data: new SlashCommandBuilder().setName("beg").setDescription("Beg for coins"),
  cooldown: 3,
  async execute(interaction, client) {
    const check = economy.checkCooldown(interaction.user.id, "beg", COOLDOWN);
    if (check.onCooldown) {
      return replyV2(
        interaction,
        warningContainer(`Stop begging for a moment — try again **${durationToHuman(check.remaining)}** from now. 🙏`, {
          title: "⏳ Slow down",
        })
      );
    }

    economy.setCooldown(interaction.user.id, "beg");

    if (Math.random() < 0.4) {
      return replyV2(
        interaction,
        container(config.colors.error, [text(`## 🚫 Nothing…`), text(`People walked right past you. Maybe shower first? 🚿`)])
      );
    }

    const amount = randomInt(5, 80);
    economy.addMoney(interaction.user.id, "wallet", amount);
    await replyV2(
      interaction,
      container(config.colors.economy, [
        text(`## 🙏 Begging paid off!`),
        text(`${randomItem(MERCY)}\nYou received **${formatFull(amount)}** coins 🪙`),
      ])
    );
  },
};
