#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { sampleCommand } from '../src/cli/commands/sample.js';
import { composeCommand } from '../src/cli/commands/compose.js';
import { exportCommand } from '../src/cli/commands/export.js';
import { importCommand } from '../src/cli/commands/import.js';
import { renderCommand } from '../src/cli/commands/render.js';
import { generateCommand } from '../src/cli/commands/generate.js';
import { hybridCommand } from '../src/cli/commands/hybrid.js';
import { wizardCommand } from '../src/cli/commands/wizard.js';
import { theoryCommand } from '../src/cli/commands/theory.js';
import { listCommand } from '../src/cli/commands/list.js';
import { bassCommand } from '../src/cli/commands/bass.js';
import { melodyCommand } from '../src/cli/commands/melody.js';
import { trackCommand } from '../src/cli/commands/track.js';
import { visualizeCommand } from '../src/cli/commands/visualize.js';

const program = new Command();

program
  .name('beat-gen')
  .description('Full track generator: drums + bass + melody + pads with arrangements')
  .version('2.0.0');

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
  .option('-b, --bpm <tempo>', 'Tempo in BPM (defaults to pattern suggestedBPM or 120)')
  .option('-t, --time-signature <sig>', 'Time signature', '4/4')
  .option('-s, --swing <amount>', 'Swing amount (0-1)', '0')
  .option('-r, --resolution <steps>', 'Steps per pattern (16, 32, etc)', '16')
  .option('-o, --output <file>', 'Output file (use - for stdout)', 'output.mid')
  .option('-f, --format <format>', 'Output format (midi, json)', 'midi')
  .option('-p, --pattern <text>', 'Inline text pattern')
  .option('-q, --quiet', 'Quiet mode (no progress output)')
  .option('-v, --verbose', 'Verbose mode (debug info)')
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
  .option('-b, --bpm <tempo>', 'Override tempo (BPM)')
  .option('-s, --samples <dir>', 'Samples directory', './samples')
  .option('-o, --output <file>', 'Output WAV file', 'output.wav')
  .option('--sample-rate <rate>', 'Sample rate in Hz', '44100')
  .option('--bit-depth <bits>', 'Bit depth', '16')
  .option('--format <format>', 'Output format', 'wav')
  .option('-m, --mix <file>', 'Mix config JSON file for per-track gain/EQ/effects')
  .option('--preset <name>', 'Mix preset (clean, compressed, dub)')
  .action(renderCommand);

// Generate command
program
  .command('generate')
  .description('Generate pattern library')
  .argument('[genre]', 'Genre to generate (house, techno, dnb, etc.)')
  .option('-c, --count <number>', 'Number of patterns per genre', '5')
  .option('-w, --with-variations', 'Generate intro/outro/fill variations', true)
  .option('-o, --output <dir>', 'Output directory', './data/generated-patterns')
  .option('-a, --all', 'Generate all genres')
  .option('-l, --list', 'List available genres')
  .option('-v, --variability', 'Add ghost notes and humanization')
  .action(generateCommand);

// Hybrid loop generation command
program
  .command('hybrid')
  .description('Generate hybrid loops combining multiple genres')
  .argument('<genres...>', 'Genres to combine (e.g., idm uk-garage house)')
  .option('-v, --variants <number>', 'Number of variants to generate', '4')
  .option('-t, --tempo <bpm>', 'Override tempo (BPM)')
  .option('-o, --output <dir>', 'Output directory', './data/output/hybrid')
  .option('-s, --samples-dir <dir>', 'Samples base directory', './data/audio-samples')
  .option('-p, --patterns <dir>', 'Patterns directory', './data/generated-patterns')
  .action(hybridCommand);

// Interactive wizard
program
  .command('wizard')
  .alias('w')
  .description('Interactive beat generation wizard')
  .option('-o, --output <dir>', 'Output directory', './output/wizard')
  .option('--api-key <key>', '11Labs API key (or use ELEVENLABS_API_KEY env var)')
  .action(wizardCommand);

// Track command (full arrangement)
program
  .command('track')
  .description('Generate full multi-track arrangement')
  .argument('<genre>', 'Genre (house, techno, dnb, etc.)')
  .option('-k, --key <key>', 'Musical key', 'C')
  .option('--scale <scale>', 'Scale', 'minor')
  .option('-b, --bpm <tempo>', 'BPM (default: genre-appropriate)')
  .option('-r, --resolution <steps>', 'Steps per bar', '16')
  .option('--tracks <list>', 'Comma-separated track list (e.g. "drums,bass,lead")')
  .option('--sections <list>', 'Override section order (e.g. "intro,drop,outro")')
  .option('--progression <list>', 'Chord degrees (e.g. "1,4,5,1")')
  .option('--seed <number>', 'Random seed for reproducibility')
  .option('--json', 'JSON output to stdout')
  .option('-q, --quiet', 'Suppress progress output')
  .option('-o, --output <dir>', 'Output directory', './output')
  .action(trackCommand);

// Bass command
program
  .command('bass')
  .description('Generate genre-specific bass patterns')
  .option('-g, --genre <genre>', 'Genre', 'house')
  .option('-k, --key <key>', 'Musical key', 'C')
  .option('--scale <scale>', 'Scale', 'minor')
  .option('-b, --bpm <tempo>', 'BPM', '128')
  .option('-r, --resolution <steps>', 'Steps per bar', '16')
  .option('--progression <list>', 'Chord degrees (e.g. "1,4,5,1")')
  .option('--seed <number>', 'Random seed for reproducibility')
  .option('--json', 'JSON output to stdout')
  .option('-o, --output <file>', 'Output file')
  .option('--list-modes', 'List available bass modes')
  .action(bassCommand);

// Melody command
program
  .command('melody')
  .description('Generate genre-specific melody/pad/arp patterns')
  .option('-g, --genre <genre>', 'Genre', 'house')
  .option('-k, --key <key>', 'Musical key', 'C')
  .option('--scale <scale>', 'Scale', 'minor')
  .option('-b, --bpm <tempo>', 'BPM', '128')
  .option('-r, --resolution <steps>', 'Steps per bar', '16')
  .option('-i, --instrument <name>', 'Instrument: lead, pad, arp', 'lead')
  .option('--seed <number>', 'Random seed for reproducibility')
  .option('--json', 'JSON output to stdout')
  .option('-o, --output <file>', 'Output file')
  .option('--list-instruments', 'List available instruments')
  .action(melodyCommand);

// Visualize command
program
  .command('visualize')
  .description('Render pattern/track to PNG visualization')
  .argument('<input>', 'Pattern or track JSON file')
  .option('-o, --output <file>', 'Output PNG file')
  .option('--width <pixels>', 'Image width', '1200')
  .option('--height <pixels>', 'Image height', '800')
  .option('--json', 'JSON output')
  .action(visualizeCommand);

// Theory command
program
  .command('theory')
  .description('Music theory utilities (scales, keys, progressions)')
  .option('--list-scales', 'List available scales')
  .option('--list-keys', 'List all keys')
  .option('--list-progressions [genre]', 'List chord progressions (optionally for genre)')
  .option('--scale <notes>', 'Get scale notes (e.g. "C minor")')
  .option('--octave <range>', 'Octave range (e.g. "2-4")', '2-4')
  .option('--json', 'JSON output')
  .action(theoryCommand);

// List command (agent discovery)
program
  .command('list')
  .description('List available options (genres, scales, instruments, etc.)')
  .argument('<what>', 'What to list: genres, scales, instruments, progressions, sections, presets')
  .argument('[filter]', 'Optional filter (e.g. genre name)')
  .option('--json', 'JSON output (default)')
  .action(listCommand);

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

  ${chalk.gray('# Render with mix preset (tame hats, add compression)')}
  $ beat-gen render pattern.json --samples ./samples/808/ --preset clean
  $ beat-gen render pattern.json --samples ./samples/808/ --preset dub

  ${chalk.gray('# Render with custom mix config')}
  $ beat-gen render pattern.json --samples ./samples/808/ --mix my-mix.json

  ${chalk.gray('# Generate pattern library')}
  $ beat-gen generate house --count 5
  $ beat-gen generate --all --count 10
  $ beat-gen generate --list

  ${chalk.gray('# Generate hybrid loops')}
  $ beat-gen hybrid idm uk-garage house --variants 4
  $ beat-gen hybrid techno dnb --tempo 150 --variants 3

  ${chalk.gray('# Interactive wizard (guided beat generation)')}
  $ beat-gen wizard

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
