const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, warningContainer } = require("../../utils/v2");
const economy = require("../../database/economy");
const { formatFull, durationToHuman, randomInt, timestamp } = require("../../utils/format");

const COOLDOWN = 5 * 60 * 1000;

module.exports = {
  name: "rob",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Try to rob another member's wallet")
    .addUserOption((option) => option.setName("user").setDescription("Who are you robbing?").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const target = interaction.options.getUser("user", true);

    if (target.id === interaction.user.id) {
      return replyV2(interaction, errorContainer("Robbing yourself is just moving coins between pockets. 🤔"));
    }
    if (target.bot) {
      return replyV2(interaction, errorContainer("Bots don't carry wallets (mine is fully insured). 🤖"));
    }

    const check = economy.checkCooldown(interaction.user.id, "rob", COOLDOWN);
    if (check.onCooldown) {
      return replyV2(
        interaction,
        warningContainer(`Your hands are still shaking — next attempt **${durationToHuman(check.remaining)}** from now. 🥷`, {
          title: "⏳ Not ready",
        })
      );
    }

    const robber = economy.getUser(interaction.user.id);
    const victim = economy.getUser(target.id);

    if (robber.wallet < 100) {
      return replyV2(interaction, errorContainer("You need at least **100** coins in your wallet to attempt a robbery. 💸"));
    }
    if (victim.wallet < 100) {
      return replyV2(interaction, errorContainer(`**${target.tag}** doesn't carry enough coins to be worth the risk. 🪙`));
    }

    economy.setCooldown(interaction.user.id, "rob");

    // Shield blocks completely; padlock blocks once and breaks
    if (economy.hasItem(target.id, "shield")) {
      return replyV2(
        interaction,
        container(config.colors.error, [
          text(`## 🛡️ Blocked!`),
          text(`**${target.tag}** is protected by a Bodyguard Shield — you fled empty-handed!`),
        ])
      );
    }
    if (economy.hasItem(target.id, "padlock")) {
      economy.removeItem(target.id, "padlock", 1);
      return replyV2(
        interaction,
        container(config.colors.error, [
          text(`## 🔒 Padlock!`),
          text(`**${target.tag}**'s padlock blocked your attempt (and broke). You fled empty-handed!`),
        ])
      );
    }

    if (Math.random() < 0.45) {
      const stolen = Math.max(50, Math.floor(victim.wallet * (randomInt(10, 30) / 100)));
      economy.removeMoney(target.id, "wallet", stolen);
      economy.addMoney(interaction.user.id, "wallet", stolen);
      return replyV2(
        interaction,
        container(config.colors.economy, [
          text(`## 🥷 Robbery successful!`),
          text(`You snatched **${formatFull(stolen)}** coins from **${target.tag}**'s wallet! 🪙`),
          separator(),
          text(`-# They might come for revenge…`),
        ])
      );
    }

    const fine = randomInt(100, 400);
    economy.removeMoney(interaction.user.id, "wallet", Math.min(fine, robber.wallet));
    economy.addMoney(target.id, "wallet", fine);
    return replyV2(
      interaction,
      container(config.colors.error, [
        text(`## 🚔 Caught red-handed!`),
        text(`**${target.tag}** caught you! You paid them **${formatFull(fine)}** coins in damages.`),
      ])
    );
  },
};
