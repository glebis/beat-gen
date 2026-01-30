# Unix Design Audit - Beat-Gen CLI

## Unix Philosophy Checklist

### ✓ Strengths

1. **Modularity** - Separate commands for distinct operations
2. **Text-based patterns** - Human-readable `.txt` format
3. **JSON for data** - Structured, parseable format
4. **Exit codes** - Uses process.exit() for errors
5. **Configuration** - Environment variable support (ELEVENLABS_API_KEY)

### ✗ Issues & Improvements Needed

#### 1. **Pipe/Stream Support** ✗
- **Issue**: No stdin/stdout support
- **Expected**: `cat pattern.txt | beat-gen compose - | beat-gen import -`
- **Fix**: Accept `-` for stdin, write to stdout when no output file

#### 2. **Verbose Output** ✗
- **Issue**: Always prints progress, no quiet mode
- **Expected**: `-q/--quiet` flag, only errors to stderr
- **Fix**: Add `--quiet`, `--verbose` flags

#### 3. **Exit Codes** ✗
- **Issue**: Uses `process.exit(1)` for all errors
- **Expected**: Semantic exit codes (0=success, 1=error, 2=usage, 127=not found)
- **Fix**: Define exit code constants

#### 4. **Error Output** ✗
- **Issue**: Errors go to stdout (colored)
- **Expected**: Errors to stderr, data to stdout
- **Fix**: Use `console.error()` for all errors

#### 5. **Composability** ✗
- **Issue**: Commands are isolated, can't pipe between them
- **Expected**: `beat-gen sample ... | beat-gen render -`
- **Fix**: Support streaming formats between commands

#### 6. **POSIX Flags** ✗
- **Issue**: Long flags only (`--output`), no short versions
- **Expected**: `-o` and `--output`
- **Fix**: Already has some, audit all commands

#### 7. **Configuration Priority** ✗
- **Issue**: Only env vars, no config file cascade
- **Expected**: CLI flags > env vars > config file > defaults
- **Fix**: Add `~/.beat-gen/config.json` support

#### 8. **Man Pages** ✗
- **Issue**: No man pages
- **Expected**: `man beat-gen`, `man beat-gen-sample`
- **Fix**: Generate from help text or create manual pages

#### 9. **Signal Handling** ✗
- **Issue**: No SIGINT/SIGTERM handling
- **Expected**: Clean up temp files on interrupt
- **Fix**: Add signal handlers

#### 10. **Single Responsibility** ⚠️
- **Issue**: `render` command does too much (loading + mixing + encoding)
- **Expected**: Separate tools that compose
- **Fix**: Consider splitting into smaller utilities

## Recommended Improvements

### Priority 1: Critical Unix Compliance

```bash
# 1. Stdin/Stdout support
cat pattern.txt | beat-gen compose --bpm 120 > pattern.json
beat-gen render pattern.json --samples 808 > beat.wav

# 2. Quiet mode
beat-gen sample "kick" -q  # No progress output

# 3. Proper error handling
beat-gen render missing.json 2> errors.log
echo $?  # Should return meaningful code

# 4. Errors to stderr
beat-gen compose bad.txt 2>&1 >/dev/null | grep Error
```

### Priority 2: Composability

```bash
# Pipeline support
beat-gen import beat.mid | \
  beat-gen compose --bpm 140 - | \
  beat-gen render --samples 808 - > final.wav

# JSON transformation
beat-gen compose pattern.txt | jq '.tempo = 150' | beat-gen render -

# Filter/transform patterns
beat-gen list-patterns | grep trap | xargs beat-gen render
```

### Priority 3: Configuration

```bash
# Config file cascade
~/.beat-gen/config.json  # User defaults
./.beat-gen.json         # Project config
--config custom.json     # Explicit config

# Priority: CLI > env > project > user > defaults
```

### Priority 4: Tool Philosophy

Consider splitting into focused utilities:
- `beat-sample` - Generate samples only
- `beat-compose` - Pattern to MIDI only
- `beat-render` - MIDI + samples to audio
- `beat-convert` - Format conversion

## Exit Code Standards

```javascript
const EXIT_CODES = {
  SUCCESS: 0,
  ERROR: 1,
  USAGE: 2,
  NOINPUT: 66,
  CANTCREAT: 73,
  IOERR: 74,
  TEMPFAIL: 75,
  UNAVAILABLE: 69,
  SOFTWARE: 70,
};
```

## Implementation Plan

1. Add stdin/stdout support to all commands
2. Separate data output from progress/logging
3. Add --quiet and --verbose flags
4. Use semantic exit codes
5. Send errors to stderr
6. Add signal handlers for cleanup
7. Support config file cascade
8. Create man pages
9. Add shell completion
10. Write POSIX compliance tests

## Examples of Good Unix CLIs

- `ffmpeg` - Rich options, pipe support, progress to stderr
- `jq` - Stdin/stdout, composable filters
- `git` - Subcommands, config cascade, excellent help
- `curl` - Silent mode, error codes, scriptable
