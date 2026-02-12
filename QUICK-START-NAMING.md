# Quick Start: MIDI Note-Prefixed Sample Names

Sample names now use MIDI note prefixes for hardware sampler compatibility and automatic mapping.

## Format

`[midi-note]-drum-name[-descriptor].mp3`

Examples:
- `36-kick.mp3` - Basic kick (MIDI note 36)
- `36-kick-808.mp3` - 808 kick
- `38-snare-tight.mp3` - Tight snare (MIDI note 38)
- `42-hihat.mp3` - Closed hi-hat (MIDI note 42)
- `46-hihat-open.mp3` - Open hi-hat (MIDI note 46)

## Quick Examples

### 1. Generate Basic Samples
```bash
beat-gen sample "kick" "snare" "hihat" "hihat-open" --output samples/
```

Generates:
```
samples/36-kick.mp3
samples/38-snare.mp3
samples/42-hihat.mp3
samples/46-hihat-open.mp3
```

### 2. Generate 808 Kit
```bash
beat-gen sample "kick 808" "snare 808" "hihat 808" "clap 808" --output samples/808/
```

Generates:
```
samples/808/36-kick-808.mp3
samples/808/38-snare-808.mp3
samples/808/42-hihat-808.mp3
samples/808/39-clap-808.mp3
```

### 3. Generate Genre-Specific Kit
```bash
beat-gen sample \
  "kick deep house" \
  "snare tight house" \
  "hihat crisp" \
  "hihat-open bright" \
  --output samples/house/
```

Generates:
```
samples/house/36-kick-deep-house.mp3
samples/house/38-snare-tight-house.mp3
samples/house/42-hihat-crisp.mp3
samples/house/46-hihat-open-bright.mp3
```

### 4. Complete Workflow
```bash
# Generate pattern
beat-gen generate house --count 1

# Generate samples (drum type FIRST in prompt)
beat-gen sample \
  "kick deep" \
  "snare tight" \
  "hihat" \
  "hihat-open" \
  --output samples/house/

# Render to audio (no mapping needed!)
beat-gen render \
  data/generated-patterns/house/house-001-main.json \
  --samples samples/house/ \
  --output house-beat.wav
```

### 5. Use Preset Kit
```bash
beat-gen sample --kit 808 --output samples/808/
```

## Prompt Format Rules

✅ **Drum type first**: `"kick deep house"` not `"deep house kick"`
✅ **Use standard names**: kick, snare, hihat, hihat-open, clap, crash, ride
✅ **Keep descriptors short**: Max ~30 chars after drum type
✅ **Lowercase with hyphens**: Use `hihat-open` not `Hihat_Open`

## Common MIDI Notes

| Note | Drum | Example File |
|------|------|--------------|
| 36 | Kick | `36-kick.mp3` |
| 37 | Rimshot | `37-rimshot.mp3` |
| 38 | Snare | `38-snare.mp3` |
| 39 | Clap | `39-clap.mp3` |
| 42 | Hi-hat (closed) | `42-hihat.mp3` |
| 44 | Hi-hat (pedal) | `44-hihat-pedal.mp3` |
| 46 | Hi-hat (open) | `46-hihat-open.mp3` |
| 49 | Crash | `49-crash.mp3` |
| 50 | Tom (high) | `50-tom-high.mp3` |
| 51 | Ride | `51-ride.mp3` |
| 56 | Cowbell | `56-cowbell.mp3` |

## Testing

```bash
# Test naming functions
node tests/test-sample-naming.js

# Test prompt conversion
node tests/test-elevenlabs-naming.js
```

## Backward Compatibility

Old samples still work! The renderer searches:
1. `36-kick.mp3` (new format)
2. `kick.mp3` (old format)
3. `deep-house-kick-drum.mp3` (descriptive format)

No migration needed for existing samples.

## Documentation

See `docs/SAMPLE-NAMING.md` for complete documentation.
