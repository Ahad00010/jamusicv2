const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, warningContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");

module.exports = {
  name: "pause",
  category: "music",
  data: new SlashCommandBuilder().setName("pause").setDescription("Pause the current playback"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (player.paused) {
      return replyV2(interaction, warningContainer("Playback is already paused — use </resume:0> to continue. ⏸", {
        title: "⚠️ Already paused",
      }));
    }
    await player.pause();
    await sendOrUpdateCard(client, player);
    await replyV2(
      interaction,
      successContainer(`Paused **${player.current?.title ?? "the track"}**. ⏸`, { title: "⏸ Paused" })
    );
  },
};
