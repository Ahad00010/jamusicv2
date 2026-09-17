const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "untimeout",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove a member's timeout")
    .addUserOption((option) => option.setName("user").setDescription("The member").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return replyV2(interaction, warningContainer("That user is not in this server."));
    if (!member.isCommunicationDisabled()) {
      return replyV2(interaction, warningContainer(`**${user.tag}** is not timed out.`));
    }

    await member.timeout(null, `${reason} — by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.success, [text(`## 🔊 Timeout removed`), text(`**User:** ${user.tag} (<@${user.id}>)\n**Reason:** ${reason}`)])
    );

    await logAction(interaction.guild, {
      title: "🔊 Timeout removed",
      color: config.colors.success,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
