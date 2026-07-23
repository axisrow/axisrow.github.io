from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from profile.sync.build_pages import PUBLIC_FILES, build_pages


class BuildPagesTests(unittest.TestCase):
    def test_artifact_is_allowlisted_and_source_is_unchanged(self) -> None:
        repo = Path(__file__).resolve().parents[2]
        with TemporaryDirectory() as tmp:
            temp = Path(tmp)
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
            output = temp / "pages"
            source_index = (repo / "index.html").read_text()

            build_pages(repo, generated, output)

            self.assertEqual((repo / "index.html").read_text(), source_index)
            self.assertEqual(
                {path.name for path in output.iterdir()},
                {*PUBLIC_FILES, "stars-history.json"},
            )
            self.assertFalse((output / "profile").exists())
            self.assertIn("generated projects", (output / "index.html").read_text())
            self.assertIn("generated stars", (output / "index.html").read_text())

    def test_rejects_parent_output_dir(self) -> None:
        # `--output-dir ..` would make the cleanup rmtree the whole repository.
        repo = Path(__file__).resolve().parents[2]
        with TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                build_pages(repo, Path(tmp) / "generated", repo.parent)

    def test_rejects_symlinked_output_dir(self) -> None:
        repo = Path(__file__).resolve().parents[2]
        with TemporaryDirectory() as tmp:
            temp = Path(tmp)
            real_target = temp / "real"
            real_target.mkdir()
            link = temp / "pages"
            link.symlink_to(real_target, target_is_directory=True)
            with self.assertRaises(ValueError):
                build_pages(repo, temp / "generated", link)

    def test_rejects_source_descendant_as_output_dir(self) -> None:
        # A descendant of the site root (sources, .git, .build) must never be
        # the cleanup target, even though it is neither the root nor an ancestor.
        repo = Path(__file__).resolve().parents[2]
        for descendant in ("profile", ".git", ".build"):
            with self.subTest(descendant=descendant):
                with self.assertRaises(ValueError):
                    build_pages(repo, repo / "generated", repo / descendant)


if __name__ == "__main__":
    unittest.main()
