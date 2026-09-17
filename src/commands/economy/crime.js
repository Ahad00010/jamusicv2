const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull, durationToHuman, randomInt, randomItem, timestamp } = require("../../utils/format");

const COOLDOWN = 45 * 60 * 1000;

const CRIMES = [
  "You hacked the local pizzeria's Wi-Fi 🍕",
  "You pickpocketed a sleeping raccoon 🦝",
  "You livestreamed a secret government meeting 📡",
  "You sold knockoff sneakers 👟",
  "You pawned a stolen garden gnome 🧙",
  "You skimmed cards at a pretend casino 🎰",
  "You ran a fake charity for pigeons 🐦",
];

const FAILS = [
  "A security camera caught everything 📹",
  "You tripped over your own shoelaces and fled 🏃",
  "An undercover cop was watching 🚓",
  "You left your ID at the scene 🪪",
];

module.exports = {
  name: "crime",
  category: "economy",
  data: new SlashCommandBuilder().setName("crime").setDescription("Attempt a risky crime for big rewards"),
  cooldown: 3,
  async execute(interaction, client) {
    const check = economy.checkCooldown(interaction.user.id, "crime", COOLDOWN);
    if (check.onCooldown) {
      return replyV2(
        interaction,
        warningContainer(`The heat is on — lay low for **${durationToHuman(check.remaining)}**. 🚨`, { title: "⏳ Cooling off" })
      );
    }

    economy.setCooldown(interaction.user.id, "crime");

    if (Math.random() < 0.45) {
      const fine = randomInt(150, 600);
      economy.removeMoney(interaction.user.id, "wallet", fine);
      return replyV2(
        interaction,
        container(config.colors.error, [
          text(`## 🚨 Busted!`),
          text(`${randomItem(FAILS)}\nYou were fined **${formatFull(fine)}** coins.`),
        ])
      );
    }

    const amount = randomInt(400, 2200);
    economy.addMoney(interaction.user.id, "wallet", amount);
    await replyV2(
      interaction,
      container(config.colors.economy, [
        text(`## 😈 Crime successful!`),
        text(`${randomItem(CRIMES)}\nYou got away with **${formatFull(amount)}** coins 🪙`),
        separator(),
        text(`-# Next attempt <t:${Math.floor((Date.now() + COOLDOWN) / 1000)}:R>`),
      ])
    );
  },
};
