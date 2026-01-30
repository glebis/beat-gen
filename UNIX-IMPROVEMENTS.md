# Unix Compliance Improvements

## Implemented Changes

### 1. Exit Codes (`src/utils/exit-codes.js`)

Standard BSD sysexits.h conventions:

```javascript
EXIT_CODES.SUCCESS      // 0 - Success
EXIT_CODES.ERROR        // 1 - General error
EXIT_CODES.USAGE        // 2 - Command usage error
EXIT_CODES.NOINPUT      // 66 - Cannot open input
EXIT_CODES.CANTCREAT    // 73 - Can't create output
EXIT_CODES.CONFIG       // 78 - Configuration error
// ... and more
```

**Benefits:**
- Scripts can detect specific error types
- Better automation and error handling
- Standard Unix conventions

### 2. Logger (`src/utils/logger.js`)

Proper stream separation:

```javascript
log.info()     // stdout, suppressed with --quiet
log.error()    // stderr, always shown
log.warn()     // stderr, suppressed with --quiet
log.verbose()  // stdout, only with --verbose
log.output()   // stdout, never suppressed (data output)
```

**Benefits:**
- Errors to stderr (proper Unix convention)
- Data to stdout (pipeable)
- Quiet mode for scripting
- Verbose mode for debugging

### 3. Stdio Utilities (`src/utils/stdio.js`)

Unix `-` convention for stdin/stdout:

```javascript
readInput('-')           // Read from stdin
writeOutput('-', data)   // Write to stdout
isPiped()               // Detect if running in pipeline
hasStdin()              // Check for stdin data
```

**Benefits:**
- Pipe support
- Scriptable workflows
- Composability

### 4. Unix-Compliant Commands

Example: `compose-unix.js`

```bash
# File to file
beat-gen compose pattern.txt -o output.mid

# Stdin to stdout
cat pattern.txt | beat-gen compose - > output.mid

# Quiet mode (scriptable)
beat-gen compose pattern.txt -q -o output.mid

# Verbose debugging
beat-gen compose pattern.txt -v -o output.mid

# JSON output to stdout
beat-gen compose pattern.txt --format json > pattern.json
```

## Usage Examples

### Composability

```bash
# Pipeline: generate pattern -> compose -> render
echo "kick: X...X...X...X..." | \
  beat-gen compose --bpm 120 --format json - | \
  jq '.tempo = 140' | \
  beat-gen render --samples 808 - > beat.wav

# Error handling
if ! beat-gen compose broken.txt -q 2>errors.log; then
  echo "Composition failed:"
  cat errors.log
  exit 1
fi
```

### Scripting

```bash
#!/bin/bash
# Generate multiple variations

for bpm in 80 95 110 120; do
  beat-gen compose pattern.txt \
    --bpm $bpm \
    --quiet \
    --output "beat-${bpm}.mid" || exit 1
done
```

### Error Codes

```bash
beat-gen compose missing.txt
echo $?  # 66 (NOINPUT)

beat-gen compose --invalid-flag
echo $?  # 2 (USAGE)

beat-gen compose pattern.txt -o /readonly/file.mid
echo $?  # 73 (CANTCREAT)
```

## Migration Plan

### Phase 1: Core Utilities (✓ Done)
- [x] Exit codes module
- [x] Logger with stderr/stdout separation
- [x] Stdio utilities (stdin/stdout)

### Phase 2: Command Updates (In Progress)
- [x] `compose` - Unix-compliant version
- [ ] `sample` - Add quiet mode, exit codes
- [ ] `render` - Add stdin support, quiet mode
- [ ] `import` - Add stdout support
- [ ] `export` - Add stdin/stdout

### Phase 3: CLI Flags
- [ ] Add `--quiet/-q` to all commands
- [ ] Add `--verbose/-v` to all commands
- [ ] Add short flags where missing (`-o`, `-f`, `-b`)
- [ ] Consistent flag naming across commands

### Phase 4: Advanced Features
- [ ] Signal handlers (SIGINT/SIGTERM cleanup)
- [ ] Config file support (`~/.beat-gen/config.json`)
- [ ] Shell completion (bash, zsh)
- [ ] Man pages

### Phase 5: Testing
- [ ] Unix compliance test suite
- [ ] Pipe/redirect tests
- [ ] Exit code tests
- [ ] Quiet/verbose mode tests

## Testing Unix Compliance

```bash
# Test stdin
echo "kick: X..." | beat-gen compose - -q > /dev/null
echo $?  # Should be 0

# Test stderr
beat-gen compose bad.txt 2>&1 >/dev/null | grep -q Error
echo $?  # Should be 0

# Test quiet mode
output=$(beat-gen compose pattern.txt -q 2>&1)
[ -z "$output" ] && echo "Quiet mode works"

# Test exit codes
beat-gen compose missing.txt >/dev/null 2>&1
[ $? -eq 66 ] && echo "NOINPUT code correct"

# Test piping
cat pattern.txt | beat-gen compose - --format json | jq -r '.tempo'
```

## Configuration Cascade

Future enhancement:

```
Priority (highest to lowest):
1. CLI flags        --bpm 120
2. Environment      BEAT_GEN_BPM=120
3. Project config   ./.beat-gen.json
4. User config      ~/.beat-gen/config.json
5. Defaults         120
```

Example `~/.beat-gen/config.json`:

```json
{
  "defaults": {
    "tempo": 120,
    "resolution": 16,
    "samplesDir": "~/Music/samples",
    "elevenLabsApiKey": "sk_..."
  },
  "presets": {
    "hiphop": { "tempo": 95, "swing": 0.5 },
    "techno": { "tempo": 135, "swing": 0 }
  }
}
```

## Unix Philosophy Compliance

### Do One Thing Well ✓
Each command has a focused purpose:
- `sample` - Generate samples
- `compose` - Create patterns
- `render` - Mix audio
- `import`/`export` - Convert formats

### Work Together ✓
Commands can be piped:
```bash
compose | render | normalize
```

### Handle Text Streams ✓
- Stdin/stdout support
- Text and JSON formats
- Pipeable data

### Fail Gracefully ✓
- Meaningful error messages
- Standard exit codes
- Errors to stderr

## Benefits Summary

**For Users:**
- Scriptable workflows
- Better error messages
- Integration with Unix tools (jq, grep, sed)

**For Developers:**
- Standard conventions
- Easier testing
- Better CI/CD integration

**For DevOps:**
- Automation-friendly
- Log parsing
- Monitoring and alerts
