const { MessageFlags } = require("discord.js");
const { container, text, separator, V2_FLAG, errorContainer } = require("../utils/v2");
const guildStore = require("../database/guilds");
const config = require("../config");
const { PermissionFlagsBits } = require("discord.js");

module.exports = function registerConfigPanel(register) {
  register("cfg:", async (interaction) => {
    if (!interaction.isAnySelectMenu()) return;
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        components: [errorContainer("You need **Manage Server** to change the setup. 🔒")],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      });
    }

    const setting = interaction.customId.split(":")[1];
    let value = interaction.values;

    // Single-value settings take the first selection; "none" clears
    const single = ["welcomeChannelId", "leaveChannelId", "logChannelId", "djRoleId"].includes(setting);
    if (single) value = value[0] ?? null;

    const settings = guildStore.setSetting(interaction.guildId, setting, value);

    // Rebuild panel with current settings
    const { ChannelType, ActionRowBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder } = require("discord.js");
    const { currentSettingsText } = require("../commands/config/setup");

    await interaction.update({
      components: [
        container(config.colors.config, [
          text(`## ⚙️ Server Setup`),
          text(`✅ Saved **\`${setting}\`** — pick more below or dismiss this message.`),
          separator(),
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId("cfg:welcomeChannelId").setPlaceholder("Welcome messages channel").addChannelTypes(ChannelType.GuildText)
          ),
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId("cfg:leaveChannelId").setPlaceholder("Leave messages channel").addChannelTypes(ChannelType.GuildText)
          ),
          new ActionRowBuilder().addComponents(
            new ChannelSelectMenuBuilder().setCustomId("cfg:logChannelId").setPlaceholder("Moderation logs channel").addChannelTypes(ChannelType.GuildText)
          ),
          new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId("cfg:djRoleId").setPlaceholder("DJ role (music controls)")),
          new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId("cfg:modRoleIds").setPlaceholder("Moderator roles (up to 3)").setMaxValues(3)),
          new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId("cfg:autoRoleIds").setPlaceholder("Auto roles for new members (up to 3)").setMaxValues(3)),
          separator(),
          text(currentSettingsText(settings)),
        ]),
      ],
    });
  });
};
