const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, RoleSelectMenuBuilder, ChannelSelectMenuBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText } = require("../../utils/v2");
const guildStore = require("../../database/guilds");
const { PermissionFlagsBits: PFB } = require("discord.js");

module.exports = {
  name: "setup",
  category: "config",
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure welcome messages, logs, DJ and mod roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  async execute(interaction, client) {
    const settings = guildStore.getSettings(interaction.guildId);

    const welcomeSelect = new ChannelSelectMenuBuilder()
      .setCustomId("cfg:welcomeChannelId")
      .setPlaceholder("Welcome messages channel")
      .addChannelTypes(ChannelType.GuildText);
    const leaveSelect = new ChannelSelectMenuBuilder()
      .setCustomId("cfg:leaveChannelId")
      .setPlaceholder("Leave messages channel")
      .addChannelTypes(ChannelType.GuildText);
    const logSelect = new ChannelSelectMenuBuilder()
      .setCustomId("cfg:logChannelId")
      .setPlaceholder("Moderation logs channel")
      .addChannelTypes(ChannelType.GuildText);
    const djSelect = new RoleSelectMenuBuilder().setCustomId("cfg:djRoleId").setPlaceholder("DJ role (music controls)");
    const modSelect = new RoleSelectMenuBuilder()
      .setCustomId("cfg:modRoleIds")
      .setPlaceholder("Moderator roles (up to 3)")
      .setMaxValues(3);
    const autoSelect = new RoleSelectMenuBuilder()
      .setCustomId("cfg:autoRoleIds")
      .setPlaceholder("Auto roles for new members (up to 3)")
      .setMaxValues(3);

    await replyV2(
      interaction,
      container(config.colors.config, [
        text(`## ⚙️ Server Setup`),
        text(`Pick channels and roles below — each select saves instantly and this panel updates.`),
        separator(),
        new ActionRowBuilder().addComponents(welcomeSelect),
        new ActionRowBuilder().addComponents(leaveSelect),
        new ActionRowBuilder().addComponents(logSelect),
        new ActionRowBuilder().addComponents(djSelect),
        new ActionRowBuilder().addComponents(modSelect),
        new ActionRowBuilder().addComponents(autoSelect),
        separator(),
        text(currentSettingsText(settings)),
      ]),
      { ephemeral: true }
    );
  },
};

function currentSettingsText(settings) {
  const lines = [
    { name: "👋 Welcome channel", value: settings.welcomeChannelId ? `<#${settings.welcomeChannelId}>` : "*not set*" },
    { name: "🚪 Leave channel", value: settings.leaveChannelId ? `<#${settings.leaveChannelId}>` : "*not set*" },
    { name: "📋 Log channel", value: settings.logChannelId ? `<#${settings.logChannelId}>` : "*not set*" },
    { name: "🎵 DJ role", value: settings.djRoleId ? `<@&${settings.djRoleId}>` : "*anyone can control music*" },
    {
      name: "🛡️ Mod roles",
      value: settings.modRoleIds?.length ? settings.modRoleIds.map((r) => `<@&${r}>`).join(" ") : "*fallback: Manage Server*",
    },
    {
      name: "🎭 Auto roles",
      value: settings.autoRoleIds?.length ? settings.autoRoleIds.map((r) => `<@&${r}>`).join(" ") : "*not set*",
    },
  ];
  return fieldsText(lines);
}

module.exports.currentSettingsText = currentSettingsText;
