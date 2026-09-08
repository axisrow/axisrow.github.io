from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from profile.sync.generate import contributions_registry  # noqa: E402

import jinja2  # noqa: E402


def _load_cfg() -> dict:
    return json.loads((PROJECT_ROOT / "profile" / "projects.json").read_text())


def _index_html() -> str:
    return (PROJECT_ROOT / "index.html").read_text()


def _marker_block(html: str, name: str) -> str:
    """The generated content between the marker lines (what replace_marker
    swaps out), excluding the marker comments themselves."""
    start = html.index(f"<!-- PROFILE:{name}:START -->")
    start = html.index("\n", start) + 1
    end = html.index(f"<!-- PROFILE:{name}:END -->")
    return html[start:end]


class ContributionsRegistryTests(unittest.TestCase):
    """The merged-PR registry is the single source of truth for the
    merged_upstream_prs counter: the site renders the same verified set the
    counter is derived from, so they can never disagree."""

    def test_registry_keys_are_unique(self) -> None:
        cfg = _load_cfg()
        keys = [(c["repo"], c["pr_number"]) for c in cfg["contributions"]]
        self.assertEqual(len(keys), len(set(keys)), "registry keys must be unique repo+pr_number")

    def test_counter_is_derived_not_hardcoded(self) -> None:
        cfg = _load_cfg()
        # The hand-maintained counter must not exist in projects.json —
        # generate.py derives it from the registry at render time.
        self.assertNotIn("merged_upstream_prs", cfg["stats"])
        registry = contributions_registry(cfg)
        self.assertGreater(registry["merged_count"], 0)
        self.assertEqual(registry["merged_count"], sum(1 for c in cfg["contributions"] if c["merged"]))

    def test_roles_are_validated(self) -> None:
        cfg = _load_cfg()
        for entry in cfg["contributions"]:
            self.assertIn(entry["role"], ("author", "coauthor"))

    def test_featured_is_a_subset_of_merged(self) -> None:
        registry = contributions_registry(_load_cfg())
        for entry in registry["featured"]:
            self.assertTrue(entry["merged"])
            self.assertIn(entry["pr_number"], [m["pr_number"] for m in registry["merged"]])

    def test_duplicate_keys_raise(self) -> None:
        cfg = _load_cfg()
        cfg["contributions"].append(dict(cfg["contributions"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate contribution key"):
            contributions_registry(cfg)

    def test_committed_registry_block_is_reproducible_by_the_generator(self) -> None:
        """Everything between the PROFILE:CONTRIBUTIONS markers must match the
        template render from projects.json — a hand-edited block would be
        silently overwritten on the next daily sync."""
        cfg = _load_cfg()
        registry = contributions_registry(cfg)
        cfg["stats"] = dict(cfg["stats"], merged_upstream_prs=registry["merged_count"])
        cfg["contributions_registry"] = registry
        env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(str(PROJECT_ROOT / "profile" / "sync" / "templates")),
            keep_trailing_newline=True,
            trim_blocks=True,
            lstrip_blocks=True,
            autoescape=True,
        )
        rendered = env.get_template("contributions.html.j2").render(**cfg)
        # replace_marker rstrips the fragment, so only the END marker's own
        # indentation differs from the raw render.
        self.assertEqual(_marker_block(_index_html(), "CONTRIBUTIONS").rstrip(), rendered.rstrip())

    def test_rendered_registry_size_matches_the_counter(self) -> None:
        """The count the user can open (list items inside the disclosure) must
        equal the counter the page displays — same set, checked dynamically so
        no number is pinned in the test."""
        html = _marker_block(_index_html(), "CONTRIBUTIONS")
        match = re.search(r'"count":"(\d+)"', html)
        assert match is not None
        rendered_count = int(match.group(1))
        list_items = html.count("<li>")
        self.assertEqual(rendered_count, list_items)
        registry = contributions_registry(_load_cfg())
        self.assertEqual(rendered_count, registry["merged_count"])

    def test_featured_rows_in_index_match_the_registry(self) -> None:
        """The five featured proof rows must correspond 1:1 to featured
        registry entries (repo + number), so the sample and the registry can
        never drift apart."""
        html = _index_html()
        registry = contributions_registry(_load_cfg())
        for entry in registry["featured"]:
            pattern = rf'github\.com/{re.escape(entry["repo"])}/pull/{entry["pr_number"]}'
            self.assertRegex(html, pattern)
        # and conversely: every featured registry URL appears exactly once
        # outside the registry block itself.
        block = _marker_block(html, "CONTRIBUTIONS")
        outside = html.replace(block, "")
        for entry in registry["featured"]:
            url = f"https://github.com/{entry['repo']}/pull/{entry['pr_number']}"
            self.assertEqual(outside.count(url), 1)


if __name__ == "__main__":
    unittest.main()
