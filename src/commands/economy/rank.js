const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, thumbnail } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const economy = require("../../database/economy");
const { xpForLevel, getRank } = require("../../database/economy");
const { formatFull } = require("../../utils/format");

module.exports = {
  name: "rank",
  category: "economy",
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your (or someone else's) XP rank card")
    .addUserOption((option) => option.setName("user").setDescription("Whose rank? (defaults to you)")),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const data = economy.getUser(user.id);

    const currentLevelXp = xpForLevel(data.level);
    const nextLevelXp = xpForLevel(data.level + 1);
    const progress = Math.max(0, data.xp - currentLevelXp);
    const needed = Math.max(1, nextLevelXp - currentLevelXp);
    const pct = Math.min(100, Math.round((progress / needed) * 100));

    const barLength = 20;
    const filled = Math.round((pct / 100) * barLength);
    const bar = "▰".repeat(filled) + "▱".repeat(barLength - filled);

    const rank = getRank("xp", user.id) ?? "—";

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ⭐ Rank card — ${user.tag}`),
        new TextDisplayBuilder().setContent(`-# Level **${data.level}** • Global rank **#${rank}**`)
      )
      .setThumbnailAccessory(thumbnail(user.displayAvatarURL({ size: 256 }), user.tag));

    await replyV2(
      interaction,
      container(config.colors.economy, [
        section,
        separator(),
        text(`**${bar}** \`${pct}%\``),
        text(`-# ${formatFull(progress)} / ${formatFull(needed)} xp to level **${data.level + 1}** • Total xp: ${formatFull(data.xp)}`),
        separator(),
        text(`-# Chat to earn XP (15-25 per minute of activity)`),
      ])
    );
  },
};
