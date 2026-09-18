const { ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require("discord.js");
const {
  errorContainer,
  successContainer,
  warningContainer,
  V2_FLAG,
  text,
  separator,
  container,
  editReplyV2,
} = require("../utils/v2");
const { formatDuration, truncate } = require("../utils/format");
const { isDJ } = require("../utils/perms");
const { getActiveFilters, setFilters, FILTER_NAMES } = require("../music/filters");
const { sendOrUpdateCard, cleanupGuildMusic } = require("../music/manager");
const { ensurePlayer, popSearchResults } = require("../music/utils");
const { sendQueueView, sendLyricsView } = require("../music/views");
const { fetchLyricsFor } = require("../music/lyrics");
const config = require("../config");

const LOOP_ORDER = ["off", "track", "queue"];

function requirePlayerAndVC(interaction) {
  const player = interaction.client.music.manager.players.get(interaction.guildId);
  if (!player || player.destroyed) {
    return { error: "There is no active player in this server. Start one with </play:0>!" };
  }
  const userChannel = interaction.member.voice?.channelId;
  if (userChannel !== player.voiceChannelId) {
    return { error: `You need to be in <#${player.voiceChannelId}> to control the player. 🎧` };
  }
  return { player };
}

function djGate(interaction) {
  if (isDJ(interaction)) return null;
  return "You need the DJ role (or Manage Server) to control playback in this server. 🔒";
}

async function deny(interaction, message) {
  const payload = {
    components: [errorContainer(message)],
    flags: V2_FLAG | MessageFlags.Ephemeral,
  };
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload).catch(() => {});
  return interaction.reply(payload).catch(() => {});
}

function volumeMenu(currentVolume) {
  return new StringSelectMenuBuilder()
    .setCustomId("music:volumeset")
    .setPlaceholder("Pick a volume level…")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      Array.from({ length: 20 }, (_, i) => {
        const value = (i + 1) * 10;
        return { label: `${value}%`, value: String(value), emoji: "🔊", default: value === currentVolume };
      })
    );
}

function filtersMenu(player) {
  const active = getActiveFilters(player);
  return new StringSelectMenuBuilder()
    .setCustomId("music:filtersset")
    .setPlaceholder("Pick up to 3 filters…")
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions(FILTER_NAMES.map((name) => ({ label: name, value: name, emoji: "🎛️", default: active.includes(name) })));
}


/** Handler for every `music:` component. */
async function handleMusicComponent(interaction, client) {
  const [, action] = interaction.customId.split(":");
  const state = client.music;

  // ----- search results picker (no player required yet) -----
  if (action === "pick") {
    const tracks = popSearchResults(client, interaction.guildId);
    if (!tracks || !tracks.length) {
      return deny(interaction, "That search has expired — run </play:0> again to get fresh results. ⏳");
    }
    const index = Number(interaction.values[0]);
    const track = tracks[index];
    if (!track) return deny(interaction, "That track is no longer available. Please search again. ⏳");
    if (!interaction.member.voice?.channelId) {
      return deny(interaction, "You need to be in a voice channel to pick a track! 🎙️");
    }

    const player = await ensurePlayer(interaction, client);
    const wasIdle = !player.playing;
    player.queue.add(track);
    if (wasIdle) await player.play();

    return interaction.update({
      components: [
        successContainer(
          `**${truncate(track.title, 80)}**\n-# ${truncate(track.author, 60)} • \`${
            track.isStream ? "LIVE" : formatDuration(track.duration)
          }\` • ${wasIdle ? "▶ Now playing" : `Position in queue: **${player.queue.size}**`}`,
          { title: "🎵 Track queued" }
        ),
      ],
    });
  }

  // ----- view actions (player must exist, no VC/DJ requirement) -----
  if (action === "showqueue" || action === "history") {
    const player = state.manager.players.get(interaction.guildId);
    if (!player || player.destroyed) return deny(interaction, "There is no active player in this server. 🎵");
    return sendQueueView(interaction, player, action === "history" ? "history" : "queue");
  }

  // ----- lyrics view: fetched from LRCLIB, paginated, ephemeral -----
  if (action === "lyrics") {
    const player = state.manager.players.get(interaction.guildId);
    if (!player || player.destroyed) return deny(interaction, "There is no active player in this server. 🎵");
    const track = player.current;
    if (!track) return deny(interaction, "Nothing is playing right now — start something with </play:0>! 🎶");

    // The LRCLIB lookup is a network round-trip, so acknowledge it right away.
    // Discord only accepts MessageFlags.Ephemeral on a deferred callback — the
    // Components V2 flag is set on the edit below (editReplyV2 / paginate do it).
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const lyrics = await fetchLyricsFor(player);

    if (lyrics.status === "ok") return sendLyricsView(interaction, player, lyrics);

    if (lyrics.status === "instrumental") {
      return editReplyV2(
        interaction,
        container(0x9b59b6, [
          text(`## 🎤 Lyrics`),
          text(`**${truncate(track.title, 90)}** is marked as instrumental on LRCLIB — nothing to sing along to. 🎼`),
        ])
      );
    }

    if (lyrics.status === "error") {
      return editReplyV2(
        interaction,
        errorContainer(`Couldn't reach LRCLIB right now (${truncate(lyrics.message || "unknown error", 120)}). Try again in a moment. 🎤`)
      );
    }

    return editReplyV2(
      interaction,
      container(0x9b59b6, [
        text(`## 🎤 Lyrics`),
        text(
          `No lyrics found on LRCLIB for **${truncate(track.title, 90)}**${
            track.author ? ` by **${truncate(track.author, 60)}**` : ""
          }.`
        ),
        text(`-# Tip: video titles are noisy — searching with the plain "artist - song" name usually matches better.`),
      ])
    );
  }

  return controlAction(interaction, client, action);
}

/** Ephemeral menu openers + playback controls (player + same VC required). */
async function controlAction(interaction, client, action) {
  const { player, error } = requirePlayerAndVC(interaction);
  if (error) return deny(interaction, error);

  // menu openers
  if (action === "volume" || action === "filters") {
    const djProblem = djGate(interaction);
    if (djProblem) return deny(interaction, djProblem);

    const row =
      action === "volume"
        ? new ActionRowBuilder().addComponents(volumeMenu(player.volume))
        : new ActionRowBuilder().addComponents(filtersMenu(player));

    return interaction.reply({
      components: [
        container(0x9b59b6, [
          text(action === "volume" ? "## 🔊 Volume" : "## 🎛️ Audio Filters"),
          text(
            action === "volume"
              ? `Current volume: **${player.volume}%** — pick a new level below.`
              : `Pick up to 3 filters — deselect everything and submit to reset them all.`
          ),
          separator(),
          row,
        ]),
      ],
      flags: V2_FLAG | MessageFlags.Ephemeral,
    });
  }

  const djProblem = djGate(interaction);
  if (djProblem) return deny(interaction, djProblem);
  await interaction.deferUpdate();

  switch (action) {
    case "playpause":
      if (player.paused) await player.resume();
      else await player.pause();
      break;

    case "skip":
      await player.skip().catch(() => {});
      break;

    case "back":
      if (player.previous.length) await player.back().catch(() => {});
      break;

    case "loop": {
      const next = LOOP_ORDER[(LOOP_ORDER.indexOf(player.loop) + 1) % LOOP_ORDER.length];
      player.setLoop(next);
      break;
    }

    case "shuffle":
      if (player.queue.size >= 2) player.shuffle();
      break;

    case "autoplay":
      player.setAutoPlay(!player.autoPlay);
      break;

    case "stop":
      player.queue.clear();
      await player.stop().catch(() => {});
      cleanupGuildMusic(client, interaction.guildId);
      return;

    default:
      return deny(interaction, "Unknown player action. 🤔");
  }

  await sendOrUpdateCard(client, player);
}

/** Select-menu submissions (volumeset / filtersset). */
async function handleMusicSelect(interaction, client) {
  const [, action] = interaction.customId.split(":");
  const { player, error } = requirePlayerAndVC(interaction);
  if (error) return deny(interaction, error);
  const djProblem = djGate(interaction);
  if (djProblem) return deny(interaction, djProblem);

  await interaction.deferUpdate();

  if (action === "volumeset") {
    const level = Math.max(1, Math.min(config.music.maxVolume, Number(interaction.values[0]) || 100));
    player.setVolume(level);
    await sendOrUpdateCard(client, player);
    await interaction
      .followUp({
        components: [successContainer(`Volume set to **${level}%**. 🔊`)],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      })
      .catch(() => {});
    return;
  }

  if (action === "filtersset") {
    const applied = await setFilters(player, interaction.values);
    await sendOrUpdateCard(client, player);
    await interaction
      .followUp({
        components: [
          successContainer(
            applied.length ? `Active filters: **${applied.join(", ")}**. 🎛️` : "All filters have been reset. 🎛️"
          ),
        ],
        flags: V2_FLAG | MessageFlags.Ephemeral,
      })
      .catch(() => {});
  }
}

module.exports = function registerMusicComponents(register) {
  register("music:", async (interaction, client) => {
    // volumeset/filtersset menus operate on an existing player; "music:pick" is the
    // search-results picker and must reach handleMusicComponent, where the pick case
    // creates the player itself (no player exists yet when the user selects).
    if (interaction.isStringSelectMenu() && interaction.customId !== "music:pick") {
      return handleMusicSelect(interaction, client);
    }
    return handleMusicComponent(interaction, client);
  });
};
