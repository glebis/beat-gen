/**
 * General MIDI Drum Map (Channel 10)
 * Standard MIDI note numbers for percussion
 */

export const GM_DRUM_MAP = {
  // Bass drums
  'kick': 36,         // Acoustic Bass Drum
  'bass': 36,
  'bd': 36,
  'kick2': 35,        // Bass Drum 1

  // Snares
  'snare': 38,        // Acoustic Snare
  'sn': 38,
  'sd': 38,
  'snare2': 40,       // Electric Snare
  'rimshot': 37,      // Side Stick
  'rim': 37,          // Alias used by generators
  'clap': 39,         // Hand Clap

  // Hi-hats
  'hihat': 42,        // Closed Hi-Hat
  'hh': 42,
  'ch': 42,
  'closed-hat': 42,   // Alias used by generators
  'hihat-open': 46,   // Open Hi-Hat
  'oh': 46,
  'open-hat': 46,     // Alias used by generators
  'hihat-pedal': 44,  // Pedal Hi-Hat
  'ph': 44,

  // Toms
  'tom1': 50,         // High Tom
  'tom2': 47,         // Low-Mid Tom
  'tom3': 43,         // High Floor Tom
  'tom-high': 50,
  'tom-mid': 47,
  'tom-low': 43,
  'tom-floor': 41,    // Low Floor Tom

  // Cymbals
  'crash': 49,        // Crash Cymbal 1
  'crash2': 57,       // Crash Cymbal 2
  'ride': 51,         // Ride Cymbal 1
  'ride2': 59,        // Ride Cymbal 2
  'china': 52,        // Chinese Cymbal
  'splash': 55,       // Splash Cymbal

  // Percussion
  'cowbell': 56,
  'tambourine': 54,
  'shaker': 82,       // Shaker
  'maracas': 70,
  'conga-high': 62,
  'conga-low': 64,
  'bongo-high': 60,
  'bongo-low': 61,
  'timbale-high': 65,
  'timbale-low': 66,
  'agogo-high': 67,
  'agogo-low': 68,
  'cabasa': 69,
  'vibraslap': 58,
  'claves': 75,
  'woodblock-high': 76,
  'woodblock-low': 77,
  'guiro-short': 73,
  'guiro-long': 74,
  'triangle-open': 81,
  'triangle-mute': 80,

  // Latin
  'whistle-short': 71,
  'whistle-long': 72,
};

// Reverse lookup: MIDI note to drum name
export const NOTE_TO_DRUM = Object.fromEntries(
  Object.entries(GM_DRUM_MAP).map(([name, note]) => [note, name])
);

// Common drum kit presets
export const DRUM_PRESETS = {
  basic: ['kick', 'snare', 'hihat', 'hihat-open'],
  standard: ['kick', 'snare', 'hihat', 'hihat-open', 'crash', 'ride'],
  extended: ['kick', 'snare', 'hihat', 'hihat-open', 'tom1', 'tom2', 'tom3', 'crash', 'ride'],
  electronic: ['kick', 'snare', 'hihat', 'clap', 'rimshot', 'cowbell'],
  latin: ['conga-high', 'conga-low', 'bongo-high', 'bongo-low', 'cowbell', 'claves'],
};

/**
 * Get MIDI note number for drum name
 */
export function getDrumNote(name) {
  const note = GM_DRUM_MAP[name.toLowerCase()];
  if (!note) {
    throw new Error(`Unknown drum: ${name}. See documentation for valid drum names.`);
  }
  return note;
}

/**
 * Get drum name from MIDI note number
 */
export function getDrumName(note) {
  return NOTE_TO_DRUM[note] || `note-${note}`;
}

/**
 * Validate drum name
 */
export function isValidDrum(name) {
  return GM_DRUM_MAP.hasOwnProperty(name.toLowerCase());
}

/**
 * Standard sample filenames for each GM drum note
 * Maps MIDI note numbers to standardized filenames
 */
export const DRUM_SAMPLE_NAMES = {
  // Bass drums
  35: 'kick',
  36: 'kick',

  // Snares
  37: 'rimshot',
  38: 'snare',
  39: 'clap',
  40: 'snare',

  // Hi-hats
  42: 'hihat',
  44: 'hihat-pedal',
  46: 'hihat-open',

  // Toms
  41: 'tom-low',
  43: 'tom-low',
  45: 'tom-mid',
  47: 'tom-mid',
  48: 'tom-high',
  50: 'tom-high',

  // Cymbals
  49: 'crash',
  51: 'ride',
  52: 'china',
  55: 'splash',
  57: 'crash',
  59: 'ride',

  // Percussion
  54: 'tambourine',
  56: 'cowbell',
  58: 'vibraslap',
  60: 'bongo-high',
  61: 'bongo-low',
  62: 'conga-high',
  64: 'conga-low',
  65: 'timbale-high',
  66: 'timbale-low',
  67: 'agogo-high',
  68: 'agogo-low',
  69: 'cabasa',
  70: 'maracas',
  71: 'whistle-short',
  72: 'whistle-long',
  73: 'guiro-short',
  74: 'guiro-long',
  75: 'claves',
  76: 'woodblock-high',
  77: 'woodblock-low',
  80: 'triangle-mute',
  81: 'triangle-open',
  82: 'shaker',
};

/**
 * Get standard filename for drum name
 * @param {string} drumName - GM drum name (e.g., 'kick', 'snare')
 * @returns {string} Standard filename without extension
 */
export function getDrumFileName(drumName) {
  const note = GM_DRUM_MAP[drumName.toLowerCase()];
  if (!note) {
    return drumName.toLowerCase();
  }
  return DRUM_SAMPLE_NAMES[note] || drumName.toLowerCase();
}

/**
 * Format sample name with MIDI note prefix and optional descriptor
 * @param {string} drumName - GM drum name
 * @param {string|null} descriptor - Optional descriptor (e.g., '808', 'deep')
 * @returns {string} Formatted filename with MIDI note prefix, without extension
 */
export function formatSampleName(drumName, descriptor = null) {
  const note = GM_DRUM_MAP[drumName.toLowerCase()];
  const baseName = getDrumFileName(drumName);

  if (!note) {
    // Fallback if no MIDI note found
    return descriptor ? `${baseName}-${descriptor}` : baseName;
  }

  if (descriptor) {
    return `${note}-${baseName}-${descriptor}`;
  }
  return `${note}-${baseName}`;
}
