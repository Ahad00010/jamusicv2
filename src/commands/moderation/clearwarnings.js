const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer, errorContainer } = require("../../utils/v2");
const warns = require("../../database/warns");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "clearwarnings",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear every warning from a user")
    .addUserOption((option) => option.setName("user").setDescription("The user").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const removed = warns.clearWarns(interaction.guildId, user.id);
    if (!removed) {
      return replyV2(interaction, warningContainer(`**${user.tag}** has no warnings to clear.`));
    }

    await replyV2(
      interaction,
      container(config.colors.success, [
        text(`## 🧽 Warnings cleared`),
        text(`Removed **${removed}** warning${removed === 1 ? "" : "s"} from **${user.tag}** (<@${user.id}>).`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🧽 Warnings cleared",
      color: config.colors.success,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Removed", value: `\`${removed}\`` },
      ],
    });
  },
};
