const db = require("./db");

const addStmt = db.prepare(
  "INSERT INTO reminders (userId, guildId, channelId, message, dueAt) VALUES (?, ?, ?, ?, ?)"
);
const dueStmt = db.prepare("SELECT * FROM reminders WHERE dueAt <= ? ORDER BY dueAt ASC");
const deleteStmt = db.prepare("DELETE FROM reminders WHERE id = ?");
const forUserStmt = db.prepare(
  "SELECT * FROM reminders WHERE userId = ? ORDER BY dueAt ASC LIMIT 25"
);

function addReminder(userId, guildId, channelId, message, dueAt) {
  const info = addStmt.run(userId, guildId, channelId, message, dueAt);
  return info.lastInsertRowid;
}

function getDueReminders(now = Date.now()) {
  return dueStmt.all(now);
}

function deleteReminder(id) {
  deleteStmt.run(id);
}

function getRemindersForUser(userId) {
  return forUserStmt.all(userId);
}

module.exports = { addReminder, getDueReminders, deleteReminder, getRemindersForUser };
