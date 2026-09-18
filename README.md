# 🎵 JaMusic V2

A complete Discord music & community bot built with **discord.js v14**, **moonlink.js v5**, **NodeLink** and **Discord Components V2** — featuring music playback, moderation, an economy system, interactive games and more.

## ✨ Features

| Category | Commands |
|---|---|
| 🎵 Music (23) | play, search, pause, resume, skip, back, replay, stop, leave, join, nowplaying, queue, history, volume, loop, shuffle, seek, remove, move, clear, autoplay, filter, grab |
| 🌐 General (18) | help, ping, botinfo, serverinfo, userinfo, avatar, banner, roleinfo, channelinfo, emojiinfo, invite, poll, embed, say, remind, afk, calculator, stats |
| 🛡️ Moderation (21) | ban, unban, softban, kick, timeout, untimeout, warn, warnings, clearwarnings, delwarn, purge, lock, unlock, slowmode, vmute, vunmute, nickname, addrole, removerole, modlogs, dm |
| 💰 Economy (20) | balance, daily, weekly, work, beg, crime, rob, deposit, withdraw, pay, gamble, coinflip, slots, shop, buy, use, sell, inventory, leaderboard, rank |
| 🎮 Games (13) | tictactoe, connect4, rps, blackjack, hangman, guessnumber, higherlower, duel, truthdare, wouldyourather, dice, typingrace, memory |
| ⚙️ Config (2) | setup, showconfig |

**Every reply uses Discord's Components V2** (`ContainerBuilder`, `SectionBuilder`, `TextDisplayBuilder`, `SeparatorBuilder`, `MediaGalleryBuilder`, …) — including a **live-updating music player card** with progress bar, control buttons, queue/filter/volume select menus and **paginated lyrics from [LRCLIB](https://lrclib.net)**.

## 📦 Requirements

- **Node.js 22+** (for both the bot and the bundled NodeLink audio server — **no Java needed**)
- A Discord bot token ([create an application](https://discord.com/developers/applications))

## 🚀 Setup

### 1. Install dependencies

```bash
npm install
```

This also installs the dependencies of the bundled NodeLink server (`nodelink/`).

### 2. Configure the bot

```bash
cp .env.example .env
```

Fill in:

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Your bot token from the Developer Portal |
| `CLIENT_ID` | Your application ID |
| `GUILD_ID` | *(optional)* A server ID — makes command registration instant while developing |
| `NODELINK_PASSWORD` | Audio server password (default `youshallnotpass`) |
| `NODELINK_HOST` / `NODELINK_PORT` | *(optional)* Advanced overrides — on Render, `PORT` is handled automatically |

Legacy `LAVALINK_*` variables are still respected if present.

Invite the bot with the **bot** + **applications.commands** scopes and permissions: Connect, Speak, Send Messages, Manage Messages, Kick Members, Ban Members, Moderate Members, Manage Channels, Manage Roles.

### 3. Register slash commands & run

```bash
# Instant registration to your dev guild (uses GUILD_ID):
npm run deploy:guild

# …or global registration (may take up to 1 hour to propagate):
npm run deploy

npm start   # boots NodeLink + the bot together
```

## ☁️ Deploying to Render

One **Web Service** runs everything — the bundled NodeLink binds to `0.0.0.0:$PORT` and serves Render's health check itself:

1. Push this repo to GitHub, then on Render: **New → Web Service**, connect the repo, **Runtime: Node**.
2. **Build command:** `npm install` — **Start command:** `npm start`.
3. Environment variables:
   - `NODE_VERSION` = `22` (or newer)
   - `BOT_TOKEN`, `CLIENT_ID`
   - `NODELINK_PASSWORD` — set a long random string (the port is publicly reachable)
   - `GUILD_ID` *(optional)*
4. Deploy — the launcher starts NodeLink, waits for its API, then starts the bot.
   The service root (`/`) serves a plain "Keepalive !" page (no auth), so it doubles
   as your health-check / uptime-monitor URL.

**Render notes:**
- Free instances sleep after ~15 minutes without *inbound* HTTP traffic (the bot's Discord connection doesn't count). Point an uptime monitor (UptimeRobot, cron-job.org) at the service root `/` — it answers `200 Keepalive !` — or use a paid instance.
- Free instances have 512 MB RAM — NodeLink + bot fit, but a Starter instance is more comfortable.
- NodeLink ships prebuilt (`dist/`), so no TypeScript compile step is needed.

## 🛠️ Development

```bash
npm run check        # syntax-check every source file
```

### Project layout

```
src/
├── index.js            # entry point — client, music manager, loaders
├── config.js           # env config + validation
├── database/           # better-sqlite3: users, guilds, warns, reminders, afk
├── handlers/           # command/event/component loaders + deploy/destroy scripts
├── music/              # moonlink manager, live player card, filters, views
├── utils/              # Components V2 helpers, perms, formatting, shop
├── events/             # ready, interactions, XP, welcome/leave
├── components/         # interaction handlers (music, games, config, help)
└── commands/           # music/ general/ moderation/ economy/ games/ config/
scripts/
├── start.js            # one-command launcher: NodeLink + bot
└── install-nodelink.js # postinstall hook for nodelink/ dependencies
nodelink/               # bundled NodeLink audio server (Lavalink v4 API, pure Node.js)
```

### Notes

- **Data** is stored in `data/jamusic.db` (SQLite, WAL mode). Delete it to reset everything.
- **DJ role**: configure in `/setup` — when set, playback controls require it (members with Manage Server bypass).
- **Moderation logging** goes to the channel configured in `/setup`.
- **Economy cooldowns** (daily/weekly/work/beg/crime/rob) are persisted in the database and survive restarts.
- **Filters** use Lavalink v4 filter objects applied through moonlink's `player.filters` API (NodeLink implements them).
- **Lyrics** come straight from [LRCLIB](https://lrclib.net) (no API key) via the 🎤 **Lyrics** button on the player card and `/nowplaying`: exact `/api/get` lookup first (with and without duration), then a scored `/api/search` fallback, synced LRC timings highlighted on the current line, and 15 lines per page with the usual pagination buttons. Results are cached (positive 30 min, misses 5 min) and the fetch is bounded by `music.lyricsTimeoutMs`.
- **NodeLink** is vendored under `nodelink/` ([PerformanC/NodeLink](https://github.com/PerformanC/NodeLink), GPL-3.0 — see `nodelink/LICENSE`). It speaks the Lavalink v4 REST/WebSocket API, so moonlink.js connects unchanged. A custom `nodelink/config.js` without the generated marker is left untouched by the launcher.
