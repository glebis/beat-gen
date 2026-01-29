# Beat-Gen Quick Start

## Installation

```bash
# Clone or download the project, then:
cd beat-gen
npm install
npm link
```

Now `beat-gen` is available globally.

## 5-Minute Tutorial

### 1. Create Your First Beat (No API Key Required)

```bash
# Create a simple beat pattern
cat > my-first-beat.txt << 'EOF'
kick:  X...X...X...X...
snare: ....X.......X...
hihat: X.X.X.X.X.X.X.X.
EOF

# Convert to MIDI
beat-gen compose my-first-beat.txt --bpm 120 --output my-beat.mid
```

✅ **Result:** `my-beat.mid` ready to load in any DAW or hardware sampler!

### 2. Try Different Patterns

```bash
# Hip-hop groove
beat-gen compose patterns/example-hiphop.txt --bpm 95 --output hiphop.mid

# Advanced pattern with JSON
beat-gen compose patterns/example-advanced.json --output advanced.mid
```

### 3. Add Swing

```bash
# Apply 50% swing for groove
beat-gen compose patterns/example-basic.txt --swing 0.5 --bpm 100 --output groovy.mid
```

### 4. Import Existing MIDI

```bash
# Convert MIDI to editable pattern
beat-gen import my-beat.mid --format json

# Edit the JSON, then export back
beat-gen export my-beat.json --format midi --output edited.mid
```

## Generate AI Samples (Requires 11Labs API Key)

### Get API Key

1. Sign up at https://elevenlabs.io (free tier: 10,000 chars/month)
2. Get your API key from dashboard
3. Set environment variable:

```bash
export ELEVENLABS_API_KEY=your_key_here
# Add to ~/.bashrc or ~/.zshrc for persistence
```

### Generate Samples

```bash
# Single sample
beat-gen sample "808 kick drum"

# Multiple samples
beat-gen sample "tight snare" "closed hi-hat" "crash cymbal"

# Entire drum kit
beat-gen sample --kit 808
beat-gen sample --kit acoustic
beat-gen sample --kit electronic
```

## Pattern Notation Cheat Sheet

### Text Format

```
# X = loud hit (100)
# x = soft hit (60)
# . = rest
# 1-9 = velocity (1=10, 9=90)

kick:  X...X...X...X...  # On the quarters
snare: ....X.......X...  # Backbeat
hihat: x.X.x.X.x.X.x.X.  # Alternating velocities
```

### Drum Names

Common drums:
- `kick`, `snare`, `hihat`, `hihat-open`
- `clap`, `rimshot`, `crash`, `ride`
- `tom1`, `tom2`, `tom3`, `cowbell`

See `src/utils/gm-drum-map.js` for complete list.

## Use with Hardware Sampler (Yamaha, MPC, etc.)

1. **Generate samples**: `beat-gen sample --kit 808`
2. **Create MIDI pattern**: `beat-gen compose pattern.txt --output beat.mid`
3. **Load samples** into your sampler
4. **Import MIDI** via USB/SD card
5. **Play!**

## Tips

- **Start simple**: Use text patterns for quick sketching
- **Use JSON** for precise velocity and timing control
- **Test patterns** before generating samples (MIDI works without API key)
- **Swing values**: 0 = straight, 0.33 = light swing, 0.5 = moderate, 0.66 = heavy shuffle
- **BPM ranges**: Hip-hop (80-100), House (120-130), Techno (130-150), DnB (160-180)

## Next Steps

- Explore example patterns in `patterns/`
- Read full docs in `README.md`
- Check GM drum map for all available drums
- Combine with your DAW for production

## Troubleshooting

**"11Labs API key required"**
```bash
export ELEVENLABS_API_KEY=your_key
```

**"Unknown drum: xyz"**
- Check `src/utils/gm-drum-map.js` for valid drum names
- Use GM-compatible names (kick, snare, hihat, etc.)

**"Module not found"**
```bash
npm install
```

**MIDI not importing**
- Ensure MIDI file uses Channel 10 (standard drum channel)
- Try: `beat-gen import file.mid --format text` to debug
