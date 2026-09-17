const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull, durationToHuman, timestamp } = require("../../utils/format");

const AMOUNT = 1500;
const COOLDOWN = 7 * 24 * 3600 * 1000;

module.exports = {
  name: "weekly",
  category: "economy",
  data: new SlashCommandBuilder().setName("weekly").setDescription("Claim your weekly coins"),
  cooldown: 3,
  async execute(interaction, client) {
    const check = economy.checkCooldown(interaction.user.id, "weekly", COOLDOWN);
    if (check.onCooldown) {
      return replyV2(
        interaction,
        warningContainer(`Your weekly coins are ready **${durationToHuman(check.remaining)}** from now. ⏰`, {
          title: "⏳ Already claimed",
        })
      );
    }

    economy.addMoney(interaction.user.id, "wallet", AMOUNT);
    economy.setCooldown(interaction.user.id, "weekly");

    await replyV2(
      interaction,
      container(config.colors.economy, [
        text(`## 🗓️ Weekly claimed!`),
        text(`You received **${formatFull(AMOUNT)}** coins 🪙`),
        separator(),
        text(`-# Next claim <t:${Math.floor((Date.now() + COOLDOWN) / 1000)}:R>`),
      ])
    );
  },
};
