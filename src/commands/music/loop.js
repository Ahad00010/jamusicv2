const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { sendOrUpdateCard } = require("../../music/manager");
const { isDJ } = require("../../utils/perms");

const MODES = ["off", "track", "queue"];
const LABELS = { off: "Off — play the queue straight through", track: "Track — repeat the current song", queue: "Queue — repeat the whole queue" };

module.exports = {
  name: "loop",
  category: "music",
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set the loop mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Loop mode")
        .addChoices(
          { name: "off", value: "off" },
          { name: "track", value: "track" },
          { name: "queue", value: "queue" }
        )
    ),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Changing loop mode requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    let mode = interaction.options.getString("mode");
    if (!mode) {
      const index = MODES.indexOf(player.loop);
      mode = MODES[(index + 1) % MODES.length];
    }
    player.setLoop(mode);
    await sendOrUpdateCard(client, player);
    await replyV2(interaction, successContainer(`Loop mode: **${LABELS[mode]}**. 🔁`, { title: "🔁 Loop updated" }));
  },
};
