const { SlashCommandBuilder } = require("discord.js");
const { replyV2, successContainer, warningContainer } = require("../../utils/v2");
const { gate } = require("../../music/utils");

module.exports = {
  name: "back",
  category: "music",
  data: new SlashCommandBuilder().setName("back").setDescription("Play the previous track again"),
  cooldown: 2,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!player.previous.length) {
      return replyV2(
        interaction,
        warningContainer("There is no previous track in this session's history. 🕘", { title: "⚠️ No history" })
      );
    }
    await player.back();
    await replyV2(interaction, successContainer("Rewound to the previous track. ⏮", { title: "⏮ Back" }));
  },
};
