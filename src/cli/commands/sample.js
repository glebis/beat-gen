import chalk from 'chalk';
import { generateSample, generateBatchSamples, generateDrumKit } from '../../services/elevenlabs-service.js';

/**
 * Sample generation command
 */
export async function sampleCommand(prompts, options) {
  console.log(chalk.cyan('🎵 Beat-Gen Sample Generator\n'));

  // Check for API key
  if (!options.apiKey && !process.env.ELEVENLABS_API_KEY) {
    console.error(chalk.red('Error: 11Labs API key required'));
    console.log(chalk.yellow('Set ELEVENLABS_API_KEY environment variable or use --api-key option'));
    process.exit(1);
  }

  // Generate drum kit if kit option provided
  if (options.kit) {
    console.log(chalk.blue(`Generating drum kit: ${options.kit}\n`));

    const results = await generateDrumKit(options.kit, {
      outputDir: options.output || `./samples/${options.kit}`,
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
    process.exit(1);
  }

  console.log(chalk.blue(`Generating ${prompts.length} samples\n`));

  const results = await generateBatchSamples(prompts, {
    outputDir: options.output || './samples',
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
  console.log(chalk.green(`✓ Success: ${successful.length}/${results.length} samples`));

  if (successful.length > 0) {
    console.log(chalk.gray('\nGenerated samples:'));
    successful.forEach(r => {
      const size = (r.size / 1024).toFixed(1);
      console.log(chalk.gray(`  • ${r.path} (${size} KB)`));
    });
  }

  if (failed.length > 0) {
    console.log(chalk.red(`\n✗ Failed: ${failed.length}`));
    failed.forEach(r => {
      console.log(chalk.red(`  • ${r.prompt}: ${r.error}`));
    });
  }

  console.log(chalk.green('━'.repeat(50) + '\n'));
}
