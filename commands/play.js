const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist (search term or URL)')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('Song name, URL, or search term').setRequired(true)
    ),

  async execute(interaction, client) {
    const { guild, member, channel } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '🔊 Join a voice channel first!', ephemeral: true });
    }

    const permissions = voiceChannel.permissionsFor(client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return interaction.reply({ content: '❌ I need Connect and Speak permissions in that voice channel.', ephemeral: true });
    }

    await interaction.deferReply();

    const query = interaction.options.getString('query', true);

    let player = client.manager.players.get(guild.id);
    if (!player) {
      player = client.manager.players.create({
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: channel.id,
        volume: 80,
      });
    }

    if (!player.connected) {
      player.connect({ setDeaf: true, setMute: false });
    }

    const result = await client.manager.search({ query, source: 'youtube', requester: interaction.user });

    if (!result || result.loadType === 'empty' || result.loadType === 'error') {
      return interaction.editReply(`❌ No results found for **${query}**.`);
    }

    if (result.loadType === 'playlist') {
      for (const track of result.tracks) {
        track.setRequester?.(interaction.user);
        player.queue.add(track);
      }
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setDescription(`📃 Queued playlist **${result.playlistInfo?.name ?? 'Playlist'}** — ${result.tracks.length} tracks`);
      await interaction.editReply({ embeds: [embed] });
    } else {
      const track = result.tracks[0];
      track.setRequester?.(interaction.user);
      player.queue.add(track);
        const embed = new EmbedBuilder()
  .setColor(0x5865f2)
  .setDescription(`➕ Queued **${track.title}**${track.url ? ` — [link](${track.url})` : ''}`);
      await interaction.editReply({ embeds: [embed] });
    }

    if (!player.playing && !player.paused) {
      player.play();
    }
  },
};
