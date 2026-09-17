#!/usr/bin/env python3
"""Append newly merged upstream PRs to the contributions registry.

The registry in projects.json used to be curated by hand from ad-hoc GitHub
searches, so PRs merged after the last sweep stayed invisible until someone
noticed. The publish workflow runs this script before the render: it asks the
search API for merged PRs authored by the handle, confirms every candidate
against the PR endpoint, and appends the newcomers to the committed registry.

Co-authored PRs (Co-authored-by trailer, commits authored by someone else) are
invisible to the author search — those stay hand-maintained, see the
contributions_note in projects.json.

Degrades like the rest of the sync: if the search API fails, the daily publish
keeps the committed registry and only warns. A per-candidate anomaly is skipped
with a warning; nothing is ever written that contributions_registry() would
reject.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
from pathlib import Path

# This script is invoked directly by the CI workflow (`python3 profile/sync/...`), which
# puts its own directory on sys.path[0] instead of the repo root. Absolute
# ``from profile.sync import ...`` needs the repo root on the path, so add it.
_ROOT = str(Path(__file__).resolve().parents[2])
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from profile.sync import github  # noqa: E402  (path bootstrap must precede this import)
from profile.sync.generate import contributions_registry  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REGISTRY = ROOT / "projects.json"
MERGED_AT_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
SEARCH_PAGES = 10  # GitHub caps search results at 1000 (10 x 100). Pagination
# runs until a short page, so coverage is complete by construction; hitting
# this bound warns loudly instead of silently undercounting the registry.


def search_merged_pulls(handle: str) -> list[dict]:
    """Page the search API for merged PRs authored by ``handle`` in others' repos.

    The search endpoint answers with a dict payload, so github.paged() (which
    expects a list) does not apply; paginate by hand the way stars_history does
    for installation repositories.
    """
    query = urllib.parse.quote(f"type:pr author:{handle} is:merged -user:{handle}")
    items: list[dict] = []
    for page in range(1, SEARCH_PAGES + 1):
        payload, _ = github.api_get(
            f"search/issues?q={query}&sort=created&order=desc&per_page=100&page={page}"
        )
        if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
            raise RuntimeError("Expected a search response")
        batch = payload["items"]
        items.extend(batch)
        if len(batch) < 100:
            return items
    print(
        "  WARNING: contributions search hit its page bound; older entries may be unscanned",
        file=sys.stderr,
    )
    return items


def merged_pull(repo: str, number: int) -> tuple[str, str] | None:
    """Confirm the candidate is really merged; return ``(title, merged_at)``.

    The search index can lag or disagree with the PR itself, and the registry's
    philosophy is a confirmed merged flag — so every candidate is re-checked
    here and only a confirmed PR yields an entry.
    """
    payload, status = github.api_get(f"repos/{repo}/pulls/{number}", tolerate=(404,))
    if payload is None:
        print(f"  WARNING: {repo}#{number}: PR not found ({status})", file=sys.stderr)
        return None
    if not isinstance(payload, dict):
        print(f"  WARNING: {repo}#{number}: unexpected PR response", file=sys.stderr)
        return None
    if not payload.get("merged"):
        print(f"  WARNING: {repo}#{number}: search reported merged but the PR is not", file=sys.stderr)
        return None
    merged_at = str(payload.get("merged_at", ""))[:10]
    if not MERGED_AT_RE.fullmatch(merged_at):
        print(f"  WARNING: {repo}#{number}: malformed merged_at {merged_at!r}", file=sys.stderr)
        return None
    title = str(payload.get("title", ""))
    if not title:
        print(f"  WARNING: {repo}#{number}: PR payload has no title", file=sys.stderr)
        return None
    return title, merged_at


def discover(config: dict) -> list[dict]:
    """Return registry entries for merged PRs not yet tracked. Never raises on
    API failure: callers keep the committed registry instead."""
    handle = str(config["handle"])
    known = {(str(entry["repo"]), int(entry["pr_number"])) for entry in config["contributions"]}
    # Repos get renamed (org transfers): the search always answers with the
    # current slug while the registry may still hold the old one, and a string
    # comparison alone would re-append the same PR as a duplicate. Match on the
    # repo's name part + number as well.
    known_loose = {
        (str(entry["repo"]).rsplit("/", 1)[-1].lower(), int(entry["pr_number"]))
        for entry in config["contributions"]
    }
    try:
        candidates = search_merged_pulls(handle)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as error:
        print(
            f"  WARNING: contributions discovery failed ({error}): keeping the committed registry",
            file=sys.stderr,
        )
        return []

    fresh: list[dict] = []
    fresh_keys: set[tuple[str, int]] = set()
    for item in candidates:
        if not isinstance(item, dict):
            continue
        repo = str(item.get("repository_url", "")).removeprefix("https://api.github.com/repos/")
        try:
            number = int(item.get("number", 0))
        except (TypeError, ValueError):
            continue
        if not repo or not number or (repo, number) in known:
            continue
        if (repo.rsplit("/", 1)[-1].lower(), number) in known_loose:
            print(
                f"  WARNING: {repo}#{number}: matches a known PR under a different"
                " org (repo renamed?) — update the registry slug by hand",
                file=sys.stderr,
            )
            continue
        if (repo, number) in fresh_keys:
            continue  # search pagination can repeat items across pages
        # A flaky/unavailable candidate endpoint must not fail the daily
        # publish: skip the candidate with a warning, keep the rest.
        try:
            confirmed = merged_pull(repo, number)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            print(
                f"  WARNING: {repo}#{number}: could not confirm merge ({error}) — skipping",
                file=sys.stderr,
            )
            continue
        if confirmed is None:
            continue
        title, merged_at = confirmed
        fresh_keys.add((repo, number))
        fresh.append({
            "repo": repo,
            "pr_number": number,
            "title": title,
            "merged": True,
            "merged_at": merged_at,
            "role": "author",
            "featured": False,
        })
    return fresh


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    args = parser.parse_args(argv)

    config = json.loads(args.registry.read_text())
    # The degrade contract, enforced at one place: nothing from the API side
    # may fail the daily publish — a warning plus the committed registry is
    # always a valid outcome. (Corrupted local config still fails loudly on
    # the read/parse above, matching the other sync scripts.)
    try:
        fresh = discover(config)
    except Exception as error:  # noqa: BLE001 - the whole point is the boundary
        print(
            f"  WARNING: contributions discovery failed ({error}): keeping the committed registry",
            file=sys.stderr,
        )
        return 0
    if not fresh:
        print("registry up to date")
        return 0

    config["contributions"].extend(fresh)
    # The same validation gate the render applies: a malformed append must be
    # caught here, in the writer, not as a failed daily publish later.
    contributions_registry(config)
    args.registry.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n")
    print(f"discovered {len(fresh)} new merged PR(s):")
    for entry in fresh:
        print(f"  {entry['merged_at']}  {entry['repo']}#{entry['pr_number']}  {entry['title']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
