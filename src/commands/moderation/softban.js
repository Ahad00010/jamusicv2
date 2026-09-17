const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "softban",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Ban and immediately unban to delete a member's messages")
    .addUserOption((option) => option.setName("user").setDescription("The member to softban").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return replyV2(interaction, errorContainer("That user is not in this server."));
    const problem = hierarchyCheck(interaction, member);
    if (problem) return replyV2(interaction, errorContainer(problem));

    await interaction.guild.members.ban(user.id, { reason: `Softban: ${reason}`, deleteMessageSeconds: 86400 }).catch(() => null);
    await interaction.guild.members.unban(user.id, `Softban cleanup — by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## 🧹 Softbanned`),
        text(`**User:** ${user.tag} (<@${user.id}>)\n**Reason:** ${reason}\n-# Banned & unbanned — last 24h of messages removed.`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🧹 Member softbanned",
      color: config.colors.moderation,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
