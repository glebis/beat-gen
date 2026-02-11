import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { formatSampleName } from '../utils/gm-drum-map.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

// ── Instrument kit definitions per genre ────────────────────────────

const INSTRUMENT_KITS = {
  house: {
    bass: { prompt: 'sustained deep synth bass note C2 electronic house music warm', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained synth lead note C4 electronic house music bright square wave', referencePitch: 60, duration: 3 },
    pad:  { prompt: 'sustained ambient synth pad chord C4 electronic house music warm atmospheric', referencePitch: 60, duration: 5 },
  },
  techno: {
    bass: { prompt: 'sustained dark techno sub bass note C2 deep rumbling electronic', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained techno synth lead stab C4 industrial metallic sharp', referencePitch: 60, duration: 2 },
    pad:  { prompt: 'sustained dark ambient drone pad C4 techno atmospheric evolving', referencePitch: 60, duration: 5 },
  },
  dnb: {
    bass: { prompt: 'sustained reese bass note C2 drum and bass deep growling wobble', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained bright synth lead C4 drum and bass energetic sharp', referencePitch: 60, duration: 2 },
    pad:  { prompt: 'sustained atmospheric pad C4 drum and bass liquid ethereal', referencePitch: 60, duration: 5 },
  },
  reggae: {
    bass: { prompt: 'sustained warm dub bass note C2 reggae deep round clean', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained melodica note C4 reggae dub clean bright', referencePitch: 60, duration: 3 },
    pad:  { prompt: 'sustained organ chord C4 reggae warm vintage smooth', referencePitch: 60, duration: 5 },
  },
  'trip-hop': {
    bass: { prompt: 'sustained deep mellow bass note C2 trip-hop downtempo warm analog', referencePitch: 36, duration: 4 },
    lead: { prompt: 'sustained ethereal synth note C4 trip-hop atmospheric dreamy', referencePitch: 60, duration: 3 },
    pad:  { prompt: 'sustained ambient pad C4 trip-hop cinematic dark atmospheric', referencePitch: 60, duration: 6 },
  },
  breakbeat: {
    bass: { prompt: 'sustained punchy bass note C2 breakbeat electronic funky', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained sharp synth lead C4 breakbeat electronic energetic', referencePitch: 60, duration: 2 },
    pad:  { prompt: 'sustained warm pad chord C4 breakbeat electronic atmospheric', referencePitch: 60, duration: 5 },
  },
  'uk-garage': {
    bass: { prompt: 'sustained deep garage bass note C2 uk-garage bouncy warm sub', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained bright vocal chop synth C4 uk-garage smooth R&B', referencePitch: 60, duration: 2 },
    pad:  { prompt: 'sustained lush chord pad C4 uk-garage warm smooth soulful', referencePitch: 60, duration: 5 },
  },
  idm: {
    bass: { prompt: 'sustained glitchy bass note C2 IDM experimental granular', referencePitch: 36, duration: 3 },
    lead: { prompt: 'sustained digital synth lead C4 IDM experimental crystalline', referencePitch: 60, duration: 2 },
    pad:  { prompt: 'sustained evolving texture pad C4 IDM ambient experimental', referencePitch: 60, duration: 6 },
  },
  ostinato: {
    bass: { prompt: 'sustained deep orchestral bass note C2 cinematic dark', referencePitch: 36, duration: 4 },
    lead: { prompt: 'sustained string melody note C4 cinematic orchestral emotional', referencePitch: 60, duration: 3 },
    pad:  { prompt: 'sustained orchestral string pad C4 cinematic wide atmospheric', referencePitch: 60, duration: 6 },
  },
};

export { INSTRUMENT_KITS };

/**
 * Generate sound effect using 11Labs API
 */
export async function generateSample(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('11Labs API key required. Set ELEVENLABS_API_KEY environment variable or pass --api-key');
  }

  const {
    duration = 2,
    promptInfluence = 0.5,
    outputPath = null,
  } = options;

  const response = await fetch(`${ELEVENLABS_API_BASE}/sound-generation`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt,
      duration_seconds: duration,
      prompt_influence: promptInfluence,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`11Labs API error: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();

  // Save to file if path provided
  if (outputPath) {
    await fs.writeFile(outputPath, Buffer.from(audioBuffer));
    return {
      path: outputPath,
      size: audioBuffer.byteLength,
      prompt,
    };
  }

  return Buffer.from(audioBuffer);
}

/**
 * Generate multiple samples in batch
 */
export async function generateBatchSamples(prompts, options = {}) {
  const {
    outputDir = './data/samples',
    format = 'wav',
    apiKey = null,
  } = options;

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  const results = [];

  for (const prompt of prompts) {
    console.log(`Generating: ${prompt}...`);

    const filename = sanitizeFilename(prompt) + '.mp3';
    const outputPath = path.join(outputDir, filename);

    try {
      const result = await generateSample(prompt, {
        ...options,
        apiKey,
        outputPath,
      });

      results.push({
        success: true,
        prompt,
        ...result,
      });

      console.log(`✓ Saved: ${filename}`);
    } catch (error) {
      console.error(`✗ Failed: ${prompt} - ${error.message}`);
      results.push({
        success: false,
        prompt,
        error: error.message,
      });
    }

    // Rate limiting: wait between requests
    await sleep(1000);
  }

  return results;
}

/**
 * Generate samples from drum kit preset
 * Prompts follow format: "drum-type descriptor" to generate "note-drum-type-descriptor.mp3"
 */
export async function generateDrumKit(kitName, options = {}) {
  const kits = {
    '808': [
      'kick 808',
      'snare 808',
      'hihat 808',
      'hihat-open 808',
      'rimshot 808',
      'clap 808',
      'cowbell 808',
    ],
    'acoustic': [
      'kick acoustic',
      'snare acoustic',
      'hihat acoustic',
      'hihat-open acoustic',
      'tom-high acoustic',
      'tom-mid acoustic',
      'tom-low acoustic',
      'crash acoustic',
      'ride acoustic',
    ],
    'electronic': [
      'kick electronic',
      'snare electronic',
      'hihat electronic',
      'clap electronic',
      'rimshot electronic',
    ],
  };

  const prompts = kits[kitName];

  if (!prompts) {
    throw new Error(`Unknown kit: ${kitName}. Available: ${Object.keys(kits).join(', ')}`);
  }

  return generateBatchSamples(prompts, {
    ...options,
    outputDir: options.outputDir || `./data/samples/${kitName}`,
  });
}

/**
 * Sanitize filename using GM drum name standards with MIDI note prefix
 */
function sanitizeFilename(str) {
  const clean = str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  // List of standard GM drum types (longer names first to match correctly)
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
      // Use drum type as base name
      const remainder = clean.slice(type.length).trim().replace(/^-+/, '');
      const descriptor = remainder && remainder.length > 0 ? remainder.substring(0, 30) : null;
      return formatSampleName(type, descriptor);
    }
  }

  // Try to extract drum type from anywhere in the prompt
  for (const type of drumTypes) {
    const words = clean.split('-');
    if (words.includes(type)) {
      // Found drum type - use it as base
      const otherWords = words.filter(w => w !== type && w.length > 0);
      const descriptor = otherWords.length > 0 ? otherWords.join('-').substring(0, 30) : null;
      return formatSampleName(type, descriptor);
    }
  }

  // Fallback to cleaned full prompt (max 50 chars)
  return clean.replace(/^-|-$/g, '').substring(0, 50);
}

/**
 * Generate multiple variants of a single sample
 * @param {string} prompt - Sample description
 * @param {number} variants - Number of variants to generate (default: 3)
 * @param {object} options - Generation options
 * @returns {Promise<Array>} Array of generated sample results
 */
export async function generateSampleVariants(prompt, variants = 3, options = {}) {
  const {
    outputDir = './data/samples',
    apiKey = null,
  } = options;

  await fs.mkdir(outputDir, { recursive: true });

  const baseFilename = sanitizeFilename(prompt);
  const results = [];

  console.log(`Generating ${variants} variants: ${prompt}...`);

  for (let i = 1; i <= variants; i++) {
    const filename = `${baseFilename}-v${i}.mp3`;
    const outputPath = path.join(outputDir, filename);

    try {
      const result = await generateSample(prompt, {
        ...options,
        apiKey,
        outputPath,
      });

      results.push({
        success: true,
        prompt,
        variant: i,
        ...result,
      });

      console.log(`  ✓ Variant ${i}: ${filename}`);
    } catch (error) {
      console.error(`  ✗ Variant ${i} failed: ${error.message}`);
      results.push({
        success: false,
        prompt,
        variant: i,
        error: error.message,
      });
    }

    // Rate limiting between variants
    if (i < variants) {
      await sleep(1000);
    }
  }

  return results;
}

/**
 * Generate multiple variants for each sample in a batch
 * @param {Array<string>} prompts - Array of sample descriptions
 * @param {number} variants - Number of variants per sample
 * @param {object} options - Generation options
 * @returns {Promise<Array>} Array of all generated results
 */
export async function generateBatchWithVariants(prompts, variants = 3, options = {}) {
  const allResults = [];

  for (const prompt of prompts) {
    const variantResults = await generateSampleVariants(prompt, variants, options);
    allResults.push(...variantResults);

    // Longer delay between different samples
    await sleep(2000);
  }

  return allResults;
}

/**
 * Generate instrument samples (bass, lead, pad) for a genre
 * Creates N variants per instrument and writes samples.json metadata
 */
export async function generateInstrumentKit(genre, options = {}) {
  const {
    variants = 3,
    outputDir = `./data/samples/${genre}`,
    apiKey = null,
    instruments = null, // null = all, or ['bass', 'lead'] etc.
  } = options;

  const kit = INSTRUMENT_KITS[genre];
  if (!kit) {
    throw new Error(`No instrument kit for genre: ${genre}. Available: ${Object.keys(INSTRUMENT_KITS).join(', ')}`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  const instrumentNames = instruments || Object.keys(kit);
  const allResults = [];
  const metadata = {};

  // Estimate API calls for cost warning
  const totalCalls = instrumentNames.length * variants;
  console.log(`Generating ${totalCalls} samples (${instrumentNames.length} instruments x ${variants} variants)`);

  for (const instName of instrumentNames) {
    const config = kit[instName];
    if (!config) {
      console.warn(`Warning: No config for instrument "${instName}" in ${genre} kit`);
      continue;
    }

    console.log(`\n--- ${instName} (${variants} variants) ---`);

    for (let v = 1; v <= variants; v++) {
      const filename = `${instName}-v${v}.mp3`;
      const outputPath = path.join(outputDir, filename);

      try {
        const result = await generateSample(config.prompt, {
          apiKey,
          duration: config.duration,
          promptInfluence: 0.5,
          outputPath,
        });

        allResults.push({
          success: true,
          instrument: instName,
          variant: v,
          ...result,
        });

        console.log(`  v${v}: ${filename}`);
      } catch (error) {
        console.error(`  v${v} failed: ${error.message}`);
        allResults.push({
          success: false,
          instrument: instName,
          variant: v,
          error: error.message,
        });
      }

      // Rate limiting
      await sleep(1000);
    }

    metadata[instName] = {
      referencePitch: config.referencePitch,
      variants,
    };
  }

  // Write samples.json metadata
  const metadataPath = path.join(outputDir, 'samples.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\nMetadata written: ${metadataPath}`);

  return { results: allResults, metadata, metadataPath };
}

/**
 * Get available instrument kit genres
 */
export function listInstrumentKitGenres() {
  return Object.keys(INSTRUMENT_KITS);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
