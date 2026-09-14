require('dotenv').config(); // Loads environment variables from your .env file
const { REST, Routes } = require('discord.js');

// Adjust these variable names to match what is inside your .env file
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; 

if (!token || !clientId) {
    console.error('Error: Missing DISCORD_TOKEN or CLIENT_ID in environment variables.');
    process.exit(1);
}

const rest = new REST().setToken(token);

async function destroyCommands() {
    try {
        console.log('Started clearing application commands...');

        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
            console.log('Successfully deleted all guild slash commands.');
        }

        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log('Successfully deleted all global slash commands.');
    } catch (error) {
        console.error(error);
    }
}

destroyCommands();
