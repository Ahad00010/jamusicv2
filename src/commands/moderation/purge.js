const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const config = require("../../config");
const { replyV2, container, text, warningContainer, errorContainer, V2_FLAG } = require("../../utils/v2");
const { botHas } = require("../../utils/perms");

module.exports = {
  name: "purge",
  category: "moderation",
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages in this channel")
    .addIntegerOption((option) =>
      option.setName("amount").setDescription("How many messages (1-100)").setMinValue(1).setMaxValue(100).setRequired(true)
    )
    .addUserOption((option) => option.setName("from").setDescription("Only delete messages from this user"))
    .addBooleanOption((option) => option.setName("bots").setDescription("Only delete bot messages"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  async execute(interaction, client) {
    if (!botHas(interaction, PermissionFlagsBits.ManageMessages)) {
      return replyV2(interaction, errorContainer("I need the **Manage Messages** permission in this channel. 🙏"), {
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger("amount", true);
    const from = interaction.options.getUser("from");
    const botsOnly = interaction.options.getBoolean("bots") ?? false;

    // Discord only accepts EPHEMERAL on a deferred callback — the V2 flag goes on the edits below.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const messages = await interaction.channel.messages.fetch({ limit: amount }).catch(() => null);
    if (!messages) {
      return interaction.editReply({
        components: [errorContainer("Failed to fetch messages.")],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      });
    }

    let deletable = [...messages.values()].filter((m) => m.deletable && Date.now() - m.createdTimestamp < 14 * 86400000);
    if (from) deletable = deletable.filter((m) => m.author.id === from.id);
    if (botsOnly) deletable = deletable.filter((m) => m.author.bot);

    if (!deletable.length) {
      return interaction.editReply({
        components: [warningContainer("No deletable messages matched (messages must be under 14 days old). 🧹")],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      });
    }

    const deleted = await interaction.channel.bulkDelete(deletable, true).catch(() => null);
    const count = deleted?.size ?? 0;

    await interaction.editReply({
      components: [
        container(config.colors.moderation, [
          text(`## 🧹 Purged`),
          text(
            `Deleted **${count}** message${count === 1 ? "" : "s"}${from ? ` from **${from.tag}**` : ""}${
              botsOnly ? " (bots only)" : ""
            }.`
          ),
        ]),
      ],
      flags: V2_FLAG | MessageFlags.Ephemeral,
    });

    setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
  },
};
