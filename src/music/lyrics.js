/**
 * LRCLIB lyrics client (https://lrclib.net).
 *
 * The bot queries LRCLIB directly instead of NodeLink's `/v4/loadlyrics` route:
 * LRCLIB is only one of NodeLink's many lyrics providers (its configured fallback
 * is Genius, so LRCLIB is never guaranteed), NodeLink does not surface the
 * `instrumental` flag, and a direct call needs no NodeLink config/binary changes.
 *
 * No new dependencies: Node's global fetch handles the requests and
 * AbortSignal.timeout() enforces the timeout.
 */

const config = require("../config");

const LRCLIB_BASE = "https://lrclib.net/api";
/** LRCLIB asks every client to identify itself with a descriptive User-Agent. */
const USER_AGENT = "JaMusicV2/2.0 (+https://github.com/Ahad00010/jamusicv2)";

/** key -> { expires, value } — avoids hammering LRCLIB on repeated button clicks. */
const CACHE = new Map();
const NEGATIVE_CACHE_MS = 5 * 60 * 1000;

const CLEAN_PATTERNS = [
  /\s*\([^)]*(?:official|lyrics?|video|audio|mv|visualizer|color\s*coded|hd|4k|prod\.)[^)]*\)/gi,
  /\s*\[[^\]]*(?:official|lyrics?|video|audio|mv|visualizer|color\s*coded|hd|4k|prod\.)[^\]]*\]/gi,
  /\s*-\s*Topic$/i,
  /VEVO$/i,
];
const FEAT_PATTERN = /\s*[([]\s*(?:ft\.?|feat\.?|featuring)\s+[^)\]]+[)\]]/gi;
const SEPARATORS = [" - ", " – ", " — "];
const TIME_TAG = /\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const WORD_TAG = /<\d+:\d{2}(?:[.:]\d{2,3})?>/g;
const METADATA_TAG = /^\[(ti|ar|al|by|length|re|ve|au|offset):/i;

/** Removes video/lyrics/marketing fragments from titles and artist names. */
function cleanMetadata(text, removeFeaturing = false) {
  let result = String(text || "");
  for (const pattern of CLEAN_PATTERNS) result = result.replace(pattern, "");
  if (removeFeaturing) result = result.replace(FEAT_PATTERN, "");
  return result.trim();
}

/** Splits a combined "Artist - Title" string into separate searchable parts. */
function parseTrackQuery(query) {
  const cleaned = cleanMetadata(query, true);
  for (const separator of SEPARATORS) {
    const index = cleaned.indexOf(separator);
    if (index > 0 && index < cleaned.length - separator.length) {
      const artist = cleaned.slice(0, index).trim();
      const title = cleaned.slice(index + separator.length).trim();
      if (artist && title) return { artist, title };
    }
  }
  return { artist: null, title: cleaned };
}

/** Reads the optional LRC `[offset:±ms]` tag (positive values shift lyrics earlier). */
function parseOffset(lrc) {
  const match = String(lrc || "").match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  return match ? Number(match[1]) || 0 : 0;
}

/**
 * Parses an LRC document into timed lines.
 * Handles `[mm:ss]`, `[mm:ss.x]`…`[mm:ss.xxx]`, `[mm:ss:cc]`, several tags on
 * one line, `<mm:ss.xx>` word tags and the `[offset:]` tag.
 */
function parseLrc(lrc) {
  const offset = parseOffset(lrc);
  const lines = [];

  for (const raw of String(lrc || "").split(/\r?\n/)) {
    if (METADATA_TAG.test(raw.trim())) continue;
    const stamps = [...raw.matchAll(TIME_TAG)];
    const text = raw.replace(TIME_TAG, "").replace(WORD_TAG, "").trim();
    if (!stamps.length) {
      if (text) lines.push({ time: null, text });
      continue;
    }
    if (!text) continue;
    for (const stamp of stamps) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      const fraction = stamp[3] ? Math.round(Number(`0.${stamp[3]}`) * 1000) : 0;
      const time = Math.max(0, minutes * 60000 + seconds * 1000 + fraction - offset);
      lines.push({ time, text });
    }
  }

  const timed = lines.filter((line) => line.time !== null);
  if (timed.length) {
    timed.sort((a, b) => a.time - b.time);
    return timed;
  }
  return lines;
}

/** Turns unsynced lyrics into untimed lines (LRCLIB's `plainLyrics`). */
function parsePlainLyrics(plain) {
  return String(plain || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ time: null, text }));
}

/** Lowercase/alphanumeric form used to compare LRCLIB results with the request. */
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Index of the line being sung at `positionMs`, or -1 for unsynced/unknown. */
function currentLineIndex(lines, positionMs) {
  let index = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time === null) continue;
    if (lines[i].time <= positionMs) index = i;
    else break;
  }
  return index;
}

/** Shape returned for "nothing usable found" (also the skeleton for errors). */
function emptyLyrics() {
  return {
    found: false,
    instrumental: false,
    synced: false,
    lines: [],
    name: "",
    artist: "",
    album: "",
    durationSec: null,
    provider: "LRCLIB",
  };
}

/** Converts one LRCLIB record into our lyrics payload, or null when it has no lyrics. */
function buildResult(item) {
  if (!item || typeof item !== "object") return null;

  const syncedLines = item.syncedLyrics ? parseLrc(item.syncedLyrics) : [];
  const synced = syncedLines.length > 0;
  const lines = synced ? syncedLines : parsePlainLyrics(item.plainLyrics);
  const instrumental = Boolean(item.instrumental) && lines.length === 0;
  if (!lines.length && !instrumental) return null;

  return {
    found: true,
    instrumental,
    synced,
    lines,
    name: item.trackName || item.name || "",
    artist: item.artistName || "",
    album: item.albumName || "",
    durationSec: Number.isFinite(Number(item.duration)) ? Math.round(Number(item.duration)) : null,
    provider: "LRCLIB",
  };
}

/** GETs an LRCLIB endpoint; returns null on 404 and throws on other failures. */
async function lrclibGet(pathname, timeoutMs) {
  const response = await fetch(`${LRCLIB_BASE}${pathname}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`LRCLIB responded ${response.status}`);
  return response.json();
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

/**
 * Scores LRCLIB search hits and returns the best usable match.
 * LRCLIB search is fuzzy — it happily returns unrelated uploads — so title,
 * artist and duration all get a vote here.
 */
function pickBestMatch(results, title, artist, durationSec) {
  const targetTitle = normalizeText(title);
  const targetArtist = normalizeText(artist);
  let best = null;
  let bestScore = -Infinity;

  for (const item of results) {
    if (!item || typeof item !== "object") continue;
    if (!item.syncedLyrics && !item.plainLyrics) continue;

    const itemTitle = normalizeText(item.trackName || item.name);
    const itemArtist = normalizeText(item.artistName);
    let score = 0;

    if (itemTitle && itemTitle === targetTitle) score += 6;
    else if (itemTitle && targetTitle && (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle))) score += 3;
    if (targetArtist && itemArtist === targetArtist) score += 4;
    else if (targetArtist && itemArtist && itemArtist.includes(targetArtist)) score += 2;
    if (item.syncedLyrics) score += 2;
    if (item.instrumental) score -= 5;

    const itemDuration = Number(item.duration);
    if (durationSec && Number.isFinite(itemDuration)) {
      const delta = Math.abs(itemDuration - durationSec);
      if (delta <= 3) score += 4;
      else if (delta <= 8) score += 2;
      else if (delta > 30) score -= 2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore > 0 ? best : null;
}

/** Exact `/get` lookup first (with, then without duration), fuzzy `/search` last. */
async function lookup(track, timeoutMs) {
  const parsed = parseTrackQuery(track.title);
  const artist = parsed.artist || cleanMetadata(track.author, false);
  const trackName = parsed.artist ? parsed.title : cleanMetadata(track.title, true);
  if (!trackName) return emptyLyrics();

  const durationSec = track.isStream ? null : Math.round((Number(track.duration) || 0) / 1000) || null;

  const exactQueries = [buildQuery({ artist_name: artist, track_name: trackName, duration: durationSec })];
  if (durationSec) exactQueries.push(buildQuery({ artist_name: artist, track_name: trackName }));

  for (const query of exactQueries) {
    const built = buildResult(await lrclibGet(`/get?${query}`, timeoutMs));
    if (built) return built;
  }

  const results = await lrclibGet(`/search?q=${encodeURIComponent(`${trackName} ${artist}`.trim())}`, timeoutMs);
  if (!Array.isArray(results)) return emptyLyrics();
  return buildResult(pickBestMatch(results, trackName, artist, durationSec)) || emptyLyrics();
}

function cacheKey(track) {
  if (track?.identifier) return `${track.sourceName || "unknown"}:${track.identifier}`;
  if (track?.uri) return track.uri;
  return `${track?.title || ""}|${track?.author || ""}`;
}

/**
 * Fetches (and caches) lyrics for a moonlink track / plain track-like object.
 * Misses are cached briefly too, so a song without lyrics is not re-queried
 * every time somebody clicks the button.
 *
 * @param track - Track-like object (`title`, `author`, `duration`, `identifier`, `isStream`).
 * @param options.force - Skip the cache read.
 * @returns Lyrics payload (`found: false` when LRCLIB has nothing).
 */
async function fetchLyrics(track, { force = false } = {}) {
  const key = cacheKey(track);
  if (!force) {
    const cached = CACHE.get(key);
    if (cached && cached.expires > Date.now()) return { ...cached.value, cached: true };
  }

  const result = await lookup(track || {}, config.music.lyricsTimeoutMs);
  const ttl = result.found ? config.music.lyricsCacheMs : NEGATIVE_CACHE_MS;

  for (const [entryKey, entry] of CACHE) {
    if (entry.expires <= Date.now()) CACHE.delete(entryKey);
  }
  CACHE.set(key, { expires: Date.now() + ttl, value: result });

  return { ...result, cached: false };
}

/**
 * Status-flavoured wrapper for command/component handlers.
 * Never throws: network problems come back as `status: "error"`.
 *
 * @returns `{ status: "ok" | "instrumental" | "notfound" | "error", ...lyrics, message? }`
 */
async function fetchLyricsFor(player, { force = false } = {}) {
  if (!player?.current) return { ...emptyLyrics(), status: "notfound" };
  try {
    const lyrics = await fetchLyrics(player.current, { force });
    if (!lyrics.found) return { ...lyrics, status: "notfound" };
    return { ...lyrics, status: lyrics.instrumental ? "instrumental" : "ok" };
  } catch (error) {
    return { ...emptyLyrics(), status: "error", message: error?.message || String(error) };
  }
}

module.exports = {
  fetchLyrics,
  fetchLyricsFor,
  parseLrc,
  parsePlainLyrics,
  parseTrackQuery,
  currentLineIndex,
  normalizeText,
};
