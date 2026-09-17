const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "unban",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by ID")
    .addStringOption((option) => option.setName("user_id").setDescription("The ID of the banned user").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const userId = interaction.options.getString("user_id", true).trim();
    const reason = interaction.options.getString("reason") || "No reason provided";

    if (!/^\d{17,20}$/.test(userId)) {
      return replyV2(interaction, errorContainer("That doesn't look like a valid user ID (17-20 digits)."));
    }

    const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      return replyV2(interaction, errorContainer(`No ban found for ID \`${userId}\`.`));
    }

    await interaction.guild.members.unban(userId, `${reason} — by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## ✅ Unbanned`),
        text(`**User:** ${ban.user.tag} (<@${ban.user.id}>)\n**Reason:** ${reason}`),
      ])
    );

    await logAction(interaction.guild, {
      title: "✅ Member unbanned",
      color: config.colors.success,
      fields: [
        { name: "User", value: `${ban.user.tag} (\`${ban.user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
