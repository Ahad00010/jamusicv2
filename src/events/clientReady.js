const { ActivityType } = require("discord.js");
const config = require("../config");
const reminders = require("../database/reminders");
const { infoContainer, V2_FLAG } = require("../utils/v2");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`🏠 Serving ${client.guilds.cache.size} guild(s)`);

    client.user.setPresence({
      activities: [{ name: config.presence[0].name, type: config.presence[0].type }],
      status: "online",
    });

    let presenceIndex = 0;
    setInterval(() => {
      presenceIndex = (presenceIndex + 1) % config.presence.length;
      const next = config.presence[presenceIndex];
      client.user.setPresence({ activities: [{ name: next.name, type: next.type }], status: "online" });
    }, 60 * 1000);

    // Reminder delivery loop
    setInterval(async () => {
      const due = reminders.getDueReminders();
      for (const reminder of due) {
        reminders.deleteReminder(reminder.id);
        try {
          const channel = await client.channels.fetch(reminder.channelId);
          if (!channel?.isTextBased()) continue;
          await channel
            .send({
              components: [
                infoContainer({
                  color: config.colors.primary,
                  title: "⏰ Reminder!",
                  description: `<@${reminder.userId}> you asked me to remind you:\n\n${reminder.message}`,
                  footer: `Set <t:${Math.floor(reminder.dueAt / 1000)}:R>`,
                }),
              ],
              flags: V2_FLAG,
              allowedMentions: { users: [reminder.userId] },
            })
            .catch(() => {});
        } catch {
          /* channel gone */
        }
      }
    }, 30 * 1000);

    const musicManager = client.music.manager;
    if (musicManager.nodes.hasReady) {
      console.log("🎵 Music node(s): connected");
    } else {
      // `nodes.hasReady` is a getter; wait for the real event instead of guessing.
      musicManager.once("nodeReady", (node) =>
        console.log(`🎵 Music node "${node.identifier}" connected.`)
      );
      console.log("🎵 Music node(s): connecting…");
    }
  },
};
