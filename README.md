```
     ___  ____  __  ____    ___  ____  _  _
    (  ,\(  __)(  )(_  _)  / __)(  __)( \( )
     ) _/ ) _)  )(   )(   ( (_-. ) _)  )  (
    (_)  (____)(__) (__)    \___/(____)(_)\_)
    ┌─────────────────────────────────────────────┐
    │  ◉ KICK  ◉ SNARE ◉ HAT  ◉ BASS ◉ LEAD     │
    │  ├┤████░░████░░░░██░░├┤██████░░░░████░░░░│  │
    │  ├┤░░░░██░░░░████░░██├┤░░████████░░░░████│  │
    │  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  │
    │  BPM [128]  KEY [Cm]  SWING [○────●──]      │
    │  VOL [●───] MIX [──●─] FX [───●]            │
    └─────────────────────────────────────────────┘
```

# Beat-Gen v2

Full track generator with up to 12 tracks: drums + bass + melody + pads + vocal chops + stabs + textures + atmosphere + noise + scratches. Section-based arrangements with dynamic sparse-to-dense arcs, sidechain pumping, Euclidean rhythms, and experimental AI sound generation.

Designed for **AI agent** workflows: every feature is CLI-controllable, outputs JSON, supports `--seed` for reproducibility, and `--json` for machine-readable output.

## Features

- **9 genres**: house, techno, dnb, breakbeat, uk-garage, idm, trip-hop, ostinato, reggae
- **12 track types**: drums, bass, lead, pad, vocalChop, stab, texture, atmosphere, noise, scratch (+ arp, subBass, fx)
- **Dynamic arrangements**: bass-drop solos, pad breakdowns, noise risers, sparse-to-dense arcs
- **Complex rhythms**: Euclidean (Bjorklund), odd meters (5/4, 7/8), polyrhythms, broken-beat variations
- **Sidechain compression**: `--preset pumping` or `--preset heavy-sidechain` for ducking effects
- **Configurable variability**: `--weirdness`, `--density`, `--variety` knobs (0-1)
- **Target duration**: `--duration 120` scales sections to hit ~2min compositions
- **Experimental sounds**: weird AI prompts, prompt mutations, per-genre experimental alternatives
- **Music theory**: scales, chord progressions, key-aware generation
- **Multi-track MIDI**: separate channels per instrument with GM program changes
- **PNG visualization**: DAW-like arrangement timeline + pattern grid
- **WAV rendering**: sample-based audio with FFmpeg + sidechain
- **AI samples**: 11Labs text-to-sound with long sample support (crossfade looping >22s)
- **Agent-first**: `--json`, `--seed`, `--quiet` flags, `list` discovery command

## Quick Start

```bash
npm install
npm link

# Generate a full house track (JSON + MIDI + PNG)
beat-gen track house --key C --bpm 128 --seed 42

# Rich UK garage: 11 tracks, bass drops, breakdowns, ~2min
beat-gen track uk-garage --key C --variety 0.8 --weirdness 0.5 --duration 120

# Full pipeline with WAV rendering + sidechain pumping
beat-gen fulltrack uk-garage --key C --preset pumping --variety 0.8

# JSON output for agent piping
beat-gen track house --key Cm --json --seed 42

# Discover options
beat-gen list genres
beat-gen list scales
beat-gen list instruments
beat-gen list sections uk-garage
beat-gen list presets
```

## Commands

### `track` - Full Track Generation

```bash
beat-gen track <genre> [options]

Options:
  -k, --key <key>           Musical key (default: C)
  --scale <scale>           Scale (default: minor)
  -b, --bpm <tempo>         BPM (default: genre-appropriate)
  -r, --resolution <steps>  Steps per bar (default: 16)
  --tracks <list>           Comma-separated track list (e.g. "drums,bass,lead")
  --sections <list>         Override sections (e.g. "intro,drop,outro")
  --progression <list>      Chord degrees (e.g. "1,4,5,1")
  --seed <number>           Deterministic random seed
  --json                    JSON to stdout (for agent piping)
  --weirdness <n>           Experimental sound level 0-1 (default: 0)
  --density <n>             Note density 0-1 (default: 0.5)
  --variety <n>             Structural variety 0-1 (default: 0.5)
  --duration <seconds>      Target composition length
  --render                  Enable WAV rendering
  --preset <name>           Mix preset (clean, compressed, dub, pumping, heavy-sidechain)
  -q, --quiet               Suppress progress output
  -o, --output <dir>        Output directory (default: ./data/output)

Outputs: pattern.json + pattern.mid + pattern.png (+ mix.wav with --render)
```

#### Variability Controls

| Flag | Range | Default | Effect |
|------|-------|---------|--------|
| `--weirdness` | 0-1 | 0 | 0=standard prompts, 0.5=50% experimental, 1.0=always experimental+mutations |
| `--density` | 0-1 | 0.5 | Note density in texture/bass/melody generators |
| `--variety` | 0-1 | 0.5 | 0=basic 4-track, 0.5=some extras, 1.0=all 12 tracks + full section variation |
| `--duration` | 30-600 | (auto) | Target composition length; scales section bars proportionally |

#### Section Types

The arrangement engine creates dynamic sparse-to-dense arcs:

- **intro**: drums only (sparse opening)
- **verse**: drums + bass + pad
- **bass-drop**: bass solo, no drums (bass "does the drop")
- **chorus**: full stack with vocal chops, stabs
- **breakdown**: pad + atmosphere only (sparse gap)
- **build**: drums + noise riser (tension before drop)
- **outro**: pad + atmosphere (fade out)

#### Mix Presets

| Preset | Description |
|--------|-------------|
| `clean` | No sidechain, balanced EQ |
| `compressed` | Master compression, bass compression |
| `dub` | Reverb + delay sends, boosted bass/kick |
| `pumping` | Sidechain on bass/pad/lead (ratio 10, 200ms release) |
| `heavy-sidechain` | Aggressive sidechain on everything (ratio 20, 100ms release) |

### `bass` - Bass Pattern Generator

```bash
beat-gen bass --genre house --key C --scale minor --json --seed 42
beat-gen bass --list-modes
```

### `melody` - Melody/Pad/Arp Generator

```bash
beat-gen melody --genre house --key C --instrument lead --json --seed 42
beat-gen melody --instrument pad --genre trip-hop --json
beat-gen melody --list-instruments
```

### `visualize` - PNG Visualization

```bash
beat-gen visualize pattern.json -o structure.png
beat-gen visualize track.json --width 1200 --height 800
```

### `list` - Discovery (Agent-Friendly)

```bash
beat-gen list genres          # ["house","techno","dnb",...]
beat-gen list scales          # ["minor","dorian","pentatonic",...]
beat-gen list instruments     # 12 instruments: bass,lead,pad,arp,fx,subBass,vocalChop,texture,noise,scratch,atmosphere,stab
beat-gen list progressions    # {house:[[1,4],...], ...}
beat-gen list sections uk-garage  # intro,verse,bass-drop,chorus,breakdown,build,...
beat-gen list presets         # ["clean","compressed","dub","pumping","heavy-sidechain"]
beat-gen list variations      # {uk-garage:["main","broken","halftime"], idm:["main","5/4","7/8","polyrhythm"],...}
```

### `theory` - Music Theory Utilities

```bash
beat-gen theory --list-scales
beat-gen theory --list-keys
beat-gen theory --list-progressions house
beat-gen theory --scale "C minor" --octave 2-4
```

### `compose` - Pattern to MIDI

```bash
beat-gen compose pattern.txt --bpm 120 --output beat.mid
beat-gen compose --pattern "kick: X...X..." --bpm 120
```

### `render` - WAV Audio Rendering

```bash
beat-gen render pattern.json --samples ./samples/808/ --output beat.wav
beat-gen render pattern.json --preset dub --samples ./samples/808/
```

### `generate` - Pattern Library

```bash
beat-gen generate house --count 5
beat-gen generate --all --count 10
beat-gen generate --list
```

### `fulltrack` - End-to-End Pipeline

Generates arrangement + auto-generates samples via 11Labs + renders WAV variants + stems.

```bash
beat-gen fulltrack uk-garage --key C --preset pumping --variety 0.8 --weirdness 0.5
beat-gen fulltrack techno --bpm 135 --preset heavy-sidechain --duration 180
```

### `sample` - AI Sample Generation (11Labs)

```bash
beat-gen sample "808 kick drum"
beat-gen sample --kit 808

# Generate all instrument samples for a genre (bass, lead, pad, vocalChop, stab, etc.)
beat-gen sample --instruments --genre uk-garage --variants 3
beat-gen sample --instruments --genre uk-garage --variants 3 --weirdness 0.7
```

### `import` / `export` - Format Conversion

```bash
beat-gen import beat.mid --format json
beat-gen export pattern.json --format midi
```

## Agent Workflow Example

```bash
# 1. Discover options
beat-gen list genres
beat-gen list presets
beat-gen list sections uk-garage

# 2. Generate rich arrangement (11 tracks, bass drops, breakdowns)
beat-gen track uk-garage --key C --variety 0.8 --density 0.6 --duration 120 --seed 42 --json > track.json

# 3. Generate with experimental sounds
beat-gen track idm --weirdness 0.9 --variety 1.0 --seed 42 --json > weird.json

# 4. Full pipeline: generate + render with sidechain
beat-gen fulltrack uk-garage --key C --preset pumping --variety 0.8 --weirdness 0.5

# 5. Visualize
beat-gen visualize track.json -o structure.png
```

## Pattern Schema v2.0

```json
{
  "version": "2.0",
  "key": "Cm",
  "scale": "minor",
  "tempo": 135,
  "timeSignature": "4/4",
  "resolution": 16,
  "metadata": {
    "genre": "uk-garage",
    "totalBars": 68,
    "variety": 0.8,
    "density": 0.6,
    "progression": [1, 5, 6, 4]
  },
  "tracks": [
    { "name": "kick", "midiNote": 36, "pattern": [{"step": 0, "velocity": 127}] },
    { "name": "bass", "channel": 2, "instrument": 39,
      "pattern": [{"step": 0, "velocity": 100, "pitch": 36, "duration": 4}] },
    { "name": "vocalChop", "channel": 8, "instrument": 55,
      "pattern": [{"step": 3, "velocity": 85, "pitch": 60, "duration": 2}] },
    { "name": "atmosphere", "channel": 14, "instrument": 90,
      "pattern": [{"step": 0, "velocity": 45, "pitch": 60, "duration": 16}] }
  ],
  "sections": [
    { "name": "intro", "bars": 8, "activeTracks": ["drums"], "energy": 0.3 },
    { "name": "bass-drop", "bars": 4, "activeTracks": ["bass"], "energy": 0.9 },
    { "name": "chorus", "bars": 16, "activeTracks": ["drums","bass","lead","pad","vocalChop","stab"], "energy": 1.0 },
    { "name": "breakdown", "bars": 4, "activeTracks": ["pad","atmosphere"], "energy": 0.15 }
  ]
}
```

Backward compatible: patterns without `sections` or pitched fields work as v1.

## Architecture

```
src/
  cli/commands/     # 12 CLI commands (track, fulltrack, sample, render, ...)
  core/             # Pattern parser
  generators/
    arrangement-engine.js   # Section templates, variety/density/duration targeting
    genre-templates.js      # Drum patterns per genre + broken/odd-meter variations
    pattern-generator.js    # Euclidean rhythms, polyrhythms, odd meter grids
    bass-generator.js       # 12 bass styles (bounce, acid, long-sub, ...)
    melody-generator.js     # Lead/pad/arp generators
    texture-generator.js    # vocalChop, noise, scratch, texture, atmosphere, stab
    variation-engine.js     # Intro/outro/fill variations
  services/
    mix-processor.js        # FFmpeg filter_complex + sidechain compression
    elevenlabs-service.js   # AI sample generation + experimental prompts
    audio-renderer.js       # WAV rendering pipeline
    midi-service.js         # MIDI export
    track-visualizer.js     # PNG visualization
  utils/
    gm-instrument-map.js    # 12 GM instruments (channels 2-8, 11-15)
    gm-drum-map.js          # GM drum map (channel 10)
    music-theory.js         # Scales, chords, progressions
```

## Dependencies

- `commander` - CLI framework
- `@tonejs/midi` - MIDI file handling
- `@napi-rs/canvas` - PNG rendering (Rust-based, no native build issues)
- `fluent-ffmpeg` - Audio rendering
- `chalk` - Terminal styling

## Testing

```bash
npm test         # 102 tests
npm run test:all # + naming convention tests
```

## License

MIT
