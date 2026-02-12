# Beat-Gen AI Agent Guide

Instructions for AI agents (Claude, GPT, etc.) operating beat-gen via CLI.

## Prerequisites

- Node.js 18+
- FFmpeg (`brew install ffmpeg` on macOS) -- required for WAV rendering
- `ELEVENLABS_API_KEY` env var -- required only for sample generation, not pattern generation
- Run `npm install` once before first use

## Commands Overview

| Command | Purpose | Needs API Key | Needs FFmpeg |
|---------|---------|:---:|:---:|
| `track` | Generate pattern (JSON + MIDI + PNG) | No | No |
| `sample` | Generate audio samples via 11Labs | Yes | No |
| `fulltrack` | Full pipeline: pattern + render WAV | No* | Yes |
| `wizard` | Interactive guided generation | Depends | Depends |

*fulltrack needs pre-existing samples in `data/samples/<genre>/` or an API key to auto-generate them.

## Step-by-Step: Generate a Full Track

### 1. Generate the Pattern

```bash
node bin/beat-gen.js track <genre> --key <note> --bpm <tempo> \
  --variety <0-1> --density <0-1> --weirdness <0-1> --duration <seconds> --seed <number>
```

**Genre options**: `house`, `techno`, `dnb`, `breakbeat`, `uk-garage`, `idm`, `trip-hop`, `ostinato`, `reggae`

**Key format**: Root note only -- `C`, `D`, `Eb`, `F#`, `Bb`. NOT `Cm` or `Dm`.

**Typical BPM ranges**:
| Genre | BPM Range |
|-------|-----------|
| trip-hop | 60-95 |
| reggae | 65-85 |
| house | 118-130 |
| uk-garage | 130-140 |
| techno | 125-150 |
| dnb | 160-180 |
| idm | 80-160 |

Output goes to `data/output/<genre>-<bpm>bpm-<key>m/`.

### 2. Generate Samples

Samples live in `data/samples/<genre>/`. Two types needed:

**Drum samples** (custom prompts):
```bash
node bin/beat-gen.js sample \
  "dusty kick <style>" "cracking snare <style>" \
  "closed hi-hat <style>" "open hi-hat <style>" \
  "rimshot <style>" "clap <style>" \
  -o ./data/samples/<genre>
```

IMPORTANT: After generation, rename drum files to match expected naming:
- `36-kick-<descriptor>.mp3` (or just `kick.mp3`)
- `38-snare-<descriptor>.mp3`
- `42-hihat-<descriptor>.mp3`
- `46-hihat-open-<descriptor>.mp3`
- `37-rimshot-<descriptor>.mp3`
- `39-clap-<descriptor>.mp3`

**Instrument samples** (from built-in prompt kits):
```bash
node bin/beat-gen.js sample --instruments --genre <genre> --variants 3 --weirdness <0-1>
```

This generates bass, lead, pad, and texture instruments (vocalChop, texture, atmosphere, etc.) depending on genre config.

### 3. Render Full Track

```bash
node bin/beat-gen.js fulltrack <genre> --key <note> --bpm <tempo> \
  --seed <number> --preset <preset> --variants <n> \
  --variety <0-1> --density <0-1> --weirdness <0-1> --duration <seconds>
```

**Presets**: `clean`, `compressed`, `dub`, `pumping`, `heavy-sidechain`

Output: `data/output/<genre>-<bpm>bpm-<key>m/v1/mix.wav`, `v1/stem-kick.wav`, etc.

## Parameter Reference

| Parameter | Range | Default | What It Controls |
|-----------|-------|---------|-----------------|
| `--variety` | 0-1 | 0.5 | Number of tracks (0=4 core, 1=all 12) and section diversity |
| `--density` | 0-1 | 0.5 | Note frequency in all generators. Low=sparse, high=busy |
| `--weirdness` | 0-1 | 0 | 0=standard prompts, 0.5=50% experimental, 1=always weird + mutations |
| `--duration` | seconds | auto | Target track length. Sections scale proportionally |
| `--preset` | name | none | Mix processing. `pumping` adds sidechain compression |
| `--seed` | number | random | Deterministic output. Same seed = same pattern |
| `--variants` | number | 3 | Number of alternative mixes (different sample variants) |

## Common Patterns

### Quick Pattern Preview (No Rendering)
```bash
node bin/beat-gen.js track house --key C --seed 42
# Check data/output/house-120bpm-Cm/pattern.png
```

### Regenerate Only Missing Samples
```bash
# Only generate specific instruments (won't overwrite existing)
node bin/beat-gen.js sample --instruments --genre uk-garage --variants 3
```

Note: `generateInstrumentKit` merges with existing `samples.json`, so it's safe to run incrementally.

### JSON Output for Scripting
```bash
node bin/beat-gen.js track house --json --quiet --seed 42 > pattern.json
```

### Render Existing Pattern with Different Preset
```bash
node bin/beat-gen.js render data/output/house-120bpm-Cm/pattern.json \
  --samples ./data/samples/house --preset dub --output rendered.wav
```

## File Structure

```
data/
  samples/
    <genre>/
      kick.mp3, snare.mp3, hihat.mp3, ...     # Drum samples
      bass-v1.mp3, bass-v2.mp3, bass-v3.mp3   # Pitched instruments (3 variants)
      lead-v1.mp3, pad-v1.mp3, ...
      vocalChop-v1.mp3, texture-v1.mp3, ...    # Texture instruments
      atmosphere-v1.mp3, ...
      samples.json                              # Metadata (referencePitch, variants)
  output/
    <genre>-<bpm>bpm-<key>m/
      pattern.json, pattern.mid, pattern.png
      v1/ v2/ v3/                               # Variant directories
        mix.wav                                  # Full mix
        stem-kick.wav, stem-bass.wav, ...       # Individual stems
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Invalid key: Dm` | Use root note only: `D` not `Dm` |
| `No events to render (missing samples?)` | Check samples exist in `data/samples/<genre>/` and names match |
| Drum sample not found | Rename to `{midiNote}-{name}*.mp3` format (e.g. `36-kick-dusty.mp3`) |
| `ffmpeg not found` | `brew install ffmpeg` |
| Progress shows >100% | Normal -- FFmpeg reports multi-track filter_complex progress oddly |
| `samples.json` missing instruments | Run `sample --instruments` to regenerate; it merges with existing |

## Genre-Specific Notes

**trip-hop**: Extra tracks = atmosphere, vocalChop, texture. Low energy ceiling (0.7 max). Good with density 0.3-0.4, variety 0.7-0.8.

**uk-garage**: Extra tracks = vocalChop, stab, texture, atmosphere, noise, scratch. Has bass-drop and build sections. Good with density 0.5-0.7, variety 0.8.

**idm**: Supports odd meters (5/4, 7/8) and polyrhythms via style variations. High weirdness recommended (0.7+).

**dnb**: Styles = amen, two-step. Fast BPM (160-180). Dense hi-hat patterns.

**reggae**: Styles = one-drop, rockers, steppers. Sparse kick, emphasis on offbeat.
