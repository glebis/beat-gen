# Sample Naming Conventions

## Standard Format

**Format**: `[midi-note]-drum-name[-descriptor].mp3`

Examples:
- `36-kick.mp3` - Basic kick drum (MIDI note 36)
- `36-kick-808.mp3` - 808-style kick
- `38-snare-tight.mp3` - Tight snare (MIDI note 38)
- `42-hihat-dusty.mp3` - Lo-fi hi-hat (MIDI note 42)

## Why Note-Prefixed Names?

✅ **Hardware sampler compatible** (MPC, Elektron, SP-404)
✅ **Unique identification** - MIDI note ensures no ambiguity
✅ **Auto-mapping** - Samples map directly to MIDI notes
✅ **Organized** - Files sort by note number
✅ **Human-readable** - Still includes drum name

## General MIDI Drum Map

Based on GM Level 1 standard (MIDI Channel 10):

| MIDI Note | Standard Name | Aliases | Example File |
|-----------|---------------|---------|--------------|
| 35-36 | kick | bass, bd | `36-kick.mp3` |
| 37 | rimshot | sidestick | `37-rimshot.mp3` |
| 38, 40 | snare | sn, sd | `38-snare.mp3` |
| 39 | clap | handclap | `39-clap.mp3` |
| 42 | hihat | hh, ch, hat | `42-hihat.mp3` |
| 44 | hihat-pedal | ph | `44-hihat-pedal.mp3` |
| 46 | hihat-open | oh | `46-hihat-open.mp3` |
| 41, 43 | tom-low | tom3 | `43-tom-low.mp3` |
| 45, 47 | tom-mid | tom2 | `47-tom-mid.mp3` |
| 48, 50 | tom-high | tom1 | `50-tom-high.mp3` |
| 49, 57 | crash | cymbal | `49-crash.mp3` |
| 51, 59 | ride | ride-cymbal | `51-ride.mp3` |
| 52 | china | - | `52-china.mp3` |
| 55 | splash | - | `55-splash.mp3` |
| 56 | cowbell | - | `56-cowbell.mp3` |
| 54 | tambourine | - | `54-tambourine.mp3` |
| 82 | shaker | - | `82-shaker.mp3` |

## Naming Rules

1. **MIDI note prefix**: Always start with 2-digit note number
2. **Lowercase**: Use lowercase for drum type (`kick`, not `Kick`)
3. **Hyphens**: Use hyphens as separators (`36-kick-808`, not `36_kick_808`)
4. **No spaces**: Replace spaces with hyphens
5. **Descriptors last**: Put descriptor after drum type (`36-kick-808`, not `36-808-kick`)

## Generation Examples

### Basic Kit (No Descriptors)
```bash
beat-gen sample "kick" "snare" "hihat" "hihat-open"
```
Generates:
- `36-kick.mp3`
- `38-snare.mp3`
- `42-hihat.mp3`
- `46-hihat-open.mp3`

### With Descriptors
```bash
beat-gen sample "kick 808" "snare tight" "hihat crisp"
```
Generates:
- `36-kick-808.mp3`
- `38-snare-tight.mp3`
- `42-hihat-crisp.mp3`

### Genre-Specific
```bash
beat-gen sample "kick deep house" "snare acoustic jazz"
```
Generates:
- `36-kick-deep-house.mp3`
- `38-snare-acoustic-jazz.mp3`

## Rendering Workflow

The renderer automatically finds samples by MIDI note:

```bash
# 1. Generate pattern
beat-gen generate house --count 1

# 2. Generate samples (drum type first)
beat-gen sample "kick" "snare" "hihat" "hihat-open" --output samples/house/

# 3. Render (no mapping needed!)
beat-gen render data/generated-patterns/house/house-001-main.json \
  --samples samples/house/ \
  --output house-beat.wav
```

The renderer searches in priority order:
1. Note-prefixed exact match: `36-kick.mp3`
2. Note-prefixed with descriptor: `36-kick-*.mp3`
3. Standard name: `kick.mp3`
4. Descriptive variants: `kick-*.mp3`

## Sampler Compatibility

This naming works with:
- ✅ Akai MPC series (recognizes note prefix)
- ✅ Elektron Digitakt/Octatrack (note prefix)
- ✅ Roland SP-404 (note prefix)
- ✅ Native Instruments Battery/Kontakt
- ✅ Ableton Drum Rack (auto-maps by note)
- ✅ FL Studio (auto-maps by note)
- ✅ Logic Drum Kit Designer
- ✅ Reason Kong/Redrum

## Migration from Old Format

**Old format** (descriptive):
```
deep-house-kick-drum.mp3
tight-house-snare.mp3
crisp-closed-hi-hat.mp3
```

**New format** (note-prefixed):
```
36-kick-deep-house.mp3
38-snare-tight-house.mp3
42-hihat-crisp.mp3
```

**Backward compatibility**: The renderer still finds old-format samples, so existing samples continue to work. No migration required!

## Tips

- **Keep descriptors short** (max 30 chars): `36-kick-deep-house`, not `36-kick-deep-house-sub-bass-punchy`
- **Drum type first**: Always put drum type before descriptor in prompts
- **Use standard names**: Stick to GM drum names for compatibility
- **Test rendering**: Generate samples, then render immediately to verify naming

## Quick Reference

```bash
# Generate complete beat workflow
beat-gen generate house --count 1
beat-gen sample "kick deep" "snare tight" "hihat" --output samples/house/
beat-gen render data/generated-patterns/house/house-001-main.json \
  --samples samples/house/ -o beat.wav

# List all GM drum names
beat-gen list-drums

# Generate full drum kit
beat-gen kit 808 --output samples/808/
```
