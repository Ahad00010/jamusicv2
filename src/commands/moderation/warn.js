const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, V2_FLAG } = require("../../utils/v2");
const warns = require("../../database/warns");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");
const { truncate } = require("../../utils/format");

module.exports = {
  name: "warn",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) => option.setName("user").setDescription("The member to warn").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the warning").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const problem = hierarchyCheck(interaction, member);
      if (problem) return replyV2(interaction, errorContainer(problem));
    }

    const warn = warns.addWarn(interaction.guildId, user.id, interaction.user.id, truncate(reason, 500));
    const total = warns.countWarns(interaction.guildId, user.id);

    await user
      .send({
        components: [
          container(config.colors.warning, [
            text(`## ⚠️ You were warned`),
            text(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Total warnings:** ${total}`),
          ]),
        ],
        flags: V2_FLAG,
      })
      .catch(() => {});

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## ⚠️ Warned`),
        text(`**User:** ${user.tag} (<@${user.id}>)\n**Reason:** ${reason}\n**Warning #** \`${warn.id}\` • Total: **${total}**`),
      ])
    );

    await logAction(interaction.guild, {
      title: "⚠️ Member warned",
      color: config.colors.warning,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: truncate(reason, 400) },
        { name: "Warning ID", value: `\`${warn.id}\`` },
      ],
    });
  },
};
