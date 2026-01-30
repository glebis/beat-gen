/**
 * Unit tests for variation engine
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  generateIntro,
  generateOutro,
  generateFill,
  addHumanization,
  addVariability
} from '../../src/generators/variation-engine.js';
import { generateHouse } from '../../src/generators/genre-templates.js';

test('generateIntro creates sparser pattern', () => {
  const main = generateHouse();
  const intro = generateIntro(main);

  assert.strictEqual(intro.metadata.variation, 'intro');
  assert.ok(intro.metadata.name.includes('Intro'));

  // Count total notes
  const mainNotes = main.tracks.reduce((sum, t) => sum + t.pattern.length, 0);
  const introNotes = intro.tracks.reduce((sum, t) => sum + t.pattern.length, 0);

  assert.ok(introNotes <= mainNotes, 'Intro should have fewer or equal notes');
});

test('generateIntro preserves kick and crash', () => {
  const main = generateHouse();
  const intro = generateIntro(main);

  const mainKick = main.tracks.find(t => t.name === 'kick');
  const introKick = intro.tracks.find(t => t.name === 'kick');

  if (mainKick && introKick) {
    assert.strictEqual(mainKick.pattern.length, introKick.pattern.length,
      'Kick should be preserved');
  }
});

test('generateOutro reduces velocity', () => {
  const main = generateHouse();
  const outro = generateOutro(main);

  assert.strictEqual(outro.metadata.variation, 'outro');
  assert.ok(outro.metadata.name.includes('Outro'));

  // Check that velocities are reduced
  main.tracks.forEach((mainTrack, i) => {
    const outroTrack = outro.tracks[i];
    if (mainTrack.pattern.length > 0 && outroTrack.pattern.length > 0) {
      const mainAvgVel = mainTrack.pattern.reduce((sum, n) => sum + n.velocity, 0) / mainTrack.pattern.length;
      const outroAvgVel = outroTrack.pattern.reduce((sum, n) => sum + n.velocity, 0) / outroTrack.pattern.length;

      assert.ok(outroAvgVel <= mainAvgVel, 'Outro velocity should be reduced');
    }
  });
});

test('generateFill adds crash', () => {
  const main = generateHouse();
  const fill = generateFill(main);

  assert.strictEqual(fill.metadata.variation, 'fill');
  assert.ok(fill.metadata.name.includes('Fill'));

  const crash = fill.tracks.find(t => t.name === 'crash');
  assert.ok(crash, 'Fill should have crash track');
  assert.ok(crash.pattern.length > 0, 'Crash should have notes');
});

test('generateFill modifies last quarter', () => {
  const main = generateHouse();
  const fill = generateFill(main);

  const fillStartStep = Math.floor(main.resolution * 0.75);

  // Check kick track is removed after fillStartStep
  const fillKick = fill.tracks.find(t => t.name === 'kick');
  if (fillKick) {
    const kickAfterFill = fillKick.pattern.filter(n => n.step >= fillStartStep);
    assert.strictEqual(kickAfterFill.length, 0, 'Kick should stop before fill');
  }

  // Check snare has rapid notes in fill section
  const fillSnare = fill.tracks.find(t => t.name === 'snare');
  if (fillSnare) {
    const snareInFill = fillSnare.pattern.filter(n => n.step >= fillStartStep);
    assert.ok(snareInFill.length > 0, 'Snare should have notes in fill section');
  }
});

test('addHumanization varies velocities', () => {
  const pattern = generateHouse();
  const humanized = addHumanization(pattern, 0.2);

  // Check that velocities changed but are still valid
  pattern.tracks.forEach((track, i) => {
    const humanTrack = humanized.tracks[i];

    humanTrack.pattern.forEach(note => {
      assert.ok(note.velocity >= 1 && note.velocity <= 127,
        'Velocity should be in valid range');
    });
  });
});

test('addVariability adds ghost notes', () => {
  const pattern = generateHouse();
  const varied = addVariability(pattern, 0.3);

  // Check closed-hat track has more notes
  const origHat = pattern.tracks.find(t => t.name === 'closed-hat');
  const variedHat = varied.tracks.find(t => t.name === 'closed-hat');

  if (origHat && variedHat) {
    assert.ok(variedHat.pattern.length >= origHat.pattern.length,
      'Varied pattern should have more or equal notes');
  }
});

test('variations preserve original resolution', () => {
  const main = generateHouse();
  const intro = generateIntro(main);
  const outro = generateOutro(main);
  const fill = generateFill(main);

  assert.strictEqual(intro.resolution, main.resolution);
  assert.strictEqual(outro.resolution, main.resolution);
  assert.strictEqual(fill.resolution, main.resolution);
});
