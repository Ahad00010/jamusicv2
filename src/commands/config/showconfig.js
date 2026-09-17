const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText } = require("../../utils/v2");
const guildStore = require("../../database/guilds");
const { currentSettingsText } = require("./setup");

module.exports = {
  name: "showconfig",
  category: "config",
  data: new SlashCommandBuilder()
    .setName("showconfig")
    .setDescription("View the current bot configuration for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 3,
  async execute(interaction, client) {
    const settings = guildStore.getSettings(interaction.guildId);
    await replyV2(
      interaction,
      container(config.colors.config, [
        text(`## ⚙️ Current configuration`),
        separator(),
        text(currentSettingsText(settings)),
        separator(),
        text(`-# Change anything with </setup:0>`),
      ]),
      { ephemeral: true }
    );
  },
};
