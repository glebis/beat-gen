# Beat-Gen Demo - Generate Real AI Samples

## Current Status

✓ **beat.wav created** - demo using synthetic test samples
✗ **Real 11Labs samples** - need API key

## Generate Real 11Labs Drum Samples

### 1. Get 11Labs API Key

Sign up at https://elevenlabs.io (free tier: 10,000 chars/month)

### 2. Set API Key

```bash
export ELEVENLABS_API_KEY=your_api_key_here

# Or add to ~/.bashrc or ~/.zshrc for persistence:
echo 'export ELEVENLABS_API_KEY=your_api_key_here' >> ~/.bashrc
source ~/.bashrc
```

### 3. Generate Real Drum Kit

```bash
cd beat-gen

# Generate 808 kit with real AI samples
beat-gen sample --kit 808 --output samples/808

# This will create:
# samples/808/808-kick-drum-deep-bass-punch.mp3
# samples/808/808-snare-drum-crisp-snap.mp3
# samples/808/808-closed-hi-hat-tight-metallic.mp3
# ... and more
```

### 4. Render Beat with Real Samples

```bash
# Render using AI-generated samples
beat-gen render patterns/demo-basic.json --samples samples/808 --output beat-real.wav
```

## Current Demo Files

**Test samples** (synthetic sine waves):
```
samples/test/
├── kick.wav    (60 Hz sine)
├── snare.wav   (200 Hz sine)
├── hihat.wav   (8000 Hz sine)
└── crash.wav   (1000 Hz sine)
```

**Demo beat:**
- `beat.wav` - rendered with test samples (you can play this!)
- `beat.mid` - MIDI version (if generated)

## Play Demo Beat

```bash
cd beat-gen

# macOS
afplay beat.wav

# Linux
aplay beat.wav

# Or open in any audio player
open beat.wav
```

## Custom Samples

You can also generate specific drum sounds:

```bash
# Individual samples
beat-gen sample "deep 808 kick" "vinyl crackle snare" "dusty hi-hat"

# Custom prompts
beat-gen sample \
  "dark industrial kick drum" \
  "metallic snare with reverb" \
  "analog closed hi-hat"
```

## Compare: Synthetic vs AI Samples

**Current (test samples):**
- Simple sine waves
- Clinical/boring sound
- Good for testing

**With 11Labs API:**
- Rich, realistic drum samples
- Custom textures and character
- Production-ready quality

## Next Steps

1. **Get API key** from elevenlabs.io
2. **Generate real samples**: `beat-gen sample --kit 808`
3. **Re-render beat**: `beat-gen render patterns/demo-basic.json --samples samples/808 -o beat-real.wav`
4. **Compare** test vs real samples!
