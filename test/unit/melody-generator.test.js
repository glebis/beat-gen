/**
 * Tests for melody generator
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateMelody, MELODY_PROFILES } from '../../src/generators/melody-generator.js';
import { isInScale } from '../../src/utils/music-theory.js';

describe('melody generator', () => {
  it('generates melody track for house', () => {
    const melody = generateMelody({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
      instrument: 'lead',
    });

    assert.equal(melody.name, 'lead');
    assert.equal(melody.channel, 3);
    assert.ok(melody.pattern.length > 0, 'Should have notes');
  });

  it('all melody notes are within the scale', () => {
    const melody = generateMelody({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
      instrument: 'lead',
    });

    for (const note of melody.pattern) {
      assert.ok(note.pitch !== undefined, `Note at step ${note.step} should have pitch`);
      assert.ok(isInScale(note.pitch, 'C', 'minor'),
        `Pitch ${note.pitch} at step ${note.step} not in C minor`);
    }
  });

  it('melody notes are in correct range (MIDI 48-84)', () => {
    const melody = generateMelody({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
      instrument: 'lead',
    });

    for (const note of melody.pattern) {
      assert.ok(note.pitch >= 48 && note.pitch <= 84,
        `Pitch ${note.pitch} out of melody range`);
    }
  });

  it('has profiles for all genres', () => {
    const genres = ['house', 'techno', 'dnb', 'breakbeat', 'uk-garage',
      'idm', 'trip-hop', 'ostinato', 'reggae'];
    for (const genre of genres) {
      assert.ok(MELODY_PROFILES[genre], `Missing melody profile for: ${genre}`);
    }
  });

  it('generates with seed for determinism', () => {
    const opts = {
      genre: 'house', key: 'C', scale: 'minor',
      resolution: 16, tempo: 128, instrument: 'lead', seed: 42,
    };
    const a = generateMelody(opts);
    const b = generateMelody(opts);
    assert.deepEqual(a.pattern, b.pattern, 'Same seed should produce same pattern');
  });

  it('generates pad instrument', () => {
    const pad = generateMelody({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      resolution: 16,
      tempo: 128,
      instrument: 'pad',
    });

    assert.equal(pad.name, 'pad');
    assert.equal(pad.channel, 4);
    assert.ok(pad.pattern.length > 0);
    // Pads should have longer durations
    for (const note of pad.pattern) {
      assert.ok(note.duration >= 2, `Pad notes should have duration >= 2, got ${note.duration}`);
    }
  });

  it('sparse genres produce fewer notes', () => {
    const opts = { key: 'C', scale: 'minor', resolution: 16, tempo: 128, instrument: 'lead', seed: 42 };
    const tripHop = generateMelody({ ...opts, genre: 'trip-hop' });
    const dnb = generateMelody({ ...opts, genre: 'dnb' });
    assert.ok(tripHop.pattern.length <= dnb.pattern.length,
      'Trip-hop should have fewer or equal notes to DnB');
  });
});
