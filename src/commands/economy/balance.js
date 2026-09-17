const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, thumbnail } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const economy = require("../../database/economy");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "balance",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your (or someone else's) balance")
    .addUserOption((option) => option.setName("user").setDescription("Whose balance? (defaults to you)")),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const { wallet, bank, net } = economy.getBalance(user.id);

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 💰 ${user.id === interaction.user.id ? "Your balance" : `${user.tag}'s balance`}`),
        new TextDisplayBuilder().setContent(`Net worth: **${formatFull(net)}** coins 🪙`)
      )
      .setThumbnailAccessory(thumbnail(user.displayAvatarURL({ size: 256 }), user.tag));

    await replyV2(
      interaction,
      container(config.colors.economy, [
        section,
        separator(),
        text(`**👛 Wallet:** \`${formatFull(wallet)}\` coins\n**🏦 Bank:** \`${formatFull(bank)}\` coins`),
        separator(),
        text(`-# Earn more with </daily:0>, </work:0> and </weekly:0>`),
      ])
    );
  },
};
