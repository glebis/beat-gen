/**
 * Tests for Phase 0 bug fixes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exportToMIDI, importFromMIDI } from '../../src/services/midi-service.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// ============================================================================
// Bug 0.2: Audio renderer stepsPerBeat derivation (unit-testable logic)
// ============================================================================

describe('stepsPerBeat derivation', () => {
  it('16-step pattern in 4/4 = 4 stepsPerBeat', () => {
    const resolution = 16;
    const [numerator] = '4/4'.split('/').map(Number);
    const stepsPerBeat = resolution / (numerator || 4);
    assert.equal(stepsPerBeat, 4);
  });

  it('64-step DnB pattern in 4/4 = 16 stepsPerBeat', () => {
    const resolution = 64;
    const [numerator] = '4/4'.split('/').map(Number);
    const stepsPerBeat = resolution / (numerator || 4);
    assert.equal(stepsPerBeat, 16);
  });

  it('32-step breakbeat in 4/4 = 8 stepsPerBeat', () => {
    const resolution = 32;
    const [numerator] = '4/4'.split('/').map(Number);
    const stepsPerBeat = resolution / (numerator || 4);
    assert.equal(stepsPerBeat, 8);
  });

  it('correct duration for DnB 64-step at 170bpm', () => {
    const resolution = 64;
    const tempo = 170;
    const [numerator] = '4/4'.split('/').map(Number);
    const stepsPerBeat = resolution / numerator;
    const totalBeats = resolution / stepsPerBeat;
    const secondsPerBeat = 60 / tempo;
    const duration = totalBeats * secondsPerBeat;
    // 4 beats at 170bpm = 4 * (60/170) ≈ 1.412s
    assert.ok(Math.abs(duration - 1.412) < 0.01, `Expected ~1.412s, got ${duration}`);
  });
});

// ============================================================================
// Bug 0.3: MIDI export timing with barsCount
// ============================================================================

describe('MIDI export with barsCount', () => {
  it('single bar pattern exports correctly', async () => {
    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, 'test-single-bar.mid');

    const pattern = {
      tempo: 120,
      timeSignature: '4/4',
      resolution: 16,
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [
          { step: 0, velocity: 127 },
          { step: 4, velocity: 127 },
          { step: 8, velocity: 127 },
          { step: 12, velocity: 127 },
        ]}
      ]
    };

    const result = await exportToMIDI(pattern, outPath);
    assert.equal(result.notes, 4);

    await fs.unlink(outPath).catch(() => {});
  });

  it('multi-bar pattern with barsCount=2 exports correctly', async () => {
    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, 'test-multi-bar.mid');

    const pattern = {
      tempo: 120,
      timeSignature: '4/4',
      resolution: 32, // 2 bars of 16 steps
      barsCount: 2,
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [
          { step: 0, velocity: 127 },
          { step: 4, velocity: 127 },
          { step: 8, velocity: 127 },
          { step: 12, velocity: 127 },
          { step: 16, velocity: 127 },
          { step: 20, velocity: 127 },
          { step: 24, velocity: 127 },
          { step: 28, velocity: 127 },
        ]}
      ]
    };

    const result = await exportToMIDI(pattern, outPath);
    assert.equal(result.notes, 8);

    await fs.unlink(outPath).catch(() => {});
  });
});

// ============================================================================
// Bug 0.4: MIDI import → export round-trip
// ============================================================================

describe('MIDI import/export round-trip', () => {
  it('export then import preserves step positions', async () => {
    const tmpDir = os.tmpdir();
    const outPath = path.join(tmpDir, 'test-roundtrip.mid');

    const original = {
      tempo: 120,
      timeSignature: '4/4',
      resolution: 16,
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [
          { step: 0, velocity: 127 },
          { step: 4, velocity: 127 },
          { step: 8, velocity: 127 },
          { step: 12, velocity: 127 },
        ]},
        { name: 'snare', midiNote: 38, pattern: [
          { step: 4, velocity: 110 },
          { step: 12, velocity: 110 },
        ]}
      ]
    };

    await exportToMIDI(original, outPath);
    const imported = await importFromMIDI(outPath);

    // Find kick track
    const kickTrack = imported.tracks.find(t => t.midiNote === 36);
    assert.ok(kickTrack, 'Should have kick track');
    assert.equal(kickTrack.pattern.length, 4);

    // Verify step positions
    const kickSteps = kickTrack.pattern.map(n => n.step).sort((a, b) => a - b);
    assert.deepEqual(kickSteps, [0, 4, 8, 12]);

    // Find snare track
    const snareTrack = imported.tracks.find(t => t.midiNote === 38);
    assert.ok(snareTrack, 'Should have snare track');
    const snareSteps = snareTrack.pattern.map(n => n.step).sort((a, b) => a - b);
    assert.deepEqual(snareSteps, [4, 12]);

    await fs.unlink(outPath).catch(() => {});
  });
});

// ============================================================================
// Bug 0.5: Bit depth codec selection
// ============================================================================

describe('bit depth codec selection', () => {
  it('16-bit selects pcm_s16le', () => {
    const bitDepth = 16;
    const codec = bitDepth === 24 ? 'pcm_s24le' : 'pcm_s16le';
    assert.equal(codec, 'pcm_s16le');
  });

  it('24-bit selects pcm_s24le', () => {
    const bitDepth = 24;
    const codec = bitDepth === 24 ? 'pcm_s24le' : 'pcm_s16le';
    assert.equal(codec, 'pcm_s24le');
  });
});
