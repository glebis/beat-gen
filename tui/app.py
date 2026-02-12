"""Beat-Gen Studio TUI -- main application."""

import json
import tempfile
from pathlib import Path

from textual.app import App
from textual import work

from tui.services.beatgen import BeatGen
from tui.services.player import Player
from tui.services.session import SampleEdits, Session, SessionManager
from tui.services.waveform import get_duration_ms, get_waveform
from tui.screens.setup import SetupScreen


class BeatGenStudio(App):
    """Interactive TUI for beat-gen sample audition and mixing."""

    TITLE = "Beat-Gen Studio"
    CSS_PATH = "styles/app.tcss"

    def __init__(self, project_dir: str | Path | None = None):
        super().__init__()
        self.project_dir = Path(project_dir or Path(__file__).parent.parent)
        self.beatgen = BeatGen(self.project_dir)
        self.player = Player()
        self.session_mgr = SessionManager(self.project_dir / "data" / "sessions")
        self.session = Session(
            name="",
            samples_dir=str(self.project_dir / "data" / "samples" / "trip-hop"),
        )

    def on_mount(self) -> None:
        self.push_screen(SetupScreen())

    # ── Playback ──

    def play_sample(self, path: str, pitch_offset: int = 0) -> None:
        """Play a sample file, optionally pitch-shifted."""
        self._do_play(path, pitch_offset)

    @work(exclusive=True, group="playback")
    async def _do_play(self, path: str, pitch_offset: int) -> None:
        if pitch_offset != 0:
            await self.player.play_pitched(path, pitch_offset)
        else:
            await self.player.play(path)

    def play_sample_with_edits(
        self, path: str, edits: SampleEdits, duration_ms: float, pitch: int = 0
    ) -> None:
        """Play a sample with non-destructive edits applied."""
        self._do_play_with_edits(path, edits, duration_ms, pitch)

    @work(exclusive=True, group="playback")
    async def _do_play_with_edits(
        self, path: str, edits: SampleEdits, duration_ms: float, pitch: int
    ) -> None:
        await self.player.play_with_edits(path, edits, duration_ms, pitch)

    def stop_playback(self) -> None:
        self._do_stop()

    @work(exclusive=True, group="playback")
    async def _do_stop(self) -> None:
        await self.player.stop()

    # ── Waveform worker ──

    def _load_waveform_worker(self, screen, path: str) -> None:
        self._worker_waveform(screen, path)

    @work(exclusive=True, group="waveform", exit_on_error=False)
    async def _worker_waveform(self, screen, path: str) -> None:
        peaks = await get_waveform(path, bins=50)
        duration_ms = await get_duration_ms(path)
        if hasattr(screen, "on_waveform_loaded"):
            screen.on_waveform_loaded(peaks, duration_ms)

    # ── Generation workers ──

    def run_generate(self, params: dict) -> None:
        """Generate arrangement in background worker."""
        self._worker_generate(params)

    @work(exclusive=True, group="generate")
    async def _worker_generate(self, params: dict) -> None:
        genre = params["genre"]
        key = params["key"]
        bpm = params["bpm"]
        kw = {k: v for k, v in params.items()
              if k not in ("genre", "key", "bpm") and v is not None}

        result = await self.beatgen.generate_arrangement(genre, key, bpm, **kw)
        self.session.arrangement = result
        if self.session.name:
            self.session_mgr.save(self.session)

        from tui.screens.arrangement import ArrangementScreen
        self.push_screen(ArrangementScreen())

    def generate_drum_sample(self, prompt: str, instrument: str) -> None:
        self._worker_drum_sample(prompt, instrument)

    @work(group="sample_gen", exit_on_error=False)
    async def _worker_drum_sample(self, prompt: str, instrument: str) -> None:
        try:
            await self.beatgen.generate_sample(prompt, self.session.samples_dir)
            self._notify_generation_complete(instrument)
        except Exception as e:
            self.notify(f"Generation failed: {e}", severity="error")

    def generate_instrument_sample(self, prompt: str, instrument: str, genre: str) -> None:
        self._worker_instrument_sample(prompt, instrument, genre)

    @work(group="sample_gen", exit_on_error=False)
    async def _worker_instrument_sample(self, prompt: str, instrument: str, genre: str) -> None:
        try:
            await self.beatgen.generate_instrument_sample(
                prompt, self.session.samples_dir, instrument, genre,
            )
            self._notify_generation_complete(instrument)
        except Exception as e:
            self.notify(f"Generation failed: {e}", severity="error")

    def _notify_generation_complete(self, instrument: str) -> None:
        screen = self.screen
        if hasattr(screen, "on_generation_complete"):
            screen.on_generation_complete(instrument)

    def _write_mix_config(self) -> Path | None:
        """Write session mix_volumes to a temp JSON file for the CLI."""
        volumes = self.session.mix_volumes
        if not volumes:
            return None

        config = {
            "tracks": {
                inst: {"gain": db} for inst, db in volumes.items() if db != 0
            },
            "master": {"gain": 0},
        }
        if not config["tracks"]:
            return None

        tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", prefix="mix-", delete=False,
        )
        json.dump(config, tmp, indent=2)
        tmp.close()
        return Path(tmp.name)

    def run_render(self, **params) -> None:
        self._worker_render(params)

    @work(exclusive=True, group="render", exit_on_error=False)
    async def _worker_render(self, params: dict) -> None:
        screen = self.screen

        def on_progress(line: str):
            import re
            # Strip ANSI escape codes
            clean = re.sub(r"\x1b\[[0-9;]*m", "", line)
            # Track progress via step markers: "1/5", "2/5", etc.
            step_match = re.search(r"(\d)/5\s", clean)
            if step_match:
                step = int(step_match.group(1))
                # Steps 1-3 are fast, step 4 (render) is slow, step 5 is summary
                step_pcts = {1: 5, 2: 10, 3: 15, 4: 20, 5: 95}
                pct = step_pcts.get(step, 0)
                if hasattr(screen, "on_render_progress"):
                    screen.on_render_progress(pct)
                return
            # "Variant X/Y" within render step -> interpolate 20-90
            variant_match = re.search(r"Variant\s+(\d+)/(\d+)", clean)
            if variant_match:
                v = int(variant_match.group(1))
                total = int(variant_match.group(2))
                pct = 20 + int(70 * (v - 1) / max(total, 1))
                if hasattr(screen, "on_render_progress"):
                    screen.on_render_progress(pct)

        mix_config_path = self._write_mix_config()

        try:
            genre = params.get("genre", self.session.genre)
            key = params.get("key", self.session.key)
            bpm = params.get("bpm", self.session.bpm)
            kw = {k: v for k, v in params.items()
                  if k not in ("genre", "key", "bpm") and v is not None}

            mix_path = await self.beatgen.render_fulltrack(
                genre, key, bpm,
                samples_dir=self.session.samples_dir,
                output_dir=str(self.project_dir / "data" / "output"),
                on_progress=on_progress,
                mix_config=mix_config_path,
                **kw,
            )
            if hasattr(screen, "on_render_complete"):
                screen.on_render_complete(str(mix_path))
        except Exception as e:
            if hasattr(screen, "on_render_error"):
                screen.on_render_error(str(e))
        finally:
            if mix_config_path:
                mix_config_path.unlink(missing_ok=True)

    async def action_quit(self) -> None:
        await self.player.cleanup()
        self.exit()
