/**
 * Pattern Generator Core - Base utilities for pattern generation
 */

// ============================================================================
// Random Utilities
// ============================================================================

export function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function weightedRandom(choices, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;

  for (let i = 0; i < choices.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return choices[i];
  }

  return choices[choices.length - 1];
}

// ============================================================================
// Pattern Manipulation
// ============================================================================

export function normalizePattern(pattern) {
  return pattern.map(note => ({
    step: Math.max(0, Math.floor(note.step)),
    velocity: Math.max(1, Math.min(127, Math.floor(note.velocity)))
  }));
}

export function shiftPattern(pattern, steps) {
  return pattern.map(note => ({
    ...note,
    step: note.step + steps
  }));
}

export function reversePattern(pattern, resolution) {
  return pattern.map(note => ({
    ...note,
    step: resolution - 1 - note.step
  }));
}

export function sparsePattern(pattern, factor) {
  return pattern.filter(() => Math.random() > factor);
}

export function densifyPattern(pattern, resolution, probability) {
  const result = [...pattern];
  const existingSteps = new Set(pattern.map(n => n.step));

  for (let i = 0; i < resolution; i++) {
    if (!existingSteps.has(i) && Math.random() < probability) {
      result.push({ step: i, velocity: randomRange(40, 60) });
    }
  }

  return result.sort((a, b) => a.step - b.step);
}

// ============================================================================
// Pattern Creation
// ============================================================================

export function createPattern(metadata, tracks) {
  const pattern = {
    version: metadata.version || "1.0",
    metadata: {
      generatedBy: "beat-gen v2.0",
      timestamp: new Date().toISOString(),
      variation: 'main',
      intensity: 'medium',
      complexity: 'medium',
      tags: [],
      ...metadata
    },
    timeSignature: metadata.timeSignature || "4/4",
    resolution: metadata.resolution || 16,
    tracks
  };

  // v2 fields (only included when set)
  if (metadata.key) pattern.key = metadata.key;
  if (metadata.scale) pattern.scale = metadata.scale;
  if (metadata.barsCount) pattern.barsCount = metadata.barsCount;
  if (metadata.sections) pattern.sections = metadata.sections;

  return pattern;
}

// ============================================================================
// Basic Pattern Builders
// ============================================================================

export function fourOnFloor(resolution) {
  const steps = [];
  for (let i = 0; i < resolution; i += 4) {
    steps.push({ step: i, velocity: 127 });
  }
  return steps;
}

export function backbeat(resolution) {
  const beatInterval = resolution / 4;
  return [
    { step: beatInterval, velocity: 110 },
    { step: beatInterval * 3, velocity: 110 }
  ];
}

export function offbeat(resolution, velocity = null) {
  const steps = [];
  for (let i = 2; i < resolution; i += 4) {
    steps.push({
      step: i,
      velocity: velocity || randomRange(70, 85)
    });
  }
  return steps;
}

export function eightNotes(resolution, baseVelocity = 80) {
  const steps = [];
  const interval = resolution / 8;
  for (let i = 0; i < resolution; i += interval) {
    steps.push({
      step: i,
      velocity: baseVelocity + randomRange(-10, 10)
    });
  }
  return steps;
}

export function sixteenNotes(resolution, baseVelocity = 70) {
  const steps = [];
  for (let i = 0; i < resolution; i++) {
    steps.push({
      step: i,
      velocity: baseVelocity + randomRange(-10, 10)
    });
  }
  return steps;
}

// ============================================================================
// Euclidean Rhythms (Bjorklund algorithm)
// ============================================================================

/**
 * Generate a Euclidean rhythm pattern
 * Distributes `pulses` as evenly as possible across `steps`
 * @param {number} pulses - Number of active hits
 * @param {number} steps - Total steps in the pattern
 * @param {number} [rotation=0] - Rotate pattern by N steps
 * @returns {number[]} Array of 0s and 1s
 */
export function euclideanRhythm(pulses, steps, rotation = 0) {
  if (pulses >= steps) return Array(steps).fill(1);
  if (pulses <= 0) return Array(steps).fill(0);

  // Bjorklund algorithm
  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  remainders.push(pulses);
  let level = 0;

  while (true) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level++;
    if (remainders[level] <= 1) break;
  }
  counts.push(divisor);

  function build(lvl) {
    if (lvl === -1) {
      pattern.push(0);
    } else if (lvl === -2) {
      pattern.push(1);
    } else {
      for (let i = 0; i < counts[lvl]; i++) build(lvl - 1);
      if (remainders[lvl] !== 0) build(lvl - 2);
    }
  }

  build(level);

  // Rotate
  if (rotation !== 0) {
    const r = ((rotation % steps) + steps) % steps;
    pattern = [...pattern.slice(r), ...pattern.slice(0, r)];
  }

  return pattern;
}

/**
 * Convert Euclidean rhythm to step pattern with velocity
 * @param {number} pulses
 * @param {number} steps
 * @param {number} [velocity=100]
 * @param {number} [rotation=0]
 * @returns {Array<{step: number, velocity: number}>}
 */
export function euclideanToSteps(pulses, steps, velocity = 100, rotation = 0) {
  const rhythm = euclideanRhythm(pulses, steps, rotation);
  const result = [];
  for (let i = 0; i < rhythm.length; i++) {
    if (rhythm[i]) result.push({ step: i, velocity });
  }
  return result;
}

// ============================================================================
// Odd Meter Grids
// ============================================================================

/**
 * Create a meter grid for non-4/4 time signatures
 * @param {string} timeSignature - e.g. '5/4', '7/8', '3/4'
 * @param {number} [subdivisions=4] - Subdivisions per beat
 * @returns {{ beats: number, stepsPerBeat: number, totalSteps: number }}
 */
export function createMeterGrid(timeSignature, subdivisions = 4) {
  const [numerator, denominator] = timeSignature.split('/').map(Number);
  const stepsPerBeat = denominator === 8 ? Math.floor(subdivisions / 2) : subdivisions;
  return {
    beats: numerator,
    stepsPerBeat,
    totalSteps: numerator * stepsPerBeat,
  };
}

// ============================================================================
// Polyrhythm Builder
// ============================================================================

/**
 * Create interlocking polyrhythmic patterns
 * @param {number} totalSteps - Total grid resolution
 * @param {number} ratio1 - First rhythm cycle length
 * @param {number} ratio2 - Second rhythm cycle length
 * @param {number} [vel1=110] - Velocity for rhythm 1
 * @param {number} [vel2=90] - Velocity for rhythm 2
 * @returns {{ layer1: Array, layer2: Array }}
 */
export function polyrhythmPattern(totalSteps, ratio1, ratio2, vel1 = 110, vel2 = 90) {
  const interval1 = totalSteps / ratio1;
  const interval2 = totalSteps / ratio2;

  const layer1 = [];
  for (let i = 0; i < ratio1; i++) {
    layer1.push({ step: Math.round(i * interval1), velocity: vel1 });
  }

  const layer2 = [];
  for (let i = 0; i < ratio2; i++) {
    layer2.push({ step: Math.round(i * interval2), velocity: vel2 });
  }

  return { layer1, layer2 };
}

// ============================================================================
// Humanization
// ============================================================================

export function addHumanization(pattern, amount = 0.1) {
  return pattern.map(note => ({
    ...note,
    velocity: clamp(
      note.velocity + randomRange(-amount * 127, amount * 127),
      1,
      127
    )
  }));
}

export function addGhostNotes(pattern, resolution, probability = 0.2) {
  const result = [...pattern];
  const existingSteps = new Set(pattern.map(n => n.step));

  for (let i = 0; i < resolution; i++) {
    if (!existingSteps.has(i) && Math.random() < probability) {
      result.push({ step: i, velocity: randomRange(40, 60) });
    }
  }

  return result.sort((a, b) => a.step - b.step);
}

// ============================================================================
// Utilities
// ============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function padNumber(num, width = 3) {
  return String(num).padStart(width, '0');
}
