const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { truncate } = require("../../utils/format");
const { isDJ } = require("../../utils/perms");

module.exports = {
  name: "move",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("Move a track to a different position in the queue")
    .addIntegerOption((option) => option.setName("from").setDescription("Track's current position").setMinValue(1).setRequired(true))
    .addIntegerOption((option) => option.setName("to").setDescription("New position").setMinValue(1).setRequired(true)),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Reordering the queue requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    const from = interaction.options.getInteger("from", true);
    const to = interaction.options.getInteger("to", true);
    if (from > player.queue.size || to > player.queue.size) {
      return replyV2(
        interaction,
        errorContainer(`The queue only has **${player.queue.size}** track${player.queue.size === 1 ? "" : "s"}. 📜`)
      );
    }
    const moved = player.queue.get(from - 1);
    player.queue.move(from - 1, to - 1);
    await replyV2(
      interaction,
      successContainer(`Moved **${truncate(moved?.title ?? "track", 60)}** to position **${to}**. 📬`, {
        title: "📬 Track moved",
      })
    );
  },
};
