const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText } = require("../../utils/v2");

module.exports = {
  name: "invite",
  category: "general",
  data: new SlashCommandBuilder().setName("invite").setDescription("Get JaMusic V2's invite link"),
  cooldown: 3,
  async execute(interaction, client) {
    const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=3166160&scope=bot%20applications.commands`;

    await replyV2(
      interaction,
      container(config.colors.primary, [
        text(`## 📨 Invite JaMusic V2`),
        text(`Add the bot to your own server in a couple of clicks!`),
        separator(),
        text(fieldsText([{ name: "Invite URL", value: `[Click here to invite](${invite})` }])),
        separator(),
        text(`-# Required permissions include Connect, Speak, Manage Messages, Kick/Ban members, and Timeout members.`),
      ])
    );
  },
};
