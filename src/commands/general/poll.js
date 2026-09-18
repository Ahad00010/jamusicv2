const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, separator, errorContainer } = require("../../utils/v2");
const { truncate } = require("../../utils/format");
const { NUMBER_EMOJIS, voteRows, createPollVoteState } = require("../../components/polls");

module.exports = {
  name: "poll",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create a poll with up to 10 options")
    .addStringOption((option) => option.setName("question").setDescription("Poll question").setRequired(true))
    .addStringOption((option) => option.setName("options").setDescription("Options separated by commas (2-10)").setRequired(true))
    .addIntegerOption((option) =>
      option.setName("minutes").setDescription("How long the poll runs (default 5 minutes)").setMinValue(1).setMaxValue(1440)
    ),
  cooldown: 5,
  async execute(interaction, client) {
    const question = interaction.options.getString("question", true);
    const options = interaction.options
      .getString("options", true)
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const minutes = interaction.options.getInteger("minutes") ?? 5;

    if (options.length < 2 || options.length > 10) {
      return replyV2(interaction, errorContainer("Please provide between **2** and **10** options, separated by commas. 📊"));
    }

    const endsAt = Date.now() + minutes * 60000;
    const children = [
      text(`## 📊 ${truncate(question, 180)}`),
      text(options.map((o, i) => `${NUMBER_EMOJIS[i]} ${truncate(o, 80)}`).join("\n")),
      separator(),
      text(`-# Poll by ${interaction.user} • Ends <t:${Math.floor(endsAt / 1000)}:R>`),
      separator(),
      // Vote rows ship inside the container (like on the player card), so the
      // poll message is complete in one reply — nothing to edit in afterwards.
      ...voteRows(options),
    ];

    await replyV2(interaction, container(config.colors.primary, children));
    const message = await interaction.fetchReply().catch(() => null);

    // Vote clicks are answered by the poll: component handler
    // (src/components/polls.js). The old message-collector version could never
    // see them: the router answers every component interaction first, so each
    // vote bounced off with "that interaction has expired or is unknown".
    if (message) {
      createPollVoteState(client, message, { question, options, ownerId: interaction.user.id, endsAt });
    }
  },
};
