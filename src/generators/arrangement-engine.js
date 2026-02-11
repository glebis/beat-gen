/**
 * Arrangement Engine - Generate full track arrangements with sections
 */

import { GENRE_GENERATORS } from './genre-templates.js';
import { generateIntro, generateOutro, generateFill } from './variation-engine.js';
import { generateBass } from './bass-generator.js';
import { generateMelody } from './melody-generator.js';
import { createPattern } from './pattern-generator.js';
import { GENRE_PROGRESSIONS, keyToSemitone } from '../utils/music-theory.js';

// ============================================================================
// Seeded random
// ============================================================================

function createRng(seed) {
  let s = seed || Math.floor(Math.random() * 2147483647);
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ============================================================================
// Genre-defined section templates
// ============================================================================

export const GENRE_ARRANGEMENTS = {
  house: [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
    { name: 'build',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.5 },
    { name: 'drop',      bars: 16, tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 1.0 },
    { name: 'breakdown', bars: 8,  tracks: ['pad'],                            energy: 0.2 },
    { name: 'drop2',     bars: 16, tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.4 },
  ],
  techno: [
    { name: 'intro',     bars: 16, tracks: ['drums'],                          energy: 0.3 },
    { name: 'build',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.6 },
    { name: 'drop',      bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'breakdown', bars: 8,  tracks: ['pad'],                            energy: 0.2 },
    { name: 'drop2',     bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
  ],
  dnb: [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.4 },
    { name: 'build',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.7 },
    { name: 'drop',      bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'breakdown', bars: 8,  tracks: ['pad'],                            energy: 0.2 },
    { name: 'drop2',     bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
  ],
  breakbeat: [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.4 },
    { name: 'verse',     bars: 16, tracks: ['drums', 'bass'],                  energy: 0.6 },
    { name: 'drop',      bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'bridge',    bars: 8,  tracks: ['drums', 'pad'],                   energy: 0.4 },
    { name: 'drop2',     bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
  ],
  'uk-garage': [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
    { name: 'verse',     bars: 16, tracks: ['drums', 'bass', 'pad'],           energy: 0.6 },
    { name: 'chorus',    bars: 16, tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 1.0 },
    { name: 'verse2',    bars: 16, tracks: ['drums', 'bass', 'pad'],           energy: 0.6 },
    { name: 'chorus2',   bars: 16, tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.4 },
  ],
  idm: [
    { name: 'intro',     bars: 4,  tracks: ['pad'],                            energy: 0.2 },
    { name: 'part-a',    bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 0.8 },
    { name: 'interlude', bars: 8,  tracks: ['pad', 'lead'],                    energy: 0.4 },
    { name: 'part-b',    bars: 16, tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 1.0 },
    { name: 'outro',     bars: 4,  tracks: ['pad'],                            energy: 0.2 },
  ],
  'trip-hop': [
    { name: 'intro',     bars: 8,  tracks: ['pad'],                            energy: 0.2 },
    { name: 'verse',     bars: 16, tracks: ['drums', 'bass', 'pad'],           energy: 0.5 },
    { name: 'chorus',    bars: 8,  tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 0.7 },
    { name: 'verse2',    bars: 16, tracks: ['drums', 'bass', 'pad'],           energy: 0.5 },
    { name: 'chorus2',   bars: 8,  tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 0.7 },
    { name: 'outro',     bars: 8,  tracks: ['pad'],                            energy: 0.2 },
  ],
  ostinato: [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
    { name: 'build',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.6 },
    { name: 'main',      bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 0.9 },
    { name: 'variation', bars: 16, tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.4 },
  ],
  reggae: [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
    { name: 'verse',     bars: 16, tracks: ['drums', 'bass', 'pad'],           energy: 0.6 },
    { name: 'chorus',    bars: 8,  tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 0.8 },
    { name: 'verse2',    bars: 16, tracks: ['drums', 'bass', 'pad'],           energy: 0.6 },
    { name: 'chorus2',   bars: 8,  tracks: ['drums', 'bass', 'lead', 'pad'],   energy: 0.8 },
    { name: 'dub',       bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.5 },
    { name: 'outro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
  ],
};

// ============================================================================
// Main generator
// ============================================================================

/**
 * Generate a full track arrangement
 * @param {Object} opts
 * @param {string} opts.genre
 * @param {string} opts.key
 * @param {string} opts.scale
 * @param {number} opts.tempo
 * @param {number} opts.resolution
 * @param {string[]} [opts.trackList] - Override which tracks to include
 * @param {string[]} [opts.sectionOverride] - Override section order
 * @param {number[]} [opts.progression]
 * @param {number} [opts.seed]
 * @returns {Object} Full arrangement pattern
 */
export function generateArrangement(opts) {
  const { genre, key, scale, tempo, resolution, seed } = opts;
  const rng = createRng(seed);

  // Get section template
  let sections = GENRE_ARRANGEMENTS[genre] || GENRE_ARRANGEMENTS.house;

  // Apply section override if provided
  if (opts.sectionOverride) {
    sections = opts.sectionOverride.map(name => {
      const template = sections.find(s => s.name === name);
      return template || { name, bars: 8, tracks: ['drums'], energy: 0.5 };
    });
  }

  // Determine which tracks to generate
  const requestedTracks = opts.trackList || null;
  const allNeeded = new Set();
  for (const s of sections) {
    for (const t of s.activeTracks || s.tracks) {
      allNeeded.add(t);
    }
  }

  // Generate drum pattern
  const drumGenerator = GENRE_GENERATORS[genre] || GENRE_GENERATORS.house;
  const drumPattern = drumGenerator();
  const drumTracks = drumPattern.tracks;

  // Generate pitched tracks
  const progression = opts.progression || pickProgression(genre, rng);
  const pitchedOpts = { genre, key, scale, resolution, tempo: tempo, progression, seed: seed ? seed + 1 : undefined };

  const tracks = [...drumTracks];
  const pitchedTrackNames = ['bass', 'lead', 'pad'];

  for (const name of pitchedTrackNames) {
    if (requestedTracks && !requestedTracks.includes(name) && !requestedTracks.includes('all')) continue;
    if (!allNeeded.has(name) && !requestedTracks) continue;

    if (name === 'bass') {
      tracks.push(generateBass({ ...pitchedOpts, seed: seed ? seed + 2 : undefined }));
    } else {
      tracks.push(generateMelody({
        ...pitchedOpts,
        instrument: name,
        seed: seed ? seed + 3 + pitchedTrackNames.indexOf(name) : undefined,
      }));
    }
  }

  // Build sections with activeTracks
  const arrangedSections = sections.map(s => {
    const activeTracks = (s.activeTracks || s.tracks).filter(t => {
      if (t === 'drums') return true;
      return tracks.some(tr => tr.name === t);
    });

    return {
      name: s.name,
      bars: s.bars,
      activeTracks,
      energy: s.energy,
    };
  });

  const totalBars = arrangedSections.reduce((sum, s) => sum + s.bars, 0);

  return {
    version: '2.0',
    key: `${key}${scale === 'minor' ? 'm' : ''}`,
    scale,
    tempo,
    timeSignature: drumPattern.timeSignature || '4/4',
    resolution,
    metadata: {
      genre,
      generatedBy: 'beat-gen track',
      totalBars,
      progression,
    },
    tracks,
    sections: arrangedSections,
  };
}

function pickProgression(genre, rng) {
  const progs = GENRE_PROGRESSIONS[genre] || [[1]];
  const idx = Math.floor(rng() * progs.length);
  return progs[idx];
}
