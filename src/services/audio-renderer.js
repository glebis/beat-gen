import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import { getDrumFileName, GM_DRUM_MAP } from '../utils/gm-drum-map.js';
import { buildBusFilter } from './mix-processor.js';

/**
 * Render pattern to WAV file using generated samples
 */
export async function renderToWAV(pattern, samplesDir, outputPath, options = {}) {
  const {
    format = 'wav',
    sampleRate = 44100,
    bitDepth = 16,
    mixConfig = null,
  } = options;

  // Calculate pattern duration
  const tempo = pattern.tempo || 120;
  const resolution = pattern.resolution || 16;
  const [numerator] = (pattern.timeSignature || '4/4').split('/').map(Number);
  const stepsPerBeat = resolution / (numerator || 4);
  const secondsPerBeat = 60 / tempo;
  const barDuration = numerator * secondsPerBeat;

  // If sections exist, total duration = sum of all section bars
  let duration;
  if (pattern.sections && pattern.sections.length > 0) {
    const totalBars = pattern.sections.reduce((sum, s) => sum + s.bars, 0);
    duration = totalBars * barDuration;
  } else {
    const totalBeats = resolution / stepsPerBeat;
    duration = totalBeats * secondsPerBeat;
  }

  console.log(`Duration: ${duration.toFixed(2)}s at ${tempo} BPM`);

  // Build sample event timeline
  const events = pattern.sections
    ? await buildArrangementTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat, barDuration)
    : await buildEventTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat);

  if (events.length === 0) {
    throw new Error('No events to render (missing samples?)');
  }

  // Build ffmpeg filter complex for mixing
  const filterComplex = mixConfig
    ? buildBusFilter(events, duration, mixConfig)
    : buildMixingFilter(events, duration);

  return new Promise((resolve, reject) => {
    let command = ffmpeg();

    // Add all sample inputs
    events.forEach(event => {
      command = command.input(event.samplePath);
    });

    command
      .complexFilter(filterComplex, '[out]')
      .audioChannels(2)
      .audioFrequency(sampleRate)
      .audioCodec(bitDepth === 24 ? 'pcm_s24le' : 'pcm_s16le')
      .format(format)
      .on('start', (cmd) => {
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
 * Build timeline of sample events with timing
 */
async function buildEventTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat) {
  const events = [];
  // secondsPerStep derived from stepsPerBeat (not hardcoded /4)
  const secondsPerStep = (60 / tempo) / stepsPerBeat;

  for (const track of pattern.tracks) {
    // Find sample file for this track
    const samplePath = await findSampleFile(samplesDir, track.name);

    if (!samplePath) {
      console.warn(`Warning: No sample found for ${track.name}, skipping`);
      continue;
    }

    // Add each note event
    for (const note of track.pattern) {
      const time = note.step * secondsPerStep;
      const velocity = note.velocity / 127; // Normalize to 0-1

      events.push({
        time,
        samplePath,
        velocity,
        trackName: track.name,
      });
    }
  }

  // Sort by time
  events.sort((a, b) => a.time - b.time);

  return events;
}

/**
 * Build timeline for an arrangement with sections
 * Loops patterns across section bars, respecting activeTracks
 */
async function buildArrangementTimeline(pattern, samplesDir, resolution, tempo, stepsPerBeat, barDuration) {
  const events = [];
  const secondsPerStep = (60 / tempo) / stepsPerBeat;
  let currentTime = 0;

  // Cache sample paths
  const sampleCache = {};
  for (const track of pattern.tracks) {
    if (!sampleCache[track.name]) {
      sampleCache[track.name] = await findSampleFile(samplesDir, track.name);
    }
  }

  for (const section of pattern.sections) {
    const activeTracks = section.activeTracks || [];
    const energyScale = section.energy || 1.0;

    for (let bar = 0; bar < section.bars; bar++) {
      const barOffset = currentTime + (bar * barDuration);

      for (const track of pattern.tracks) {
        // Check if track is active in this section
        const isDrum = (track.channel ?? 9) === 9;
        const isActive = activeTracks.some(t =>
          (t === 'drums' && isDrum) || t === track.name
        );
        if (!isActive) continue;

        const samplePath = sampleCache[track.name];
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
  const { format = 'wav', sampleRate = 44100, bitDepth = 16 } = options;
  const stems = [];

  for (const track of pattern.tracks) {
    // Create a pattern with only this track
    const singleTrackPattern = {
      ...pattern,
      tracks: [track],
      // If sections exist, make all of them active for this track
      sections: pattern.sections ? pattern.sections.map(s => ({
        ...s,
        activeTracks: [track.name, (track.channel ?? 9) === 9 ? 'drums' : track.name],
      })) : undefined,
    };

    const stemPath = path.join(outputDir, `track-${track.name}.${format}`);

    try {
      await renderToWAV(singleTrackPattern, samplesDir, stemPath, { format, sampleRate, bitDepth });
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

  // Get MIDI note and standard filename
  const midiNote = GM_DRUM_MAP[drumName.toLowerCase()];
  const standardName = getDrumFileName(drumName);

  // Build search priority list
  const searchPatterns = [];

  if (midiNote) {
    // Highest priority: note-prefixed files (e.g., 36-kick.mp3, 36-kick-808.mp3)
    searchPatterns.push(`${midiNote}-${standardName}`);
    searchPatterns.push(`${midiNote}-${drumName.toLowerCase()}`);
  }

  // Standard names without note prefix
  searchPatterns.push(standardName);
  searchPatterns.push(drumName.toLowerCase());

  // Variations (underscore, case)
  searchPatterns.push(drumName.replace('-', '_').toLowerCase());
  searchPatterns.push(drumName.replace('_', '-').toLowerCase());

  // Try exact matches first
  for (const pattern of searchPatterns) {
    for (const ext of extensions) {
      const filePath = path.join(samplesDir, pattern + ext);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // Try next
      }
    }
  }

  // Try glob patterns for variants with descriptors (e.g., 36-kick-*.mp3)
  try {
    const files = await fs.readdir(samplesDir);

    if (midiNote) {
      // Try note-prefixed with any descriptor: 36-kick-*.mp3
      const notePattern = new RegExp(`^${midiNote}-${standardName}(-.*)?\\.(mp3|wav|ogg|m4a)$`, 'i');
      const match = files.find(f => notePattern.test(f));
      if (match) {
        return path.join(samplesDir, match);
      }
    }

    // Try standard name with descriptor: kick-*.mp3
    const standardPattern = new RegExp(`^${standardName}(-.*)?\\.(mp3|wav|ogg|m4a)$`, 'i');
    const match = files.find(f => standardPattern.test(f));
    if (match) {
      return path.join(samplesDir, match);
    }
  } catch {
    // Directory read failed
  }

  return null;
}

/**
 * Build ffmpeg filter complex for mixing samples
 */
function buildMixingFilter(events, duration) {
  const filters = [];
  const delays = [];

  // Use exact duration for perfect looping (no padding)
  const durationWithPadding = duration;

  // Process each event
  events.forEach((event, i) => {
    // Delay filter to place sample at correct time, then pad to full duration
    const delayMs = Math.round(event.time * 1000);
    const volumeDb = volumeToDb(event.velocity);

    filters.push(`[${i}:a]adelay=${delayMs}|${delayMs},apad=whole_dur=${durationWithPadding},volume=${volumeDb}dB[a${i}]`);
    delays.push(`[a${i}]`);
  });

  // Mix all delayed samples together
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
 * Create silent audio file using sox or ffmpeg
 */
async function createSilence(outputPath, duration, sampleRate) {
  // Try using sox first (if available)
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    await execAsync(`sox -n -r ${sampleRate} -c 2 "${outputPath}" trim 0.0 ${duration}`);
    return;
  } catch {
    // Sox not available, fallback to ffmpeg method
  }

  // Fallback: Use ffmpeg with -f lavfi if available
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(`anullsrc=channel_layout=stereo:sample_rate=${sampleRate}`)
      .inputOptions(['-f', 'lavfi'])
      .duration(duration)
      .audioChannels(2)
      .audioFrequency(sampleRate)
      .format('wav')
      .on('end', resolve)
      .on('error', (err) => {
        // If lavfi fails, try alternative method
        createSilenceAlternative(outputPath, duration, sampleRate)
          .then(resolve)
          .catch(reject);
      })
      .save(outputPath);
  });
}

/**
 * Alternative method: create silence from existing sample
 */
async function createSilenceAlternative(outputPath, duration, sampleRate) {
  // Create a very short silence file first
  const tempPath = outputPath + '.temp.wav';

  return new Promise((resolve, reject) => {
    // Generate 0.1 second of silence using volume filter on a short tone
    ffmpeg()
      .input(`sine=frequency=1:duration=0.1`)
      .inputOptions(['-f', 'lavfi'])
      .audioFilters('volume=0')
      .audioChannels(2)
      .audioFrequency(sampleRate)
      .format('wav')
      .on('error', reject)
      .on('end', () => {
        // Now loop/extend this to desired duration
        ffmpeg(tempPath)
          .audioFilters(`apad=whole_dur=${duration}`)
          .audioChannels(2)
          .audioFrequency(sampleRate)
          .format('wav')
          .on('end', async () => {
            await fs.unlink(tempPath).catch(() => {});
            resolve();
          })
          .on('error', reject)
          .save(outputPath);
      })
      .save(tempPath);
  });
}

/**
 * Check if ffmpeg is available
 */
export async function checkFFmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
