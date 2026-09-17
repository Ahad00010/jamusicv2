const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, warningContainer } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "removerole",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("Remove a role from a member")
    .addUserOption((option) => option.setName("user").setDescription("The member").setRequired(true))
    .addRoleOption((option) => option.setName("role").setDescription("The role to remove").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const role = interaction.options.getRole("role", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return replyV2(interaction, errorContainer("That user is not in this server."));
    if (!role.editable) {
      return replyV2(interaction, errorContainer(`I can't manage **@${role.name}** — move my role above it. ⬆️`));
    }
    if (!member.roles.cache.has(role.id)) {
      return replyV2(interaction, warningContainer(`**${user.tag}** doesn't have **@${role.name}**.`));
    }

    await member.roles.remove(role, `Removed by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.success, [
        text(`## 🏷️ Role removed`),
        text(`**@${role.name}** was removed from **${user.tag}** (<@${user.id}>).`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🏷️ Role removed",
      color: config.colors.moderation,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Role", value: `@${role.name} (\`${role.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
      ],
    });
  },
};
