/**
 * Tests for multi-track MIDI export
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportToMIDI, importFromMIDI } from '../../src/services/midi-service.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('multi-track MIDI export', () => {
  it('exports drum-only pattern as single drum track (backward compat)', async () => {
    const outPath = path.join(os.tmpdir(), 'test-drum-only.mid');
    const pattern = {
      tempo: 128,
      timeSignature: '4/4',
      resolution: 16,
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [{ step: 0, velocity: 127 }, { step: 4, velocity: 127 }] },
        { name: 'snare', midiNote: 38, pattern: [{ step: 4, velocity: 110 }, { step: 12, velocity: 110 }] },
      ],
    };

    const result = await exportToMIDI(pattern, outPath);
    assert.ok(result.notes > 0);
    assert.ok(result.tracks >= 1);
    await fs.unlink(outPath).catch(() => {});
  });

  it('exports multi-track with bass and lead', async () => {
    const outPath = path.join(os.tmpdir(), 'test-multi-track.mid');
    const pattern = {
      tempo: 128,
      timeSignature: '4/4',
      resolution: 16,
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [{ step: 0, velocity: 127 }] },
        { name: 'snare', midiNote: 38, pattern: [{ step: 4, velocity: 110 }] },
        {
          name: 'bass', midiNote: 36, channel: 2, instrument: 39,
          pattern: [
            { step: 0, velocity: 100, pitch: 36, duration: 4 },
            { step: 4, velocity: 100, pitch: 43, duration: 4 },
          ]
        },
        {
          name: 'lead', midiNote: 60, channel: 3, instrument: 81,
          pattern: [
            { step: 0, velocity: 90, pitch: 60, duration: 2 },
            { step: 4, velocity: 85, pitch: 63, duration: 2 },
          ]
        },
      ],
    };

    const result = await exportToMIDI(pattern, outPath);
    assert.ok(result.notes >= 6, `Expected at least 6 notes, got ${result.notes}`);
    assert.ok(result.tracks >= 3, `Expected at least 3 MIDI tracks, got ${result.tracks}`);
    await fs.unlink(outPath).catch(() => {});
  });

  it('exports arrangement with sections', async () => {
    const outPath = path.join(os.tmpdir(), 'test-arrangement.mid');
    const pattern = {
      tempo: 128,
      timeSignature: '4/4',
      resolution: 16,
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [{ step: 0, velocity: 127 }, { step: 4, velocity: 127 }] },
        { name: 'bass', midiNote: 36, channel: 2, instrument: 39,
          pattern: [{ step: 0, velocity: 100, pitch: 36, duration: 4 }] },
      ],
      sections: [
        { name: 'intro', bars: 4, activeTracks: ['drums'], energy: 0.3 },
        { name: 'drop', bars: 8, activeTracks: ['drums', 'bass'], energy: 1.0 },
        { name: 'outro', bars: 4, activeTracks: ['drums'], energy: 0.3 },
      ],
    };

    const result = await exportToMIDI(pattern, outPath);
    // intro (4 bars * 2 kicks) + drop (8 bars * 2 kicks + 8 bars * 1 bass) + outro (4 bars * 2 kicks)
    assert.ok(result.notes >= 20, `Expected at least 20 notes, got ${result.notes}`);
    await fs.unlink(outPath).catch(() => {});
  });
});
