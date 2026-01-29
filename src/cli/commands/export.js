import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { parseJSONPattern, patternToText } from '../../core/pattern-parser.js';
import { exportToMIDI } from '../../services/midi-service.js';

/**
 * Export command - convert between formats
 */
export async function exportCommand(inputFile, options) {
  console.log(chalk.cyan('🎵 Beat-Gen Export\n'));

  if (!inputFile) {
    console.error(chalk.red('Error: Input file required'));
    console.log(chalk.yellow('Usage: beat-gen export <input.json> --format midi'));
    process.exit(1);
  }

  const ext = path.extname(inputFile);
  const outputFormat = options.format || 'midi';
  const outputFile = options.output || `output.${outputFormat === 'midi' ? 'mid' : 'txt'}`;

  // Load pattern
  console.log(chalk.blue(`Loading: ${inputFile}`));
  const content = await fs.readFile(inputFile, 'utf-8');
  const pattern = parseJSONPattern(content);

  // Export to target format
  if (outputFormat === 'midi' || outputFormat === 'mid') {
    console.log(chalk.blue(`Exporting to MIDI: ${outputFile}`));
    const result = await exportToMIDI(pattern, outputFile);

    console.log(chalk.green('\n✓ Export successful'));
    console.log(chalk.gray(`  • Format: MIDI`));
    console.log(chalk.gray(`  • File: ${result.path}`));
    console.log(chalk.gray(`  • Tempo: ${result.tempo} BPM`));
    console.log(chalk.gray(`  • Notes: ${result.notes}`));
  } else if (outputFormat === 'text' || outputFormat === 'txt') {
    console.log(chalk.blue(`Exporting to text: ${outputFile}`));
    const textPattern = patternToText(pattern);

    await fs.writeFile(outputFile, textPattern, 'utf-8');

    console.log(chalk.green('\n✓ Export successful'));
    console.log(chalk.gray(`  • Format: Text`));
    console.log(chalk.gray(`  • File: ${outputFile}`));
    console.log(chalk.gray(`\nPattern:\n${textPattern}`));
  } else {
    console.error(chalk.red(`Error: Unknown format: ${outputFormat}`));
    console.log(chalk.yellow('Supported formats: midi, text'));
    process.exit(1);
  }
}
