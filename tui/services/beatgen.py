"""Subprocess wrapper for the beat-gen CLI."""

import asyncio
import json
from pathlib import Path
from typing import Callable


class BeatGen:
    def __init__(self, project_dir: str | Path):
        self.project_dir = Path(project_dir)
        self.bin = self.project_dir / "bin" / "beat-gen.js"

    async def generate_arrangement(self, genre: str, key: str, bpm: int, **params) -> dict:
        """Run `track --json --quiet`, return parsed pattern dict."""
        args = ["node", str(self.bin), "track", genre, "--key", key, "--bpm", str(bpm),
                "--json", "--quiet"]

        for param in ("seed", "variety", "density", "weirdness", "duration"):
            if param in params and params[param] is not None:
                args.extend([f"--{param}", str(params[param])])

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.project_dir),
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"beat-gen track failed: {stderr.decode()}")

        return json.loads(stdout.decode())

    async def generate_sample(self, prompt: str, output_dir: str | Path,
                              variants: int = 1) -> list[Path]:
        """Run `sample` command for drum samples, return created file paths."""
        output_dir = Path(output_dir)
        before = set(output_dir.iterdir()) if output_dir.exists() else set()

        args = ["node", str(self.bin), "sample", prompt,
                "-o", str(output_dir), "--variants", str(variants)]

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.project_dir),
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"beat-gen sample failed: {stderr.decode()}")

        after = set(output_dir.iterdir()) if output_dir.exists() else set()
        return sorted(after - before)

    async def generate_instrument_sample(self, prompt: str, output_dir: str | Path,
                                         instrument: str, genre: str,
                                         variants: int = 1) -> list[Path]:
        """Run `sample --instruments` for pitched/texture instruments."""
        output_dir = Path(output_dir)
        before = set(output_dir.iterdir()) if output_dir.exists() else set()

        args = ["node", str(self.bin), "sample",
                "--instruments", "--genre", genre,
                "-o", str(output_dir), "--variants", str(variants)]

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.project_dir),
        )
        _, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(f"beat-gen sample --instruments failed: {stderr.decode()}")

        after = set(output_dir.iterdir()) if output_dir.exists() else set()
        return sorted(after - before)

    async def render_fulltrack(self, genre: str, key: str, bpm: int,
                               samples_dir: str | Path, output_dir: str | Path,
                               on_progress: Callable[[str], None] | None = None,
                               mix_config: str | Path | None = None,
                               **params) -> Path:
        """Run `fulltrack`, return mix.wav path."""
        args = ["node", str(self.bin), "fulltrack", genre,
                "--key", key, "--bpm", str(bpm),
                "--samples", str(samples_dir)]

        for param in ("seed", "variety", "density", "weirdness", "duration", "preset", "variants"):
            if param in params and params[param] is not None:
                args.extend([f"--{param}", str(params[param])])

        if mix_config:
            args.extend(["--mix", str(mix_config)])

        proc = await asyncio.create_subprocess_exec(
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=str(self.project_dir),
        )

        # Read stdout/stderr for progress.
        # The audio renderer uses \r (no newline) for progress updates,
        # so we read raw chunks and split on both \r and \n.
        async def _read_stream(stream):
            buf = b""
            while stream:
                chunk = await stream.read(256)
                if not chunk:
                    break
                buf += chunk
                # Split on \r or \n
                while b"\r" in buf or b"\n" in buf:
                    # Find earliest separator
                    r_pos = buf.find(b"\r")
                    n_pos = buf.find(b"\n")
                    if r_pos == -1:
                        pos = n_pos
                    elif n_pos == -1:
                        pos = r_pos
                    else:
                        pos = min(r_pos, n_pos)
                    line = buf[:pos].decode(errors="replace").strip()
                    buf = buf[pos + 1:]
                    if line and on_progress:
                        on_progress(line)
            # Flush remaining
            if buf and on_progress:
                on_progress(buf.decode(errors="replace").strip())

        await asyncio.gather(
            _read_stream(proc.stdout),
            _read_stream(proc.stderr),
        )
        await proc.wait()

        if proc.returncode != 0:
            raise RuntimeError(f"fulltrack failed (exit code {proc.returncode})")

        # Find the output directory
        output_base = self.project_dir / "data" / "output"
        pattern = f"{genre}-{bpm}bpm-{key}m"
        candidates = sorted(output_base.glob(f"{pattern}*"), key=lambda p: p.stat().st_mtime, reverse=True)
        if candidates:
            mix = candidates[0] / "mix.wav"
            if mix.exists():
                return mix

        raise RuntimeError("Could not find rendered mix.wav")
