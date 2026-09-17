const guildStore = require("../database/guilds");
const { container, text, separator, thumbnail, V2_FLAG } = require("../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    const settings = guildStore.getSettings(member.guild.id);

    // Auto roles
    if (settings.autoRoleIds?.length) {
      const roles = settings.autoRoleIds
        .map((id) => member.guild.roles.cache.get(id))
        .filter((role) => role && role.editable);
      if (roles.length) await member.roles.add(roles).catch(() => {});
    }

    // Welcome message
    if (!settings.welcomeChannelId) return;
    const channel = member.guild.channels.cache.get(settings.welcomeChannelId);
    if (!channel?.isTextBased()) return;

    const children = [
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 👋 Welcome to ${member.guild.name}!`),
          new TextDisplayBuilder().setContent(
            `Hey <@${member.id}>, glad to have you here! 🎉\n-# You are member **#${member.guild.memberCount}**`
          )
        )
        .setThumbnailAccessory(thumbnail(member.user.displayAvatarURL({ size: 256 }), member.user.tag)),
      separator(),
      text(`-# Account created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`),
    ];

    await channel
      .send({ components: [container(0x57f287, children)], flags: V2_FLAG, allowedMentions: { parse: ["users"] } })
      .catch(() => {});
  },
};
