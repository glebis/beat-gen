/**
 * Unit tests for genre templates
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  generateHouse,
  generateTechno,
  generateDnB,
  generateBreakbeat,
  generateUKGarage,
  generateIDM,
  generateTripHop,
  generateOstinato,
  GENRE_GENERATORS
} from '../../src/generators/genre-templates.js';

test('generateHouse creates valid pattern', () => {
  const pattern = generateHouse();

  assert.strictEqual(pattern.metadata.genre, 'house');
  assert.strictEqual(pattern.metadata.suggestedBPM, 120);
  assert.strictEqual(pattern.resolution, 16);
  assert.ok(pattern.tracks.length >= 3);

  const kick = pattern.tracks.find(t => t.name === 'kick');
  assert.ok(kick, 'Should have kick track');
  assert.ok(kick.pattern.length > 0);
});

test('generateTechno creates valid pattern', () => {
  const pattern = generateTechno();

  assert.strictEqual(pattern.metadata.genre, 'techno');
  assert.strictEqual(pattern.metadata.suggestedBPM, 128);
  assert.strictEqual(pattern.resolution, 16);
});

test('generateDnB creates high-resolution pattern', () => {
  const pattern = generateDnB('amen');

  assert.strictEqual(pattern.metadata.genre, 'dnb');
  assert.strictEqual(pattern.metadata.suggestedBPM, 170);
  assert.strictEqual(pattern.resolution, 64); // Higher resolution for fast BPM
  assert.ok(pattern.metadata.style === 'amen');
});

test('generateDnB supports two-step variation', () => {
  const pattern = generateDnB('two-step');

  assert.strictEqual(pattern.metadata.style, 'two-step');
  assert.strictEqual(pattern.resolution, 64);
});

test('generateBreakbeat creates valid pattern', () => {
  const pattern = generateBreakbeat('funky');

  assert.strictEqual(pattern.metadata.genre, 'breakbeat');
  assert.strictEqual(pattern.metadata.suggestedBPM, 130);
  assert.strictEqual(pattern.resolution, 32);
});

test('generateUKGarage creates syncopated pattern', () => {
  const pattern = generateUKGarage();

  assert.strictEqual(pattern.metadata.genre, 'uk-garage');
  assert.strictEqual(pattern.metadata.suggestedBPM, 135);
  assert.strictEqual(pattern.resolution, 32);
});

test('generateIDM creates irregular pattern', () => {
  const pattern = generateIDM();

  assert.strictEqual(pattern.metadata.genre, 'idm');
  assert.strictEqual(pattern.metadata.complexity, 'complex');
  assert.ok(pattern.tracks.length >= 3);
});

test('generateTripHop creates sparse pattern', () => {
  const pattern = generateTripHop();

  assert.strictEqual(pattern.metadata.genre, 'trip-hop');
  assert.strictEqual(pattern.metadata.suggestedBPM, 85);
  assert.strictEqual(pattern.metadata.intensity, 'low');
});

test('generateOstinato creates polyrhythmic pattern', () => {
  const pattern = generateOstinato('3:4');

  assert.strictEqual(pattern.metadata.genre, 'ostinato');
  assert.ok(pattern.metadata.style.includes('3:4'));
  assert.ok(pattern.metadata.tags.includes('polyrhythm'));
});

test('GENRE_GENERATORS contains all genres', () => {
  const expectedGenres = [
    'house', 'techno', 'dnb', 'breakbeat',
    'uk-garage', 'idm', 'trip-hop', 'ostinato'
  ];

  expectedGenres.forEach(genre => {
    assert.ok(GENRE_GENERATORS[genre], `Should have ${genre} generator`);
    assert.strictEqual(typeof GENRE_GENERATORS[genre], 'function');
  });
});

test('all patterns have required metadata', () => {
  const generators = Object.values(GENRE_GENERATORS);

  generators.forEach(generator => {
    const pattern = generator();

    assert.ok(pattern.version);
    assert.ok(pattern.metadata.name);
    assert.ok(pattern.metadata.genre);
    assert.ok(pattern.metadata.suggestedBPM);
    assert.ok(pattern.metadata.bpmRange);
    assert.ok(Array.isArray(pattern.metadata.bpmRange));
    assert.strictEqual(pattern.metadata.bpmRange.length, 2);
    assert.ok(pattern.timeSignature);
    assert.ok(pattern.resolution);
    assert.ok(Array.isArray(pattern.tracks));
  });
});

test('all patterns have valid track structure', () => {
  const generators = Object.values(GENRE_GENERATORS);

  generators.forEach(generator => {
    const pattern = generator();

    pattern.tracks.forEach(track => {
      assert.ok(track.name, 'Track should have name');
      assert.ok(typeof track.midiNote === 'number', 'Track should have MIDI note');
      assert.ok(Array.isArray(track.pattern), 'Track should have pattern array');

      track.pattern.forEach(note => {
        assert.ok(typeof note.step === 'number', 'Note should have step');
        assert.ok(typeof note.velocity === 'number', 'Note should have velocity');
        assert.ok(note.velocity >= 1 && note.velocity <= 127, 'Velocity in range');
      });
    });
  });
});
