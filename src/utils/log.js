const { container, text, separator, fieldsText, V2_FLAG } = require("./v2");
const guildStore = require("../database/guilds");

/** Sends a Components V2 moderation log entry to the configured log channel. */
async function logAction(guild, { color = 0xe74c3c, title, fields, footer }) {
  const settings = guildStore.getSettings(guild.id);
  if (!settings.logChannelId) return;
  const channel = guild.channels.cache.get(settings.logChannelId);
  if (!channel?.isTextBased()) return;

  const children = [text(`## ${title}`), separator(), text(fieldsText(fields.filter(Boolean)))];
  if (footer) children.push(separator(), text(`-# ${footer}`));

  await channel
    .send({ components: [container(color, children)], flags: V2_FLAG, allowedMentions: { parse: [] } })
    .catch(() => {});
}

module.exports = { logAction };
