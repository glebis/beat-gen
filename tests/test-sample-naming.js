#!/usr/bin/env node

/**
 * Test sample naming conventions
 * Verifies MIDI note-prefixed filenames are generated correctly
 */

import { formatSampleName, getDrumFileName, GM_DRUM_MAP } from '../src/utils/gm-drum-map.js';

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║        Sample Naming Convention Tests                ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

const tests = [
  // Basic drums (no descriptor)
  { drum: 'kick', expected: '36-kick' },
  { drum: 'snare', expected: '38-snare' },
  { drum: 'hihat', expected: '42-hihat' },
  { drum: 'hihat-open', expected: '46-hihat-open' },
  { drum: 'clap', expected: '39-clap' },
  { drum: 'rimshot', expected: '37-rimshot' },
  { drum: 'crash', expected: '49-crash' },
  { drum: 'ride', expected: '51-ride' },

  // With descriptors
  { drum: 'kick', descriptor: '808', expected: '36-kick-808' },
  { drum: 'snare', descriptor: 'tight', expected: '38-snare-tight' },
  { drum: 'hihat', descriptor: 'crisp', expected: '42-hihat-crisp' },
  { drum: 'kick', descriptor: 'deep-house', expected: '36-kick-deep-house' },
  { drum: 'snare', descriptor: 'acoustic-jazz', expected: '38-snare-acoustic-jazz' },

  // Aliases
  { drum: 'bd', expected: '36-kick' },
  { drum: 'sn', expected: '38-snare' },
  { drum: 'hh', expected: '42-hihat' },
  { drum: 'oh', expected: '46-hihat-open' },
];

let passed = 0;
let failed = 0;

console.log('Testing formatSampleName():\n');

for (const test of tests) {
  const result = formatSampleName(test.drum, test.descriptor || null);
  const expected = test.expected;
  const pass = result === expected;

  if (pass) {
    console.log(`✓ ${test.drum}${test.descriptor ? ` + "${test.descriptor}"` : ''}: ${result}`);
    passed++;
  } else {
    console.log(`✗ ${test.drum}${test.descriptor ? ` + "${test.descriptor}"` : ''}: Expected "${expected}", got "${result}"`);
    failed++;
  }
}

console.log('\n' + '─'.repeat(55));
console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Test GM drum map coverage
console.log('\n\nGM Drum Map Coverage:');
const standardDrums = ['kick', 'snare', 'hihat', 'hihat-open', 'clap', 'crash', 'ride', 'tom-high', 'tom-mid', 'tom-low'];

for (const drum of standardDrums) {
  const note = GM_DRUM_MAP[drum];
  const fileName = getDrumFileName(drum);
  const fullName = formatSampleName(drum);
  console.log(`  ${drum.padEnd(12)} → Note ${note} → ${fullName}.mp3`);
}

console.log('\n✓ All tests complete!\n');

process.exit(failed > 0 ? 1 : 0);
