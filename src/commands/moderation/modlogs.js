const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, paginate, warningContainer } = require("../../utils/v2");
const warns = require("../../database/warns");
const { timestamp } = require("../../utils/format");

module.exports = {
  name: "modlogs",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View a user's moderation history (warnings)")
    .addUserOption((option) => option.setName("user").setDescription("The user").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const list = warns.getWarns(interaction.guildId, user.id);

    if (!list.length) {
      return replyV2(interaction, warningContainer(`**${user.tag}** has no moderation history. ✨`));
    }

    const PER_PAGE = 5;
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));

    await paginate(interaction, {
      id: `modlogs:${interaction.guildId}:${user.id}`,
      totalPages,
      buildPage: (page) => {
        const slice = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
        return container(config.colors.moderation, [
          text(`## 📋 Mod logs — ${user.tag}`),
          text(`-# ${list.length} entr${list.length === 1 ? "y" : "ies"} • Page ${page}/${totalPages}`),
          separator(),
          text(
            slice
              .map(
                (w) =>
                  `\`#${w.id}\` ⚠️ **${w.reason.slice(0, 80)}**\n` +
                  `-# Moderator <@${w.moderatorId}> • <t:${Math.floor(w.timestamp / 1000)}:f>`
              )
              .join("\n\n")
          ),
        ]);
      },
    });
  },
};
