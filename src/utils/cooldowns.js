/** Simple in-memory per-command cooldown store (complements economy DB cooldowns). */
const cooldowns = new Map(); // commandName -> Map(userId -> timestamp)

/** Returns remaining ms if on cooldown, else stamps the cooldown and returns 0. */
function applyCooldown(commandName, userId, seconds) {
  if (!seconds || seconds <= 0) return 0;
  if (!cooldowns.has(commandName)) cooldowns.set(commandName, new Map());
  const map = cooldowns.get(commandName);
  const now = Date.now();
  const expires = map.get(userId);
  if (expires && expires > now) return expires - now;
  map.set(userId, now + seconds * 1000);
  return 0;
}

function clearCooldown(commandName, userId) {
  if (cooldowns.has(commandName)) cooldowns.get(commandName).delete(userId);
}

module.exports = { applyCooldown, clearCooldown };
