const db = require("./db");

const addWarnStmt = db.prepare(
  "INSERT INTO warns (guildId, userId, moderatorId, reason, timestamp) VALUES (?, ?, ?, ?, ?)"
);
const getWarnsStmt = db.prepare(
  "SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC"
);
const getWarnStmt = db.prepare("SELECT * FROM warns WHERE guildId = ? AND id = ?");
const removeWarnStmt = db.prepare("DELETE FROM warns WHERE guildId = ? AND id = ?");
const clearWarnsStmt = db.prepare("DELETE FROM warns WHERE guildId = ? AND userId = ?");
const countWarnsStmt = db.prepare("SELECT COUNT(*) AS count FROM warns WHERE guildId = ? AND userId = ?");

function addWarn(guildId, userId, moderatorId, reason) {
  const info = addWarnStmt.run(guildId, userId, moderatorId, reason, Date.now());
  return getWarnStmt.get(guildId, info.lastInsertRowid);
}

function getWarns(guildId, userId) {
  return getWarnsStmt.all(guildId, userId);
}

function removeWarn(guildId, warnId) {
  const warn = getWarnStmt.get(guildId, warnId);
  if (!warn) return null;
  removeWarnStmt.run(guildId, warnId);
  return warn;
}

function clearWarns(guildId, userId) {
  const count = countWarnsStmt.get(guildId, userId).count;
  clearWarnsStmt.run(guildId, userId);
  return count;
}

function countWarns(guildId, userId) {
  return countWarnsStmt.get(guildId, userId).count;
}

module.exports = { addWarn, getWarns, removeWarn, clearWarns, countWarns };
