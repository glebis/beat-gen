import MidiModule from '@tonejs/midi';
const { Midi } = MidiModule;
import fs from 'fs/promises';

/**
 * Export pattern to MIDI file (Format 1, Channel 10)
 */
export async function exportToMIDI(pattern, outputPath) {
  const midi = new Midi();

  // Set tempo (BPM)
  midi.header.setTempo(pattern.tempo || 120);

  // Parse time signature
  const [numerator, denominator] = (pattern.timeSignature || '4/4').split('/').map(Number);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [numerator, denominator],
  });

  // Calculate tick resolution
  // 16th notes by default, with 480 PPQ (pulses per quarter note)
  const ppq = 480;
  const resolution = pattern.resolution || 16;
  const ticksPerStep = (ppq * 4) / resolution; // 4 quarter notes per measure

  // Create drum track (Channel 10)
  const track = midi.addTrack();
  track.channel = 9; // Channel 10 (0-indexed = 9)
  track.name = 'Drums';

  // Add notes from all tracks
  for (const drumTrack of pattern.tracks) {
    for (const { step, velocity } of drumTrack.pattern) {
      const ticks = step * ticksPerStep;
      const duration = ticksPerStep * 0.1; // Short note duration

      track.addNote({
        midi: drumTrack.midiNote,
        time: ticks / ppq, // Convert to seconds
        velocity: velocity / 127, // Normalize 0-1
        duration: duration / ppq,
      });
    }
  }

  // Write to file
  const buffer = Buffer.from(midi.toArray());
  await fs.writeFile(outputPath, buffer);

  return {
    path: outputPath,
    tempo: pattern.tempo,
    tracks: pattern.tracks.length,
    notes: midi.tracks[0].notes.length,
  };
}

/**
 * Import MIDI file and convert to pattern
 */
export async function importFromMIDI(midiPath) {
  const buffer = await fs.readFile(midiPath);
  const midi = new Midi(buffer);

  // Find drum track (Channel 10)
  const drumTrack = midi.tracks.find(t => t.channel === 9);

  if (!drumTrack) {
    throw new Error('No drum track (Channel 10) found in MIDI file');
  }

  // Get tempo
  const tempo = midi.header.tempos[0]?.bpm || 120;

  // Get time signature
  const timeSig = midi.header.timeSignatures[0];
  const timeSignature = timeSig
    ? `${timeSig.timeSignature[0]}/${timeSig.timeSignature[1]}`
    : '4/4';

  // Group notes by MIDI note number
  const noteGroups = {};

  for (const note of drumTrack.notes) {
    const midiNote = note.midi;

    if (!noteGroups[midiNote]) {
      noteGroups[midiNote] = [];
    }

    noteGroups[midiNote].push({
      time: note.time,
      velocity: Math.round(note.velocity * 127),
    });
  }

  // Convert to pattern tracks
  const tracks = Object.entries(noteGroups).map(([midiNote, notes]) => {
    // Quantize to 16th note grid
    const ppq = midi.header.ppq || 480;
    const ticksPerStep = (ppq * 4) / 16;

    const pattern = notes.map(({ time, velocity }) => {
      const ticks = time * ppq;
      const step = Math.round(ticks / ticksPerStep);
      return { step, velocity };
    });

    return {
      name: `drum-${midiNote}`,
      midiNote: parseInt(midiNote),
      pattern,
    };
  });

  return {
    tempo,
    timeSignature,
    resolution: 16,
    tracks,
  };
}
