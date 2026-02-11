/**
 * Tests for track visualizer
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderVisualization } from '../../src/services/track-visualizer.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('track visualizer', () => {
  it('renders a simple pattern to PNG', async () => {
    const outPath = path.join(os.tmpdir(), 'test-viz-simple.png');
    const pattern = {
      version: '2.0',
      key: 'Cm',
      scale: 'minor',
      tempo: 128,
      timeSignature: '4/4',
      resolution: 16,
      metadata: { genre: 'house' },
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [
          { step: 0, velocity: 127 }, { step: 4, velocity: 127 },
          { step: 8, velocity: 127 }, { step: 12, velocity: 127 },
        ]},
        { name: 'snare', midiNote: 38, pattern: [
          { step: 4, velocity: 110 }, { step: 12, velocity: 110 },
        ]},
      ],
    };

    await renderVisualization(pattern, outPath);
    const stat = await fs.stat(outPath);
    assert.ok(stat.size > 0, 'PNG file should not be empty');
    await fs.unlink(outPath).catch(() => {});
  });

  it('renders arrangement with sections', async () => {
    const outPath = path.join(os.tmpdir(), 'test-viz-arrangement.png');
    const pattern = {
      version: '2.0',
      key: 'Cm',
      scale: 'minor',
      tempo: 128,
      timeSignature: '4/4',
      resolution: 16,
      metadata: { genre: 'house' },
      tracks: [
        { name: 'kick', midiNote: 36, pattern: [{ step: 0, velocity: 127 }] },
        { name: 'bass', midiNote: 36, channel: 2, instrument: 39,
          pattern: [{ step: 0, velocity: 100, pitch: 36, duration: 4 }] },
      ],
      sections: [
        { name: 'intro', bars: 8, activeTracks: ['drums'], energy: 0.3 },
        { name: 'drop', bars: 16, activeTracks: ['drums', 'bass'], energy: 1.0 },
        { name: 'outro', bars: 8, activeTracks: ['drums'], energy: 0.4 },
      ],
    };

    await renderVisualization(pattern, outPath);
    const stat = await fs.stat(outPath);
    assert.ok(stat.size > 1000, 'Arrangement PNG should be substantial');
    await fs.unlink(outPath).catch(() => {});
  });

  it('respects custom dimensions', async () => {
    const outPath = path.join(os.tmpdir(), 'test-viz-custom-size.png');
    const pattern = {
      version: '1.0',
      tempo: 120,
      timeSignature: '4/4',
      resolution: 16,
      metadata: { genre: 'techno' },
      tracks: [{ name: 'kick', midiNote: 36, pattern: [{ step: 0, velocity: 127 }] }],
    };

    await renderVisualization(pattern, outPath, { width: 800, height: 400 });
    const stat = await fs.stat(outPath);
    assert.ok(stat.size > 0);
    await fs.unlink(outPath).catch(() => {});
  });
});
