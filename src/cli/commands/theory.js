/**
 * Theory command - Music theory utilities
 */

import {
  listScales, listKeys, listProgressions,
  getScaleNotes, SCALES
} from '../../utils/music-theory.js';

export async function theoryCommand(options) {
  if (options.listScales) {
    const scales = listScales();
    console.log(JSON.stringify(scales));
    return;
  }

  if (options.listKeys) {
    const keys = listKeys();
    console.log(JSON.stringify(keys));
    return;
  }

  if (options.listProgressions !== undefined) {
    const genre = typeof options.listProgressions === 'string' ? options.listProgressions : null;
    const progs = listProgressions(genre);
    if (!progs) {
      console.error(`Unknown genre: ${genre}`);
      process.exit(1);
    }
    console.log(JSON.stringify(progs));
    return;
  }

  if (options.scale) {
    const parts = options.scale.split(/\s+/);
    if (parts.length < 2) {
      console.error('Usage: --scale "C minor" or --scale "F# dorian"');
      process.exit(1);
    }
    const key = parts[0];
    const scaleName = parts[1];

    if (!SCALES[scaleName]) {
      console.error(`Unknown scale: ${scaleName}. Available: ${listScales().join(', ')}`);
      process.exit(1);
    }

    const [lo, hi] = (options.octave || '2-4').split('-').map(Number);
    const notes = getScaleNotes(key, scaleName, lo, hi);
    console.log(JSON.stringify(notes));
    return;
  }

  console.log('Use --list-scales, --list-keys, --list-progressions, or --scale');
}
