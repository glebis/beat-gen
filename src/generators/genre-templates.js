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
  euclideanToSteps,
  createMeterGrid,
  polyrhythmPattern,
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
// Reggae (80-100 BPM)
// ============================================================================

export function generateReggae(style = 'one-drop') {
  const resolution = 16;

  let kick, snare, closedHat, openHat;

  if (style === 'one-drop') {
    // Classic one drop: kick + snare on beat 3 only
    kick = [{ step: 8, velocity: 127 }];
    snare = [{ step: 8, velocity: 115 }];
  } else if (style === 'rockers') {
    // Rockers: kick on every beat, snare on beat 3
    kick = fourOnFloor(resolution);
    snare = [{ step: 8, velocity: 115 }];
  } else {
    // Steppers: kick on every beat, snare on 2 & 4
    kick = fourOnFloor(resolution);
    snare = backbeat(resolution);
  }

  // Offbeat hi-hats -- the reggae skank
  closedHat = offbeat(resolution, 80);

  // Open hat on the "and" of beat 4 for lift
  openHat = [{ step: 14, velocity: 85 }];

  // Rim click on beats 2 and 4 (cross-stick)
  const rim = [
    { step: 4, velocity: 90 },
    { step: 12, velocity: 85 }
  ];

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
    { name: 'open-hat', midiNote: 46, pattern: openHat },
    { name: 'rim', midiNote: 37, pattern: rim }
  ];

  return createPattern({
    name: `Reggae ${style}`,
    genre: 'reggae',
    style,
    suggestedBPM: 90,
    bpmRange: [80, 100],
    intensity: 'low',
    resolution,
    tags: ['reggae', 'dub', style]
  }, tracks);
}

// ============================================================================
// UK Garage Broken Beat (displaced kicks, ghost hits)
// ============================================================================

export function generateUKGarage_broken() {
  const resolution = 32;

  // Displaced kicks: off beats 1 and 3
  const kick = [
    { step: 1, velocity: 120 },
    { step: 7, velocity: 95 },
    { step: 17, velocity: 115 },
    { step: 23, velocity: 90 },
  ];

  // Ghost snares with extra hits
  const snare = [
    { step: 8, velocity: 115 },
    { step: 11, velocity: 55 },
    { step: 14, velocity: 50 },
    { step: 24, velocity: 115 },
    { step: 27, velocity: 60 },
    { step: 30, velocity: 45 },
  ];

  // Shuffled hats (triplet feel)
  const closedHat = [];
  for (let i = 0; i < resolution; i += 3) {
    closedHat.push({ step: i, velocity: randomRange(65, 85) });
  }

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
  ];

  return createPattern({
    name: 'UK Garage Broken',
    genre: 'uk-garage',
    style: 'broken',
    suggestedBPM: 135,
    bpmRange: [130, 140],
    resolution,
    tags: ['uk-garage', 'broken-beat', '2-step'],
  }, tracks);
}

// ============================================================================
// UK Garage Halftime
// ============================================================================

export function generateUKGarage_halftime() {
  const resolution = 32;

  const kick = [
    { step: 0, velocity: 127 },
    { step: 22, velocity: 90 },
  ];

  const snare = [
    { step: 16, velocity: 120 },
  ];

  const closedHat = [];
  for (let i = 0; i < resolution; i += 4) {
    closedHat.push({ step: i, velocity: randomRange(60, 80) });
  }

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
  ];

  return createPattern({
    name: 'UK Garage Halftime',
    genre: 'uk-garage',
    style: 'halftime',
    suggestedBPM: 135,
    bpmRange: [130, 140],
    resolution,
    tags: ['uk-garage', 'halftime', 'garage'],
  }, tracks);
}

// ============================================================================
// IDM 5/4 with Euclidean rhythms
// ============================================================================

export function generateIDM_5over4() {
  const grid = createMeterGrid('5/4', 4);
  const resolution = grid.totalSteps; // 20

  // Euclidean kick: E(3,20) -- 3 kicks across 20 steps
  const kick = euclideanToSteps(3, resolution, 120);

  // Euclidean snare: E(5,20) offset
  const snare = euclideanToSteps(5, resolution, 105, 2);

  // Dense glitchy hats
  const closedHat = euclideanToSteps(11, resolution, 70);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
  ];

  return createPattern({
    name: 'IDM 5/4',
    genre: 'idm',
    style: '5/4',
    suggestedBPM: 140,
    bpmRange: [100, 180],
    timeSignature: '5/4',
    intensity: 'high',
    complexity: 'complex',
    resolution,
    tags: ['idm', '5/4', 'euclidean', 'experimental'],
  }, tracks);
}

// ============================================================================
// IDM 7/8 with asymmetric groupings
// ============================================================================

export function generateIDM_7over8() {
  const grid = createMeterGrid('7/8', 4);
  const resolution = grid.totalSteps; // 14

  // Asymmetric grouping: 3+2+2 or 2+2+3
  const kick = [
    { step: 0, velocity: 127 },
    { step: 6, velocity: 110 },
    { step: 10, velocity: 115 },
  ];

  const snare = [
    { step: 3, velocity: 100 },
    { step: 8, velocity: 105 },
    { step: 12, velocity: 95 },
  ];

  const closedHat = euclideanToSteps(7, resolution, 75);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
  ];

  return createPattern({
    name: 'IDM 7/8',
    genre: 'idm',
    style: '7/8',
    suggestedBPM: 140,
    bpmRange: [100, 180],
    timeSignature: '7/8',
    intensity: 'high',
    complexity: 'complex',
    resolution,
    tags: ['idm', '7/8', 'odd-meter', 'experimental'],
  }, tracks);
}

// ============================================================================
// IDM Polyrhythm (5:3)
// ============================================================================

export function generateIDM_polyrhythm() {
  const resolution = 32;

  // Polyrhythmic kick/snare at 5:3
  const { layer1, layer2 } = polyrhythmPattern(resolution, 5, 3);
  const kick = layer1.map(n => ({ ...n, velocity: Math.min(n.velocity + 15, 127) }));
  const snare = layer2;

  // Glitchy hats
  const closedHat = addGhostNotes([], resolution, 0.3);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
  ];

  return createPattern({
    name: 'IDM Polyrhythm 5:3',
    genre: 'idm',
    style: 'polyrhythm',
    suggestedBPM: 140,
    bpmRange: [100, 180],
    intensity: 'high',
    complexity: 'complex',
    resolution,
    tags: ['idm', 'polyrhythm', 'experimental'],
  }, tracks);
}

// ============================================================================
// Ostinato 7/8
// ============================================================================

export function generateOstinato_7over8() {
  const grid = createMeterGrid('7/8', 4);
  const resolution = grid.totalSteps; // 14

  // Asymmetric 2+2+3 grouping
  const kick = [
    { step: 0, velocity: 127 },
    { step: 4, velocity: 115 },
    { step: 8, velocity: 120 },
  ];

  const snare = [
    { step: 2, velocity: 100 },
    { step: 6, velocity: 95 },
    { step: 11, velocity: 110 },
  ];

  const closedHat = eightNotes(resolution, 75);

  const tracks = [
    { name: 'kick', midiNote: 36, pattern: kick },
    { name: 'snare', midiNote: 38, pattern: snare },
    { name: 'closed-hat', midiNote: 42, pattern: closedHat },
  ];

  return createPattern({
    name: 'Ostinato 7/8',
    genre: 'ostinato',
    style: '7/8',
    suggestedBPM: 120,
    bpmRange: [80, 160],
    timeSignature: '7/8',
    complexity: 'complex',
    resolution,
    tags: ['ostinato', '7/8', 'odd-meter'],
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
  ostinato: generateOstinato,
  reggae: generateReggae
};

export const GENRE_VARIATIONS = {
  house: ['main'],
  techno: ['main'],
  dnb: ['amen', 'two-step'],
  breakbeat: ['funky', 'amen'],
  'uk-garage': ['main', 'broken', 'halftime'],
  idm: ['main', '5/4', '7/8', 'polyrhythm'],
  'trip-hop': ['main'],
  ostinato: ['3:4', '5:4', '7:8'],
  reggae: ['one-drop', 'rockers', 'steppers']
};

/** Lookup for variation generators */
export const VARIATION_GENERATORS = {
  'uk-garage:broken': generateUKGarage_broken,
  'uk-garage:halftime': generateUKGarage_halftime,
  'idm:5/4': generateIDM_5over4,
  'idm:7/8': generateIDM_7over8,
  'idm:polyrhythm': generateIDM_polyrhythm,
  'ostinato:7/8': generateOstinato_7over8,
};
