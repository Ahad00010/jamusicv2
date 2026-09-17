/**
 * Audio filter definitions for moonlink.js v5 (Lavalink v4 filter objects).
 * Applied with player.filters.reset() -> Object.assign(player.filters, def) -> apply().
 * Active filter names are stored on the player via player.set("active_filters", []).
 */

const FILTERS = {
  Bassboost: {
    equalizer: [
      { band: 0, gain: 0.6 },
      { band: 1, gain: 0.55 },
      { band: 2, gain: 0.45 },
      { band: 3, gain: 0.3 },
      { band: 4, gain: 0.15 },
    ],
  },
  "Hyper Bass": {
    equalizer: [
      { band: 0, gain: 1.0 },
      { band: 1, gain: 0.9 },
      { band: 2, gain: 0.7 },
      { band: 3, gain: 0.4 },
      { band: 4, gain: 0.2 },
    ],
  },
  Nightcore: { timescale: { speed: 1.12, pitch: 1.14, rate: 1 } },
  Vaporwave: { timescale: { speed: 0.85, pitch: 0.95, rate: 1 } },
  Daycore: { timescale: { speed: 0.8, pitch: 0.85, rate: 1 } },
  Chipmunk: { timescale: { speed: 1.5, pitch: 1.6, rate: 1 } },
  Darthvader: { timescale: { speed: 0.9, pitch: 0.6, rate: 1 } },
  "8D": { rotation: { hz: 0.2, depth: 0.6 } },
  Karaoke: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220, filterWidth: 100 } },
  Tremolo: { tremolo: { frequency: 4, depth: 0.75 } },
  Vibrato: { vibrato: { frequency: 6, depth: 0.45 } },
  Distortion: {
    distortion: {
      sinOffset: 0.2,
      sinScale: 0.2,
      cosOffset: 0.2,
      cosScale: 0.2,
      tanOffset: 0.05,
      tanScale: 0.05,
      offset: 0.2,
      scale: 0.2,
    },
  },
  Underwater: { lowPass: { smoothing: 25 } },
  Television: { timescale: { speed: 1.05, pitch: 1.2, rate: 1 }, tremolo: { frequency: 4, depth: 0.4 } },
  Soft: { lowPass: { smoothing: 10 } },
  Pop: {
    equalizer: [
      { band: 0, gain: -0.1 },
      { band: 1, gain: 0.1 },
      { band: 2, gain: 0.15 },
      { band: 4, gain: 0.2 },
      { band: 8, gain: 0.1 },
    ],
  },
  Classical: {
    equalizer: [
      { band: 6, gain: -0.25 },
      { band: 7, gain: -0.25 },
      { band: 8, gain: -0.25 },
    ],
  },
  Dance: {
    equalizer: [
      { band: 0, gain: 0.5 },
      { band: 1, gain: 0.25 },
      { band: 10, gain: 0.25 },
      { band: 11, gain: 0.5 },
    ],
  },
  Electronic: {
    equalizer: [
      { band: 1, gain: 0.3 },
      { band: 2, gain: 0.25 },
      { band: 5, gain: -0.15 },
      { band: 9, gain: 0.2 },
      { band: 10, gain: 0.25 },
    ],
  },
  Rock: {
    equalizer: [
      { band: 2, gain: 0.25 },
      { band: 3, gain: 0.2 },
      { band: 5, gain: -0.15 },
      { band: 8, gain: 0.2 },
      { band: 9, gain: 0.2 },
    ],
  },
  Jazz: {
    equalizer: [
      { band: 1, gain: 0.2 },
      { band: 2, gain: 0.15 },
      { band: 5, gain: -0.1 },
      { band: 8, gain: 0.1 },
    ],
  },
  Metal: {
    equalizer: [
      { band: 1, gain: 0.35 },
      { band: 2, gain: 0.3 },
      { band: 4, gain: 0.15 },
      { band: 6, gain: -0.1 },
      { band: 10, gain: 0.2 },
    ],
  },
};

const FILTER_NAMES = Object.keys(FILTERS);

/** Applies a list of filter names to a player (replaces current filters). */
async function setFilters(player, names = []) {
  try {
    player.filters.reset();
  } catch {
    /* node may be offline */
  }
  const applied = [];
  for (const name of names) {
    const definition = FILTERS[name];
    if (!definition) continue;
    Object.assign(player.filters, definition);
    applied.push(name);
  }
  player.set("active_filters", applied);
  if (applied.length) await player.filters.apply();
  return applied;
}

function getActiveFilters(player) {
  return player.get("active_filters") || [];
}

module.exports = { FILTERS, FILTER_NAMES, setFilters, getActiveFilters };
