const db = require("./db");

const setStmt = db.prepare(
  "INSERT INTO afk (guildId, userId, reason, since) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT (guildId, userId) DO UPDATE SET reason = excluded.reason, since = excluded.since"
);
const getStmt = db.prepare("SELECT * FROM afk WHERE guildId = ? AND userId = ?");
const deleteStmt = db.prepare("DELETE FROM afk WHERE guildId = ? AND userId = ?");
const allInGuildStmt = db.prepare("SELECT * FROM afk WHERE guildId = ?");

function setAfk(guildId, userId, reason) {
  setStmt.run(guildId, userId, reason, Date.now());
}

function getAfk(guildId, userId) {
  return getStmt.get(guildId, userId) || null;
}

function removeAfk(guildId, userId) {
  deleteStmt.run(guildId, userId);
}

function getAfkUsers(guildId) {
  return allInGuildStmt.all(guildId);
}

module.exports = { setAfk, getAfk, removeAfk, getAfkUsers };
