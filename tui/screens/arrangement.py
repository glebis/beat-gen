"""Arrangement screen -- section structure display."""

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Button, DataTable, Footer, Header, Static


# Block characters for energy visualization
ENERGY_BLOCKS = " ░▒▓█"


def energy_bar(energy: float, width: int = 10) -> str:
    """Render energy 0-1 as a block-character bar."""
    filled = int(energy * width)
    remainder = energy * width - filled
    bar = "█" * filled
    if filled < width:
        idx = min(int(remainder * len(ENERGY_BLOCKS)), len(ENERGY_BLOCKS) - 1)
        bar += ENERGY_BLOCKS[idx]
        bar += "░" * (width - filled - 1)
    return bar


class ArrangementScreen(Screen):
    BINDINGS = [
        Binding("escape", "go_back", "Back"),
        Binding("r", "regenerate", "Regenerate"),
        Binding("enter", "proceed", "Sound Design"),
        Binding("ctrl+q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        s = self.app.session
        yield Header()
        with Vertical(id="arrangement-container"):
            yield Static(
                f"ARRANGEMENT    {s.genre} | {s.key}m | {s.bpm} BPM",
                classes="screen-header",
            )

            table = DataTable(id="arrangement-table")
            table.add_columns("Section", "Bars", "Energy", "Tracks")
            yield table

            yield Static("", id="arrangement-summary")

            with Horizontal(id="arrangement-actions"):
                yield Button("<-- Back", id="back-btn")
                yield Button("Regenerate", id="regen-btn", variant="warning")
                yield Button("Sound Design -->", id="proceed-btn", variant="primary")

        yield Footer()

    def on_mount(self) -> None:
        self._populate_table()

    def _populate_table(self) -> None:
        arr = self.app.session.arrangement
        if not arr:
            return

        table = self.query_one("#arrangement-table", DataTable)
        table.clear()

        sections = arr.get("sections", [])
        total_bars = 0
        track_set = set()

        for sec in sections:
            name = sec.get("name", "?")
            bars = sec.get("bars", 0)
            energy = sec.get("energy", 0)
            tracks = sec.get("activeTracks", sec.get("tracks", []))

            total_bars += bars
            track_set.update(tracks)

            track_str = ", ".join(tracks[:5])
            if len(tracks) > 5:
                track_str += f"... +{len(tracks) - 5}"

            table.add_row(name, str(bars), energy_bar(energy), track_str)

        # Summary
        bpm = self.app.session.bpm
        total_secs = int(total_bars * 4 * 60 / bpm) if bpm else 0
        mins, secs = divmod(total_secs, 60)
        summary = self.query_one("#arrangement-summary", Static)
        summary.update(
            f"Total: {total_bars} bars | {mins}m{secs:02d}s | {len(track_set)} tracks"
        )

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "back-btn":
            self.action_go_back()
        elif event.button.id == "regen-btn":
            self.action_regenerate()
        elif event.button.id == "proceed-btn":
            self.action_proceed()

    def action_go_back(self) -> None:
        self.app.pop_screen()

    def action_regenerate(self) -> None:
        s = self.app.session
        params = dict(genre=s.genre, key=s.key, bpm=s.bpm, seed=s.seed,
                      variety=s.variety, density=s.density, weirdness=s.weirdness,
                      duration=s.duration)
        self.app.run_generate(params)

    def action_proceed(self) -> None:
        from tui.screens.sound_design import SoundDesignScreen
        self.app.push_screen(SoundDesignScreen())
