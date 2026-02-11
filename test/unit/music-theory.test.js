/**
 * Tests for music theory module
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SCALES,
  parseNote,
  noteName,
  getScaleNotes,
  getChord,
  GENRE_PROGRESSIONS,
} from '../../src/utils/music-theory.js';

// ============================================================================
// Note parsing
// ============================================================================

describe('parseNote', () => {
  it('parses C4 as MIDI 60', () => {
    assert.equal(parseNote('C4'), 60);
  });

  it('parses A0 as MIDI 21', () => {
    assert.equal(parseNote('A0'), 21);
  });

  it('parses C#4 as MIDI 61', () => {
    assert.equal(parseNote('C#4'), 61);
  });

  it('parses Bb3 as MIDI 58', () => {
    assert.equal(parseNote('Bb3'), 58);
  });

  it('parses G2 as MIDI 43', () => {
    assert.equal(parseNote('G2'), 43);
  });
});

describe('noteName', () => {
  it('converts 60 to C4', () => {
    assert.equal(noteName(60), 'C4');
  });

  it('converts 21 to A0', () => {
    assert.equal(noteName(21), 'A0');
  });

  it('converts 61 to C#4', () => {
    assert.equal(noteName(61), 'C#4');
  });

  it('round-trips all note names', () => {
    for (let midi = 0; midi < 128; midi++) {
      const name = noteName(midi);
      assert.equal(parseNote(name), midi, `Round-trip failed for MIDI ${midi} (${name})`);
    }
  });
});

// ============================================================================
// Scales
// ============================================================================

describe('SCALES', () => {
  it('has all required scale types', () => {
    const required = ['minor', 'dorian', 'phrygian', 'mixolydian',
      'pentatonicMinor', 'blues', 'harmonicMinor', 'major'];
    for (const scale of required) {
      assert.ok(SCALES[scale], `Missing scale: ${scale}`);
    }
  });

  it('all scales start at 0', () => {
    for (const [name, intervals] of Object.entries(SCALES)) {
      assert.equal(intervals[0], 0, `${name} scale should start at 0`);
    }
  });

  it('minor scale has correct intervals', () => {
    assert.deepEqual(SCALES.minor, [0, 2, 3, 5, 7, 8, 10]);
  });

  it('major scale has correct intervals', () => {
    assert.deepEqual(SCALES.major, [0, 2, 4, 5, 7, 9, 11]);
  });
});

describe('getScaleNotes', () => {
  it('C minor octave 2-4 returns correct range', () => {
    const notes = getScaleNotes('C', 'minor', 2, 4);
    // C2=36, D2=38, Eb2=39, F2=41, G2=43, Ab2=44, Bb2=46
    // C3=48, ..., C4=60, ...
    assert.ok(notes.length > 0);
    assert.equal(notes[0], 36); // C2
    assert.ok(notes.includes(48)); // C3
    assert.ok(notes.includes(60)); // C4
    // All notes should be within octave 2-4
    assert.ok(notes.every(n => n >= 36 && n <= 72));
  });

  it('all notes are within the scale', () => {
    const notes = getScaleNotes('C', 'minor', 2, 4);
    const scaleIntervals = SCALES.minor;
    for (const note of notes) {
      const semitone = note % 12;
      assert.ok(scaleIntervals.includes(semitone),
        `Note ${note} (${noteName(note)}) semitone ${semitone} not in C minor`);
    }
  });

  it('works with sharps', () => {
    const notes = getScaleNotes('F#', 'minor', 3, 3);
    assert.ok(notes.length > 0);
    // F#3 = 54
    assert.equal(notes[0], 54);
  });
});

// ============================================================================
// Chords
// ============================================================================

describe('getChord', () => {
  it('C minor I = Cm (root, minor 3rd, 5th)', () => {
    const chord = getChord('C', 'minor', 1);
    assert.deepEqual(chord, [0, 3, 7]);
  });

  it('C minor iv chord', () => {
    const chord = getChord('C', 'minor', 4);
    // 4th degree of C minor = F (semitone 5)
    // F minor chord: F, Ab, C = 5, 8, 12
    assert.equal(chord[0], 5);
  });

  it('C major I = C major (root, major 3rd, 5th)', () => {
    const chord = getChord('C', 'major', 1);
    assert.deepEqual(chord, [0, 4, 7]);
  });
});

// ============================================================================
// Genre progressions
// ============================================================================

describe('GENRE_PROGRESSIONS', () => {
  it('has progressions for all 9 genres', () => {
    const genres = ['house', 'techno', 'dnb', 'breakbeat', 'uk-garage',
      'idm', 'trip-hop', 'ostinato', 'reggae'];
    for (const genre of genres) {
      assert.ok(GENRE_PROGRESSIONS[genre], `Missing progressions for: ${genre}`);
      assert.ok(GENRE_PROGRESSIONS[genre].length > 0);
    }
  });

  it('all progressions contain valid scale degrees (1-7)', () => {
    for (const [genre, progs] of Object.entries(GENRE_PROGRESSIONS)) {
      for (const prog of progs) {
        for (const degree of prog) {
          assert.ok(degree >= 1 && degree <= 7,
            `Invalid degree ${degree} in ${genre} progression`);
        }
      }
    }
  });
});
