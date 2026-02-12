"""Setup screen -- genre, key, BPM, parameters."""

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical, Center
from textual.screen import Screen
from textual.widgets import (
    Button, Footer, Header, Input, Label, Select, Static,
)

GENRES = [
    "house", "techno", "dnb", "breakbeat", "uk-garage",
    "idm", "trip-hop", "ostinato", "reggae",
]

KEYS = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]

PRESETS = [("None", ""), ("clean", "clean"), ("compressed", "compressed"),
           ("dub", "dub"), ("pumping", "pumping"), ("heavy-sidechain", "heavy-sidechain")]

DEFAULT_TEMPOS = {
    "house": 128, "techno": 135, "dnb": 174, "breakbeat": 130,
    "uk-garage": 135, "idm": 135, "trip-hop": 85, "ostinato": 120, "reggae": 80,
}


class SetupScreen(Screen):
    BINDINGS = [
        Binding("ctrl+q", "quit", "Quit"),
    ]

    def compose(self) -> ComposeResult:
        yield Header()
        with Vertical(id="setup-container"):
            yield Static("BEAT-GEN STUDIO", classes="screen-header")

            with Horizontal(classes="setup-row"):
                yield Label("Genre:")
                yield Select(
                    [(g, g) for g in GENRES],
                    value=self.app.session.genre if self.app.session else "trip-hop",
                    id="genre-select",
                )
                yield Label("Key:")
                yield Select(
                    [(k, k) for k in KEYS],
                    value=self.app.session.key if self.app.session else "C",
                    id="key-select",
                )

            with Horizontal(classes="setup-row"):
                yield Label("BPM:")
                yield Input(
                    value=str(self.app.session.bpm if self.app.session else 120),
                    id="bpm-input",
                    type="integer",
                    max_length=3,
                )
                yield Label("Seed:")
                yield Input(
                    value=str(self.app.session.seed or ""),
                    id="seed-input",
                    placeholder="random",
                    max_length=10,
                )

            with Horizontal(classes="setup-row"):
                yield Label("Variety:")
                yield Input(
                    value=str(self.app.session.variety if self.app.session else 0.5),
                    id="variety-input",
                    max_length=4,
                )
                yield Label("Density:")
                yield Input(
                    value=str(self.app.session.density if self.app.session else 0.5),
                    id="density-input",
                    max_length=4,
                )

            with Horizontal(classes="setup-row"):
                yield Label("Weirdness:")
                yield Input(
                    value=str(self.app.session.weirdness if self.app.session else 0.3),
                    id="weirdness-input",
                    max_length=4,
                )
                yield Label("Duration:")
                yield Input(
                    value=str(self.app.session.duration or ""),
                    id="duration-input",
                    placeholder="auto",
                    type="integer",
                    max_length=4,
                )

            with Horizontal(classes="setup-row"):
                yield Label("Preset:")
                yield Select(
                    [(name, val) for name, val in PRESETS],
                    value=self.app.session.preset or "",
                    id="preset-select",
                )

            # Session controls
            with Horizontal(classes="setup-row"):
                yield Label("Session:")
                yield Select(
                    self._session_options(),
                    value="",
                    id="session-select",
                )
                yield Button("Load", id="load-btn", variant="default")
                yield Button("Save", id="save-btn", variant="default")
                yield Button("Delete", id="delete-btn", variant="error")

            with Center(id="setup-actions"):
                yield Button("Generate Arrangement -->", id="generate-btn", variant="primary")

            yield Static("", id="setup-status")

        yield Footer()

    def _session_options(self) -> list[tuple[str, str]]:
        sessions = self.app.session_mgr.list()
        opts = [("New Session", "")]
        opts.extend((s, s) for s in sessions)
        return opts

    def on_select_changed(self, event: Select.Changed) -> None:
        if event.select.id == "genre-select" and event.value != Select.BLANK:
            # Auto-update BPM when genre changes
            bpm_input = self.query_one("#bpm-input", Input)
            default_bpm = DEFAULT_TEMPOS.get(str(event.value), 120)
            bpm_input.value = str(default_bpm)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "generate-btn":
            self._do_generate()
        elif event.button.id == "load-btn":
            self._do_load()
        elif event.button.id == "save-btn":
            self._do_save()
        elif event.button.id == "delete-btn":
            self._do_delete()

    def _read_params(self) -> dict:
        """Read all parameter values from the form."""
        genre_sel = self.query_one("#genre-select", Select)
        key_sel = self.query_one("#key-select", Select)
        genre = str(genre_sel.value) if genre_sel.value != Select.BLANK else "trip-hop"
        key = str(key_sel.value) if key_sel.value != Select.BLANK else "C"

        bpm = int(self.query_one("#bpm-input", Input).value or "120")
        seed_val = self.query_one("#seed-input", Input).value
        seed = int(seed_val) if seed_val else None

        variety = float(self.query_one("#variety-input", Input).value or "0.5")
        density = float(self.query_one("#density-input", Input).value or "0.5")
        weirdness = float(self.query_one("#weirdness-input", Input).value or "0.3")

        dur_val = self.query_one("#duration-input", Input).value
        duration = int(dur_val) if dur_val else None

        preset_sel = self.query_one("#preset-select", Select)
        preset = str(preset_sel.value) if preset_sel.value not in (Select.BLANK, "") else None

        return dict(genre=genre, key=key, bpm=bpm, seed=seed,
                    variety=variety, density=density, weirdness=weirdness,
                    duration=duration, preset=preset)

    def _update_session(self, params: dict) -> None:
        """Write params into the app session."""
        s = self.app.session
        for k, v in params.items():
            if hasattr(s, k):
                setattr(s, k, v)
        # Set samples dir based on genre
        s.samples_dir = str(self.app.project_dir / "data" / "samples" / params["genre"])

    def _do_generate(self) -> None:
        params = self._read_params()
        self._update_session(params)
        status = self.query_one("#setup-status", Static)
        status.update("Generating arrangement...")
        self.app.run_generate(params)

    def _do_load(self) -> None:
        sel = self.query_one("#session-select", Select)
        name = str(sel.value) if sel.value != Select.BLANK else ""
        if not name:
            return
        try:
            session = self.app.session_mgr.load(name)
            self.app.session = session
            self.app.pop_screen()
            self.app.push_screen(SetupScreen())
        except FileNotFoundError:
            self.query_one("#setup-status", Static).update(f"Session '{name}' not found")

    def _do_save(self) -> None:
        params = self._read_params()
        self._update_session(params)
        if not self.app.session.name:
            self.app.session.name = f"{params['genre']}-{params['bpm']}"
        self.app.session_mgr.save(self.app.session)
        self.query_one("#setup-status", Static).update(
            f"Saved: {self.app.session.name}"
        )
        # Refresh session list
        sel = self.query_one("#session-select", Select)
        sel.set_options(self._session_options())

    def _do_delete(self) -> None:
        sel = self.query_one("#session-select", Select)
        name = str(sel.value) if sel.value != Select.BLANK else ""
        if name:
            self.app.session_mgr.delete(name)
            sel.set_options(self._session_options())
            self.query_one("#setup-status", Static).update(f"Deleted: {name}")
