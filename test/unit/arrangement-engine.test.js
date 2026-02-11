/**
 * Tests for arrangement engine
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateArrangement, GENRE_ARRANGEMENTS } from '../../src/generators/arrangement-engine.js';

describe('arrangement engine', () => {
  it('generates arrangement for house', () => {
    const arr = generateArrangement({
      genre: 'house',
      key: 'C',
      scale: 'minor',
      tempo: 128,
      resolution: 16,
      seed: 42,
    });

    assert.equal(arr.version, '2.0');
    assert.equal(arr.key, 'Cm');
    assert.ok(arr.sections.length > 0, 'Should have sections');
    assert.ok(arr.tracks.length > 0, 'Should have tracks');
  });

  it('has templates for all 9 genres', () => {
    const genres = ['house', 'techno', 'dnb', 'breakbeat', 'uk-garage',
      'idm', 'trip-hop', 'ostinato', 'reggae'];
    for (const genre of genres) {
      assert.ok(GENRE_ARRANGEMENTS[genre], `Missing arrangement for: ${genre}`);
    }
  });

  it('sections have name, bars, tracks, energy', () => {
    const arr = generateArrangement({
      genre: 'house', key: 'C', scale: 'minor', tempo: 128, resolution: 16, seed: 42,
    });

    for (const section of arr.sections) {
      assert.ok(section.name, 'Section should have name');
      assert.ok(section.bars > 0, 'Section should have bars');
      assert.ok(Array.isArray(section.activeTracks), 'Section should have activeTracks');
      assert.ok(section.energy >= 0 && section.energy <= 1, 'Energy should be 0-1');
    }
  });

  it('includes drum, bass, and lead tracks', () => {
    const arr = generateArrangement({
      genre: 'house', key: 'C', scale: 'minor', tempo: 128, resolution: 16, seed: 42,
    });

    const trackNames = arr.tracks.map(t => t.name);
    assert.ok(trackNames.some(n => n === 'kick' || n === 'snare' || n === 'closed-hat'),
      'Should have drum tracks');
    assert.ok(trackNames.includes('bass'), 'Should have bass track');
  });

  it('respects custom track list', () => {
    const arr = generateArrangement({
      genre: 'house', key: 'C', scale: 'minor', tempo: 128, resolution: 16,
      trackList: ['drums', 'bass'], seed: 42,
    });

    // Should not have lead or pad
    const trackNames = arr.tracks.map(t => t.name);
    assert.ok(!trackNames.includes('lead'), 'Should not have lead');
    assert.ok(!trackNames.includes('pad'), 'Should not have pad');
  });

  it('section bars sum correctly', () => {
    const arr = generateArrangement({
      genre: 'house', key: 'C', scale: 'minor', tempo: 128, resolution: 16, seed: 42,
    });

    const totalBars = arr.sections.reduce((sum, s) => sum + s.bars, 0);
    assert.ok(totalBars > 0, 'Total bars should be > 0');
    assert.equal(arr.metadata.totalBars, totalBars);
  });

  it('deterministic with seed', () => {
    const opts = { genre: 'techno', key: 'C', scale: 'minor', tempo: 130, resolution: 16, seed: 42 };
    const a = generateArrangement(opts);
    const b = generateArrangement(opts);
    assert.equal(a.sections.length, b.sections.length);
    assert.equal(a.tracks.length, b.tracks.length);
  });

  it('supports custom sections override', () => {
    const arr = generateArrangement({
      genre: 'house', key: 'C', scale: 'minor', tempo: 128, resolution: 16,
      sectionOverride: ['intro', 'drop', 'outro'], seed: 42,
    });

    const names = arr.sections.map(s => s.name);
    assert.deepEqual(names, ['intro', 'drop', 'outro']);
  });
});
