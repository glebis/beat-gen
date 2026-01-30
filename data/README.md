# Data Directory Structure

This directory contains all runtime data, generated files, and examples that should not be committed to source control.

## Directory Layout

```
data/
├── generated-patterns/    # Auto-generated pattern libraries (gitignored)
│   ├── trip-hop/
│   ├── idm/
│   ├── dnb/
│   ├── house/
│   ├── breakbeat/
│   ├── uk-garage/
│   ├── techno/
│   └── ostinato/
├── example-patterns/      # Template patterns for learning (committed)
│   ├── *.txt             # Text format examples
│   └── json/             # JSON format examples
├── demo-patterns/         # Hand-crafted demo patterns (committed)
├── audio-samples/         # Generated/test audio files (gitignored)
└── output/                # CLI output files (gitignored)
```

## Generated Patterns

The `generated-patterns/` folder contains pattern libraries created by:
```bash
beat generate <genre> --count 5 --variations
```

These files are gitignored because they can be regenerated on demand.

## Example Patterns

The `example-patterns/` folder contains:
- Text format examples (`.txt`) - Human-readable pattern notation
- JSON format examples - Structured pattern data

These serve as templates and learning resources.

## Demo Patterns

Hand-crafted patterns for testing and demonstration:
- amen-break.json
- broken-beat-80.json
- broken-beat-95.json
- trip-hop-atmospheric.json
- trip-hop-dirty-85.json
- demo-basic.json
- demo-looped.json

## Audio Samples

Generated WAV/MIDI files from pattern playback. Gitignored to keep repo size small.

## Output

Default location for CLI output files. Gitignored.
