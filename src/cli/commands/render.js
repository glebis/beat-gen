import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { parseJSONPattern } from '../../core/pattern-parser.js';
import { renderToWAV, checkFFmpeg } from '../../services/audio-renderer.js';
import { loadMixConfig, listPresets } from '../../services/mix-processor.js';

/**
 * Render command - create WAV from pattern and samples
 */
export async function renderCommand(patternFile, options) {
  console.log(chalk.cyan('🎵 Beat-Gen Audio Renderer\n'));

  // Check ffmpeg availability
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error(chalk.red('Error: FFmpeg not found'));
    console.log(chalk.yellow('\nFFmpeg is required for audio rendering.'));
    console.log(chalk.gray('Install: brew install ffmpeg (macOS) or apt install ffmpeg (Linux)\n'));
    process.exit(1);
  }

  // Load pattern
  if (!patternFile) {
    console.error(chalk.red('Error: Pattern file required'));
    console.log(chalk.yellow('Usage: beat-gen render pattern.json --samples ./samples/'));
    process.exit(1);
  }

  console.log(chalk.blue(`Loading pattern: ${patternFile}`));

  let pattern;
  try {
    const content = await fs.readFile(patternFile, 'utf-8');
    pattern = parseJSONPattern(content);
  } catch (error) {
    console.error(chalk.red(`Error loading pattern: ${error.message}`));
    process.exit(1);
  }

  // Override tempo if --bpm provided
  if (options.bpm) {
    pattern.tempo = parseInt(options.bpm, 10);
  }

  // Verify samples directory
  const samplesDir = options.samples || './samples';
  try {
    await fs.access(samplesDir);
  } catch {
    console.error(chalk.red(`Error: Samples directory not found: ${samplesDir}`));
    console.log(chalk.yellow('\nGenerate samples first:'));
    console.log(chalk.gray('  beat-gen sample --kit 808'));
    process.exit(1);
  }

  // Load mix config from --preset or --mix
  let mixConfig = null;
  const mixSource = options.preset || options.mix;
  if (mixSource) {
    try {
      mixConfig = await loadMixConfig(mixSource);
      const presetNames = listPresets();
      const label = presetNames.includes(mixSource) ? `preset: ${mixSource}` : `file: ${mixSource}`;
      console.log(chalk.cyan(`Mix: ${label}`));
    } catch (err) {
      console.error(chalk.red(`Error loading mix config: ${err.message}`));
      console.log(chalk.yellow(`Available presets: ${listPresets().join(', ')}`));
      process.exit(1);
    }
  }

  // Print pattern info
  printPatternInfo(pattern, samplesDir);

  // Render to WAV
  const outputFile = options.output || 'output.wav';
  console.log(chalk.blue(`\nRendering to: ${outputFile}`));
  console.log(chalk.gray('This may take 10-30 seconds...\n'));

  try {
    const result = await renderToWAV(pattern, samplesDir, outputFile, {
      format: options.format || 'wav',
      sampleRate: options.sampleRate || 44100,
      bitDepth: options.bitDepth || 16,
      mixConfig,
    });

    console.log(chalk.green('✓ Audio rendering complete'));
    console.log(chalk.gray(`  • File: ${result.path}`));
    console.log(chalk.gray(`  • Duration: ${result.duration.toFixed(2)}s`));
    console.log(chalk.gray(`  • Events: ${result.events}`));
    console.log(chalk.gray(`  • Tempo: ${pattern.tempo} BPM`));

  } catch (error) {
    console.error(chalk.red('\n✗ Rendering failed'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Print pattern and samples info
 */
function printPatternInfo(pattern, samplesDir) {
  console.log(chalk.green('\n━━━ Pattern Info ━━━'));
  console.log(chalk.gray(`Tempo: ${pattern.tempo} BPM`));
  console.log(chalk.gray(`Time Signature: ${pattern.timeSignature}`));
  console.log(chalk.gray(`Resolution: ${pattern.resolution} steps`));
  console.log(chalk.gray(`Tracks: ${pattern.tracks.length}`));
  console.log(chalk.gray(`Samples dir: ${samplesDir}`));

  console.log(chalk.yellow('\nTracks:'));
  pattern.tracks.forEach(track => {
    const noteCount = track.pattern.length;
    console.log(chalk.gray(`  • ${track.name}: ${noteCount} notes`));
  });
}
