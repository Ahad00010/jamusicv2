const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { hierarchyCheck } = require("../../utils/perms");
const { truncate } = require("../../utils/format");

module.exports = {
  name: "nickname",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("nickname")
    .setDescription("Change a member's nickname")
    .addUserOption((option) => option.setName("user").setDescription("The member").setRequired(true))
    .addStringOption((option) =>
      option.setName("nickname").setDescription("New nickname (or 'clear' to reset)").setMaxLength(32).setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ChangeNickname | PermissionFlagsBits.ManageNicknames),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const nickname = interaction.options.getString("nickname", true).trim();
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return replyV2(interaction, errorContainer("That user is not in this server."));

    if (member.id !== interaction.user.id) {
      const problem = hierarchyCheck(interaction, member);
      if (problem) return replyV2(interaction, errorContainer(problem));
    }

    const newNick = nickname.toLowerCase() === "clear" ? null : nickname;
    await member.setNickname(newNick, `Nickname changed by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## 🏷️ Nickname updated`),
        text(`**${user.tag}** is now known as **${newNick ?? user.username}**.`),
      ])
    );
  },
};
