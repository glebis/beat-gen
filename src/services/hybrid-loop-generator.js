import fs from 'fs/promises';
import path from 'path';
import { renderToWAV } from './audio-renderer.js';

/**
 * Generate hybrid loops by combining elements from multiple genre patterns
 * Creates multiple variants with different combinations
 */
export async function generateHybridLoops(genres, options = {}) {
  const {
    samplesDir = './data/audio-samples',
    outputDir = './data/output/hybrid',
    patternsDir = './data/generated-patterns',
    variants = 4,
    tempo = null,
  } = options;

  await fs.mkdir(outputDir, { recursive: true });

  console.log(`\n🎵 Hybrid Loop Generator\n`);
  console.log(`Genres: ${genres.join(', ')}`);
  console.log(`Variants: ${variants}\n`);

  // Load patterns from each genre
  const patterns = await loadGenrePatterns(genres, patternsDir);

  if (patterns.length === 0) {
    throw new Error('No patterns found for specified genres');
  }

  // Generate hybrid pattern variants
  const hybridPatterns = generateHybridPatternVariants(patterns, variants, tempo);

  // Render each variant
  const results = [];
  for (let i = 0; i < hybridPatterns.length; i++) {
    const variant = hybridPatterns[i];
    const variantNum = i + 1;

    console.log(`\n━━━ Rendering Variant ${variantNum}/${variants} ━━━`);
    console.log(`Mix: ${variant.description}`);
    console.log(`Tempo: ${variant.pattern.metadata.suggestedBPM} BPM\n`);

    // Save hybrid pattern
    const patternPath = path.join(outputDir, `hybrid-v${variantNum}-pattern.json`);
    await fs.writeFile(patternPath, JSON.stringify(variant.pattern, null, 2));

    // Collect samples from all source genres
    const samplesDirs = genres.map(g => path.join(samplesDir, g));

    // Render to audio
    const outputPath = path.join(outputDir, `hybrid-v${variantNum}.wav`);

    try {
      // Try rendering with each samples directory until success
      let rendered = false;
      for (const samplesPath of samplesDirs) {
        try {
          const result = await renderToWAV(variant.pattern, samplesPath, outputPath);
          results.push({
            success: true,
            variant: variantNum,
            pattern: patternPath,
            audio: outputPath,
            description: variant.description,
            ...result,
          });
          rendered = true;
          break;
        } catch (err) {
          // Try next samples directory
          continue;
        }
      }

      if (!rendered) {
        throw new Error('Could not find samples for pattern');
      }

      console.log(`✓ Variant ${variantNum} complete: ${outputPath}`);
    } catch (error) {
      console.error(`✗ Variant ${variantNum} failed: ${error.message}`);
      results.push({
        success: false,
        variant: variantNum,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Load patterns from specified genres
 */
async function loadGenrePatterns(genres, patternsDir) {
  const patterns = [];

  for (const genre of genres) {
    const genreDir = path.join(patternsDir, genre);

    try {
      const files = await fs.readdir(genreDir);
      const mainPattern = files.find(f => f.includes('-main.json'));

      if (mainPattern) {
        const patternPath = path.join(genreDir, mainPattern);
        const content = await fs.readFile(patternPath, 'utf-8');
        const pattern = JSON.parse(content);

        patterns.push({
          genre,
          pattern,
          path: patternPath,
        });
      }
    } catch (error) {
      console.warn(`Warning: Could not load pattern for ${genre}`);
    }
  }

  return patterns;
}

/**
 * Generate hybrid pattern variants by combining elements from source patterns
 */
function generateHybridPatternVariants(sourcePatterns, variantCount, tempo = null) {
  const variants = [];

  // Strategy 1: Kick from genre A, snare from B, hats from C
  if (variantCount >= 1 && sourcePatterns.length >= 2) {
    const hybrid1 = createHybridPattern(
      sourcePatterns,
      {
        kick: 0,
        snare: 1 % sourcePatterns.length,
        'closed-hat': sourcePatterns.length > 2 ? 2 : 0,
      },
      tempo,
      'Layered mix'
    );
    variants.push(hybrid1);
  }

  // Strategy 2: Rotate source genres for each track
  if (variantCount >= 2 && sourcePatterns.length >= 2) {
    const hybrid2 = createHybridPattern(
      sourcePatterns,
      {
        kick: 1 % sourcePatterns.length,
        snare: 0,
        'closed-hat': sourcePatterns.length > 2 ? 2 : 1 % sourcePatterns.length,
      },
      tempo,
      'Rotated elements'
    );
    variants.push(hybrid2);
  }

  // Strategy 3: Merged rhythms - combine all tracks from all genres
  if (variantCount >= 3) {
    const hybrid3 = mergeAllPatterns(sourcePatterns, tempo, 'Full fusion');
    variants.push(hybrid3);
  }

  // Strategy 4: Alternating bars - first bar from A, second from B
  if (variantCount >= 4 && sourcePatterns.length >= 2) {
    const hybrid4 = createAlternatingPattern(
      sourcePatterns,
      tempo,
      'Alternating bars'
    );
    variants.push(hybrid4);
  }

  return variants.slice(0, variantCount);
}

/**
 * Create hybrid pattern by selecting specific tracks from different sources
 */
function createHybridPattern(sources, trackMap, tempo, description) {
  const basePattern = JSON.parse(JSON.stringify(sources[0].pattern));

  // Update metadata
  basePattern.metadata.name = `Hybrid: ${description}`;
  basePattern.metadata.genre = 'hybrid';
  basePattern.metadata.tags = sources.map(s => s.genre);
  basePattern.metadata.id = `hybrid-${Date.now()}`;

  if (tempo) {
    basePattern.metadata.suggestedBPM = tempo;
  }

  // Replace tracks with ones from mapped sources
  basePattern.tracks = [];

  for (const [trackType, sourceIndex] of Object.entries(trackMap)) {
    const sourcePattern = sources[sourceIndex % sources.length].pattern;
    const track = sourcePattern.tracks.find(t => t.name === trackType || t.name.includes(trackType.split('-')[0]));

    if (track) {
      basePattern.tracks.push(JSON.parse(JSON.stringify(track)));
    }
  }

  return {
    pattern: basePattern,
    description: `${description} (${sources.map(s => s.genre).join('/')})`,
  };
}

/**
 * Merge all tracks from all source patterns into one dense pattern
 */
function mergeAllPatterns(sources, tempo, description) {
  const basePattern = JSON.parse(JSON.stringify(sources[0].pattern));

  basePattern.metadata.name = `Hybrid: ${description}`;
  basePattern.metadata.genre = 'hybrid';
  basePattern.metadata.tags = sources.map(s => s.genre);
  basePattern.metadata.id = `hybrid-fusion-${Date.now()}`;
  basePattern.metadata.complexity = 'complex';
  basePattern.metadata.intensity = 'high';

  if (tempo) {
    basePattern.metadata.suggestedBPM = tempo;
  }

  // Collect all unique tracks
  const trackMap = new Map();

  for (const source of sources) {
    for (const track of source.pattern.tracks) {
      const key = track.name;
      if (!trackMap.has(key)) {
        trackMap.set(key, {
          name: track.name,
          midiNote: track.midiNote,
          pattern: [],
        });
      }

      // Merge notes from this track
      const mergedTrack = trackMap.get(key);
      mergedTrack.pattern.push(...track.pattern);
    }
  }

  // Remove duplicate notes at same step (keep highest velocity)
  for (const track of trackMap.values()) {
    const stepMap = new Map();

    for (const note of track.pattern) {
      if (!stepMap.has(note.step) || note.velocity > stepMap.get(note.step).velocity) {
        stepMap.set(note.step, note);
      }
    }

    track.pattern = Array.from(stepMap.values()).sort((a, b) => a.step - b.step);
  }

  basePattern.tracks = Array.from(trackMap.values());

  return {
    pattern: basePattern,
    description: `${description} (${sources.map(s => s.genre).join('+')})`,
  };
}

/**
 * Create alternating pattern - first bar from source A, second bar from B, etc.
 */
function createAlternatingPattern(sources, tempo, description) {
  const basePattern = JSON.parse(JSON.stringify(sources[0].pattern));
  const resolution = basePattern.resolution;
  const stepsPerBar = resolution / 2; // Assuming 2 bars total

  basePattern.metadata.name = `Hybrid: ${description}`;
  basePattern.metadata.genre = 'hybrid';
  basePattern.metadata.tags = sources.map(s => s.genre);
  basePattern.metadata.id = `hybrid-alt-${Date.now()}`;

  if (tempo) {
    basePattern.metadata.suggestedBPM = tempo;
  }

  // Collect all track types
  const trackTypes = new Set();
  sources.forEach(s => s.pattern.tracks.forEach(t => trackTypes.add(t.name)));

  basePattern.tracks = [];

  for (const trackType of trackTypes) {
    const newTrack = {
      name: trackType,
      midiNote: null,
      pattern: [],
    };

    // Alternate between sources for each bar
    for (let bar = 0; bar < 2; bar++) {
      const sourceIndex = bar % sources.length;
      const source = sources[sourceIndex];
      const sourceTrack = source.pattern.tracks.find(t => t.name === trackType);

      if (sourceTrack) {
        if (!newTrack.midiNote) {
          newTrack.midiNote = sourceTrack.midiNote;
        }

        // Copy notes from this bar
        const barStart = bar * stepsPerBar;
        const barEnd = (bar + 1) * stepsPerBar;

        for (const note of sourceTrack.pattern) {
          if (note.step >= barStart && note.step < barEnd) {
            newTrack.pattern.push({ ...note });
          }
        }
      }
    }

    if (newTrack.pattern.length > 0) {
      basePattern.tracks.push(newTrack);
    }
  }

  return {
    pattern: basePattern,
    description: `${description} (${sources.map(s => s.genre).join('↔')})`,
  };
}
