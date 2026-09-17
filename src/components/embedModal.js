const { MessageFlags } = require("discord.js");
const { container, text, separator, mediaGallery, V2_FLAG, errorContainer } = require("../utils/v2");
const config = require("../config");

module.exports = function registerEmbedModal(register) {
  register("embed:", async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    const title = interaction.fields.getTextInputValue("title")?.trim();
    const description = interaction.fields.getTextInputValue("description")?.trim();
    const colorRaw = interaction.fields.getTextInputValue("color")?.trim();
    const image = interaction.fields.getTextInputValue("image")?.trim();
    const footer = interaction.fields.getTextInputValue("footer")?.trim();

    let color = config.colors.primary;
    if (colorRaw) {
      const hex = colorRaw.replace("#", "");
      if (/^[0-9a-fA-F]{6}$/.test(hex)) color = parseInt(hex, 16);
      else {
        return interaction.reply({
          components: [errorContainer(`\`${colorRaw}\` is not a valid hex color (e.g. \`5865F2\`).`)],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        });
      }
    }

    if (image && !/^https?:\/\//.test(image)) {
      return interaction.reply({
        components: [errorContainer("The image must be a valid http(s) URL.")],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      });
    }

    const children = [text(`## ${title || "📢 Announcement"}`)];
    if (title) children.push(separator());
    children.push(text(description));
    if (image) {
      children.push(separator());
      children.push(mediaGallery([{ url: image }]));
    }
    if (footer) children.push(separator(), text(`-# ${footer} • By ${interaction.user.tag}`));

    const channel = interaction.channel;
    await channel.send({ components: [container(color, children)], flags: V2_FLAG, allowedMentions: { parse: [] } });
    await interaction.reply({
      components: [container(config.colors.success, [text(`## ✅ Message sent`), text(`Your message was posted in ${channel}.`)])],
      flags: V2_FLAG | MessageFlags.Ephemeral,
    });
  });
};
