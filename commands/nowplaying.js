const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show info about the current track'),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player || !player.current) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    const track = player.current;
    const position = player.position ?? 0;
    const duration = track.duration ?? 0;
    const bar = buildProgressBar(position, duration);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎶 Now Playing')
      .setDescription(`**[${track.title}](${track.url})**\nby ${track.author}`)
      .addFields({
        name: '\u200b',
        value: `${bar}\n${msToTime(position)} / ${duration ? msToTime(duration) : 'LIVE'}`,
      })
      .setThumbnail(track.artworkUrl ?? null)
      .setFooter({ text: `Requested by ${track.requester?.username ?? track.requester ?? 'unknown'}` });

    await interaction.reply({ embeds: [embed] });
  },
};

function msToTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function buildProgressBar(position, duration, length = 20) {
  if (!duration) return '🔴 ' + '▬'.repeat(length);
  const ratio = Math.min(position / duration, 1);
  const filled = Math.round(length * ratio);
  return '▬'.repeat(filled) + '🔘' + '▬'.repeat(Math.max(length - filled, 0));
}
