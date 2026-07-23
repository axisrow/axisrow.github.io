from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from profile.sync.build_pages import (
    ALLOWED_ARTIFACT_FILES,
    CANONICAL_OUTPUT_NAME,
    PUBLIC_FILES,
    build_pages,
)
from profile.sync import build_pages as build_pages_module

REPO = Path(__file__).resolve().parents[2]


def _seed_site_root(temp: Path) -> Path:
    """Make a temp directory behave as the real site root.

    The real public source files are copied in, a fake ``generated/site``
    fragment set and a fake ``profile/data/stars-history.json`` are written, and
    the canonical output materializes inside this temp root.
    """
    for relative in PUBLIC_FILES:
        source = REPO / relative
        if source.is_file():
            (temp / relative).write_bytes(source.read_bytes())
    # index.html must contain the markers/values apply_site_fragments expects.
    (temp / "index.html").write_text((REPO / "index.html").read_text())

    generated = temp / "generated"
    site = generated / "site"
    site.mkdir(parents=True)
    (site / "projects.html").write_text("<section>generated projects</section>\n")
    (site / "stars.html").write_text("<section>generated stars</section>\n")
    stats = {
        "stars_earned": 100,
        "merged_upstream_prs": 30,
        "starred_projects": 8,
    }
    (site / "stats.json").write_text(json.dumps(stats))

    data = temp / "profile" / "data"
    data.mkdir(parents=True)
    (data / "stars-history.json").write_text(json.dumps({"history": [1, 2, 3]}))
    return temp


class BuildPagesTests(unittest.TestCase):
    def test_artifact_is_allowlisted_and_source_is_unchanged(self) -> None:
        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            source_index = (site_root / "index.html").read_text()

            build_pages(site_root, site_root / "generated")

            canonical = site_root / CANONICAL_OUTPUT_NAME
            # Source index.html is never modified by the builder.
            self.assertEqual((site_root / "index.html").read_text(), source_index)
            self.assertEqual(
                {path.name for path in canonical.iterdir()},
                set(ALLOWED_ARTIFACT_FILES),
            )
            self.assertFalse((canonical / "profile").exists())
            self.assertIn(
                "generated projects", (canonical / "index.html").read_text()
            )
            self.assertIn("generated stars", (canonical / "index.html").read_text())

    def test_rejects_symlinked_site_root(self) -> None:
        with TemporaryDirectory() as tmp:
            temp = Path(tmp)
            real = temp / "real"
            real.mkdir()
            _seed_site_root(real)
            link = temp / "link"
            link.symlink_to(real, target_is_directory=True)
            with self.assertRaises(ValueError):
                build_pages(link, link / "generated")

    def test_rejects_canonical_output_symlink(self) -> None:
        # If the derived canonical path is a symlink, refuse to materialize.
        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            canonical = site_root / CANONICAL_OUTPUT_NAME
            real = site_root / "real-dist"
            real.mkdir()
            canonical.symlink_to(real, target_is_directory=True)
            with self.assertRaises(ValueError):
                build_pages(site_root, site_root / "generated")

    def test_rejects_missing_site_root(self) -> None:
        with TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                build_pages(Path(tmp) / "does-not-exist", Path(tmp) / "generated")

    def test_no_recursive_deletion(self) -> None:
        # Accept gate: the builder module must not reference recursive deletion
        # at all, and a build run must never call shutil.rmtree on the canonical
        # path or any argument.
        import inspect

        source = inspect.getsource(build_pages_module)
        self.assertNotIn("rmtree", source)
        self.assertNotIn("shutil", source)

        import shutil
        from unittest import mock

        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            canonical = site_root / CANONICAL_OUTPUT_NAME
            canonical.mkdir()
            # A pre-existing allowlisted file is overwritten in place, not
            # removed recursively. Plant one to prove no rmtree happens.
            (canonical / "index.html").write_text("stale")

            with mock.patch.object(
                shutil, "rmtree", autospec=True
            ) as mock_rmtree:
                build_pages(site_root, site_root / "generated")
            mock_rmtree.assert_not_called()

    def test_validate_rejects_extra_file(self) -> None:
        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            canonical = site_root / CANONICAL_OUTPUT_NAME
            canonical.mkdir()
            (canonical / "foreign.txt").write_text("boom")
            with self.assertRaises(ValueError):
                build_pages(site_root, site_root / "generated")
            # The foreign file is NOT deleted by the build.
            self.assertTrue((canonical / "foreign.txt").exists())

    def test_validate_rejects_symlink_entry(self) -> None:
        # _validate_artifact rejects a symlinked allowlisted entry. Write it
        # directly and call the validator (the build's write step would replace
        # allowlisted files, so the validator is exercised in isolation).
        from profile.sync.build_pages import _validate_artifact

        with TemporaryDirectory() as tmp:
            temp = Path(tmp)
            canonical = temp / CANONICAL_OUTPUT_NAME
            canonical.mkdir()
            target = temp / "outside"
            target.write_text("secret")
            (canonical / "styles.css").symlink_to(target)
            with self.assertRaises(ValueError):
                _validate_artifact(canonical)

    def test_validate_rejects_source_material_names(self) -> None:
        # _validate_artifact rejects entries whose names look like source
        # material (.py / *test* / .pem). These are not allowlisted, so they are
        # also caught by the allowlist check; exercise the validator directly to
        # pin the name-filter contract.
        from profile.sync.build_pages import _validate_artifact

        for bad in ("evil.py", "run_tests", "key.pem"):
            with self.subTest(name=bad):
                with TemporaryDirectory() as tmp:
                    temp = Path(tmp)
                    canonical = temp / CANONICAL_OUTPUT_NAME
                    canonical.mkdir()
                    (canonical / bad).write_text("x")
                    with self.assertRaises(ValueError):
                        _validate_artifact(canonical)

    def test_validate_rejects_missing_file(self) -> None:
        # The gate must assert the EXACT allowlist set: a missing allowlisted
        # file (e.g. left absent after a crashed os.replace) must fail closed,
        # not pass because only present entries are checked.
        from profile.sync.build_pages import _validate_artifact

        with TemporaryDirectory() as tmp:
            temp = Path(tmp)
            canonical = temp / CANONICAL_OUTPUT_NAME
            canonical.mkdir()
            # Present only a strict subset of the allowlist — all valid names,
            # all regular files, no symlinks, no extras. The old validator
            # accepted this; the fixed one must reject it.
            for name in ALLOWED_ARTIFACT_FILES:
                (canonical / name).write_text("ok" if name != "stars-history.json" else "{}")
            # Remove one allowlisted file to make the set incomplete.
            (canonical / "index.html").unlink()
            with self.assertRaises(ValueError):
                _validate_artifact(canonical)

    def test_unknown_entry_fails_closed(self) -> None:
        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            canonical = site_root / CANONICAL_OUTPUT_NAME
            canonical.mkdir()
            foreign = canonical / "leftover.dat"
            foreign.write_text("persist")
            with self.assertRaises(ValueError):
                build_pages(site_root, site_root / "generated")
            self.assertTrue(foreign.exists())

    def test_retire_stale_unlinks_known_only(self) -> None:
        # A stale allowlisted file is overwritten (the run re-produces it); a
        # foreign file causes a raise and is left untouched.
        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            canonical = site_root / CANONICAL_OUTPUT_NAME
            canonical.mkdir()
            (canonical / "og.png").write_bytes(b"stale")
            (canonical / "foreign.bin").write_bytes(b"keep me")
            with self.assertRaises(ValueError):
                build_pages(site_root, site_root / "generated")
            # foreign entry was never deleted.
            self.assertTrue((canonical / "foreign.bin").exists())

    def test_idempotent(self) -> None:
        with TemporaryDirectory() as tmp:
            site_root = _seed_site_root(Path(tmp))
            build_pages(site_root, site_root / "generated")
            first = sorted(
                p.name for p in (site_root / CANONICAL_OUTPUT_NAME).iterdir()
            )
            build_pages(site_root, site_root / "generated")
            second = sorted(
                p.name for p in (site_root / CANONICAL_OUTPUT_NAME).iterdir()
            )
            self.assertEqual(first, second)
            self.assertEqual(set(first), set(ALLOWED_ARTIFACT_FILES))

    def test_allowlist_contract(self) -> None:
        self.assertEqual(
            set(ALLOWED_ARTIFACT_FILES), set(PUBLIC_FILES) | {"stars-history.json"}
        )


if __name__ == "__main__":
    unittest.main()
