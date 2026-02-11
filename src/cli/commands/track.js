/**
 * Track command - Generate full multi-track arrangements
 * Outputs: .json + .mid + .png (+ optional .wav with --render)
 */

import fs from 'fs/promises';
import path from 'path';
import { generateArrangement, GENRE_ARRANGEMENTS } from '../../generators/arrangement-engine.js';
import { SCALES } from '../../utils/music-theory.js';
import { exportToMIDI } from '../../services/midi-service.js';
import { renderVisualization } from '../../services/track-visualizer.js';

export async function trackCommand(genre, options) {
  if (!genre) {
    console.error('Usage: beat-gen track <genre> [options]');
    console.error(`Genres: ${Object.keys(GENRE_ARRANGEMENTS).join(', ')}`);
    process.exit(1);
  }

  if (!GENRE_ARRANGEMENTS[genre]) {
    console.error(`Unknown genre: ${genre}. Available: ${Object.keys(GENRE_ARRANGEMENTS).join(', ')}`);
    process.exit(1);
  }

  const key = options.key || 'C';
  const scale = options.scale || 'minor';
  const tempo = parseInt(options.bpm || getDefaultTempo(genre));
  const resolution = parseInt(options.resolution || '16');
  const seed = options.seed ? parseInt(options.seed) : undefined;

  if (options.scale && !SCALES[options.scale]) {
    console.error(`Unknown scale: ${options.scale}. Available: ${Object.keys(SCALES).join(', ')}`);
    process.exit(1);
  }

  const trackList = options.tracks ? options.tracks.split(',') : undefined;
  const sectionOverride = options.sections ? options.sections.split(',') : undefined;
  const progression = options.progression ? options.progression.split(',').map(Number) : undefined;

  const arrangement = generateArrangement({
    genre, key, scale, tempo, resolution, trackList, sectionOverride, progression, seed,
  });

  // --json: raw arrangement to stdout
  if (options.json) {
    console.log(JSON.stringify(arrangement, null, 2));
    return;
  }

  // File output mode
  const outputDir = options.output || './output';
  await fs.mkdir(outputDir, { recursive: true });

  const baseName = `${genre}-${tempo}bpm-${key}${scale === 'minor' ? 'm' : ''}`;

  // Save JSON
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(arrangement, null, 2));

  // Save MIDI
  const midiPath = path.join(outputDir, `${baseName}.mid`);
  await exportToMIDI(arrangement, midiPath);

  // Save PNG
  const pngPath = path.join(outputDir, `${baseName}.png`);
  await renderVisualization(arrangement, pngPath);

  // Calculate duration
  const totalBars = arrangement.metadata.totalBars;
  const [numerator] = (arrangement.timeSignature || '4/4').split('/').map(Number);
  const durationSec = totalBars * numerator * (60 / tempo);
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);
  const durationStr = `${minutes}m${String(seconds).padStart(2, '0')}s`;

  const result = {
    status: 'ok',
    genre,
    key: `${key}${scale === 'minor' ? 'm' : ''}`,
    bpm: tempo,
    files: {
      pattern: jsonPath,
      midi: midiPath,
      png: pngPath,
    },
    sections: arrangement.sections.map(s => s.name),
    tracks: arrangement.tracks.map(t => t.name),
    totalBars,
    duration: durationStr,
  };

  if (!options.quiet) {
    console.log(`Track generated: ${genre} at ${tempo} BPM in ${key}${scale === 'minor' ? 'm' : ''}`);
    console.log(`  Pattern: ${jsonPath}`);
    console.log(`  MIDI: ${midiPath}`);
    console.log(`  PNG: ${pngPath}`);
    console.log(`  Sections: ${result.sections.join(', ')}`);
    console.log(`  Tracks: ${result.tracks.join(', ')}`);
    console.log(`  Duration: ${durationStr} (${totalBars} bars)`);
  }
}

function getDefaultTempo(genre) {
  const defaults = {
    house: 128, techno: 130, dnb: 170, breakbeat: 130,
    'uk-garage': 135, idm: 140, 'trip-hop': 85, ostinato: 120, reggae: 90,
  };
  return defaults[genre] || 120;
}
