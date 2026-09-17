/** Format milliseconds as m:ss or h:mm:ss */
function formatDuration(ms) {
  if (!ms || ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Compact number formatting: 1.2k, 3.4M */
function formatNumber(n) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Format a number with thousands separators */
function formatFull(n) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Text progress bar */
function progressBar(current, total, size = 18, filled = "━", empty = "─", head = "◍") {
  if (total <= 0 || current < 0) current = 0;
  if (current > total) current = total;
  const progress = Math.round((current / total) * size);
  return `${empty.repeat(Math.max(0, progress))}${head}${filled.repeat(Math.max(0, size - progress))}`;
}

/** Parse "1h30m", "2d", "45s", "1:30" (mm:ss), "1:02:03" (h:mm:ss) or plain seconds into ms */
function parseDuration(input, { defaultUnit = "s" } = {}) {
  if (input == null) return null;
  const str = String(input).trim().toLowerCase();
  if (!str) return null;

  // mm:ss or h:mm:ss
  const colon = str.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})$/);
  if (colon) {
    const [, h, m, s] = colon.map((v) => (v ? Number(v) : 0));
    return (h || 0) * 3600000 + m * 60000 + s * 1000;
  }

  // Compound like 1h30m / 2d4h
  const compound = str.match(/^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (compound && /[dhms]/.test(str)) {
    const [, d, h, m, s] = compound.map((v) => (v ? Number(v) : 0));
    const total = (d || 0) * 86400000 + (h || 0) * 3600000 + (m || 0) * 60000 + (s || 0) * 1000;
    return total > 0 ? total : null;
  }

  const single = str.match(/^(\d+)([dhms]?)$/);
  if (single) {
    const value = Number(single[1]);
    const unit = single[2] || defaultUnit;
    const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
    return value * multipliers[unit];
  }
  return null;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function truncate(str, max = 100) {
  if (!str) return "";
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function timeAgo(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function durationToHuman(ms) {
  if (ms <= 0) return "now";
  const units = [
    ["d", 86400000],
    ["h", 3600000],
    ["m", 60000],
    ["s", 1000],
  ];
  let out = "";
  let remaining = ms;
  for (const [suffix, size] of units) {
    const value = Math.floor(remaining / size);
    if (value > 0) {
      out += `${value}${suffix} `;
      remaining -= value * size;
    }
    if (out.length > 0 && size <= 60000) break;
  }
  return out.trim() || "now";
}

function timestamp(discordTimestamp, style = "R") {
  return `<t:${Math.floor(discordTimestamp / 1000)}:${style}>`;
}

function isUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = {
  formatDuration,
  formatNumber,
  formatFull,
  progressBar,
  parseDuration,
  randomInt,
  randomItem,
  shuffleArray,
  truncate,
  timeAgo,
  durationToHuman,
  timestamp,
  isUrl,
};
