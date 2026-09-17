const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");
const { parseDuration, durationToHuman, truncate } = require("../../utils/format");

module.exports = {
  name: "timeout",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .addUserOption((option) => option.setName("user").setDescription("The member to timeout").setRequired(true))
    .addStringOption((option) =>
      option.setName("duration").setDescription("e.g. 10m, 1h, 2d (max 28d)").setRequired(true)
    )
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const ms = parseDuration(interaction.options.getString("duration", true));

    if (ms == null || ms < 5000 || ms > 28 * 24 * 3600 * 1000) {
      return replyV2(interaction, errorContainer("Duration must be between 5 seconds and 28 days — e.g. `10m`, `1h`, `2d`. ⏱️"));
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return replyV2(interaction, errorContainer("That user is not in this server."));
    const problem = hierarchyCheck(interaction, member);
    if (problem) return replyV2(interaction, errorContainer(problem));

    const until = Date.now() + ms;
    await member.timeout(ms, `${reason} — by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## 🔇 Timed out`),
        text(
          `**User:** ${user.tag} (<@${user.id}>)\n**Duration:** ${durationToHuman(ms)} (<t:${Math.floor(
            until / 1000
          )}:R>)\n**Reason:** ${reason}`
        ),
      ])
    );

    await logAction(interaction.guild, {
      title: "🔇 Member timed out",
      color: config.colors.moderation,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Duration", value: durationToHuman(ms) },
        { name: "Reason", value: truncate(reason, 300) },
      ],
    });
  },
};
