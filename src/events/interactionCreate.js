const { MessageFlags } = require("discord.js");
const { errorContainer, V2_FLAG } = require("../utils/v2");
const { applyCooldown } = require("../utils/cooldowns");
const { handleComponent } = require("../handlers/components");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    // Route component interactions (buttons, select menus of ANY type, modals)
    if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
      const handled = await handleComponent(interaction, client);
      if (!handled && (interaction.isButton() || interaction.isAnySelectMenu())) {
        await interaction
          .reply({
            components: [errorContainer("That interaction has expired or is unknown. Run the command again. ⏳")],
            flags: V2_FLAG | MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      return interaction
        .reply({
          components: [errorContainer("That command is not registered anymore — it may have been removed. 🤔")],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }

    try {
      // Guild-only guard for everything except none (all commands are guild-only here)
      if (!interaction.inGuild()) {
        return interaction.reply({
          components: [errorContainer("Commands only work inside servers. 🏠")],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        });
      }

      // Default-permission gate
      if (command.permissions && !interaction.member.permissions.has(command.permissions)) {
        return interaction.reply({
          components: [errorContainer("You don't have permission to use this command. 🔒")],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        });
      }

      // Moderator gate
      if (command.modOnly && !require("../utils/perms").isModerator(interaction)) {
        return interaction.reply({
          components: [errorContainer("This command is restricted to moderators. 🛡️")],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        });
      }

      // Cooldown
      const remaining = applyCooldown(command.data.name, interaction.user.id, command.cooldown || 0);
      if (remaining > 0) {
        return interaction.reply({
          components: [
            errorContainer(`You're using commands too fast! Try again in **${Math.ceil(remaining / 1000)}s**. ⏳`, {
              title: "⏳ On cooldown",
            }),
          ],
          flags: V2_FLAG | MessageFlags.Ephemeral,
        });
      }

      await command.execute(interaction, client);
    } catch (error) {
      console.error(`[Commands] Error in /${interaction.commandName}:`, error);
      const payload = {
        components: [
          errorContainer("Something went wrong while running that command. The error has been logged. 🛠️", {
            title: "❌ Unexpected error",
          }),
        ],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
