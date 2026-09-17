const { SlashCommandBuilder, ChannelType } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, thumbnail, fieldsText } = require("../../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");
const { timestamp, timeAgo } = require("../../utils/format");

module.exports = {
  name: "serverinfo",
  category: "general",
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Show information about this server"),
  cooldown: 3,
  async execute(interaction, client) {
    const { guild } = interaction;
    await guild.members.fetch().catch(() => {});
    await guild.channels.fetch().catch(() => {});

    const channels = guild.channels.cache;
    const textCount = channels.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceCount = channels.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categoryCount = channels.filter((c) => c.type === ChannelType.GuildCategory).size;

    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 🏠 ${guild.name}`),
        new TextDisplayBuilder().setContent(`-# ID: \`${guild.id}\` • Owner: <@${guild.ownerId}>`)
      )
      .setThumbnailAccessory(thumbnail(guild.iconURL({ size: 256 }) || client.user.displayAvatarURL(), guild.name));

    await replyV2(
      interaction,
      container(config.colors.general, [
        section,
        separator(),
        text(
          fieldsText([
            { name: "Created", value: timestamp(guild.createdTimestamp, "R") },
            { name: "Members", value: `\`${guild.memberCount}\`` },
            { name: "Channels", value: `\`${textCount}\` text • \`${voiceCount}\` voice • \`${categoryCount}\` categories` },
            { name: "Roles", value: `\`${guild.roles.cache.size}\`` },
            { name: "Emojis", value: `\`${guild.emojis.cache.size}\`` },
            { name: "Boosts", value: `Level **${guild.premiumTier}** • \`${guild.premiumSubscriptionCount ?? 0}\` boosts` },
            { name: "Verification", value: `\`${guild.verificationLevel}\`` },
          ])
        ),
        separator(),
        text(`-# Server uptime with me: member count fetched live.`),
      ])
    );
  },
};
