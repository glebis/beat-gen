import { getDrumNote } from '../utils/gm-drum-map.js';

/**
 * Parse text pattern notation into structured format
 * Format: "kick: X...X...X...X..."
 */
export function parseTextPattern(text, defaultVelocity = 100) {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const tracks = [];

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.includes(':')) continue;

    const [drumName, patternStr] = line.split(':').map(s => s.trim());

    if (!patternStr) continue;

    const steps = parsePatternString(patternStr, defaultVelocity);

    tracks.push({
      name: drumName,
      midiNote: getDrumNote(drumName),
      pattern: steps,
    });
  }

  return tracks;
}

/**
 * Parse pattern string into step objects
 * X = hit (100 velocity), x = soft hit (60 velocity), . = rest
 * Numbers = custom velocity (1-9 maps to 10-90)
 */
function parsePatternString(patternStr, defaultVelocity) {
  const steps = [];
  const chars = patternStr.replace(/\s/g, ''); // Remove whitespace

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (char === 'X') {
      steps.push({ step: i, velocity: defaultVelocity });
    } else if (char === 'x') {
      steps.push({ step: i, velocity: 60 });
    } else if (char >= '1' && char <= '9') {
      steps.push({ step: i, velocity: parseInt(char) * 10 });
    }
    // '.' or any other char = rest (skip)
  }

  return steps;
}

/**
 * Parse JSON pattern file
 */
export function parseJSONPattern(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;

  // Validate required fields
  if (!data.tracks || !Array.isArray(data.tracks)) {
    throw new Error('JSON pattern must have "tracks" array');
  }

  // Normalize track data
  const tracks = data.tracks.map(track => {
    if (!track.name) {
      throw new Error('Each track must have a "name" field');
    }

    // Get MIDI note if not provided
    const midiNote = track.midiNote || getDrumNote(track.name);

    return {
      name: track.name,
      midiNote,
      pattern: track.pattern || [],
    };
  });

  // Determine tempo: data.tempo > metadata.suggestedBPM > undefined (let caller decide)
  const tempo = data.tempo !== undefined ? data.tempo :
                data.metadata?.suggestedBPM !== undefined ? data.metadata.suggestedBPM :
                undefined;

  return {
    tempo,
    timeSignature: data.timeSignature || '4/4',
    resolution: data.resolution || 16, // 16th notes by default
    swing: data.swing || 0,
    tracks,
    metadata: data.metadata, // Preserve metadata
  };
}

/**
 * Convert pattern to text notation
 */
export function patternToText(pattern) {
  const lines = [];
  const resolution = pattern.resolution || 16;

  for (const track of pattern.tracks) {
    const chars = new Array(resolution).fill('.');

    for (const { step, velocity } of track.pattern) {
      if (step < resolution) {
        if (velocity >= 90) chars[step] = 'X';
        else if (velocity >= 70) chars[step] = 'x';
        else chars[step] = Math.floor(velocity / 10).toString();
      }
    }

    lines.push(`${track.name}: ${chars.join('')}`);
  }

  return lines.join('\n');
}

/**
 * Apply swing/shuffle to pattern
 * swing: 0 = straight, 0.5 = moderate swing, 0.66 = heavy shuffle
 */
export function applySwing(pattern, swingAmount) {
  if (swingAmount === 0) return pattern;

  const swungTracks = pattern.tracks.map(track => {
    const swungPattern = track.pattern.map(note => {
      // Apply swing to off-beats (odd-numbered steps)
      if (note.step % 2 === 1) {
        return {
          ...note,
          step: note.step + swingAmount,
        };
      }
      return note;
    });

    return {
      ...track,
      pattern: swungPattern,
    };
  });

  return {
    ...pattern,
    tracks: swungTracks,
  };
}
