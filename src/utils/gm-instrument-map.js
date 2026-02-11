/**
 * General MIDI Instrument Map for pitched tracks
 * Drums stay on channel 10 (index 9) via gm-drum-map.js
 */

export const GM_INSTRUMENTS = {
  bass:    { channel: 2, program: 39, name: 'Synth Bass 1' },
  lead:    { channel: 3, program: 81, name: 'Lead 1 (square)' },
  pad:     { channel: 4, program: 89, name: 'Pad 1 (new age)' },
  arp:     { channel: 5, program: 82, name: 'Lead 2 (sawtooth)' },
  fx:      { channel: 6, program: 99, name: 'FX 4 (atmosphere)' },
  subBass: { channel: 7, program: 40, name: 'Synth Bass 2' },
};

/**
 * Get instrument config by name
 */
export function getInstrument(name) {
  const inst = GM_INSTRUMENTS[name];
  if (!inst) throw new Error(`Unknown instrument: ${name}. Valid: ${Object.keys(GM_INSTRUMENTS).join(', ')}`);
  return inst;
}

/**
 * List all available instruments
 */
export function listInstruments() {
  return Object.entries(GM_INSTRUMENTS).map(([name, config]) => ({
    name,
    ...config,
  }));
}
