/**
 * List command - Agent-friendly discovery of available options
 * All output is JSON for machine consumption
 */

import { GENRE_GENERATORS, GENRE_VARIATIONS } from '../../generators/genre-templates.js';
import { listScales, listKeys, GENRE_PROGRESSIONS } from '../../utils/music-theory.js';
import { listInstruments } from '../../utils/gm-instrument-map.js';
import { GENRE_ARRANGEMENTS } from '../../generators/arrangement-engine.js';

export async function listCommand(what, filter) {
  switch (what) {
    case 'genres':
      console.log(JSON.stringify(Object.keys(GENRE_GENERATORS)));
      break;

    case 'scales':
      console.log(JSON.stringify(listScales()));
      break;

    case 'keys':
      console.log(JSON.stringify(listKeys()));
      break;

    case 'instruments':
      console.log(JSON.stringify(listInstruments()));
      break;

    case 'progressions':
      if (filter && GENRE_PROGRESSIONS[filter]) {
        console.log(JSON.stringify(GENRE_PROGRESSIONS[filter]));
      } else {
        console.log(JSON.stringify(GENRE_PROGRESSIONS));
      }
      break;

    case 'variations':
      if (filter && GENRE_VARIATIONS[filter]) {
        console.log(JSON.stringify(GENRE_VARIATIONS[filter]));
      } else {
        console.log(JSON.stringify(GENRE_VARIATIONS));
      }
      break;

    case 'sections':
      if (filter && GENRE_ARRANGEMENTS[filter]) {
        console.log(JSON.stringify(GENRE_ARRANGEMENTS[filter]));
      } else {
        const allSections = {};
        for (const [g, sects] of Object.entries(GENRE_ARRANGEMENTS)) {
          allSections[g] = sects.map(s => ({ name: s.name, bars: s.bars, energy: s.energy }));
        }
        console.log(JSON.stringify(allSections));
      }
      break;

    case 'presets':
      console.log(JSON.stringify(['clean', 'compressed', 'dub']));
      break;

    default:
      console.error(`Unknown list target: ${what}`);
      console.error('Available: genres, scales, keys, instruments, progressions, variations, presets');
      process.exit(1);
  }
}
