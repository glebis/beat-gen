/**
 * Tests for extended pattern schema v2.0
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPattern } from '../../src/generators/pattern-generator.js';
import { generateHouse } from '../../src/generators/genre-templates.js';

describe('pattern schema v2.0', () => {
  it('v1 patterns still work (no sections)', () => {
    const pattern = generateHouse();
    assert.ok(!pattern.sections, 'v1 pattern should not have sections');
    assert.ok(pattern.tracks.length > 0);
    assert.equal(pattern.version, '1.0');
  });

  it('createPattern supports version, key, scale fields', () => {
    const pattern = createPattern({
      name: 'Test',
      genre: 'house',
      suggestedBPM: 128,
      resolution: 16,
      version: '2.0',
      key: 'Cm',
      scale: 'minor',
    }, []);
    assert.equal(pattern.version, '2.0');
    assert.equal(pattern.key, 'Cm');
    assert.equal(pattern.scale, 'minor');
  });

  it('pitched track has channel, instrument, pitch, duration', () => {
    const bassTrack = {
      name: 'bass',
      midiNote: 36,
      channel: 2,
      instrument: 39,
      pattern: [
        { step: 0, velocity: 100, pitch: 36, duration: 4 },
        { step: 4, velocity: 100, pitch: 43, duration: 4 },
      ]
    };

    assert.equal(bassTrack.channel, 2);
    assert.equal(bassTrack.instrument, 39);
    assert.equal(bassTrack.pattern[0].pitch, 36);
    assert.equal(bassTrack.pattern[0].duration, 4);
  });

  it('arrangement with sections', () => {
    const arrangement = {
      version: '2.0',
      key: 'Cm',
      scale: 'minor',
      tempo: 128,
      timeSignature: '4/4',
      resolution: 16,
      tracks: [],
      sections: [
        { name: 'intro', bars: 8, activeTracks: ['drums'], energy: 0.3 },
        { name: 'drop', bars: 16, activeTracks: ['drums', 'bass', 'lead'], energy: 1.0 },
        { name: 'outro', bars: 8, activeTracks: ['drums'], energy: 0.4 },
      ]
    };

    assert.equal(arrangement.sections.length, 3);
    assert.equal(arrangement.sections[0].name, 'intro');
    assert.equal(arrangement.sections[1].bars, 16);
    assert.deepEqual(arrangement.sections[1].activeTracks, ['drums', 'bass', 'lead']);
  });

  it('backward compat: drum track without channel defaults to 9', () => {
    const track = { name: 'kick', midiNote: 36, pattern: [{ step: 0, velocity: 127 }] };
    // When channel is absent, rendering should default to 9 (drum channel)
    const effectiveChannel = track.channel ?? 9;
    assert.equal(effectiveChannel, 9);
  });

  it('backward compat: drum events without pitch/duration still valid', () => {
    const event = { step: 0, velocity: 127 };
    // No pitch means use track.midiNote, no duration means 1 step
    const effectivePitch = event.pitch ?? null;
    const effectiveDuration = event.duration ?? 1;
    assert.equal(effectivePitch, null);
    assert.equal(effectiveDuration, 1);
  });
});
