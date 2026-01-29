#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { sampleCommand } from '../src/cli/commands/sample.js';
import { composeCommand } from '../src/cli/commands/compose.js';
import { exportCommand } from '../src/cli/commands/export.js';
import { importCommand } from '../src/cli/commands/import.js';
import { renderCommand } from '../src/cli/commands/render.js';
import { interactiveCommand } from '../src/cli/commands/interactive.js';

const program = new Command();

program
  .name('beat-gen')
  .description('CLI drum machine with AI sample generation and MIDI export')
  .version('1.0.0');

// Sample generation command
program
  .command('sample')
  .description('Generate drum samples using 11Labs AI')
  .argument('[prompts...]', 'Sample descriptions (e.g., "808 kick", "snare")')
  .option('-k, --kit <name>', 'Generate preset drum kit (808, acoustic, electronic)')
  .option('-o, --output <dir>', 'Output directory', './samples')
  .option('-d, --duration <seconds>', 'Sample duration', '2')
  .option('-i, --influence <value>', 'Prompt influence (0-1)', '0.5')
  .option('--api-key <key>', '11Labs API key (or use ELEVENLABS_API_KEY env var)')
  .action(sampleCommand);

// Compose command
program
  .command('compose')
  .description('Create beats from patterns')
  .argument('[pattern]', 'Pattern file (.json, .txt) or inline text pattern')
  .option('-b, --bpm <tempo>', 'Tempo in BPM', '120')
  .option('-t, --time-signature <sig>', 'Time signature', '4/4')
  .option('-s, --swing <amount>', 'Swing amount (0-1)', '0')
  .option('-r, --resolution <steps>', 'Steps per pattern (16, 32, etc)', '16')
  .option('-o, --output <file>', 'Output MIDI file', 'output.mid')
  .option('-p, --pattern <text>', 'Inline text pattern')
  .action(composeCommand);

// Export command
program
  .command('export')
  .description('Convert pattern to different format')
  .argument('<input>', 'Input pattern file (JSON)')
  .option('-f, --format <format>', 'Output format (midi, text)', 'midi')
  .option('-o, --output <file>', 'Output file')
  .action(exportCommand);

// Import command
program
  .command('import')
  .description('Import MIDI file and convert to pattern')
  .argument('<midiFile>', 'MIDI file to import')
  .option('-f, --format <format>', 'Output format (json, text)', 'json')
  .option('-o, --output <file>', 'Output file')
  .action(importCommand);

// Render command
program
  .command('render')
  .description('Render pattern to WAV using generated samples (requires ffmpeg)')
  .argument('<pattern>', 'Pattern file (JSON)')
  .option('-s, --samples <dir>', 'Samples directory', './samples')
  .option('-o, --output <file>', 'Output WAV file', 'output.wav')
  .option('--sample-rate <rate>', 'Sample rate in Hz', '44100')
  .option('--bit-depth <bits>', 'Bit depth', '16')
  .option('--format <format>', 'Output format', 'wav')
  .action(renderCommand);

// Interactive command
program
  .command('interactive')
  .alias('i')
  .description('Interactive beat creation wizard - step-by-step guided workflow')
  .action(interactiveCommand);

// Help examples
program.addHelpText('after', `
${chalk.cyan('Examples:')}

  ${chalk.gray('# Generate single sample')}
  $ beat-gen sample "808 kick drum"

  ${chalk.gray('# Generate multiple samples')}
  $ beat-gen sample "kick" "snare" "hi-hat"

  ${chalk.gray('# Generate preset drum kit')}
  $ beat-gen sample --kit 808

  ${chalk.gray('# Create beat from text pattern')}
  $ beat-gen compose pattern.txt --bpm 140 --output beat.mid

  ${chalk.gray('# Create beat with inline pattern')}
  $ beat-gen compose --pattern "kick: X...X...X...X..." --bpm 120

  ${chalk.gray('# Apply swing to pattern')}
  $ beat-gen compose pattern.txt --swing 0.5 --bpm 95

  ${chalk.gray('# Import MIDI file')}
  $ beat-gen import beat.mid --format json

  ${chalk.gray('# Export JSON to MIDI')}
  $ beat-gen export pattern.json --format midi

  ${chalk.gray('# Render pattern to WAV with samples')}
  $ beat-gen render pattern.json --samples ./samples/808/ --output beat.wav

  ${chalk.gray('# Start interactive beat creation wizard')}
  $ beat-gen interactive
  $ beat-gen i

${chalk.yellow('Environment Variables:')}
  ELEVENLABS_API_KEY    Your 11Labs API key for sample generation

${chalk.blue('Documentation:')}
  https://github.com/glebis/beat-gen
`);

// Error handling
program.configureOutput({
  outputError: (str, write) => write(chalk.red(str))
});

// Parse arguments
program.parse();
