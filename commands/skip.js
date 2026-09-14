const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current track')
    .addIntegerOption((opt) =>
      opt.setName('to').setDescription('Skip to a specific position in the queue').setRequired(false)
    ),

  async execute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);

    if (!player || !player.playing) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    if (interaction.member.voice.channelId !== player.voiceChannelId) {
      return interaction.reply({ content: '❌ You need to be in my voice channel to do that.', ephemeral: true });
    }

    const skippedTrack = player.current;
    const to = interaction.options.getInteger('to');

    if (to) {
      player.skip(to - 1);
      return interaction.reply(`⏭️ Skipped to track #${to} in the queue.`);
    }

    player.skip();
    await interaction.reply(`⏭️ Skipped **${skippedTrack?.title ?? 'the current track'}**.`);
  },
};
