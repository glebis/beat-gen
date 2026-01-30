# Project Structure

Clean organization separating source code, generated data, and configuration.

## Directory Layout

```
beat-gen/
├── src/                    # Source code (committed)
│   ├── cli/               # Command-line interface
│   ├── core/              # Core pattern parsing/rendering
│   ├── generators/        # Pattern generation logic
│   ├── services/          # Audio services
│   └── utils/             # Utilities
├── data/                   # Runtime data (mostly gitignored)
│   ├── generated-patterns/    # Auto-generated (gitignored)
│   ├── example-patterns/      # Templates (committed)
│   ├── demo-patterns/         # Hand-crafted demos (committed)
│   ├── audio-samples/         # Generated audio (gitignored)
│   └── output/                # CLI output (gitignored)
├── patterns/               # DEPRECATED - kept for compatibility
├── samples/                # User sample packs (gitignored)
├── bin/                    # Executables
├── completions/            # Shell completions
├── node_modules/           # Dependencies (gitignored)
└── docs/                   # Documentation
```

## Key Principles

### Source vs Data Separation
- **src/** contains code only - committed to git
- **data/** contains generated/runtime files - mostly gitignored
- Generated patterns can be recreated with `beat generate`

### Pattern Organization
- **generated-patterns/** - Created by pattern generators
- **example-patterns/** - Learning templates (text + JSON)
- **demo-patterns/** - Hand-crafted showcase patterns

### Audio Files
- Sample packs in **samples/** (gitignored)
- Generated audio in **data/audio-samples/** (gitignored)
- Keeps repository size small

## What's Committed vs Gitignored

### Committed
- All source code (src/)
- Example patterns (data/example-patterns/)
- Demo patterns (data/demo-patterns/)
- Configuration templates (config.example.json)
- Documentation

### Gitignored
- Generated patterns (data/generated-patterns/)
- Audio files (*.wav, *.mid, *.mp3)
- Sample packs (samples/)
- Node modules
- Build artifacts
- Output files

## Migration from Old Structure

Old location → New location:
- `patterns/library/` → `data/generated-patterns/`
- `patterns/*.json` → `data/demo-patterns/`
- `patterns/*.txt` → `data/example-patterns/`
- Root `*.wav`, `*.mid` → `data/audio-samples/`

The old `patterns/` directory is deprecated but kept for backward compatibility.
