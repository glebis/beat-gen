/**
 * Texture Generator - Pattern generators for non-melodic/textural tracks
 * vocalChop, noise, scratch, texture, atmosphere, stab
 */

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
// Track generators
// ============================================================================

/**
 * Generate a texture track pattern
 * @param {string} trackName - One of: vocalChop, noise, scratch, texture, atmosphere, stab
 * @param {Object} opts
 * @param {number} opts.resolution - Steps per bar
 * @param {string} opts.sectionName - Current section name
 * @param {number} opts.energy - Section energy 0-1
 * @param {number} [opts.density=0.5] - Global density control 0-1
 * @param {number} [opts.seed]
 * @returns {Object} Track object
 */
export function generateTexture(trackName, opts) {
  const { resolution, sectionName, energy, seed } = opts;
  const density = opts.density ?? 0.5;
  const rng = createRng(seed);

  const inst = GM_INSTRUMENTS[trackName];
  if (!inst) throw new Error(`Unknown texture instrument: ${trackName}`);

  let pattern;
  switch (trackName) {
    case 'vocalChop':
      pattern = generateVocalChop(resolution, energy, density, rng);
      break;
    case 'noise':
      pattern = generateNoise(resolution, sectionName, energy, density, rng);
      break;
    case 'scratch':
      pattern = generateScratch(resolution, energy, density, rng);
      break;
    case 'texture':
      pattern = generateTexturePattern(resolution, energy, density, rng);
      break;
    case 'atmosphere':
      pattern = generateAtmosphere(resolution, energy, rng);
      break;
    case 'stab':
      pattern = generateStab(resolution, energy, density, rng);
      break;
    default:
      pattern = [];
  }

  return {
    name: trackName,
    midiNote: inst.referencePitch,
    channel: inst.channel,
    instrument: inst.program,
    pattern,
  };
}

// ============================================================================
// Individual generators
// ============================================================================

/**
 * Vocal chop: short pitched notes, syncopated rhythm (chorus-heavy)
 */
function generateVocalChop(resolution, energy, density, rng) {
  const pattern = [];
  const notesPerBar = Math.max(1, Math.round(energy * density * 6));

  for (let i = 0; i < notesPerBar; i++) {
    const step = Math.floor(rng() * resolution);
    const pitchOffset = Math.floor(rng() * 5) - 2; // -2 to +2 semitones
    pattern.push({
      step,
      velocity: 70 + Math.floor(rng() * 40 * energy),
      pitch: 60 + pitchOffset,
      duration: 1 + Math.floor(rng() * 2),
    });
  }

  // Deduplicate steps
  return dedup(pattern);
}

/**
 * Noise: 1-2 long notes per section, risers before drops
 */
function generateNoise(resolution, sectionName, energy, density, rng) {
  const pattern = [];
  const isBuild = sectionName === 'build' || sectionName.includes('build');

  if (isBuild) {
    // Rising sweep: single long note spanning most of bar
    pattern.push({
      step: 0,
      velocity: 60 + Math.floor(energy * 60),
      pitch: 60,
      duration: Math.floor(resolution * 0.8),
    });
  } else {
    // Sparse texture: 1-2 long notes
    const count = density > 0.5 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const step = Math.floor(rng() * (resolution / 2)) + (i * Math.floor(resolution / 2));
      pattern.push({
        step,
        velocity: 40 + Math.floor(rng() * 30),
        pitch: 60,
        duration: 8 + Math.floor(rng() * 8),
      });
    }
  }

  return pattern;
}

/**
 * Scratch: rapid 1-step bursts with pitch variation, 2-4 per bar
 */
function generateScratch(resolution, energy, density, rng) {
  const pattern = [];
  const count = 2 + Math.floor(energy * density * 3);

  for (let i = 0; i < count; i++) {
    const step = Math.floor(rng() * resolution);
    const pitchOffset = Math.floor(rng() * 10) - 5; // +/- 5 semitones
    pattern.push({
      step,
      velocity: 80 + Math.floor(rng() * 40),
      pitch: 60 + pitchOffset,
      duration: 1,
    });
  }

  return dedup(pattern);
}

/**
 * Texture: single long note per bar, low velocity background
 */
function generateTexturePattern(resolution, energy, density, rng) {
  const step = Math.floor(rng() * 4); // Start near beginning
  return [{
    step,
    velocity: 35 + Math.floor(energy * 30),
    pitch: 60 + Math.floor(rng() * 3) - 1,
    duration: resolution - step,
  }];
}

/**
 * Atmosphere: drone -- one note spanning the entire section
 */
function generateAtmosphere(resolution, energy, rng) {
  return [{
    step: 0,
    velocity: 30 + Math.floor(energy * 35),
    pitch: 60,
    duration: resolution,
  }];
}

/**
 * Stab: chord hits on specific beats (beat 2, "and" of 3)
 */
function generateStab(resolution, energy, density, rng) {
  const pattern = [];
  const beatLen = resolution / 4;

  // Beat 2
  pattern.push({
    step: Math.floor(beatLen),
    velocity: 85 + Math.floor(energy * 30),
    pitch: 60,
    duration: 1 + Math.floor(rng() * 2),
  });

  // "And" of 3 (if density allows)
  if (density > 0.3 || energy > 0.7) {
    const andOf3 = Math.floor(beatLen * 2 + beatLen / 2);
    pattern.push({
      step: andOf3,
      velocity: 75 + Math.floor(energy * 30),
      pitch: 60,
      duration: 1 + Math.floor(rng() * 2),
    });
  }

  return pattern;
}

// ============================================================================
// Helpers
// ============================================================================

/** Deduplicate pattern by step (keep highest velocity) */
function dedup(pattern) {
  const byStep = new Map();
  for (const note of pattern) {
    const existing = byStep.get(note.step);
    if (!existing || note.velocity > existing.velocity) {
      byStep.set(note.step, note);
    }
  }
  return [...byStep.values()].sort((a, b) => a.step - b.step);
}
