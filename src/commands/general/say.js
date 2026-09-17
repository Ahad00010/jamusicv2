const { SlashCommandBuilder } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, V2_FLAG } = require("../../utils/v2");
const { truncate } = require("../../utils/format");
const { isModerator } = require("../../utils/perms");
const { errorContainer } = require("../../utils/v2");

module.exports = {
  name: "say",
  category: "general",
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Make the bot say something")
    .addStringOption((option) => option.setName("message").setDescription("What should I say?").setRequired(true)),
  cooldown: 5,
  async execute(interaction, client) {
    if (!isModerator(interaction)) {
      return replyV2(interaction, errorContainer("Only moderators can use /say on this server. 🛡️"), { ephemeral: true });
    }
    const message = interaction.options.getString("message", true);
    await interaction.channel.send({
      components: [container(config.colors.primary, [text(truncate(message, 3900))])],
      flags: V2_FLAG,
      allowedMentions: { parse: [] },
    });
    await interaction.deferReply();
    await interaction.deleteReply().catch(() => {});
  },
};
