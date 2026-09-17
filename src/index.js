const { Client, GatewayIntentBits, Collection, Partials } = require("discord.js");
const config = require("./config");
const { createMusicManager } = require("./music/manager");
const { loadCommands } = require("./handlers/commands");
const { loadEvents } = require("./handlers/events");
const { registerComponent } = require("./handlers/components");
const { registerAllComponents } = require("./components");

// ---- Client & music manager ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
  allowedMentions: { parse: ["users"] },
});

client.commands = new Collection();
client.games = new Map(); // active game sessions: gameId -> state
client.cooldowns = new Map();

createMusicManager(client);

// ---- Loaders (exercise the full module graph before config validation) ----
const path = require("node:path");
const { commands, categories } = loadCommands(path.join(__dirname, "commands"));
client.commands = commands;
client.categories = categories;
console.log(`📦 Loaded ${commands.size} commands in ${categories.size} categories.`);

const eventCount = loadEvents(client, path.join(__dirname, "events"));
console.log(`⚡ Loaded ${eventCount} events.`);

registerAllComponents(registerComponent);
console.log("🎛️ Registered component handlers.");

// ---- Keepalive ----
// Periodically pings the bundled NodeLink API so the audio-node connection stays
// warm and outages surface early. Keeping the *host* awake is an uptime
// monitor's job - it hits the public "Keepalive !" page served at "/".
const keepaliveTimers = new Set();

function startKeepalive() {
  const keepalive = config.keepalive ?? {};
  if (keepalive.enabled === false) return;
  const intervalMs = keepalive.intervalMs || 60000;
  const targets = [
    {
      url: `${config.lavalink.secure ? "https" : "http"}://${config.lavalink.host}:${config.lavalink.port}/v4/version`,
      auth: config.lavalink.password,
    },
  ];
  for (const { url, auth } of targets) {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(url, auth ? { headers: { Authorization: auth } } : {});
        if (!res.ok) console.warn(`[Keepalive] ${url} responded ${res.status}`);
      } catch (error) {
        console.warn(`[Keepalive] ${url} unreachable: ${error?.cause?.code || error?.message || error}`);
      }
    }, intervalMs);
    keepaliveTimers.add(timer);
  }
  console.log(
    `💗 Keepalive on — pinging the NodeLink API every ${Math.round(intervalMs / 1000)}s.`
  );
}

// ---- Config validation & login ----
config.validate();

process.on("unhandledRejection", (error) => {
  console.error("[Process] Unhandled rejection:", error);
});
process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught exception:", error);
});

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down…`);
  try {
    await client.music.manager.players.destroyAll?.();
  } catch {
    /* players may already be gone */
  }
  for (const timer of keepaliveTimers) clearInterval(timer);
  keepaliveTimers.clear();
  client.destroy();
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(config.token).then(() => startKeepalive()).catch((error) => {
  console.error("❌ Failed to login:", error.message);
  console.error("Check your BOT_TOKEN in .env and your bot's gateway intents.");
  process.exit(1);
});
