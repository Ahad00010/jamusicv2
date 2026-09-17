const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const config = require("../config");

fs.mkdirSync(config.dataPath, { recursive: true });

const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  userId       TEXT PRIMARY KEY,
  wallet       INTEGER NOT NULL DEFAULT 0,
  bank         INTEGER NOT NULL DEFAULT 0,
  xp           INTEGER NOT NULL DEFAULT 0,
  level        INTEGER NOT NULL DEFAULT 0,
  dailyStreak  INTEGER NOT NULL DEFAULT 0,
  lastDaily    INTEGER NOT NULL DEFAULT 0,
  lastWeekly   INTEGER NOT NULL DEFAULT 0,
  lastWork     INTEGER NOT NULL DEFAULT 0,
  lastBeg      INTEGER NOT NULL DEFAULT 0,
  lastCrime    INTEGER NOT NULL DEFAULT 0,
  lastRob      INTEGER NOT NULL DEFAULT 0,
  lastXp       INTEGER NOT NULL DEFAULT 0,
  inventory    TEXT    NOT NULL DEFAULT '{}',
  stats        TEXT    NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS guilds (
  guildId  TEXT PRIMARY KEY,
  settings TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS warns (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  guildId     TEXT NOT NULL,
  userId      TEXT NOT NULL,
  moderatorId TEXT NOT NULL,
  reason      TEXT NOT NULL,
  timestamp   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    TEXT NOT NULL,
  guildId   TEXT,
  channelId TEXT NOT NULL,
  message   TEXT NOT NULL,
  dueAt     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS afk (
  guildId TEXT NOT NULL,
  userId  TEXT NOT NULL,
  reason  TEXT NOT NULL,
  since   INTEGER NOT NULL,
  PRIMARY KEY (guildId, userId)
);

CREATE INDEX IF NOT EXISTS idx_warns_user ON warns (guildId, userId);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders (dueAt);
`);

module.exports = db;
