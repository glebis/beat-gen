/**
 * Variation Engine - Generate intro/outro/fill variations
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
// Utilities
// ============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
