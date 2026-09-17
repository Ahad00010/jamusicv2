const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const config = require("../../config");
const { replyV2, successContainer, container, text, V2_FLAG } = require("../../utils/v2");
const { parseDuration, durationToHuman, timestamp } = require("../../utils/format");
const reminders = require("../../database/reminders");

module.exports = {
  name: "remind",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a reminder")
    .addStringOption((option) =>
      option.setName("in").setDescription("When — e.g. 10m, 1h30m, 2d").setRequired(true)
    )
    .addStringOption((option) => option.setName("text").setDescription("What to remind you about").setRequired(true)),
  cooldown: 3,
  async execute(interaction, client) {
    const ms = parseDuration(interaction.options.getString("in", true), { defaultUnit: "m" });
    if (ms == null || ms > 30 * 24 * 3600 * 1000) {
      return replyV2(
        interaction,
        container(config.colors.error, [
          text(`## ⏱️ Invalid duration`),
          text(`Use formats like \`10m\`, \`1h30m\`, \`2d\` — max 30 days.`),
        ]),
        { ephemeral: true }
      );
    }

    const text = interaction.options.getString("text", true);
    const dueAt = Date.now() + ms;
    reminders.addReminder(interaction.user.id, interaction.guildId, interaction.channelId, text, dueAt);

    await replyV2(
      interaction,
      successContainer(`**${durationToHuman(ms)}** from now (<t:${Math.floor(dueAt / 1000)}:R>)\n\n> ${text}`, {
        title: "⏰ Reminder set",
      })
    );
  },
};
