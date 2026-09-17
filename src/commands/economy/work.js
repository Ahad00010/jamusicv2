const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull, durationToHuman, randomInt, randomItem, timestamp } = require("../../utils/format");

const COOLDOWN = 3600 * 1000;

const SCENES = [
  "You fixed a stubborn bug 🐛",
  "You designed a logo for a client 🎨",
  "You walked 7 dogs 🐕",
  "You delivered 42 pizzas 🍕",
  "You sold out a small concert 🎤",
  "You taught a math class 📚",
  "You cleaned out the garage 🧹",
  "You streamed for 4 hours 🎥",
  "You won a coding contest 🏆",
  "You babysat three kids 👶",
];

module.exports = {
  name: "work",
  category: "economy",
  data: new SlashCommandBuilder().setName("work").setDescription("Work an hour and earn coins"),
  cooldown: 3,
  async execute(interaction, client) {
    const check = economy.checkCooldown(interaction.user.id, "work", COOLDOWN);
    if (check.onCooldown) {
      return replyV2(
        interaction,
        warningContainer(`You're tired from your last shift — next shift **${durationToHuman(check.remaining)}** from now. 😴`, {
          title: "⏳ Not ready",
        })
      );
    }

    let amount = randomInt(150, 400);
    const bonuses = [];
    if (economy.hasItem(interaction.user.id, "fishing_rod")) {
      amount = Math.floor(amount * 1.25);
      bonuses.push("🎣 Fishing Rod (+25%)");
    }
    if (economy.hasItem(interaction.user.id, "laptop")) {
      amount = Math.floor(amount * 1.5);
      bonuses.push("💻 Laptop (+50%)");
    }

    economy.addMoney(interaction.user.id, "wallet", amount);
    economy.setCooldown(interaction.user.id, "work");

    const scene = randomItem(SCENES);
    await replyV2(
      interaction,
      container(config.colors.economy, [
        text(`## 🛠️ Shift complete!`),
        text(`${scene} — you earned **${formatFull(amount)}** coins 🪙`),
        ...(bonuses.length ? [text(`-# ${bonuses.join(" • ")}`)] : []),
        separator(),
        text(`-# Next shift <t:${Math.floor((Date.now() + COOLDOWN) / 1000)}:R>`),
      ])
    );
  },
};
