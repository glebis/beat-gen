/**
 * Melody Generator - Motif-based pitched melody/pad/arp patterns
 */

import { getScaleNotes, GENRE_PROGRESSIONS } from '../utils/music-theory.js';
import { GM_INSTRUMENTS } from '../utils/gm-instrument-map.js';

// ============================================================================
// Seeded random
// ============================================================================

function createRng(seed) {
  let s = seed || Math.floor(Math.random() * 2147483647);
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================================
// Melody profiles per genre
// ============================================================================

export const MELODY_PROFILES = {
  house:      { density: 'medium', range: 12, style: 'repetitive',  phraseLen: 4, motifLen: 3 },
  techno:     { density: 'sparse', range: 7,  style: 'staccato',    phraseLen: 2, motifLen: 2 },
  dnb:        { density: 'high',   range: 14, style: 'arpeggio',    phraseLen: 4, motifLen: 4 },
  breakbeat:  { density: 'medium', range: 12, style: 'syncopated',  phraseLen: 4, motifLen: 3 },
  'uk-garage':{ density: 'medium', range: 10, style: 'bouncy',      phraseLen: 4, motifLen: 3 },
  idm:        { density: 'high',   range: 24, style: 'glitch',      phraseLen: 2, motifLen: 2 },
  'trip-hop': { density: 'sparse', range: 12, style: 'legato',      phraseLen: 8, motifLen: 3 },
  ostinato:   { density: 'medium', range: 10, style: 'repetitive',  phraseLen: 4, motifLen: 4 },
  reggae:     { density: 'medium', range: 10, style: 'syncopated',  phraseLen: 4, motifLen: 3 },
};

/**
 * Generate a melody/pad/arp track
 * @param {Object} opts
 * @param {string} opts.genre
 * @param {string} opts.key
 * @param {string} opts.scale
 * @param {number} opts.resolution
 * @param {number} opts.tempo
 * @param {string} opts.instrument - 'lead', 'pad', 'arp'
 * @param {number[]} [opts.progression]
 * @param {number} [opts.seed]
 * @returns {Object} Track object with pitched pattern
 */
export function generateMelody(opts) {
  const { genre, key, scale, resolution, tempo, instrument, seed } = opts;
  const rng = createRng(seed);

  const baseProfile = MELODY_PROFILES[genre] || MELODY_PROFILES.house;
  // Allow numeric density override (0-1) from arrangement engine
  const profile = opts.density != null
    ? { ...baseProfile, density: opts.density <= 0.33 ? 'sparse' : opts.density >= 0.66 ? 'high' : 'medium' }
    : baseProfile;
  const inst = GM_INSTRUMENTS[instrument] || GM_INSTRUMENTS.lead;
  const isPad = instrument === 'pad';

  // Melody range: octave 3-5 for leads, 3-4 for pads
  const octLow = isPad ? 3 : 3;
  const octHigh = isPad ? 4 : 5;
  const scaleNotes = getScaleNotes(key, scale, octLow, octHigh);

  if (scaleNotes.length === 0) {
    return { name: instrument, midiNote: 60, channel: inst.channel, instrument: inst.program, pattern: [] };
  }

  // Generate motif
  const motifNotes = generateMotif(scaleNotes, profile, rng);

  // Build phrase using motif variations
  const pattern = isPad
    ? buildPadPattern(motifNotes, scaleNotes, resolution, profile, rng)
    : buildMelodyPattern(motifNotes, scaleNotes, resolution, profile, rng);

  return {
    name: instrument,
    midiNote: scaleNotes[0],
    channel: inst.channel,
    instrument: inst.program,
    pattern,
  };
}

// ============================================================================
// Motif generation
// ============================================================================

function generateMotif(scaleNotes, profile, rng) {
  const len = profile.motifLen;
  const motif = [];

  // Start near the middle of the range
  const midIdx = Math.floor(scaleNotes.length / 2);
  let currentIdx = midIdx + Math.floor(rng() * 3) - 1;
  currentIdx = Math.max(0, Math.min(scaleNotes.length - 1, currentIdx));

  for (let i = 0; i < len; i++) {
    motif.push(scaleNotes[currentIdx]);
    // Step by 1-3 scale degrees
    const step = Math.floor(rng() * 3) + 1;
    const direction = rng() > 0.5 ? 1 : -1;
    currentIdx += step * direction;
    currentIdx = Math.max(0, Math.min(scaleNotes.length - 1, currentIdx));
  }

  return motif;
}

// ============================================================================
// Motif transformations
// ============================================================================

function transposeMotif(motif, scaleNotes, steps) {
  return motif.map(note => {
    const idx = scaleNotes.indexOf(note);
    if (idx === -1) return note;
    const newIdx = Math.max(0, Math.min(scaleNotes.length - 1, idx + steps));
    return scaleNotes[newIdx];
  });
}

function invertMotif(motif, scaleNotes) {
  if (motif.length < 2) return motif;
  const pivot = motif[0];
  const pivotIdx = scaleNotes.indexOf(pivot);
  return motif.map(note => {
    const idx = scaleNotes.indexOf(note);
    if (idx === -1) return note;
    const diff = idx - pivotIdx;
    const newIdx = Math.max(0, Math.min(scaleNotes.length - 1, pivotIdx - diff));
    return scaleNotes[newIdx];
  });
}

function retrogradeMotif(motif) {
  return [...motif].reverse();
}

// ============================================================================
// Pattern builders
// ============================================================================

function buildMelodyPattern(motif, scaleNotes, resolution, profile, rng) {
  const pattern = [];
  const density = { sparse: 0.25, medium: 0.5, high: 0.75 }[profile.density] || 0.5;
  const phraseLen = profile.phraseLen;

  // Build A/A'/B structure
  const variations = [
    motif,                                           // A
    transposeMotif(motif, scaleNotes, 2),            // A' (transposed)
    invertMotif(motif, scaleNotes),                  // B (inverted)
    retrogradeMotif(motif),                          // A reversed
  ];

  let step = 0;
  const stepInterval = Math.max(1, Math.floor(resolution / (resolution * density)));

  for (let phrase = 0; phrase < 4 && step < resolution; phrase++) {
    const varMotif = variations[phrase % variations.length];

    for (let i = 0; i < varMotif.length && step < resolution; i++) {
      // Decide if this note plays (based on density)
      if (rng() < density || i === 0) {
        const dur = Math.max(1, Math.floor(rng() * 3) + 1);
        pattern.push({
          step,
          velocity: 80 + Math.floor(rng() * 40),
          pitch: varMotif[i],
          duration: dur,
        });
      }
      step += stepInterval;
    }
  }

  return pattern;
}

function buildPadPattern(motif, scaleNotes, resolution, profile, rng) {
  const pattern = [];
  const chordLen = Math.floor(resolution / 2); // 2 chords per bar

  for (let i = 0; i < 2 && i * chordLen < resolution; i++) {
    const step = i * chordLen;
    // Use motif notes as chord voicing (first 3 notes)
    const voicing = i === 0 ? motif.slice(0, 3) : transposeMotif(motif, scaleNotes, 2).slice(0, 3);
    for (const pitch of voicing) {
      pattern.push({
        step,
        velocity: 70 + Math.floor(rng() * 20),
        pitch,
        duration: chordLen,
      });
    }
  }

  return pattern;
}
