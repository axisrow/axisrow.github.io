# profile

Profile data and generators for the canonical
[`axisrow/axisrow.github.io`](https://github.com/axisrow/axisrow.github.io)
repository. The README on [`github.com/axisrow`](https://github.com/axisrow)
and generated portfolio sections are built from this directory.

## How it works

```
profile/projects.json ──▶ profile/sync/generate.py ──▶ .build/profile/axisrow/README.md
                                   │
                                   └─────────────────▶ .build/profile/site/*.html
```

- Edit `profile/projects.json` (descriptions, grouping, contributions, stats)
  and commit to `main`.
- Root GitHub Actions workflows run checks on pull requests and publish from
  `main`, daily, or on manual dispatch.
- It mints a short-lived GitHub App installation token via [`pat`](https://github.com/etopro/plugin-marketplace/tree/main/plugins/pat)
  (CI mode — PEM from the `APP_PRIVATE_KEY` secret, **no Bitwarden in CI**),
  pulls live star counts, renders the Pages artifact, and cross-pushes only the
  generated README to `axisrow/axisrow` as `axisrow-ci[bot]`.
- Portfolio fragments are replaced only inside the stable
  `PROFILE:PROJECTS` and `PROFILE:STARS` marker blocks. The sync never patches
  the site's JavaScript or unrelated presentation markup.

## Edit content

Change `profile/projects.json`. Generated files live in `.build/` and
`.pages-dist/` (both gitignored).

To preview locally:

```bash
GH_TOKEN="$(gh auth token)" python3 profile/sync/generate.py
python3 profile/sync/build_pages.py
```

## Secrets (in `axisrow/axisrow.github.io` → Settings → Secrets)

- `APP_PRIVATE_KEY` — the `axisrow-ci` GitHub App private key (PEM). One-time,
  never expires; `pat` mints a fresh 1h token from it on every run.
- `PAT_APP_ID` — `4278593` (the App ID; not secret).

## Honest numbers

`projects.json` tracks a fixed set of repos (the starred ones). New repos are not
added automatically — only the ones listed. Per-repo star counts are pulled live
from the GitHub API on each run; the aggregate stats (`stars_earned`,
`merged_upstream_prs`) are verified snapshots. The site also keeps a daily star
history from 2026-03-01: it uses an opening balance plus dated GitHub star
events so the restored series ends at 99 original-repository stars (104 total
minus 5 fork stars).
