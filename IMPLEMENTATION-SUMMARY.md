# Sample Naming Standardization - Implementation Summary

## Overview
Standardized sample naming to MIDI note-prefixed format: `[note]-drum-name[-descriptor].mp3`

## Changes Made

### 1. GM Drum Map (`src/utils/gm-drum-map.js`)
- Added `DRUM_SAMPLE_NAMES` mapping MIDI notes to standard filenames
- Added `getDrumFileName(drumName)` - get standard filename for drum
- Added `formatSampleName(drumName, descriptor)` - format with MIDI note prefix

### 2. ElevenLabs Service (`src/services/elevenlabs-service.js`)
- Updated `sanitizeFilename()` to extract drum type and use MIDI note prefix
- Prioritizes longer drum names first (e.g., "hihat-open" before "hihat")
- Updated drum kit presets to use new format:
  - 808: `kick 808` → `36-kick-808.mp3`
  - Acoustic: `kick acoustic` → `36-kick-acoustic.mp3`
  - Electronic: `kick electronic` → `36-kick-electronic.mp3`

### 3. Audio Renderer (`src/services/audio-renderer.js`)
- Enhanced `findSampleFile()` with smart search priority:
  1. Note-prefixed exact: `36-kick.mp3`
  2. Note-prefixed with descriptor: `36-kick-*.mp3`
  3. Standard name: `kick.mp3`
  4. Descriptive variants: `kick-*.mp3`
- Backward compatible with old naming

### 4. Generate Beats Script (`scripts/generate-beats.sh`)
- Updated all genre prompts to use new format:
  - House: `kick deep house` → `36-kick-deep-house.mp3`
  - Techno: `kick hard techno` → `36-kick-hard-techno.mp3`
  - DnB: `kick punchy dnb` → `36-kick-punchy-dnb.mp3`
  - Trip-Hop: `kick dusty trip-hop` → `36-kick-dusty-trip-hop.mp3`

### 5. Documentation
- Created `docs/SAMPLE-NAMING.md` with:
  - Naming conventions and rules
  - GM MIDI drum map reference
  - Generation examples
  - Sampler compatibility info
  - Migration guide

## Example Outputs

### Prompts → Filenames
```
"kick deep house"       → 36-kick-deep-house.mp3
"snare tight"           → 38-snare-tight.mp3
"hihat crisp"           → 42-hihat-crisp.mp3
"hihat-open bright"     → 46-hihat-open-bright.mp3
"clap"                  → 39-clap.mp3
"kick 808"              → 36-kick-808.mp3
```

### Common Drum Notes
```
36 → kick
38 → snare
39 → clap
42 → hihat (closed)
46 → hihat-open
49 → crash
51 → ride
```

## Verification

All tests passing:

### GM Drum Map Tests (`test-sample-naming.js`)
✓ 17/17 tests passed
- Basic drums (kick, snare, hihat, etc.)
- With descriptors (kick-808, snare-tight, etc.)
- Aliases (bd→kick, sn→snare, hh→hihat)

### ElevenLabs Naming Tests (`test-elevenlabs-naming.js`)
✓ 10/10 tests passed
- Simple prompts ("kick")
- With descriptors ("kick deep house")
- Compound names ("hihat-open bright")

## Benefits

✅ **Hardware sampler compatible** - Works with MPC, Elektron, SP-404
✅ **Auto-mapping** - MIDI note prefix enables automatic mapping
✅ **Organized** - Files sort by note number
✅ **Human-readable** - Still includes drum name
✅ **Backward compatible** - Old samples still work
✅ **No manual mapping** - Renderer finds samples automatically

## Usage

### Generate samples
```bash
beat-gen sample "kick deep" "snare tight" "hihat" --output samples/
```

### Generate and render beat
```bash
# 1. Generate pattern
beat-gen generate house --count 1

# 2. Generate samples
beat-gen sample "kick" "snare" "hihat" "hihat-open" --output samples/house/

# 3. Render (no mapping needed!)
beat-gen render data/generated-patterns/house/house-001-main.json \
  --samples samples/house/ -o beat.wav
```

### Full workflow script
```bash
./scripts/generate-beats.sh
```

Generates 4 complete beats (house, techno, dnb, trip-hop) with proper naming.

## Migration

**No migration required!** The renderer automatically finds both:
- New format: `36-kick.mp3`, `36-kick-808.mp3`
- Old format: `kick.mp3`, `deep-house-kick-drum.mp3`

Existing samples continue to work without changes.
