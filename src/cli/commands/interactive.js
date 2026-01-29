import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { input, select, checkbox, confirm, number } from '@inquirer/prompts';
import { parseTextPattern } from '../../core/pattern-parser.js';
import { exportToMIDI } from '../../services/midi-service.js';
import { GM_DRUM_MAP, DRUM_PRESETS } from '../../utils/gm-drum-map.js';

/**
 * Beat style presets with suggested BPM ranges and patterns
 */
const BEAT_STYLES = {
  'hip-hop': {
    name: 'Hip-Hop',
    bpmRange: [70, 100],
    defaultBpm: 90,
    swing: 0.2,
    description: 'Boom bap, trap, lo-fi beats',
    suggestedDrums: ['kick', 'snare', 'hihat', 'hihat-open', 'clap'],
    patterns: {
      kick: 'X.......X.......X.......X..X....',
      snare: '....X.......X.......X.......X...',
      hihat: 'X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.',
    }
  },
  'trap': {
    name: 'Trap',
    bpmRange: [130, 170],
    defaultBpm: 140,
    swing: 0,
    description: 'Hard hitting 808s, rapid hi-hats',
    suggestedDrums: ['kick', 'snare', 'hihat', 'hihat-open', 'clap'],
    patterns: {
      kick: 'X.......X.X.....X.......X.X.....',
      snare: '....X.......X.......X.......X...',
      hihat: 'XXxxXXxxXXxxXXxxXXxxXXxxXXxxXXxx',
    }
  },
  'house': {
    name: 'House',
    bpmRange: [120, 130],
    defaultBpm: 125,
    swing: 0,
    description: 'Four-on-the-floor electronic',
    suggestedDrums: ['kick', 'snare', 'hihat', 'hihat-open', 'clap'],
    patterns: {
      kick: 'X...X...X...X...X...X...X...X...',
      clap: '....X.......X.......X.......X...',
      hihat: '..X...X...X...X...X...X...X...X.',
    }
  },
  'techno': {
    name: 'Techno',
    bpmRange: [125, 150],
    defaultBpm: 135,
    swing: 0,
    description: 'Driving industrial beats',
    suggestedDrums: ['kick', 'snare', 'hihat', 'hihat-open', 'rimshot'],
    patterns: {
      kick: 'X...X...X...X...X...X...X...X...',
      hihat: 'X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.',
      rimshot: '..X...X...X...X...X...X...X...X.',
    }
  },
  'drum-and-bass': {
    name: 'Drum & Bass',
    bpmRange: [160, 180],
    defaultBpm: 174,
    swing: 0,
    description: 'Fast breakbeats and heavy bass',
    suggestedDrums: ['kick', 'snare', 'hihat', 'hihat-open', 'crash'],
    patterns: {
      kick: 'X.......X.....X.X.......X.......',
      snare: '....X.......X.......X.......X...',
      hihat: 'X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.',
    }
  },
  'reggaeton': {
    name: 'Reggaeton',
    bpmRange: [90, 100],
    defaultBpm: 95,
    swing: 0,
    description: 'Dembow rhythm pattern',
    suggestedDrums: ['kick', 'snare', 'hihat', 'rimshot'],
    patterns: {
      kick: 'X..X..X.X..X..X.X..X..X.X..X..X.',
      snare: '...X..X....X..X....X..X....X..X.',
      hihat: 'X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.',
    }
  },
  'rock': {
    name: 'Rock',
    bpmRange: [100, 140],
    defaultBpm: 120,
    swing: 0,
    description: 'Classic rock drum patterns',
    suggestedDrums: ['kick', 'snare', 'hihat', 'crash', 'ride'],
    patterns: {
      kick: 'X...X...X...X...X...X...X...X...',
      snare: '....X.......X.......X.......X...',
      hihat: 'X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.X.',
    }
  },
  'custom': {
    name: 'Custom',
    bpmRange: [40, 220],
    defaultBpm: 120,
    swing: 0,
    description: 'Build from scratch',
    suggestedDrums: ['kick', 'snare', 'hihat'],
    patterns: {}
  }
};

/**
 * Interactive CLI command handler
 */
export async function interactiveCommand() {
  console.clear();
  printBanner();

  try {
    // Step 1: Package title
    const title = await input({
      message: 'What would you like to name this beat package?',
      default: 'my-beat',
      validate: (value) => {
        if (!value.trim()) return 'Please enter a name';
        if (!/^[a-zA-Z0-9-_\s]+$/.test(value)) {
          return 'Use only letters, numbers, spaces, hyphens, and underscores';
        }
        return true;
      }
    });

    console.log(chalk.gray(`\nCreating: ${chalk.white(title)}\n`));

    // Step 2: Beat style selection
    const styleChoices = Object.entries(BEAT_STYLES).map(([key, style]) => ({
      name: `${style.name} ${chalk.gray(`(${style.bpmRange[0]}-${style.bpmRange[1]} BPM) - ${style.description}`)}`,
      value: key
    }));

    const selectedStyle = await select({
      message: 'Select a beat style:',
      choices: styleChoices
    });

    const style = BEAT_STYLES[selectedStyle];
    console.log(chalk.cyan(`\n✓ Style: ${style.name}\n`));

    // Step 3: BPM
    const bpm = await number({
      message: `Enter BPM (${style.bpmRange[0]}-${style.bpmRange[1]} recommended):`,
      default: style.defaultBpm,
      min: 20,
      max: 300,
      validate: (value) => {
        if (value < 20 || value > 300) return 'BPM must be between 20 and 300';
        return true;
      }
    });

    console.log(chalk.cyan(`✓ BPM: ${bpm}\n`));

    // Step 4: Time signature
    const timeSignature = await select({
      message: 'Select time signature:',
      choices: [
        { name: '4/4 (most common)', value: '4/4' },
        { name: '3/4 (waltz)', value: '3/4' },
        { name: '6/8 (compound)', value: '6/8' },
        { name: '5/4 (odd meter)', value: '5/4' },
        { name: '7/8 (progressive)', value: '7/8' },
      ],
      default: '4/4'
    });

    console.log(chalk.cyan(`✓ Time signature: ${timeSignature}\n`));

    // Step 5: Swing
    const swingAmount = await select({
      message: 'Select swing/groove amount:',
      choices: [
        { name: 'None (straight)', value: 0 },
        { name: 'Light (5%)', value: 0.05 },
        { name: 'Subtle (10%)', value: 0.1 },
        { name: 'Medium (20%)', value: 0.2 },
        { name: 'Heavy (33%)', value: 0.33 },
        { name: 'Shuffle (50%)', value: 0.5 },
      ],
      default: style.swing
    });

    console.log(chalk.cyan(`✓ Swing: ${swingAmount * 100}%\n`));

    // Step 6: Resolution (bars)
    const bars = await select({
      message: 'Pattern length:',
      choices: [
        { name: '1 bar (16 steps)', value: 1 },
        { name: '2 bars (32 steps)', value: 2 },
        { name: '4 bars (64 steps)', value: 4 },
      ],
      default: 2
    });

    const resolution = bars * 16;
    console.log(chalk.cyan(`✓ Pattern: ${bars} bar(s) / ${resolution} steps\n`));

    // Step 7: Drum selection
    const drumChoices = Object.keys(GM_DRUM_MAP)
      .filter((name, index, arr) => arr.indexOf(name) === index)
      .slice(0, 25) // Limit to common drums
      .map(name => ({
        name: `${name} ${chalk.gray(`(MIDI ${GM_DRUM_MAP[name]})`)}`,
        value: name,
        checked: style.suggestedDrums.includes(name)
      }));

    const selectedDrums = await checkbox({
      message: 'Select drums to include (space to toggle, enter to confirm):',
      choices: drumChoices,
      required: true,
      validate: (value) => {
        if (value.length === 0) return 'Select at least one drum';
        return true;
      }
    });

    console.log(chalk.cyan(`\n✓ Drums: ${selectedDrums.join(', ')}\n`));

    // Step 8: Pattern input for each drum
    console.log(chalk.yellow('\n━━━ Pattern Editor ━━━'));
    console.log(chalk.gray('Enter patterns using: X (loud), x (soft), . (rest)'));
    console.log(chalk.gray(`Pattern length: ${resolution} steps\n`));

    // Show beat grid header
    printBeatGrid(resolution);

    const patterns = {};

    for (const drum of selectedDrums) {
      const defaultPattern = style.patterns[drum] || '.'.repeat(resolution);
      const adjustedDefault = defaultPattern.length >= resolution
        ? defaultPattern.slice(0, resolution)
        : defaultPattern.padEnd(resolution, '.');

      const pattern = await input({
        message: `${chalk.yellow(drum.padEnd(12))}:`,
        default: adjustedDefault,
        validate: (value) => {
          if (!value.trim()) return 'Pattern cannot be empty';
          const valid = /^[Xx.0-9]+$/.test(value);
          if (!valid) return 'Use only X, x, . or 0-9';
          return true;
        },
        transformer: (value) => {
          // Pad or trim to resolution
          if (value.length < resolution) {
            return value + chalk.gray('.'.repeat(resolution - value.length));
          }
          return value.slice(0, resolution);
        }
      });

      // Normalize pattern length
      patterns[drum] = pattern.length >= resolution
        ? pattern.slice(0, resolution)
        : pattern.padEnd(resolution, '.');
    }

    // Step 9: Output options
    console.log(chalk.yellow('\n━━━ Output Options ━━━\n'));

    const outputDir = await input({
      message: 'Output directory:',
      default: './output'
    });

    const midiFilename = await input({
      message: 'MIDI filename:',
      default: `${title.toLowerCase().replace(/\s+/g, '-')}.mid`
    });

    const saveJson = await confirm({
      message: 'Save pattern as JSON for later editing?',
      default: true
    });

    // Build pattern text
    const patternText = Object.entries(patterns)
      .map(([drum, pattern]) => `${drum}: ${pattern}`)
      .join('\n');

    // Parse and create pattern object
    const tracks = parseTextPattern(patternText);
    const patternObj = {
      title,
      style: selectedStyle,
      tempo: bpm,
      timeSignature,
      resolution,
      swing: swingAmount,
      tracks
    };

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Export MIDI
    console.log(chalk.blue('\nExporting MIDI...'));
    const midiPath = path.join(outputDir, midiFilename);
    const result = await exportToMIDI(patternObj, midiPath);

    console.log(chalk.green(`✓ MIDI saved: ${result.path}`));

    // Save JSON if requested
    if (saveJson) {
      const jsonFilename = midiFilename.replace('.mid', '.json');
      const jsonPath = path.join(outputDir, jsonFilename);

      const jsonContent = {
        title,
        style: selectedStyle,
        tempo: bpm,
        timeSignature,
        resolution,
        swing: swingAmount,
        patterns
      };

      await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2));
      console.log(chalk.green(`✓ JSON saved: ${jsonPath}`));
    }

    // Summary
    printSummary(patternObj, result);

    // Next steps
    console.log(chalk.cyan('\n━━━ Next Steps ━━━'));
    console.log(chalk.gray(`• Load ${midiPath} in your DAW`));
    console.log(chalk.gray(`• Generate samples: ${chalk.white('beat-gen sample --kit 808')}`));
    console.log(chalk.gray(`• Render to audio: ${chalk.white(`beat-gen render ${saveJson ? path.join(outputDir, midiFilename.replace('.mid', '.json')) : 'pattern.json'} -o beat.wav`)}`));
    console.log('');

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\n\nSession cancelled. Goodbye!\n'));
      return;
    }
    console.error(chalk.red(`\nError: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Print the welcome banner
 */
function printBanner() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════════╗
║                                           ║
║   ${chalk.white.bold('BEAT-GEN')} ${chalk.gray('Interactive Beat Creator')}    ║
║                                           ║
╚═══════════════════════════════════════════╝
`));
  console.log(chalk.gray('Create drum patterns step by step.\n'));
  console.log(chalk.gray('Press Ctrl+C at any time to cancel.\n'));
}

/**
 * Print beat grid header for visual reference
 */
function printBeatGrid(resolution) {
  const bars = resolution / 16;
  let header = chalk.gray('Beat:       ');
  let numbers = chalk.gray('Step:       ');

  for (let bar = 0; bar < bars; bar++) {
    header += chalk.white(`|1   2   3   4   `);
    for (let step = 0; step < 16; step++) {
      const num = (step + 1).toString().padStart(2, ' ');
      if (step % 4 === 0) {
        numbers += chalk.yellow(num.slice(-1));
      } else {
        numbers += chalk.gray('.');
      }
    }
  }

  console.log(header);
  console.log(numbers);
  console.log(chalk.gray('─'.repeat(12 + resolution)));
}

/**
 * Print pattern summary
 */
function printSummary(pattern, result) {
  console.log(chalk.green('\n━━━ Beat Created Successfully! ━━━\n'));

  console.log(chalk.white(`Title:          ${pattern.title}`));
  console.log(chalk.white(`Style:          ${BEAT_STYLES[pattern.style]?.name || pattern.style}`));
  console.log(chalk.white(`Tempo:          ${pattern.tempo} BPM`));
  console.log(chalk.white(`Time Signature: ${pattern.timeSignature}`));
  console.log(chalk.white(`Swing:          ${pattern.swing * 100}%`));
  console.log(chalk.white(`Resolution:     ${pattern.resolution} steps`));
  console.log(chalk.white(`Tracks:         ${result.tracks}`));
  console.log(chalk.white(`Total Notes:    ${result.notes}`));
}

export default interactiveCommand;
