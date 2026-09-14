require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Starting deployment of ${commands.length} slash command(s)...`);

    // 1. Always deploy to the specific guild for instant testing updates
    if (process.env.GUILD_ID) {
      console.log(`Deploying to guild ${process.env.GUILD_ID}...`);
      const guildData = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`Successfully deployed ${guildData.length} command(s) to guild.`);
    } else {
      console.log('Skipping guild deployment (No GUILD_ID found in .env).');
    }

    // 2. Always deploy globally so it works in DMs and all other servers
    console.log('Deploying globally...');
    const globalData = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log(`Successfully deployed ${globalData.length} command(s) globally.`);

  } catch (error) {
    console.error('Deployment failed:', error);
  }
})();
