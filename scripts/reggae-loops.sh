#!/bin/bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m'

CLI="node bin/beat-gen.js"
SAMPLES="samples/reggae"
PATTERNS="data/generated-patterns/reggae"
OUT="output/reggae-loops"

echo -e "${CYAN}━━━ Reggae Loop Generator (short + mastered) ━━━${NC}"
echo ""

mkdir -p "$OUT/loops"

# Step 1: Regenerate patterns
echo -e "${YELLOW}→ Generating fresh reggae patterns...${NC}"
$CLI generate reggae --count 2 --output data/generated-patterns --with-variations 2>/dev/null
echo -e "${GREEN}  done${NC}"

# BPM assignments per pattern (slow-medium range)
BPMS=(78 85 92 78 85 92)
STYLES=("one-drop" "rockers" "steppers" "one-drop" "rockers" "steppers")

# Step 2: Render each main pattern with compressed preset
COUNT=0
for PATTERN_FILE in "$PATTERNS"/reggae-*-main.json; do
  [ -f "$PATTERN_FILE" ] || continue
  COUNT=$((COUNT + 1))
  [ $COUNT -gt 6 ] && break

  IDX=$((COUNT - 1))
  BPM=${BPMS[$IDX]}
  STYLE=${STYLES[$IDX]}
  NAME="reggae-${COUNT}-${BPM}bpm-${STYLE}"

  echo ""
  echo -e "${CYAN}[$COUNT] $NAME${NC}"

  # Render with dub preset (cymbal taming + compressor + delay + reverb)
  WAV="$OUT/${NAME}.wav"
  echo -e "${GRAY}  rendering with dub preset...${NC}"
  $CLI render "$PATTERN_FILE" \
    --samples "$SAMPLES" \
    --output "$WAV" \
    --bpm "$BPM" \
    --preset dub \
    2>/dev/null

  # Create 2-bar loop (repeat once) using ffmpeg
  LOOP="$OUT/loops/${NAME}-loop.wav"
  ffmpeg -y -stream_loop 1 -i "$WAV" -c copy "$LOOP" 2>/dev/null
  DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$LOOP" 2>/dev/null)
  echo -e "${GREEN}  loop: ${DUR}s${NC}"

done

echo ""
echo -e "${GREEN}━━━ Done ━━━${NC}"
echo ""
echo "Output:"
ls -lh "$OUT/loops/"*.wav 2>/dev/null
echo ""
echo "Play: afplay $OUT/loops/reggae-1-*-loop.wav"
