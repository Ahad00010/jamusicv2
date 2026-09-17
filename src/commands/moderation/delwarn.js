const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const warns = require("../../database/warns");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "delwarn",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("delwarn")
    .setDescription("Delete a specific warning by its ID")
    .addIntegerOption((option) => option.setName("id").setDescription("The warning ID (see /warnings)").setMinValue(1).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const id = interaction.options.getInteger("id", true);
    const removed = warns.removeWarn(interaction.guildId, id);
    if (!removed) {
      return replyV2(interaction, errorContainer(`No warning with ID \`${id}\` exists in this server.`));
    }

    await replyV2(
      interaction,
      container(config.colors.success, [
        text(`## 🗑️ Warning deleted`),
        text(`\`#${removed.id}\` for <@${removed.userId}> removed.\n**Was:** ${removed.reason}`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🗑️ Warning deleted",
      color: config.colors.success,
      fields: [
        { name: "Warning", value: `\`#${removed.id}\` — <@${removed.userId}>` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
      ],
    });
  },
};
