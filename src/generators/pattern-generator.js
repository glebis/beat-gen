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
