const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, mediaGallery, V2_FLAG } = require("../../utils/v2");

module.exports = {
  name: "banner",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("Show a user's profile banner")
    .addUserOption((option) => option.setName("user").setDescription("The user (defaults to you)")),
  cooldown: 3,
  async execute(interaction, client) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    // Discord only accepts EPHEMERAL on a deferred callback — the V2 flag goes on the edits below.
    await interaction.deferReply();
    const fullUser = await user.fetch(true).catch(() => user);
    const url = fullUser.bannerURL({ size: 1024, extension: "png" });

    if (!url) {
      return interaction.editReply({
        components: [
          container(config.colors.warning, [
            text(`## 🖼️ No banner`),
            text(`**${user.tag}** hasn't set a profile banner yet.`),
          ]),
        ],
        flags: V2_FLAG,
      });
    }

    await interaction.editReply({
      components: [
        container(config.colors.general, [
          text(`## 🖼️ ${user.tag}'s banner`),
          separator(),
          mediaGallery([{ url, description: `${user.tag} banner` }]),
        ]),
      ],
      flags: V2_FLAG,
    });
  },
};
