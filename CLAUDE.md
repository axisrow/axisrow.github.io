# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page personal portfolio site for `axisrow` (Python engineer). It is a **fully static site** — plain `index.html` + `styles.css` + two hand-written JS files, no framework, no bundler, no build step. Deployed to GitHub Pages from the repo root (`https://axisrow.github.io/`).

The only `node` involvement is the test suite; the site itself ships the `.js`/`.css` files verbatim with cache-busting query strings in `index.html` (e.g. `main.js?v=api-v2-final`, `styles.css?v=ambient-fields-2`). **Bump those version strings when you change the corresponding file** so visitors don't get a stale cached copy.

## Commands

```bash
npm test          # syntax-checks main.js + effect-skins.js, then runs the smoke tests
node --test       # run only the tests in tests/
```

There is no dev server, lint, or build. To view locally, open `index.html` directly or serve the dir (`python3 -m http.server`). The animated effects need the external Demoscene library (see below), which won't be present over `file://` — the page falls back to static frames by design.

## How the smoke tests constrain the markup

`tests/site-smoke.test.mjs` is the guardrail for this repo. It runs `main.js`/`effect-skins.js` inside a `vm` sandbox with mocked DOM and **asserts on the source text of `index.html`, `main.js`, `effect-skins.js`, and `styles.css` via regex**. Many tests pin exact substrings — when editing those files, expect to need test updates in lockstep. Key invariants enforced:

- **Section order is fixed**: `hero → stars → projects → opensource → experience → about → contact`. Don't reorder.
- **Exactly three** `data-effect` canvases exist: `metaballs`, `plasma`, `mandelbrot` — one per themed section. Forbidden: GSAP, ScrollTrigger, vendor bundles, copper-bars/feedback/starfield.
- **Open Source proof field**: asymmetric R1 grid (`minmax(360px,0.38fr) minmax(0,0.62fr)`), exactly 4 `proof-row` entries. The `mandelbrot-proof-fallback.jpg` must be a real JPEG > 40 KB (rendered fallback). `og.png` must be 1200×630.
- **Effect-skins palettes are single-source-of-truth**: each theme color hex may appear exactly once; all three effects share one frozen `appearance`. Overriding `appearance` per-effect throws at runtime (`assertNoLocalAppearance`). Theme + exact palette + field/runtime constants are pinned.

## Architecture

### Effect rendering pipeline (the non-obvious part)

The visual accents (metaballs hero, plasma projects, mandelbrot open-source) are **not** self-contained. `main.js` is a loader/orchestrator that dynamically fetches an external library:

1. Reads the base URL from `<meta name="demoscene-base">` (default `/demoscene_classics/dist`, pointing at a sibling GitHub Pages repo `axisrow/demoscene_classics`).
2. `fetch`es `manifest.json`, validates `apiVersion === 2`, then injects the versioned bundle (`?v=manifest.version`) via a `<script>` tag.
3. Verifies `window.Demoscene.{metaballs,plasma,mandelbrot}` are functions (API v2 contract); otherwise falls back.
4. `mountEffects()` wires each `<canvas data-effect>` to its factory plus per-effect options from `effect-skins.js`.

`effect-skins.js` exposes `window.PortfolioEffectSkins.create(theme, mobile, overrides?)` — a pure, deeply-frozen config factory. **All appearance (colors) is derived from a shared theme palette; per-effect `appearance` is forbidden.** Motion/render/field tuning differs by effect and by mobile vs desktop. This file is imported before `main.js`.

### Playback budgeting & resilience

`main.js` never lets animation block the page:
- **Concurrency cap**: at most 2 animated scenes run on desktop, 1 on mobile (`syncEffectPlayback`), chosen by highest `intersectionRatio`. Off-screen / hidden-tab scenes stop.
- **Reduced motion** (`prefers-reduced-motion`) and any **CPU-only mandelbrot fallback** (`controller.getStats().backend === "canvas2d"`) force `staticOnly` → a single `renderOnce(0)` frame, no animation loop.
- **Graceful degradation**: any failure (manifest fetch fails/bad version/bundle error/missing effects) adds the `demoscene-fallback` class on `<html>` and warns; the page stays usable. CSS/JS touch `demoscene-ready`, `demoscene-reduced`, `demoscene-fallback`, `effects-changing` classes.
- Effects **remount** on theme toggle and on mobile/reduced-motion media-query changes (debounced 180 ms).

### Data sync (external bot, not in this repo)

Daily commits like `bot: sync portfolio projects and stars` are produced by an **automation running outside this repository** (no `.github/workflows`, scripts, or CI config tracked here). It edits two things inside `index.html`:

- The **`<!-- PROFILE:STARS:START -->` / `:END -->`** block — regenerates the SVG cumulative-stars chart from `stars-history.json` (daily entries since `start_date`, opening balance model, forks excluded). The chart's endpoint total + the `<desc>`/`<title>` and the "★ YYYY-MM-DD" caption are derived from this data.
- The **`<!-- PROFILE:PROJECTS:START -->` / `:END -->`** block — project cards grouped by theme with live star counts.

A few hero/stat values are **manually maintained**, not bot-driven: the `data-target`/inline numbers for `stars_earned`, `merged_upstream_prs`, `starred_projects` (hero `<dd>`, Open Source summary, Experience bullets). When editing the bot-managed blocks, preserve the `PROFILE:*:START/END` markers exactly — the smoke test asserts each appears exactly once. `stars-history.json` is the data source of truth for the chart.
