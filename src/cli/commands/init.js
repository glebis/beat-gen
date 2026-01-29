import chalk from 'chalk';
import { createInterface } from 'readline';
import { execSync, spawn } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = 'beat-gen.config.json';
const ENV_FILE = '.env';

/**
 * Create readline interface for user input
 */
function createPrompt() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function ask(rl, question, defaultValue = '') {
  const defaultText = defaultValue ? chalk.gray(` (${defaultValue})`) : '';
  return new Promise((resolve) => {
    rl.question(`${question}${defaultText}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

/**
 * Prompt for yes/no confirmation
 */
function confirm(rl, question, defaultYes = true) {
  const hint = defaultYes ? chalk.gray(' (Y/n)') : chalk.gray(' (y/N)');
  return new Promise((resolve) => {
    rl.question(`${question}${hint}: `, (answer) => {
      const normalized = answer.trim().toLowerCase();
      if (normalized === '') {
        resolve(defaultYes);
      } else {
        resolve(normalized === 'y' || normalized === 'yes');
      }
    });
  });
}

/**
 * Prompt user to select from options
 */
function select(rl, question, options, defaultIndex = 0) {
  return new Promise((resolve) => {
    console.log(`\n${question}`);
    options.forEach((opt, i) => {
      const marker = i === defaultIndex ? chalk.cyan('→') : ' ';
      const label = i === defaultIndex ? chalk.cyan(opt) : opt;
      console.log(`  ${marker} ${i + 1}. ${label}`);
    });

    rl.question(`\nEnter choice ${chalk.gray(`(1-${options.length}, default: ${defaultIndex + 1})`)}: `, (answer) => {
      const index = answer.trim() ? parseInt(answer) - 1 : defaultIndex;
      if (index >= 0 && index < options.length) {
        resolve({ index, value: options[index] });
      } else {
        resolve({ index: defaultIndex, value: options[defaultIndex] });
      }
    });
  });
}

/**
 * Print the welcome banner
 */
function printBanner() {
  console.log(chalk.cyan(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                                                              ║
  ║   ${chalk.bold.white('BEAT-GEN')}  ${chalk.gray('CLI Drum Machine')}                            ║
  ║                                                              ║
  ║   ${chalk.yellow('♪')} AI-powered sample generation                          ║
  ║   ${chalk.yellow('♪')} MIDI composition & export                             ║
  ║   ${chalk.yellow('♪')} Professional WAV rendering                            ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  `));
  console.log(chalk.white('  Welcome to the beat-gen setup wizard!\n'));
  console.log(chalk.gray('  This will help you configure beat-gen for first use.\n'));
}

/**
 * Check system prerequisites
 */
async function checkPrerequisites() {
  console.log(chalk.blue('\n━━━ Checking Prerequisites ━━━\n'));

  const results = {
    node: { ok: false, version: '', message: '' },
    npm: { ok: false, version: '', message: '' },
    ffmpeg: { ok: false, version: '', message: '' }
  };

  // Check Node.js
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split('.')[0]);
    results.node.version = nodeVersion;
    results.node.ok = major >= 18;
    results.node.message = results.node.ok
      ? `Node.js ${nodeVersion}`
      : `Node.js ${nodeVersion} (v18+ recommended)`;
  } catch (e) {
    results.node.message = 'Node.js not found';
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    results.npm.ok = true;
    results.npm.version = npmVersion;
    results.npm.message = `npm ${npmVersion}`;
  } catch (e) {
    results.npm.message = 'npm not found';
  }

  // Check FFmpeg
  try {
    const ffmpegOutput = execSync('ffmpeg -version 2>&1', { encoding: 'utf8' });
    const versionMatch = ffmpegOutput.match(/ffmpeg version (\S+)/);
    results.ffmpeg.ok = true;
    results.ffmpeg.version = versionMatch ? versionMatch[1] : 'installed';
    results.ffmpeg.message = `FFmpeg ${results.ffmpeg.version}`;
  } catch (e) {
    results.ffmpeg.ok = false;
    results.ffmpeg.message = 'FFmpeg not found (needed for audio rendering)';
  }

  // Print results
  Object.entries(results).forEach(([key, result]) => {
    const icon = result.ok ? chalk.green('✓') : chalk.yellow('!');
    const text = result.ok ? chalk.green(result.message) : chalk.yellow(result.message);
    console.log(`  ${icon} ${text}`);
  });

  if (!results.ffmpeg.ok) {
    console.log(chalk.gray('\n  To install FFmpeg:'));
    console.log(chalk.gray('    macOS:   brew install ffmpeg'));
    console.log(chalk.gray('    Ubuntu:  sudo apt install ffmpeg'));
    console.log(chalk.gray('    Windows: https://ffmpeg.org/download.html'));
  }

  return results;
}

/**
 * Check for existing configuration
 */
function checkExistingConfig() {
  const configPath = join(process.cwd(), CONFIG_FILE);
  const envPath = join(process.cwd(), ENV_FILE);

  return {
    hasConfig: existsSync(configPath),
    hasEnv: existsSync(envPath),
    configPath,
    envPath
  };
}

/**
 * Validate ElevenLabs API key format
 */
function validateApiKey(key) {
  if (!key || key.length < 10) {
    return { valid: false, message: 'API key seems too short' };
  }
  if (key === 'your_api_key_here') {
    return { valid: false, message: 'Please enter your actual API key' };
  }
  return { valid: true, message: '' };
}

/**
 * Test ElevenLabs API key
 */
async function testApiKey(apiKey) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        message: `Connected as: ${data.subscription?.tier || 'user'}`,
        tier: data.subscription?.tier
      };
    } else if (response.status === 401) {
      return { valid: false, message: 'Invalid API key' };
    } else {
      return { valid: false, message: `API error: ${response.status}` };
    }
  } catch (e) {
    return { valid: false, message: `Connection error: ${e.message}` };
  }
}

/**
 * Setup API key configuration
 */
async function setupApiKey(rl, existing) {
  console.log(chalk.blue('\n━━━ ElevenLabs API Setup ━━━\n'));

  // Check for existing key
  const envKey = process.env.ELEVENLABS_API_KEY;
  if (envKey) {
    console.log(chalk.green('  ✓ API key found in environment variable'));
    const useExisting = await confirm(rl, '  Use existing ELEVENLABS_API_KEY?', true);
    if (useExisting) {
      console.log(chalk.gray('  Testing API connection...'));
      const test = await testApiKey(envKey);
      if (test.valid) {
        console.log(chalk.green(`  ✓ ${test.message}`));
        return { key: envKey, source: 'env' };
      } else {
        console.log(chalk.yellow(`  ! ${test.message}`));
      }
    }
  }

  console.log(chalk.gray('\n  ElevenLabs provides AI-powered audio generation.'));
  console.log(chalk.gray('  Get your free API key at: ') + chalk.cyan('https://elevenlabs.io'));
  console.log(chalk.gray('  Free tier includes ~100-200 sample generations/month.\n'));

  const hasKey = await confirm(rl, '  Do you have an ElevenLabs API key?', false);

  if (!hasKey) {
    console.log(chalk.yellow('\n  No problem! You can still use beat-gen without AI samples.'));
    console.log(chalk.gray('  - Compose MIDI patterns'));
    console.log(chalk.gray('  - Import/export patterns'));
    console.log(chalk.gray('  - Use your own audio samples for rendering'));
    console.log(chalk.gray('\n  Run ') + chalk.cyan('beat-gen init') + chalk.gray(' again when you have an API key.\n'));
    return { key: null, source: 'none' };
  }

  let apiKey = '';
  let validated = false;

  while (!validated) {
    apiKey = await ask(rl, '\n  Enter your ElevenLabs API key');

    const format = validateApiKey(apiKey);
    if (!format.valid) {
      console.log(chalk.yellow(`  ! ${format.message}`));
      const retry = await confirm(rl, '  Try again?', true);
      if (!retry) {
        return { key: null, source: 'none' };
      }
      continue;
    }

    console.log(chalk.gray('  Testing API connection...'));
    const test = await testApiKey(apiKey);

    if (test.valid) {
      console.log(chalk.green(`  ✓ ${test.message}`));
      validated = true;
    } else {
      console.log(chalk.red(`  ✗ ${test.message}`));
      const retry = await confirm(rl, '  Try again?', true);
      if (!retry) {
        const useAnyway = await confirm(rl, '  Save key anyway (might be a network issue)?', false);
        if (useAnyway) {
          validated = true;
        } else {
          return { key: null, source: 'none' };
        }
      }
    }
  }

  // Ask how to save the key
  const { index } = await select(rl, '  How would you like to save your API key?', [
    '.env file (recommended for projects)',
    'Environment variable only (show command)',
    'Config file (beat-gen.config.json)'
  ], 0);

  return { key: apiKey, source: ['env-file', 'env-export', 'config'][index] };
}

/**
 * Configure default settings
 */
async function configureDefaults(rl) {
  console.log(chalk.blue('\n━━━ Default Settings ━━━\n'));
  console.log(chalk.gray('  Configure your default beat-gen settings.\n'));

  const useDefaults = await confirm(rl, '  Use recommended defaults?', true);

  if (useDefaults) {
    return {
      tempo: 120,
      timeSignature: '4/4',
      resolution: 16,
      swing: 0,
      outputDir: './samples',
      sampleDuration: 2,
      promptInfluence: 0.5
    };
  }

  // Custom configuration
  console.log(chalk.gray('\n  Enter your preferences (press Enter for default):\n'));

  const tempo = parseInt(await ask(rl, '  Default tempo (BPM)', '120')) || 120;

  const { value: timeSignature } = await select(rl, '  Time signature:', [
    '4/4', '3/4', '6/8', '5/4'
  ], 0);

  const { value: resolutionStr } = await select(rl, '  Pattern resolution:', [
    '16 (16th notes - standard)',
    '32 (32nd notes - high detail)',
    '8 (8th notes - simple)'
  ], 0);
  const resolution = parseInt(resolutionStr) || 16;

  const swing = parseFloat(await ask(rl, '  Swing amount (0-1)', '0')) || 0;
  const outputDir = await ask(rl, '  Default samples directory', './samples');
  const sampleDuration = parseFloat(await ask(rl, '  Sample duration (seconds)', '2')) || 2;
  const promptInfluence = parseFloat(await ask(rl, '  AI prompt influence (0-1)', '0.5')) || 0.5;

  return {
    tempo: Math.max(40, Math.min(300, tempo)),
    timeSignature,
    resolution,
    swing: Math.max(0, Math.min(1, swing)),
    outputDir,
    sampleDuration: Math.max(0.5, Math.min(10, sampleDuration)),
    promptInfluence: Math.max(0, Math.min(1, promptInfluence))
  };
}

/**
 * Save configuration files
 */
async function saveConfiguration(apiKeyInfo, defaults) {
  console.log(chalk.blue('\n━━━ Saving Configuration ━━━\n'));

  const savedFiles = [];

  // Create .env file if needed
  if (apiKeyInfo.key && apiKeyInfo.source === 'env-file') {
    const envPath = join(process.cwd(), ENV_FILE);
    let envContent = '';

    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf8');
      // Replace existing key or append
      if (envContent.includes('ELEVENLABS_API_KEY=')) {
        envContent = envContent.replace(/ELEVENLABS_API_KEY=.*/g, `ELEVENLABS_API_KEY=${apiKeyInfo.key}`);
      } else {
        envContent += `\nELEVENLABS_API_KEY=${apiKeyInfo.key}\n`;
      }
    } else {
      envContent = `# Beat-Gen Environment Variables\nELEVENLABS_API_KEY=${apiKeyInfo.key}\n`;
    }

    writeFileSync(envPath, envContent);
    savedFiles.push('.env');
    console.log(chalk.green(`  ✓ Saved API key to ${ENV_FILE}`));
    console.log(chalk.gray('    Load with: source .env or use dotenv\n'));
  }

  // Show export command if requested
  if (apiKeyInfo.key && apiKeyInfo.source === 'env-export') {
    console.log(chalk.yellow('  Add this to your shell profile (~/.bashrc, ~/.zshrc):\n'));
    console.log(chalk.cyan(`    export ELEVENLABS_API_KEY="${apiKeyInfo.key}"\n`));
  }

  // Create config file
  const configPath = join(process.cwd(), CONFIG_FILE);
  const config = {
    elevenlabs: {
      ...(apiKeyInfo.source === 'config' ? { apiKey: apiKeyInfo.key } : {}),
      defaultDuration: defaults.sampleDuration,
      promptInfluence: defaults.promptInfluence
    },
    defaults: {
      tempo: defaults.tempo,
      timeSignature: defaults.timeSignature,
      resolution: defaults.resolution,
      swing: defaults.swing,
      outputDir: defaults.outputDir
    },
    drumKits: {
      '808': [
        '808 kick drum', '808 snare drum', '808 closed hi-hat',
        '808 open hi-hat', '808 rim shot', '808 clap', '808 cowbell'
      ],
      acoustic: [
        'acoustic kick drum', 'acoustic snare drum', 'acoustic closed hi-hat',
        'acoustic open hi-hat', 'acoustic tom high', 'acoustic tom mid',
        'acoustic tom low', 'acoustic crash cymbal', 'acoustic ride cymbal'
      ],
      electronic: [
        'electronic kick bass', 'electronic snare', 'electronic hi-hat',
        'electronic clap', 'laser zap', 'digital noise hit'
      ]
    }
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  savedFiles.push(CONFIG_FILE);
  console.log(chalk.green(`  ✓ Saved configuration to ${CONFIG_FILE}`));

  // Create samples directory
  if (!existsSync(defaults.outputDir)) {
    mkdirSync(defaults.outputDir, { recursive: true });
    console.log(chalk.green(`  ✓ Created samples directory: ${defaults.outputDir}`));
  }

  return savedFiles;
}

/**
 * Offer to generate starter samples
 */
async function offerSampleGeneration(rl, apiKeyInfo) {
  if (!apiKeyInfo.key) {
    return false;
  }

  console.log(chalk.blue('\n━━━ Generate Starter Samples ━━━\n'));
  console.log(chalk.gray('  Would you like to generate a drum kit to get started?\n'));

  const generate = await confirm(rl, '  Generate a starter drum kit?', true);

  if (!generate) {
    return false;
  }

  const { value: kit } = await select(rl, '  Select a drum kit:', [
    '808 (hip-hop, trap)',
    'acoustic (rock, pop, jazz)',
    'electronic (EDM, techno)'
  ], 0);

  const kitName = kit.split(' ')[0].toLowerCase();

  console.log(chalk.yellow(`\n  Starting ${kitName} kit generation...`));
  console.log(chalk.gray('  This may take a minute (rate-limited API calls).\n'));

  return { generate: true, kit: kitName };
}

/**
 * Show quick start guide
 */
function showQuickStart(hasApiKey, generatedKit) {
  console.log(chalk.blue('\n━━━ Quick Start Guide ━━━\n'));

  console.log(chalk.white('  You\'re all set! Here\'s how to get started:\n'));

  if (hasApiKey) {
    console.log(chalk.cyan('  1. Generate samples:'));
    console.log(chalk.gray('     beat-gen sample --kit 808'));
    console.log(chalk.gray('     beat-gen sample "punchy kick" "crisp snare"\n'));
  }

  console.log(chalk.cyan(`  ${hasApiKey ? '2' : '1'}. Create a beat pattern:`));
  console.log(chalk.gray('     beat-gen compose patterns/basic-house.txt --bpm 128\n'));

  console.log(chalk.cyan(`  ${hasApiKey ? '3' : '2'}. Try inline patterns:`));
  console.log(chalk.gray('     beat-gen compose -p "kick: X...X..." --bpm 120\n'));

  if (hasApiKey) {
    console.log(chalk.cyan('  4. Render to audio:'));
    console.log(chalk.gray('     beat-gen render pattern.json --samples ./samples/808\n'));
  }

  console.log(chalk.cyan(`  ${hasApiKey ? '5' : '3'}. Get help:`));
  console.log(chalk.gray('     beat-gen --help'));
  console.log(chalk.gray('     beat-gen <command> --help\n'));

  console.log(chalk.gray('  ─────────────────────────────────────────────────────\n'));

  console.log(chalk.white('  Example pattern files are in the ') +
              chalk.cyan('patterns/') + chalk.white(' directory.\n'));

  console.log(chalk.gray('  Documentation: ') + chalk.cyan('QUICKSTART.md, WORKFLOW.md'));
  console.log(chalk.gray('  Issues: ') + chalk.cyan('https://github.com/glebis/beat-gen/issues\n'));
}

/**
 * Run sample generation
 */
async function runSampleGeneration(kitName, apiKey) {
  const { generateDrumKit } = await import('../../services/elevenlabs-service.js');

  try {
    console.log(chalk.gray(`  Generating ${kitName} kit...\n`));

    const results = await generateDrumKit(kitName, {
      outputDir: `./samples/${kitName}`,
      apiKey: apiKey
    });

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(chalk.green(`\n  ✓ Generated ${successful.length}/${results.length} samples`));

    if (successful.length > 0) {
      console.log(chalk.gray(`    Saved to: ./samples/${kitName}/`));
    }

    if (failed.length > 0) {
      console.log(chalk.yellow(`  ! ${failed.length} samples failed`));
      failed.forEach(r => console.log(chalk.gray(`    - ${r.prompt}: ${r.error}`)));
    }

    return successful.length > 0;
  } catch (e) {
    console.log(chalk.red(`  ✗ Error generating samples: ${e.message}`));
    return false;
  }
}

/**
 * Non-interactive setup with defaults
 */
async function nonInteractiveSetup(options) {
  printBanner();
  console.log(chalk.yellow('  Running in non-interactive mode (--yes flag)\n'));

  // Prerequisites check
  const prereqs = await checkPrerequisites();

  // Check for API key in env
  const apiKey = process.env.ELEVENLABS_API_KEY || null;
  const apiKeyInfo = { key: apiKey, source: apiKey ? 'env' : 'none' };

  if (apiKey) {
    console.log(chalk.green('\n  ✓ Using API key from ELEVENLABS_API_KEY environment variable'));
  } else {
    console.log(chalk.yellow('\n  ! No ELEVENLABS_API_KEY found in environment'));
    console.log(chalk.gray('    Set it to enable AI sample generation'));
  }

  // Use default settings
  const defaults = {
    tempo: 120,
    timeSignature: '4/4',
    resolution: 16,
    swing: 0,
    outputDir: './samples',
    sampleDuration: 2,
    promptInfluence: 0.5
  };

  // Save configuration
  await saveConfiguration(apiKeyInfo, defaults);

  // Show quick start
  showQuickStart(!!apiKeyInfo.key, false);

  console.log(chalk.green('  ✓ Setup complete! Happy beat-making!\n'));
}

/**
 * Main init command handler
 */
export async function initCommand(options) {
  // Non-interactive mode
  if (options.yes) {
    await nonInteractiveSetup(options);
    return;
  }

  const rl = createPrompt();

  try {
    // Welcome
    printBanner();

    // Check existing config
    const existing = checkExistingConfig();
    if (existing.hasConfig && !options.force) {
      console.log(chalk.yellow('  Configuration already exists!'));
      const reconfigure = await confirm(rl, '  Would you like to reconfigure?', false);
      if (!reconfigure) {
        console.log(chalk.gray('\n  Run with --force to overwrite existing config.\n'));
        rl.close();
        return;
      }
    }

    // Prerequisites
    const prereqs = await checkPrerequisites();

    // API Key setup
    const apiKeyInfo = await setupApiKey(rl, existing);

    // Default settings
    const defaults = await configureDefaults(rl);

    // Save configuration
    await saveConfiguration(apiKeyInfo, defaults);

    // Offer sample generation
    const sampleChoice = await offerSampleGeneration(rl, apiKeyInfo);

    // Close readline before running generation (to avoid conflicts)
    rl.close();

    // Run sample generation if requested
    if (sampleChoice && sampleChoice.generate) {
      await runSampleGeneration(sampleChoice.kit, apiKeyInfo.key);
    }

    // Show quick start
    showQuickStart(!!apiKeyInfo.key, sampleChoice?.generate);

    console.log(chalk.green('  ✓ Setup complete! Happy beat-making!\n'));

  } catch (error) {
    rl.close();
    console.error(chalk.red(`\n  Error during setup: ${error.message}\n`));
    process.exit(1);
  }
}
