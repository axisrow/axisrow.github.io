#!/usr/bin/env python3
"""Build the minimal GitHub Pages artifact without modifying site sources."""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

_REPO_ROOT = str(Path(__file__).resolve().parents[2])
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from profile.sync.apply_site_fragments import apply_site_fragments

PUBLIC_FILES = (
    "index.html",
    "styles.css",
    "main.js",
    "effect-skins.js",
    "favicon.svg",
    "og.png",
    "mandelbrot-proof-fallback.jpg",
)


def build_pages(site_root: Path, generated_dir: Path, output_dir: Path) -> None:
    site_root = site_root.resolve()
    output_dir = output_dir.resolve()
    if output_dir == site_root:
        raise ValueError("output directory must be a dedicated build directory")

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    for relative in PUBLIC_FILES:
        source = site_root / relative
        if not source.is_file():
            raise FileNotFoundError(f"missing public source file: {relative}")
        shutil.copy2(source, output_dir / relative)

    generated_site = generated_dir / "site"
    index_path = output_dir / "index.html"
    updated = apply_site_fragments(
        index_path.read_text(),
        (generated_site / "projects.html").read_text(),
        (generated_site / "stars.html").read_text(),
        json.loads((generated_site / "stats.json").read_text()),
    )
    index_path.write_text(updated)
    shutil.copy2(
        site_root / "profile" / "data" / "stars-history.json",
        output_dir / "stars-history.json",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-root", type=Path, default=Path("."))
    parser.add_argument("--generated-dir", type=Path, default=Path(".build/profile"))
    parser.add_argument("--output-dir", type=Path, default=Path(".pages-dist"))
    args = parser.parse_args()
    build_pages(args.site_root, args.generated_dir, args.output_dir)
    print(f"built {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
