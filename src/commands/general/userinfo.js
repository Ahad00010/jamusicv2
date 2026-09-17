const { SlashCommandBuilder, UserFlagsBitField } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, thumbnail, fieldsText } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const { timestamp, truncate } = require("../../utils/format");
const economy = require("../../database/economy");

const BADGES = {
  Staff: "🧑‍💼",
  Partner: "🤝",
  HypeSquadOnlineHouse1: "🏡",
  HypeSquadOnlineHouse2: "🏠",
  HypeSquadOnlineHouse3: "🏘️",
  BugHunterLevel1: "🐛",
  BugHunterLevel2: "🐞",
  ActiveDeveloper: "👨‍💻",
  PremiumEarlySupporter: "⚜️",
};

module.exports = {
  name: "userinfo",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show information about a user")
    .addUserOption((option) => option.setName("user").setDescription("The user (defaults to you)")),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const flags = new UserFlagsBitField(user.flags?.bitfield ?? user.flags ?? 0);
    const badges = [...BADGES.entries()]
      .filter(([flag]) => flags.has(flag))
      .map(([, emoji]) => emoji)
      .join(" ");

    const roles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .first(10)
          .map((r) => `<@&${r.id}>`)
      : [];

    const eco = economy.getUser(user.id);

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 👤 ${truncate(user.tag, 60)}${user.bot ? " 🤖" : ""}`),
        new TextDisplayBuilder().setContent(`-# ID: \`${user.id}\`${badges ? ` • ${badges}` : ""}`)
      )
      .setThumbnailAccessory(thumbnail(user.displayAvatarURL({ size: 256 }), user.tag));

    await replyV2(
      interaction,
      container(config.colors.general, [
        section,
        separator(),
        text(
          fieldsText([
            { name: "Account created", value: timestamp(user.createdTimestamp, "R") },
            member
              ? { name: "Joined server", value: timestamp(member.joinedTimestamp, "R") }
              : { name: "Member", value: "Not in this server" },
            member ? { name: "Nickname", value: member.nickname ?? "*none*" } : null,
            { name: "Economy", value: `💰 \`${eco.wallet}\` • 🏦 \`${eco.bank}\`` },
            { name: "Level", value: `\`${eco.level}\` (\`${eco.xp}\` xp)` },
            roles.length ? { name: `Roles (${member.roles.cache.size - 1})`, value: roles.join(" ") } : null,
          ])
        ),
      ])
    );
  },
};
