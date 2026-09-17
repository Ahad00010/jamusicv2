const { MessageFlags } = require("discord.js");
const { Manager, Connectors } = require("moonlink.js");
const config = require("../config");
const { buildPlayerCard, buildEndedCard } = require("./playerCard");
const { errorContainer, V2_FLAG } = require("../utils/v2");

/** Shared per-guild music runtime state. */
function createMusicState() {
  return {
    cards: new Map(), // guildId -> Message (live player card)
    intervals: new Map(), // guildId -> NodeJS.Timeout (card refresher)
    destroyTimers: new Map(), // guildId -> NodeJS.Timeout (idle destroy after queue end)
    searchCache: new Map(), // guildId -> { tracks: Track[], expires: number }
  };
}

function cleanupGuildMusic(client, guildId) {
  const state = client.music;
  const interval = state.intervals.get(guildId);
  if (interval) clearInterval(interval);
  state.intervals.delete(guildId);
  const timer = state.destroyTimers.get(guildId);
  if (timer) clearTimeout(timer);
  state.destroyTimers.delete(guildId);
  state.cards.delete(guildId);
}

function scheduleIdleDestroy(client, player) {
  const state = client.music;
  const existing = state.destroyTimers.get(player.guildId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    state.destroyTimers.delete(player.guildId);
    const fresh = state.manager.players.get(player.guildId);
    if (fresh && !fresh.playing && fresh.queue.isEmpty) {
      cleanupGuildMusic(client, player.guildId);
      await fresh.destroy().catch(() => {});
    }
  }, config.music.idleDestroyMs);
  state.destroyTimers.set(player.guildId, timer);
}

async function sendOrUpdateCard(client, player) {
  if (!player.textChannelId) return;
  const channel = await client.channels.fetch(player.textChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const existing = client.music.cards.get(player.guildId);
  const payload = { components: [buildPlayerCard(player)] };
  try {
    if (existing) {
      const fetched = await channel.messages.fetch(existing.id).catch(() => null);
      if (fetched) {
        await fetched.edit(payload);
        return;
      }
    }
    const message = await channel.send({ ...payload, flags: V2_FLAG, allowedMentions: { parse: [] } });
    client.music.cards.set(player.guildId, message);
  } catch {
    /* channel deleted or missing perms */
  }
}

function startCardInterval(client, player) {
  const state = client.music;
  if (state.intervals.has(player.guildId)) return;
  const interval = setInterval(async () => {
    const fresh = state.manager.players.get(player.guildId);
    if (!fresh || fresh.destroyed) return cleanupGuildMusic(client, player.guildId);
    if (!fresh.playing || fresh.paused || !fresh.current) return;
    await sendOrUpdateCard(client, fresh);
  }, config.music.cardUpdateMs);
  state.intervals.set(player.guildId, interval);
}

function createMusicManager(client) {
  client.music = createMusicState();
  const manager = new Manager({
    nodes: [
      {
        identifier: "jamusic-main",
        host: config.lavalink.host,
        port: config.lavalink.port,
        password: config.lavalink.password,
        secure: config.lavalink.secure,
      },
    ],
    options: {
      database: { type: "local" },
      autoResume: false,
      resume: true,
    },
  });

  manager.use(new Connectors.DiscordJs(), client);

  manager.on("nodeCreate", (node) => {
    console.log(`[Music] Node "${node.identifier}" created.`);
  });
  manager.on("nodeReady", (node) => {
    console.log(`[Music] Node "${node.identifier}" is ready (NodeLink session established).`);
  });
  manager.on("nodeError", (node, error) => {
    console.error(`[Music] Node "${node.identifier}" error:`, error?.message || error);
  });
  manager.on("nodeDisconnect", (node, code, reason) => {
    console.warn(`[Music] Node "${node.identifier}" disconnected (code ${code}) ${reason || ""}`);
  });
  manager.on("playerDestroy", (player) => {
    cleanupGuildMusic(client, player.guildId);
  });

  manager.on("trackStart", async (player, track) => {
    const timers = client.music.destroyTimers;
    const pending = timers.get(player.guildId);
    if (pending) {
      clearTimeout(pending);
      timers.delete(player.guildId);
    }
    startCardInterval(client, player);
    await sendOrUpdateCard(client, player);
  });

  manager.on("queueEnd", async (player) => {
    const channel = player.textChannelId
      ? await client.channels.fetch(player.textChannelId).catch(() => null)
      : null;
    const card = client.music.cards.get(player.guildId);
    if (card && channel?.isTextBased()) {
      await card
        .edit({ components: [buildEndedCard("Queue finished! Idle player will be cleaned up shortly. 🍃")] })
        .catch(() => {});
    }
    scheduleIdleDestroy(client, player);
  });

  client.music.manager = manager;
  return manager;
}

/** Sends a Components V2 error as an ephemeral reply (safe when already replied). */
async function musicError(interaction, message) {
  const payload = {
    components: [errorContainer(message)],
    flags: V2_FLAG | MessageFlags.Ephemeral,
  };
  if (interaction.deferred && !interaction.replied) {
    return interaction.editReply({
      components: [errorContainer(message)],
      // IS_COMPONENTS_V2 is only settable on the edit, never on the deferred callback.
      flags: interaction.ephemeral ? V2_FLAG | MessageFlags.Ephemeral : V2_FLAG,
    });
  }
  if (interaction.replied) return interaction.followUp(payload);
  return interaction.reply(payload);
}

module.exports = { createMusicManager, cleanupGuildMusic, scheduleIdleDestroy, sendOrUpdateCard, musicError };
