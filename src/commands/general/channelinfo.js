const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, fieldsText } = require("../../utils/v2");
const { timestamp } = require("../../utils/format");

module.exports = {
  name: "channelinfo",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("channelinfo")
    .setDescription("Show information about a channel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel (defaults to this one)")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement, ChannelType.GuildStageVoice)
    ),
  cooldown: 3,
  async execute(interaction, client) {
    const channel = interaction.options.getChannel("channel") ?? interaction.channel;

    const perms = Object.values(PermissionFlagsBits).filter((flag) =>
      interaction.guild.members.me.permissionsIn(channel).has(flag)
    );

    await replyV2(
      interaction,
      container(config.colors.general, [
        text(`## 📺 ${channel.name}`),
        text(`-# ID: \`${channel.id}\` • Type: \`${channel.type}\``),
        separator(),
        text(
          fieldsText([
            { name: "Category", value: channel.parent ? `${channel.parent.name} (\`${channel.parent.id}\`)` : "*none*" },
            { name: "Created", value: timestamp(channel.createdTimestamp, "R") },
            channel.topic ? { name: "Topic", value: channel.topic.slice(0, 300) } : null,
            channel.userLimit ? { name: "User limit", value: `\`${channel.userLimit}\`` } : null,
            channel.rateLimitPerUser ? { name: "Slowmode", value: `\`${channel.rateLimitPerUser}s\`` } : null,
            channel.nsfw ? { name: "Age restricted", value: "✅" } : null,
          ])
        ),
        separator(),
        text(`-# I can see this channel and have \`${perms.length}\` permissions in it.`),
      ])
    );
  },
};
