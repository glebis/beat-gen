# Unix Best Practices - Audit & Refactor Summary

## Audit Completed ✓

Analyzed beat-gen CLI against Unix philosophy and best practices.

### Key Findings

**Strengths:**
- Modular command structure
- Text-based patterns
- Environment variable support
- Separate commands for distinct operations

**Issues Found:**
- ❌ No stdin/stdout support (can't pipe)
- ❌ Progress output mixes with data (stdout pollution)
- ❌ Errors go to stdout instead of stderr
- ❌ No quiet mode for scripting
- ❌ Generic exit codes (always 1)
- ❌ No signal handlers
- ❌ Limited composability

## Unix Utilities Created ✓

### 1. Exit Codes (`src/utils/exit-codes.js`)

Standard BSD exit codes:
```javascript
EXIT_CODES.SUCCESS     // 0
EXIT_CODES.USAGE       // 2
EXIT_CODES.NOINPUT     // 66
EXIT_CODES.CANTCREAT   // 73
EXIT_CODES.CONFIG      // 78
```

**Benefits:**
- Scripts can detect error types
- Standard Unix conventions
- Better automation

### 2. Logger (`src/utils/logger.js`)

Proper stream separation:
```javascript
log.info()      // stdout (suppressed with -q)
log.error()     // stderr (always shown)
log.verbose()   // stdout (only with -v)
log.output()    // stdout (never suppressed)
```

**Benefits:**
- Errors to stderr
- Data to stdout (pipeable)
- Quiet/verbose modes

### 3. Stdio (`src/utils/stdio.js`)

Unix `-` convention:
```javascript
readInput('-')           // stdin
writeOutput('-', data)   // stdout
isPiped()               // detect pipeline
```

**Benefits:**
- Pipe support
- Composability
- Standard conventions

### 4. Reference Implementation

Created `compose-unix.js` demonstrating:
- ✅ Stdin/stdout support
- ✅ Quiet/verbose flags
- ✅ Proper exit codes
- ✅ Stderr for errors
- ✅ Pipeable output

## Integration Roadmap

### Phase 1: Core (Completed ✓)
- [x] Exit codes module
- [x] Logger with stream separation
- [x] Stdio utilities
- [x] Unix-compliant compose command
- [x] Test suite
- [x] Documentation

### Phase 2: Command Migration (Next)

Update existing commands to use new utilities:

**compose.js** → Use compose-unix.js pattern
**sample.js** → Add -q, -v, exit codes
**render.js** → Add stdin, -q, -v
**import.js** → Add stdout support
**export.js** → Add stdin/stdout

### Phase 3: CLI Enhancements

**Add missing flags:**
```bash
-q, --quiet      # Suppress non-essential output
-v, --verbose    # Show debug information
-o, --output     # Already exists, ensure consistent
-f, --format     # Already exists
```

**Signal handling:**
```javascript
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
```

**Config cascade:**
```
CLI > ENV > ~/.beat-gen/config.json > defaults
```

### Phase 4: Advanced

- Man pages (`man beat-gen`)
- Shell completion (bash/zsh)
- Integration tests
- CI/CD examples

## Usage Examples

### Before (Current)

```bash
# Can't pipe
beat-gen compose pattern.txt --output beat.mid
# Always verbose output
# Errors to stdout (mixed with data)
# Exit code always 1
```

### After (Unix-Compliant)

```bash
# Pipe support
cat pattern.txt | beat-gen compose - > beat.mid

# Quiet for scripts
beat-gen compose pattern.txt -q -o beat.mid

# Composability
beat-gen compose pattern.txt --format json | \
  jq '.tempo = 140' | \
  beat-gen render --samples 808 - > beat.wav

# Error handling
if ! beat-gen compose pattern.txt 2>errors.log; then
  echo "Failed with code $?"
  cat errors.log >&2
  exit 1
fi

# Verbose debugging
beat-gen compose pattern.txt -v -o beat.mid
```

## Testing

Run compliance tests:
```bash
./test-unix-compliance.sh
```

Current status: **Utilities ready, integration pending**

Tests will pass after integrating new utilities into main commands.

## Benefits

**Scripting:**
- Pipe into jq, grep, sed
- Automation-friendly
- Silent mode for cron jobs

**Error Handling:**
- Specific exit codes
- Errors to stderr (log parsing)
- Meaningful error messages

**Composability:**
- Chain commands
- Unix pipeline philosophy
- Integration with other tools

**Standards:**
- POSIX compliance
- BSD conventions
- Industry best practices

## Next Steps

1. **Integrate utilities** into existing commands
2. **Add flags** (-q, -v) to all commands
3. **Update bin/beat-gen.js** to use new compose command
4. **Run tests** to verify compliance
5. **Document** Unix features in README
6. **Commit** Unix improvements

## Files Created

```
UNIX-AUDIT.md              # Audit findings
UNIX-IMPROVEMENTS.md       # Implementation details
UNIX-REFACTOR-SUMMARY.md   # This file
src/utils/exit-codes.js    # Exit code constants
src/utils/logger.js        # Stream-aware logger
src/utils/stdio.js         # Stdin/stdout handling
src/cli/commands/compose-unix.js  # Reference implementation
test-unix-compliance.sh    # Test suite
```

## Philosophy Alignment

| Principle | Status |
|-----------|--------|
| Do one thing well | ✅ Focused commands |
| Work together | 🔄 Pending (pipes) |
| Text streams | 🔄 Pending (stdin/stdout) |
| Fail gracefully | ✅ Error messages, 🔄 exit codes |
| Silent success | 🔄 Pending (-q flag) |
| Small is beautiful | ✅ Modular design |

🔄 = In progress, utilities ready
✅ = Complete

## Recommendation

**Option A: Full Integration (Recommended)**
- Migrate all commands to Unix utilities
- Update CLI entry point
- Run full test suite
- Update documentation

**Option B: Gradual Migration**
- Keep current commands
- Add `-unix` variants
- Transition over time
- Maintain compatibility

**Recommendation:** Option A for cleaner codebase and immediate benefits.
