const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current queue'),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player || (!player.current && player.queue.size === 0)) {
      return interaction.reply({ content: '📭 The queue is empty.', ephemeral: true });
    }

    const upcoming = player.queue.toArray ? player.queue.toArray() : Array.from(player.queue);
    const list = upcoming
      .slice(0, 10)
      .map((t, i) => `**${i + 1}.** ${t.title} — \`${t.duration ? msToTime(t.duration) : 'Live'}\``)
      .join('\n') || '_Nothing queued after the current track._';

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🎵 Queue')
      .setDescription(
        `**Now playing:** ${player.current ? `[${player.current.title}](${player.current.url})` : '_Nothing_'}\n\n` +
          `**Up next:**\n${list}` +
          (player.queue.size > 10 ? `\n\n...and ${player.queue.size - 10} more.` : '')
      )
      .setFooter({ text: `Loop: ${player.loop} | Volume: ${player.volume}%` });

    await interaction.reply({ embeds: [embed] });
  },
};

function msToTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
