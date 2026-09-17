const db = require("./db");

const getUserStmt = db.prepare("SELECT * FROM users WHERE userId = ?");
const insertUserStmt = db.prepare("INSERT OR IGNORE INTO users (userId) VALUES (?)");

function getUser(userId) {
  insertUserStmt.run(userId);
  return getUserStmt.get(userId);
}

function updateUser(userId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return getUser(userId);
  const set = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE users SET ${set} WHERE userId = @userId`).run({ userId, ...fields });
  return getUser(userId);
}

// ---------- money ----------
function addMoney(userId, field, amount) {
  if (!["wallet", "bank"].includes(field)) throw new Error(`Invalid money field: ${field}`);
  const user = getUser(userId);
  return updateUser(userId, { [field]: Math.max(0, user[field] + amount) });
}

function removeMoney(userId, field, amount) {
  return addMoney(userId, field, -Math.abs(amount));
}

function getBalance(userId) {
  const user = getUser(userId);
  return { wallet: user.wallet, bank: user.bank, net: user.wallet + user.bank };
}

// Atomically move money between two users (wallet -> wallet)
const transferStmt = db.transaction((fromId, toId, amount) => {
  const from = getUser(fromId);
  if (from.wallet < amount) return false;
  getUser(toId);
  updateUser(fromId, { wallet: from.wallet - amount });
  const to = getUser(toId);
  updateUser(toId, { wallet: to.wallet + amount });
  return true;
});

function transfer(fromId, toId, amount) {
  return transferStmt(fromId, toId, amount);
}

// ---------- cooldowns ----------
const COOLDOWN_FIELDS = {
  daily: "lastDaily",
  weekly: "lastWeekly",
  work: "lastWork",
  beg: "lastBeg",
  crime: "lastCrime",
  rob: "lastRob",
};

function checkCooldown(userId, kind, cooldownMs) {
  const field = COOLDOWN_FIELDS[kind];
  if (!field) throw new Error(`Unknown cooldown kind: ${kind}`);
  const user = getUser(userId);
  const last = user[field];
  const now = Date.now();
  if (now - last < cooldownMs) {
    return { onCooldown: true, remaining: cooldownMs - (now - last), readyAt: last + cooldownMs };
  }
  return { onCooldown: false, remaining: 0, readyAt: 0 };
}

function setCooldown(userId, kind, timestamp = Date.now()) {
  const field = COOLDOWN_FIELDS[kind];
  if (!field) throw new Error(`Unknown cooldown kind: ${kind}`);
  return updateUser(userId, { [field]: timestamp });
}

// ---------- inventory ----------
function getInventory(userId) {
  return JSON.parse(getUser(userId).inventory);
}

function addItem(userId, itemId, count = 1) {
  const inv = getInventory(userId);
  inv[itemId] = (inv[itemId] || 0) + count;
  updateUser(userId, { inventory: JSON.stringify(inv) });
  return inv;
}

function removeItem(userId, itemId, count = 1) {
  const inv = getInventory(userId);
  if (!inv[itemId] || inv[itemId] < count) return false;
  inv[itemId] -= count;
  if (inv[itemId] <= 0) delete inv[itemId];
  updateUser(userId, { inventory: JSON.stringify(inv) });
  return true;
}

function countItem(userId, itemId) {
  return getInventory(userId)[itemId] || 0;
}

function hasItem(userId, itemId) {
  return countItem(userId, itemId) > 0;
}

// ---------- xp / levels ----------
function addXp(userId, amount) {
  const user = getUser(userId);
  const now = Date.now();
  const newXp = user.xp + amount;
  const newLevel = Math.floor(Math.sqrt(newXp / 100));
  updateUser(userId, { xp: newXp, level: newLevel, lastXp: now });
  return { xp: newXp, level: newLevel, leveledUp: newLevel > user.level, oldLevel: user.level };
}

function xpForLevel(level) {
  return level * level * 100;
}

// ---------- stats ----------
function getStats(userId) {
  return JSON.parse(getUser(userId).stats);
}

function addGameStat(userId, game, won) {
  const stats = getStats(userId);
  const entry = stats[game] || { wins: 0, losses: 0 };
  if (won) entry.wins += 1;
  else entry.losses += 1;
  stats[game] = entry;
  updateUser(userId, { stats: JSON.stringify(stats) });
  return entry;
}

// ---------- leaderboards ----------
function getLeaderboard(field, limit = 10, offset = 0) {
  if (!["wallet", "bank", "xp", "level"].includes(field)) throw new Error(`Invalid leaderboard field: ${field}`);
  return db
    .prepare(`SELECT userId, ${field} AS value FROM users ORDER BY ${field} DESC LIMIT ? OFFSET ?`)
    .all(limit, offset);
}

function getRank(field, userId) {
  if (!["wallet", "bank", "xp", "level"].includes(field)) throw new Error(`Invalid leaderboard field: ${field}`);
  const row = db
    .prepare(
      `SELECT rank FROM (
         SELECT userId, RANK() OVER (ORDER BY ${field} DESC) AS rank FROM users
       ) WHERE userId = ?`
    )
    .get(userId);
  return row ? row.rank : null;
}

module.exports = {
  getUser,
  updateUser,
  addMoney,
  removeMoney,
  getBalance,
  transfer,
  checkCooldown,
  setCooldown,
  getInventory,
  addItem,
  removeItem,
  countItem,
  hasItem,
  addXp,
  xpForLevel,
  getStats,
  addGameStat,
  getLeaderboard,
  getRank,
};
