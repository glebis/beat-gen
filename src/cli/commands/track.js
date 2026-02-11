/**
 * Track command - Generate full multi-track arrangements
 * Outputs: .json + .mid + .png (+ optional .wav with --render)
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { generateArrangement, GENRE_ARRANGEMENTS } from '../../generators/arrangement-engine.js';
import { SCALES } from '../../utils/music-theory.js';
import { exportToMIDI } from '../../services/midi-service.js';
import { renderVisualization } from '../../services/track-visualizer.js';
import { renderToWAV, renderStems, checkFFmpeg, cleanupPitchCache } from '../../services/audio-renderer.js';
import { loadMixConfig, listPresets } from '../../services/mix-processor.js';
import { loadSamplesMetadata, countVariants } from '../../services/pitched-renderer.js';
import { generateInstrumentKit, generateDrumKit, listInstrumentKitGenres } from '../../services/elevenlabs-service.js';
import { getElevenLabsApiKey } from '../../utils/config.js';

export async function trackCommand(genre, options) {
  if (!genre) {
    console.error('Usage: beat-gen track <genre> [options]');
    console.error(`Genres: ${Object.keys(GENRE_ARRANGEMENTS).join(', ')}`);
    process.exit(1);
  }

  if (!GENRE_ARRANGEMENTS[genre]) {
    console.error(`Unknown genre: ${genre}. Available: ${Object.keys(GENRE_ARRANGEMENTS).join(', ')}`);
    process.exit(1);
  }

  const key = options.key || 'C';
  const scale = options.scale || 'minor';
  const tempo = parseInt(options.bpm || getDefaultTempo(genre));
  const resolution = parseInt(options.resolution || '16');
  const seed = options.seed ? parseInt(options.seed) : undefined;

  if (options.scale && !SCALES[options.scale]) {
    console.error(`Unknown scale: ${options.scale}. Available: ${Object.keys(SCALES).join(', ')}`);
    process.exit(1);
  }

  const trackList = options.tracks ? options.tracks.split(',') : undefined;
  const sectionOverride = options.sections ? options.sections.split(',') : undefined;
  const progression = options.progression ? options.progression.split(',').map(Number) : undefined;

  const arrangement = generateArrangement({
    genre, key, scale, tempo, resolution, trackList, sectionOverride, progression, seed,
  });

  // --json: raw arrangement to stdout
  if (options.json) {
    console.log(JSON.stringify(arrangement, null, 2));
    return;
  }

  // File output mode
  const outputDir = options.output || './data/output';
  await fs.mkdir(outputDir, { recursive: true });

  const baseName = `${genre}-${tempo}bpm-${key}${scale === 'minor' ? 'm' : ''}`;
  const trackDir = path.join(outputDir, baseName);
  await fs.mkdir(trackDir, { recursive: true });

  // Save JSON
  const jsonPath = path.join(trackDir, 'pattern.json');
  await fs.writeFile(jsonPath, JSON.stringify(arrangement, null, 2));

  // Save MIDI
  const midiPath = path.join(trackDir, 'pattern.mid');
  await exportToMIDI(arrangement, midiPath);

  // Save PNG
  const pngPath = path.join(trackDir, 'pattern.png');
  await renderVisualization(arrangement, pngPath);

  // Calculate duration
  const totalBars = arrangement.metadata.totalBars;
  const [numerator] = (arrangement.timeSignature || '4/4').split('/').map(Number);
  const durationSec = totalBars * numerator * (60 / tempo);
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);
  const durationStr = `${minutes}m${String(seconds).padStart(2, '0')}s`;

  if (!options.quiet) {
    console.log(`Track generated: ${genre} at ${tempo} BPM in ${key}${scale === 'minor' ? 'm' : ''}`);
    console.log(`  Pattern: ${jsonPath}`);
    console.log(`  MIDI: ${midiPath}`);
    console.log(`  PNG: ${pngPath}`);
    console.log(`  Sections: ${arrangement.sections.map(s => s.name).join(', ')}`);
    console.log(`  Tracks: ${arrangement.tracks.map(t => t.name).join(', ')}`);
    console.log(`  Duration: ${durationStr} (${totalBars} bars)`);
  }

  // --render: WAV rendering with variant support
  if (options.render) {
    await renderTrackVariants(arrangement, trackDir, options);
  }
}

/**
 * Render WAV variants for a generated arrangement
 */
async function renderTrackVariants(arrangement, trackDir, options) {
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error(chalk.red('Error: FFmpeg required for --render. Install: brew install ffmpeg'));
    process.exit(1);
  }

  const samplesDir = options.samples || `./data/samples/${options._genre || 'house'}`;

  // Auto-generate samples if --generate-samples flag set
  if (options.generateSamples) {
    await autoGenerateSamples(options._genre || 'house', samplesDir, options);
  }

  // Verify samples directory exists
  try {
    await fs.access(samplesDir);
  } catch {
    console.error(chalk.red(`Samples directory not found: ${samplesDir}`));
    console.log(chalk.yellow('Generate samples first:'));
    console.log(chalk.gray(`  beat-gen sample --kit 808 -o ${samplesDir}`));
    console.log(chalk.gray(`  beat-gen sample --instruments --genre house -o ${samplesDir}`));
    process.exit(1);
  }

  // Load mix config
  let mixConfig = null;
  if (options.preset) {
    try {
      mixConfig = await loadMixConfig(options.preset);
    } catch (err) {
      console.error(chalk.red(`Error loading preset: ${err.message}`));
      console.log(chalk.yellow(`Available presets: ${listPresets().join(', ')}`));
      process.exit(1);
    }
  }

  // Determine how many variants to render
  const metadata = await loadSamplesMetadata(samplesDir);
  let maxVariants = 1;

  if (metadata) {
    for (const inst of Object.values(metadata)) {
      if (inst.variants) {
        maxVariants = Math.max(maxVariants, inst.variants);
      }
    }
  }

  // Also check actual files
  for (const inst of ['bass', 'lead', 'pad']) {
    const fileVariants = await countVariants(samplesDir, inst);
    if (fileVariants > 0) {
      maxVariants = Math.max(maxVariants, fileVariants);
    }
  }

  const requestedVariants = options.variants ? parseInt(options.variants) : maxVariants;
  const numVariants = Math.min(requestedVariants, maxVariants);

  console.log(chalk.blue(`\nRendering ${numVariants} variant(s)...`));

  try {
    for (let v = 1; v <= numVariants; v++) {
      const variantDir = numVariants > 1
        ? path.join(trackDir, `v${v}`)
        : trackDir;

      await fs.mkdir(variantDir, { recursive: true });

      console.log(chalk.cyan(`\n--- Variant ${v}/${numVariants} ---`));

      // Render mix
      const mixPath = path.join(variantDir, 'mix.wav');
      await renderToWAV(arrangement, samplesDir, mixPath, {
        variant: v,
        mixConfig,
      });
      console.log(chalk.green(`  Mix: ${mixPath}`));

      // Render stems if requested
      if (options.stems) {
        console.log(chalk.blue('  Rendering stems...'));
        const stems = await renderStems(arrangement, samplesDir, variantDir, {
          variant: v,
          mixConfig,
        });
        stems.forEach(s => console.log(chalk.green(`  Stem: ${s.path}`)));
      }
    }
  } finally {
    await cleanupPitchCache();
  }

  console.log(chalk.green('\nRendering complete.'));
}

/**
 * Auto-generate missing samples via 11Labs
 */
async function autoGenerateSamples(genre, samplesDir, options) {
  const apiKey = getElevenLabsApiKey(options.apiKey);
  if (!apiKey) {
    console.error(chalk.red('Error: 11Labs API key required for --generate-samples'));
    process.exit(1);
  }

  const kitGenres = listInstrumentKitGenres();

  // Check if instrument samples exist
  const metadata = await loadSamplesMetadata(samplesDir);
  if (!metadata && kitGenres.includes(genre)) {
    console.log(chalk.blue(`Generating instrument samples for ${genre}...`));
    const variants = parseInt(options.variants || '3');
    await generateInstrumentKit(genre, {
      variants,
      outputDir: samplesDir,
      apiKey,
    });
  }

  // Check if drum samples exist (look for any note-prefixed file)
  try {
    const files = await fs.readdir(samplesDir);
    const hasDrums = files.some(f => /^\d+-/.test(f));
    if (!hasDrums) {
      console.log(chalk.blue('Generating drum samples...'));
      await generateDrumKit('808', {
        outputDir: samplesDir,
        apiKey,
      });
    }
  } catch {
    // Dir doesn't exist yet, will be created by generateInstrumentKit
  }
}

function getDefaultTempo(genre) {
  const defaults = {
    house: 128, techno: 130, dnb: 170, breakbeat: 130,
    'uk-garage': 135, idm: 140, 'trip-hop': 85, ostinato: 120, reggae: 90,
  };
  return defaults[genre] || 120;
}
