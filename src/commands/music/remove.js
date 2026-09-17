const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { truncate } = require("../../utils/format");
const { isDJ } = require("../../utils/perms");

module.exports = {
  name: "remove",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a track from the queue by its position")
    .addIntegerOption((option) =>
      option.setName("position").setDescription("Position in the queue (1 = next track)").setMinValue(1).setRequired(true)
    ),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Removing tracks requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    const position = interaction.options.getInteger("position", true);
    if (position > player.queue.size) {
      return replyV2(
        interaction,
        errorContainer(`The queue only has **${player.queue.size}** track${player.queue.size === 1 ? "" : "s"}. 📜`)
      );
    }
    const removed = player.queue.remove(position - 1);
    await sendOrUpdateCard(client, player);
    await replyV2(
      interaction,
      successContainer(`Removed **${truncate(removed?.title ?? "unknown track", 60)}** from the queue. 🗑️`, {
        title: "🗑️ Removed",
      })
    );
  },
};
