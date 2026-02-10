import { generateHybridLoops } from '../../services/hybrid-loop-generator.js';

export async function hybridCommand(genres, options) {
  try {
    if (!genres || genres.length < 2) {
      console.error('Error: Please specify at least 2 genres to combine');
      console.error('Example: beat-gen hybrid idm uk-garage house --variants 4');
      process.exit(1);
    }

    const results = await generateHybridLoops(genres, {
      samplesDir: options.samplesDir,
      outputDir: options.output,
      patternsDir: options.patterns,
      variants: parseInt(options.variants) || 4,
      tempo: options.tempo ? parseInt(options.tempo) : null,
    });

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✓ Hybrid Loop Generation Complete`);
    console.log(`  Success: ${successful}/${results.length} variants`);

    if (failed > 0) {
      console.log(`  Failed: ${failed} variants`);
    }

    console.log('\nGenerated variants:');
    results.forEach(r => {
      if (r.success) {
        console.log(`  • Variant ${r.variant}: ${r.audio}`);
        console.log(`    ${r.description}`);
        console.log(`    Duration: ${r.duration.toFixed(2)}s, Events: ${r.events}`);
      }
    });

    console.log('\nPlay variants:');
    results.forEach(r => {
      if (r.success) {
        console.log(`  afplay ${r.audio}`);
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
