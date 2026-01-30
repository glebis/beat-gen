/**
 * Config file loader
 */

import fs from 'fs';
import path from 'path';

let cachedConfig = null;

/**
 * Load config from config.json
 */
export function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), 'config.json');

  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      cachedConfig = JSON.parse(content);
      return cachedConfig;
    }
  } catch (error) {
    // Silently fail - config is optional
  }

  return {};
}

/**
 * Get 11Labs API key from config or environment
 */
export function getElevenLabsApiKey(cliOption) {
  // Priority: CLI option > config.json > environment variable
  if (cliOption) {
    return cliOption;
  }

  const config = loadConfig();
  if (config.elevenlabs?.apiKey) {
    return config.elevenlabs.apiKey;
  }

  return process.env.ELEVENLABS_API_KEY;
}

/**
 * Get config value with fallback
 */
export function getConfigValue(path, defaultValue) {
  const config = loadConfig();
  const keys = path.split('.');
  let value = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value !== undefined ? value : defaultValue;
}
