const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "vunmute",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("vunmute")
    .setDescription("Remove a member's server voice mute")
    .addUserOption((option) => option.setName("user").setDescription("The member to unmute").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return replyV2(interaction, errorContainer("That user is not in this server."));
    if (!member.voice.channel) {
      return replyV2(interaction, errorContainer(`**${user.tag}** is not connected to a voice channel. 🎙️`));
    }

    await member.voice.setMute(false, `${reason} — by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.success, [text(`## 🔊 Voice unmuted`), text(`**User:** ${user.tag} (<@${user.id}>)`)])
    );

    await logAction(interaction.guild, {
      title: "🔊 Voice unmuted",
      color: config.colors.success,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
      ],
    });
  },
};
