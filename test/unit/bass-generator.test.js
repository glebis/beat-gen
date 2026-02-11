/**
 * Tests for bass generator
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateBass, BASS_MODES } from '../../src/generators/bass-generator.js';
import { isInScale } from '../../src/utils/music-theory.js';

describe('bass generator', () => {
  it('generates bass track for house', () => {
    const bass = generateBass({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
    });

    assert.equal(bass.name, 'bass');
    assert.equal(bass.channel, 2);
    assert.equal(bass.instrument, 39);
    assert.ok(bass.pattern.length > 0, 'Should have notes');
  });

  it('all bass notes are within the scale', () => {
    const bass = generateBass({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
    });

    for (const note of bass.pattern) {
      assert.ok(note.pitch !== undefined, `Note at step ${note.step} should have pitch`);
      assert.ok(isInScale(note.pitch, 'C', 'minor'),
        `Pitch ${note.pitch} at step ${note.step} not in C minor`);
    }
  });

  it('bass notes are in correct range (MIDI 24-60)', () => {
    const bass = generateBass({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
    });

    for (const note of bass.pattern) {
      assert.ok(note.pitch >= 24 && note.pitch <= 60,
        `Pitch ${note.pitch} out of bass range`);
    }
  });

  it('has bass modes for all 9 genres', () => {
    const genres = ['house', 'techno', 'dnb', 'breakbeat', 'uk-garage',
      'idm', 'trip-hop', 'ostinato', 'reggae'];
    for (const genre of genres) {
      assert.ok(BASS_MODES[genre], `Missing bass mode for: ${genre}`);
    }
  });

  it('respects chord progression', () => {
    const bass = generateBass({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
      progression: [1, 4, 5, 1],
    });

    assert.ok(bass.pattern.length > 0);
  });

  it('generates bass with seed for determinism', () => {
    const opts = {
      genre: 'techno', key: 'C', scale: 'minor',
      resolution: 16, tempo: 128, seed: 42,
    };
    const a = generateBass(opts);
    const b = generateBass(opts);
    assert.deepEqual(a.pattern, b.pattern, 'Same seed should produce same pattern');
  });

  it('different genres produce different patterns', () => {
    const opts = { key: 'C', scale: 'minor', resolution: 16, tempo: 128, seed: 42 };
    const house = generateBass({ ...opts, genre: 'house' });
    const techno = generateBass({ ...opts, genre: 'techno' });
    // Not identical (different modes)
    const houseSteps = house.pattern.map(n => n.step).join(',');
    const technoSteps = techno.pattern.map(n => n.step).join(',');
    assert.notEqual(houseSteps, technoSteps, 'House and techno bass should differ');
  });
});
