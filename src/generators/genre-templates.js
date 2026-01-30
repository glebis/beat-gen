/**
 * Genre-Specific Pattern Generators
 */

import {
  createPattern,
  fourOnFloor,
  backbeat,
  offbeat,
  eightNotes,
  sixteenNotes,
  randomRange,
  randomChoice,
  addGhostNotes,
} from './pattern-generator.js';

// ============================================================================
// House (120-130 BPM)
// ============================================================================

export function generateHouse(variation = 'main') {
  const resolution = 16;

  const kick = fourOnFloor(resolution);
  const snare = backbeat(resolution);
  const closedHat = offbeat(resolution, 75);
  const openHat = [{ step: 8, velocity: 90 }];

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
    { name: 'open-hat', midiNote: 46, pattern: openHat }
  ];

  return createPattern({
    name: 'Four-on-Floor House',
    genre: 'house',
    style: 'four-on-floor',
    suggestedBPM: 120,
    bpmRange: [115, 130],
    resolution,
    tags: ['house', '4x4', 'dance']
  }, tracks);
}

// ============================================================================
// Techno (128-140 BPM)
// ============================================================================

export function generateTechno(variation = 'main') {
  const resolution = 16;

  const kick = fourOnFloor(resolution);
  const clap = backbeat(resolution).map(n => ({ ...n, velocity: 100 }));
  const closedHat = sixteenNotes(resolution, 65);
  const rim = [
    { step: 3, velocity: 80 },
    { step: 7, velocity: 70 },
    { step: 11, velocity: 75 },
    { step: 15, velocity: 85 }
  ];

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'clap', midiNote: 39, pattern: clap },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
    { name: 'rim', midiNote: 37, pattern: rim }
  ];

  return createPattern({
    name: 'Techno Beat',
    genre: 'techno',
    style: 'minimal',
    suggestedBPM: 128,
    bpmRange: [125, 140],
    resolution,
    tags: ['techno', 'minimal', 'industrial']
  }, tracks);
}

// ============================================================================
// Drum & Bass (160-180 BPM)
// ============================================================================

export function generateDnB(style = 'amen') {
  const resolution = 64; // Higher resolution for fast patterns

  let kick, snare;

  if (style === 'amen') {
    // Simplified Amen break
    kick = [
      { step: 0, velocity: 127 },
      { step: 12, velocity: 110 },
      { step: 32, velocity: 127 },
      { step: 42, velocity: 100 }
    ];

    snare = [
      { step: 8, velocity: 115 },
      { step: 18, velocity: 90 },
      { step: 24, velocity: 127 },
      { step: 40, velocity: 120 },
      { step: 50, velocity: 95 },
      { step: 56, velocity: 127 }
    ];
  } else {
    // Two-step
    kick = [
      { step: 0, velocity: 127 },
      { step: 32, velocity: 127 }
    ];

    snare = [
      { step: 16, velocity: 120 },
      { step: 48, velocity: 120 }
    ];
  }

  const closedHat = eightNotes(resolution, 70);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat }
  ];

  return createPattern({
    name: `Drum & Bass ${style}`,
    genre: 'dnb',
    style,
    suggestedBPM: 170,
    bpmRange: [160, 180],
    resolution,
    tags: ['dnb', 'jungle', style]
  }, tracks);
}

// ============================================================================
// Breakbeat (120-140 BPM)
// ============================================================================

export function generateBreakbeat(type = 'funky') {
  const resolution = 32;

  const kick = [
    { step: 0, velocity: 127 },
    { step: 10, velocity: 100 },
    { step: 16, velocity: 127 },
    { step: 26, velocity: 90 }
  ];

  const snare = [
    { step: 8, velocity: 120 },
    { step: 14, velocity: 80 },
    { step: 24, velocity: 127 },
    { step: 30, velocity: 85 }
  ];

  const closedHat = [];
  for (let i = 0; i < resolution; i += 2) {
    closedHat.push({ step: i, velocity: randomRange(65, 80) });
  }

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat }
  ];

  return createPattern({
    name: `Breakbeat ${type}`,
    genre: 'breakbeat',
    style: type,
    suggestedBPM: 130,
    bpmRange: [120, 140],
    resolution,
    tags: ['breakbeat', 'breaks', type]
  }, tracks);
}

// ============================================================================
// UK Garage (130-140 BPM)
// ============================================================================

export function generateUKGarage() {
  const resolution = 32;

  // Syncopated kicks
  const kick = [
    { step: 0, velocity: 127 },
    { step: 6, velocity: 100 },
    { step: 16, velocity: 127 },
    { step: 22, velocity: 95 }
  ];

  // Ghost snares
  const snare = [
    { step: 8, velocity: 120 },
    { step: 11, velocity: 65 },
    { step: 24, velocity: 120 },
    { step: 27, velocity: 70 }
  ];

  // Shuffled hats
  const closedHat = [];
  for (let i = 0; i < resolution; i += 3) {
    closedHat.push({ step: i, velocity: randomRange(70, 85) });
  }

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat }
  ];

  return createPattern({
    name: 'UK Garage',
    genre: 'uk-garage',
    style: 'shuffled',
    suggestedBPM: 135,
    bpmRange: [130, 140],
    resolution,
    tags: ['uk-garage', '2-step', 'garage']
  }, tracks);
}

// ============================================================================
// IDM/Glitch (variable)
// ============================================================================

export function generateIDM() {
  const resolution = 32;

  // Irregular kick pattern
  const kick = [];
  let step = 0;
  while (step < resolution) {
    kick.push({ step, velocity: randomRange(100, 127) });
    step += randomChoice([3, 4, 5, 6, 7]);
  }

  // Polyrhythmic snare (5/4 feel)
  const snare = [];
  for (let i = 0; i < resolution; i += 6) {
    if (i + 1 < resolution) snare.push({ step: i + 1, velocity: randomRange(90, 120) });
  }

  // Glitchy hats
  const closedHat = addGhostNotes([], resolution, 0.3);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat }
  ];

  return createPattern({
    name: 'IDM Glitch',
    genre: 'idm',
    style: 'glitch',
    suggestedBPM: 140,
    bpmRange: [100, 180],
    intensity: 'high',
    complexity: 'complex',
    resolution,
    tags: ['idm', 'glitch', 'experimental']
  }, tracks);
}

// ============================================================================
// Trip-Hop (70-95 BPM)
// ============================================================================

export function generateTripHop() {
  const resolution = 16;

  // Sparse, heavy kicks
  const kick = [
    { step: 0, velocity: 127 },
    { step: 11, velocity: 100 }
  ];

  // Broken snare
  const snare = [
    { step: 5, velocity: 110 },
    { step: 8, velocity: 90 },
    { step: 13, velocity: 115 }
  ];

  // Minimal hats
  const closedHat = [
    { step: 4, velocity: 70 },
    { step: 12, velocity: 65 }
  ];

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat }
  ];

  return createPattern({
    name: 'Trip-Hop',
    genre: 'trip-hop',
    style: 'broken',
    suggestedBPM: 85,
    bpmRange: [70, 95],
    intensity: 'low',
    resolution,
    tags: ['trip-hop', 'downtempo', 'broken-beat']
  }, tracks);
}

// ============================================================================
// Ostinato (variable)
// ============================================================================

export function generateOstinato(polyrhythm = '3:4') {
  const resolution = 16;
  const [a, b] = polyrhythm.split(':').map(Number);

  // Create polyrhythmic pattern
  const kick = [];
  for (let i = 0; i < resolution; i += b) {
    kick.push({ step: i, velocity: 127 });
  }

  const snare = [];
  for (let i = 0; i < resolution; i += a) {
    snare.push({ step: i, velocity: 110 });
  }

  const closedHat = eightNotes(resolution, 75);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat }
  ];

  return createPattern({
    name: `Ostinato ${polyrhythm}`,
    genre: 'ostinato',
    style: `polyrhythm-${polyrhythm}`,
    suggestedBPM: 120,
    bpmRange: [80, 160],
    complexity: 'complex',
    resolution,
    tags: ['ostinato', 'polyrhythm', polyrhythm]
  }, tracks);
}

// ============================================================================
// Export genre generators
// ============================================================================

export const GENRE_GENERATORS = {
  house: generateHouse,
  techno: generateTechno,
  dnb: generateDnB,
  breakbeat: generateBreakbeat,
  'uk-garage': generateUKGarage,
  idm: generateIDM,
  'trip-hop': generateTripHop,
  ostinato: generateOstinato
};

export const GENRE_VARIATIONS = {
  house: ['main'],
  techno: ['main'],
  dnb: ['amen', 'two-step'],
  breakbeat: ['funky', 'amen'],
  'uk-garage': ['main'],
  idm: ['main'],
  'trip-hop': ['main'],
  ostinato: ['3:4', '5:4', '7:8']
};
