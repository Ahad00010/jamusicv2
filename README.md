# Discord Music Bot — discord.js + Lavalink + Moonlink.js v5

A slash-command Discord music bot built with:
- **discord.js** v14 — Discord API wrapper
- **Lavalink** v4 (official, Java-based) — audio server that actually streams the music
- **Moonlink.js** v5.2 — the Lavalink client library that connects your bot to Lavalink

## How the pieces fit together

Your bot doesn't stream audio itself. It sends voice-channel join requests through Discord's
gateway, and **Lavalink** (a separate server process) handles decoding/streaming the audio.
**Moonlink.js** is the glue: it manages the WebSocket connection to Lavalink, tracks player
state, queues, and forwards Discord voice payloads back and forth.

```
Your bot (discord.js) <---> Moonlink.js (Manager) <---> Lavalink server <---> Voice channel
```

## 1. Get a Lavalink server running

You need a running Lavalink v4 instance. Easiest options:

- **Run it yourself**: download the latest `Lavalink.jar` from the official repo
  (https://github.com/lavalink-devs/Lavalink/releases) and run `java -jar Lavalink.jar`
  next to an `application.yml` config file (see the Lavalink docs for a sample config —
  set a `password`, port `2333`, etc).
- **Use a free/public Lavalink node** for testing (search "public lavalink nodes list" —
  availability changes often, so don't rely on these for production).
- **NodeLink** is a Node.js-native Lavalink-compatible alternative Moonlink.js also supports,
  if you'd rather not run Java.

Note the `host`, `port`, `password`, and whether it uses SSL — you'll need these for `.env`.

## 2. Create your Discord application

1. Go to https://discord.com/developers/applications and create an application.
2. Under **Bot**, create a bot user and copy the **token**.
3. Under **OAuth2 > URL Generator**, check scopes `bot` and `applications.commands`, and
   permissions `Connect`, `Speak`, `Send Messages`, `Embed Links`. Use the generated URL to
   invite the bot to your server.
4. Copy your application's **Client ID** from the General Information page.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DISCORD_TOKEN`, `CLIENT_ID`, optionally `GUILD_ID` (for instant command updates
while testing), and your Lavalink connection details.

## 4. Install and run

```bash
npm install
npm run deploy   # registers the slash commands with Discord
npm start        # starts the bot
```

## Commands

| Command | Description |
|---|---|
| `/play <query>` | Search and queue a song or playlist (URL or search term) |
| `/skip [to]` | Skip current track, or jump to a queue position |
| `/pause` / `/resume` | Pause or resume playback |
| `/stop` | Clear the queue and leave the voice channel |
| `/queue` | Show upcoming tracks |
| `/nowplaying` | Show the current track with a progress bar |
| `/volume <0-1000>` | Adjust playback volume |
| `/loop <off\|track\|queue>` | Set loop mode |
| `/disconnect` | Leave the voice channel |

## Project structure

```
discord-music-bot/
├── index.js              # Bot entry point: Discord client + Moonlink Manager setup
├── deploy-commands.js     # Registers slash commands with Discord
├── commands/              # One file per slash command
├── package.json
└── .env.example
```

## Notes

- `autoResume: true` in the Manager options lets Moonlink try to restore player state after
  a brief Lavalink node reconnect.
- The bot auto-leaves the voice channel after 60 seconds of being idle with an empty queue
  (see the `queueEnd` handler in `index.js`) — tweak or remove that if you'd rather it stay.
- If slash commands don't show up immediately, that's normal for **global** deploys (up to an
  hour to propagate) — set `GUILD_ID` in `.env` for instant updates during development.
