"""Session persistence -- save/load/create/delete."""

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path


@dataclass
class SampleEdits:
    """Non-destructive sample edit parameters. Applied as ffmpeg filters."""
    attack_ms: float = 0        # fade-in (0-2000ms)
    release_ms: float = 0       # fade-out (0-2000ms)
    gain_db: float = 0          # volume (-24 to +12 dB)
    normalize: bool = False     # peak normalize to 0dB
    hp_freq: int = 20           # high-pass cutoff (20-5000 Hz)
    lp_freq: int = 20000        # low-pass cutoff (200-20000 Hz)
    reverse: bool = False
    trim_start_ms: float = 0    # trim from start (ms)
    trim_end_ms: float = 0      # trim from end (ms)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "SampleEdits":
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in known})

    def is_default(self) -> bool:
        """True if no edits have been made."""
        default = SampleEdits()
        return self == default


@dataclass
class Session:
    name: str
    genre: str = "trip-hop"
    key: str = "C"
    bpm: int = 120
    seed: int | None = None
    variety: float = 0.5
    density: float = 0.5
    weirdness: float = 0.3
    duration: int | None = None
    preset: str | None = None
    samples_dir: str = ""
    selections: dict = field(default_factory=dict)  # instrument -> filename
    prompts: dict = field(default_factory=dict)      # instrument -> custom prompt
    edits: dict = field(default_factory=dict)         # instrument -> SampleEdits dict
    mix_volumes: dict = field(default_factory=dict)  # instrument -> gain_dB (float)
    arrangement: dict | None = None
    created_at: str = ""
    updated_at: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    def get_edits(self, instrument: str) -> SampleEdits:
        """Get SampleEdits for an instrument, creating defaults if missing."""
        data = self.edits.get(instrument)
        if data:
            return SampleEdits.from_dict(data)
        return SampleEdits()

    def set_edits(self, instrument: str, edits: SampleEdits) -> None:
        """Store edits for an instrument."""
        if edits.is_default():
            self.edits.pop(instrument, None)
        else:
            self.edits[instrument] = edits.to_dict()

    @classmethod
    def from_dict(cls, data: dict) -> "Session":
        # Filter to only known fields
        known = {f.name for f in cls.__dataclass_fields__.values()}
        return cls(**{k: v for k, v in data.items() if k in known})


class SessionManager:
    def __init__(self, sessions_dir: Path):
        self.dir = sessions_dir
        self.dir.mkdir(parents=True, exist_ok=True)

    def list(self) -> list[str]:
        return sorted(
            p.stem for p in self.dir.glob("*.json")
        )

    def load(self, name: str) -> Session:
        path = self.dir / f"{name}.json"
        if not path.exists():
            raise FileNotFoundError(f"Session not found: {name}")
        data = json.loads(path.read_text())
        return Session.from_dict(data)

    def save(self, session: Session) -> None:
        session.updated_at = datetime.now().isoformat()
        if not session.created_at:
            session.created_at = session.updated_at
        path = self.dir / f"{session.name}.json"
        path.write_text(json.dumps(session.to_dict(), indent=2))

    def delete(self, name: str) -> None:
        path = self.dir / f"{name}.json"
        path.unlink(missing_ok=True)

    def create(self, name: str, **params) -> Session:
        now = datetime.now().isoformat()
        session = Session(name=name, created_at=now, updated_at=now, **params)
        self.save(session)
        return session
