const { REST, Routes } = require("discord.js");
const path = require("node:path");
const config = require("../config");
const { loadCommands } = require("./commands");

/**
 * Deploys slash commands.
 *  node src/handlers/deploy.js          -> global registration (up to 1h to propagate)
 *  node src/handlers/deploy.js --guild  -> guild registration via GUILD_ID (instant)
 */
async function main() {
  if (!config.token || !config.clientId) {
    console.error("❌ BOT_TOKEN and CLIENT_ID are required in .env to deploy commands.");
    process.exit(1);
  }

  const useGuild = process.argv.includes("--guild");
  if (useGuild && !config.guildId) {
    console.error("❌ --guild was passed but GUILD_ID is not set in .env.");
    process.exit(1);
  }

  const { commands } = loadCommands(path.join(__dirname, "..", "commands"));
  const body = [...commands.values()].map((c) => c.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    console.log(`🚀 Deploying ${body.length} slash commands (${useGuild ? "guild" : "global"})...`);
    const route = useGuild
      ? Routes.applicationGuildCommands(config.clientId, config.guildId)
      : Routes.applicationCommands(config.clientId);
    await rest.put(route, { body });
    console.log(`✅ Successfully deployed ${body.length} commands${useGuild ? " to the dev guild" : " globally"}.`);
  } catch (error) {
    console.error("❌ Failed to deploy commands:", error);
    process.exit(1);
  }
}

main();
