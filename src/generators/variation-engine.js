/**
 * Variation Engine - Generate intro/outro/fill/chorus/breakdown/build/half-time variations
 */

import { randomRange, addGhostNotes } from './pattern-generator.js';

// ============================================================================
// Intro Variation - Sparse, build-up
// ============================================================================

export function generateIntro(mainPattern) {
  return {
    ...mainPattern,
    metadata: {
      ...mainPattern.metadata,
      variation: 'intro',
      name: `${mainPattern.metadata.name} (Intro)`
    },
    tracks: mainPattern.tracks.map(track => {
      // Keep kick and crash, sparse everything else
      if (['kick', 'crash'].includes(track.name)) {
        return track;
      }

      // Remove 50% of notes for sparse intro
      return {
        ...track,
        pattern: track.pattern.filter((_, i) => i % 2 === 0)
      };
    })
  };
}

// ============================================================================
// Outro Variation - Fade, sparse
// ============================================================================

export function generateOutro(mainPattern) {
  return {
    ...mainPattern,
    metadata: {
      ...mainPattern.metadata,
      variation: 'outro',
      name: `${mainPattern.metadata.name} (Outro)`
    },
    tracks: mainPattern.tracks.map(track => ({
      ...track,
      pattern: track.pattern
        // Reduce velocity
        .map(note => ({
          ...note,
          velocity: Math.max(40, Math.floor(note.velocity * 0.7))
        }))
        // Sparse pattern
        .filter((_, i) => i % 2 === 0)
    }))
  };
}

// ============================================================================
// Fill Variation - Drum fill pattern
// ============================================================================

export function generateFill(mainPattern) {
  const resolution = mainPattern.resolution;

  // Create fill pattern (last quarter replaced with toms/snares)
  const fillStartStep = Math.floor(resolution * 0.75);

  const tracks = mainPattern.tracks.map(track => {
    if (track.name === 'snare') {
      // Add rapid snare rolls in last quarter
      const fillNotes = [];
      for (let i = fillStartStep; i < resolution; i += 2) {
        fillNotes.push({ step: i, velocity: randomRange(100, 120) });
      }

      return {
        ...track,
        pattern: [
          ...track.pattern.filter(n => n.step < fillStartStep),
          ...fillNotes
        ]
      };
    }

    if (track.name === 'kick') {
      // Keep only kicks before fill
      return {
        ...track,
        pattern: track.pattern.filter(n => n.step < fillStartStep)
      };
    }

    return track;
  });

  // Add crash at the end
  const hasCrash = tracks.some(t => t.name === 'crash');
  if (!hasCrash) {
    tracks.push({
      name: 'crash',
      midiNote: 49,
      pattern: [{ step: resolution - 1, velocity: 127 }]
    });
  }

  return {
    ...mainPattern,
    metadata: {
      ...mainPattern.metadata,
      variation: 'fill',
      name: `${mainPattern.metadata.name} (Fill)`
    },
    tracks
  };
}

// ============================================================================
// Humanization
// ============================================================================

export function addHumanization(pattern, amount = 0.1) {
  return {
    ...pattern,
    tracks: pattern.tracks.map(track => ({
      ...track,
      pattern: track.pattern.map(note => ({
        ...note,
        velocity: clamp(
          note.velocity + randomRange(-amount * 127, amount * 127),
          1,
          127
        )
      }))
    }))
  };
}

// ============================================================================
// Ghost Notes
// ============================================================================

export function addVariability(pattern, ghostProbability = 0.15) {
  return {
    ...pattern,
    tracks: pattern.tracks.map(track => {
      // Only add ghost notes to hats and percussion
      if (['closed-hat', 'open-hat', 'rim', 'clap'].includes(track.name)) {
        return {
          ...track,
          pattern: addGhostNotes(track.pattern, pattern.resolution, ghostProbability)
        };
      }
      return track;
    })
  };
}

// ============================================================================
// Chorus Variation - More energy, ghost notes, velocity boost
// ============================================================================

export function generateChorus(mainPattern) {
  const boosted = addVariability(mainPattern, 0.2);
  return {
    ...boosted,
    metadata: {
      ...mainPattern.metadata,
      variation: 'chorus',
      name: `${mainPattern.metadata.name} (Chorus)`
    },
    tracks: boosted.tracks.map(track => ({
      ...track,
      pattern: track.pattern.map(note => ({
        ...note,
        velocity: clamp(Math.floor(note.velocity * 1.1), 1, 127)
      }))
    }))
  };
}

// ============================================================================
// Breakdown Variation - Kick only, reduced velocity
// ============================================================================

export function generateBreakdown(mainPattern) {
  return {
    ...mainPattern,
    metadata: {
      ...mainPattern.metadata,
      variation: 'breakdown',
      name: `${mainPattern.metadata.name} (Breakdown)`
    },
    tracks: mainPattern.tracks
      .filter(track => track.name === 'kick')
      .map(track => ({
        ...track,
        pattern: track.pattern.map(note => ({
          ...note,
          velocity: clamp(Math.floor(note.velocity * 0.75), 1, 127)
        }))
      }))
  };
}

// ============================================================================
// Build Variation - Progressive density, hats every step in last quarter
// ============================================================================

export function generateBuild(mainPattern) {
  const resolution = mainPattern.resolution;
  const lastQuarter = Math.floor(resolution * 0.75);

  return {
    ...mainPattern,
    metadata: {
      ...mainPattern.metadata,
      variation: 'build',
      name: `${mainPattern.metadata.name} (Build)`
    },
    tracks: mainPattern.tracks.map(track => {
      if (track.name === 'closed-hat' || track.name === 'hihat') {
        // Fill last quarter with rapid hats
        const existing = track.pattern.filter(n => n.step < lastQuarter);
        const fillNotes = [];
        for (let i = lastQuarter; i < resolution; i++) {
          fillNotes.push({
            step: i,
            velocity: 60 + Math.floor((i - lastQuarter) / (resolution - lastQuarter) * 50)
          });
        }
        return { ...track, pattern: [...existing, ...fillNotes] };
      }

      if (track.name === 'snare') {
        // Add snare rolls in last quarter
        const existing = track.pattern.filter(n => n.step < lastQuarter);
        const rollNotes = [];
        for (let i = lastQuarter; i < resolution; i += 2) {
          rollNotes.push({ step: i, velocity: 80 + Math.floor((i - lastQuarter) * 3) });
        }
        return { ...track, pattern: [...existing, ...rollNotes] };
      }

      return track;
    })
  };
}

// ============================================================================
// Half-time Variation - Keep only notes on even beats (0, 8 in 16-step)
// ============================================================================

export function generateHalfTime(mainPattern) {
  const resolution = mainPattern.resolution;
  const beatLen = resolution / 4;

  return {
    ...mainPattern,
    metadata: {
      ...mainPattern.metadata,
      variation: 'half-time',
      name: `${mainPattern.metadata.name} (Half-time)`
    },
    tracks: mainPattern.tracks.map(track => {
      if (track.name === 'kick') {
        // Keep only downbeats (beat 1 and 3)
        return {
          ...track,
          pattern: track.pattern.filter(n => n.step === 0 || n.step === beatLen * 2)
        };
      }
      // Keep notes that fall on even beats only
      return {
        ...track,
        pattern: track.pattern.filter(n => {
          const beatPos = n.step / beatLen;
          return beatPos === Math.floor(beatPos) && Math.floor(beatPos) % 2 === 0;
        })
      };
    })
  };
}

// ============================================================================
// Orchestrators - Generate all variants and merge into multi-pattern format
// ============================================================================

/**
 * Generate all drum pattern variants from a main pattern
 * @param {Object} mainPattern - Full drum pattern with .tracks[]
 * @returns {Object} { main: pattern, intro: pattern, chorus: pattern, ... }
 */
export function generateAllDrumVariants(mainPattern) {
  return {
    main:      mainPattern,
    intro:     generateIntro(mainPattern),
    chorus:    generateChorus(mainPattern),
    fill:      generateFill(mainPattern),
    breakdown: generateBreakdown(mainPattern),
    build:     generateBuild(mainPattern),
    'half-time': generateHalfTime(mainPattern),
    outro:     generateOutro(mainPattern),
  };
}

/**
 * Merge per-variant drum patterns into multi-pattern track format.
 * Input:  { main: { tracks: [{name:'kick', pattern:[...]}] }, intro: { tracks: [...] }, ... }
 * Output: [{ name: 'kick', patterns: { main: [...], intro: [...], ... }, pattern: [...] }]
 *
 * The `pattern` field is kept for backward compat (set to main pattern).
 */
export function mergeDrumVariants(variants) {
  // Collect all unique drum track names from the main variant
  const mainTracks = variants.main.tracks;
  const allTrackNames = [...new Set(mainTracks.map(t => t.name))];

  return allTrackNames.map(trackName => {
    const mainTrack = mainTracks.find(t => t.name === trackName);
    const patterns = {};

    for (const [variantName, variantPattern] of Object.entries(variants)) {
      const varTrack = variantPattern.tracks.find(t => t.name === trackName);
      if (varTrack) {
        patterns[variantName] = varTrack.pattern;
      }
    }

    return {
      name: trackName,
      midiNote: mainTrack.midiNote,
      channel: mainTrack.channel,
      instrument: mainTrack.instrument,
      patterns,
      pattern: mainTrack.pattern, // legacy fallback
    };
  });
}

// ============================================================================
// Utilities
// ============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
