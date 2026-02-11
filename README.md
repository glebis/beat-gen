# Beat-Gen v2

Full track generator: drums + bass + melody + pads with section-based arrangements, multi-track MIDI export, WAV rendering, and PNG visualization.

Designed for **AI agent** workflows: every feature is CLI-controllable, outputs JSON, supports `--seed` for reproducibility, and `--json` for machine-readable output.

## Features

- **9 genres**: house, techno, dnb, breakbeat, uk-garage, idm, trip-hop, ostinato, reggae
- **Full tracks**: drums + bass + melody + pads with genre-specific patterns
- **Arrangement engine**: section-based structures (intro, build, drop, breakdown, outro)
- **Music theory**: scales, chord progressions, key-aware generation
- **Multi-track MIDI**: separate channels per instrument with GM program changes
- **PNG visualization**: DAW-like arrangement timeline + pattern grid
- **WAV rendering**: sample-based audio with FFmpeg
- **AI samples**: 11Labs text-to-sound integration
- **Agent-first**: `--json`, `--seed`, `--quiet` flags, `list` discovery command

## Quick Start

```bash
npm install
npm link

# Generate a full house track (JSON + MIDI + PNG)
beat-gen track house --key C --bpm 128 --seed 42

# JSON output for agent piping
beat-gen track house --key Cm --json --seed 42

# Discover options
beat-gen list genres
beat-gen list scales
beat-gen list instruments
beat-gen list sections house
```

## Commands

### `track` - Full Track Generation (NEW)

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
  -q, --quiet               Suppress progress output
  -o, --output <dir>        Output directory (default: ./output)

Outputs: <genre>.json + <genre>.mid + <genre>.png
```

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
beat-gen list instruments     # [{name,channel,program},...]
beat-gen list progressions    # {house:[[1,4],...], ...}
beat-gen list sections house  # [{name,bars,energy},...]
beat-gen list presets         # ["clean","compressed","dub"]
beat-gen list variations      # {house:["main"], dnb:["amen","two-step"],...}
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

### `sample` - AI Sample Generation (11Labs)

```bash
beat-gen sample "808 kick drum"
beat-gen sample --kit 808
```

### `import` / `export` - Format Conversion

```bash
beat-gen import beat.mid --format json
beat-gen export pattern.json --format midi
```

## Agent Workflow Example

```bash
# 1. Discover options
GENRES=$(beat-gen list genres)
SCALES=$(beat-gen list scales)

# 2. Generate deterministic track
beat-gen track house --key C --scale minor --bpm 128 --seed 42 --json > track.json

# 3. Generate individual parts
beat-gen bass --genre house --key C --json --seed 42 > bass.json
beat-gen melody --genre house --key C --instrument lead --json --seed 42 > melody.json

# 4. Visualize
beat-gen visualize track.json -o structure.png
```

## Pattern Schema v2.0

```json
{
  "version": "2.0",
  "key": "Cm",
  "scale": "minor",
  "tempo": 128,
  "timeSignature": "4/4",
  "resolution": 16,
  "tracks": [
    { "name": "kick", "midiNote": 36, "pattern": [{"step": 0, "velocity": 127}] },
    { "name": "bass", "channel": 2, "instrument": 39,
      "pattern": [{"step": 0, "velocity": 100, "pitch": 36, "duration": 4}] }
  ],
  "sections": [
    { "name": "intro", "bars": 8, "activeTracks": ["drums"], "energy": 0.3 },
    { "name": "drop", "bars": 16, "activeTracks": ["drums","bass","lead"], "energy": 1.0 }
  ]
}
```

Backward compatible: patterns without `sections` or pitched fields work as v1.

## Architecture

```
src/
  cli/commands/     # 12 CLI commands
  core/             # Pattern parser
  generators/       # Pattern, bass, melody, arrangement engines
  services/         # MIDI, audio, visualizer
  utils/            # Music theory, GM maps, config
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
