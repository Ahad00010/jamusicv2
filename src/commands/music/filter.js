const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { replyV2, text, separator, container } = require("../../utils/v2");
const { gate } = require("../../music/utils");
const { FILTER_NAMES, getActiveFilters } = require("../../music/filters");
const { isDJ } = require("../../utils/perms");
const { errorContainer } = require("../../utils/v2");

module.exports = {
  name: "filter",
  category: "music",
  data: new SlashCommandBuilder().setName("filter").setDescription("Manage audio filters for this server's player"),
  cooldown: 3,
  async execute(interaction, client) {
    const player = await gate(interaction, client);
    if (!player) return;
    if (!isDJ(interaction)) {
      return replyV2(
        interaction,
        errorContainer("Changing filters requires the DJ role in this server (or Manage Server).", { title: "🔒 DJ only" }),
        { ephemeral: true }
      );
    }
    const active = getActiveFilters(player);
    const select = new StringSelectMenuBuilder()
      .setCustomId("music:filtersset")
      .setPlaceholder("Pick up to 3 filters (deselect to remove)")
      .setMinValues(0)
      .setMaxValues(3)
      .addOptions(
        FILTER_NAMES.map((name) => ({
          label: name,
          value: name,
          default: active.includes(name),
          emoji: "🎛️",
        }))
      );

    await replyV2(
      interaction,
      container(0x9b59b6, [
        text(`## 🎛️ Audio Filters`),
        text(
          active.length
            ? `Currently active: **${active.join(", ")}**\nPick new filters below to replace them, or deselect all and submit to reset.`
            : `No filters are active. Pick up to 3 from the menu below to spice up the sound!`
        ),
        separator(),
        new ActionRowBuilder().addComponents(select),
      ]),
      { ephemeral: true }
    );
  },
};
