const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, mediaGallery, fieldsText } = require("../../utils/v2");
const { timestamp } = require("../../utils/format");

module.exports = {
  name: "avatar",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a user's avatar in full size")
    .addUserOption((option) => option.setName("user").setDescription("The user (defaults to you)")),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const url = user.displayAvatarURL({ size: 1024, extension: "png" });

    await replyV2(
      interaction,
      container(config.colors.general, [
        text(`## 🖼️ ${user.tag}'s avatar`),
        separator(),
        mediaGallery([{ url, description: `${user.tag} avatar` }]),
        separator(),
        text(fieldsText([{ name: "Links", value: `[PNG](${url})` }])),
      ])
    );
  },
};
