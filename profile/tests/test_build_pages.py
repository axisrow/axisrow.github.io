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


if __name__ == "__main__":
    unittest.main()
