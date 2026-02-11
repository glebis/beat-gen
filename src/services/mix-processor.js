import fs from 'fs/promises';
import path from 'path';

// ── Built-in presets ────────────────────────────────────────────────

const PRESETS = {
  clean: {
    tracks: {
      'closed-hat': { gain: -5, highpass: 300, lowpass: null, compressor: null },
      'open-hat':   { gain: -6, highpass: 300, lowpass: null, compressor: null },
      'ride':       { gain: -4, highpass: 400, lowpass: null, compressor: null },
      'crash':      { gain: -5, highpass: 300, lowpass: null, compressor: null },
      'bass':       { gain: 0,  highpass: null, lowpass: 800,  compressor: null },
      'lead':       { gain: -2, highpass: 200,  lowpass: null, compressor: null },
      'pad':        { gain: -4, highpass: 100,  lowpass: 8000, compressor: null },
    },
    master: { gain: 0, compressor: null, reverb: null, delay: null },
  },

  compressed: {
    tracks: {
      'closed-hat': { gain: -5, highpass: 300, lowpass: null, compressor: null },
      'open-hat':   { gain: -5, highpass: 300, lowpass: null, compressor: null },
      'ride':       { gain: -4, highpass: 400, lowpass: null, compressor: null },
      'crash':      { gain: -5, highpass: 300, lowpass: null, compressor: null },
      'bass':       { gain: 1,  highpass: null, lowpass: 800,  compressor: { threshold: -15, ratio: 3, attack: 20, release: 100, makeup: 2 } },
      'lead':       { gain: -1, highpass: 200,  lowpass: null, compressor: null },
      'pad':        { gain: -4, highpass: 100,  lowpass: 8000, compressor: null },
    },
    master: {
      gain: 0,
      compressor: { threshold: -12, ratio: 4, attack: 10, release: 200, makeup: 4 },
      reverb: null,
      delay: null,
    },
  },

  dub: {
    tracks: {
      'kick':       { gain: 3,  highpass: null, lowpass: null, compressor: null },
      'closed-hat': { gain: -6, highpass: 400,  lowpass: null, compressor: null },
      'open-hat':   { gain: -6, highpass: 400,  lowpass: null, compressor: null },
      'ride':       { gain: -5, highpass: 400,  lowpass: null, compressor: null },
      'crash':      { gain: -5, highpass: 400,  lowpass: null, compressor: null },
      'snare':      { gain: 0,  highpass: null,  lowpass: null, compressor: null },
      'bass':       { gain: 2,  highpass: null, lowpass: 600,  compressor: null },
      'lead':       { gain: -3, highpass: 300,  lowpass: null, compressor: null },
      'pad':        { gain: -5, highpass: 200,  lowpass: 6000, compressor: null },
    },
    master: {
      gain: 0,
      compressor: { threshold: -12, ratio: 4, attack: 10, release: 200, makeup: 4 },
      reverb: { delays: '40|53', decays: '0.4|0.3', wet: 0.2 },
      delay: { time: 375, decay: 0.5, wet: 0.3 },
    },
  },
};

// ── Default track config (no processing) ────────────────────────────

const DEFAULT_TRACK = { gain: 0, highpass: null, lowpass: null, compressor: null };
const DEFAULT_MASTER = { gain: 0, compressor: null, reverb: null, delay: null };

// ── Public API ──────────────────────────────────────────────────────

/**
 * Load mix config from preset name, file path, or return default
 */
export async function loadMixConfig(source) {
  if (!source) return null;

  // Check if it's a preset name
  if (PRESETS[source]) {
    return validateMixConfig(structuredClone(PRESETS[source]));
  }

  // Try loading as file path
  try {
    const content = await fs.readFile(source, 'utf-8');
    const config = JSON.parse(content);
    return validateMixConfig(config);
  } catch (err) {
    throw new Error(`Cannot load mix config "${source}": ${err.message}`);
  }
}

/**
 * List available preset names
 */
export function listPresets() {
  return Object.keys(PRESETS);
}

/**
 * Build the full ffmpeg filter_complex string using bus-based pipeline
 *
 * Phase 1: Per-event delay + velocity volume (same as existing)
 * Phase 2: Group events into track buses via amix
 * Phase 3: Per-track inserts (gain, EQ, compressor)
 * Phase 4: Mix track buses to master
 * Phase 5: Master inserts (compressor, reverb send, delay send)
 */
export function buildBusFilter(events, duration, mixConfig) {
  const filters = [];
  const config = validateMixConfig(mixConfig);

  // ── Phase 1: Per-event delay + velocity ──
  events.forEach((event, i) => {
    const delayMs = Math.round(event.time * 1000);
    const volumeDb = velocityToDb(event.velocity);
    filters.push(
      `[${i}:a]adelay=${delayMs}|${delayMs},apad=whole_dur=${duration},volume=${volumeDb}dB[ev${i}]`
    );
  });

  // ── Phase 2: Group into track buses ──
  const trackGroups = groupByTrack(events);
  const trackNames = Object.keys(trackGroups);
  const busLabels = [];

  for (const trackName of trackNames) {
    const indices = trackGroups[trackName];
    const busLabel = `bus_${sanitizeLabel(trackName)}`;

    if (indices.length === 1) {
      // Single event -- just rename the label
      filters.push(`[ev${indices[0]}]acopy[${busLabel}]`);
    } else {
      const inputs = indices.map(i => `[ev${i}]`).join('');
      filters.push(
        `${inputs}amix=inputs=${indices.length}:duration=first:normalize=0[${busLabel}]`
      );
    }
    busLabels.push({ name: trackName, label: busLabel });
  }

  // ── Phase 3: Per-track inserts ──
  const processedBusLabels = [];
  for (const { name, label } of busLabels) {
    const trackConfig = config.tracks[name] || DEFAULT_TRACK;
    const outLabel = `trk_${sanitizeLabel(name)}`;
    const chain = buildTrackInserts(trackConfig);

    if (chain.length > 0) {
      filters.push(`[${label}]${chain.join(',')}[${outLabel}]`);
    } else {
      filters.push(`[${label}]acopy[${outLabel}]`);
    }
    processedBusLabels.push(outLabel);
  }

  // ── Phase 4: Mix track buses to master ──
  const masterLabel = 'master';
  if (processedBusLabels.length === 1) {
    filters.push(`[${processedBusLabels[0]}]acopy[${masterLabel}]`);
  } else {
    const busInputs = processedBusLabels.map(l => `[${l}]`).join('');
    filters.push(
      `${busInputs}amix=inputs=${processedBusLabels.length}:duration=first:normalize=0[${masterLabel}]`
    );
  }

  // ── Phase 5: Master inserts ──
  buildMasterChain(filters, masterLabel, config.master || DEFAULT_MASTER);

  return filters;
}

// ── Internal helpers ────────────────────────────────────────────────

/**
 * Build per-track filter chain: volume -> highpass -> lowpass -> compressor
 */
function buildTrackInserts(trackConfig) {
  const chain = [];

  if (trackConfig.gain && trackConfig.gain !== 0) {
    chain.push(`volume=${trackConfig.gain}dB`);
  }
  if (trackConfig.highpass) {
    chain.push(`highpass=f=${trackConfig.highpass}`);
  }
  if (trackConfig.lowpass) {
    chain.push(`lowpass=f=${trackConfig.lowpass}`);
  }
  if (trackConfig.compressor) {
    const c = trackConfig.compressor;
    const parts = [];
    if (c.threshold != null) parts.push(`threshold=${c.threshold}dB`);
    if (c.ratio != null) parts.push(`ratio=${c.ratio}`);
    if (c.attack != null) parts.push(`attack=${c.attack}`);
    if (c.release != null) parts.push(`release=${c.release}`);
    if (c.makeup != null) parts.push(`makeup=${c.makeup}dB`);
    chain.push(`acompressor=${parts.join(':')}`);
  }

  return chain;
}

/**
 * Build master chain with optional compressor, reverb send, delay send
 * Appends filters and produces [out] label
 */
function buildMasterChain(filters, inputLabel, masterConfig) {
  let currentLabel = inputLabel;

  // Master gain
  if (masterConfig.gain && masterConfig.gain !== 0) {
    const newLabel = 'mgain';
    filters.push(`[${currentLabel}]volume=${masterConfig.gain}dB[${newLabel}]`);
    currentLabel = newLabel;
  }

  // Master compressor (in series)
  if (masterConfig.compressor) {
    const c = masterConfig.compressor;
    const parts = [];
    if (c.threshold != null) parts.push(`threshold=${c.threshold}dB`);
    if (c.ratio != null) parts.push(`ratio=${c.ratio}`);
    if (c.attack != null) parts.push(`attack=${c.attack}`);
    if (c.release != null) parts.push(`release=${c.release}`);
    if (c.makeup != null) parts.push(`makeup=${c.makeup}dB`);
    const newLabel = 'mcomp';
    filters.push(`[${currentLabel}]acompressor=${parts.join(':')}[${newLabel}]`);
    currentLabel = newLabel;
  }

  // Reverb and/or delay as parallel sends
  const hasReverb = masterConfig.reverb != null;
  const hasDelay = masterConfig.delay != null;

  if (hasReverb || hasDelay) {
    const splitCount = 1 + (hasReverb ? 1 : 0) + (hasDelay ? 1 : 0);
    const splitLabels = ['mdry'];
    if (hasReverb) splitLabels.push('rev_in');
    if (hasDelay) splitLabels.push('del_in');
    const splitOut = splitLabels.map(l => `[${l}]`).join('');
    filters.push(`[${currentLabel}]asplit=${splitCount}${splitOut}`);

    const mixInputs = ['[mdry]'];

    if (hasReverb) {
      const r = masterConfig.reverb;
      const wetDb = ratioToDb(r.wet || 0.2);
      filters.push(
        `[rev_in]aecho=0.8:0.7:${r.delays}:${r.decays},volume=${wetDb}dB[reverb]`
      );
      mixInputs.push('[reverb]');
    }

    if (hasDelay) {
      const d = masterConfig.delay;
      const wetDb = ratioToDb(d.wet || 0.15);
      filters.push(
        `[del_in]aecho=0.8:0.5:${d.time}:${d.decay},volume=${wetDb}dB[delay]`
      );
      mixInputs.push('[delay]');
    }

    filters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:normalize=0[out]`);
  } else {
    // No sends -- just rename to [out]
    filters.push(`[${currentLabel}]acopy[out]`);
  }
}

/**
 * Validate and fill defaults in mix config
 */
function validateMixConfig(config) {
  if (!config) return { tracks: {}, master: { ...DEFAULT_MASTER } };

  const result = {
    tracks: {},
    master: { ...DEFAULT_MASTER, ...(config.master || {}) },
  };

  // Validate tracks
  if (config.tracks) {
    for (const [name, tc] of Object.entries(config.tracks)) {
      result.tracks[name] = {
        gain: clamp(tc.gain ?? 0, -60, 24),
        highpass: tc.highpass != null ? clamp(tc.highpass, 20, 20000) : null,
        lowpass: tc.lowpass != null ? clamp(tc.lowpass, 20, 20000) : null,
        compressor: tc.compressor || null,
      };
    }
  }

  // Validate master
  result.master.gain = clamp(result.master.gain ?? 0, -60, 24);

  if (result.master.compressor) {
    const c = result.master.compressor;
    c.threshold = clamp(c.threshold ?? -12, -60, 0);
    c.ratio = clamp(c.ratio ?? 4, 1, 20);
    c.attack = clamp(c.attack ?? 10, 0.01, 2000);
    c.release = clamp(c.release ?? 200, 0.01, 9000);
    c.makeup = clamp(c.makeup ?? 0, 0, 64);
  }

  return result;
}

/**
 * Group event indices by trackName
 */
function groupByTrack(events) {
  const groups = {};
  events.forEach((event, i) => {
    const name = event.trackName;
    if (!groups[name]) groups[name] = [];
    groups[name].push(i);
  });
  return groups;
}

/**
 * Sanitize track name for use as ffmpeg label
 */
function sanitizeLabel(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Convert velocity (0-1) to dB
 */
function velocityToDb(velocity) {
  if (velocity <= 0) return -60;
  if (velocity >= 1) return 0;
  return 20 * Math.log10(velocity);
}

/**
 * Convert wet ratio (0-1) to dB
 */
function ratioToDb(ratio) {
  if (ratio <= 0) return -60;
  if (ratio >= 1) return 0;
  return 20 * Math.log10(ratio);
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}
