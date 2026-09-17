const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { errorContainer, container, text, separator, V2_FLAG } = require("../utils/v2");
const { CATEGORY_META, buildOverview, buildCategoryView } = require("../commands/general/help");

module.exports = function registerHelpMenu(register) {
  register("help:", async (interaction, client) => {
    // "Back to overview" button on a category view
    if (interaction.isButton()) {
      if (interaction.customId !== "help:back") return;
      return interaction.update({ components: [buildOverview(client)] });
    }
    if (!interaction.isStringSelectMenu()) return;
    const category = interaction.values[0];
    const names = client.categories.get(category);
    if (!names) {
      return interaction.reply({
        components: [errorContainer("Unknown category. 🤔")],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      });
    }
    await interaction.update({ components: [buildCategoryView(client, category)] });
  });
};
