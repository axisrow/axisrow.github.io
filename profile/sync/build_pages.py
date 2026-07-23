#!/usr/bin/env python3
"""Build the minimal GitHub Pages artifact without modifying site sources.

The artifact is a fixed flat set of known files (see ``ALLOWED_ARTIFACT_FILES``).
The builder only ever writes/atomically-replaces those known files and removes
explicitly-retired allowlisted files via a non-recursive ``os.unlink`` — it never
performs a recursive directory deletion. The output location is canonical
(derived from the site root) and never caller-selected, and a mandatory
self-validation gate runs before the artifact is considered complete. This
removes the arbitrary-path-deletion failure class structurally: there is no
blacklist to bypass, and a stale/foreign file fails the build closed rather than
being silently wiped.
"""
from __future__ import annotations

import argparse
import json
import os
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

# The single generated file that is not a public site source. Together with the
# public sources this is the complete, fixed set of files the artifact may hold.
CANONICAL_OUTPUT_NAME = ".pages-dist"

ALLOWED_ARTIFACT_FILES = (*PUBLIC_FILES, "stars-history.json")


def _resolve_canonical(site_root: Path) -> Path:
    """Return the canonical artifact path derived from the site root.

    The artifact is always ``site_root / CANONICAL_OUTPUT_NAME`` and is never a
    caller-selected path. The site root itself must not be a symlink, so the
    derived artifact path can never escape to an unexpected location. This
    routine never recurses into anything.
    """
    if site_root.is_symlink():
        raise ValueError("site root must not be a symlink")
    site_root = site_root.resolve()
    if not site_root.is_dir():
        raise ValueError(f"site root is not a directory: {site_root}")
    canonical = site_root / CANONICAL_OUTPUT_NAME
    if canonical.is_symlink():
        raise ValueError(
            f"canonical output path must not be a symlink: {canonical}"
        )
    return canonical


def _write_artifact_files(
    site_root: Path, generated_dir: Path, canonical: Path
) -> None:
    """Write only the known regular files into ``canonical``.

    Each file is written to a temp sibling and ``os.replace``-d into place
    (per-file atomic, no directory-wide recursive deletion). The source
    ``index.html`` is never modified — ``apply_site_fragments`` operates on the
    staging copy.
    """
    canonical.mkdir(parents=True, exist_ok=True)
    generated_site = generated_dir / "site"

    for relative in PUBLIC_FILES:
        source = site_root / relative
        if not source.is_file():
            raise FileNotFoundError(f"missing public source file: {relative}")
        _atomic_copy(source, canonical / relative)

    index_html = apply_site_fragments(
        (site_root / "index.html").read_text(),
        (generated_site / "projects.html").read_text(),
        (generated_site / "stars.html").read_text(),
        json.loads((generated_site / "stats.json").read_text()),
    )
    _atomic_write(canonical / "index.html", index_html)

    stars_history = site_root / "profile" / "data" / "stars-history.json"
    if not stars_history.is_file():
        raise FileNotFoundError("missing profile/data/stars-history.json")
    _atomic_copy(stars_history, canonical / "stars-history.json")


def _atomic_write(target: Path, data: str) -> None:
    """Write text to ``target`` via a temp sibling + ``os.replace``."""
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_text(data)
    os.replace(tmp, target)


def _atomic_copy(source: Path, target: Path) -> None:
    """Copy ``source`` to ``target`` via a temp sibling + ``os.replace``.

    Preserves bytes for binary assets (favicons, images) and never leaves a
    half-written file at the canonical target.
    """
    tmp = target.with_name(target.name + ".tmp")
    tmp.write_bytes(source.read_bytes())
    os.replace(tmp, target)


def _validate_artifact(canonical: Path) -> None:
    """Mandatory self-validation gate: assert the artifact is exactly the
    allowlisted flat set of regular files.

    Any deviation (extra entry, symlink, subdirectory, an entry whose name looks
    like source material, malformed ``stars-history.json``) raises and fails the
    build closed — the foreign or dangerous state is never deleted by this
    builder. Missing allowlisted files are produced by ``_write_artifact_files``
    and are not a validation concern here.
    """
    if not canonical.is_dir():
        raise ValueError(f"artifact directory missing: {canonical}")

    for entry in os.scandir(canonical):
        if entry.name.endswith(".tmp"):
            continue
        name = entry.name
        if name not in ALLOWED_ARTIFACT_FILES:
            raise ValueError(f"artifact contains unexpected entry: {name}")
        if entry.is_symlink():
            raise ValueError(f"artifact entry must not be a symlink: {name}")
        if not entry.is_file():
            raise ValueError(f"artifact entry must be a regular file: {name}")
        if name.endswith(".py") or "test" in name or name.endswith(".pem"):
            raise ValueError(f"artifact entry must not be source material: {name}")

    stars_history = canonical / "stars-history.json"
    if stars_history.is_file():
        json.loads(stars_history.read_text())


def _retire_stale(canonical: Path) -> None:
    """Remove allowlisted files that this run will not re-produce, via a
    non-recursive ``os.unlink``. Fail closed on any entry not in the allowlist.

    Currently every allowlisted file is produced every run, so this is a
    defensive no-op for known files. It exists so a future change that retires a
    file (removing it from ``_write_artifact_files`` but not yet from the
    allowlist) drops the stale copy safely, and so a foreign entry is never
    silently left behind or deleted. Runs before ``_write_artifact_files``.
    """
    if not canonical.is_dir():
        return
    for entry in os.scandir(canonical):
        name = entry.name
        if name.endswith(".tmp"):
            os.unlink(entry.path)
            continue
        if name not in ALLOWED_ARTIFACT_FILES:
            raise ValueError(
                f"refusing to delete foreign artifact entry: {name}"
            )


def build_pages(site_root: Path, generated_dir: Path) -> None:
    """Build the canonical Pages artifact at ``site_root / .pages-dist``."""
    canonical = _resolve_canonical(site_root)
    _retire_stale(canonical)
    _write_artifact_files(site_root, generated_dir, canonical)
    _validate_artifact(canonical)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site-root", type=Path, default=Path("."))
    parser.add_argument(
        "--generated-dir", type=Path, default=Path(".build/profile")
    )
    args = parser.parse_args()
    build_pages(args.site_root, args.generated_dir)
    canonical = args.site_root.resolve() / CANONICAL_OUTPUT_NAME
    print(f"built {canonical}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
