"""Scan sample files and resolve variants per instrument."""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

# Drum MIDI notes -> instrument names
DRUM_NOTE_MAP = {
    36: "kick", 38: "snare", 42: "hihat", 46: "hihat-open",
    37: "rimshot", 39: "clap", 44: "pedal-hihat", 49: "crash",
    51: "ride", 56: "cowbell", 75: "clave",
}

# Canonical instrument groups for display ordering
DRUM_INSTRUMENTS = ["kick", "snare", "hihat", "hihat-open", "rimshot", "clap"]
PITCHED_INSTRUMENTS = ["bass", "lead", "pad", "arp", "fx", "subBass"]
TEXTURE_INSTRUMENTS = ["vocalChop", "texture", "noise", "scratch", "atmosphere", "stab"]

ALL_INSTRUMENTS = DRUM_INSTRUMENTS + PITCHED_INSTRUMENTS + TEXTURE_INSTRUMENTS


@dataclass
class SampleFile:
    path: Path
    filename: str
    instrument: str
    variant_num: int | None = None
    size_bytes: int = 0
    duration_estimate: float = 0.0  # rough estimate from file size
    midi_note: int | None = None

    @property
    def display_name(self) -> str:
        return self.filename


class SampleManager:
    def __init__(self, samples_dir: Path):
        self.dir = samples_dir

    def scan(self) -> dict[str, list[SampleFile]]:
        """Return {instrument_name: [SampleFile, ...]} from disk."""
        result: dict[str, list[SampleFile]] = {inst: [] for inst in ALL_INSTRUMENTS}

        if not self.dir.exists():
            return result

        for f in sorted(self.dir.iterdir()):
            if f.suffix not in (".mp3", ".wav"):
                continue

            sample = self._parse_file(f)
            if sample and sample.instrument in result:
                result[sample.instrument].append(sample)

        return result

    def _parse_file(self, path: Path) -> SampleFile | None:
        """Parse a sample file into a SampleFile object."""
        name = path.stem
        size = path.stat().st_size

        # Drum pattern: {midiNote}-{name}*.mp3
        drum_match = re.match(r'^(\d+)-(.+)', name)
        if drum_match:
            note = int(drum_match.group(1))
            inst = DRUM_NOTE_MAP.get(note)
            if inst:
                return SampleFile(
                    path=path, filename=path.name, instrument=inst,
                    size_bytes=size, midi_note=note,
                    duration_estimate=size / 44100 / 2,  # rough
                )

        # Instrument pattern: {name}-v{n}.mp3
        inst_match = re.match(r'^([a-zA-Z]+)-v(\d+)', name)
        if inst_match:
            inst = inst_match.group(1)
            variant = int(inst_match.group(2))
            if inst in ALL_INSTRUMENTS:
                return SampleFile(
                    path=path, filename=path.name, instrument=inst,
                    variant_num=variant, size_bytes=size,
                    duration_estimate=size / 44100 / 2,
                )

        # Bare name match (e.g., kick.mp3, snare.mp3)
        for inst in ALL_INSTRUMENTS:
            if name.lower() == inst.lower():
                return SampleFile(
                    path=path, filename=path.name, instrument=inst,
                    size_bytes=size, duration_estimate=size / 44100 / 2,
                )

        return None

    def get_metadata(self) -> dict:
        """Read samples.json if it exists."""
        meta_path = self.dir / "samples.json"
        if meta_path.exists():
            return json.loads(meta_path.read_text())
        return {}

    def delete_sample(self, path: Path) -> None:
        path.unlink(missing_ok=True)

    def get_prompt_for_instrument(self, instrument: str, genre: str) -> str:
        """Return a reasonable default prompt for this instrument+genre."""
        # Drum prompts
        drum_prompts = {
            "kick": f"deep kick drum {genre} warm",
            "snare": f"snare drum {genre} crisp",
            "hihat": f"closed hi-hat {genre} tight",
            "hihat-open": f"open hi-hat {genre} sizzle",
            "rimshot": f"rimshot {genre} warm analog",
            "clap": f"handclap {genre} vintage",
        }
        if instrument in drum_prompts:
            return drum_prompts[instrument]

        # For pitched/texture instruments, read from INSTRUMENT_KITS via config
        # Fallback to generic prompts
        generic = {
            "bass": f"sustained deep bass note C2 {genre}",
            "lead": f"sustained synth lead C4 {genre}",
            "pad": f"sustained ambient pad C4 {genre} atmospheric",
            "arp": f"arpeggiated synth C4 {genre} sequenced",
            "fx": f"fx sound effect {genre} electronic",
            "subBass": f"deep sub bass C1 {genre} rumble",
            "vocalChop": f"vocal chop pitched C4 {genre}",
            "texture": f"evolving texture pad {genre} atmospheric",
            "noise": f"filtered noise sweep {genre}",
            "scratch": f"dj scratch hit {genre}",
            "atmosphere": f"ambient drone atmospheric {genre} evolving",
            "stab": f"chord stab hit C4 {genre} short",
        }
        return generic.get(instrument, f"{instrument} {genre}")
