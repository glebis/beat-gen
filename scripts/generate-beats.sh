#!/bin/bash
set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║        Beat-Gen: Full Beat Generation Workflow            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

CLI="node bin/beat-gen.js"
PATTERNS_DIR="data/generated-patterns"
SAMPLES_DIR="data/audio-samples"
OUTPUT_DIR="data/output/beats"

mkdir -p "$OUTPUT_DIR"

# Function to generate beat
generate_beat() {
  local GENRE=$1
  local BPM=$2
  local STYLE=$3

  echo ""
  echo -e "${CYAN}━━━ Generating $STYLE Beat ━━━${NC}"
  echo ""

  # 1. Generate pattern
  echo -e "${YELLOW}→ Step 1: Generating $GENRE pattern...${NC}"
  $CLI generate $GENRE --count 1 --output "$PATTERNS_DIR" > /dev/null 2>&1
  PATTERN="$PATTERNS_DIR/$GENRE/${GENRE}-001-main.json"
  echo "  ✓ Pattern: ${GENRE}-001-main.json"

  # 2. Generate samples
  echo -e "${YELLOW}→ Step 2: Generating $STYLE samples...${NC}"
  local SAMPLE_DIR="$SAMPLES_DIR/$GENRE"
  mkdir -p "$SAMPLE_DIR"

  case $GENRE in
    house)
      $CLI sample \
        "kick deep house" \
        "snare tight house" \
        "hihat crisp" \
        "hihat-open bright" \
        "clap house" \
        --output "$SAMPLE_DIR" \
        --duration 2 \
        > /dev/null 2>&1
      ;;
    techno)
      $CLI sample \
        "kick hard techno" \
        "snare sharp industrial" \
        "hihat metallic" \
        "rimshot percussive" \
        "clap minimal" \
        --output "$SAMPLE_DIR" \
        --duration 2 \
        > /dev/null 2>&1
      ;;
    dnb)
      $CLI sample \
        "kick punchy dnb" \
        "snare tight jungle" \
        "hihat fast" \
        "snare amen" \
        "crash jungle" \
        --output "$SAMPLE_DIR" \
        --duration 2 \
        > /dev/null 2>&1
      ;;
    trip-hop)
      $CLI sample \
        "kick dusty trip-hop" \
        "snare warm vinyl" \
        "hihat lofi" \
        "hihat-open atmospheric" \
        "clap vintage" \
        --output "$SAMPLE_DIR" \
        --duration 2 \
        > /dev/null 2>&1
      ;;
  esac

  echo "  ✓ Samples generated in $SAMPLE_DIR"

  # 3. Compose MIDI
  echo -e "${YELLOW}→ Step 3: Composing MIDI at ${BPM} BPM...${NC}"
  local MIDI_FILE="$OUTPUT_DIR/${GENRE}-${BPM}bpm.mid"
  $CLI compose "$PATTERN" --bpm $BPM --output "$MIDI_FILE" > /dev/null 2>&1
  echo "  ✓ MIDI: ${GENRE}-${BPM}bpm.mid"

  # 4. Render to audio
  echo -e "${YELLOW}→ Step 4: Rendering to WAV...${NC}"
  local WAV_FILE="$OUTPUT_DIR/${GENRE}-${BPM}bpm.wav"
  $CLI render "$PATTERN" \
    --samples "$SAMPLE_DIR" \
    --output "$WAV_FILE" \
    --bpm $BPM \
    > /dev/null 2>&1 || {
      echo "  ⚠ Render requires ffmpeg (skipped)"
      return
    }

  local SIZE=$(du -h "$WAV_FILE" | cut -f1)
  echo "  ✓ Audio: ${GENRE}-${BPM}bpm.wav ($SIZE)"

  echo -e "${GREEN}✓ $STYLE beat complete!${NC}"
}

# Generate beats in different genres
generate_beat "house" "120" "Deep House"
generate_beat "techno" "128" "Industrial Techno"
generate_beat "dnb" "170" "Drum & Bass"
generate_beat "trip-hop" "85" "Trip-Hop"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    All Beats Generated                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Output files:"
ls -lh "$OUTPUT_DIR"/*.{mid,wav} 2>/dev/null || echo "  (no files - ffmpeg may be required for WAV)"
echo ""
echo "Listen to your beats:"
echo "  open $OUTPUT_DIR/house-120bpm.wav"
echo "  open $OUTPUT_DIR/techno-128bpm.wav"
echo "  open $OUTPUT_DIR/dnb-170bpm.wav"
echo "  open $OUTPUT_DIR/trip-hop-85bpm.wav"
echo ""
