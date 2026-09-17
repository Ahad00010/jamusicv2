const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { isDJ } = require("../../utils/perms");

module.exports = {
  name: "shuffle",
  category: "music",
  data: new SlashCommandBuilder().setName("shuffle").setDescription("Shuffle the queue"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Shuffling requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    if (player.queue.size < 2) {
      return replyV2(interaction, errorContainer("There need to be at least 2 tracks in the queue to shuffle. 🎲"));
    }
    player.shuffle();
    await sendOrUpdateCard(client, player);
    await replyV2(interaction, successContainer(`Shuffled **${player.queue.size}** tracks. 🔀`, { title: "🔀 Shuffled" }));
  },
};
