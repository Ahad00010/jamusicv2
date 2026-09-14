const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume')
    .addIntegerOption((opt) =>
      opt.setName('level').setDescription('Volume level (0-1000)').setRequired(true).setMinValue(0).setMaxValue(1000)
    ),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player) {
      return interaction.reply({ content: '❌ I am not playing anything here.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    const level = interaction.options.getInteger('level', true);
    player.setVolume(level);

    await interaction.reply(`🔊 Volume set to **${level}%**.`);
  },
};
