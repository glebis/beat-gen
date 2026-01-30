/**
 * Generate Command - Create pattern library
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { GENRE_GENERATORS, GENRE_VARIATIONS } from '../../generators/genre-templates.js';
import { generateIntro, generateOutro, generateFill, addVariability } from '../../generators/variation-engine.js';
import { padNumber } from '../../generators/pattern-generator.js';

// ============================================================================
// Main Command
// ============================================================================

export async function generateCommand(genre, options) {
  const {
    count = 5,
    withVariations = true,
    output = './data/generated-patterns',
    all = false,
    list = false,
    variability = false
  } = options;

  // List available genres
  if (list) {
    console.log(chalk.cyan('\nAvailable genres:'));
    Object.keys(GENRE_GENERATORS).forEach(g => {
      const variations = GENRE_VARIATIONS[g] || ['main'];
      console.log(chalk.white(`  ${g}`) + chalk.gray(` (variations: ${variations.join(', ')})`));
    });
    console.log('');
    return;
  }

  // Validate genre
  const genres = all ? Object.keys(GENRE_GENERATORS) : [genre];

  if (!all && !GENRE_GENERATORS[genre]) {
    console.error(chalk.red(`Error: Unknown genre "${genre}"`));
    console.log(chalk.yellow('Run with --list to see available genres'));
    process.exit(1);
  }

  // Generate patterns
  console.log(chalk.cyan(`\nGenerating pattern library...\n`));

  let totalGenerated = 0;
  const index = {
    version: "1.0",
    generated: new Date().toISOString(),
    totalPatterns: 0,
    genres: {}
  };

  for (const g of genres) {
    console.log(chalk.white(`${g}:`));

    const genreDir = path.join(output, g);
    await fs.mkdir(genreDir, { recursive: true });

    const genrePatterns = [];
    const styleVariations = GENRE_VARIATIONS[g] || ['main'];

    for (let i = 1; i <= count; i++) {
      const num = padNumber(i);

      // Generate main pattern with style variation
      const style = styleVariations.length > 1 ?
        styleVariations[(i - 1) % styleVariations.length] :
        undefined;

      let main = GENRE_GENERATORS[g](style);

      // Update ID
      main.metadata.id = `${g}-${num}-main`;

      // Add variability if requested
      if (variability) {
        main = addVariability(main);
      }

      const mainPath = path.join(genreDir, `${g}-${num}-main.json`);
      await savePattern(mainPath, main);

      genrePatterns.push({
        id: main.metadata.id,
        file: `${g}/${g}-${num}-main.json`,
        name: main.metadata.name,
        suggestedBPM: main.metadata.suggestedBPM,
        tags: main.metadata.tags
      });

      totalGenerated++;
      process.stdout.write(chalk.gray(`  ✓ ${g}-${num}-main.json`));

      // Generate variations if requested
      if (withVariations) {
        const intro = generateIntro(main);
        intro.metadata.id = `${g}-${num}-intro`;
        await savePattern(path.join(genreDir, `${g}-${num}-intro.json`), intro);
        totalGenerated++;

        const outro = generateOutro(main);
        outro.metadata.id = `${g}-${num}-outro`;
        await savePattern(path.join(genreDir, `${g}-${num}-outro.json`), outro);
        totalGenerated++;

        const fill = generateFill(main);
        fill.metadata.id = `${g}-${num}-fill`;
        await savePattern(path.join(genreDir, `${g}-${num}-fill.json`), fill);
        totalGenerated++;

        process.stdout.write(chalk.gray(` + intro/outro/fill`));
      }

      process.stdout.write('\n');
    }

    index.genres[g] = {
      count: genrePatterns.length,
      patterns: genrePatterns
    };
  }

  // Create index file
  index.totalPatterns = totalGenerated;
  const indexPath = path.join(output, 'index.json');
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));

  console.log(chalk.green(`\n✓ Generated ${totalGenerated} patterns`));
  console.log(chalk.gray(`  Index: ${indexPath}\n`));
}

// ============================================================================
// Utilities
// ============================================================================

async function savePattern(filePath, pattern) {
  await fs.writeFile(filePath, JSON.stringify(pattern, null, 2));
}
