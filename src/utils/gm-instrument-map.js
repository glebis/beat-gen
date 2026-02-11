/**
 * General MIDI Instrument Map for pitched tracks
 * Drums stay on channel 10 (index 9) via gm-drum-map.js
 */

export const GM_INSTRUMENTS = {
  bass:    { channel: 2, program: 39, name: 'Synth Bass 1', referencePitch: 36 },
  lead:    { channel: 3, program: 81, name: 'Lead 1 (square)', referencePitch: 60 },
  pad:     { channel: 4, program: 89, name: 'Pad 1 (new age)', referencePitch: 60 },
  arp:     { channel: 5, program: 82, name: 'Lead 2 (sawtooth)', referencePitch: 60 },
  fx:         { channel: 6,  program: 99,  name: 'FX 4 (atmosphere)',    referencePitch: 60 },
  subBass:    { channel: 7,  program: 40,  name: 'Synth Bass 2',       referencePitch: 24 },
  vocalChop:  { channel: 8,  program: 55,  name: 'Synth Voice',        referencePitch: 60 },
  texture:    { channel: 11, program: 101, name: 'FX 5 (brightness)',   referencePitch: 60 },
  noise:      { channel: 12, program: 123, name: 'Seashore',           referencePitch: 60 },
  scratch:    { channel: 13, program: 121, name: 'Guitar Fret Noise',  referencePitch: 60 },
  atmosphere: { channel: 14, program: 90,  name: 'Pad 2 (warm)',       referencePitch: 60 },
  stab:       { channel: 15, program: 81,  name: 'Lead 1 (square)',    referencePitch: 60 },
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
