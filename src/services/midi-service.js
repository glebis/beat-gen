import MidiModule from '@tonejs/midi';
const { Midi } = MidiModule;
import fs from 'fs/promises';

/**
 * Export pattern to MIDI file
 * Supports multi-track (drums + pitched instruments) and arrangement sections
 */
export async function exportToMIDI(pattern, outputPath) {
  const midi = new Midi();
  const tempo = pattern.tempo || 120;
  const ppq = 480;
  const resolution = pattern.resolution || 16;
  const barsCount = pattern.barsCount || 1;
  const ticksPerStep = (ppq * 4 * barsCount) / resolution;
  const secondsPerTick = 60 / (tempo * ppq);
  const barDurationSec = (resolution * ticksPerStep * secondsPerTick);

  // Set tempo
  midi.header.setTempo(tempo);

  // Parse time signature
  const [numerator, denominator] = (pattern.timeSignature || '4/4').split('/').map(Number);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [numerator, denominator],
  });

  // Group tracks by type: drum (channel 9) vs pitched
  const drumTracks = [];
  const pitchedTracks = [];

  for (const t of pattern.tracks) {
    const ch = t.channel ?? 9;
    if (ch === 9) {
      drumTracks.push(t);
    } else {
      pitchedTracks.push(t);
    }
  }

  let totalNotes = 0;

  // -- Drum track --
  if (drumTracks.length > 0) {
    const midiTrack = midi.addTrack();
    midiTrack.channel = 9;
    midiTrack.name = 'Drums';

    if (pattern.sections) {
      totalNotes += addSectionedNotes(midiTrack, drumTracks, pattern.sections, 'drums',
        resolution, ticksPerStep, secondsPerTick, barDurationSec, null);
    } else {
      for (const dt of drumTracks) {
        for (const note of dt.pattern) {
          const ticks = note.step * ticksPerStep;
          midiTrack.addNote({
            midi: dt.midiNote,
            time: ticks * secondsPerTick,
            velocity: (note.velocity || 100) / 127,
            duration: ticksPerStep * 0.1 * secondsPerTick,
          });
          totalNotes++;
        }
      }
    }
  }

  // -- Pitched tracks --
  for (const pt of pitchedTracks) {
    const midiTrack = midi.addTrack();
    midiTrack.channel = pt.channel || 2;
    midiTrack.name = pt.name || 'Instrument';

    // Set instrument (GM program change)
    if (pt.instrument !== undefined) {
      midiTrack.instrument.number = pt.instrument;
    }

    if (pattern.sections) {
      totalNotes += addSectionedNotes(midiTrack, [pt], pattern.sections, pt.name,
        resolution, ticksPerStep, secondsPerTick, barDurationSec, pt);
    } else {
      for (const note of pt.pattern) {
        const ticks = note.step * ticksPerStep;
        const pitch = note.pitch ?? pt.midiNote;
        const durSteps = note.duration || 1;
        midiTrack.addNote({
          midi: pitch,
          time: ticks * secondsPerTick,
          velocity: (note.velocity || 100) / 127,
          duration: durSteps * ticksPerStep * secondsPerTick,
        });
        totalNotes++;
      }
    }
  }

  // Write to file
  const buffer = Buffer.from(midi.toArray());
  await fs.writeFile(outputPath, buffer);

  return {
    path: outputPath,
    tempo,
    tracks: midi.tracks.length,
    notes: totalNotes,
  };
}

/**
 * Add notes for sectioned arrangement
 * Loops the track pattern across each section's bars where the track is active
 */
function addSectionedNotes(midiTrack, tracks, sections, trackName, resolution, ticksPerStep, secondsPerTick, barDurationSec, pitchedTrack) {
  let totalNotes = 0;
  let currentTimeSec = 0;

  for (const section of sections) {
    const isActive = section.activeTracks.some(t => {
      if (t === 'drums' && !pitchedTrack) return true;
      return t === trackName;
    });

    if (isActive) {
      const energyScale = section.energy || 1.0;
      for (let bar = 0; bar < section.bars; bar++) {
        const barOffsetSec = currentTimeSec + (bar * barDurationSec);

        for (const track of tracks) {
          for (const note of track.pattern) {
            const noteTimeSec = barOffsetSec + (note.step * ticksPerStep * secondsPerTick);
            const pitch = pitchedTrack ? (note.pitch ?? track.midiNote) : track.midiNote;
            const durSteps = note.duration || (pitchedTrack ? 1 : 0.1);
            const vel = Math.min(127, Math.round((note.velocity || 100) * energyScale));

            midiTrack.addNote({
              midi: pitch,
              time: noteTimeSec,
              velocity: vel / 127,
              duration: durSteps * ticksPerStep * secondsPerTick,
            });
            totalNotes++;
          }
        }
      }
    }

    currentTimeSec += section.bars * barDurationSec;
  }

  return totalNotes;
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
    const ppq = midi.header.ppq || 480;
    const ticksPerStep = (ppq * 4) / 16;

    const pattern = notes.map(({ time, velocity }) => {
      const ticks = (time * tempo / 60) * ppq;
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
