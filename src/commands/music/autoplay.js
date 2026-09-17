const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { isDJ } = require("../../utils/perms");
const { errorContainer } = require("../../utils/v2");

module.exports = {
  name: "autoplay",
  category: "music",
  data: new SlashCommandBuilder().setName("autoplay").setDescription("Toggle autoplay (related tracks play when the queue ends)"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Toggling autoplay requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    const next = !player.autoPlay;
    player.setAutoPlay(next);
    await sendOrUpdateCard(client, player);
    await replyV2(
      interaction,
      successContainer(`Autoplay is now **${next ? "ON — I'll keep the music going with related tracks**" : "OFF — playback stops when the queue ends"}**. 🤖`, {
        title: "🤖 Autoplay",
      })
    );
  },
};
