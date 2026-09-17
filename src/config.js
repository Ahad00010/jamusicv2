require("dotenv").config();
const path = require("node:path");

const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  music: 0x9b59b6,
  economy: 0xf1c40f,
  games: 0xe91e63,
  moderation: 0xe74c3c,
  general: 0x3498db,
  config: 0x00b894,
};

/** Maps wildcard/bind hosts to a connectable host for the music client (0.0.0.0 is bind-only). */
function normalizeNodeHost(value) {
  if (!value || ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(value.toLowerCase())) {
    return "localhost";
  }
  return value;
}

const config = {
  token: process.env.BOT_TOKEN ?? "",
  clientId: process.env.CLIENT_ID ?? "",
  guildId: process.env.GUILD_ID ?? "",

  // NodeLink connection (Lavalink v4 API) used by the music manager.
  // NODELINK_* is preferred; legacy LAVALINK_* vars still work. The bundled
  // NodeLink (started by scripts/start.js) binds $PORT automatically on Render.
  lavalink: {
    host: normalizeNodeHost(process.env.NODELINK_HOST || process.env.LAVALINK_HOST),
    port: Number(process.env.NODELINK_PORT || process.env.PORT || process.env.LAVALINK_PORT) || 3000,
    password: process.env.NODELINK_PASSWORD || process.env.LAVALINK_PASSWORD || "youshallnotpass",
    secure: String(process.env.NODELINK_SECURE || process.env.LAVALINK_SECURE || "false").toLowerCase() === "true",
  },

  dataPath: path.join(process.cwd(), "data"),
  dbPath: path.join(process.cwd(), "data", "jamusic.db"),

  // Music behaviour
  music: {
    searchResults: 10,
    cardUpdateMs: 15000,
    idleDestroyMs: 120000,
    maxVolume: 200,
    defaultVolume: 80,
  },

  // Keepalive pings: keep the NodeLink connection warm and optionally
  // self-ping an external URL (e.g. a Render web service) to stay awake.
  keepalive: {
    enabled: String(process.env.KEEPALIVE_ENABLED ?? "true").toLowerCase() !== "false",
    intervalMs: Number(process.env.KEEPALIVE_INTERVAL_MS) || 60000,
    url: process.env.KEEPALIVE_URL || "",
  },

  colors: COLORS,

  presence: [
    { name: "🎵 /play to jam", type: 2 }, // LISTENING
    { name: "🎧 JaMusic V2", type: 3 }, // WATCHING
    { name: "🛡️ /help for commands", type: 2 },
    { name: "💰 economy, 🎮 games & more", type: 2 },
  ],

  validate() {
    const missing = [];
    if (!this.token) missing.push("BOT_TOKEN");
    if (!this.clientId) missing.push("CLIENT_ID");
    if (missing.length) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}.\n` +
          "Copy .env.example to .env and fill in your values " +
          "(https://discord.com/developers/applications)."
      );
    }
  },
};

module.exports = config;
