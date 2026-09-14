const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current track'),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player || !player.playing) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    if (player.paused) {
      return interaction.reply({ content: '⏸️ Already paused. Use `/resume` to continue.', ephemeral: true });
    }

    player.pause();
    await interaction.reply('⏸️ Paused.');
  },
};
