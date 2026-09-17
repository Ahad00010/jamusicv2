const { Client, Events, GatewayIntentBits, REST, Routes } = require("discord.js");
const config = require("../config");

/**
 * Destroys slash commands.
 *  node src/handlers/destroy.js          -> wipes global commands + every guild's commands the bot is in
 *  node src/handlers/destroy.js --guild  -> wipes only the dev guild's commands via GUILD_ID (instant)
 *
 * Note: guild commands disappear instantly, but global commands can take up
 * to 1 hour to propagate out of Discord's UI (same as when deploying them).
 */

/** Clears all application commands at the given route. */
async function clearScope(rest, route, label) {
  const before = await rest.get(route);
  await rest.put(route, { body: [] });
  console.log(`🗑️  Cleared ${Array.isArray(before) ? before.length : 0} command(s): ${label}`);
}

async function main() {
  if (!config.token || !config.clientId) {
    console.error("❌ BOT_TOKEN and CLIENT_ID are required in .env to destroy commands.");
    process.exit(1);
  }

  const useGuild = process.argv.includes("--guild");
  if (useGuild && !config.guildId) {
    console.error("❌ --guild was passed but GUILD_ID is not set in .env.");
    process.exit(1);
  }

  const rest = new REST({ version: "10" }).setToken(config.token);

  // --guild: wipe only the dev guild. No gateway login needed.
  if (useGuild) {
    try {
      console.log(`🧹 Destroying slash commands in the dev guild (${config.guildId})...`);
      await clearScope(
        rest,
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        "the dev guild's commands"
      );
      console.log("✅ Successfully destroyed the dev guild's commands.");
    } catch (error) {
      console.error("❌ Failed to destroy guild commands:", error);
      process.exit(1);
    }
    return;
  }

  // Default: wipe global commands + every guild the bot is currently in.
  // A gateway login is required because the REST API cannot list which
  // guilds the bot is a member of on its own.
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    console.log("🚀 Logging in to enumerate guilds...");
    await client.login(config.token);
    if (!client.isReady()) {
      await new Promise((resolve) => client.once(Events.ClientReady, resolve));
    }

    const guilds = [...client.guilds.cache.values()];
    console.log(`🧹 Destroying global commands and commands in ${guilds.length} guild(s)...`);

    await clearScope(rest, Routes.applicationCommands(config.clientId), "global commands");

    let failed = 0;
    for (const guild of guilds) {
      try {
        await clearScope(
          rest,
          Routes.applicationGuildCommands(config.clientId, guild.id),
          `${guild.name} (${guild.id})`
        );
      } catch (error) {
        failed++;
        console.warn(`⚠️  Could not clear commands in ${guild.name} (${guild.id}): ${error.message}`);
      }
    }

    if (failed) {
      console.warn(`⚠️  Finished, but ${failed} guild(s) could not be cleared.`);
    } else {
      console.log(`✅ Successfully destroyed all commands globally and in ${guilds.length} guild(s).`);
    }
  } catch (error) {
    console.error("❌ Failed to destroy commands:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
}

main();
