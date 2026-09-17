const { MessageFlags } = require("discord.js");
const { errorContainer, successContainer, V2_FLAG } = require("../utils/v2");
const guildStore = require("../database/guilds");
const { musicError } = require("./manager");

/** Returns an error string when the interaction cannot proceed with music, else null. */
function checkVoice(interaction, { mustJoin = true } = {}) {
  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel) {
    return "You need to be in a voice channel first! 🎙️ Join one and try again.";
  }
  if (!interaction.guild.members.me.permissionsIn(voiceChannel).has(["ViewChannel", "Connect"])) {
    return `I don't have permission to connect to **${voiceChannel.name}**. Check my role and channel permissions.`;
  }
  if (!mustJoin) return null;

  const player = interaction.client.music.manager.players.get(interaction.guildId);
  if (player && player.voiceChannelId && player.voiceChannelId !== voiceChannel.id) {
    return `I'm already playing in <#${player.voiceChannelId}> — join that channel or stop playback first. 🎧`;
  }
  return null;
}

/** Creates or reuses the guild player and connects it to the user's voice channel. */
async function ensurePlayer(interaction, client) {
  const manager = client.music.manager;
  let player = manager.players.get(interaction.guildId);
  if (!player) {
    const settings = guildStore.getSettings(interaction.guildId);
    player = manager.players.create({
      guildId: interaction.guildId,
      voiceChannelId: interaction.member.voice.channelId,
      textChannelId: interaction.channelId,
      volume: settings.defaultVolume || 80,
      autoPlay: settings.autoPlay !== false,
      selfDeaf: true,
      selfMute: false,
    });
  } else {
    player.voiceChannelId = interaction.member.voice.channelId;
    player.textChannelId = interaction.channelId;
    if (!player.connected) await player.connect();
  }
  return player;
}

/** Adds tracks to the queue and starts playback when idle. Returns whether playback started. */
async function queueAndPlay(player, tracks, { requester } = {}) {
  if (requester) {
    for (const track of tracks) track.setRequester?.(requester);
  }
  player.queue.add(tracks);
  const wasIdle = !player.playing;
  if (wasIdle) await player.play();
  return wasIdle;
}

function stashSearchResults(client, guildId, tracks) {
  client.music.searchCache.set(guildId, { tracks, expires: Date.now() + 3 * 60 * 1000 });
  // opportunistic cleanup
  for (const [gid, entry] of client.music.searchCache) {
    if (entry.expires < Date.now()) client.music.searchCache.delete(gid);
  }
}

function popSearchResults(client, guildId) {
  const entry = client.music.searchCache.get(guildId);
  if (!entry || entry.expires < Date.now()) {
    client.music.searchCache.delete(guildId);
    return null;
  }
  return entry.tracks;
}

/** Standard gate used by music commands: voice checks + player fetch. */
async function gate(interaction, client, { requirePlayer = true } = {}) {
  const voiceProblem = checkVoice(interaction);
  if (voiceProblem) {
    await musicError(interaction, voiceProblem);
    return null;
  }
  if (requirePlayer) {
    const player = client.music.manager.players.get(interaction.guildId);
    if (!player || player.destroyed) {
      await musicError(interaction, "There is no active player in this server. Start one with </play:0>!");
      return null;
    }
    return player;
  }
  return ensurePlayer(interaction, client);
}

module.exports = { checkVoice, ensurePlayer, queueAndPlay, stashSearchResults, popSearchResults, gate };
