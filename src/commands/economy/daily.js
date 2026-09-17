const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull, durationToHuman, timestamp } = require("../../utils/format");

const BASE = 250;
const COOLDOWN = 24 * 3600 * 1000;

module.exports = {
  name: "daily",
  category: "economy",
  data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily coins (streaks pay more!)"),
  cooldown: 3,
  async execute(interaction, client) {
    const check = economy.checkCooldown(interaction.user.id, "daily", COOLDOWN);
    if (check.onCooldown) {
      return replyV2(
        interaction,
        warningContainer(`You already claimed your daily coins — come back **${durationToHuman(check.remaining)}** later. ⏰`, {
          title: "⏳ Already claimed",
        })
      );
    }

    const user = economy.getUser(interaction.user.id);
    const last = user.lastDaily;

    // Streak: consecutive days, broken after 48h
    const streak = last && Date.now() - last < COOLDOWN * 2 ? user.dailyStreak + 1 : 1;

    let amount = BASE + Math.min(streak - 1, 7) * 50; // +50 per streak day (max +350)
    let bonusLines = [`Streak: **${streak}** day${streak === 1 ? "" : "s"} (+${Math.min(streak - 1, 7) * 50})`];

    if (economy.hasItem(interaction.user.id, "smartphone")) {
      amount = Math.floor(amount * 1.2);
      bonusLines.push("📱 Smartphone bonus (+20%)");
    }
    if (economy.hasItem(interaction.user.id, "booster")) {
      amount *= 2;
      economy.removeItem(interaction.user.id, "booster", 1);
      bonusLines.push("⚡ Booster consumed (**×2**)");
    }

    economy.addMoney(interaction.user.id, "wallet", amount);
    economy.setCooldown(interaction.user.id, "daily");
    economy.updateUser(interaction.user.id, { dailyStreak: streak });

    await replyV2(
      interaction,
      container(config.colors.economy, [
        text(`## 🎁 Daily claimed!`),
        text(`You received **${formatFull(amount)}** coins 🪙\n${bonusLines.join("\n")}`),
        separator(),
        text(`-# Next claim ready <t:${Math.floor((Date.now() + COOLDOWN) / 1000)}:R>`),
      ])
    );
  },
};
