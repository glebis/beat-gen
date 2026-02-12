# Beat-Gen Development Guide

## Project Overview

Beat-gen is a CLI music generator that creates multi-track arrangements with drums, bass, melody, pads, and 6 texture tracks. It outputs JSON patterns, MIDI files, PNG visualizations, and WAV audio.

## How to Use Beat-Gen (Prompting Guide)

### Generating a Track (Pattern Only -- No Samples Needed)

```bash
# Basic: genre + key
node bin/beat-gen.js track house --key C

# Full control: all knobs
node bin/beat-gen.js track uk-garage --key C --bpm 135 --seed 777 \
  --variety 0.8 --density 0.6 --weirdness 0.5 --duration 120
```

Output: `data/output/<genre>-<bpm>bpm-<key>m/` containing pattern.json, pattern.mid, pattern.png

### Generating Samples (Requires ELEVENLABS_API_KEY)

```bash
# Full instrument kit (bass, lead, pad + texture instruments)
node bin/beat-gen.js sample --instruments --genre uk-garage --variants 3 --weirdness 0.5

# Custom drum samples
node bin/beat-gen.js sample "dusty kick trip-hop" "cracking snare dark" -o ./data/samples/trip-hop

# Drum files MUST follow naming: {midiNote}-{name}*.mp3 or {name}.mp3
# Examples: 36-kick-dusty.mp3, snare.mp3, 42-hihat-tight.mp3
```

### Full Pipeline (Generate + Render WAV)

```bash
# End-to-end: generates arrangement, uses existing samples, renders WAV
node bin/beat-gen.js fulltrack uk-garage --key C --seed 777 \
  --preset pumping --variants 3 --variety 0.8 --density 0.6 --weirdness 0.5 --duration 120
```

Output: mix.wav + per-track stems in `v1/`, `v2/`, `v3/` subdirectories

### Available Genres

`house`, `techno`, `dnb`, `breakbeat`, `uk-garage`, `idm`, `trip-hop`, `ostinato`, `reggae`

### Key Format

Key is just the root note: `C`, `D`, `Eb`, `F#`, `Bb`. NOT `Cm` or `Dm` -- scale defaults to minor.

### Typical Workflow

1. Generate pattern: `track <genre> --key <note> ...` (inspect PNG)
2. Generate samples: `sample --instruments --genre <genre> --variants 3`
3. Generate drums: `sample "kick <style>" "snare <style>" ... -o ./data/samples/<genre>`
4. Rename drums to standard naming (36-kick, 38-snare, 42-hihat, 46-hihat-open, 37-rimshot, 39-clap)
5. Render: `fulltrack <genre> --key <note> --preset pumping --variants 3`

### Parameter Cheat Sheet

| Want | Use |
|------|-----|
| More tracks/sections | `--variety 0.8-1.0` |
| Sparse/minimal | `--density 0.2-0.3` |
| Weird/experimental sounds | `--weirdness 0.6-1.0` |
| Sidechain pump | `--preset pumping` |
| Aggressive sidechain | `--preset heavy-sidechain` |
| Reproducible output | `--seed <any-number>` |
| Longer track | `--duration 180` (seconds) |

## Quick Dev Reference

```bash
npm install && npm link

# Generate pattern (no API key needed)
beat-gen track uk-garage --key C --variety 0.8 --duration 120 --seed 42

# Full pipeline with rendering (needs samples or 11Labs key)
beat-gen fulltrack uk-garage --key C --preset pumping --variety 0.8

# JSON output for piping
beat-gen track house --json --quiet --seed 42
```

## Architecture

ES modules (`import/export`). Node.js CLI via Commander.

### Data Flow

```
genre-templates.js (drums) ─┐
bass-generator.js ───────────┤
melody-generator.js ─────────┼─► arrangement-engine.js ─► pattern.json
texture-generator.js ────────┤                           ├─► pattern.mid
pattern-generator.js ────────┘                           ├─► pattern.png
                                                         └─► mix.wav (via mix-processor.js + ffmpeg)
```

### Key Files

| File | Purpose |
|------|---------|
| `bin/beat-gen.js` | CLI entry point, command definitions |
| `src/generators/arrangement-engine.js` | Section templates, variety/density/duration params, extra track orchestration |
| `src/generators/genre-templates.js` | Drum patterns per genre, broken-beat/odd-meter variations, `GENRE_GENERATORS` |
| `src/generators/texture-generator.js` | Generators for vocalChop, noise, scratch, texture, atmosphere, stab |
| `src/generators/pattern-generator.js` | Euclidean rhythms (Bjorklund), odd meter grids, polyrhythm builder |
| `src/generators/bass-generator.js` | 12 bass styles, section-aware generation, `BASS_MODES` per genre |
| `src/services/mix-processor.js` | FFmpeg filter_complex builder, sidechain compression, 5 presets |
| `src/services/elevenlabs-service.js` | 11Labs API, prompt kits per genre, experimental prompts, long sample support |
| `src/utils/gm-instrument-map.js` | 12 MIDI instruments on channels 2-8, 11-15 (ch10 = drums) |

### CLI Parameters

| Flag | Range | Default | Effect |
|------|-------|---------|--------|
| `--weirdness` | 0-1 | 0 | Experimental prompt selection + mutations |
| `--density` | 0-1 | 0.5 | Note density in all generators |
| `--variety` | 0-1 | 0.5 | Extra track count + section variation (0=4 tracks, 1=12 tracks) |
| `--duration` | seconds | auto | Target composition length, scales section bars proportionally |
| `--preset` | name | none | Mix preset: clean, compressed, dub, pumping, heavy-sidechain |
| `--seed` | number | random | Deterministic output for reproducibility |

### 12 Track Types

| Track | MIDI Ch | Role | Pattern Character |
|-------|---------|------|-------------------|
| bass | 2 | Pitched bass | Bounce, acid, long-sub, etc. |
| lead | 3 | Melody | Genre-specific |
| pad | 4 | Chords | Sustained |
| arp | 5 | Arpeggios | Sequenced |
| fx | 6 | Effects | Sparse |
| subBass | 7 | Sub frequencies | Deep sustained |
| vocalChop | 8 | Vocal fragments | Syncopated, chorus-heavy |
| texture | 11 | Background layer | One long note per bar |
| noise | 12 | Noise sweeps | Risers in build sections |
| scratch | 13 | DJ scratches | Rapid 1-step bursts |
| atmosphere | 14 | Ambient drone | One note per section |
| stab | 15 | Chord hits | Beat 2, "and" of 3 |

### Section Types

Sections create sparse-to-dense dynamic arcs:

- `intro` - drums only
- `verse` - drums + bass + pad
- `bass-drop` - **bass solo, no drums** (bass "does the drop")
- `chorus` - full stack (drums + bass + lead + pad + vocalChop + stab)
- `breakdown` - pad + atmosphere only (sparse gap)
- `build` - drums + noise riser (tension before drop)
- `outro` - pad + atmosphere

### Genre Variations

```
uk-garage: main, broken, halftime
idm: main, 5/4, 7/8, polyrhythm
ostinato: 3:4, 5:4, 7/8
dnb: amen, two-step
reggae: one-drop, rockers, steppers
```

## Conventions

- **Seeded RNG**: `(s * 16807) % 2147483647` in each generator for deterministic output
- **Track format**: `{ name, midiNote, channel, instrument, pattern: [{step, velocity, pitch, duration}] }`
- **Section format**: `{ name, bars, tracks: string[], energy: 0-1 }`
- **No test framework**: tests in `test/` use plain Node.js assertions
- **FFmpeg required** for WAV rendering (`brew install ffmpeg`)
- **11Labs API key** required only for sample generation, not pattern generation

## Common Tasks

### Adding a new genre

1. Add drum generator in `src/generators/genre-templates.js` + add to `GENRE_GENERATORS`
2. Add section template in `src/generators/arrangement-engine.js` `GENRE_ARRANGEMENTS`
3. Add bass mode in `src/generators/bass-generator.js` `BASS_MODES`
4. Add extra track list in `arrangement-engine.js` `GENRE_EXTRA_TRACKS`
5. Add instrument prompts in `src/services/elevenlabs-service.js` `INSTRUMENT_KITS`
6. Add default tempo in `track.js` and `fulltrack.js` `getDefaultTempo()`

### Adding a new track type

1. Add instrument in `src/utils/gm-instrument-map.js` `GM_INSTRUMENTS`
2. Add generator function in `src/generators/texture-generator.js`
3. Add to `GENRE_EXTRA_TRACKS` in arrangement engine
4. Add prompts in `elevenlabs-service.js` `INSTRUMENT_KITS`
5. Add track config in mix presets (`mix-processor.js`)

### Adding a mix preset

Add to `PRESETS` in `src/services/mix-processor.js`. Include `sidechain` config if needed:

```js
sidechain: {
  source: 'kick',
  targets: ['bass', 'pad', 'lead'],
  threshold: 0.02, ratio: 10, attack: 5, release: 200,
}
```
