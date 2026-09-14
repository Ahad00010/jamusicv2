const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the current track'),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({ content: '❌ I am not playing anything here.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    if (!player.paused) {
      return interaction.reply({ content: '▶️ Already playing.', ephemeral: true });
    }

    player.resume();
    await interaction.reply('▶️ Resumed.');
  },
};
