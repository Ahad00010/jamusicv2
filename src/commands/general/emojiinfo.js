const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText } = require("../../utils/v2");

module.exports = {
  name: "emojiinfo",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("emojiinfo")
    .setDescription("Show information about a custom emoji")
    .addStringOption((option) => option.setName("emoji").setDescription("The custom emoji").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const raw = interaction.options.getString("emoji", true);
    const match = raw.match(/<(a?):(\w+):(\d+)>/);
    if (!match) {
      return replyV2(
        interaction,
        container(config.colors.error, [text(`## ❌ Not a custom emoji`), text(`Please pass a **custom** emoji from this server.`)])
      );
    }
    const [, animated, name, id] = match;
    const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}?quality=lossless`;

    await replyV2(
      interaction,
      container(config.colors.general, [
        text(`## 😀 :${name}:`),
        text(`-# ID: \`${id}\`${animated ? " • Animated" : ""}`),
        separator(),
        text(fieldsText([{ name: "Link", value: `[Full size](${url})` }])),
        separator(),
        text(`${raw}`),
      ])
    );
  },
};
