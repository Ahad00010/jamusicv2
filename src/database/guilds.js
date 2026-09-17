const db = require("./db");

const DEFAULT_SETTINGS = {
  welcomeChannelId: null,
  leaveChannelId: null,
  logChannelId: null,
  djRoleId: null,
  modRoleIds: [],
  autoRoleIds: [],
  autoPlay: true,
  defaultVolume: 80,
};

const getGuildStmt = db.prepare("SELECT * FROM guilds WHERE guildId = ?");
const insertGuildStmt = db.prepare("INSERT OR IGNORE INTO guilds (guildId) VALUES (?)");
const updateSettingsStmt = db.prepare("UPDATE guilds SET settings = ? WHERE guildId = ?");

function getGuildRow(guildId) {
  insertGuildStmt.run(guildId);
  return getGuildStmt.get(guildId);
}

function getSettings(guildId) {
  const row = getGuildRow(guildId);
  let stored = {};
  try {
    stored = JSON.parse(row.settings || "{}");
  } catch {
    stored = {};
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

function setSetting(guildId, key, value) {
  const settings = getSettings(guildId);
  settings[key] = value;
  updateSettingsStmt.run(JSON.stringify(settings), guildId);
  return settings;
}

function setSettings(guildId, patch) {
  const settings = { ...getSettings(guildId), ...patch };
  updateSettingsStmt.run(JSON.stringify(settings), guildId);
  return settings;
}

function resetSettings(guildId) {
  updateSettingsStmt.run("{}", guildId);
  return { ...DEFAULT_SETTINGS };
}

module.exports = { DEFAULT_SETTINGS, getSettings, setSetting, setSettings, resetSettings };
