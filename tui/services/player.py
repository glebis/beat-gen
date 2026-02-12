"""Audio playback via afplay with pitch-shifting and sample edits support."""

from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tui.services.session import SampleEdits


def build_filter_chain(edits: SampleEdits, duration_ms: float) -> str:
    """Build ffmpeg audio filter chain from SampleEdits. Order matters."""
    filters = []

    # 1. Trim
    if edits.trim_start_ms > 0 or edits.trim_end_ms > 0:
        end_ms = duration_ms - edits.trim_end_ms
        if end_ms < edits.trim_start_ms:
            end_ms = edits.trim_start_ms + 50  # prevent zero-length
        filters.append(f"atrim=start_ms={edits.trim_start_ms}:end_ms={end_ms}")
        filters.append("asetpts=PTS-STARTPTS")

    # 2. Reverse
    if edits.reverse:
        filters.append("areverse")

    # 3. Envelope (attack/release fades)
    effective_dur_ms = duration_ms - edits.trim_start_ms - edits.trim_end_ms
    effective_dur_s = max(effective_dur_ms / 1000, 0.05)

    if edits.attack_ms > 0:
        attack_s = min(edits.attack_ms / 1000, effective_dur_s * 0.9)
        filters.append(f"afade=t=in:d={attack_s:.3f}")

    if edits.release_ms > 0:
        release_s = min(edits.release_ms / 1000, effective_dur_s * 0.9)
        fade_start = max(effective_dur_s - release_s, 0)
        filters.append(f"afade=t=out:st={fade_start:.3f}:d={release_s:.3f}")

    # 4. Gain
    if edits.gain_db != 0:
        filters.append(f"volume={edits.gain_db}dB")

    # 5. Filters (HP/LP)
    if edits.hp_freq > 20:
        filters.append(f"highpass=f={edits.hp_freq}")
    if edits.lp_freq < 20000:
        filters.append(f"lowpass=f={edits.lp_freq}")

    # 6. Normalize (last)
    if edits.normalize:
        filters.append("dynaudnorm")

    return ",".join(filters)


class Player:
    def __init__(self):
        self._process: asyncio.subprocess.Process | None = None
        self._current_file: str | None = None
        self._temp_files: list[Path] = []

    @property
    def is_playing(self) -> bool:
        return self._process is not None and self._process.returncode is None

    @property
    def current_file(self) -> str | None:
        return self._current_file if self.is_playing else None

    async def play(self, path: str) -> None:
        await self.stop()
        self._current_file = path
        self._process = await asyncio.create_subprocess_exec(
            "afplay", path,
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )

    async def stop(self) -> None:
        if self._process and self._process.returncode is None:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=1.0)
            except (ProcessLookupError, asyncio.TimeoutError):
                try:
                    self._process.kill()
                except ProcessLookupError:
                    pass
        self._process = None
        self._current_file = None
        self._cleanup_temp()

    async def play_pitched(self, path: str, semitones: int) -> None:
        """Pitch-shift via ffmpeg to temp file, then play."""
        if semitones == 0:
            await self.play(path)
            return
        await self.stop()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        tmp_path = Path(tmp.name)
        self._temp_files.append(tmp_path)

        rate_factor = 2 ** (semitones / 12)
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", path,
            "-af", f"asetrate=44100*{rate_factor},aresample=44100",
            str(tmp_path),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
        if proc.returncode == 0:
            await self.play(str(tmp_path))

    async def play_with_edits(
        self, path: str, edits: SampleEdits, duration_ms: float, pitch: int = 0
    ) -> None:
        """Apply sample edits via ffmpeg, optionally pitch-shift, then play."""
        from tui.services.session import SampleEdits as _SE

        chain = build_filter_chain(edits, duration_ms)

        # Add pitch-shift to filter chain if needed
        if pitch != 0:
            rate_factor = 2 ** (pitch / 12)
            pitch_filters = f"asetrate=44100*{rate_factor},aresample=44100"
            chain = f"{chain},{pitch_filters}" if chain else pitch_filters

        if not chain:
            await self.play(path)
            return

        await self.stop()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        tmp_path = Path(tmp.name)
        self._temp_files.append(tmp_path)

        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", path,
            "-af", chain,
            str(tmp_path),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
        if proc.returncode == 0:
            await self.play(str(tmp_path))

    def _cleanup_temp(self):
        for f in self._temp_files:
            try:
                f.unlink(missing_ok=True)
            except OSError:
                pass
        self._temp_files.clear()

    async def cleanup(self):
        await self.stop()
