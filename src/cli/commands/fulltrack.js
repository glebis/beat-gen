/**
 * Fulltrack command - End-to-end pipeline:
 * 1. Generate arrangement (pattern JSON)
 * 2. Check/generate samples via 11Labs
 * 3. Render N variant mixes + stems
 * 4. Export MIDI + PNG
 * 5. Output summary
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

export async function fulltrackCommand(genre, options) {
  if (!genre) {
    console.error('Usage: beat-gen fulltrack <genre> [options]');
    console.error(`Genres: ${Object.keys(GENRE_ARRANGEMENTS).join(', ')}`);
    process.exit(1);
  }

  if (!GENRE_ARRANGEMENTS[genre]) {
    console.error(`Unknown genre: ${genre}. Available: ${Object.keys(GENRE_ARRANGEMENTS).join(', ')}`);
    process.exit(1);
  }

  // Check ffmpeg
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error(chalk.red('Error: FFmpeg required for fulltrack. Install: brew install ffmpeg'));
    process.exit(1);
  }

  const key = options.key || 'C';
  const scale = options.scale || 'minor';
  const tempo = parseInt(options.bpm || getDefaultTempo(genre));
  const resolution = parseInt(options.resolution || '16');
  const seed = options.seed ? parseInt(options.seed) : undefined;
  const numVariants = parseInt(options.variants || '3');
  const samplesDir = options.samples || `./data/samples/${genre}`;

  if (options.scale && !SCALES[options.scale]) {
    console.error(`Unknown scale: ${options.scale}. Available: ${Object.keys(SCALES).join(', ')}`);
    process.exit(1);
  }

  const progression = options.progression ? options.progression.split(',').map(Number) : undefined;
  const variety = parseFloat(options.variety ?? 0.5);
  const density = parseFloat(options.density ?? 0.5);
  const weirdness = parseFloat(options.weirdness ?? 0);
  const targetDuration = options.duration ? parseInt(options.duration) : undefined;

  console.log(chalk.cyan(`\nFulltrack: ${genre} | ${key}${scale === 'minor' ? 'm' : ''} | ${tempo} BPM | ${numVariants} variants`));
  if (variety !== 0.5 || density !== 0.5 || weirdness > 0) {
    console.log(chalk.gray(`  variety=${variety} density=${density} weirdness=${weirdness}`));
  }
  console.log('');

  // ── Step 1: Generate arrangement ──
  console.log(chalk.blue('1/5 Generating arrangement...'));

  const arrangement = generateArrangement({
    genre, key, scale, tempo, resolution, progression, seed,
    variety, density, duration: targetDuration,
  });

  const totalBars = arrangement.metadata.totalBars;
  const [numerator] = (arrangement.timeSignature || '4/4').split('/').map(Number);
  const durationSec = totalBars * numerator * (60 / tempo);
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.floor(durationSec % 60);

  console.log(chalk.gray(`  ${totalBars} bars, ${minutes}m${String(seconds).padStart(2, '0')}s`));
  console.log(chalk.gray(`  Tracks: ${arrangement.tracks.map(t => t.name).join(', ')}`));
  console.log(chalk.gray(`  Sections: ${arrangement.sections.map(s => s.name).join(', ')}`));

  // ── Step 2: Check/generate samples ──
  console.log(chalk.blue('\n2/5 Checking samples...'));

  await ensureSamples(genre, samplesDir, numVariants, options);

  // ── Step 3: Setup output ──
  const outputDir = options.output || './data/output';
  const baseName = `${genre}-${tempo}bpm-${key}${scale === 'minor' ? 'm' : ''}`;
  const trackDir = path.join(outputDir, baseName);
  await fs.mkdir(trackDir, { recursive: true });

  // ── Step 4: Export MIDI + PNG ──
  console.log(chalk.blue('\n3/5 Exporting MIDI + PNG...'));

  const jsonPath = path.join(trackDir, 'pattern.json');
  const midiPath = path.join(trackDir, 'pattern.mid');
  const pngPath = path.join(trackDir, 'pattern.png');

  await fs.writeFile(jsonPath, JSON.stringify(arrangement, null, 2));
  await exportToMIDI(arrangement, midiPath);
  await renderVisualization(arrangement, pngPath);

  console.log(chalk.gray(`  ${jsonPath}`));
  console.log(chalk.gray(`  ${midiPath}`));
  console.log(chalk.gray(`  ${pngPath}`));

  // ── Step 5: Render variants ──
  let mixConfig = null;
  if (options.preset) {
    try {
      mixConfig = await loadMixConfig(options.preset);
      console.log(chalk.gray(`  Mix preset: ${options.preset}`));
    } catch (err) {
      console.error(chalk.red(`Error loading preset: ${err.message}`));
      console.log(chalk.yellow(`Available: ${listPresets().join(', ')}`));
      process.exit(1);
    }
  }

  // Determine actual available variants
  const metadata = await loadSamplesMetadata(samplesDir);
  let maxAvailable = 1;
  if (metadata) {
    for (const inst of Object.values(metadata)) {
      if (inst.variants) maxAvailable = Math.max(maxAvailable, inst.variants);
    }
  }
  for (const inst of ['bass', 'lead', 'pad', 'vocalChop', 'stab', 'texture', 'atmosphere', 'noise', 'scratch']) {
    const fv = await countVariants(samplesDir, inst);
    if (fv > 0) maxAvailable = Math.max(maxAvailable, fv);
  }

  const actualVariants = Math.min(numVariants, maxAvailable);

  console.log(chalk.blue(`\n4/5 Rendering ${actualVariants} variant(s)...`));

  const renderedFiles = [];

  try {
    for (let v = 1; v <= actualVariants; v++) {
      const variantDir = actualVariants > 1
        ? path.join(trackDir, `v${v}`)
        : trackDir;

      await fs.mkdir(variantDir, { recursive: true });
      console.log(chalk.cyan(`\n  Variant ${v}/${actualVariants}`));

      // Mix
      const mixPath = path.join(variantDir, 'mix.wav');
      await renderToWAV(arrangement, samplesDir, mixPath, {
        variant: v,
        mixConfig,
      });
      renderedFiles.push(mixPath);

      // Stems (always rendered in fulltrack mode)
      const stems = await renderStems(arrangement, samplesDir, variantDir, {
        variant: v,
        mixConfig,
      });
      stems.forEach(s => renderedFiles.push(s.path));
    }
  } finally {
    await cleanupPitchCache();
  }

  // ── Summary ──
  console.log(chalk.blue('\n5/5 Summary'));
  console.log(chalk.green('━'.repeat(50)));
  console.log(chalk.green(`Genre: ${genre}`));
  console.log(chalk.green(`Key: ${key}${scale === 'minor' ? 'm' : ''}`));
  console.log(chalk.green(`BPM: ${tempo}`));
  console.log(chalk.green(`Duration: ${minutes}m${String(seconds).padStart(2, '0')}s (${totalBars} bars)`));
  console.log(chalk.green(`Variants: ${actualVariants}`));
  console.log(chalk.green(`Files: ${renderedFiles.length + 3} total`));
  console.log(chalk.green(`Output: ${trackDir}/`));
  console.log(chalk.green('━'.repeat(50)));
}

/**
 * Ensure all required samples exist, generating via 11Labs if needed
 */
async function ensureSamples(genre, samplesDir, variants, options) {
  let needsDrums = true;
  let needsInstruments = true;

  try {
    const files = await fs.readdir(samplesDir);
    needsDrums = !files.some(f => /^\d+-/.test(f));

    const metadata = await loadSamplesMetadata(samplesDir);
    if (metadata && Object.keys(metadata).length > 0) {
      needsInstruments = false;
    }
  } catch {
    // Directory doesn't exist
  }

  if (!needsDrums && !needsInstruments) {
    console.log(chalk.green('  Samples found.'));
    return;
  }

  // Need to generate -- get API key
  const apiKey = getElevenLabsApiKey(options.apiKey);
  if (!apiKey) {
    console.error(chalk.red('Error: Samples not found and no 11Labs API key provided.'));
    console.log(chalk.yellow('Either:'));
    console.log(chalk.yellow(`  1. Generate samples first: beat-gen sample --kit 808 --instruments --genre ${genre} -o ${samplesDir}`));
    console.log(chalk.yellow('  2. Provide API key: --api-key <key> or set ELEVENLABS_API_KEY'));
    process.exit(1);
  }

  const totalCalls = (needsDrums ? 7 : 0) + (needsInstruments ? 3 * variants : 0);
  console.log(chalk.yellow(`  Generating samples (${totalCalls} API calls)...`));

  if (needsInstruments && listInstrumentKitGenres().includes(genre)) {
    await generateInstrumentKit(genre, {
      variants,
      outputDir: samplesDir,
      apiKey,
      weirdness: parseFloat(options.weirdness ?? 0),
    });
  }

  if (needsDrums) {
    await generateDrumKit('808', {
      outputDir: samplesDir,
      apiKey,
    });
  }

  console.log(chalk.green('  Samples generated.'));
}

function getDefaultTempo(genre) {
  const defaults = {
    house: 128, techno: 130, dnb: 170, breakbeat: 130,
    'uk-garage': 135, idm: 140, 'trip-hop': 85, ostinato: 120, reggae: 90,
  };
  return defaults[genre] || 120;
}
