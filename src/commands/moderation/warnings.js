const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer, paginate } = require("../../utils/v2");
const warns = require("../../database/warns");
const { timestamp, truncate } = require("../../utils/format");

module.exports = {
  name: "warnings",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("List a user's warnings")
    .addUserOption((option) => option.setName("user").setDescription("The user").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const list = warns.getWarns(interaction.guildId, user.id);

    if (!list.length) {
      return replyV2(interaction, warningContainer(`**${user.tag}** has a clean record — no warnings! ✨`, { title: "⚠️ No warnings" }));
    }

    const PER_PAGE = 5;
    const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));

    await paginate(interaction, {
      id: `warns:${interaction.guildId}:${user.id}`,
      totalPages,
      buildPage: (page) => {
        const slice = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);
        return container(config.colors.moderation, [
          text(`## ⚠️ Warnings — ${user.tag}`),
          text(`-# ${list.length} total warning${list.length === 1 ? "" : "s"} • Page ${page}/${totalPages}`),
          separator(),
          text(
            slice
              .map(
                (w) =>
                  `\`#${w.id}\` **${truncate(w.reason, 80)}**\n` +
                  `-# By <@${w.moderatorId}> • <t:${Math.floor(w.timestamp / 1000)}:R>`
              )
              .join("\n\n")
          ),
        ]);
      },
    });
  },
};
