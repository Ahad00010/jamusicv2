const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, warningContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { isDJ } = require("../../utils/perms");

module.exports = {
  name: "clear",
  category: "music",
  data: new SlashCommandBuilder().setName("clear").setDescription("Remove every track from the queue"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Clearing the queue requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    if (player.queue.isEmpty) {
      return replyV2(interaction, warningContainer("The queue is already empty. 📜", { title: "⚠️ Empty queue" }));
    }
    const count = player.queue.size;
    player.queue.clear();
    await sendOrUpdateCard(client, player);
    await replyV2(interaction, successContainer(`Removed **${count}** track${count === 1 ? "" : "s"} from the queue. 🧹`, {
      title: "🧹 Queue cleared",
    }));
  },
};
