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
  'clap': 39,         // Hand Clap

  // Hi-hats
  'hihat': 42,        // Closed Hi-Hat
  'hh': 42,
  'ch': 42,
  'hihat-open': 46,   // Open Hi-Hat
  'oh': 46,
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
