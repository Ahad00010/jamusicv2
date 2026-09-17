const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, thumbnail, fieldsText } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const { timestamp } = require("../../utils/format");

module.exports = {
  name: "roleinfo",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("roleinfo")
    .setDescription("Show information about a role")
    .addRoleOption((option) => option.setName("role").setDescription("The role").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const role = interaction.options.getRole("role", true);

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🏷️ ${role.name}`),
        new TextDisplayBuilder().setContent(`-# ID: \`${role.id}\` • Color: \`${role.hexColor}\``)
      )
      .setThumbnailAccessory(
        thumbnail(role.iconURL({ size: 256 }) || interaction.guild.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png", role.name)
      );

    const keyPermissions = Object.values(PermissionFlagsBits)
      .filter((flag) => role.permissions.has(flag))
      .slice(0, 12);

    await replyV2(
      interaction,
      container(role.color || config.colors.general, [
        section,
        separator(),
        text(
          fieldsText([
            { name: "Members", value: `\`${role.members.size}\`` },
            { name: "Created", value: timestamp(role.createdTimestamp, "R") },
            { name: "Position", value: `\`${role.position}\`` },
            { name: "Mentionable", value: role.mentionable ? "✅" : "❌" },
            { name: "Displayed separately", value: role.hoist ? "✅" : "❌" },
            { name: "Managed (bot/integration)", value: role.managed ? "✅" : "❌" },
          ])
        ),
        separator(),
        text(
          keyPermissions.length
            ? `**Key permissions:**\n${keyPermissions.join("\n").replaceAll(/([A-Z])/g, " $1").replace(/ Permission/g, "").slice(0, 900)}`
            : `-# No notable permissions`
        ),
      ])
    );
  },
};
