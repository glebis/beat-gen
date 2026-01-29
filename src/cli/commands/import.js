import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { importFromMIDI } from '../../services/midi-service.js';
import { patternToText } from '../../core/pattern-parser.js';
import { getDrumName } from '../../utils/gm-drum-map.js';

/**
 * Import command - load MIDI files
 */
export async function importCommand(midiFile, options) {
  console.log(chalk.cyan('🎵 Beat-Gen Import\n'));

  if (!midiFile) {
    console.error(chalk.red('Error: MIDI file required'));
    console.log(chalk.yellow('Usage: beat-gen import <file.mid>'));
    process.exit(1);
  }

  // Check file exists
  try {
    await fs.access(midiFile);
  } catch {
    console.error(chalk.red(`Error: File not found: ${midiFile}`));
    process.exit(1);
  }

  // Import MIDI
  console.log(chalk.blue(`Importing: ${midiFile}`));
  const pattern = await importFromMIDI(midiFile);

  // Map MIDI notes to drum names
  pattern.tracks = pattern.tracks.map(track => ({
    ...track,
    name: getDrumName(track.midiNote),
  }));

  // Determine output format
  const outputFormat = options.format || 'json';
  const basename = path.basename(midiFile, path.extname(midiFile));
  const outputFile = options.output || `${basename}.${outputFormat === 'json' ? 'json' : 'txt'}`;

  // Export to target format
  if (outputFormat === 'json') {
    console.log(chalk.blue(`Saving as JSON: ${outputFile}`));
    await fs.writeFile(outputFile, JSON.stringify(pattern, null, 2), 'utf-8');

    console.log(chalk.green('\n✓ Import successful'));
    console.log(chalk.gray(`  • Format: JSON`));
    console.log(chalk.gray(`  • File: ${outputFile}`));
    console.log(chalk.gray(`  • Tempo: ${pattern.tempo} BPM`));
    console.log(chalk.gray(`  • Tracks: ${pattern.tracks.length}`));
  } else if (outputFormat === 'text' || outputFormat === 'txt') {
    console.log(chalk.blue(`Saving as text: ${outputFile}`));
    const textPattern = patternToText(pattern);
    await fs.writeFile(outputFile, textPattern, 'utf-8');

    console.log(chalk.green('\n✓ Import successful'));
    console.log(chalk.gray(`  • Format: Text`));
    console.log(chalk.gray(`  • File: ${outputFile}`));
    console.log(chalk.gray(`\nPattern:\n${textPattern}`));
  } else {
    console.error(chalk.red(`Error: Unknown format: ${outputFormat}`));
    console.log(chalk.yellow('Supported formats: json, text'));
    process.exit(1);
  }

  // Print track info
  console.log(chalk.yellow('\nTracks:'));
  pattern.tracks.forEach(track => {
    console.log(chalk.gray(`  • ${track.name} (MIDI ${track.midiNote}): ${track.pattern.length} notes`));
  });
}
