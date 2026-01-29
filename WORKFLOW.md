# Beat-Gen Complete Workflow

## Full Production Pipeline

```bash
# 1. Generate drum samples with 11Labs AI
export ELEVENLABS_API_KEY=your_api_key_here
beat-gen sample --kit 808 --output samples/808

# 2. Create beat pattern (text or JSON)
cat > my-beat.txt << 'EOF'
kick:  X...X...X...X...
snare: ....X.......X...
hihat: X.X.X.X.X.X.X.X.
EOF

# 3. Generate MIDI for DAW
beat-gen compose my-beat.txt --bpm 120 --output my-beat.mid

# 4. Render final WAV with AI samples
beat-gen compose my-beat.txt --output my-beat.json
beat-gen render my-beat.json --samples samples/808 --output my-beat.wav
```

## Output Files

- **`my-beat.mid`** → Load in Ableton, FL Studio, Logic, hardware sampler
- **`my-beat.wav`** → Final audio ready for sharing, preview, or mixing
- **`my-beat.json`** → Editable pattern with full control

## What Each Command Does

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `sample` | Text prompts | MP3/WAV samples | Generate drum sounds with AI |
| `compose` | Pattern file | MIDI file | Create sequenced pattern |
| `render` | Pattern + samples | WAV audio | Bounce to final audio |
| `import` | MIDI file | JSON/text pattern | Edit existing MIDI |
| `export` | JSON pattern | MIDI/text | Convert formats |

## Quick Examples

### Trip-Hop Beat
```bash
beat-gen sample --kit 808
cat > trip-hop.txt << 'EOF'
kick:  X.....X...X.....
snare: ......X.........X
hihat: ..x.....x...x....
EOF
beat-gen compose trip-hop.txt --bpm 88 --swing 0.5 -o trip-hop.mid
```

### House Beat
```bash
beat-gen sample --kit electronic
cat > house.txt << 'EOF'
kick:  X...X...X...X...
hihat: X.X.X.X.X.X.X.X.
clap:  ....X.......X...
EOF
beat-gen compose house.txt --bpm 128 -o house.mid
```

### Hip-Hop Beat
```bash
beat-gen sample "808 kick" "tight snare" "closed hihat" "rim shot"
cat > hiphop.txt << 'EOF'
kick:    X.....X.X.....X.
snare:   ....X.......X...
hihat:   X.X.X.X.X.X.X.X.
rimshot: ..X.....X.......
EOF
beat-gen compose hiphop.txt --bpm 95 --swing 0.5 -o hiphop.mid
```

## Pattern Notation Cheat Sheet

```
X = loud hit (velocity 100)
x = soft hit (velocity 60)
. = rest/silence
1-9 = custom velocity (1=10%, 9=90%)
```

## FFmpeg Requirement

The `render` command requires FFmpeg:

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg  # Debian/Ubuntu
sudo yum install ffmpeg  # CentOS/RHEL
```

**Windows:**
Download from https://ffmpeg.org/download.html

## Tips

1. **Generate samples first** before rendering
2. **Use JSON patterns** for precise velocity control
3. **Test with MIDI** before rendering (faster iteration)
4. **Match sample names** to drum names in pattern
5. **Apply swing** for humanized feel (0.3-0.66)
6. **Export MIDI** for Yamaha sampler or DAW workflow
7. **Render WAV** for final audio or quick preview

## Troubleshooting

**"11Labs API key required"**
```bash
export ELEVENLABS_API_KEY=your_key
echo 'export ELEVENLABS_API_KEY=your_key' >> ~/.bashrc
```

**"No sample found for kick"**
- Check sample filenames match drum names
- Use `ls samples/` to see available samples
- Rename samples: `mv 808-kick.wav kick.wav`

**"FFmpeg not found"**
```bash
brew install ffmpeg
```

**"Duration too short"**
- Increase `resolution` in JSON pattern
- Add more bars to pattern
