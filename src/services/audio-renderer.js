import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';

/**
 * Render pattern to WAV file using generated samples
 */
export async function renderToWAV(pattern, samplesDir, outputPath, options = {}) {
  const {
    format = 'wav',
    sampleRate = 44100,
    bitDepth = 16,
  } = options;

  // Calculate pattern duration
  // Resolution = total steps in pattern (typically 16th notes)
  // In 4/4: 16 steps = 1 bar, 64 steps = 4 bars
  const tempo = pattern.tempo || 120;
  const resolution = pattern.resolution || 16;
  const stepsPerBeat = 4; // Assuming 16th note steps (4 per quarter note)
  const totalBeats = resolution / stepsPerBeat;
  const secondsPerBeat = 60 / tempo;
  const duration = totalBeats * secondsPerBeat;

  console.log(`Duration: ${duration.toFixed(2)}s at ${tempo} BPM`);

  // Build sample event timeline
  const events = await buildEventTimeline(pattern, samplesDir, resolution, tempo);

  if (events.length === 0) {
    throw new Error('No events to render (missing samples?)');
  }

  // Build ffmpeg filter complex for mixing
  const filterComplex = buildMixingFilter(events, duration);

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
      .audioBitrate(`${bitDepth}k`)
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
async function buildEventTimeline(pattern, samplesDir, resolution, tempo) {
  const events = [];
  // Each step = 1/16th note (standard sequencer resolution)
  // secondsPerBeat = 60 / tempo
  // 4 sixteenth notes per beat, so secondsPerStep = secondsPerBeat / 4
  const secondsPerStep = (60 / tempo) / 4;

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
 * Find sample file for drum name
 */
async function findSampleFile(samplesDir, drumName) {
  const extensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  const variations = [
    drumName,
    drumName.replace('-', '_'),
    drumName.replace('_', '-'),
    drumName.toLowerCase(),
  ];

  for (const name of variations) {
    for (const ext of extensions) {
      const filePath = path.join(samplesDir, name + ext);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // Try next
      }
    }
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
