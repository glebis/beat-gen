# CLAUDE.md - Development Context for Beat-Gen

## Project Overview

Beat-Gen is a Node.js CLI drum machine that generates drum samples using 11Labs AI, composes beats with text/JSON notation, and exports to MIDI for DAWs and hardware samplers.

## Project Structure

```
beat-gen/
├── bin/
│   └── beat-gen.js              # CLI entry point (Commander setup)
├── src/
│   ├── cli/
│   │   └── commands/
│   │       ├── sample.js        # AI sample generation via 11Labs
│   │       ├── compose.js       # Pattern to MIDI conversion
│   │       ├── export.js        # JSON to MIDI/text export
│   │       ├── import.js        # MIDI to JSON/text import
│   │       └── render.js        # WAV rendering with FFmpeg
│   ├── core/
│   │   └── pattern-parser.js    # Text/JSON pattern parsing, swing
│   ├── services/
│   │   ├── midi-service.js      # MIDI read/write (@tonejs/midi)
│   │   ├── elevenlabs-service.js # 11Labs API integration
│   │   └── audio-renderer.js    # FFmpeg audio mixing
│   └── utils/
│       └── gm-drum-map.js       # GM drum name to MIDI note mapping
├── patterns/                     # Example pattern files (.txt, .json)
├── README.md                     # Full documentation
├── QUICKSTART.md                 # Getting started guide
├── DEMO.md                       # Demo instructions
├── WORKFLOW.md                   # Production workflow guide
├── config.example.json           # Configuration template
└── package.json                  # Dependencies and scripts
```

## Key Commands

```bash
# Development
npm install          # Install dependencies
npm link             # Make CLI available globally

# CLI usage
beat-gen sample      # Generate AI drum samples
beat-gen compose     # Create MIDI from patterns
beat-gen export      # Convert JSON to MIDI/text
beat-gen import      # Convert MIDI to JSON/text
beat-gen render      # Render pattern to WAV (requires FFmpeg)
```

## Architecture

### Data Flow
```
User Input (CLI)
    ↓
Command Handler (src/cli/commands/*.js)
    ↓
Parser/Service (pattern-parser.js, *-service.js)
    ↓
Output (MIDI, WAV, samples, patterns)
```

### Key Design Patterns
- **Modular architecture**: Separation of concerns (cli, core, services, utils)
- **Command pattern**: Each CLI command is an independent async function
- **ES6 modules**: Native JavaScript modules (`"type": "module"`)

## Technology Stack

| Package | Version | Purpose |
|---------|---------|---------|
| commander | ^14.0.2 | CLI framework |
| chalk | ^5.6.2 | Terminal colors |
| @tonejs/midi | ^2.0.28 | MIDI file handling |
| node-fetch | ^3.3.2 | HTTP requests (11Labs API) |
| fluent-ffmpeg | ^2.1.3 | Audio rendering |
| audiobuffer-to-wav | ^1.0.0 | WAV conversion |

**External requirement**: FFmpeg (for `render` command)

## Pattern Formats

### Text Notation
```
kick:  X...X...X...X...
snare: ....X.......X...
hihat: x.x.x.x.x.x.x.x.
```
- `X` = hit (velocity 100), `x` = soft (60), `.` = rest, `1-9` = custom velocity

### JSON Format
```json
{
  "tempo": 120,
  "resolution": 16,
  "tracks": [
    { "name": "kick", "midiNote": 36, "pattern": [{"step": 0, "velocity": 100}] }
  ]
}
```

## MIDI Standards

- **Format**: SMF Format 1
- **Drum channel**: Channel 10 (GM standard)
- **Note mapping**: General MIDI drum map (Kick=36, Snare=38, Hi-hat=42, etc.)
- **Full map**: `src/utils/gm-drum-map.js`

## Development Guidelines

### Adding New Commands
1. Create handler in `src/cli/commands/`
2. Register in `bin/beat-gen.js` with Commander
3. Follow existing command structure (async function, options validation)

### Adding New Drum Mappings
1. Edit `src/utils/gm-drum-map.js`
2. Add to `GM_DRUM_MAP` with correct MIDI note number
3. Add aliases to `getDrumNote()` if needed

### Pattern Parser Extensions
1. Edit `src/core/pattern-parser.js`
2. `parseTextPattern()` for text notation changes
3. `parseJsonPattern()` for JSON format changes

## Testing Patterns

```bash
# Test MIDI export (no API key needed)
beat-gen compose patterns/example-basic.txt --bpm 120 --output test.mid

# Test pattern parsing
beat-gen import test.mid --format json
beat-gen export pattern.json --format text
```

## Environment Variables

```bash
ELEVENLABS_API_KEY    # Required for sample generation
```

## Common Issues

- **"Unknown drum"**: Check drum name exists in `gm-drum-map.js`
- **"FFmpeg not found"**: Install FFmpeg (`brew install ffmpeg` / `apt install ffmpeg`)
- **"API key required"**: Set `ELEVENLABS_API_KEY` environment variable
- **MIDI not importing**: Ensure source uses Channel 10 (drum channel)
