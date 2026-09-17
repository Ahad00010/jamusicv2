/**
 * Component interaction router.
 * Modules register handlers by customId prefix; the longest matching prefix wins.
 * Handler signature: async (interaction, client) => void
 */
const { MessageFlags } = require("discord.js");
const { errorContainer, V2_FLAG } = require("../utils/v2");

const handlers = new Map(); // prefix -> handler fn

function registerComponent(prefix, handler) {
  handlers.set(prefix, handler);
}

function findHandler(customId) {
  let best = null;
  for (const prefix of handlers.keys()) {
    if (customId === prefix || customId.startsWith(`${prefix}`)) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  return best ? handlers.get(best) : null;
}

async function handleComponent(interaction, client) {
  if (!(interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit())) {
    return false;
  }
  const handler = findHandler(interaction.customId);
  if (!handler) return false;
  try {
    await handler(interaction, client);
  } catch (error) {
    console.error(`[Components] Error handling "${interaction.customId}":`, error);
    const payload = {
      components: [errorContainer("Something went wrong while handling that interaction. 🛠️", { title: "❌ Oops" })],
      flags: V2_FLAG | MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
  return true;
}

module.exports = { registerComponent, handleComponent };
