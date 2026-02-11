/**
 * Track Visualizer - PNG rendering of patterns and arrangements
 * Uses @napi-rs/canvas for pure Rust canvas (no native build issues)
 */

import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs/promises';

// ============================================================================
// Color palette (deterministic per track type)
// ============================================================================

const COLORS = {
  // Track type colors
  kick:        '#E74C3C',
  snare:       '#F39C12',
  'closed-hat':'#3498DB',
  'open-hat':  '#2980B9',
  clap:        '#F39C12',
  rim:         '#E67E22',
  crash:       '#9B59B6',
  ride:        '#8E44AD',
  tom1:        '#E74C3C',
  tom2:        '#C0392B',
  tom3:        '#A93226',
  bass:        '#2ECC71',
  lead:        '#1ABC9C',
  pad:         '#9B59B6',
  arp:         '#3498DB',
  fx:          '#E91E63',
  subBass:     '#27AE60',
  // Section colors
  intro:       '#3498DB',
  build:       '#F39C12',
  drop:        '#E74C3C',
  drop2:       '#E74C3C',
  breakdown:   '#9B59B6',
  verse:       '#2ECC71',
  verse2:      '#2ECC71',
  chorus:      '#E74C3C',
  chorus2:     '#E74C3C',
  bridge:      '#F39C12',
  outro:       '#95A5A6',
  interlude:   '#9B59B6',
  'part-a':    '#E74C3C',
  'part-b':    '#3498DB',
  main:        '#E74C3C',
  variation:   '#F39C12',
  dub:         '#9B59B6',
};

function getColor(name) {
  return COLORS[name] || '#7F8C8D';
}

function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ============================================================================
// Main render function
// ============================================================================

/**
 * Render pattern visualization to PNG
 * @param {Object} pattern - Pattern with tracks and optional sections
 * @param {string} outputPath - Output PNG path
 * @param {Object} [opts] - { width, height }
 */
export async function renderVisualization(pattern, outputPath, opts = {}) {
  const width = opts.width || 1200;
  const height = opts.height || 800;
  const hasSections = pattern.sections && pattern.sections.length > 0;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Header
  drawHeader(ctx, pattern, width);

  if (hasSections) {
    // Top half: arrangement timeline
    drawArrangementTimeline(ctx, pattern, width, height);
    // Bottom half: pattern detail grid
    drawPatternGrid(ctx, pattern, width, height, height * 0.45);
  } else {
    // Full height: pattern detail grid
    drawPatternGrid(ctx, pattern, width, height, 60);
  }

  // Save to PNG
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);
}

// ============================================================================
// Header
// ============================================================================

function drawHeader(ctx, pattern, width) {
  ctx.fillStyle = '#ECF0F1';
  ctx.font = 'bold 18px monospace';
  const genre = pattern.metadata?.genre || 'unknown';
  const key = pattern.key || '';
  const tempo = pattern.tempo || 120;
  const headerText = `${genre.toUpperCase()} | ${key} | ${tempo} BPM | ${pattern.timeSignature || '4/4'}`;
  ctx.fillText(headerText, 20, 30);

  // Divider
  ctx.strokeStyle = '#34495E';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 45);
  ctx.lineTo(width - 20, 45);
  ctx.stroke();
}

// ============================================================================
// Arrangement timeline (top half)
// ============================================================================

function drawArrangementTimeline(ctx, pattern, width, totalHeight) {
  const sections = pattern.sections;
  const totalBars = sections.reduce((sum, s) => sum + s.bars, 0);
  const uniqueTracks = getUniqueTrackNames(pattern);

  const startY = 55;
  const timelineHeight = totalHeight * 0.35;
  const leftMargin = 100;
  const rightMargin = 20;
  const trackableWidth = width - leftMargin - rightMargin;
  const trackHeight = Math.min(30, (timelineHeight - 30) / uniqueTracks.length);

  // Section labels header
  ctx.font = '12px monospace';
  ctx.fillStyle = '#7F8C8D';
  ctx.fillText('ARRANGEMENT', 20, startY + 10);

  // Track labels
  uniqueTracks.forEach((name, i) => {
    ctx.fillStyle = getColor(name);
    ctx.font = '11px monospace';
    ctx.fillText(name, 10, startY + 30 + i * trackHeight + trackHeight / 2 + 4);
  });

  // Draw section blocks
  let barOffset = 0;
  for (const section of sections) {
    const x = leftMargin + (barOffset / totalBars) * trackableWidth;
    const w = (section.bars / totalBars) * trackableWidth;

    // Section label
    ctx.fillStyle = hexToRgba(getColor(section.name), 0.8);
    ctx.font = '10px monospace';
    ctx.fillText(`${section.name} (${section.bars})`, x + 4, startY + 22);

    // Track blocks
    uniqueTracks.forEach((name, i) => {
      const y = startY + 28 + i * trackHeight;
      const isActive = section.activeTracks?.some(t =>
        t === name || (t === 'drums' && isDrumTrack(name))
      );

      if (isActive) {
        ctx.fillStyle = hexToRgba(getColor(name), section.energy || 0.5);
        ctx.fillRect(x + 1, y + 1, w - 2, trackHeight - 2);
      } else {
        ctx.fillStyle = 'rgba(50,50,70,0.3)';
        ctx.fillRect(x + 1, y + 1, w - 2, trackHeight - 2);
      }

      // Border
      ctx.strokeStyle = '#34495E';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, w, trackHeight);
    });

    barOffset += section.bars;
  }
}

// ============================================================================
// Pattern detail grid
// ============================================================================

function drawPatternGrid(ctx, pattern, width, totalHeight, gridStartY) {
  const tracks = pattern.tracks;
  const resolution = pattern.resolution || 16;

  const leftMargin = 100;
  const rightMargin = 20;
  const bottomMargin = 20;
  const gridWidth = width - leftMargin - rightMargin;
  const gridHeight = totalHeight - gridStartY - bottomMargin;
  const trackHeight = Math.min(40, gridHeight / tracks.length);
  const stepWidth = gridWidth / resolution;

  // Section label
  ctx.font = '12px monospace';
  ctx.fillStyle = '#7F8C8D';
  ctx.fillText('PATTERN GRID', 20, gridStartY + 10);

  // Step numbers
  ctx.font = '9px monospace';
  ctx.fillStyle = '#7F8C8D';
  for (let s = 0; s < resolution; s += 4) {
    ctx.fillText(String(s), leftMargin + s * stepWidth + 2, gridStartY + 22);
  }

  // Track rows
  tracks.forEach((track, i) => {
    const y = gridStartY + 28 + i * trackHeight;
    const color = getColor(track.name);

    // Track label
    ctx.fillStyle = color;
    ctx.font = '11px monospace';
    ctx.fillText(track.name, 10, y + trackHeight / 2 + 4);

    // Grid background
    ctx.fillStyle = 'rgba(50,50,70,0.2)';
    ctx.fillRect(leftMargin, y, gridWidth, trackHeight);

    // Beat lines
    for (let s = 0; s < resolution; s += 4) {
      ctx.strokeStyle = s === 0 ? '#5D6D7E' : '#34495E';
      ctx.lineWidth = s === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(leftMargin + s * stepWidth, y);
      ctx.lineTo(leftMargin + s * stepWidth, y + trackHeight);
      ctx.stroke();
    }

    // Note events
    for (const note of track.pattern) {
      const nx = leftMargin + note.step * stepWidth;
      const nw = (note.duration || 1) * stepWidth;
      const opacity = (note.velocity || 100) / 127;

      ctx.fillStyle = hexToRgba(color, opacity);
      ctx.fillRect(nx + 1, y + 2, Math.max(nw - 2, 2), trackHeight - 4);
    }

    // Row border
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(leftMargin, y, gridWidth, trackHeight);
  });
}

// ============================================================================
// Helpers
// ============================================================================

function getUniqueTrackNames(pattern) {
  const names = new Set();
  if (pattern.sections) {
    for (const s of pattern.sections) {
      for (const t of s.activeTracks || []) {
        if (t === 'drums') {
          for (const tr of pattern.tracks) {
            if ((tr.channel ?? 9) === 9) names.add(tr.name);
          }
        } else {
          names.add(t);
        }
      }
    }
  }
  if (names.size === 0) {
    for (const t of pattern.tracks) names.add(t.name);
  }
  return [...names];
}

function isDrumTrack(name) {
  const drums = ['kick', 'snare', 'closed-hat', 'open-hat', 'clap', 'rim',
    'crash', 'ride', 'tom1', 'tom2', 'tom3', 'cowbell', 'tambourine', 'shaker'];
  return drums.includes(name);
}
