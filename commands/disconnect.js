const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Disconnect the bot from the voice channel'),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({ content: '❌ I am not connected to a voice channel.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    player.destroy('Disconnected by user');
    await interaction.reply('👋 Disconnected and cleared the queue.');
  },
};
