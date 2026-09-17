const guildStore = require("../database/guilds");
const { container, text, separator, thumbnail, V2_FLAG } = require("../utils/v2");
const { SectionBuilder, TextDisplayBuilder } = require("discord.js");

module.exports = {
  name: "guildMemberRemove",
  async execute(member, client) {
    const settings = guildStore.getSettings(member.guild.id);
    if (!settings.leaveChannelId) return;
    const channel = member.guild.channels.cache.get(settings.leaveChannelId);
    if (!channel?.isTextBased()) return;

    const children = [
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 🚪 ${member.user.tag} left`),
          new TextDisplayBuilder().setContent(`-# ${member.guild.name} now has **${member.guild.memberCount}** members`)
        )
        .setThumbnailAccessory(thumbnail(member.user.displayAvatarURL({ size: 256 }), member.user.tag)),
      separator(),
      text(`-# Joined <t:${Math.floor(member.joinedTimestamp / 1000)}:R> • Left <t:${Math.floor(Date.now() / 1000)}:R>`),
    ];

    await channel
      .send({ components: [container(0xed4245, children)], flags: V2_FLAG, allowedMentions: { parse: [] } })
      .catch(() => {});
  },
};
