import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { getDrumFileName, GM_DRUM_MAP } from '../utils/gm-drum-map.js';
import { buildBusFilter } from './mix-processor.js';
import { renderPitchedNote, loadSamplesMetadata, findInstrumentSample, cleanupPitchCache } from './pitched-renderer.js';

/**
 * Render pattern to WAV file using generated samples.
 * Supports both drum one-shots and pitched instruments (bass, lead, pad).
 */
export async function renderToWAV(pattern, samplesDir, outputPath, options = {}) {
  const {
    format = 'wav',
    sampleRate = 44100,
    bitDepth = 16,
    mixConfig = null,
    variant = 1,
  } = options;

  const tempo = pattern.tempo || 120;
  const resolution = pattern.resolution || 16;
  const [numerator] = (pattern.timeSignature || '4/4').split('/').map(Number);
  const stepsPerBeat = resolution / (numerator || 4);
  const secondsPerBeat = 60 / tempo;
  const barDuration = numerator * secondsPerBeat;

  let duration;
  if (pattern.sections && pattern.sections.length > 0) {
    const totalBars = pattern.sections.reduce((sum, s) => sum + s.bars, 0);
    duration = totalBars * barDuration;
  } else {
    const totalBeats = resolution / stepsPerBeat;
    duration = totalBeats * secondsPerBeat;
  }

  console.log(`Duration: ${duration.toFixed(2)}s at ${tempo} BPM`);

  // Load samples metadata for pitched instruments
  const metadata = await loadSamplesMetadata(samplesDir);

  const events = pattern.sections
    ? await buildArrangementTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat, barDuration, { metadata, variant, sampleRate })
    : await buildEventTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat, { metadata, variant, sampleRate });

  if (events.length === 0) {
    throw new Error('No events to render (missing samples?)');
  }

  const filterComplex = mixConfig
    ? buildBusFilter(events, duration, mixConfig)
    : buildMixingFilter(events, duration);

  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    events.forEach(event => {
      command = command.input(event.samplePath);
    });

    command
      .complexFilter(filterComplex, '[out]')
      .audioChannels(2)
      .audioFrequency(sampleRate)
      .audioCodec(bitDepth === 24 ? 'pcm_s24le' : 'pcm_s16le')
      .format(format)
      .on('start', () => {
        console.log('Rendering audio...');
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\rProgress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        console.log('\n');
        resolve({
          path: outputPath,
          duration,
          events: events.length,
        });
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Determine if a track is a pitched instrument (not drums)
 */
function isPitchedTrack(track) {
  const channel = track.channel ?? 9;
  return channel !== 9;
}

/**
 * Build timeline of sample events with timing.
 * For pitched tracks, renders each note through the pitch-shifting pipeline.
 */
async function buildEventTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat, opts = {}) {
  const { metadata, variant = 1, sampleRate = 44100 } = opts;
  const events = [];
  const secondsPerStep = (60 / tempo) / stepsPerBeat;

  for (const track of pattern.tracks) {
    const pitched = isPitchedTrack(track);

    if (pitched) {
      // Pitched instrument: resolve sample + metadata
      const instMeta = metadata?.[track.name];
      const samplePath = await findInstrumentSample(samplesDir, track.name, variant);

      if (!samplePath) {
        console.warn(`Warning: No sample found for instrument ${track.name}, skipping`);
        continue;
      }

      const referencePitch = instMeta?.referencePitch || 60;

      for (const note of track.pattern) {
        const time = note.step * secondsPerStep;
        const velocity = (note.velocity || 100) / 127;
        const targetPitch = note.pitch || referencePitch;
        const durationSec = (note.duration || 2) * secondsPerStep;

        const pitchedPath = await renderPitchedNote(samplePath, referencePitch, targetPitch, durationSec, sampleRate);

        events.push({
          time,
          samplePath: pitchedPath,
          velocity,
          trackName: track.name,
        });
      }
    } else {
      // Drum one-shot: existing behavior
      const samplePath = await findSampleFile(samplesDir, track.name);

      if (!samplePath) {
        console.warn(`Warning: No sample found for ${track.name}, skipping`);
        continue;
      }

      for (const note of track.pattern) {
        const time = note.step * secondsPerStep;
        const velocity = note.velocity / 127;

        events.push({
          time,
          samplePath,
          velocity,
          trackName: track.name,
        });
      }
    }
  }

  events.sort((a, b) => a.time - b.time);
  return events;
}

/**
 * Build timeline for an arrangement with sections.
 * Loops patterns across section bars, respecting activeTracks.
 * For pitched instruments, each note is individually pitch-rendered.
 */
async function buildArrangementTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat, barDuration, opts = {}) {
  const { metadata, variant = 1, sampleRate = 44100 } = opts;
  const events = [];
  const secondsPerStep = (60 / tempo) / stepsPerBeat;
  let currentTime = 0;

  // Cache sample paths for drums
  const drumSampleCache = {};
  // Cache instrument sample paths
  const instrumentSampleCache = {};

  for (const track of pattern.tracks) {
    if (!isPitchedTrack(track)) {
      if (!drumSampleCache[track.name]) {
        drumSampleCache[track.name] = await findSampleFile(samplesDir, track.name);
      }
    } else {
      if (!instrumentSampleCache[track.name]) {
        instrumentSampleCache[track.name] = await findInstrumentSample(samplesDir, track.name, variant);
      }
    }
  }

  for (const section of pattern.sections) {
    const activeTracks = section.activeTracks || [];
    const energyScale = section.energy || 1.0;

    for (let bar = 0; bar < section.bars; bar++) {
      const barOffset = currentTime + (bar * barDuration);

      for (const track of pattern.tracks) {
        const isDrum = !isPitchedTrack(track);
        const isActive = activeTracks.some(t =>
          (t === 'drums' && isDrum) || t === track.name
        );
        if (!isActive) continue;

        if (isDrum) {
          const samplePath = drumSampleCache[track.name];
          if (!samplePath) continue;

          for (const note of track.pattern) {
            const time = barOffset + (note.step * secondsPerStep);
            const velocity = ((note.velocity || 100) / 127) * energyScale;

            events.push({
              time,
              samplePath,
              velocity: Math.min(1, velocity),
              trackName: track.name,
            });
          }
        } else {
          // Pitched instrument
          const baseSamplePath = instrumentSampleCache[track.name];
          if (!baseSamplePath) continue;

          const instMeta = metadata?.[track.name];
          const referencePitch = instMeta?.referencePitch || 60;

          for (const note of track.pattern) {
            const time = barOffset + (note.step * secondsPerStep);
            const velocity = ((note.velocity || 100) / 127) * energyScale;
            const targetPitch = note.pitch || referencePitch;
            const durationSec = (note.duration || 2) * secondsPerStep;

            const pitchedPath = await renderPitchedNote(baseSamplePath, referencePitch, targetPitch, durationSec, sampleRate);

            events.push({
              time,
              samplePath: pitchedPath,
              velocity: Math.min(1, velocity),
              trackName: track.name,
            });
          }
        }
      }
    }

    currentTime += section.bars * barDuration;
  }

  events.sort((a, b) => a.time - b.time);
  return events;
}

/**
 * Render individual stems (one WAV per track)
 */
export async function renderStems(pattern, samplesDir, outputDir, options = {}) {
  const { format = 'wav', sampleRate = 44100, bitDepth = 16, variant = 1, mixConfig = null } = options;
  const stems = [];

  for (const track of pattern.tracks) {
    const singleTrackPattern = {
      ...pattern,
      tracks: [track],
      sections: pattern.sections ? pattern.sections.map(s => ({
        ...s,
        activeTracks: [track.name, !isPitchedTrack(track) ? 'drums' : track.name],
      })) : undefined,
    };

    const stemPath = path.join(outputDir, `stem-${track.name}.${format}`);

    try {
      await renderToWAV(singleTrackPattern, samplesDir, stemPath, { format, sampleRate, bitDepth, variant, mixConfig });
      stems.push({ name: track.name, path: stemPath });
    } catch (err) {
      console.warn(`Warning: Could not render stem for ${track.name}: ${err.message}`);
    }
  }

  return stems;
}

/**
 * Find sample file for drum name with enhanced search
 * Priority: note-prefixed > standard name > descriptive variants
 */
async function findSampleFile(samplesDir, drumName) {
  const extensions = ['.mp3', '.wav', '.ogg', '.m4a'];

  const midiNote = GM_DRUM_MAP[drumName.toLowerCase()];
  const standardName = getDrumFileName(drumName);

  const searchPatterns = [];

  if (midiNote) {
    searchPatterns.push(`${midiNote}-${standardName}`);
    searchPatterns.push(`${midiNote}-${drumName.toLowerCase()}`);
  }

  searchPatterns.push(standardName);
  searchPatterns.push(drumName.toLowerCase());
  searchPatterns.push(drumName.replace('-', '_').toLowerCase());
  searchPatterns.push(drumName.replace('_', '-').toLowerCase());

  for (const pattern of searchPatterns) {
    for (const ext of extensions) {
      const filePath = path.join(samplesDir, pattern + ext);
      try {
        await fs.access(filePath);
        return filePath;
      } catch { /* next */ }
    }
  }

  // Glob fallback for variants with descriptors
  try {
    const files = await fs.readdir(samplesDir);

    if (midiNote) {
      const notePattern = new RegExp(`^${midiNote}-${standardName}(-.*)?\\.(mp3|wav|ogg|m4a)$`, 'i');
      const match = files.find(f => notePattern.test(f));
      if (match) return path.join(samplesDir, match);
    }

    const standardPattern = new RegExp(`^${standardName}(-.*)?\\.(mp3|wav|ogg|m4a)$`, 'i');
    const match = files.find(f => standardPattern.test(f));
    if (match) return path.join(samplesDir, match);
  } catch { /* directory read failed */ }

  return null;
}

/**
 * Build ffmpeg filter complex for mixing samples
 */
function buildMixingFilter(events, duration) {
  const filters = [];
  const delays = [];

  const durationWithPadding = duration;

  events.forEach((event, i) => {
    const delayMs = Math.round(event.time * 1000);
    const volumeDb = volumeToDb(event.velocity);

    filters.push(`[${i}:a]adelay=${delayMs}|${delayMs},apad=whole_dur=${durationWithPadding},volume=${volumeDb}dB[a${i}]`);
    delays.push(`[a${i}]`);
  });

  const mixInputs = delays.join('');
  filters.push(`${mixInputs}amix=inputs=${delays.length}:duration=first:normalize=0[out]`);

  return filters;
}

/**
 * Convert velocity (0-1) to dB
 */
function volumeToDb(velocity) {
  if (velocity <= 0) return -60;
  if (velocity >= 1) return 0;
  return 20 * Math.log10(velocity);
}

/**
 * Check if ffmpeg is available
 */
export async function checkFFmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}

export { cleanupPitchCache };
