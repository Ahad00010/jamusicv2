const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer, V2_FLAG } = require("../../utils/v2");
const { truncate } = require("../../utils/format");

module.exports = {
  name: "dm",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Send a direct message to a member as the bot")
    .addUserOption((option) => option.setName("user").setDescription("The member to DM").setRequired(true))
    .addStringOption((option) => option.setName("message").setDescription("What to send").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user", true);
    const message = interaction.options.getString("message", true);

    const sent = await user
      .send({
        components: [
          container(config.colors.primary, [
            text(`## 📬 Message from ${interaction.guild.name}`),
            text(truncate(message, 3500)),
            separator(),
            text(`-# From ${interaction.user.tag} — reply to the moderators in the server.`),
          ]),
        ],
        flags: V2_FLAG,
      })
      .catch(() => null);

    if (!sent) {
      return replyV2(interaction, errorContainer(`I couldn't DM **${user.tag}** — they may have DMs closed. 📪`));
    }

    await replyV2(
      interaction,
      container(config.colors.success, [
        text(`## 📬 DM sent`),
        text(`Your message was delivered to **${user.tag}**:\n\n> ${truncate(message, 500)}`),
      ]),
      { ephemeral: true }
    );
  },
};
