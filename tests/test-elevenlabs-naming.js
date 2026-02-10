#!/usr/bin/env node

/**
 * Test ElevenLabs filename generation from prompts
 */

// Mock the formatSampleName function
import { formatSampleName } from '../src/utils/gm-drum-map.js';

// Reproduce sanitizeFilename logic
function sanitizeFilename(str) {
  const clean = str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const drumTypes = [
    'hihat-open', 'hihat-pedal', 'tom-high', 'tom-mid', 'tom-low', 'tom-floor',
    'conga-high', 'conga-low', 'bongo-high', 'bongo-low',
    'timbale-high', 'timbale-low', 'woodblock-high', 'woodblock-low',
    'agogo-high', 'agogo-low', 'whistle-short', 'whistle-long',
    'guiro-short', 'guiro-long', 'triangle-open', 'triangle-mute',
    'crash2', 'ride2',
    'kick', 'snare', 'hihat', 'crash', 'ride', 'china', 'splash',
    'clap', 'rimshot', 'cowbell', 'tambourine', 'shaker', 'maracas', 'claves',
  ];

  // Check if prompt starts with a drum type
  for (const type of drumTypes) {
    if (clean.startsWith(type)) {
      const remainder = clean.slice(type.length).trim().replace(/^-+/, '');
      const descriptor = remainder && remainder.length > 0 ? remainder.substring(0, 30) : null;
      return formatSampleName(type, descriptor);
    }
  }

  // Try to extract drum type from anywhere
  for (const type of drumTypes) {
    const words = clean.split('-');
    if (words.includes(type)) {
      const otherWords = words.filter(w => w !== type && w.length > 0);
      const descriptor = otherWords.length > 0 ? otherWords.join('-').substring(0, 30) : null;
      return formatSampleName(type, descriptor);
    }
  }

  return clean.replace(/^-|-$/g, '').substring(0, 50);
}

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   ElevenLabs Prompt → Filename Conversion Test       ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

const prompts = [
  { prompt: 'kick deep house', expected: '36-kick-deep-house' },
  { prompt: 'snare tight house', expected: '38-snare-tight-house' },
  { prompt: 'hihat crisp', expected: '42-hihat-crisp' },
  { prompt: 'hihat-open bright', expected: '46-hihat-open-bright' },
  { prompt: 'clap house', expected: '39-clap-house' },
  { prompt: 'kick 808', expected: '36-kick-808' },
  { prompt: 'snare acoustic', expected: '38-snare-acoustic' },
  { prompt: 'rimshot percussive', expected: '37-rimshot-percussive' },
  { prompt: 'crash jungle', expected: '49-crash-jungle' },
  { prompt: 'kick', expected: '36-kick' },
];

let passed = 0;
let failed = 0;

for (const test of prompts) {
  const result = sanitizeFilename(test.prompt);
  const expected = test.expected;
  const pass = result === expected;

  if (pass) {
    console.log(`✓ "${test.prompt}"`);
    console.log(`  → ${result}.mp3\n`);
    passed++;
  } else {
    console.log(`✗ "${test.prompt}"`);
    console.log(`  Expected: ${expected}.mp3`);
    console.log(`  Got: ${result}.mp3\n`);
    failed++;
  }
}

console.log('─'.repeat(55));
console.log(`Results: ${passed} passed, ${failed} failed\n`);

process.exit(failed > 0 ? 1 : 0);
