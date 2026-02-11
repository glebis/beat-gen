import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Pitched note renderer using ffmpeg asetrate for pitch shifting.
 *
 * Approach: change playback rate to shift pitch, then resample back.
 *   semitones = targetPitch - referencePitch
 *   rateFactor = 2^(semitones/12)
 *   filter: asetrate=sampleRate*rateFactor, aresample=sampleRate, atrim=0:duration
 */

// Cache of rendered pitched notes: key -> temp file path
const pitchCache = new Map();
let tempDir = null;

/**
 * Get (or create) a temp directory for pitched renders
 */
async function getTempDir() {
  if (!tempDir) {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'beat-gen-pitch-'));
  }
  return tempDir;
}

/**
 * Render a single pitched note to a temp WAV file
 *
 * @param {string} samplePath - Path to the base sample file
 * @param {number} referencePitch - MIDI note the sample was recorded at
 * @param {number} targetPitch - MIDI note to render
 * @param {number} durationSec - Desired note duration in seconds
 * @param {number} sampleRate - Target sample rate (default 44100)
 * @returns {Promise<string>} Path to the rendered temp WAV file
 */
export async function renderPitchedNote(samplePath, referencePitch, targetPitch, durationSec, sampleRate = 44100) {
  const cacheKey = `${samplePath}:${targetPitch}:${durationSec}`;

  if (pitchCache.has(cacheKey)) {
    const cached = pitchCache.get(cacheKey);
    try {
      await fs.access(cached);
      return cached;
    } catch {
      pitchCache.delete(cacheKey);
    }
  }

  const dir = await getTempDir();
  const outPath = path.join(dir, `pitch_${targetPitch}_${durationSec}_${Date.now()}.wav`);

  const semitones = targetPitch - referencePitch;
  const rateFactor = Math.pow(2, semitones / 12);
  const newRate = Math.round(sampleRate * rateFactor);

  // Build filter chain
  const filters = [];
  if (semitones !== 0) {
    filters.push(`asetrate=${newRate}`);
    filters.push(`aresample=${sampleRate}`);
  }
  filters.push(`atrim=0:${durationSec}`);
  filters.push(`apad=whole_dur=${durationSec}`);

  return new Promise((resolve, reject) => {
    ffmpeg(samplePath)
      .audioFilters(filters.join(','))
      .audioChannels(2)
      .audioFrequency(sampleRate)
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => {
        pitchCache.set(cacheKey, outPath);
        resolve(outPath);
      })
      .on('error', (err) => {
        reject(new Error(`Pitch render failed (${targetPitch}, ${samplePath}): ${err.message}`));
      })
      .save(outPath);
  });
}

/**
 * Load samples.json metadata from a samples directory
 * Returns null if no metadata file exists
 */
export async function loadSamplesMetadata(samplesDir) {
  const metadataPath = path.join(samplesDir, 'samples.json');
  try {
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Find a pitched instrument sample file with variant support
 *
 * @param {string} samplesDir - Samples directory
 * @param {string} instrumentName - e.g. 'bass', 'lead', 'pad'
 * @param {number} variant - Variant number (1-based), default 1
 * @returns {Promise<string|null>} Path to sample file or null
 */
export async function findInstrumentSample(samplesDir, instrumentName, variant = 1) {
  const extensions = ['.mp3', '.wav', '.ogg', '.m4a'];

  // Try variant file first: bass-v1.mp3
  for (const ext of extensions) {
    const variantPath = path.join(samplesDir, `${instrumentName}-v${variant}${ext}`);
    try {
      await fs.access(variantPath);
      return variantPath;
    } catch { /* next */ }
  }

  // Fallback: non-variant file: bass.mp3
  for (const ext of extensions) {
    const plainPath = path.join(samplesDir, `${instrumentName}${ext}`);
    try {
      await fs.access(plainPath);
      return plainPath;
    } catch { /* next */ }
  }

  return null;
}

/**
 * Count available variants for an instrument in a samples directory
 */
export async function countVariants(samplesDir, instrumentName) {
  let count = 0;
  const extensions = ['.mp3', '.wav', '.ogg', '.m4a'];

  for (let v = 1; v <= 20; v++) {
    let found = false;
    for (const ext of extensions) {
      try {
        await fs.access(path.join(samplesDir, `${instrumentName}-v${v}${ext}`));
        found = true;
        break;
      } catch { /* next */ }
    }
    if (found) {
      count = v;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Clean up all temp files created by the pitched renderer
 */
export async function cleanupPitchCache() {
  pitchCache.clear();
  if (tempDir) {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch { /* ignore */ }
    tempDir = null;
  }
}
