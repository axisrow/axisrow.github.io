from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from profile.sync import discover_contributions  # noqa: E402
from profile.sync.generate import contributions_registry  # noqa: E402

SEARCH_URL = "search/issues"
NEW_PULL_URL = "repos/Untrivial-ai/agent-orchestrator/pulls/3905"


def _search_payload(items: list[dict]) -> dict:
    return {"total_count": len(items), "items": items}


def _search_item(repo: str, number: int) -> dict:
    return {"repository_url": f"https://api.github.com/repos/{repo}", "number": number}


def _pull(merged: bool = True) -> dict:
    return {
        "merged": merged,
        "merged_at": "2026-09-16T16:59:19Z",
        "title": "fix(scm): make PR attribution strict and stable",
    }


class DiscoveryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.registry = Path(self.tmp.name) / "projects.json"
        base = {
            "handle": "axisrow",
            "contributions": [
                {
                    "repo": "steipete/CodexBar",
                    "pr_number": 2814,
                    "title": "existing entry",
                    "merged": True,
                    "merged_at": "2026-08-13",
                    "role": "author",
                    "featured": False,
                }
            ],
        }
        self.original = json.dumps(base, ensure_ascii=False, indent=2) + "\n"
        self.registry.write_text(self.original)

    def _run(self, api_get) -> tuple[str, str]:
        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch.object(discover_contributions.github, "api_get", side_effect=api_get):
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code = discover_contributions.main(["--registry", str(self.registry)])
        self.assertEqual(code, 0)
        return stdout.getvalue(), stderr.getvalue()

    def test_new_pull_request_is_appended_and_valid(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            if path.startswith(SEARCH_URL):
                return (
                    _search_payload([
                        _search_item("steipete/CodexBar", 2814),
                        _search_item("Untrivial-ai/agent-orchestrator", 3905),
                    ]),
                    200,
                )
            if path == NEW_PULL_URL:
                return _pull(), 200
            raise AssertionError(f"unexpected path {path}")

        stdout, _ = self._run(api_get)
        self.assertIn("discovered 1 new merged PR(s)", stdout)
        self.assertNotEqual(self.registry.read_text(), self.original)
        cfg = json.loads(self.registry.read_text())
        entry = cfg["contributions"][-1]
        self.assertEqual(
            list(entry.keys()),
            ["repo", "pr_number", "title", "merged", "merged_at", "role", "featured"],
        )
        self.assertEqual(entry["repo"], "Untrivial-ai/agent-orchestrator")
        self.assertEqual(entry["pr_number"], 3905)
        self.assertEqual(entry["merged_at"], "2026-09-16")
        self.assertTrue(entry["merged"])
        self.assertEqual(entry["role"], "author")
        self.assertFalse(entry["featured"])
        contributions_registry(cfg)  # the same validation gate the render applies

    def test_known_pull_requests_are_skipped_without_a_pr_fetch(self) -> None:
        calls: list[str] = []

        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            calls.append(path)
            if path.startswith(SEARCH_URL):
                return _search_payload([_search_item("steipete/CodexBar", 2814)]), 200
            raise AssertionError(f"unexpected path {path}")

        stdout, _ = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertEqual([c for c in calls if c.startswith("repos/")], [])
        self.assertEqual(self.registry.read_text(), self.original)

    def test_search_failure_keeps_the_committed_registry(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            raise urllib.error.HTTPError(
                "https://api.github.com/search/issues", 403, "rate limited", None, None
            )

        stdout, stderr = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertIn("WARNING: contributions discovery failed", stderr)
        self.assertEqual(self.registry.read_text(), self.original)

    def test_unmerged_candidate_is_skipped_with_a_warning(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            if path.startswith(SEARCH_URL):
                return (
                    _search_payload([
                        _search_item("Untrivial-ai/agent-orchestrator", 1),
                        _search_item("Untrivial-ai/agent-orchestrator", 3905),
                    ]),
                    200,
                )
            if path.endswith("/pulls/1"):
                return _pull(merged=False), 200
            if path == NEW_PULL_URL:
                return _pull(), 200
            raise AssertionError(f"unexpected path {path}")

        stdout, stderr = self._run(api_get)
        self.assertIn("discovered 1 new merged PR(s)", stdout)
        self.assertIn("search reported merged but the PR is not", stderr)
        cfg = json.loads(self.registry.read_text())
        self.assertEqual(len(cfg["contributions"]), 2)
        self.assertEqual(cfg["contributions"][-1]["pr_number"], 3905)

    def test_renamed_repository_is_not_reappended(self) -> None:
        # The search answers with the CURRENT slug; a registry entry may still
        # hold the pre-rename one. Same repo name part + number => same PR.
        cfg = json.loads(self.registry.read_text())
        cfg["contributions"].append({
            "repo": "AgentWrapper/agent-orchestrator",
            "pr_number": 2357,
            "title": "old-slug entry",
            "merged": True,
            "merged_at": "2026-07-11",
            "role": "author",
            "featured": False,
        })
        self.registry.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n")
        expected = self.registry.read_text()

        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            if path.startswith(SEARCH_URL):
                return _search_payload([_search_item("Untrivial-ai/agent-orchestrator", 2357)]), 200
            raise AssertionError(f"unexpected path {path}")

        stdout, stderr = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertIn("repo renamed", stderr)
        self.assertEqual(self.registry.read_text(), expected)

    def test_transient_failure_on_a_candidate_is_skipped(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            if path.startswith(SEARCH_URL):
                return (
                    _search_payload([
                        _search_item("Untrivial-ai/agent-orchestrator", 1),
                        _search_item("Untrivial-ai/agent-orchestrator", 3905),
                    ]),
                    200,
                )
            if path.endswith("/pulls/1"):
                raise urllib.error.HTTPError(
                    f"https://api.github.com/{path}", 502, "Bad gateway", None, None
                )
            if path == NEW_PULL_URL:
                return _pull(), 200
            raise AssertionError(f"unexpected path {path}")

        stdout, stderr = self._run(api_get)
        self.assertIn("discovered 1 new merged PR(s)", stdout)
        self.assertIn("could not confirm merge", stderr)
        cfg = json.loads(self.registry.read_text())
        self.assertEqual(len(cfg["contributions"]), 2)
        self.assertEqual(cfg["contributions"][-1]["pr_number"], 3905)

    def test_candidate_without_a_title_is_skipped(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            if path.startswith(SEARCH_URL):
                return _search_payload([_search_item("Untrivial-ai/agent-orchestrator", 3905)]), 200
            if path == NEW_PULL_URL:
                return {"merged": True, "merged_at": "2026-09-16T16:59:19Z"}, 200
            raise AssertionError(f"unexpected path {path}")

        stdout, stderr = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertIn("no title", stderr)
        self.assertEqual(self.registry.read_text(), self.original)

    def test_search_timeout_keeps_the_committed_registry(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            raise TimeoutError("timed out")

        stdout, stderr = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertIn("WARNING: contributions discovery failed", stderr)
        self.assertEqual(self.registry.read_text(), self.original)

    def test_search_malformed_json_keeps_the_committed_registry(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            raise json.JSONDecodeError("Expecting value", "{", 0)

        stdout, stderr = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertIn("WARNING: contributions discovery failed", stderr)
        self.assertEqual(self.registry.read_text(), self.original)

    def test_malformed_search_items_are_skipped(self) -> None:
        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            if path.startswith(SEARCH_URL):
                return (
                    {
                        "total_count": 4,
                        "items": [None, "bad", 42, _search_item("Untrivial-ai/agent-orchestrator", 3905)],
                    },
                    200,
                )
            if path == NEW_PULL_URL:
                return _pull(), 200
            raise AssertionError(f"unexpected path {path}")

        stdout, _ = self._run(api_get)
        self.assertIn("discovered 1 new merged PR(s)", stdout)
        cfg = json.loads(self.registry.read_text())
        self.assertEqual(len(cfg["contributions"]), 2)
        self.assertEqual(cfg["contributions"][-1]["pr_number"], 3905)

    def test_unexpected_discovery_failure_keeps_the_registry(self) -> None:
        stdout, stderr = io.StringIO(), io.StringIO()
        with mock.patch.object(discover_contributions, "discover", side_effect=AttributeError("boom")):
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code = discover_contributions.main(["--registry", str(self.registry)])
        self.assertEqual(code, 0)
        self.assertIn("WARNING: contributions discovery failed", stderr.getvalue())
        self.assertEqual(self.registry.read_text(), self.original)

    def test_search_pagination_stops_on_a_short_page(self) -> None:
        full_page = [_search_item("steipete/CodexBar", 2814)] * 100
        calls: list[str] = []

        def api_get(path, accept=None, *, timeout=30, tolerate=()):
            calls.append(path)
            self.assertTrue(path.startswith(SEARCH_URL))
            if path.endswith("page=1"):
                return _search_payload(full_page), 200
            self.assertIn("page=2", path)
            return _search_payload([]), 200

        stdout, _ = self._run(api_get)
        self.assertIn("registry up to date", stdout)
        self.assertEqual(len(calls), 2)  # page=2 came back short: stop there


if __name__ == "__main__":
    unittest.main()
