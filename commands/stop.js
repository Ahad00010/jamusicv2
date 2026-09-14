const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({ content: '❌ I am not playing anything here.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    player.queue.clear();
    player.stop();
    player.destroy('Stopped by user');

    await interaction.reply('⏹️ Stopped playback, cleared the queue, and left the voice channel.');
  },
};
