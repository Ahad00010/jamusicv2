const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, warningContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");

module.exports = {
  name: "resume",
  category: "music",
  data: new SlashCommandBuilder().setName("resume").setDescription("Resume the paused playback"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!player.paused) {
      return replyV2(
        interaction,
        warningContainer("Playback is already running — nothing to resume. ▶", { title: "⚠️ Not paused" })
      );
    }
    await player.resume();
    await sendOrUpdateCard(client, player);
    await replyV2(
      interaction,
      successContainer(`Resumed **${player.current?.title ?? "the track"}**. ▶`, { title: "▶ Resumed" })
    );
  },
};
