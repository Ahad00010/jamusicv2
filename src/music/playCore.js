const { ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const { editReplyV2, infoContainer, successContainer } = require("../utils/v2");
const { formatDuration, truncate, isUrl } = require("../utils/format");
const { musicError } = require("./manager");
const { checkVoice, ensurePlayer, stashSearchResults } = require("./utils");
const config = require("../config");

/**
 * Shared logic for /play and /search.
 * - URL queries resolve instantly (playlists are fully queued).
 * - Text queries show a Components V2 selection menu of up to 10 results.
 */
async function handlePlayRequest(interaction, client, query) {
  // Plain defer: Discord rejects any flag other than EPHEMERAL on a deferred callback.
  // The V2 flag is applied by editReplyV2() on the follow-up edit instead.
  await interaction.deferReply();

  const voiceProblem = checkVoice(interaction);
  if (voiceProblem) return musicError(interaction, voiceProblem);

  const manager = client.music.manager;
  // moonlink exposes `nodes.hasReady` as a getter (not a method) — calling it throws.
  if (!manager.nodes.hasReady) {
    return musicError(
      interaction,
      manager.nodes.hasOnlineNodes
        ? "The music node is still connecting — give it a few seconds and try again. ⏳"
        : "The music node is offline right now, so I can't search. Please try again shortly. 🔌"
    );
  }

  const search = await manager.search({ query, requester: interaction.user }).catch((error) => {
    console.error("[Music] Search failed:", error?.message || error);
    return null;
  });

  if (!search || search.isError || search.isEmpty) {
    return musicError(
      interaction,
      "I couldn't find anything for that query. 🤔 The node may be offline or the source may be unavailable — try another search or check that NodeLink is running."
    );
  }

  if (search.isPlaylist) {
    const player = await ensurePlayer(interaction, client);
    const tracks = search.tracks.slice(0, 250);
    const wasIdle = !player.playing;
    player.queue.add(tracks);
    if (wasIdle) await player.play();
    return editReplyV2(
      interaction,
      successContainer(
        `**${truncate(search.playlistInfo?.name || "Playlist", 80)}**\n-# Queued **${tracks.length}** tracks • First up: **${truncate(
          tracks[0]?.title || "unknown",
          60
        )}**`,
        { title: "🎶 Playlist queued" }
      )
    );
  }

  const track = search.tracks[0];

  if (isUrl(query)) {
    const player = await ensurePlayer(interaction, client);
    const wasIdle = !player.playing;
    player.queue.add(track);
    if (wasIdle) await player.play();
    return editReplyV2(
      interaction,
      successContainer(
        `**${truncate(track.title, 80)}**\n-# ${truncate(track.author, 60)} • \`${formatDuration(track.duration)}\` • ${
          wasIdle ? "▶ Now playing" : `Position in queue: **${player.queue.size}**`
        }`,
        { title: "🎵 Track queued" }
      )
    );
  }

  // Text query -> selection menu
  const results = search.tracks.slice(0, config.music.searchResults);
  stashSearchResults(client, interaction.guildId, search.tracks);

  const select = new StringSelectMenuBuilder()
    .setCustomId("music:pick")
    .setPlaceholder("Pick a track…")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      results.map((t, i) => ({
        label: truncate(t.title, 100),
        value: String(i),
        description: `${t.author} • ${t.isStream ? "LIVE" : formatDuration(t.duration)}`.slice(0, 100),
        emoji: "🎵",
      }))
    );

  await editReplyV2(
    interaction,
    infoContainer({
      color: config.colors.music,
      title: "🔎 Search results",
      description: `Top results for **${truncate(query, 60)}** — pick one to queue it.`,
      rows: [new ActionRowBuilder().addComponents(select)],
      footer: "Selection expires in 3 minutes.",
    })
  );
}

module.exports = { handlePlayRequest };
