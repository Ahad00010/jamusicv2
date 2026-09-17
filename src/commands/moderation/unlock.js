const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer } = require("../../utils/v2");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "unlock",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlock this channel")
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  async execute(interaction, client) {
    const reason = interaction.options.getString("reason") || "No reason provided";
    const everyone = interaction.guild.roles.everyone;

    await interaction.channel.permissionOverwrites
      .edit(everyone, { SendMessages: null, reason: `Unlocked by ${interaction.user.tag}: ${reason}` })
      .catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.success, [
        text(`## 🔓 Channel unlocked`),
        text(`<#${interaction.channel.id}> is now open again.\n**Reason:** ${reason}`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🔓 Channel unlocked",
      color: config.colors.success,
      fields: [
        { name: "Channel", value: `<#${interaction.channel.id}> (\`${interaction.channel.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
