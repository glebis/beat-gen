"""Mixer screen -- per-track volume control, preview, and render."""

from pathlib import Path

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Vertical
from textual.screen import Screen
from textual.widgets import Footer, Header, ProgressBar, Static

from tui.services.samples import ALL_INSTRUMENTS


# Volume range
VOL_MIN = -24
VOL_MAX = 12
VOL_BAR_WIDTH = 10


def _vol_bar(db: float) -> str:
    """Render a volume bar like ████████░░ from dB value."""
    ratio = (db - VOL_MIN) / (VOL_MAX - VOL_MIN)
    filled = round(ratio * VOL_BAR_WIDTH)
    filled = max(0, min(VOL_BAR_WIDTH, filled))
    empty = VOL_BAR_WIDTH - filled
    return "\u2588" * filled + "\u2591" * empty


def _format_db(db: float) -> str:
    if db > 0:
        return f"+{db:.0f}dB"
    return f"{db:.0f}dB"


class MixerScreen(Screen):
    BINDINGS = [
        Binding("up", "move_up", "Up", show=False),
        Binding("down", "move_down", "Down", show=False),
        Binding("left", "vol_down", "Vol -1dB", show=False),
        Binding("right", "vol_up", "Vol +1dB", show=False),
        Binding("shift+left", "vol_down_coarse", "Vol -3dB", show=False),
        Binding("shift+right", "vol_up_coarse", "Vol +3dB", show=False),
        Binding("0", "vol_reset", "Reset 0dB", show=False),
        Binding("space", "preview", "Preview"),
        Binding("enter", "render", "Render"),
        Binding("p", "play_mix", "Play Mix"),
        Binding("escape", "go_back", "Back"),
        Binding("ctrl+q", "quit", "Quit"),
    ]

    def __init__(self):
        super().__init__()
        self._mix_path: str | None = None
        self._current_row: int = 0
        self._instruments: list[str] = []  # only instruments with selections
        self._volumes: dict[str, float] = {}

    def compose(self) -> ComposeResult:
        s = self.app.session
        yield Header()
        with Vertical(id="mixer-container"):
            yield Static(
                f"MIXER    {s.genre} | {s.key}m | {s.bpm} BPM",
                classes="screen-header",
            )
            yield Static("", id="mixer-header-row")
            yield Static("", id="mixer-tracks")
            yield Static("", id="mixer-info")
            yield ProgressBar(id="mixer-progress", total=100, show_eta=False)
            yield Static("", id="mixer-status")
            yield Static(
                "[dim]Up/Down[/] navigate  [dim]Left/Right[/] volume  "
                "[dim]Space[/] preview  [dim]Enter[/] render  "
                "[dim]0[/] reset  [dim]p[/] play mix  [dim]Esc[/] back",
                id="mixer-help",
            )
        yield Footer()

    def on_mount(self) -> None:
        # Build instrument list from selections only
        selections = self.app.session.selections
        self._instruments = [
            inst for inst in ALL_INSTRUMENTS if selections.get(inst)
        ]

        # Load volumes from session (default 0dB)
        saved = self.app.session.mix_volumes
        self._volumes = {
            inst: float(saved.get(inst, 0)) for inst in self._instruments
        }

        self._current_row = 0

        progress = self.query_one("#mixer-progress", ProgressBar)
        progress.update(progress=0)

        # Header row
        hdr = self.query_one("#mixer-header-row", Static)
        hdr.update(
            f"  {'INSTRUMENT':<14} {'SAMPLE':<24} {'VOLUME':<{VOL_BAR_WIDTH + 8}}"
        )

        # Info line
        s = self.app.session
        preset_str = s.preset or "none"
        info = self.query_one("#mixer-info", Static)
        info.update(f"Preset: {preset_str} | Seed: {s.seed or 'random'}")

        self._refresh_tracks()

    def _refresh_tracks(self) -> None:
        """Redraw all track rows."""
        selections = self.app.session.selections
        lines = []
        for i, inst in enumerate(self._instruments):
            sample = selections.get(inst, "")
            # Truncate long filenames
            if len(sample) > 22:
                sample = sample[:19] + "..."

            vol = self._volumes.get(inst, 0)
            bar = _vol_bar(vol)
            db_str = _format_db(vol)

            cursor = "\u25b6" if i == self._current_row else " "

            if i == self._current_row:
                line = f"[bold]{cursor} {inst:<14} {sample:<24} {bar}  {db_str}[/bold]"
            else:
                line = f"[dim]{cursor}[/dim] {inst:<14} {sample:<24} [dim]{bar}  {db_str}[/dim]"

            lines.append(line)

        if not lines:
            lines.append("[dim]No instruments selected. Go to Sound Design first.[/dim]")

        tracks = self.query_one("#mixer-tracks", Static)
        tracks.update("\n".join(lines))

    def _save_volumes(self) -> None:
        """Persist non-zero volumes to session."""
        self.app.session.mix_volumes = {
            inst: vol for inst, vol in self._volumes.items() if vol != 0
        }
        if self.app.session.name:
            self.app.session_mgr.save(self.app.session)

    # ── Navigation ──

    def action_move_up(self) -> None:
        if self._instruments and self._current_row > 0:
            self._current_row -= 1
            self._refresh_tracks()

    def action_move_down(self) -> None:
        if self._instruments and self._current_row < len(self._instruments) - 1:
            self._current_row += 1
            self._refresh_tracks()

    # ── Volume ──

    def _adjust_volume(self, delta: float) -> None:
        if not self._instruments:
            return
        inst = self._instruments[self._current_row]
        vol = self._volumes.get(inst, 0) + delta
        vol = max(VOL_MIN, min(VOL_MAX, vol))
        self._volumes[inst] = vol
        self._refresh_tracks()
        self._save_volumes()

    def action_vol_up(self) -> None:
        self._adjust_volume(1)

    def action_vol_down(self) -> None:
        self._adjust_volume(-1)

    def action_vol_up_coarse(self) -> None:
        self._adjust_volume(3)

    def action_vol_down_coarse(self) -> None:
        self._adjust_volume(-3)

    def action_vol_reset(self) -> None:
        if not self._instruments:
            return
        inst = self._instruments[self._current_row]
        self._volumes[inst] = 0
        self._refresh_tracks()
        self._save_volumes()

    # ── Preview ──

    def action_preview(self) -> None:
        if not self._instruments:
            return
        inst = self._instruments[self._current_row]
        selections = self.app.session.selections
        sample_name = selections.get(inst)
        if not sample_name:
            return

        sample_path = str(Path(self.app.session.samples_dir) / sample_name)

        # Use sound design edits if available
        edits = self.app.session.get_edits(inst)
        if not edits.is_default():
            self.app.play_sample_with_edits(sample_path, edits, duration_ms=5000)
        else:
            self.app.play_sample(sample_path)

        status = self.query_one("#mixer-status", Static)
        status.update(f"[dim]Playing {inst}...[/dim]")

    # ── Render ──

    def action_render(self) -> None:
        status = self.query_one("#mixer-status", Static)
        status.update("[bold]Rendering...[/bold]")
        progress = self.query_one("#mixer-progress", ProgressBar)
        progress.update(progress=0)

        s = self.app.session
        self.app.run_render(
            genre=s.genre, key=s.key, bpm=s.bpm,
            seed=s.seed, variety=s.variety, density=s.density,
            weirdness=s.weirdness, duration=s.duration, preset=s.preset,
        )

    def action_play_mix(self) -> None:
        if self._mix_path:
            self.app.play_sample(self._mix_path)
        else:
            self.query_one("#mixer-status", Static).update(
                "No mix rendered yet. Press Enter to render."
            )

    def action_go_back(self) -> None:
        self.app.pop_screen()

    # ── Render callbacks (called by app worker) ──

    def on_render_progress(self, progress: int) -> None:
        bar = self.query_one("#mixer-progress", ProgressBar)
        bar.update(progress=progress)

    def on_render_complete(self, mix_path: str) -> None:
        self._mix_path = mix_path
        progress = self.query_one("#mixer-progress", ProgressBar)
        progress.update(progress=100)
        status = self.query_one("#mixer-status", Static)
        status.update(f"[green]Done![/green] {mix_path}")

    def on_render_error(self, error: str) -> None:
        status = self.query_one("#mixer-status", Static)
        status.update(f"[red]Error: {error}[/red]")
