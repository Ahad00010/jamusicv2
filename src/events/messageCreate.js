const economy = require("../database/economy");
const config = require("../config");
const guildStore = require("../database/guilds");
const afkStore = require("../database/afk");
const { container, text, V2_FLAG } = require("../utils/v2");
const { timeAgo } = require("../utils/format");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // --- AFK: author returning ---
    const returning = afkStore.getAfk(message.guild.id, message.author.id);
    if (returning) {
      afkStore.removeAfk(message.guild.id, message.author.id);
      await message
        .reply({
          content: `👋 Welcome back <@${message.author.id}> — your AFK status was removed (away ${timeAgo(
            Date.now() - returning.since
          )}).`,
          allowedMentions: { users: [message.author.id] },
        })
        .catch(() => {});
    }

    // --- AFK: mentioned users ---
    for (const [, user] of message.mentions.users) {
      if (user.id === message.author.id || user.bot) continue;
      const afk = afkStore.getAfk(message.guild.id, user.id);
      if (afk) {
        await message
          .reply({
            content: `💤 <@${user.id}> is AFK: **${afk.reason}** (<t:${Math.floor(afk.since / 1000)}:R>)`,
            allowedMentions: { users: [user.id] },
          })
          .catch(() => {});
      }
    }

    // --- XP (60s per user) ---
    const settings = guildStore.getSettings(message.guild.id);
    const user = economy.getUser(message.author.id);
    if (Date.now() - user.lastXp < 60 * 1000) return;

    const amount = 15 + Math.floor(Math.random() * 11); // 15-25
    const result = economy.addXp(message.author.id, amount);
    if (result.leveledUp) {
      await message
        .reply({
          components: [
            container(config.colors.economy, [
              text(`## 🎉 Level up!`),
              text(`GG <@${message.author.id}> — you reached **Level ${result.level}**!`),
            ]),
          ],
          flags: V2_FLAG,
          allowedMentions: { parse: [] },
        })
        .catch(() => {});
    }
  },
};
