"""Sound Design screen -- per-instrument sample audition, selection, generation."""

from pathlib import Path

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal, Vertical
from textual.events import Key
from textual.screen import Screen
from textual.widgets import (
    Button, Footer, Header, Input, Label, ListItem, ListView, Static,
)

from tui.services.samples import (
    ALL_INSTRUMENTS, DRUM_INSTRUMENTS, PITCHED_INSTRUMENTS,
    TEXTURE_INSTRUMENTS, SampleFile, SampleManager,
)
from tui.services.session import SampleEdits
from tui.services.waveform import render_waveform

# Pitch names for preview
PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Editor parameter definitions: (attr, label, fine_step, coarse_step, min, max, format_fn)
EDITOR_PARAMS = [
    ("attack_ms",    "Attack",   10,   100,  0,     2000,  lambda v: f"{int(v)}ms"),
    ("release_ms",   "Release",  10,   100,  0,     2000,  lambda v: f"{int(v)}ms"),
    ("gain_db",      "Gain",     1,    3,    -24,   12,    lambda v: f"{v:+.0f}dB"),
    ("hp_freq",      "HP",       10,   100,  20,    5000,  lambda v: f"{int(v)}Hz"),
    ("lp_freq",      "LP",       100,  1000, 200,   20000, lambda v: f"{int(v) // 1000}kHz" if v >= 1000 else f"{int(v)}Hz"),
    ("trim_start_ms","Trim start", 10, 100,  0,     10000, lambda v: f"{int(v)}ms"),
    ("trim_end_ms",  "Trim end", 10,   100,  0,     10000, lambda v: f"{int(v)}ms"),
]

BAR_WIDTH = 10  # width of slider bar in characters


def pitch_label(semitones: int, base_octave: int = 3) -> str:
    note_idx = semitones % 12
    octave = base_octave + semitones // 12
    return f"{PITCH_NAMES[note_idx]}{octave}"


def format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes}B"
    return f"{size_bytes // 1024}KB"


def _render_slider(value: float, vmin: float, vmax: float) -> str:
    """Render a slider bar like ██████░░░░"""
    ratio = (value - vmin) / (vmax - vmin) if vmax > vmin else 0
    ratio = max(0.0, min(1.0, ratio))
    filled = round(ratio * BAR_WIDTH)
    return "\u2588" * filled + "\u2591" * (BAR_WIDTH - filled)


class SoundDesignScreen(Screen):
    BINDINGS = [
        Binding("space", "play_stop", "Play/Stop", priority=True),
        Binding("enter", "select_variant", "Select", priority=True),
        Binding("e", "toggle_editor", "Editor", priority=True),
        Binding("g", "generate", "Generate"),
        Binding("r", "reroll", "Re-roll"),
        Binding("d", "delete_variant", "Delete"),
        Binding("a", "generate_all_missing", "Gen All Missing"),
        Binding("tab", "next_instrument", "Next"),
        Binding("shift+tab", "prev_instrument", "Prev"),
        Binding("left_square_bracket", "pitch_down", "Pitch -"),
        Binding("right_square_bracket", "pitch_up", "Pitch +"),
        Binding("m", "go_mixer", "Mixer"),
        Binding("escape", "go_back_or_close_editor", "Back"),
        Binding("ctrl+q", "quit", "Quit"),
    ]

    def __init__(self):
        super().__init__()
        self._current_instrument: str = ""
        self._pitch_offset: int = 0
        self._samples: dict[str, list[SampleFile]] = {}
        self._sample_mgr: SampleManager | None = None
        self._generating: set[str] = set()
        # Editor state
        self._editor_mode: bool = False
        self._editor_param_idx: int = 0
        self._current_edits: SampleEdits = SampleEdits()
        self._waveform_peaks: list[float] = []
        self._sample_duration_ms: float = 0.0

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal(id="sound-design-container"):
            with Vertical(id="instrument-panel"):
                yield Label("INSTRUMENTS", id="inst-panel-label")
                yield ListView(id="instrument-list")

            with Vertical(id="detail-panel"):
                yield Static("", id="detail-header")
                yield ListView(id="variant-list")
                yield Static("", id="sample-info")
                # Browse mode widgets
                yield Label("Custom prompt:", id="prompt-label")
                yield Input(id="custom-prompt", placeholder="Enter prompt...")
                yield Static("", id="pitch-info")
                # Editor mode widgets (hidden by default)
                yield Static("", id="editor-waveform")
                yield Static("", id="editor-params")
                yield Static("", id="editor-toggles")
                yield Static("", id="editor-help")
                # Shared
                yield Static("", id="generation-status")

        yield Footer()

    def on_mount(self) -> None:
        samples_dir = Path(self.app.session.samples_dir)
        self._sample_mgr = SampleManager(samples_dir)
        self._refresh_samples()
        self._populate_instruments()
        self._set_editor_visibility(False)

    def _refresh_samples(self) -> None:
        if self._sample_mgr:
            self._samples = self._sample_mgr.scan()

    # ── Editor visibility ──

    def _set_editor_visibility(self, show: bool) -> None:
        """Toggle between browse mode and editor mode widgets."""
        # Browse mode widgets
        for wid in ("#prompt-label", "#custom-prompt", "#pitch-info"):
            try:
                self.query_one(wid).display = not show
            except Exception:
                pass
        # Editor mode widgets
        for wid in ("#editor-waveform", "#editor-params", "#editor-toggles", "#editor-help"):
            try:
                self.query_one(wid).display = show
            except Exception:
                pass

    # ── Editor display ──

    def _render_editor(self) -> None:
        """Update all editor widgets with current edits state."""
        # Waveform
        wf = self.query_one("#editor-waveform", Static)
        if self._waveform_peaks:
            wf_str = render_waveform(self._waveform_peaks, width=50)
            wf.update(f"[dim]{wf_str}[/dim]")
        else:
            wf.update("[dim]No waveform[/dim]")

        # Parameters
        lines = []
        for i, (attr, label, _fine, _coarse, vmin, vmax, fmt) in enumerate(EDITOR_PARAMS):
            value = getattr(self._current_edits, attr)
            cursor = "[bold cyan]>[/bold cyan]" if i == self._editor_param_idx else " "
            bar = _render_slider(value, vmin, vmax)
            lines.append(f" {cursor} {label:<11} {bar}  {fmt(value)}")
        self.query_one("#editor-params", Static).update("\n".join(lines))

        # Toggles
        rev = "[bold cyan][x][/bold cyan]" if self._current_edits.reverse else "[ ]"
        nrm = "[bold cyan][x][/bold cyan]" if self._current_edits.normalize else "[ ]"
        has_edits = not self._current_edits.is_default()
        edits_indicator = " [yellow]*edited[/yellow]" if has_edits else ""
        self.query_one("#editor-toggles", Static).update(
            f"   {rev} Reverse    {nrm} Normalize{edits_indicator}"
        )

        # Help
        self.query_one("#editor-help", Static).update(
            "[dim]up/dn:param  lt/rt:adjust  shift:coarse  n:normalize  v:reverse  space:play  e/esc:close[/dim]"
        )

    def _load_edits_for_instrument(self) -> None:
        """Load edits from session for current instrument."""
        self._current_edits = self.app.session.get_edits(self._current_instrument)
        self._editor_param_idx = 0

    def _save_edits(self) -> None:
        """Save current edits to session."""
        self.app.session.set_edits(self._current_instrument, self._current_edits)
        self._auto_save()

    # ── Waveform loading ──

    def _load_waveform(self) -> None:
        """Kick off async waveform extraction for current sample."""
        sample_path = self._get_current_sample_path()
        if sample_path:
            self.app._load_waveform_worker(self, sample_path)
        else:
            self._waveform_peaks = []
            self._sample_duration_ms = 0.0
            if self._editor_mode:
                self._render_editor()

    def on_waveform_loaded(self, peaks: list[float], duration_ms: float) -> None:
        """Callback from app worker when waveform is ready."""
        self._waveform_peaks = peaks
        self._sample_duration_ms = duration_ms
        if self._editor_mode:
            self._render_editor()

    def _get_current_sample_path(self) -> str | None:
        """Get path of currently highlighted variant."""
        variant_list = self.query_one("#variant-list", ListView)
        if not variant_list.highlighted_child or not variant_list.highlighted_child.name:
            return None
        filename = variant_list.highlighted_child.name
        samples = self._samples.get(self._current_instrument, [])
        sample = next((s for s in samples if s.filename == filename), None)
        return str(sample.path) if sample else None

    # ── Instrument list ──

    def _populate_instruments(self, restore_current: bool = True) -> None:
        """Build instrument list. Preserves current instrument selection."""
        saved_instrument = self._current_instrument

        inst_list = self.query_one("#instrument-list", ListView)
        inst_list.clear()

        groups = [
            ("drums", DRUM_INSTRUMENTS),
            ("pitched", PITCHED_INSTRUMENTS),
            ("textures", TEXTURE_INSTRUMENTS),
        ]

        target_index = None
        item_idx = 0

        for group_name, instruments in groups:
            inst_list.append(ListItem(Label(f"-- {group_name} --"), disabled=True))
            item_idx += 1

            for inst in instruments:
                has_samples = bool(self._samples.get(inst))
                has_selection = inst in self.app.session.selections
                is_generating = inst in self._generating
                has_edits = inst in self.app.session.edits

                if is_generating:
                    dot = "[yellow]~[/]"
                elif has_samples:
                    dot = "[green]\u25cf[/]"
                else:
                    dot = "[dim]\u25cb[/]"
                star = " [yellow]\u2605[/]" if has_selection else ""
                edit_mark = " [cyan]*[/]" if has_edits else ""
                item = ListItem(Label(f"{dot} {inst}{star}{edit_mark}"), name=inst)
                inst_list.append(item)

                if inst == saved_instrument:
                    target_index = item_idx

                item_idx += 1

        # Restore selection
        if restore_current and saved_instrument and target_index is not None:
            inst_list.index = target_index
        elif not saved_instrument:
            first_inst = next(
                (i for i in ALL_INSTRUMENTS if self._samples.get(i)),
                ALL_INSTRUMENTS[0]
            )
            self._select_instrument(first_inst)
            for i, child in enumerate(inst_list.children):
                if hasattr(child, 'name') and child.name == first_inst:
                    inst_list.index = i
                    break

    def _update_instrument_indicators(self) -> None:
        """Update just the labels in the instrument list without rebuilding."""
        inst_list = self.query_one("#instrument-list", ListView)
        for child in inst_list.children:
            if not hasattr(child, 'name') or not child.name:
                continue
            inst = child.name
            has_samples = bool(self._samples.get(inst))
            has_selection = inst in self.app.session.selections
            is_generating = inst in self._generating
            has_edits = inst in self.app.session.edits

            if is_generating:
                dot = "[yellow]~[/]"
            elif has_samples:
                dot = "[green]\u25cf[/]"
            else:
                dot = "[dim]\u25cb[/]"
            star = " [yellow]\u2605[/]" if has_selection else ""
            edit_mark = " [cyan]*[/]" if has_edits else ""

            labels = child.query(Label)
            if labels:
                labels.first().update(f"{dot} {inst}{star}{edit_mark}")

    def _select_instrument(self, instrument: str) -> None:
        """Switch detail panel to show this instrument."""
        self._current_instrument = instrument
        self._pitch_offset = 0

        header = self.query_one("#detail-header", Static)
        header.update(f"[bold]{instrument.upper()}[/bold]")

        # Update prompt
        prompt_input = self.query_one("#custom-prompt", Input)
        custom = self.app.session.prompts.get(instrument, "")
        if custom:
            prompt_input.value = custom
        else:
            default = self._sample_mgr.get_prompt_for_instrument(
                instrument, self.app.session.genre
            ) if self._sample_mgr else ""
            prompt_input.value = default

        # Pitch info
        is_pitched = instrument not in DRUM_INSTRUMENTS
        pitch_info = self.query_one("#pitch-info", Static)
        if is_pitched:
            pitch_info.update(f"Pitch preview: {pitch_label(self._pitch_offset)}  ( [ / ] to change)")
        else:
            pitch_info.update("")

        # Load edits for this instrument
        self._load_edits_for_instrument()
        if self._editor_mode:
            self._load_waveform()
            self._render_editor()

        self._refresh_variant_list()

    # ── Variant list ──

    def _refresh_variant_list(self) -> None:
        variant_list = self.query_one("#variant-list", ListView)
        variant_list.clear()

        samples = self._samples.get(self._current_instrument, [])
        selected = self.app.session.selections.get(self._current_instrument)

        if not samples:
            msg = "[dim]Generating...[/dim]" if self._current_instrument in self._generating else "[dim]No samples. Press 'g' to generate, 'a' for all missing.[/dim]"
            variant_list.append(ListItem(Label(msg)))
            self.query_one("#sample-info", Static).update("")
            return

        for sample in samples:
            star = "[yellow]\u2605[/] " if sample.filename == selected else "  "
            item = ListItem(Label(f"{star}{sample.filename}"), name=sample.filename)
            variant_list.append(item)

        if samples:
            self._update_sample_info(samples[0])

    def _update_sample_info(self, sample: SampleFile) -> None:
        info = self.query_one("#sample-info", Static)
        dur = f"{sample.duration_estimate:.1f}s" if sample.duration_estimate else "?"
        info.update(f"File: {format_size(sample.size_bytes)} | ~{dur}")

    # ── Event handlers ──

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        lv = event.list_view
        if lv.id == "instrument-list":
            if event.item.name:
                self._select_instrument(event.item.name)
        elif lv.id == "variant-list":
            self.action_select_variant()

    def on_list_view_highlighted(self, event: ListView.Highlighted) -> None:
        """Update info on cursor move in variant list. Auto-play."""
        if event.list_view.id == "instrument-list":
            if event.item and event.item.name:
                self._select_instrument(event.item.name)
            return

        if event.list_view.id != "variant-list" or not event.item:
            return
        filename = event.item.name
        if not filename:
            return

        samples = self._samples.get(self._current_instrument, [])
        sample = next((s for s in samples if s.filename == filename), None)
        if sample:
            self._update_sample_info(sample)
            # If editor mode, reload waveform for new variant
            if self._editor_mode:
                self._load_waveform()
            pitch = self._pitch_offset if self._current_instrument not in DRUM_INSTRUMENTS else 0
            self._play_current_sample(str(sample.path), pitch)

    def _play_current_sample(self, path: str, pitch: int = 0) -> None:
        """Play sample, applying edits if in editor mode and edits exist."""
        if self._editor_mode and not self._current_edits.is_default():
            self.app.play_sample_with_edits(
                path, self._current_edits, self._sample_duration_ms, pitch
            )
        else:
            self.app.play_sample(path, pitch)

    # ── Key handler for editor mode ──

    def on_key(self, event: Key) -> None:
        """Intercept keys when in editor mode."""
        if not self._editor_mode:
            return

        # Don't intercept if focused on input
        if isinstance(self.app.focused, Input):
            return

        key = event.key

        if key == "n":
            self._current_edits.normalize = not self._current_edits.normalize
            self._save_edits()
            self._render_editor()
            event.prevent_default()
            event.stop()
            return

        if key == "v":
            self._current_edits.reverse = not self._current_edits.reverse
            self._save_edits()
            self._render_editor()
            event.prevent_default()
            event.stop()
            return

        if key == "up":
            self._editor_param_idx = max(0, self._editor_param_idx - 1)
            self._render_editor()
            event.prevent_default()
            event.stop()
            return

        if key == "down":
            self._editor_param_idx = min(len(EDITOR_PARAMS) - 1, self._editor_param_idx + 1)
            self._render_editor()
            event.prevent_default()
            event.stop()
            return

        if key in ("left", "right", "shift+left", "shift+right"):
            self._adjust_param(key)
            event.prevent_default()
            event.stop()
            return

    def _adjust_param(self, key: str) -> None:
        """Adjust the currently selected editor parameter."""
        attr, _label, fine_step, coarse_step, vmin, vmax, _fmt = EDITOR_PARAMS[self._editor_param_idx]
        current = getattr(self._current_edits, attr)

        is_coarse = "shift" in key
        step = coarse_step if is_coarse else fine_step
        direction = 1 if "right" in key else -1

        new_val = current + step * direction
        # Clamp
        if isinstance(current, float):
            new_val = max(float(vmin), min(float(vmax), float(new_val)))
        else:
            new_val = max(vmin, min(vmax, int(new_val)))

        setattr(self._current_edits, attr, new_val)
        self._save_edits()
        self._render_editor()
        self._update_instrument_indicators()

    # ── Actions ──

    def action_toggle_editor(self) -> None:
        """Toggle sample editor mode."""
        if isinstance(self.app.focused, Input):
            return
        self._editor_mode = not self._editor_mode
        self._set_editor_visibility(self._editor_mode)
        if self._editor_mode:
            self._load_edits_for_instrument()
            self._load_waveform()
            self._render_editor()
            self._set_status("Editor ON -- arrows adjust, space to preview")
        else:
            self._set_status("")

    def action_play_stop(self) -> None:
        if self.app.player.is_playing:
            self.app.stop_playback()
            return
        sample_path = self._get_current_sample_path()
        if sample_path:
            pitch = self._pitch_offset if self._current_instrument not in DRUM_INSTRUMENTS else 0
            self._play_current_sample(sample_path, pitch)

    def action_select_variant(self) -> None:
        variant_list = self.query_one("#variant-list", ListView)
        if not variant_list.highlighted_child or not variant_list.highlighted_child.name:
            return
        filename = variant_list.highlighted_child.name
        self.app.session.selections[self._current_instrument] = filename
        self._auto_save()
        self._refresh_variant_list()
        self._update_instrument_indicators()
        self._set_status(f"Selected {filename} for {self._current_instrument}")

    def action_generate(self) -> None:
        if isinstance(self.app.focused, Input):
            return
        self._generate_for_instrument(self._current_instrument)

    def _generate_for_instrument(self, instrument: str) -> None:
        """Kick off generation for a single instrument."""
        prompt = ""
        if instrument == self._current_instrument:
            prompt = self.query_one("#custom-prompt", Input).value.strip()
        if not prompt:
            prompt = self.app.session.prompts.get(instrument, "")
        if not prompt and self._sample_mgr:
            prompt = self._sample_mgr.get_prompt_for_instrument(
                instrument, self.app.session.genre
            )
        if not prompt:
            self._set_status(f"No prompt for {instrument}")
            return

        self.app.session.prompts[instrument] = prompt
        self._generating.add(instrument)
        self._update_instrument_indicators()
        if instrument == self._current_instrument:
            self._refresh_variant_list()
        self._set_status(f"Generating {instrument}...")

        is_drum = instrument in DRUM_INSTRUMENTS
        if is_drum:
            self.app.generate_drum_sample(prompt, instrument)
        else:
            self.app.generate_instrument_sample(prompt, instrument, self.app.session.genre)

    def action_generate_all_missing(self) -> None:
        """Generate samples for all instruments that have no files."""
        if isinstance(self.app.focused, Input):
            return
        missing = [
            inst for inst in ALL_INSTRUMENTS
            if not self._samples.get(inst) and inst not in self._generating
        ]
        if not missing:
            self._set_status("All instruments have samples")
            return

        self._set_status(f"Generating {len(missing)} missing instruments...")
        for inst in missing:
            self._generate_for_instrument(inst)

    def action_reroll(self) -> None:
        if isinstance(self.app.focused, Input):
            return
        variant_list = self.query_one("#variant-list", ListView)
        if not variant_list.highlighted_child or not variant_list.highlighted_child.name:
            return
        filename = variant_list.highlighted_child.name
        samples = self._samples.get(self._current_instrument, [])
        sample = next((s for s in samples if s.filename == filename), None)
        if sample and self._sample_mgr:
            self._sample_mgr.delete_sample(sample.path)
            self._refresh_samples()
            self._refresh_variant_list()
            self._generate_for_instrument(self._current_instrument)

    def action_delete_variant(self) -> None:
        if isinstance(self.app.focused, Input):
            return
        variant_list = self.query_one("#variant-list", ListView)
        if not variant_list.highlighted_child or not variant_list.highlighted_child.name:
            return
        filename = variant_list.highlighted_child.name
        samples = self._samples.get(self._current_instrument, [])
        sample = next((s for s in samples if s.filename == filename), None)
        if sample and self._sample_mgr:
            self.app.stop_playback()
            self._sample_mgr.delete_sample(sample.path)
            if self.app.session.selections.get(self._current_instrument) == filename:
                del self.app.session.selections[self._current_instrument]
            self._refresh_samples()
            self._refresh_variant_list()
            self._update_instrument_indicators()
            self._set_status(f"Deleted {filename}")

    def action_next_instrument(self) -> None:
        self._move_instrument(1)

    def action_prev_instrument(self) -> None:
        self._move_instrument(-1)

    def _move_instrument(self, direction: int) -> None:
        if not self._current_instrument:
            return
        try:
            idx = ALL_INSTRUMENTS.index(self._current_instrument)
        except ValueError:
            return
        idx = (idx + direction) % len(ALL_INSTRUMENTS)
        new_inst = ALL_INSTRUMENTS[idx]
        self._select_instrument(new_inst)

        inst_list = self.query_one("#instrument-list", ListView)
        for i, child in enumerate(inst_list.children):
            if hasattr(child, 'name') and child.name == new_inst:
                inst_list.index = i
                break

    def action_pitch_down(self) -> None:
        if self._editor_mode or self._current_instrument in DRUM_INSTRUMENTS:
            return
        self._pitch_offset -= 1
        self.query_one("#pitch-info", Static).update(
            f"Pitch preview: {pitch_label(self._pitch_offset)}  ( [ / ] to change)"
        )

    def action_pitch_up(self) -> None:
        if self._editor_mode or self._current_instrument in DRUM_INSTRUMENTS:
            return
        self._pitch_offset += 1
        self.query_one("#pitch-info", Static).update(
            f"Pitch preview: {pitch_label(self._pitch_offset)}  ( [ / ] to change)"
        )

    def action_go_mixer(self) -> None:
        if isinstance(self.app.focused, Input):
            return
        from tui.screens.mixer import MixerScreen
        self.app.push_screen(MixerScreen())

    def action_go_back_or_close_editor(self) -> None:
        """Escape closes editor first, then goes back."""
        if self._editor_mode:
            self._editor_mode = False
            self._set_editor_visibility(False)
            self._set_status("")
        else:
            self.app.pop_screen()

    # ── Helpers ──

    def _set_status(self, msg: str) -> None:
        self.query_one("#generation-status", Static).update(msg)

    def _auto_save(self) -> None:
        if self.app.session.name:
            self.app.session_mgr.save(self.app.session)

    def on_generation_complete(self, instrument: str) -> None:
        """Called by app when sample generation finishes."""
        self._generating.discard(instrument)
        self._refresh_samples()

        if instrument == self._current_instrument:
            self._refresh_variant_list()
            samples = self._samples.get(instrument, [])
            if samples:
                newest = samples[-1]
                pitch = self._pitch_offset if instrument not in DRUM_INSTRUMENTS else 0
                self._play_current_sample(str(newest.path), pitch)
                if self._editor_mode:
                    self._load_waveform()

        self._update_instrument_indicators()

        if self._generating:
            self._set_status(f"Generated {instrument} | {len(self._generating)} still generating...")
        else:
            self._set_status(f"Generated {instrument}")
