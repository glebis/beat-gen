# Beat-Gen Project Audit (February 10, 2026)

## Findings

### 1. `compose --pattern` is effectively broken

- `bin/beat-gen.js` defines `--pattern`, but `src/cli/commands/compose.js` does not use `options.pattern`.
- Result: inline examples can produce empty MIDI (`Tracks: 0`, `Notes: 0`).

### 2. MIDI timing model conflicts with loop/arrangement logic

- `src/cli/commands/wizard.js` expands `resolution` for repeats.
- `src/services/midi-service.js` assumes `resolution` is exactly one 4/4 bar for timing conversion.
- Repeated arrangements can be time-compressed in exported MIDI.

### 3. MIDI import quantization uses the wrong time basis

- `importFromMIDI` stores `note.time` (seconds), then quantizes via `time * ppq` as if it were ticks.
- This can mis-quantize imported rhythms depending on tempo.

### 4. Audio render timing is hard-coded to 16th-note steps

- `src/services/audio-renderer.js` assumes 4 steps/beat regardless of pattern resolution.
- Higher-resolution patterns (for example DnB at 64-step resolution) can render with incorrect timing/duration.

### 5. `--bit-depth` is wired as bitrate

- `audioBitrate("${bitDepth}k")` is used in renderer, which controls kbps, not PCM bit depth.
- `--bit-depth 16` currently implies very low bitrate, not 16-bit PCM.

### 6. Output-path defaults are inconsistent

- CLI default for `generate` is `./patterns/library` in `bin/beat-gen.js`.
- Generator command default is `./data/generated-patterns` in `src/cli/commands/generate.js`.
- Docs describe generated data under `data/`.

### 7. Some tests are not included in `npm test`

- `npm test` runs `test/**/*.test.js`.
- `tests/test-sample-naming.js` and `tests/test-elevenlabs-naming.js` are not included in that suite.

## Verified Test Status

- `npm test` currently passes: 38/38.

## Product Ideas to Develop

### 1. Harmonic pattern schema

- Extend pattern format with `key`, `scale`, `chords`, and `sections`.
- Keep drum tracks compatible while adding pitched tracks (`channel`, `instrument`, pitched `midiNote`).

### 2. Bass generation command

- Add `beat-gen bass`.
- Generate basslines constrained by kick rhythm and chord progression.
- Offer modes: `root`, `octave`, `walking`, `syncopated`.

### 3. Melody constructor

- Add `beat-gen melody`.
- Inputs: key, scale, chords, mood, density, phrase length.
- Output motif + variation (A/A'/B), including call/response or arpeggio mode.

### 4. Arrangement generator

- Add `beat-gen arrange` for intro/verse/chorus/fill/outro maps.
- Reuse variation engine outputs to construct full song forms.

### 5. Track structure image export

- Add `beat-gen visualize pattern.json --output structure.svg`.
- Render timeline lanes per track and section, with energy/density encoding.
- Start with SVG, then optionally support PNG export.

### 6. Stem export

- Add `render --stems` to export per-track WAV stems plus full mix.
- Useful once bass/melody tracks are introduced.

## Recommended Build Order

1. Fix timing/data-model consistency (`compose`, MIDI import/export, render timing).
2. Extend schema for pitched tracks and sections.
3. Implement bass generator.
4. Implement melody constructor.
5. Implement structure visualization (SVG first).
