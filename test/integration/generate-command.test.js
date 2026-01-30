/**
 * Integration tests for generate command
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const TEST_OUTPUT = './test/output';
const CLI = './bin/beat-gen.js';

// Setup/teardown
test.before(async () => {
  await fs.mkdir(TEST_OUTPUT, { recursive: true });
});

test.after(async () => {
  await fs.rm(TEST_OUTPUT, { recursive: true, force: true });
});

test('generate --list shows available genres', () => {
  const output = execSync(`node ${CLI} generate --list`).toString();

  assert.ok(output.includes('Available genres'));
  assert.ok(output.includes('house'));
  assert.ok(output.includes('techno'));
  assert.ok(output.includes('dnb'));
  assert.ok(output.includes('trip-hop'));
});

test('generate creates house patterns', async () => {
  const output = path.join(TEST_OUTPUT, 'house-test');
  execSync(`node ${CLI} generate house --count 1 --output ${output}`);

  // Check main pattern exists
  const mainFile = path.join(output, 'house/house-001-main.json');
  const stats = await fs.stat(mainFile);
  assert.ok(stats.isFile());

  // Verify pattern structure
  const content = await fs.readFile(mainFile, 'utf-8');
  const pattern = JSON.parse(content);

  assert.strictEqual(pattern.version, '1.0');
  assert.strictEqual(pattern.metadata.genre, 'house');
  assert.strictEqual(pattern.metadata.id, 'house-001-main');
  assert.ok(pattern.metadata.suggestedBPM);
  assert.ok(!pattern.tempo, 'Pattern should not have tempo field');
  assert.ok(Array.isArray(pattern.tracks));
});

test('generate creates variations', async () => {
  const output = path.join(TEST_OUTPUT, 'variations-test');
  execSync(`node ${CLI} generate techno --count 1 --output ${output}`);

  const variations = ['main', 'intro', 'outro', 'fill'];

  for (const variation of variations) {
    const file = path.join(output, `techno/techno-001-${variation}.json`);
    const stats = await fs.stat(file);
    assert.ok(stats.isFile(), `Should have ${variation} file`);

    const content = await fs.readFile(file, 'utf-8');
    const pattern = JSON.parse(content);
    assert.strictEqual(pattern.metadata.variation, variation);
  }
});

test('generate creates index.json', async () => {
  const output = path.join(TEST_OUTPUT, 'index-test');
  execSync(`node ${CLI} generate dnb --count 2 --output ${output}`);

  const indexFile = path.join(output, 'index.json');
  const content = await fs.readFile(indexFile, 'utf-8');
  const index = JSON.parse(content);

  assert.strictEqual(index.version, '1.0');
  assert.ok(index.totalPatterns > 0);
  assert.ok(index.genres.dnb);
  assert.strictEqual(index.genres.dnb.count, 2);
  assert.ok(Array.isArray(index.genres.dnb.patterns));
});

test('generated patterns follow naming convention', async () => {
  const output = path.join(TEST_OUTPUT, 'naming-test');
  execSync(`node ${CLI} generate breakbeat --count 2 --output ${output}`);

  const files = await fs.readdir(path.join(output, 'breakbeat'));

  const pattern = /^breakbeat-\d{3}-(main|intro|outro|fill)\.json$/;
  files.forEach(file => {
    assert.ok(pattern.test(file), `${file} should match naming convention`);
  });
});

test('patterns have valid BPM ranges', async () => {
  const output = path.join(TEST_OUTPUT, 'bpm-test');
  execSync(`node ${CLI} generate trip-hop --count 1 --output ${output}`);

  const file = path.join(output, 'trip-hop/trip-hop-001-main.json');
  const content = await fs.readFile(file, 'utf-8');
  const pattern = JSON.parse(content);

  assert.ok(pattern.metadata.suggestedBPM);
  assert.ok(Array.isArray(pattern.metadata.bpmRange));
  assert.strictEqual(pattern.metadata.bpmRange.length, 2);

  const [min, max] = pattern.metadata.bpmRange;
  assert.ok(min < max);
  assert.ok(pattern.metadata.suggestedBPM >= min);
  assert.ok(pattern.metadata.suggestedBPM <= max);
});

test('compose uses suggested BPM from pattern', async () => {
  const output = path.join(TEST_OUTPUT, 'compose-test');
  execSync(`node ${CLI} generate house --count 1 --output ${output}`);

  const pattern = path.join(output, 'house/house-001-main.json');
  const midiOut = path.join(TEST_OUTPUT, 'test-compose.mid');

  const result = execSync(`node ${CLI} compose ${pattern} -o ${midiOut}`).toString();

  assert.ok(result.includes('120 BPM'), 'Should use house suggested BPM of 120');

  const stats = await fs.stat(midiOut);
  assert.ok(stats.isFile());
  assert.ok(stats.size > 0);
});

test('compose can override suggested BPM', async () => {
  const output = path.join(TEST_OUTPUT, 'override-test');
  execSync(`node ${CLI} generate techno --count 1 --output ${output}`);

  const pattern = path.join(output, 'techno/techno-001-main.json');
  const midiOut = path.join(TEST_OUTPUT, 'test-override.mid');

  const result = execSync(`node ${CLI} compose ${pattern} --bpm 140 -o ${midiOut}`).toString();

  assert.ok(result.includes('140 BPM'), 'Should override with 140 BPM');
});
