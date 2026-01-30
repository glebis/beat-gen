/**
 * Unit tests for pattern generator utilities
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  randomRange,
  fourOnFloor,
  backbeat,
  offbeat,
  normalizePattern,
  shiftPattern,
  reversePattern,
  sparsePattern,
  createPattern,
  padNumber
} from '../../src/generators/pattern-generator.js';

test('randomRange generates values within range', () => {
  for (let i = 0; i < 100; i++) {
    const val = randomRange(10, 20);
    assert.ok(val >= 10 && val <= 20, `${val} should be between 10 and 20`);
  }
});

test('fourOnFloor creates kick pattern', () => {
  const pattern = fourOnFloor(16);
  assert.strictEqual(pattern.length, 4);
  assert.strictEqual(pattern[0].step, 0);
  assert.strictEqual(pattern[1].step, 4);
  assert.strictEqual(pattern[2].step, 8);
  assert.strictEqual(pattern[3].step, 12);
  pattern.forEach(note => {
    assert.strictEqual(note.velocity, 127);
  });
});

test('backbeat creates snare pattern', () => {
  const pattern = backbeat(16);
  assert.strictEqual(pattern.length, 2);
  assert.strictEqual(pattern[0].step, 4);
  assert.strictEqual(pattern[1].step, 12);
  pattern.forEach(note => {
    assert.strictEqual(note.velocity, 110);
  });
});

test('offbeat creates hi-hat pattern', () => {
  const pattern = offbeat(16, 80);
  assert.strictEqual(pattern.length, 4);
  assert.strictEqual(pattern[0].step, 2);
  assert.strictEqual(pattern[1].step, 6);
  assert.strictEqual(pattern[2].step, 10);
  assert.strictEqual(pattern[3].step, 14);
  pattern.forEach(note => {
    assert.strictEqual(note.velocity, 80);
  });
});

test('normalizePattern clamps values', () => {
  const input = [
    { step: -5, velocity: 150 },
    { step: 3.7, velocity: 50 },
    { step: 8, velocity: -10 }
  ];
  const result = normalizePattern(input);

  assert.strictEqual(result[0].step, 0);
  assert.strictEqual(result[0].velocity, 127);
  assert.strictEqual(result[1].step, 3);
  assert.strictEqual(result[2].velocity, 1);
});

test('shiftPattern moves steps', () => {
  const input = [
    { step: 0, velocity: 100 },
    { step: 4, velocity: 100 }
  ];
  const result = shiftPattern(input, 2);

  assert.strictEqual(result[0].step, 2);
  assert.strictEqual(result[1].step, 6);
});

test('reversePattern reverses timing', () => {
  const input = [
    { step: 0, velocity: 100 },
    { step: 4, velocity: 100 }
  ];
  const result = reversePattern(input, 16);

  assert.strictEqual(result[0].step, 15);
  assert.strictEqual(result[1].step, 11);
});

test('sparsePattern removes notes', () => {
  const input = Array(10).fill(null).map((_, i) => ({ step: i, velocity: 100 }));
  const result = sparsePattern(input, 0.5);

  assert.ok(result.length < input.length);
  assert.ok(result.length > 0);
});

test('createPattern generates valid structure', () => {
  const metadata = {
    name: 'Test Pattern',
    genre: 'test',
    suggestedBPM: 120
  };
  const tracks = [
    { name: 'kick', midiNote: 36, pattern: [] }
  ];

  const result = createPattern(metadata, tracks);

  assert.strictEqual(result.version, '1.0');
  assert.strictEqual(result.metadata.name, 'Test Pattern');
  assert.strictEqual(result.metadata.genre, 'test');
  assert.strictEqual(result.metadata.suggestedBPM, 120);
  assert.strictEqual(result.timeSignature, '4/4');
  assert.strictEqual(result.resolution, 16);
  assert.ok(result.metadata.timestamp);
  assert.ok(result.metadata.generatedBy);
});

test('padNumber pads with zeros', () => {
  assert.strictEqual(padNumber(1), '001');
  assert.strictEqual(padNumber(42), '042');
  assert.strictEqual(padNumber(999), '999');
  assert.strictEqual(padNumber(1, 5), '00001');
});
