import path from 'path';
import { parseTextPattern, parseJSONPattern, applySwing } from '../../core/pattern-parser.js';
import { exportToMIDI } from '../../services/midi-service.js';
import { readInput, writeOutput } from '../../utils/stdio.js';
import { EXIT_CODES, exitError, exitUsage, exitFileError } from '../../utils/exit-codes.js';
import * as log from '../../utils/logger.js';

/**
 * Compose command - Unix-compliant version
 * Supports stdin/stdout, proper error codes, quiet mode
 */
export async function composeCommand(patternInput, options) {
  // Set logger mode
  log.setQuiet(options.quiet || false);
  log.setVerbose(options.verbose || false);

  log.section('🎵 Beat-Gen Composer');

  let pattern;
  let inputPath = patternInput || '-';

  try {
    // Read pattern from file or stdin
    log.verbose(`Reading pattern from: ${inputPath}`);
    const content = await readInput(inputPath);

    // Determine format
    const ext = inputPath === '-' ? '.json' : path.extname(inputPath);

    if (ext === '.json' || inputPath === '-') {
      // Try JSON first
      try {
        pattern = parseJSONPattern(content);
        log.verbose('Parsed JSON pattern');
      } catch {
        // If JSON fails and from stdin, try text
        if (inputPath === '-') {
          const tracks = parseTextPattern(content);
          pattern = {
            tempo: options.bpm || 120,
            timeSignature: options.timeSignature || '4/4',
            resolution: options.resolution || 16,
            tracks,
          };
          log.verbose('Parsed text pattern');
        } else {
          throw new Error('Invalid JSON pattern format');
        }
      }
    } else if (ext === '.txt' || ext === '.pattern') {
      // Text pattern
      const tracks = parseTextPattern(content);
      pattern = {
        tempo: options.bpm || 120,
        timeSignature: options.timeSignature || '4/4',
        resolution: options.resolution || 16,
        tracks,
      };
      log.verbose('Parsed text pattern');
    } else {
      // Treat as inline text pattern
      const tracks = parseTextPattern(content);
      pattern = {
        tempo: options.bpm || 120,
        timeSignature: options.timeSignature || '4/4',
        resolution: options.resolution || 16,
        tracks,
      };
      log.verbose('Parsed inline pattern');
    }
  } catch (error) {
    exitFileError(`Failed to read pattern: ${error.message}`, true);
  }

  // Apply swing if specified
  if (options.swing && options.swing > 0) {
    log.verbose(`Applying swing: ${options.swing}`);
    pattern = applySwing(pattern, options.swing);
  }

  // Override tempo if specified
  if (options.bpm) {
    pattern.tempo = options.bpm;
  }

  // Print pattern info (to stderr in verbose mode)
  if (!options.quiet) {
    printPatternInfo(pattern);
  }

  // Determine output format and destination
  const outputFormat = options.format || 'midi';
  const outputFile = options.output || '-';

  try {
    if (outputFormat === 'midi' || outputFormat === 'mid') {
      // Export to MIDI
      log.info(`Exporting to MIDI: ${outputFile === '-' ? 'stdout' : outputFile}`);

      if (outputFile === '-') {
        // Export to buffer, write to stdout
        // Note: MIDI is binary, so this works for piping
        const tempFile = '/tmp/beat-gen-temp.mid';
        const result = await exportToMIDI(pattern, tempFile);

        const fs = await import('fs/promises');
        const buffer = await fs.readFile(tempFile);
        await writeOutput('-', buffer);
        await fs.unlink(tempFile);

        log.verbose(`✓ Exported ${result.notes} notes at ${result.tempo} BPM`);
      } else {
        // Export to file
        const result = await exportToMIDI(pattern, outputFile);

        log.success('✓ MIDI file created successfully');
        log.info(`  • File: ${result.path}`);
        log.info(`  • Tempo: ${result.tempo} BPM`);
        log.info(`  • Tracks: ${result.tracks}`);
        log.info(`  • Notes: ${result.notes}`);
      }
    } else if (outputFormat === 'json') {
      // Export as JSON
      const json = JSON.stringify(pattern, null, 2);
      await writeOutput(outputFile, json);
      log.success(`✓ JSON pattern exported${outputFile !== '-' ? ' to ' + outputFile : ''}`);
    } else {
      exitUsage(`Unknown format: ${outputFormat}. Supported: midi, json`);
    }

    process.exit(EXIT_CODES.SUCCESS);
  } catch (error) {
    exitError(`Export failed: ${error.message}`);
  }
}

/**
 * Print pattern information to stderr
 */
function printPatternInfo(pattern) {
  log.info('━━━ Pattern Info ━━━');
  log.info(`Tempo: ${pattern.tempo} BPM`);
  log.info(`Time Signature: ${pattern.timeSignature}`);
  log.info(`Resolution: ${pattern.resolution} steps`);
  log.info(`Tracks: ${pattern.tracks.length}`);

  log.verbose('\nTracks:');
  pattern.tracks.forEach(track => {
    const noteCount = track.pattern.length;
    log.verbose(`  • ${track.name} (MIDI ${track.midiNote}): ${noteCount} notes`);
  });
}
