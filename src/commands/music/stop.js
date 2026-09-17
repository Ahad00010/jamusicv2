const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { cleanupGuildMusic } = require("../../music/manager");
const { isDJ } = require("../../utils/perms");
const { errorContainer } = require("../../utils/v2");

module.exports = {
  name: "stop",
  category: "music",
  data: new SlashCommandBuilder().setName("stop").setDescription("Stop playback and clear the queue"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Stopping playback requires the DJ role in this server (or Manage Server).", {
          title: "🔒 DJ only",
        }),
        { ephemeral: true }
      );
    }
    player.queue.clear();
    await player.stop();
    cleanupGuildMusic(client, interaction.guildId);
    await replyV2(interaction, successContainer("Playback stopped and the queue has been cleared. ⏹", { title: "⏹ Stopped" }));
  },
};
