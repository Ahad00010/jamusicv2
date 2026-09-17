const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, warningContainer, errorContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { isDJ } = require("../../utils/perms");

module.exports = {
  name: "skip",
  category: "music",
  data: new SlashCommandBuilder().setName("skip").setDescription("Skip the current track"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!player.current) {
      return replyV2(interaction, warningContainer("Nothing is playing to skip. 🤷", { title: "⚠️ Nothing playing" }));
    }
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Skipping tracks requires the DJ role in this server (or Manage Server).", {
          title: "🔒 DJ only",
        }),
        { ephemeral: true }
      );
    }
    const title = player.current.title;
    await player.skip();
    await replyV2(interaction, successContainer(`Skipped **${title}**. ⏭`, { title: "⏭ Skipped" }));
  },
};
