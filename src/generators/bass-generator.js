/**
 * Bass Generator - Genre-specific pitched bass patterns
 */

import { getScaleNotes, getChord, keyToSemitone, GENRE_PROGRESSIONS } from '../utils/music-theory.js';
import { GM_INSTRUMENTS } from '../utils/gm-instrument-map.js';

// ============================================================================
// Seeded random (for deterministic output)
// ============================================================================

function createRng(seed) {
  let s = seed || Math.floor(Math.random() * 2147483647);
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================================
// Bass modes per genre
// ============================================================================

export const BASS_MODES = {
  house:     { density: 'medium', style: 'octave-bounce', range: [36, 60] },
  techno:    { density: 'sparse', style: 'sub',           range: [24, 48] },
  dnb:       { density: 'high',   style: 'rolling',       range: [30, 54] },
  breakbeat: { density: 'medium', style: 'funky',         range: [30, 54] },
  'uk-garage':{ density: 'medium', style: 'bounce',       range: [30, 54] },
  idm:       { density: 'medium', style: 'chromatic',     range: [30, 54] },
  'trip-hop':{ density: 'sparse', style: 'deep',          range: [24, 48] },
  ostinato:  { density: 'medium', style: 'pulse',         range: [30, 54] },
  reggae:    { density: 'medium', style: 'walking',       range: [30, 54] },
};

/**
 * Generate a bass track
 * @param {Object} opts
 * @param {string} opts.genre
 * @param {string} opts.key - Root key (e.g. 'C')
 * @param {string} opts.scale - Scale name (e.g. 'minor')
 * @param {number} opts.resolution - Steps per bar (e.g. 16)
 * @param {number} opts.tempo
 * @param {number[]} [opts.progression] - Chord degrees (e.g. [1,4,5,1])
 * @param {number} [opts.seed]
 * @returns {Object} Track object with pitched pattern
 */
export function generateBass(opts) {
  const { genre, key, scale, resolution, tempo, seed } = opts;
  const rng = createRng(seed);

  const mode = BASS_MODES[genre] || BASS_MODES.house;
  const progression = opts.progression || pickProgression(genre, rng);
  const scaleNotes = getScaleNotes(key, scale, 1, 4);
  const bassNotes = scaleNotes.filter(n => n >= mode.range[0] && n <= mode.range[1]);
  const rootSemitone = keyToSemitone(key);

  const inst = GM_INSTRUMENTS.bass;
  const pattern = [];

  switch (mode.style) {
    case 'octave-bounce':
      generateOctaveBounce(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'sub':
      generateSub(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'rolling':
      generateRolling(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'walking':
      generateWalking(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'funky':
      generateFunky(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'bounce':
      generateBounce(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'chromatic':
      generateChromatic(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'deep':
      generateDeep(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    case 'pulse':
      generatePulse(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
      break;
    default:
      generateOctaveBounce(pattern, bassNotes, progression, key, scale, resolution, rootSemitone, rng);
  }

  return {
    name: 'bass',
    midiNote: bassNotes[0] || 36,
    channel: inst.channel,
    instrument: inst.program,
    pattern,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function pickProgression(genre, rng) {
  const progs = GENRE_PROGRESSIONS[genre] || [[1]];
  const idx = Math.floor(rng() * progs.length);
  return progs[idx];
}

function getRootForDegree(bassNotes, degree, key, scale, rootSemitone) {
  const chord = getChord(key, scale, degree);
  const targetSemitone = (rootSemitone + chord[0]) % 12;
  const matching = bassNotes.filter(n => n % 12 === targetSemitone);
  return matching.length > 0 ? matching[0] : bassNotes[0];
}

function getFifthForDegree(bassNotes, degree, key, scale, rootSemitone) {
  const chord = getChord(key, scale, degree);
  const targetSemitone = (rootSemitone + chord[2]) % 12;
  const matching = bassNotes.filter(n => n % 12 === targetSemitone);
  return matching.length > 0 ? matching[0] : bassNotes[0];
}

// ============================================================================
// Genre-specific bass generators
// ============================================================================

function generateOctaveBounce(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    const highRoot = rootNote + 12 <= 60 ? rootNote + 12 : rootNote;

    // Pattern: root on beat, octave on off-beat
    pattern.push({ step: offset, velocity: 110, pitch: rootNote, duration: 2 });
    if (offset + 2 < resolution) {
      pattern.push({ step: offset + 2, velocity: 90, pitch: highRoot, duration: 2 });
    }
    if (stepsPerChord > 4 && offset + 4 < resolution) {
      pattern.push({ step: offset + 4, velocity: 100, pitch: rootNote, duration: 2 });
    }
    if (stepsPerChord > 6 && offset + 6 < resolution) {
      pattern.push({ step: offset + 6, velocity: 85, pitch: highRoot, duration: 2 });
    }
  }
}

function generateSub(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    // Long sub notes on the beat
    pattern.push({ step: offset, velocity: 120, pitch: rootNote, duration: stepsPerChord });
  }
}

function generateRolling(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    const fifth = getFifthForDegree(bassNotes, progression[i], key, scale, root);

    // Fast rolling: root-fifth alternation
    for (let s = 0; s < stepsPerChord && offset + s < resolution; s += 2) {
      const pitch = s % 4 === 0 ? rootNote : fifth;
      const vel = 100 + Math.floor(rng() * 20);
      pattern.push({ step: offset + s, velocity: Math.min(vel, 127), pitch, duration: 2 });
    }
  }
}

function generateWalking(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    const fifth = getFifthForDegree(bassNotes, progression[i], key, scale, root);

    // Walking: root, step up, fifth, step down (beat 3 emphasis for reggae)
    const octave = rootNote + 12 <= 60 ? rootNote + 12 : rootNote;
    const beatLen = Math.floor(stepsPerChord / 4);
    if (beatLen > 0) {
      pattern.push({ step: offset, velocity: 100, pitch: rootNote, duration: beatLen });
      if (offset + beatLen < resolution)
        pattern.push({ step: offset + beatLen, velocity: 90, pitch: fifth, duration: beatLen });
      if (offset + beatLen * 2 < resolution)
        pattern.push({ step: offset + beatLen * 2, velocity: 110, pitch: octave, duration: beatLen });
      if (offset + beatLen * 3 < resolution)
        pattern.push({ step: offset + beatLen * 3, velocity: 85, pitch: fifth, duration: beatLen });
    }
  }
}

function generateFunky(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    const fifth = getFifthForDegree(bassNotes, progression[i], key, scale, root);

    // Syncopated funky pattern
    pattern.push({ step: offset, velocity: 110, pitch: rootNote, duration: 3 });
    if (offset + 3 < resolution)
      pattern.push({ step: offset + 3, velocity: 90, pitch: fifth, duration: 2 });
    if (offset + 6 < resolution)
      pattern.push({ step: offset + 6, velocity: 95, pitch: rootNote, duration: 2 });
  }
}

function generateBounce(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    const highRoot = rootNote + 12 <= 60 ? rootNote + 12 : rootNote;

    // Syncopated bounce (UK Garage feel)
    pattern.push({ step: offset, velocity: 105, pitch: rootNote, duration: 2 });
    if (offset + 3 < resolution)
      pattern.push({ step: offset + 3, velocity: 85, pitch: highRoot, duration: 1 });
    if (offset + 4 < resolution)
      pattern.push({ step: offset + 4, velocity: 95, pitch: rootNote, duration: 2 });
  }
}

function generateChromatic(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);

    // Irregular chromatic walks within the scale
    let current = rootNote;
    for (let s = 0; s < stepsPerChord && offset + s < resolution; s += 3) {
      const vel = 90 + Math.floor(rng() * 30);
      pattern.push({ step: offset + s, velocity: Math.min(vel, 127), pitch: current, duration: 2 });
      // Move to adjacent scale note
      const idx = bassNotes.indexOf(current);
      if (idx >= 0) {
        const direction = rng() > 0.5 ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(bassNotes.length - 1, idx + direction));
        current = bassNotes[nextIdx];
      }
    }
  }
}

function generateDeep(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    // Long, deep, sparse notes
    pattern.push({ step: offset, velocity: 100, pitch: rootNote, duration: stepsPerChord });
  }
}

function generatePulse(pattern, bassNotes, progression, key, scale, resolution, root, rng) {
  const stepsPerChord = Math.floor(resolution / progression.length);
  for (let i = 0; i < progression.length; i++) {
    const offset = i * stepsPerChord;
    const rootNote = getRootForDegree(bassNotes, progression[i], key, scale, root);
    // Repeated pulse on root
    for (let s = 0; s < stepsPerChord && offset + s < resolution; s += 4) {
      pattern.push({ step: offset + s, velocity: 105, pitch: rootNote, duration: 3 });
    }
  }
}
