#!/bin/bash
# Map descriptive sample names to standard drum names

map_genre_samples() {
  local GENRE=$1
  local DIR="data/audio-samples/$GENRE"

  cd "$DIR" 2>/dev/null || return

  echo "Mapping $GENRE samples..."

  # Find and link kick
  ls *kick*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} kick.mp3

  # Find and link snare
  ls *snare*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} snare.mp3

  # Find and link closed hat
  ls *closed*hat*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} closed-hat.mp3

  # Find and link open hat
  ls *open*hat*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} open-hat.mp3

  # Find and link clap
  ls *clap*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} clap.mp3

  # Find and link rim
  ls *rim*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} rim.mp3

  # Find and link crash
  ls *crash*.mp3 2>/dev/null | head -1 | xargs -I {} ln -sf {} crash.mp3

  echo "  ✓ Mapped samples for $GENRE"
  cd - > /dev/null
}

for genre in house techno dnb trip-hop; do
  map_genre_samples "$genre"
done

echo "✓ All samples mapped"
