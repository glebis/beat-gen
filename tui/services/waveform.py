"""Waveform extraction and rendering via ffmpeg."""

import asyncio
import struct

WAVEFORM_BLOCKS = "▁▂▃▄▅▆▇█"


async def get_waveform(path: str, bins: int = 50) -> list[float]:
    """Extract peak envelope from audio file, return list of 0-1 values."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "4000", "pipe:1",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    raw, _ = await proc.communicate()

    if not raw or len(raw) < 2:
        return [0.0] * bins

    # Parse 16-bit signed LE samples
    n_samples = len(raw) // 2
    samples = struct.unpack(f"<{n_samples}h", raw[:n_samples * 2])

    # Bin into peaks
    bin_size = max(1, n_samples // bins)
    peaks = []
    for i in range(bins):
        start = i * bin_size
        end = min(start + bin_size, n_samples)
        if start >= n_samples:
            peaks.append(0.0)
        else:
            chunk = samples[start:end]
            peaks.append(max(abs(s) for s in chunk) if chunk else 0.0)

    # Normalize to 0-1
    mx = max(peaks) if peaks else 1.0
    if mx > 0:
        peaks = [p / mx for p in peaks]

    return peaks


def render_waveform(peaks: list[float], width: int = 50) -> str:
    """Render peaks as a single line of block characters."""
    chars = []
    for p in peaks[:width]:
        idx = min(int(p * (len(WAVEFORM_BLOCKS) - 1)), len(WAVEFORM_BLOCKS) - 1)
        chars.append(WAVEFORM_BLOCKS[idx])
    return "".join(chars)


async def get_duration_ms(path: str) -> float:
    """Get audio duration in milliseconds via ffprobe."""
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "quiet", "-show_entries", "format=duration",
        "-of", "csv=p=0", path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    out, _ = await proc.communicate()
    try:
        return float(out.strip()) * 1000
    except (ValueError, TypeError):
        return 0.0
