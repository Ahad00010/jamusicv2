const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "vmute",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("vmute")
    .setDescription("Server-mute a member in voice channels")
    .addUserOption((option) => option.setName("user").setDescription("The member to mute").setRequired(true))
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
    const problem = hierarchyCheck(interaction, member);
    if (problem) return replyV2(interaction, errorContainer(problem));

    await member.voice.setMute(true, `${reason} — by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## 🔇 Voice muted`),
        text(`**User:** ${user.tag} (<@${user.id}>)\n**Reason:** ${reason}`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🔇 Voice muted",
      color: config.colors.moderation,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
