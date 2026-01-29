import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { parseTextPattern, parseJSONPattern, applySwing } from '../../core/pattern-parser.js';
import { exportToMIDI } from '../../services/midi-service.js';

/**
 * Compose command - create beats from patterns
 */
export async function composeCommand(patternInput, options) {
  console.log(chalk.cyan('🎵 Beat-Gen Composer\n'));

  let pattern;

  // Parse pattern from file or stdin
  if (patternInput) {
    const ext = path.extname(patternInput);

    if (ext === '.json') {
      // Load JSON pattern file
      const jsonContent = await fs.readFile(patternInput, 'utf-8');
      pattern = parseJSONPattern(jsonContent);
      console.log(chalk.blue(`Loaded JSON pattern: ${patternInput}`));
    } else if (ext === '.txt' || ext === '.pattern') {
      // Load text pattern file
      const textContent = await fs.readFile(patternInput, 'utf-8');
      const tracks = parseTextPattern(textContent);
      pattern = {
        tempo: options.bpm || 120,
        timeSignature: options.timeSignature || '4/4',
        resolution: options.resolution || 16,
        tracks,
      };
      console.log(chalk.blue(`Loaded text pattern: ${patternInput}`));
    } else {
      // Treat as inline text pattern
      const tracks = parseTextPattern(patternInput);
      pattern = {
        tempo: options.bpm || 120,
        timeSignature: options.timeSignature || '4/4',
        resolution: options.resolution || 16,
        tracks,
      };
      console.log(chalk.blue('Parsed inline pattern'));
    }
  } else {
    // Create pattern from CLI options
    pattern = createPatternFromOptions(options);
  }

  // Apply swing if specified
  if (options.swing && options.swing > 0) {
    console.log(chalk.yellow(`Applying swing: ${options.swing}`));
    pattern = applySwing(pattern, options.swing);
  }

  // Override tempo if specified
  if (options.bpm) {
    pattern.tempo = options.bpm;
  }

  // Print pattern info
  printPatternInfo(pattern);

  // Export to MIDI
  const outputFile = options.output || 'output.mid';
  console.log(chalk.blue(`\nExporting to MIDI: ${outputFile}`));

  const result = await exportToMIDI(pattern, outputFile);

  console.log(chalk.green('\n✓ MIDI file created successfully'));
  console.log(chalk.gray(`  • File: ${result.path}`));
  console.log(chalk.gray(`  • Tempo: ${result.tempo} BPM`));
  console.log(chalk.gray(`  • Tracks: ${result.tracks}`));
  console.log(chalk.gray(`  • Notes: ${result.notes}`));
}

/**
 * Create pattern from CLI options
 */
function createPatternFromOptions(options) {
  // Simple demo pattern if no input provided
  const demoPattern = `kick: X...X...X...X...
snare: ....X.......X...
hihat: ..X...X...X...X.`;

  const tracks = parseTextPattern(options.pattern || demoPattern);

  return {
    tempo: options.bpm || 120,
    timeSignature: options.timeSignature || '4/4',
    resolution: options.resolution || 16,
    tracks,
  };
}

/**
 * Print pattern information
 */
function printPatternInfo(pattern) {
  console.log(chalk.green('\n━━━ Pattern Info ━━━'));
  console.log(chalk.gray(`Tempo: ${pattern.tempo} BPM`));
  console.log(chalk.gray(`Time Signature: ${pattern.timeSignature}`));
  console.log(chalk.gray(`Resolution: ${pattern.resolution} steps`));
  console.log(chalk.gray(`Tracks: ${pattern.tracks.length}`));

  console.log(chalk.yellow('\nTracks:'));
  pattern.tracks.forEach(track => {
    const noteCount = track.pattern.length;
    console.log(chalk.gray(`  • ${track.name} (MIDI ${track.midiNote}): ${noteCount} notes`));
  });
}
