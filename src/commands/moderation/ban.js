const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, V2_FLAG } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");
const { truncate } = require("../../utils/format");

module.exports = {
  name: "ban",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((option) => option.setName("user").setDescription("The member to ban").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason for the ban").setRequired(false))
    .addIntegerOption((option) =>
      option.setName("delete_days").setDescription("Delete message history (days)").setMinValue(0).setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member && !user) {
      return replyV2(interaction, errorContainer("That user could not be found."));
    }
    if (member) {
      const problem = hierarchyCheck(interaction, member);
      if (problem) return replyV2(interaction, errorContainer(problem));
    }

    await interaction.guild.members
      .ban(user.id, { reason: `${reason} — by ${interaction.user.tag}`, deleteMessageSeconds: deleteDays * 86400 })
      .catch((error) => {
        console.error("[Ban]", error);
        return null;
      });

    if (!interaction.guild.bans.cache) await interaction.guild.bans.fetch().catch(() => {});
    const banned = interaction.guild.bans.cache.has(user.id);
    if (!banned) {
      return replyV2(interaction, errorContainer(`Failed to ban **${user.tag}** — check my permissions and role position.`));
    }

    // DM the user (best effort)
    await user
      .send({
        components: [
          container(config.colors.error, [
            text(`## 🔨 You were banned`),
            text(`**Server:** ${interaction.guild.name}\n**Reason:** ${truncate(reason, 400)}`),
          ]),
        ],
        flags: V2_FLAG,
      })
      .catch(() => {});

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## 🔨 Banned`),
        text(`**User:** ${user.tag} (<@${user.id}>)\n**Reason:** ${reason}\n**History deleted:** ${deleteDays} day(s)`),
      ])
    );

    await logAction(interaction.guild, {
      title: "🔨 Member banned",
      color: config.colors.moderation,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
