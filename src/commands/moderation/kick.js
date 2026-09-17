const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, V2_FLAG } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { logAction } = require("../../utils/log");
const { truncate } = require("../../utils/format");

module.exports = {
  name: "kick",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .addUserOption((option) => option.setName("user").setDescription("The member to kick").setRequired(true))
    .addStringOption((option) => option.setName("reason").setDescription("Reason").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") || "No reason provided";
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return replyV2(interaction, errorContainer("That user is not in this server."));
    const problem = hierarchyCheck(interaction, member);
    if (problem) return replyV2(interaction, errorContainer(problem));

    await user
      .send({
        components: [
          container(config.colors.error, [
            text(`## 👋 You were kicked`),
            text(`**Server:** ${interaction.guild.name}\n**Reason:** ${truncate(reason, 400)}`),
          ]),
        ],
        flags: V2_FLAG,
      })
      .catch(() => {});

    const kicked = await member.kick(`${reason} — by ${interaction.user.tag}`).catch(() => null);
    if (!kicked) {
      return replyV2(interaction, errorContainer(`Failed to kick **${user.tag}** — check my permissions and role position.`));
    }

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## 👋 Kicked`),
        text(`**User:** ${user.tag} (<@${user.id}>)\n**Reason:** ${reason}`),
      ])
    );

    await logAction(interaction.guild, {
      title: "👋 Member kicked",
      color: config.colors.moderation,
      fields: [
        { name: "User", value: `${user.tag} (\`${user.id}\`)` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
        { name: "Reason", value: reason },
      ],
    });
  },
};
