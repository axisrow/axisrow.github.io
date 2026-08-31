from __future__ import annotations

import unittest
from pathlib import Path

from profile.sync.apply_site_fragments import (
    PROFILE_VALUE_KEYS,
    SUMMARY_FORMAT,
    _summary_regex,
    apply_site_fragments,
    replace_marker,
    update_contribution_stars,
)


class SiteSyncTests(unittest.TestCase):
    def setUp(self) -> None:
        self.html = """<head>
<meta content="1 merged upstream PRs · 2 stars · 3 starred projects.">
</head>
<body>
    <!-- PROFILE:PROJECTS:START -->
    <section id="projects">old</section>
    <!-- PROFILE:PROJECTS:END -->
    <span data-profile-value="stars_earned" data-target="2">2</span>
    <span data-profile-value="merged_upstream_prs" data-target="1">1</span>
    <span class="proof-stage-number"><span data-profile-value="merged_upstream_prs" data-target="1">1</span></span>
    <span data-profile-value="starred_projects" data-target="3">3</span>
    <!-- PROFILE:STARS:START -->
    <section id="stars">old</section>
    <!-- PROFILE:STARS:END -->
</body>
"""
        self.stats = {
            "stars_earned": 104,
            "merged_upstream_prs": 37,
            "starred_projects": 7,
        }

    def test_apply_is_marker_scoped_and_idempotent(self) -> None:
        projects = '    <section id="projects">new projects</section>\n'
        stars = '    <section id="stars">new stars</section>\n'
        once = apply_site_fragments(self.html, projects, stars, self.stats)
        twice = apply_site_fragments(once, projects, stars, self.stats)
        self.assertEqual(twice, once)
        self.assertIn("new projects", once)
        self.assertIn("new stars", once)
        self.assertIn('data-target="104">104</span>', once)
        self.assertEqual(once.count('data-profile-value="merged_upstream_prs" data-target="37">37'), 2)
        self.assertIn("37 merged upstream PRs · 104 stars · 7 starred projects.", once)

    def test_missing_marker_fails_without_guessing(self) -> None:
        with self.assertRaisesRegex(ValueError, "PROFILE:PROJECTS"):
            replace_marker("<main></main>", "projects", "<section></section>")

    def test_contribution_stars_update_and_failure_preserves_last_value(self) -> None:
        html = '<span class="proof-row-stars" data-contribution-repo="foo/bar">★ 7</span> <span data-contribution-repo="missing/repo">★ 8</span>'
        updated = update_contribution_stars(html, {"foo/bar": 42})
        self.assertIn('data-contribution-repo="foo/bar">★ 42</span>', updated)
        self.assertIn('data-contribution-repo="missing/repo">★ 8</span>', updated)

    def test_duplicate_marker_fails_without_partial_replacement(self) -> None:
        duplicated = self.html.replace("</body>", self.html.split("<body>", 1)[1])
        with self.assertRaisesRegex(ValueError, "PROFILE:PROJECTS"):
            replace_marker(duplicated, "projects", "<section></section>")

    def test_generated_sections_keep_the_new_visual_order_numbers(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        projects = (project_root / "sync/templates/projects.html.j2").read_text()
        stars = (project_root / "sync/templates/stars.html.j2").read_text()
        self.assertIn('<span>01</span> <span data-i18n="stars.eyebrow">Momentum</span>', stars)
        self.assertIn('<span>02</span> <span data-i18n="projects.eyebrow">Selected Work</span>', projects)

    def test_generated_sections_keep_their_effect_canvases(self) -> None:
        # The bot rewrites everything between the PROFILE markers from these
        # templates, so a canvas that lives only in index.html is destroyed on
        # the next sync. Both marker-managed sections carry one, and the site's
        # smoke test asserts the same canvases in index.html — this pins the
        # source of truth so a template edit cannot silently drop them.
        project_root = Path(__file__).resolve().parents[1]
        projects = (project_root / "sync/templates/projects.html.j2").read_text()
        stars = (project_root / "sync/templates/stars.html.j2").read_text()
        self.assertIn('data-effect="starfield"', stars)
        self.assertIn('data-effect="plasma"', projects)

    def test_summary_format_is_single_source_of_truth(self) -> None:
        # The rendered summary and its matcher must derive from SUMMARY_FORMAT,
        # and every counter must be a placeholder so adding a key can't drift them.
        for key in PROFILE_VALUE_KEYS:
            self.assertIn("{" + key + "}", SUMMARY_FORMAT)
        self.assertEqual(
            _summary_regex(SUMMARY_FORMAT),
            r"\d+\ merged\ upstream\ PRs\ ·\ \d+\ stars\ ·\ \d+\ starred\ projects\.",
        )

    def test_stars_chart_geometry_is_not_hardcoded(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        stars = (project_root / "sync/templates/stars.html.j2").read_text()
        # Geometry must come from chart_data, not duplicated literals.
        self.assertNotIn("viewBox=\"0 0 960 340\"", stars)
        self.assertNotIn("x1=\"54\" x2=\"936\"", stars)
        self.assertNotIn("y=\"322\"", stars)
        self.assertIn("viewBox=\"0 0 {{ star_history.chart.width }} {{ star_history.chart.height }}\"", stars)
        self.assertIn("{{ star_history.chart.left }}", stars)
        self.assertIn("{{ star_history.chart.width - star_history.chart.right }}", stars)
        # The crosshair's vertical extent must track the plot's top/bottom
        # edge like every other coordinate in this SVG, not hardcode the
        # pixel values that happen to match today's margins.
        self.assertNotIn('y1="22" y2="298"', stars)
        self.assertIn("{{ star_history.chart.plot_top_y }}", stars)
        self.assertIn("{{ star_history.chart.plot_bottom_y }}", stars)

    def test_committed_stars_block_is_reproducible_by_the_generator(self) -> None:
        """The committed PROFILE:STARS block must match what the generator renders.

        build_pages.py splices the generated stars.html fragment into the
        deployed copy of index.html, so a hand-edited block (stale totals,
        wrong date) is silently overwritten on the next publish. Render the
        template from the committed profile/data/stars-history.json + fork_stars
        and pin the count/date against the committed index.html block.
        """
        import json
        import re
        import sys

        project_root = Path(__file__).resolve().parents[2]
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))
        from profile.sync.generate import chart_data, make_env

        data_dir = project_root / "profile" / "data"
        history = json.loads((data_dir / "stars-history.json").read_text())
        cfg = json.loads((project_root / "profile" / "projects.json").read_text())
        fork_stars = int(cfg["stats"]["fork_stars"])
        chart = chart_data(history, fork_stars)
        render_cfg = {
            "stats": {"stars_earned": history["entries"][-1]["total"] + fork_stars},
            "star_history": {**history, "chart": chart},
        }
        env = make_env(project_root / "profile" / "sync" / "templates", autoescape=True)
        rendered = env.get_template("stars.html.j2").render(**render_cfg)

        def count_date(html: str) -> tuple[str, str]:
            m = re.search(
                r'data-i18n-vars=\'{"count":"(\d+)","endDate":"([^"]+)"}\'', html
            )
            self.assertIsNotNone(m, "stars chart desc must carry count/endDate vars")
            assert m is not None
            return m.group(1), m.group(2)

        rendered_count, rendered_date = count_date(rendered)
        index = (project_root / "index.html").read_text()
        start = index.index("<!-- PROFILE:STARS:START -->")
        end = index.index("<!-- PROFILE:STARS:END -->")
        committed_count, committed_date = count_date(index[start:end])
        self.assertEqual(committed_count, rendered_count)
        self.assertEqual(committed_date, rendered_date)

    def test_chart_data_plot_y_bounds_match_top_bottom_margins(self) -> None:
        import sys

        project_root = Path(__file__).resolve().parents[2]
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))
        from profile.sync.generate import chart_data

        history = {
            "entries": [
                {"date": "2026-01-01", "total": 0},
                {"date": "2026-06-01", "total": 50},
            ]
        }
        data = chart_data(history)
        # plot_top_y/plot_bottom_y must be derived from the same top/bottom
        # margins used everywhere else, not independently hardcoded.
        self.assertEqual(data["plot_top_y"], f"{data['top']:.1f}")
        self.assertEqual(data["plot_bottom_y"], f"{data['top'] + data['height'] - data['top'] - data['bottom']:.1f}")


if __name__ == "__main__":
    unittest.main()
