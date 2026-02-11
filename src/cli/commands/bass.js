/**
 * Bass command - Generate genre-specific bass patterns
 */

import { generateBass, BASS_MODES } from '../../generators/bass-generator.js';
import { SCALES } from '../../utils/music-theory.js';
import fs from 'fs/promises';

export async function bassCommand(options) {
  if (options.listModes) {
    console.log(JSON.stringify(BASS_MODES));
    return;
  }

  const { genre = 'house', key = 'C', scale = 'minor', bpm = 128, resolution = 16, seed } = options;
  const progression = options.progression ? options.progression.split(',').map(Number) : undefined;

  if (!BASS_MODES[genre]) {
    console.error(`Unknown genre: ${genre}. Available: ${Object.keys(BASS_MODES).join(', ')}`);
    process.exit(1);
  }
  if (!SCALES[scale]) {
    console.error(`Unknown scale: ${scale}. Available: ${Object.keys(SCALES).join(', ')}`);
    process.exit(1);
  }

  const bass = generateBass({ genre, key, scale, resolution: parseInt(resolution), tempo: parseInt(bpm), progression, seed: seed ? parseInt(seed) : undefined });

  const output = {
    version: '2.0',
    key: `${key}${scale === 'minor' ? 'm' : ''}`,
    scale,
    tempo: parseInt(bpm),
    timeSignature: '4/4',
    resolution: parseInt(resolution),
    metadata: { genre, generatedBy: 'beat-gen bass' },
    tracks: [bass],
  };

  if (options.json || !options.output) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    await fs.writeFile(options.output, JSON.stringify(output, null, 2));
    console.log(`Bass pattern written to ${options.output}`);
  }
}
