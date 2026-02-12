import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { formatSampleName } from '../utils/gm-drum-map.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const MAX_ELEVENLABS_DURATION = 22; // seconds

// ── Instrument kit definitions per genre ────────────────────────────

const INSTRUMENT_KITS = {
  house: {
    bass:       { prompt: 'sustained deep synth bass note C2 electronic house music warm', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained synth lead note C4 electronic house music bright square wave', referencePitch: 60, duration: 3 },
    pad:        { prompt: 'sustained ambient synth pad chord C4 electronic house music warm atmospheric', referencePitch: 60, duration: 5 },
    vocalChop:  { prompt: 'female vocal chop ah oh yeah pitched C4 house music soulful disco', referencePitch: 60, duration: 2 },
    stab:       { prompt: 'house organ stab chord hit C4 bright percussive short funky', referencePitch: 60, duration: 1 },
    atmosphere: { prompt: 'lush evolving ambient drone pad warm tape saturation atmospheric dreamy', referencePitch: 60, duration: 22 },
  },
  techno: {
    bass:       { prompt: 'sustained dark techno sub bass note C2 deep rumbling electronic', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained techno synth lead stab C4 industrial metallic sharp', referencePitch: 60, duration: 2 },
    pad:        { prompt: 'sustained dark ambient drone pad C4 techno atmospheric evolving', referencePitch: 60, duration: 5 },
    noise:      { prompt: 'filtered white noise sweep rising tension build electronic techno', referencePitch: 60, duration: 10 },
    stab:       { prompt: 'techno stab hit C4 industrial metallic sharp percussive short', referencePitch: 60, duration: 1 },
    texture:    { prompt: 'evolving granular texture pad warm crackling industrial C4 dark', referencePitch: 60, duration: 20 },
    atmosphere: { prompt: 'dark evolving ambient drone industrial atmospheric rumbling deep', referencePitch: 60, duration: 22 },
  },
  dnb: {
    bass:       { prompt: 'sustained reese bass note C2 drum and bass deep growling wobble', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained bright synth lead C4 drum and bass energetic sharp', referencePitch: 60, duration: 2 },
    pad:        { prompt: 'sustained atmospheric pad C4 drum and bass liquid ethereal', referencePitch: 60, duration: 5 },
    stab:       { prompt: 'dnb stab hit chord C4 bright energetic sharp jungle', referencePitch: 60, duration: 1 },
    noise:      { prompt: 'filtered noise sweep rising tension drum and bass build electronic', referencePitch: 60, duration: 10 },
    atmosphere: { prompt: 'atmospheric liquid ambient drone pad ethereal jungle space', referencePitch: 60, duration: 22 },
  },
  reggae: {
    bass:       { prompt: 'sustained warm dub bass note C2 reggae deep round clean', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained melodica note C4 reggae dub clean bright', referencePitch: 60, duration: 3 },
    pad:        { prompt: 'sustained organ chord C4 reggae warm vintage smooth', referencePitch: 60, duration: 5 },
    atmosphere: { prompt: 'dub echo chamber ambient reverberant warm vintage atmospheric', referencePitch: 60, duration: 22 },
  },
  'trip-hop': {
    bass:       { prompt: 'sustained deep mellow bass note C2 trip-hop downtempo warm analog', referencePitch: 36, duration: 4 },
    lead:       { prompt: 'sustained ethereal synth note C4 trip-hop atmospheric dreamy', referencePitch: 60, duration: 3 },
    pad:        { prompt: 'sustained ambient pad C4 trip-hop cinematic dark atmospheric', referencePitch: 60, duration: 6 },
    vocalChop:  { prompt: 'female vocal chop ethereal pitched C4 trip-hop downtempo haunting', referencePitch: 60, duration: 2 },
    texture:    { prompt: 'evolving vinyl crackle tape hiss atmospheric lo-fi warm textural', referencePitch: 60, duration: 20 },
    atmosphere: { prompt: 'dark cinematic ambient drone atmospheric trip-hop evolving haunting', referencePitch: 60, duration: 22 },
  },
  breakbeat: {
    bass:       { prompt: 'sustained punchy bass note C2 breakbeat electronic funky', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained sharp synth lead C4 breakbeat electronic energetic', referencePitch: 60, duration: 2 },
    pad:        { prompt: 'sustained warm pad chord C4 breakbeat electronic atmospheric', referencePitch: 60, duration: 5 },
    stab:       { prompt: 'breakbeat stab hit C4 funky sharp electronic percussive', referencePitch: 60, duration: 1 },
    noise:      { prompt: 'filtered noise sweep rising electronic breakbeat build tension', referencePitch: 60, duration: 10 },
  },
  'uk-garage': {
    bass:       { prompt: 'sustained deep garage bass note C2 uk-garage bouncy warm sub', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained bright vocal chop synth C4 uk-garage smooth R&B', referencePitch: 60, duration: 2 },
    pad:        { prompt: 'sustained lush chord pad C4 uk-garage warm smooth soulful', referencePitch: 60, duration: 5 },
    vocalChop:  { prompt: 'female vocal chop ah oh yeah pitched C4 UK garage R&B soulful', referencePitch: 60, duration: 2 },
    stab:       { prompt: 'garage organ stab chord hit C4 bright percussive short', referencePitch: 60, duration: 1 },
    texture:    { prompt: 'evolving granular texture pad warm crackling vinyl C4 atmospheric lo-fi', referencePitch: 60, duration: 20 },
    atmosphere: { prompt: 'lush evolving ambient drone pad warm tape saturation atmospheric dreamy', referencePitch: 60, duration: 22 },
    noise:      { prompt: 'filtered white noise sweep rising tension build electronic', referencePitch: 60, duration: 10 },
    scratch:    { prompt: 'vinyl record scratch DJ turntable short sharp', referencePitch: 60, duration: 1 },
  },
  idm: {
    bass:       { prompt: 'sustained glitchy bass note C2 IDM experimental granular', referencePitch: 36, duration: 3 },
    lead:       { prompt: 'sustained digital synth lead C4 IDM experimental crystalline', referencePitch: 60, duration: 2 },
    pad:        { prompt: 'sustained evolving texture pad C4 IDM ambient experimental', referencePitch: 60, duration: 6 },
    texture:    { prompt: 'evolving digital artifacts glitch texture granular IDM C4 alien', referencePitch: 60, duration: 20 },
    noise:      { prompt: 'digital noise burst glitch IDM static electronic processed', referencePitch: 60, duration: 8 },
    scratch:    { prompt: 'glitched vinyl scratch digital artifact IDM short sharp', referencePitch: 60, duration: 1 },
    vocalChop:  { prompt: 'processed vocal fragment C4 IDM glitchy stuttering experimental', referencePitch: 60, duration: 2 },
    atmosphere: { prompt: 'evolving alien ambient drone experimental IDM atmospheric digital', referencePitch: 60, duration: 22 },
  },
  ostinato: {
    bass:       { prompt: 'sustained deep orchestral bass note C2 cinematic dark', referencePitch: 36, duration: 4 },
    lead:       { prompt: 'sustained string melody note C4 cinematic orchestral emotional', referencePitch: 60, duration: 3 },
    pad:        { prompt: 'sustained orchestral string pad C4 cinematic wide atmospheric', referencePitch: 60, duration: 6 },
    atmosphere: { prompt: 'cinematic ambient drone orchestral dark evolving atmospheric wide', referencePitch: 60, duration: 22 },
    texture:    { prompt: 'evolving orchestral texture granular strings atmospheric cinematic', referencePitch: 60, duration: 20 },
  },
};

export { INSTRUMENT_KITS };

// ── Experimental prompts per genre ────────────────────────────────

const EXPERIMENTAL_PROMPTS = {
  'uk-garage': {
    bass: [
      'underwater vocoded bass growl C2 alien mutant warped',
      'reversed tape bass note decaying into white noise C2',
      'granular crumbling bass C2 digital artifacts stuttering',
    ],
    lead: [
      'processed vocal formant synth C4 alien robotic pitched',
      'ring-modulated bell tone C4 metallic shifting shimmering',
    ],
    pad: [
      'time-stretched choir C4 ghostly evolving granular ethereal',
      'reversed reverb wash C4 atmospheric swelling haunting',
    ],
    texture: [
      'shortwave radio static tuning through stations ghostly',
      'field recording processed through reverb metallic resonance underwater',
      'time-stretched birdsong into ambient wash ethereal alien',
    ],
    vocalChop: [
      'glitched vocal fragment pitched C4 stuttering granular chopped',
      'vocoded robot voice C4 processed digital alien',
    ],
  },
  idm: {
    bass: [
      'granular cloud bass C2 fragmenting dissolving digital artifacts',
      'frequency modulated bass growl C2 unstable warping mutant',
    ],
    lead: [
      'ring-modulated crystalline tone C4 fracturing glitch harmonic',
      'spectral freeze synth C4 suspended evolving alien digital',
    ],
    texture: [
      'corrupted data stream sonification digital noise evolving',
      'microscopic sound design amplified insect wings mechanical',
      'contact microphone recording processed through granular synthesis',
    ],
  },
  techno: {
    bass: [
      'distorted industrial bass C2 grinding harsh metallic rumble',
      'bit-crushed sub bass C2 digital degradation lo-fi harsh',
    ],
    lead: [
      'feedback oscillator C4 unstable harsh industrial piercing',
      'ring-modulated percussion hit C4 metallic resonant industrial',
    ],
    texture: [
      'factory machinery processed ambient industrial dark atmospheric',
      'electromagnetic interference recording processed through delay dark',
    ],
  },
  house: {
    bass: [
      'saturated analog bass C2 overdriven warm distorted deep',
      'tape-warped bass note C2 wobbly detuned vintage analog',
    ],
    vocalChop: [
      'processed breath sound pitched C4 ethereal ghostly intimate',
      'reversed vocal phrase C4 atmospheric building mysterious',
    ],
  },
  'trip-hop': {
    bass: [
      'underwater muffled bass C2 distant deep submerged filtered',
      'tape-degraded bass note C2 warped slow decaying vintage',
    ],
    lead: [
      'detuned music box melody C4 haunting broken melancholic',
      'processed theremin tone C4 eerie wavering ghostly',
    ],
    texture: [
      'rain on window recorded through contact mic atmospheric lo-fi',
      'vinyl crackle and pop amplified textural warm nostalgic',
    ],
  },
};

// ── Prompt mutation modifiers ────────────────────────────────

const PROMPT_MODIFIERS = [
  'reversed', 'granular', 'bit-crushed', 'ring-modulated', 'time-stretched 4x',
  'pitch-shifted down octave', 'spectral freeze', 'convolution reverb cathedral',
  'tape saturated', 'formant shifted', 'frequency modulated', 'phaser processed',
  'underwater filtered', 'lo-fi degraded', 'feedback processed',
];

/**
 * Mutate a prompt by appending random modifiers
 * @param {string} prompt - Base prompt
 * @param {number} weirdness - 0-1 how many modifiers to add
 * @param {function} rng - Seeded random function
 * @returns {string} Mutated prompt
 */
export function mutatePrompt(prompt, weirdness, rng) {
  const numMods = Math.floor(weirdness * 3); // 0-3 modifiers
  if (numMods === 0) return prompt;

  const shuffled = [...PROMPT_MODIFIERS].sort(() => rng() - 0.5);
  const mods = shuffled.slice(0, numMods);
  return `${prompt} ${mods.join(' ')}`;
}

/**
 * Select prompt for an instrument based on weirdness parameter
 * @param {string} genre
 * @param {string} instrument
 * @param {number} weirdness - 0-1
 * @param {function} rng - Seeded random function
 * @returns {string} Selected prompt
 */
export function selectPrompt(genre, instrument, weirdness, rng) {
  const kit = INSTRUMENT_KITS[genre];
  if (!kit || !kit[instrument]) return null;

  const basePrompt = kit[instrument].prompt;

  // At weirdness 0, always use standard prompt
  if (weirdness <= 0) return basePrompt;

  // Check for experimental alternatives
  const expGenre = EXPERIMENTAL_PROMPTS[genre];
  const expPrompts = expGenre && expGenre[instrument];

  if (expPrompts && rng() < weirdness) {
    // Pick random experimental prompt
    const idx = Math.floor(rng() * expPrompts.length);
    let prompt = expPrompts[idx];

    // At high weirdness, also mutate
    if (weirdness > 0.7) {
      prompt = mutatePrompt(prompt, weirdness, rng);
    }
    return prompt;
  }

  // Possibly mutate the standard prompt
  if (weirdness > 0.5 && rng() < weirdness - 0.5) {
    return mutatePrompt(basePrompt, weirdness, rng);
  }

  return basePrompt;
}

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
      duration_seconds: Math.min(duration, MAX_ELEVENLABS_DURATION),
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
 * Generate a long sample (>22s) by generating at max duration then crossfade-looping
 * @param {string} prompt
 * @param {number} targetDuration - Desired duration in seconds
 * @param {object} options
 * @returns {Promise<object>} Result with path
 */
export async function generateLongSample(prompt, targetDuration, options = {}) {
  const { outputPath, apiKey } = options;

  if (targetDuration <= MAX_ELEVENLABS_DURATION) {
    return generateSample(prompt, { ...options, duration: targetDuration });
  }

  // Generate base sample at max duration
  const basePath = outputPath.replace(/\.[^.]+$/, '_base.mp3');
  await generateSample(prompt, {
    ...options,
    duration: MAX_ELEVENLABS_DURATION,
    outputPath: basePath,
  });

  // Use FFmpeg to crossfade-loop to target duration
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  try {
    await execFileAsync('ffmpeg', [
      '-y', '-i', basePath,
      '-filter_complex',
      `aloop=loop=2:size=${MAX_ELEVENLABS_DURATION * 44100},acrossfade=d=3,atrim=0:${targetDuration},afade=t=out:st=${targetDuration - 2}:d=2`,
      outputPath,
    ]);

    // Clean up base file
    await fs.unlink(basePath).catch(() => {});

    const stat = await fs.stat(outputPath);
    return { path: outputPath, size: stat.size, prompt };
  } catch (err) {
    // Fallback: just use the base sample as-is
    if (outputPath !== basePath) {
      await fs.rename(basePath, outputPath);
    }
    const stat = await fs.stat(outputPath);
    return { path: outputPath, size: stat.size, prompt };
  }
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

      console.log(`  Saved: ${filename}`);
    } catch (error) {
      console.error(`  Failed: ${prompt} - ${error.message}`);
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

      console.log(`  Variant ${i}: ${filename}`);
    } catch (error) {
      console.error(`  Variant ${i} failed: ${error.message}`);
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
 * Generate instrument samples for a genre
 * Creates N variants per instrument and writes samples.json metadata
 * @param {string} genre
 * @param {object} options
 * @param {number} [options.weirdness=0] - 0-1 experimental prompt selection
 */
export async function generateInstrumentKit(genre, options = {}) {
  const {
    variants = 3,
    outputDir = `./data/samples/${genre}`,
    apiKey = null,
    instruments = null, // null = all, or ['bass', 'lead'] etc.
    weirdness = 0,
  } = options;

  const kit = INSTRUMENT_KITS[genre];
  if (!kit) {
    throw new Error(`No instrument kit for genre: ${genre}. Available: ${Object.keys(INSTRUMENT_KITS).join(', ')}`);
  }

  await fs.mkdir(outputDir, { recursive: true });

  const instrumentNames = instruments || Object.keys(kit);
  const allResults = [];
  const metadata = {};

  // Seeded RNG for weirdness
  let rngState = 42;
  const rng = () => {
    rngState = (rngState * 16807) % 2147483647;
    return (rngState - 1) / 2147483646;
  };

  // Estimate API calls for cost warning
  const totalCalls = instrumentNames.length * variants;
  console.log(`Generating ${totalCalls} samples (${instrumentNames.length} instruments x ${variants} variants)`);
  if (weirdness > 0) {
    console.log(`Weirdness: ${weirdness} (experimental prompts enabled)`);
  }

  for (const instName of instrumentNames) {
    const config = kit[instName];
    if (!config) {
      console.warn(`Warning: No config for instrument "${instName}" in ${genre} kit`);
      continue;
    }

    console.log(`\n--- ${instName} (${variants} variants) ---`);

    // Select prompt based on weirdness
    const prompt = weirdness > 0
      ? selectPrompt(genre, instName, weirdness, rng) || config.prompt
      : config.prompt;

    const targetDuration = config.duration;
    const isLong = targetDuration > MAX_ELEVENLABS_DURATION;

    for (let v = 1; v <= variants; v++) {
      const filename = `${instName}-v${v}.mp3`;
      const outputPath = path.join(outputDir, filename);

      try {
        let result;
        if (isLong) {
          result = await generateLongSample(prompt, targetDuration, {
            apiKey,
            promptInfluence: 0.5,
            outputPath,
          });
        } else {
          result = await generateSample(prompt, {
            apiKey,
            duration: targetDuration,
            promptInfluence: 0.5,
            outputPath,
          });
        }

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

  // Merge with existing samples.json metadata (don't overwrite)
  const metadataPath = path.join(outputDir, 'samples.json');
  let existingMetadata = {};
  try {
    existingMetadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
  } catch { /* no existing file */ }
  const merged = { ...existingMetadata, ...metadata };
  await fs.writeFile(metadataPath, JSON.stringify(merged, null, 2));
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
