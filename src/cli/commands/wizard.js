import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { GENRE_GENERATORS, GENRE_VARIATIONS } from '../../generators/genre-templates.js';
import { renderToWAV, checkFFmpeg } from '../../services/audio-renderer.js';
import { loadMixConfig } from '../../services/mix-processor.js';
import { exportToMIDI } from '../../services/midi-service.js';
import { generateDrumKit, generateBatchSamples } from '../../services/elevenlabs-service.js';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

export async function wizardCommand(options) {
  const outputDir = options.output || './output/wizard';

  console.log(chalk.cyan('\n  beat-gen wizard\n'));

  try {
    // Step 1: Genre
    const genre = await select({
      message: 'Genre',
      choices: Object.keys(GENRE_GENERATORS).map(g => ({ name: g, value: g })),
    });

    // Step 2: Style (skip if only 1 variation)
    const variations = GENRE_VARIATIONS[genre] || ['main'];
    let style = variations[0];
    if (variations.length > 1) {
      style = await select({
        message: 'Style',
        choices: variations.map(v => ({ name: v, value: v })),
      });
    }

    // Generate pattern to get defaults
    const pattern = GENRE_GENERATORS[genre](style);

    // Step 3: BPM
    const defaultBPM = pattern.metadata?.suggestedBPM || pattern.tempo || 120;
    const bpmStr = await input({
      message: `BPM (${pattern.metadata?.bpmRange?.join('-') || '40-240'})`,
      default: String(defaultBPM),
      validate: (val) => {
        const n = Number(val);
        if (isNaN(n) || n < 40 || n > 240) return 'Enter a number between 40 and 240';
        return true;
      },
    });
    const bpm = Number(bpmStr);
    pattern.tempo = bpm;

    // Step 4: Output format (ask early to skip sample questions if JSON-only)
    const outputFormat = await select({
      message: 'Output',
      choices: [
        { name: 'WAV loop', value: 'wav' },
        { name: 'WAV + MIDI', value: 'wav+midi' },
        { name: 'Pattern JSON only', value: 'json' },
      ],
    });

    const needsAudio = outputFormat !== 'json';
    let samplesDir = null;
    let mixPreset = 'none';

    if (needsAudio) {
      // Pre-flight: ffmpeg check
      const hasFFmpeg = await checkFFmpeg();
      if (!hasFFmpeg) {
        console.log(chalk.red('\n  ffmpeg not found. Install it to render audio.'));
        console.log(chalk.gray('  brew install ffmpeg  (macOS)'));
        console.log(chalk.gray('  Falling back to Pattern JSON only.\n'));
        return await savePatternJSON(pattern, outputDir);
      }

      // Step 5: Samples
      samplesDir = await pickSamples(genre, options);
      if (!samplesDir) {
        console.log(chalk.yellow('\n  No samples available. Saving pattern JSON only.\n'));
        return await savePatternJSON(pattern, outputDir);
      }

      // Step 6: Mix preset
      mixPreset = await select({
        message: 'Mix preset',
        choices: [
          { name: 'none (raw mix)', value: 'none' },
          { name: 'clean (tamed hats)', value: 'clean' },
          { name: 'compressed (glue comp)', value: 'compressed' },
          { name: 'dub (reverb + delay)', value: 'dub' },
        ],
      });
    }

    // Step 7: Loop repeats
    const repeatsStr = await input({
      message: 'Loop repeats',
      default: '3',
      validate: (val) => {
        const n = Number(val);
        if (isNaN(n) || !Number.isInteger(n) || n < 1 || n > 32) return 'Enter an integer 1-32';
        return true;
      },
    });
    const repeats = Number(repeatsStr);

    // Step 8: Confirm
    console.log(chalk.cyan('\n  Summary'));
    console.log(`  Genre:   ${genre} / ${style}`);
    console.log(`  BPM:     ${bpm}`);
    console.log(`  Repeats: ${repeats}`);
    console.log(`  Output:  ${outputFormat}`);
    if (needsAudio) {
      console.log(`  Samples: ${samplesDir}`);
      console.log(`  Mix:     ${mixPreset}`);
    }
    console.log('');

    const proceed = await confirm({ message: 'Generate?', default: true });
    if (!proceed) {
      console.log(chalk.gray('  Cancelled.\n'));
      return;
    }

    // Step 9: Execute
    await fs.mkdir(outputDir, { recursive: true });

    // Repeat pattern for loop
    const loopPattern = repeatPattern(pattern, repeats);

    const baseName = `${genre}-${bpm}bpm${mixPreset !== 'none' ? `-${mixPreset}` : ''}-x${repeats}`;

    // Always save pattern JSON
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(loopPattern, null, 2));
    console.log(chalk.green(`  Pattern: ${jsonPath}`));

    if (needsAudio) {
      // Render WAV
      const wavPath = path.join(outputDir, `${baseName}.wav`);
      const mixConfig = mixPreset !== 'none' ? await loadMixConfig(mixPreset) : null;
      const result = await renderToWAV(loopPattern, samplesDir, wavPath, { mixConfig });
      console.log(chalk.green(`  WAV:     ${result.path} (${result.duration.toFixed(1)}s, ${result.events} events)`));

      // MIDI if requested
      if (outputFormat === 'wav+midi') {
        const midiPath = path.join(outputDir, `${baseName}.mid`);
        const midiResult = await exportToMIDI(loopPattern, midiPath);
        console.log(chalk.green(`  MIDI:    ${midiResult.path} (${midiResult.notes} notes)`));
      }
    }

    console.log(chalk.cyan('\n  Done.\n'));
  } catch (err) {
    // Ctrl+C or ExitPromptError from @inquirer/prompts
    if (err.name === 'ExitPromptError' || err.message?.includes('User force closed')) {
      console.log(chalk.gray('\n  Cancelled.\n'));
      return;
    }
    throw err;
  }
}

/**
 * Pick sample source: existing directory or generate new via ElevenLabs.
 * Returns samplesDir path or null if unavailable.
 */
async function pickSamples(genre, options) {
  const genreDir = `./samples/${genre}`;
  const hasExisting = await hasSampleFiles(genreDir);
  let apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY || null;

  const choices = [];
  if (hasExisting) {
    choices.push({ name: `Use existing ./samples/${genre}`, value: 'existing' });
  }
  if (apiKey) {
    choices.push({ name: 'Generate new samples via ElevenLabs', value: 'generate' });
  }

  if (choices.length === 0) {
    // No samples and no API key -- offer to enter one
    console.log(chalk.yellow(`\n  No samples in ./samples/${genre} and no ElevenLabs API key set.`));
    const enterKey = await confirm({ message: 'Enter an ElevenLabs API key to generate samples?', default: true });
    if (!enterKey) return null;

    apiKey = await input({
      message: 'ElevenLabs API key',
      validate: (val) => val.trim().length > 0 || 'Key cannot be empty',
    });
    apiKey = apiKey.trim();
    choices.push({ name: 'Generate new samples via ElevenLabs', value: 'generate' });
  }

  // Auto-select if only one option
  let choice;
  if (choices.length === 1) {
    choice = choices[0].value;
  } else {
    choice = await select({ message: 'Samples', choices });
  }

  if (choice === 'existing') {
    return genreDir;
  }

  // Generate new samples -- pick kit or enter custom description
  const kitChoice = await select({
    message: 'Kit style',
    choices: [
      { name: '808', value: '808' },
      { name: 'acoustic', value: 'acoustic' },
      { name: 'electronic', value: 'electronic' },
      { name: 'custom (describe your own)', value: 'custom' },
    ],
  });

  if (kitChoice === 'custom') {
    const description = await input({
      message: 'Style description (e.g. "lo-fi dusty vinyl", "dark industrial")',
      validate: (val) => val.trim().length > 0 || 'Enter a description',
    });
    const coreKit = ['kick', 'snare', 'hihat', 'hihat-open', 'clap'];
    const prompts = coreKit.map(drum => `${drum} ${description.trim()}`);
    console.log(chalk.gray(`\n  Generating custom kit into ./samples/${genre} ...`));
    await generateBatchSamples(prompts, { outputDir: genreDir, apiKey });
  } else {
    console.log(chalk.gray(`\n  Generating ${kitChoice} kit into ./samples/${genre} ...`));
    await generateDrumKit(kitChoice, { outputDir: genreDir, apiKey });
  }

  return genreDir;
}

/**
 * Check if a directory has audio sample files.
 */
async function hasSampleFiles(dir) {
  try {
    const files = await fs.readdir(dir);
    return files.some(f => AUDIO_EXTENSIONS.includes(path.extname(f).toLowerCase()));
  } catch {
    return false;
  }
}

/**
 * Repeat a pattern N times by duplicating track events with step offsets.
 */
function repeatPattern(pattern, repeats) {
  if (repeats <= 1) return pattern;

  const baseResolution = pattern.resolution;
  const newResolution = baseResolution * repeats;

  const newTracks = pattern.tracks.map(track => {
    const newPattern = [];
    for (let r = 0; r < repeats; r++) {
      const offset = r * baseResolution;
      for (const note of track.pattern) {
        newPattern.push({ step: note.step + offset, velocity: note.velocity });
      }
    }
    return { ...track, pattern: newPattern };
  });

  return {
    ...pattern,
    resolution: newResolution,
    tracks: newTracks,
  };
}

/**
 * Fallback: save pattern JSON and exit.
 */
async function savePatternJSON(pattern, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const baseName = `${pattern.metadata?.genre || 'pattern'}-${pattern.tempo}bpm`;
  const jsonPath = path.join(outputDir, `${baseName}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(pattern, null, 2));
  console.log(chalk.green(`  Pattern saved: ${jsonPath}\n`));
}
