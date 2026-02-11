/**
 * Visualize command - Render pattern/track to PNG
 */

import fs from 'fs/promises';
import { renderVisualization } from '../../services/track-visualizer.js';

export async function visualizeCommand(input, options) {
  if (!input) {
    console.error('Usage: beat-gen visualize <pattern.json> -o structure.png');
    process.exit(1);
  }

  const content = await fs.readFile(input, 'utf-8');
  const pattern = JSON.parse(content);

  const outputPath = options.output || input.replace(/\.json$/, '.png');
  const width = parseInt(options.width || '1200');
  const height = parseInt(options.height || '800');

  await renderVisualization(pattern, outputPath, { width, height });

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', png: outputPath }));
  } else {
    console.log(`Visualization saved to ${outputPath}`);
  }
}
