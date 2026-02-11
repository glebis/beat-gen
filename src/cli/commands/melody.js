/**
 * Melody command - Generate genre-specific melody/pad/arp patterns
 */

import { generateMelody, MELODY_PROFILES } from '../../generators/melody-generator.js';
import { SCALES } from '../../utils/music-theory.js';
import { GM_INSTRUMENTS } from '../../utils/gm-instrument-map.js';
import fs from 'fs/promises';

export async function melodyCommand(options) {
  if (options.listInstruments) {
    console.log(JSON.stringify(Object.keys(GM_INSTRUMENTS)));
    return;
  }

  const { genre = 'house', key = 'C', scale = 'minor', bpm = 128, resolution = 16, instrument = 'lead', seed } = options;

  if (!MELODY_PROFILES[genre]) {
    console.error(`Unknown genre: ${genre}. Available: ${Object.keys(MELODY_PROFILES).join(', ')}`);
    process.exit(1);
  }
  if (!SCALES[scale]) {
    console.error(`Unknown scale: ${scale}. Available: ${Object.keys(SCALES).join(', ')}`);
    process.exit(1);
  }

  const melody = generateMelody({
    genre, key, scale,
    resolution: parseInt(resolution),
    tempo: parseInt(bpm),
    instrument,
    seed: seed ? parseInt(seed) : undefined,
  });

  const output = {
    version: '2.0',
    key: `${key}${scale === 'minor' ? 'm' : ''}`,
    scale,
    tempo: parseInt(bpm),
    timeSignature: '4/4',
    resolution: parseInt(resolution),
    metadata: { genre, generatedBy: 'beat-gen melody' },
    tracks: [melody],
  };

  if (options.json || !options.output) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    await fs.writeFile(options.output, JSON.stringify(output, null, 2));
    console.log(`Melody pattern written to ${options.output}`);
  }
}
