# Beat-Gen

CLI drum machine with AI sample generation and MIDI export. Generate drum samples using 11Labs AI, compose beats with simple text notation, and export to MIDI for use in any DAW or hardware sampler (like Yamaha).

## Features

- 🎵 **AI Sample Generation** - Generate drum samples using 11Labs text-to-sound API
- 🎹 **MIDI Export** - Full General MIDI drum mapping (Channel 10) for universal DAW compatibility
- 📝 **Simple Text Notation** - Write beats in intuitive X...X... format
- 🎼 **JSON Patterns** - Structured pattern format with velocity and timing control
- 🔄 **MIDI Import** - Load existing MIDI files and convert to editable patterns
- 🎶 **Swing/Shuffle** - Apply groove to patterns
- 🥁 **Preset Drum Kits** - Generate 808, acoustic, or electronic kits

## Installation

```bash
npm install -g beat-gen

# Or run locally
cd beat-gen
npm install
npm link
```

## Quick Start

### 1. Generate Samples

```bash
# Set your 11Labs API key
export ELEVENLABS_API_KEY=your_api_key_here

# Generate single sample
beat-gen sample "808 kick drum"

# Generate multiple samples
beat-gen sample "tight snare" "closed hi-hat" "open hi-hat"

# Generate preset drum kit
beat-gen sample --kit 808
beat-gen sample --kit acoustic
beat-gen sample --kit electronic
```

### 2. Compose Beats

```bash
# Create beat from text pattern file
beat-gen compose patterns/example-basic.txt --bpm 120 --output my-beat.mid

# Create beat with inline pattern
beat-gen compose --pattern "kick: X...X...X...X...
snare: ....X.......X...
hihat: ..X...X...X...X." --bpm 140

# Apply swing
beat-gen compose pattern.txt --swing 0.5 --bpm 95

# Use JSON pattern for advanced control
beat-gen compose patterns/example-advanced.json --output beat.mid
```

### 3. Import/Export

```bash
# Import MIDI file to JSON
beat-gen import your-beat.mid --format json

# Import MIDI to text notation
beat-gen import your-beat.mid --format text

# Export JSON pattern to MIDI
beat-gen export pattern.json --format midi --output beat.mid

# Export JSON to text notation
beat-gen export pattern.json --format text
```

### 4. Render to WAV (Requires FFmpeg)

```bash
# Render pattern with generated samples to final WAV file
beat-gen render pattern.json --samples ./samples/808/ --output beat.wav

# Custom sample rate and format
beat-gen render pattern.json --samples ./samples/ --sample-rate 48000 --output beat.wav
```

**Requirements:**
- FFmpeg must be installed (`brew install ffmpeg` on macOS)
- Samples must match drum names in pattern (kick.wav, snare.wav, etc.)
- Supports MP3, WAV, OGG input samples

## Pattern Notation

### Text Format

Simple, human-readable notation for quick beat creation:

```
# X = hit (velocity 100)
# x = soft hit (velocity 60)
# . = rest
# 1-9 = custom velocity (1=10, 9=90)

kick:  X...X...X...X...
snare: ....X.......X...
hihat: x.x.x.x.x.x.x.x.
clap:  ....X.......X...
```

**Supported drum names:**
- Bass: `kick`, `bass`, `bd`
- Snares: `snare`, `sn`, `sd`, `rimshot`, `clap`
- Hi-hats: `hihat`, `hh`, `ch`, `hihat-open`, `oh`, `hihat-pedal`, `ph`
- Toms: `tom1`, `tom2`, `tom3`, `tom-high`, `tom-mid`, `tom-low`
- Cymbals: `crash`, `crash2`, `ride`, `ride2`, `china`, `splash`
- Percussion: `cowbell`, `tambourine`, `shaker`, `conga-high`, `conga-low`

Full GM drum map in `src/utils/gm-drum-map.js`

### JSON Format

Structured format with full control over velocity and timing:

```json
{
  "version": "1.0",
  "tempo": 120,
  "timeSignature": "4/4",
  "resolution": 16,
  "swing": 0,
  "tracks": [
    {
      "name": "kick",
      "midiNote": 36,
      "pattern": [
        { "step": 0, "velocity": 100 },
        { "step": 4, "velocity": 100 }
      ]
    }
  ]
}
```

## MIDI Compatibility

Beat-Gen exports **Standard MIDI Format 1** files with:
- **Channel 10** for drums (General MIDI standard)
- **Standard GM drum mapping** (Kick=36, Snare=38, Hi-hat=42, etc.)
- Compatible with all major DAWs:
  - Ableton Live
  - FL Studio
  - Logic Pro
  - Pro Tools
  - Reaper
  - Studio One
  - Hardware samplers (Yamaha, Akai MPC, etc.)

## CLI Reference

### Sample Command

```bash
beat-gen sample [prompts...] [options]

Options:
  -k, --kit <name>        Generate preset kit (808, acoustic, electronic)
  -o, --output <dir>      Output directory (default: ./samples)
  -d, --duration <sec>    Sample duration (default: 2)
  -i, --influence <val>   Prompt influence 0-1 (default: 0.5)
  --api-key <key>         11Labs API key
```

### Compose Command

```bash
beat-gen compose [pattern] [options]

Options:
  -b, --bpm <tempo>           Tempo in BPM (default: 120)
  -t, --time-signature <sig>  Time signature (default: 4/4)
  -s, --swing <amount>        Swing amount 0-1 (default: 0)
  -r, --resolution <steps>    Steps per pattern (default: 16)
  -o, --output <file>         Output MIDI file (default: output.mid)
  -p, --pattern <text>        Inline text pattern
```

### Export Command

```bash
beat-gen export <input> [options]

Options:
  -f, --format <format>  Output format (midi, text)
  -o, --output <file>    Output file
```

### Import Command

```bash
beat-gen import <midiFile> [options]

Options:
  -f, --format <format>  Output format (json, text)
  -o, --output <file>    Output file
```

### Render Command

```bash
beat-gen render <pattern> [options]

Options:
  -s, --samples <dir>      Samples directory (default: ./samples)
  -o, --output <file>      Output WAV file (default: output.wav)
  --sample-rate <rate>     Sample rate in Hz (default: 44100)
  --bit-depth <bits>       Bit depth (default: 16)
  --format <format>        Output format (default: wav)
```

**Requirements:** FFmpeg must be installed

## Examples

### Generate 808 Kit and Compose Beat

```bash
# 1. Generate samples
beat-gen sample --kit 808 --output samples/808

# 2. Create pattern file
cat > my-beat.txt << 'EOF'
kick:  X.....X.X.....X.
snare: ....X.......X...
hihat: X.X.X.X.X.X.X.X.
EOF

# 3. Compose MIDI
beat-gen compose my-beat.txt --bpm 95 --swing 0.5 --output my-beat.mid

# 4. Render to WAV
beat-gen render my-beat.json --samples samples/808 --output my-beat.wav
```

### Complete Production Workflow

```bash
# 1. Generate AI samples
export ELEVENLABS_API_KEY=your_key_here
beat-gen sample --kit 808 --output samples/808

# 2. Create pattern (text or JSON)
cat > trip-hop.txt << 'EOF'
kick:  X.....X...X.....
snare: ......X.........X
hihat: ..x.....x...x....
EOF

# 3. Compose to MIDI (for DAW)
beat-gen compose trip-hop.txt --bpm 88 --swing 0.5 --output trip-hop.mid

# 4. Also render to WAV (for preview/sharing)
beat-gen compose trip-hop.txt --bpm 88 --output trip-hop.json
beat-gen render trip-hop.json --samples samples/808 --output trip-hop.wav
```

### Advanced Pattern with Velocity Control

```json
{
  "tempo": 140,
  "resolution": 16,
  "tracks": [
    {
      "name": "kick",
      "midiNote": 36,
      "pattern": [
        { "step": 0, "velocity": 127 },
        { "step": 6, "velocity": 80 },
        { "step": 10, "velocity": 100 }
      ]
    }
  ]
}
```

### Convert Between Formats

```bash
# MIDI → JSON → Text → MIDI
beat-gen import beat.mid --format json --output beat.json
beat-gen export beat.json --format text --output beat.txt
# Edit beat.txt...
beat-gen compose beat.txt --output beat-edited.mid
```

## Hardware Sampler Workflow

For Yamaha and other hardware samplers:

1. **Generate samples** in WAV format
2. **Compose MIDI pattern** with beat-gen
3. **Load samples** into your sampler
4. **Import MIDI file** to trigger samples

```bash
# Generate samples
beat-gen sample --kit 808

# Compose beat
beat-gen compose pattern.txt --bpm 120 --output beat.mid

# Transfer beat.mid to your sampler via USB/SD card
```

## 11Labs API

Get your API key at: https://elevenlabs.io

Free tier includes 10,000 characters/month (approx. 100-200 samples).

```bash
# Set API key (add to ~/.bashrc or ~/.zshrc)
export ELEVENLABS_API_KEY=your_api_key_here

# Or pass with each command
beat-gen sample "kick" --api-key your_api_key_here
```

## Technical Details

### Project Structure

```
beat-gen/
├── bin/
│   └── beat-gen.js              # CLI entry point
├── src/
│   ├── cli/commands/            # Command implementations
│   │   ├── sample.js            # AI sample generation
│   │   ├── compose.js           # Pattern to MIDI
│   │   ├── export.js            # JSON to MIDI/text
│   │   ├── import.js            # MIDI to JSON/text
│   │   └── render.js            # WAV rendering
│   ├── core/
│   │   └── pattern-parser.js    # Pattern parsing & swing
│   ├── services/
│   │   ├── midi-service.js      # MIDI read/write
│   │   ├── elevenlabs-service.js # 11Labs API
│   │   └── audio-renderer.js    # FFmpeg mixing
│   └── utils/
│       └── gm-drum-map.js       # GM drum mapping
├── patterns/                     # Example patterns
├── CLAUDE.md                     # Development guide
└── package.json
```

### Architecture

- **Pattern Parser** - Text and JSON notation support
- **GM Drum Mapper** - Standard MIDI note mapping
- **Timing Engine** - Quantization and swing processing
- **MIDI Engine** - SMF Format 1 export using @tonejs/midi
- **11Labs Integration** - AI sample generation

### File Formats

- **Text patterns**: `.txt`, `.pattern`
- **JSON patterns**: `.json`
- **MIDI files**: `.mid`, `.midi`
- **Samples**: `.mp3` (from 11Labs), `.wav` (for conversion)

### Dependencies

- `commander` - CLI framework
- `@tonejs/midi` - MIDI file handling
- `chalk` - Terminal styling
- `node-fetch` - HTTP requests

## License

MIT

## Contributing

Issues and PRs welcome at: https://github.com/glebis/beat-gen
