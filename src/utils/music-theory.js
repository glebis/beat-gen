/**
 * Music Theory Module
 * Scales, notes, chords, and genre-specific progressions
 */

// ============================================================================
// Constants
// ============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const FLAT_TO_SHARP = {
  'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#',
  'Ab': 'G#', 'Bb': 'A#',
};

// ============================================================================
// Scales (semitone intervals from root)
// ============================================================================

export const SCALES = {
  minor:           [0, 2, 3, 5, 7, 8, 10],
  dorian:          [0, 2, 3, 5, 7, 9, 10],
  phrygian:        [0, 1, 3, 5, 7, 8, 10],
  mixolydian:      [0, 2, 4, 5, 7, 9, 10],
  pentatonicMinor: [0, 3, 5, 7, 10],
  blues:           [0, 3, 5, 6, 7, 10],
  harmonicMinor:   [0, 2, 3, 5, 7, 8, 11],
  major:           [0, 2, 4, 5, 7, 9, 11],
};

// ============================================================================
// Chord progressions per genre (scale degrees)
// ============================================================================

export const GENRE_PROGRESSIONS = {
  house:      [[1, 4], [1, 6, 4, 5], [1, 4, 5, 1]],
  techno:     [[1], [1, 6, 3, 7], [1, 4]],
  dnb:        [[1, 4, 5], [1, 6, 4, 5]],
  breakbeat:  [[1, 4, 5], [1, 6, 4, 5]],
  'uk-garage':[[1, 4, 5, 1], [1, 6, 4, 5]],
  idm:        [[1, 2, 6, 4], [1, 3, 5, 7]],
  'trip-hop': [[1, 2, 1], [1, 4, 1]],
  ostinato:   [[1], [1, 4]],
  reggae:     [[1, 4, 5], [1, 5, 6, 4]],
};

// ============================================================================
// Note parsing & naming
// ============================================================================

/**
 * Parse note name to MIDI number
 * @param {string} name - e.g. 'C4', 'F#3', 'Bb2'
 * @returns {number} MIDI note number (0-127)
 */
export function parseNote(name) {
  const match = name.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!match) throw new Error(`Invalid note: ${name}`);

  let [, notePart, octaveStr] = match;
  const octave = parseInt(octaveStr);

  // Normalize flats to sharps
  if (FLAT_TO_SHARP[notePart]) {
    notePart = FLAT_TO_SHARP[notePart];
  }

  const semitone = NOTE_NAMES.indexOf(notePart);
  if (semitone === -1) throw new Error(`Invalid note name: ${notePart}`);

  return (octave + 1) * 12 + semitone;
}

/**
 * Convert MIDI number to note name
 * @param {number} midi - MIDI note number (0-127)
 * @returns {string} e.g. 'C4'
 */
export function noteName(midi) {
  const semitone = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[semitone]}${octave}`;
}

/**
 * Get root note semitone value from key name
 * @param {string} key - e.g. 'C', 'F#', 'Bb'
 * @returns {number} semitone (0-11)
 */
export function keyToSemitone(key) {
  let k = key;
  if (FLAT_TO_SHARP[k]) k = FLAT_TO_SHARP[k];
  const idx = NOTE_NAMES.indexOf(k);
  if (idx === -1) throw new Error(`Invalid key: ${key}`);
  return idx;
}

// ============================================================================
// Scale notes
// ============================================================================

/**
 * Get all MIDI notes in a scale within an octave range
 * @param {string} key - Root note name (e.g. 'C', 'F#')
 * @param {string} scaleName - Scale name (e.g. 'minor', 'dorian')
 * @param {number} octaveLow - Lowest octave
 * @param {number} octaveHigh - Highest octave
 * @returns {number[]} Array of MIDI note numbers
 */
export function getScaleNotes(key, scaleName, octaveLow, octaveHigh) {
  const scale = SCALES[scaleName];
  if (!scale) throw new Error(`Unknown scale: ${scaleName}`);

  const root = keyToSemitone(key);
  const notes = [];

  for (let octave = octaveLow; octave <= octaveHigh; octave++) {
    for (const interval of scale) {
      const midi = (octave + 1) * 12 + root + interval;
      if (midi >= 0 && midi <= 127) {
        notes.push(midi);
      }
    }
  }

  return notes.sort((a, b) => a - b);
}

/**
 * Check if a MIDI note is in a given scale
 */
export function isInScale(midi, key, scaleName) {
  const root = keyToSemitone(key);
  const scale = SCALES[scaleName];
  if (!scale) return false;
  const semitone = ((midi - root) % 12 + 12) % 12;
  return scale.includes(semitone);
}

/**
 * Snap a MIDI note to the nearest note in the scale
 */
export function snapToScale(midi, key, scaleName) {
  if (isInScale(midi, key, scaleName)) return midi;
  // Try +1 and -1, prefer lower
  for (let offset = 1; offset <= 6; offset++) {
    if (isInScale(midi - offset, key, scaleName)) return midi - offset;
    if (isInScale(midi + offset, key, scaleName)) return midi + offset;
  }
  return midi;
}

// ============================================================================
// Chords
// ============================================================================

/**
 * Get chord tones for a scale degree (as semitone offsets from scale root)
 * Builds triad from the scale: root + 3rd + 5th of that degree
 * @param {string} key - Root key
 * @param {string} scaleName - Scale name
 * @param {number} degree - Scale degree (1-7)
 * @returns {number[]} Semitone offsets from key root
 */
export function getChord(key, scaleName, degree) {
  const scale = SCALES[scaleName];
  if (!scale) throw new Error(`Unknown scale: ${scaleName}`);
  if (degree < 1 || degree > scale.length) {
    throw new Error(`Invalid degree ${degree} for ${scaleName} (max ${scale.length})`);
  }

  const idx = degree - 1;
  const root = scale[idx];
  const third = scale[(idx + 2) % scale.length] + (idx + 2 >= scale.length ? 12 : 0);
  const fifth = scale[(idx + 4) % scale.length] + (idx + 4 >= scale.length ? 12 : 0);

  return [root, third, fifth];
}

/**
 * Get chord MIDI notes for a degree in a specific octave
 */
export function getChordNotes(key, scaleName, degree, octave) {
  const root = keyToSemitone(key);
  const offsets = getChord(key, scaleName, degree);
  const base = (octave + 1) * 12 + root;
  return offsets.map(off => base + off);
}

// ============================================================================
// Utility exports for CLI
// ============================================================================

export function listScales() {
  return Object.keys(SCALES);
}

export function listKeys() {
  return [...NOTE_NAMES];
}

export function listProgressions(genre) {
  if (genre) {
    return GENRE_PROGRESSIONS[genre] || null;
  }
  return GENRE_PROGRESSIONS;
}
