/**
 * Arrangement Engine - Generate full track arrangements with sections
 */

import { GENRE_GENERATORS } from './genre-templates.js';
import { generateAllDrumVariants, mergeDrumVariants } from './variation-engine.js';
import { generateBass, generateBassForSection } from './bass-generator.js';
import { generateMelody } from './melody-generator.js';
import { generateTexture } from './texture-generator.js';
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
    { name: 'breakdown', bars: 8,  tracks: ['pad', 'atmosphere'],              energy: 0.15 },
    { name: 'drop2',     bars: 16, tracks: ['drums', 'bass', 'lead', 'pad', 'vocalChop'], energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums', 'bass'],                  energy: 0.4 },
  ],
  techno: [
    { name: 'intro',     bars: 16, tracks: ['drums'],                          energy: 0.3 },
    { name: 'build',     bars: 8,  tracks: ['drums', 'bass', 'noise'],         energy: 0.6 },
    { name: 'drop',      bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'breakdown', bars: 8,  tracks: ['pad', 'atmosphere'],              energy: 0.15 },
    { name: 'build2',    bars: 4,  tracks: ['drums', 'noise'],                 energy: 0.7 },
    { name: 'drop2',     bars: 16, tracks: ['drums', 'bass', 'lead', 'stab', 'texture'], energy: 1.0 },
    { name: 'outro',     bars: 8,  tracks: ['drums'],                          energy: 0.3 },
  ],
  dnb: [
    { name: 'intro',     bars: 8,  tracks: ['drums'],                          energy: 0.4 },
    { name: 'build',     bars: 8,  tracks: ['drums', 'bass', 'noise'],         energy: 0.7 },
    { name: 'drop',      bars: 16, tracks: ['drums', 'bass', 'lead'],          energy: 1.0 },
    { name: 'breakdown', bars: 8,  tracks: ['pad', 'atmosphere'],              energy: 0.2 },
    { name: 'bass-drop', bars: 4,  tracks: ['bass', 'stab'],                   energy: 0.9 },
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
    { name: 'intro',      bars: 8,  tracks: ['drums'],                                               energy: 0.3 },
    { name: 'verse',      bars: 8,  tracks: ['drums', 'bass', 'pad'],                                energy: 0.5 },
    { name: 'bass-drop',  bars: 4,  tracks: ['bass'],                                                energy: 0.9 },
    { name: 'chorus',     bars: 16, tracks: ['drums', 'bass', 'lead', 'pad', 'vocalChop', 'stab'],   energy: 1.0 },
    { name: 'breakdown',  bars: 4,  tracks: ['pad', 'atmosphere'],                                   energy: 0.15 },
    { name: 'build',      bars: 4,  tracks: ['drums', 'noise'],                                      energy: 0.7 },
    { name: 'bass-drop2', bars: 4,  tracks: ['bass', 'scratch'],                                     energy: 0.9 },
    { name: 'chorus2',    bars: 16, tracks: ['drums', 'bass', 'lead', 'pad', 'vocalChop', 'texture'], energy: 1.0 },
    { name: 'outro',      bars: 4,  tracks: ['pad', 'atmosphere'],                                   energy: 0.3 },
  ],
  idm: [
    { name: 'intro',     bars: 4,  tracks: ['pad', 'atmosphere'],              energy: 0.2 },
    { name: 'part-a',    bars: 16, tracks: ['drums', 'bass', 'lead', 'texture'], energy: 0.8 },
    { name: 'interlude', bars: 8,  tracks: ['pad', 'lead', 'noise'],           energy: 0.4 },
    { name: 'part-b',    bars: 16, tracks: ['drums', 'bass', 'lead', 'pad', 'scratch', 'vocalChop'], energy: 1.0 },
    { name: 'outro',     bars: 4,  tracks: ['pad', 'atmosphere'],              energy: 0.2 },
  ],
  'trip-hop': [
    { name: 'intro',      bars: 8,  tracks: ['pad', 'atmosphere'],                          energy: 0.2 },
    { name: 'verse',      bars: 16, tracks: ['drums', 'bass', 'pad'],                       energy: 0.5 },
    { name: 'build',      bars: 4,  tracks: ['drums', 'bass', 'noise'],                     energy: 0.6 },
    { name: 'chorus',     bars: 8,  tracks: ['drums', 'bass', 'lead', 'pad', 'vocalChop'],  energy: 0.7 },
    { name: 'breakdown',  bars: 8,  tracks: ['pad', 'atmosphere', 'texture'],                energy: 0.15 },
    { name: 'verse2',     bars: 16, tracks: ['drums', 'bass', 'pad', 'stab'],               energy: 0.55 },
    { name: 'bass-solo',  bars: 4,  tracks: ['bass', 'scratch'],                            energy: 0.8 },
    { name: 'chorus2',    bars: 8,  tracks: ['drums', 'bass', 'lead', 'pad', 'vocalChop', 'texture'], energy: 0.7 },
    { name: 'outro',      bars: 8,  tracks: ['pad', 'atmosphere'],                          energy: 0.2 },
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
// Extra track definitions per genre
// ============================================================================

const GENRE_EXTRA_TRACKS = {
  'uk-garage': ['vocalChop', 'stab', 'texture', 'atmosphere', 'noise', 'scratch'],
  house:       ['vocalChop', 'stab', 'atmosphere'],
  techno:      ['noise', 'stab', 'texture', 'atmosphere'],
  dnb:         ['stab', 'noise', 'atmosphere'],
  idm:         ['texture', 'noise', 'scratch', 'vocalChop', 'atmosphere'],
  'trip-hop':  ['atmosphere', 'vocalChop', 'texture', 'noise', 'stab', 'scratch'],
  breakbeat:   ['stab', 'noise'],
  ostinato:    ['atmosphere', 'texture'],
  reggae:      ['atmosphere'],
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
 * @param {number} [opts.variety=0.5] - 0-1, controls extra tracks and section variation
 * @param {number} [opts.density=0.5] - 0-1, controls note density
 * @param {number} [opts.duration] - Target duration in seconds
 * @returns {Object} Full arrangement pattern
 */
// ============================================================================
// Section-to-drum-variant mapping
// Maps section name patterns to drum variant names from variation-engine
// ============================================================================

const SECTION_DRUM_VARIANT = {
  'intro':     'intro',
  'verse':     'main',
  'verse2':    'main',
  'build':     'build',
  'build2':    'build',
  'drop':      'chorus',
  'drop2':     'chorus',
  'chorus':    'chorus',
  'chorus2':   'chorus',
  'breakdown': 'breakdown',
  'bridge':    'half-time',
  'interlude': 'half-time',
  'bass-drop': 'breakdown',
  'bass-drop2':'breakdown',
  'bass-solo': 'breakdown',
  'dub':       'half-time',
  'outro':     'outro',
  'part-a':    'main',
  'part-b':    'chorus',
  'main':      'main',
  'variation': 'chorus',
};

// Section-to-melody density mapping
const SECTION_MELODY_VARIANT = {
  'intro': 'sparse', 'outro': 'sparse', 'breakdown': 'sparse', 'bridge': 'sparse',
  'interlude': 'sparse', 'verse': 'main', 'verse2': 'main', 'dub': 'sparse',
  'part-a': 'main', 'main': 'main',
  'chorus': 'dense', 'chorus2': 'dense', 'drop': 'dense', 'drop2': 'dense',
  'build': 'dense', 'build2': 'dense', 'part-b': 'dense', 'variation': 'dense',
};

export function generateArrangement(opts) {
  const { genre, key, scale, tempo, resolution, seed } = opts;
  const variety = opts.variety ?? 0.5;
  const density = opts.density ?? 0.5;
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

  // Adjust to target duration if specified
  if (opts.duration) {
    sections = adjustToTargetDuration(sections, tempo, opts.duration);
  }

  // Determine which tracks to generate
  const requestedTracks = opts.trackList || null;
  const allNeeded = new Set();
  for (const s of sections) {
    for (const t of s.activeTracks || s.tracks) {
      allNeeded.add(t);
    }
  }

  // ── Drums: generate main + all variants, merge into multi-pattern ──
  const drumGenerator = GENRE_GENERATORS[genre] || GENRE_GENERATORS.house;
  const drumPattern = drumGenerator();
  const drumVariants = generateAllDrumVariants(drumPattern);
  const drumTracks = mergeDrumVariants(drumVariants);

  // ── Pitched tracks with multi-pattern support ──
  const progression = opts.progression || pickProgression(genre, rng);
  const pitchedOpts = { genre, key, scale, resolution, tempo, progression, seed: seed ? seed + 1 : undefined };

  const tracks = [...drumTracks];
  const pitchedTrackNames = ['bass', 'lead', 'pad'];

  // Collect unique section types for per-section generation
  const uniqueSections = [];
  const seenNames = new Set();
  for (const s of sections) {
    // Normalize section names (verse2 -> verse for bass style matching)
    const baseName = s.name.replace(/\d+$/, '');
    if (!seenNames.has(s.name)) {
      seenNames.add(s.name);
      uniqueSections.push({ name: s.name, baseName, energy: s.energy });
    }
  }

  for (const name of pitchedTrackNames) {
    if (requestedTracks && !requestedTracks.includes(name) && !requestedTracks.includes('all')) continue;
    if (!allNeeded.has(name) && !requestedTracks) continue;

    if (name === 'bass') {
      // Generate bass per unique section type
      const bassPatterns = {};
      const bassSeed = seed ? seed + 2 : undefined;
      for (const sec of uniqueSections) {
        if (!(sec.name === 'drums' || sections.find(s => s.name === sec.name)?.tracks?.includes('bass'))) continue;
        const bassSectionSeed = bassSeed ? bassSeed + uniqueSections.indexOf(sec) : undefined;
        const bassTrack = generateBassForSection(
          { ...pitchedOpts, seed: bassSectionSeed },
          sec.baseName,
          sec.energy
        );
        bassPatterns[sec.name] = bassTrack.pattern;
      }
      // Always ensure a 'main' key exists for fallback
      if (!bassPatterns.main) {
        const mainBass = generateBass({ ...pitchedOpts, seed: bassSeed });
        bassPatterns.main = mainBass.pattern;
      }
      const refBass = generateBass({ ...pitchedOpts, seed: bassSeed });
      tracks.push({
        name: 'bass',
        midiNote: refBass.midiNote,
        channel: refBass.channel,
        instrument: refBass.instrument,
        patterns: bassPatterns,
        pattern: bassPatterns.main || refBass.pattern,
      });
    } else {
      // Melody/pad: generate sparse/main/dense variants
      const instSeed = seed ? seed + 3 + pitchedTrackNames.indexOf(name) : undefined;
      const mainTrack = generateMelody({
        ...pitchedOpts, instrument: name, seed: instSeed,
      });
      const sparseTrack = generateMelody({
        ...pitchedOpts, instrument: name,
        seed: instSeed ? instSeed + 100 : undefined,
        density: density * 0.5,
      });
      const denseTrack = generateMelody({
        ...pitchedOpts, instrument: name,
        seed: instSeed ? instSeed + 200 : undefined,
        density: Math.min(1, density * 1.5),
      });
      tracks.push({
        ...mainTrack,
        patterns: {
          main: mainTrack.pattern,
          sparse: sparseTrack.pattern,
          dense: denseTrack.pattern,
        },
      });
    }
  }

  // ── Extra texture tracks: generate per section that uses them ──
  const extraTrackNames = GENRE_EXTRA_TRACKS[genre] || [];
  const numExtras = Math.round(variety * extraTrackNames.length);
  const selectedExtras = extraTrackNames.slice(0, numExtras);

  let extraSeedOffset = 10;
  for (const extraName of selectedExtras) {
    if (!allNeeded.has(extraName)) continue;
    if (requestedTracks && !requestedTracks.includes(extraName) && !requestedTracks.includes('all')) continue;

    const sectionsUsingTrack = sections.filter(s => (s.tracks || []).includes(extraName));
    if (sectionsUsingTrack.length === 0) continue;

    const texturePatterns = {};
    let refTrack = null;

    for (const sec of sectionsUsingTrack) {
      const texSeed = seed ? seed + extraSeedOffset++ : undefined;
      const texTrack = generateTexture(extraName, {
        resolution,
        sectionName: sec.name,
        energy: sec.energy,
        density,
        seed: texSeed,
      });
      texturePatterns[sec.name] = texTrack.pattern;
      if (!refTrack) refTrack = texTrack;
    }

    // Also generate a 'main' fallback from the highest-energy section
    const bestSection = sectionsUsingTrack.sort((a, b) => b.energy - a.energy)[0];
    if (!texturePatterns.main && bestSection) {
      texturePatterns.main = texturePatterns[bestSection.name];
    }

    tracks.push({
      name: refTrack.name,
      midiNote: refTrack.midiNote,
      channel: refTrack.channel,
      instrument: refTrack.instrument,
      patterns: texturePatterns,
      pattern: texturePatterns.main || refTrack.pattern,
    });
  }

  // Build sections with activeTracks + patternVariant for drums and melody
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
      drumVariant: SECTION_DRUM_VARIANT[s.name] || SECTION_DRUM_VARIANT[s.name.replace(/\d+$/, '')] || 'main',
      melodyVariant: SECTION_MELODY_VARIANT[s.name] || SECTION_MELODY_VARIANT[s.name.replace(/\d+$/, '')] || 'main',
    };
  });

  const totalBars = arrangedSections.reduce((sum, s) => sum + s.bars, 0);

  return {
    version: '2.1',
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
      variety,
      density,
    },
    tracks,
    sections: arrangedSections,
  };
}

// ============================================================================
// Duration targeting
// ============================================================================

/**
 * Adjust section bar counts to hit a target duration
 * @param {Array} sections - Section template array
 * @param {number} tempo - BPM
 * @param {number} targetSeconds - Desired duration in seconds
 * @returns {Array} Adjusted sections
 */
function adjustToTargetDuration(sections, tempo, targetSeconds) {
  const beatsPerBar = 4; // Assume 4/4
  const secPerBar = (beatsPerBar * 60) / tempo;
  const currentBars = sections.reduce((sum, s) => sum + s.bars, 0);
  const currentDuration = currentBars * secPerBar;

  const ratio = targetSeconds / currentDuration;

  // If within 10% tolerance, don't adjust
  if (ratio >= 0.9 && ratio <= 1.1) return sections;

  // Scale bar counts proportionally, keeping minimum of 2 bars
  return sections.map(s => ({
    ...s,
    bars: Math.max(2, Math.round(s.bars * ratio)),
  }));
}

function pickProgression(genre, rng) {
  const progs = GENRE_PROGRESSIONS[genre] || [[1]];
  const idx = Math.floor(rng() * progs.length);
  return progs[idx];
}
