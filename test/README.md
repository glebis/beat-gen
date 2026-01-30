# Beat-Gen Test Suite

Comprehensive test coverage for the beat-gen pattern generation system.

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode (re-run on changes)
npm run test:watch
```

## Test Structure

```
test/
├── unit/                           # Unit tests (isolated components)
│   ├── pattern-generator.test.js  # Core utilities
│   ├── genre-templates.test.js    # Genre generators
│   └── variation-engine.test.js   # Pattern variations
├── integration/                    # Integration tests (CLI + file system)
│   └── generate-command.test.js   # End-to-end CLI testing
└── output/                         # Test output (gitignored)
```

## Test Coverage

### Unit Tests (30 tests)

**Pattern Generator Utilities** (11 tests)
- Random value generation
- Pattern builders (four-on-floor, backbeat, offbeat)
- Pattern manipulation (normalize, shift, reverse, sparse)
- Pattern creation and metadata
- Number padding

**Genre Templates** (12 tests)
- All 8 genre generators (house, techno, dnb, breakbeat, uk-garage, idm, trip-hop, ostinato)
- Genre-specific requirements (resolution, BPM, style)
- Metadata validation
- Track structure validation
- Pattern variations (amen, two-step, polyrhythms)

**Variation Engine** (7 tests)
- Intro generation (sparse patterns)
- Outro generation (reduced velocity)
- Fill generation (drum fills + crash)
- Humanization (velocity variation)
- Ghost notes
- Resolution preservation

### Integration Tests (8 tests)

**CLI Commands**
- `generate --list` - List available genres
- `generate <genre>` - Generate patterns
- Pattern file creation and naming
- Variation generation (intro/outro/fill)
- Index.json generation

**Pattern Structure**
- Valid JSON format
- Metadata fields (no tempo, has suggestedBPM)
- Naming convention (genre-NNN-variation.json)
- BPM ranges

**Compose Integration**
- Uses suggested BPM from pattern
- BPM override with --bpm flag
- MIDI file generation

## Test Framework

Uses Node.js built-in test runner (Node 18+):
- No external dependencies
- Fast execution (~1 second for all tests)
- Watch mode support
- TAP output format

## Adding Tests

### Unit Test Template

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { myFunction } from '../../src/my-module.js';

test('describes what it tests', () => {
  const result = myFunction();
  assert.strictEqual(result, expectedValue);
});
```

### Integration Test Template

```javascript
import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'child_process';

test('CLI command test', () => {
  const output = execSync('node bin/beat-gen.js command').toString();
  assert.ok(output.includes('expected text'));
});
```

## Test Results Summary

```
✓ Unit Tests:        30 passed
✓ Integration Tests:  8 passed
✓ Total:            38 passed
✓ Duration:         ~1 second
✓ Coverage:         Pattern generation, CLI, file I/O
```

## CI/CD Integration

Tests can be run in CI pipelines:

```yaml
# GitHub Actions example
- name: Run tests
  run: npm test
```

Exit codes:
- `0` - All tests passed
- `1` - One or more tests failed

## Manual Testing

For manual verification:

```bash
# Generate patterns
beat-gen generate house --count 2

# Verify output
ls -la data/generated-patterns/house/

# Test compose
beat-gen compose data/generated-patterns/house/house-001-main.json -o test.mid

# Check BPM usage
beat-gen compose data/generated-patterns/dnb/dnb-001-main.json -o test.mid
# Should use 170 BPM (suggested)

beat-gen compose data/generated-patterns/house/house-001-main.json --bpm 130 -o test.mid
# Should use 130 BPM (override)
```

## Known Issues

None - all tests passing!

## Future Tests

Potential additions:
- Pattern parser tests
- MIDI export validation
- Audio rendering tests
- Performance benchmarks
- Pattern quality metrics
