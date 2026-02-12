#!/usr/bin/env python3
"""Entry point for Beat-Gen Studio TUI."""

import sys
from pathlib import Path

# Ensure the project root is on the path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from tui.app import BeatGenStudio


def main():
    app = BeatGenStudio(project_dir=project_root)
    app.run()


if __name__ == "__main__":
    main()
