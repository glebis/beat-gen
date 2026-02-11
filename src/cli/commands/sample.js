import chalk from 'chalk';
import { generateSample, generateBatchSamples, generateDrumKit, generateInstrumentKit, listInstrumentKitGenres } from '../../services/elevenlabs-service.js';
import { getElevenLabsApiKey } from '../../utils/config.js';

/**
 * Sample generation command
 */
export async function sampleCommand(prompts, options) {
  console.log(chalk.cyan('Beat-Gen Sample Generator\n'));

  // Check for API key (CLI option > config.json > environment)
  const apiKey = getElevenLabsApiKey(options.apiKey);

  if (!apiKey) {
    console.error(chalk.red('Error: 11Labs API key required'));
    console.log(chalk.yellow('Options:'));
    console.log(chalk.yellow('  1. Set in config.json: { "elevenlabs": { "apiKey": "sk_..." } }'));
    console.log(chalk.yellow('  2. Set ELEVENLABS_API_KEY environment variable'));
    console.log(chalk.yellow('  3. Use --api-key option'));
    process.exit(1);
  }

  options.apiKey = apiKey;

  // Generate instrument samples (bass, lead, pad)
  if (options.instruments) {
    const genre = options.genre || options.kit || 'house';
    const variants = parseInt(options.variants || '3');
    const outputDir = options.output || `./data/samples/${genre}`;

    console.log(chalk.blue(`Generating instrument kit: ${genre} (${variants} variants)\n`));

    const availableGenres = listInstrumentKitGenres();
    if (!availableGenres.includes(genre)) {
      console.error(chalk.red(`Unknown genre: ${genre}. Available: ${availableGenres.join(', ')}`));
      process.exit(1);
    }

    // Warn about API cost
    const instrumentCount = 3; // bass, lead, pad
    const totalCalls = instrumentCount * variants;
    console.log(chalk.yellow(`This will make ${totalCalls} API calls to 11Labs.\n`));

    const { results, metadataPath } = await generateInstrumentKit(genre, {
      variants,
      outputDir,
      apiKey: options.apiKey,
    });

    printResults(results.map(r => ({
      ...r,
      prompt: r.instrument ? `${r.instrument}-v${r.variant}` : r.prompt,
    })));

    console.log(chalk.gray(`Metadata: ${metadataPath}`));

    // Also generate drum kit if --kit was specified alongside --instruments
    if (options.kit) {
      console.log(chalk.blue(`\nAlso generating drum kit: ${options.kit}\n`));
      const drumResults = await generateDrumKit(options.kit, {
        outputDir,
        apiKey: options.apiKey,
        duration: options.duration,
      });
      printResults(drumResults);
    }

    return;
  }

  // Generate drum kit if kit option provided
  if (options.kit) {
    console.log(chalk.blue(`Generating drum kit: ${options.kit}\n`));

    const results = await generateDrumKit(options.kit, {
      outputDir: options.output || `./data/samples/${options.kit}`,
      apiKey: options.apiKey,
      duration: options.duration,
    });

    printResults(results);
    return;
  }

  // Generate custom samples from prompts
  if (prompts.length === 0) {
    console.error(chalk.red('Error: No sample prompts provided'));
    console.log(chalk.yellow('Usage: beat-gen sample "808 kick" "snare" ...'));
    console.log(chalk.yellow('       beat-gen sample --kit 808'));
    console.log(chalk.yellow('       beat-gen sample --instruments --genre house --variants 3'));
    process.exit(1);
  }

  console.log(chalk.blue(`Generating ${prompts.length} samples\n`));

  const results = await generateBatchSamples(prompts, {
    outputDir: options.output || './data/samples',
    apiKey: options.apiKey,
    duration: options.duration,
    promptInfluence: options.influence,
  });

  printResults(results);
}

/**
 * Print generation results
 */
function printResults(results) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('\n' + chalk.green('━'.repeat(50)));
  console.log(chalk.green(`Success: ${successful.length}/${results.length} samples`));

  if (successful.length > 0) {
    console.log(chalk.gray('\nGenerated samples:'));
    successful.forEach(r => {
      const size = r.size ? (r.size / 1024).toFixed(1) : '?';
      console.log(chalk.gray(`  ${r.path || r.prompt} (${size} KB)`));
    });
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\nFailed: ${failed.length}`));
    failed.forEach(r => {
      console.log(chalk.red(`  ${r.prompt || r.instrument}: ${r.error}`));
    });
  }

  console.log(chalk.green('━'.repeat(50) + '\n'));
}
