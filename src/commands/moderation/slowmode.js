const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, errorContainer } = require("../../utils/v2");
const { logAction } = require("../../utils/log");

module.exports = {
  name: "slowmode",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set slowmode for this channel")
    .addStringOption((option) =>
      option.setName("duration").setDescription("e.g. 10s, 2m — or 0/off to disable").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,
  async execute(interaction, client) {
    const raw = interaction.options.getString("duration", true).trim().toLowerCase();
    let seconds = 0;

    if (raw === "off" || raw === "0") {
      seconds = 0;
    } else {
      const match = raw.match(/^(\d+)(s|m|h)?$/);
      if (!match) {
        return replyV2(interaction, errorContainer("Use formats like `10s`, `2m`, `1h` — or `off` to disable. ⏱️"));
      }
      const value = Number(match[1]);
      const unit = match[2] || "s";
      seconds = value * (unit === "h" ? 3600 : unit === "m" ? 60 : 1);
    }

    if (seconds > 21600) {
      return replyV2(interaction, errorContainer("Slowmode cannot be longer than 6 hours (21600 seconds). ⏱️"));
    }

    await interaction.channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`).catch(() => null);

    await replyV2(
      interaction,
      container(config.colors.moderation, [
        text(`## ⏳ Slowmode updated`),
        text(
          seconds === 0
            ? `Slowmode **disabled** in <#${interaction.channel.id}>.`
            : `Slowmode set to **${seconds}s** in <#${interaction.channel.id}>.`
        ),
      ])
    );

    await logAction(interaction.guild, {
      title: "⏳ Slowmode updated",
      color: config.colors.moderation,
      fields: [
        { name: "Channel", value: `<#${interaction.channel.id}>` },
        { name: "Slowmode", value: seconds === 0 ? "off" : `\`${seconds}s\`` },
        { name: "Moderator", value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
      ],
    });
  },
};
