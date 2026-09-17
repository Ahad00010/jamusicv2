const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, successContainer, container, text, warningContainer } = require("../../utils/v2");
const afkStore = require("../../database/afk");
const { truncate } = require("../../utils/format");

module.exports = {
  name: "afk",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set or clear your AFK status")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Reason (leave empty to clear your AFK status)").setRequired(false)
    ),
  cooldown: 3,
  async execute(interaction, client) {
    const reason = interaction.options.getString("reason");
    if (!reason) {
      const existing = afkStore.getAfk(interaction.guildId, interaction.user.id);
      if (!existing) {
        return replyV2(interaction, warningContainer("You are not currently AFK.", { title: "💤 Not AFK" }));
      }
      afkStore.removeAfk(interaction.guildId, interaction.user.id);
      return replyV2(interaction, successContainer("Your AFK status was cleared. Welcome back! 👋", { title: "💤 AFK cleared" }));
    }

    afkStore.setAfk(interaction.guildId, interaction.user.id, truncate(reason, 200));
    await replyV2(
      interaction,
      container(config.colors.warning, [
        text(`## 💤 AFK set`),
        text(`**Reason:** ${truncate(reason, 190)}\n\nI'll let people know when you're mentioned. Come back and run \`/afk\` (no reason) to clear it.`),
      ])
    );
  },
};
