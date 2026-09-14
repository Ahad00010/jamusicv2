const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
    ),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({ content: '❌ I am not playing anything here.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    const mode = interaction.options.getString('mode', true);
    player.setLoop(mode);

    const labels = { off: '➡️ Loop disabled.', track: '🔂 Looping current track.', queue: '🔁 Looping the queue.' };
    await interaction.reply(labels[mode]);
  },
};
