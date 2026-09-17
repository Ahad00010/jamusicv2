const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, successContainer } = require("../../utils/v2");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "lock",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock this channel (stop members from sending messages)")
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  async execute(interaction, client) {
    const reason = interaction.options.getString("reason") || "No reason provided";
    const everyone = interaction.guild.roles.everyone;

    await interaction.channel.permissionOverwrites
      .edit(everyone, { SendMessages: false, reason: `Locked by ${interaction.user.tag}: ${reason}` })
      .catch(() => null);

    await replyV2(
      interaction,
      successContainer(`<#${interaction.channel.id}> is now **locked**. 🔒\n**Reason:** ${reason}`, { title: "🔒 Channel locked" })
    );

    await logAction(interaction.guild, {
      title: "🔒 Channel locked",
      color: config.colors.moderation,
      fields: [
        { name: "Channel", value: `<#${interaction.channel.id}> (\`${interaction.channel.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
