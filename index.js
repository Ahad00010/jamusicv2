require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const http = require('http');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const { Manager, Connectors } = require('moonlink.js');

// Creates a basic web server to keep the project alive
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is awake and running 24/7!');
}).listen(process.env.PORT || 3000, () => {
  console.log('Keep-alive server is listening on port ' + (process.env.PORT || 3000));
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// ---- Slash command loading ----
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`[WARN] Command at ${file} is missing "data" or "execute".`);
  }
}

// ---- Moonlink.js Manager (talks to your Lavalink node) ----
client.manager = new Manager({
  nodes: [
    {
      identifier: 'Main Node',
      host: process.env.LAVALINK_HOST || 'localhost',
      port: Number(process.env.LAVALINK_PORT) || 2333,
      password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      secure: process.env.LAVALINK_SECURE === 'true',
    },
  ],
  options: {
    autoResume: true,
  },
});

// The Connector wires up manager.init(), raw packet forwarding, and send()
// for you — this replaces the old manual sendPayload/raw/init setup and is
// what fixes "this.manager.send is not a function".
client.manager.use(new Connectors.DiscordJs(), client);

// ---- Moonlink node/player events ----
client.manager.on('nodeCreate', (node) => {
  console.log(`[Lavalink] Node "${node.identifier}" connected.`);
});

client.manager.on('nodeError', (node, error) => {
  console.error(`[Lavalink] Node "${node.identifier}" error:`, error);
});

client.manager.on('nodeDisconnect', (node) => {
  console.warn(`[Lavalink] Node "${node.identifier}" disconnected.`);
});

client.manager.on('trackStart', (player) => {
  player.queueEndHandled = false;

  const channel = client.channels.cache.get(player.textChannelId);
  if (!channel) return;
  const track = player.current;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(`🎶 Now playing **${track.title}**${track.url ? ` — [link](${track.url})` : ''}`);
  channel.send({ embeds: [embed] }).catch(() => {});
});

client.manager.on('queueEnd', (player) => {
  if (player.queueEndHandled) return;
  player.queueEndHandled = true;

  const channel = client.channels.cache.get(player.textChannelId);
  if (channel) channel.send('📭 Queue finished — leaving the voice channel.').catch(() => {});

  player.destroy('Queue empty');
});

client.manager.on('trackException', (player, track, exception) => {
  console.error(`[Lavalink] Track exception on "${track?.title}":`, exception);
});

client.manager.on('trackStuck', (player, track) => {
  console.warn(`[Lavalink] Track stuck: "${track?.title}"`);
});

client.manager.on('playerDisconnect', (player) => {
  client.manager.players.delete(player.guildId, 'Voice channel disconnect');
});

// ---- Discord.js client events ----
// Note: the Connector calls manager.init() itself once the client logs in,
// so we no longer call it manually here.
client.once('clientReady', () => {
  console.log(`[Discord] Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(`[Command Error] /${interaction.commandName}:`, err);
    const payload = { content: '❌ Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);