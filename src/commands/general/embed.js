const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer, V2_FLAG } = require("../../utils/v2");

module.exports = {
  name: "embed",
  category: "general",
  data: new SlashCommandBuilder().setName("embed").setDescription("Create a message with the embed builder (modal)"),
  cooldown: 5,
  async execute(interaction, client) {
    const modal = new ModalBuilder().setCustomId("embed:modal").setTitle("Create your message");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("title").setLabel("Title").setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Message text")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(3000)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Accent color hex (e.g. 5865F2)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(7)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("Image URL (optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("footer").setLabel("Footer (optional)").setStyle(TextInputStyle.Short).setMaxLength(150).setRequired(false)
      )
    );

    await interaction.showModal(modal);
  },
};

/** Modal submit handler — registered in components/embedModal.js */
