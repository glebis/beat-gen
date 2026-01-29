import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

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
    outputDir = './samples',
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
 */
export async function generateDrumKit(kitName, options = {}) {
  const kits = {
    '808': [
      '808 kick drum',
      '808 snare drum',
      '808 closed hi-hat',
      '808 open hi-hat',
      '808 rim shot',
      '808 clap',
      '808 cowbell',
    ],
    'acoustic': [
      'acoustic kick drum',
      'acoustic snare drum',
      'acoustic closed hi-hat',
      'acoustic open hi-hat',
      'acoustic tom high',
      'acoustic tom mid',
      'acoustic tom low',
      'acoustic crash cymbal',
      'acoustic ride cymbal',
    ],
    'electronic': [
      'electronic kick bass',
      'electronic snare',
      'electronic hi-hat',
      'electronic clap',
      'laser zap',
      'digital noise hit',
    ],
  };

  const prompts = kits[kitName];

  if (!prompts) {
    throw new Error(`Unknown kit: ${kitName}. Available: ${Object.keys(kits).join(', ')}`);
  }

  return generateBatchSamples(prompts, {
    ...options,
    outputDir: options.outputDir || `./samples/${kitName}`,
  });
}

/**
 * Sanitize filename
 */
function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
