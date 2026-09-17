const { SlashCommandBuilder, version: djsVersion } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, thumbnail, fieldsText } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const { timeAgo } = require("../../utils/format");

module.exports = {
  name: "botinfo",
  category: "general",
  data: new SlashCommandBuilder().setName("botinfo").setDescription("Show information about JaMusic V2"),
  cooldown: 3,
  async execute(interaction, client) {
    const memory = process.memoryUsage();
    const playerCount = client.music.manager.players.size;

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🤖 JaMusic V2`),
        new TextDisplayBuilder().setContent(
          `A modern music & community bot.\n-# Powered by discord.js v14 + moonlink.js v5 (NodeLink)`
        )
      )
      .setThumbnailAccessory(thumbnail(client.user.displayAvatarURL({ size: 256 }), client.user.tag));

    await replyV2(
      interaction,
      container(config.colors.general, [
        section,
        separator(),
        text(
          fieldsText([
            { name: "Uptime", value: `\`${timeAgo(client.uptime)}\`` },
            { name: "Servers", value: `\`${client.guilds.cache.size}\`` },
            { name: "Users (cached)", value: `\`${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}\`` },
            { name: "Commands", value: `\`${client.commands.size}\`` },
            { name: "Active players", value: `\`${playerCount}\`` },
            { name: "Memory", value: `\`${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB\`` },
            { name: "Node.js", value: `\`${process.version}\`` },
            { name: "discord.js", value: `\`v${djsVersion}\`` },
          ])
        ),
        separator(),
        text(`-# Developed with 💜 — Components V2 UI everywhere.`),
      ])
    );
  },
};
