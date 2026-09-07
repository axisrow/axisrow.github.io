import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

async function source(filename) {
  return readFile(new URL(filename, root), 'utf8');
}

test('page keeps the approved proof-first section order and sync markers', async () => {
  const html = await source('index.html');
  const orderedIds = ['hero', 'stars', 'projects', 'opensource', 'experience', 'about', 'contact'];
  let previous = -1;
  for (const id of orderedIds) {
    const position = html.indexOf(`id="${id}"`);
    assert.ok(position > previous, `${id} must follow the previous section`);
    previous = position;
  }
  for (const name of ['PROJECTS', 'STARS']) {
    assert.equal((html.match(new RegExp(`PROFILE:${name}:START`, 'g')) || []).length, 1);
    assert.equal((html.match(new RegExp(`PROFILE:${name}:END`, 'g')) || []).length, 1);
  }
  assert.match(html, /id="stars"[\s\S]*?<span>01<\/span> <span data-i18n="stars\.eyebrow">Momentum<\/span>/);
  assert.match(html, /id="projects"[\s\S]*?<span>02<\/span> <span data-i18n="projects\.eyebrow">Selected Work<\/span>/);
});

test('content surfaces share one spacing and radius system', async () => {
  const css = await source('styles.css');
  for (const token of [
    '--panel-space: clamp(24px, 4vw, 48px)',
    '--card-space: 24px',
    '--row-space: 16px',
    '--surface-radius: 12px'
  ]) {
    assert.match(css, new RegExp(token.replace(/[(),]/g, '\\$&')));
  }
  assert.ok((css.match(/var\(--panel-space\)/g) || []).length >= 6);
  assert.ok((css.match(/var\(--card-space\)/g) || []).length >= 6);
  assert.ok((css.match(/var\(--surface-radius\)/g) || []).length >= 6);
  assert.match(css, /\.projects-field\s*\{[^}]*display:\s*flex[^}]*padding:/s);
  assert.match(css, /\.projects-field-copy \.section-title\s*\{[^}]*font-size:\s*clamp\(42px,\s*5vw,\s*64px\)/s);
  assert.match(css, /@media \(max-width: 800px\)\s*\{\s*:root\s*\{[^}]*--panel-space:\s*24px/s);
  assert.match(css, /@media \(max-width: 800px\)\s*\{\s*:root\s*\{[^}]*--effect-field-gutter:\s*24px/s);
  assert.doesNotMatch(css, /height:\s*clamp\(330px,\s*30vw,\s*(?:390|410)px\)/);
});

test('contact heading fits the narrow-column text without clipping', async () => {
  const css = await source('styles.css');
  // Desktop rule keeps its size but gains a long-word safety net.
  assert.match(css, /\.contact-card h2\s*\{[^}]*font-size:\s*clamp\(44px,\s*7\.5vw,\s*92px\)[^}]*overflow-wrap:\s*break-word/s);
  // Mobile floor must stay low enough that the longest locale word
  // (RU "действительно") fits the ~246px column at 320px; the old
  // clamp(42px, 13vw, 62px) overflowed it by ~24px.
  const mobile = css.slice(css.indexOf('@media (max-width: 800px)'));
  assert.match(mobile, /\.contact-card h2\s*\{[^}]*font-size:\s*clamp\(34px,\s*10\.5vw,\s*62px\)/s);
  // The fix must come from sizing, not from hiding the overflow.
  assert.doesNotMatch(css, /\.contact-card[^{]*\{[^}]*overflow-x:\s*hidden/s);
});

test('hero stats share one value horizon and keep readable mobile captions', async () => {
  const css = await source('styles.css');
  // Values must sit on one horizontal line regardless of caption wrapping:
  // explicit two-row grid cells, not column-reverse flow, and no per-stat
  // top/margin compensation is allowed anywhere in the hero-stats rules.
  assert.match(css, /\.hero-stats div\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:\s*auto auto[^}]*align-content:\s*start/s);
  assert.match(css, /\.hero-stats dd\s*\{[^}]*grid-row:\s*1/s);
  assert.match(css, /\.hero-stats dt\s*\{[^}]*grid-row:\s*2/s);
  assert.doesNotMatch(css, /\.hero-stats[^{]*\{[^}]*column-reverse/s);
  assert.doesNotMatch(css, /\.hero-stats (?:dd|dt|div)[^{]*\{[^}]*(?:^\s*top:|[^-]margin-top:)/m);
  // Mobile captions stay at the 12px readability floor, wrapping instead of clipping.
  assert.match(css, /\.hero-stats dt\s*\{[^}]*font-size:\s*12px[^}]*overflow-wrap:\s*anywhere/s);
});

test('page surfaces share the liquid-glass and typography systems', async () => {
  const css = await source('styles.css');
  for (const token of [
    '--glass-bg:',
    '--glass-bg-strong:',
    '--glass-shadow:',
    '--glass-blur:',
    '--glass-saturation:',
    '--type-body:',
    '--type-body-small:',
    '--type-meta:',
    '--type-label:',
    '--type-card-title:'
  ]) {
    assert.match(css, new RegExp(token.replace(/[():]/g, '\\$&')));
  }
  assert.match(css, /\.veil-panel\s*\{[^}]*background:\s*var\(--glass-bg\)[^}]*backdrop-filter:\s*blur\(var\(--glass-blur\)\)/s);
  for (const selector of ['\.topbar-inner', '\.hero-copy-plane', '\.stars-chart', '\.contact-card']) {
    assert.match(css, new RegExp(`${selector}[\\s\\S]{0,420}var\\(--glass-`));
  }
  assert.match(css, /\.section-nav a\s*\{[^}]*font-size:\s*var\(--type-body-small\)/s);
  assert.match(css, /\.card-desc\s*\{[^}]*font-size:\s*var\(--type-body-small\)/s);
  assert.match(css, /\.proof-row > span\s*\{[^}]*font-size:\s*14px/);
  assert.match(css, /\.proof-row small\s*\{[^}]*font:\s*700 13px\/1\.35\s+"IBM Plex Mono", monospace/s);
});

test('animated fields remain behind readable mobile cards', async () => {
  const css = await source('styles.css');
  assert.match(css, /\.projects-field-visual\s*\{[^}]*inset:\s*0 calc\(50% - 50vw\);/s);
  assert.match(css, /\.proof-field-visual\s*\{[^}]*inset:\s*0 calc\(50% - 50vw\);/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.visual-field\s*\{[^}]*width:\s*100vw;/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.projects-field-copy\s*\{[^}]*width:\s*calc\(100% - \(var\(--effect-field-gutter\) \* 2\)\)[^}]*margin:\s*var\(--effect-field-gutter\)[^}]*background:\s*var\(--panel-veil\)[^}]*backdrop-filter:\s*none;/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.projects-field-visual\s*\{[^}]*inset:\s*0[^}]*opacity:\s*0\.9[^}]*mask-image:\s*none;/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.proof-field-visual\s*\{[^}]*inset:\s*0[^}]*opacity:\s*0\.9[^}]*mask-image:\s*none;/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.proof-field-copy\s*\{[^}]*width:\s*calc\(100% - \(var\(--effect-field-gutter\) \* 2\)\)[^}]*margin:\s*var\(--effect-field-gutter\)/s);
  assert.doesNotMatch(css, /\.projects-field-visual\s*\{[^}]*inset:[^;}]*-\d+px[^;}]*-\d+px[^;}]*;/s);
  assert.doesNotMatch(css, /\.proof-field-visual\s*\{[^}]*inset:[^;}]*-\d+px[^;}]*-\d+px[^;}]*;/s);
});

test('tablet open-source glass panel uses the available width', async () => {
  const css = await source('styles.css');
  const tablet = css.slice(css.indexOf('@media (min-width: 801px) and (max-width: 1180px)'));
  assert.match(tablet, /\.proof-field-copy\s*\{[^}]*width:\s*calc\(100% - \(var\(--effect-field-gutter\) \* 2\)\)[^}]*margin:\s*var\(--effect-field-gutter\)[^}]*background:\s*var\(--panel-veil\)/s);
  assert.match(tablet, /\.proof-field-visual\s*\{[^}]*inset:\s*0[^}]*width:\s*auto[^}]*opacity:\s*0\.9[^}]*mask-image:\s*none/s);
  assert.match(tablet, /\.stars-field-visual,[\s\S]*?\.contact-field-visual\s*\{[^}]*inset:\s*0[^}]*opacity:\s*0\.9[^}]*mask-image:\s*none/s);
  assert.match(tablet, /\.proof-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/s);
});

/* Contrast of the small text that sits on a mobile veil panel, computed rather
   than pinned: the panel is a --panel-veil tint over a live effect canvas, so
   the real backdrop is every stop of the shared effect palette composited under
   that tint. Reading the numbers out of the sources keeps this honest if either
   the palette or the veil alpha moves. */
function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function parseHex(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
}

function contrastRatio(a, b) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// The library interpolates the five stops into a 256-entry ramp; sampling the
// interpolation (not just the stops) is what makes "worst case" meaningful.
function paletteRamp(stops, steps = 256) {
  const points = stops.map(parseHex);
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / (steps - 1)) * (points.length - 1);
    const k = Math.min(Math.floor(t), points.length - 2);
    const f = t - k;
    return points[k].map((c, j) => c + (points[k + 1][j] - c) * f);
  });
}

function composite(tint, backdrop, alpha) {
  return tint.map((c, i) => c * alpha + backdrop[i] * (1 - alpha));
}

test('mobile panel text clears WCAG AA over the worst backdrop the veil can composite', async () => {
  const css = await source('styles.css');
  const skins = await source('effect-skins.js');

  const stops = (theme) => {
    const block = new RegExp(`${theme}:\\s*\\{\\s*colors:\\s*colors\\(\\[([^\\]]+)\\]`).exec(skins);
    assert.ok(block, `no ${theme} palette in effect-skins.js`);
    return block[1].match(/#[0-9a-f]{6}/gi) ?? [];
  };
  // The dark palette leads with the shared `ink` identifier, not a literal.
  const darkStops = ['#090b0f', ...stops('dark')];
  const lightStops = stops('light');
  assert.equal(lightStops.length, 5);
  assert.equal(darkStops.length, 5);

  const mobile = css.slice(css.indexOf('@media (max-width: 800px)'));
  const veil = (source, alphaPattern) => {
    const match = alphaPattern.exec(source);
    assert.ok(match, 'no --panel-veil declaration found');
    return Number(match[1]) / 100;
  };
  const lightAlpha = veil(mobile, /--panel-veil:\s*color-mix\(in srgb,\s*var\(--veil-solid\)\s*(\d+)%/);
  const darkAlpha = veil(mobile, /--panel-veil:\s*color-mix\(in srgb,\s*var\(--page\)\s*(\d+)%/);

  const declared = (block, name) => {
    const match = new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(block);
    assert.ok(match, `no ${name} in the panel override block`);
    return parseHex(match[1]);
  };
  const lightPanel = /\.contact-card\s*\{([^}]*)\}/.exec(mobile);
  const darkPanel = /:root\[data-theme="dark"\] \.contact-card\s*\{([^}]*)\}/.exec(mobile);
  assert.ok(lightPanel && darkPanel);

  const cases = [
    // Light: --veil-solid tint, ink black body text, panel-local secondaries.
    {
      stops: lightStops,
      tint: parseHex('#f8f5ee'),
      alpha: lightAlpha,
      block: lightPanel[1],
      globals: { '--ink': '#17191d', '--success': '#287c59', '--accent': '#a15f40' }
    },
    // Dark: --page tint. No --success / --accent override is needed here, so
    // the globals are what the panel actually renders.
    {
      stops: darkStops,
      tint: parseHex('#090b0f'),
      alpha: darkAlpha,
      block: darkPanel[1],
      globals: { '--ink': '#f0ede5', '--success': '#67c99c', '--accent': '#dc8d67' }
    }
  ];

  for (const { stops: palette, tint, alpha, block, globals } of cases) {
    const backdrops = paletteRamp(palette).map((tone) => composite(tint, tone, alpha));
    // A panel-local override wins where it exists; otherwise the global token
    // is what renders, and it has to clear AA on its own.
    const resolve = (name) => (new RegExp(`${name}:`).test(block) ? declared(block, name) : parseHex(globals[name]));
    const inks = [
      parseHex(globals['--ink']),
      declared(block, '--ink-soft'),
      declared(block, '--ink-faint'),
      resolve('--success'),
      resolve('--accent')
    ];
    for (const colour of inks) {
      const worst = Math.min(...backdrops.map((bg) => contrastRatio(colour, bg)));
      assert.ok(worst >= 4.5, `#${colour.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')} only reaches ${worst.toFixed(2)}:1`);
    }
  }
});

test('about copy stays readable over the rotozoom in every band and both themes', async () => {
  const css = await source('styles.css');
  const skins = await source('effect-skins.js');

  // The copy column keeps the near-opaque veil; only the masked right edge
  // dissolves so the effect can read through where no reading happens.
  assert.match(css, /\.about-field\s*\{[^}]*linear-gradient\(90deg, var\(--veil\) 0%, var\(--veil\) 55%/s);

  // Desktop, tablet and mobile each pin the rotozoom to the right edge -- the
  // shared narrow-band rules otherwise unmask the field at 0.9, and unlike
  // the other panels there is no veil card between the copy and the canvas.
  const masked = [...css.matchAll(/\.about-field-visual\s*\{([^}]*)\}/g)]
    .map((match) => match[1])
    .filter((block) => /mask-image:\s*linear-gradient\(90deg, transparent 0%/.test(block));
  assert.equal(masked.length, 3, 'expected a masked .about-field-visual in each of the three bands');
  for (const block of masked) {
    const opacity = Number(/opacity:\s*([\d.]+);/.exec(block)[1]);
    assert.ok(opacity <= 0.55, `field opacity ${opacity} is too hot for a text panel`);
    // The fade must not start inside the copy column.
    const start = /transparent 0%, transparent (\d+)%/.exec(block);
    assert.ok(start && Number(start[1]) >= 40, 'mask fade starts too early');
  }

  // Worst-case backdrop under the copy, computed rather than pinned: the
  // canvas layer (any palette stop over the page, at layer opacity) under the
  // veil tint. Generous by design -- the mask is fully transparent over the
  // copy, so this models the fade's first percent bleeding under the text.
  const stops = (theme) => {
    const block = new RegExp(`${theme}:\\s*\\{\\s*colors:\\s*colors\\(\\[([^\\]]+)\\]`).exec(skins);
    assert.ok(block, `no ${theme} palette in effect-skins.js`);
    return block[1].match(/#[0-9a-f]{6}/gi) ?? [];
  };
  const layerOpacity = Number(/opacity:\s*([\d.]+);/.exec(masked[0])[1]);

  const themeCase = (rootBlock, inkNames) => {
    const veil = /--veil:\s*rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/.exec(rootBlock);
    const page = /--page:\s*(#[0-9a-f]{6})/.exec(rootBlock);
    assert.ok(veil && page, 'no --veil / --page in :root');
    return {
      tint: [Number(veil[1]), Number(veil[2]), Number(veil[3])],
      alpha: Number(veil[4]),
      page: parseHex(page[1]),
      inks: inkNames.map((name) => parseHex(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`).exec(rootBlock)[1]))
    };
  };
  const lightRoot = /:root\s*\{([\s\S]*?)\}/.exec(css)[1];
  const darkRoot = /:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/.exec(css)[1];
  const cases = [
    { stops: [...stops('light'), /--field-solid:\s*(#[0-9a-f]{6})/.exec(lightRoot)[1]], ...themeCase(lightRoot, ['--ink', '--ink-soft']) },
    { stops: ['#090b0f', ...stops('dark')], ...themeCase(darkRoot, ['--ink', '--ink-soft']) }
  ];

  for (const { stops: palette, tint, alpha, page, inks } of cases) {
    // canvas layer: worst palette tone at layer opacity over the page ...
    const inner = paletteRamp(palette).map((tone) => composite(tone, page, layerOpacity));
    // ... under the veil tint at its declared alpha.
    const backdrops = inner.map((bg) => composite(tint, bg, alpha));
    for (const colour of inks) {
      const worst = Math.min(...backdrops.map((bg) => contrastRatio(colour, bg)));
      assert.ok(worst >= 4.5, `#${colour.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')} only reaches ${worst.toFixed(2)}:1`);
    }
  }
});

test('every section accent is mounted in document order and nothing else is', async () => {
  const html = await source('index.html');
  const effects = Array.from(html.matchAll(/data-effect="([^"]+)"/g), (match) => match[1]);
  // Document order, which is NOT the effectDefinitions() order in main.js —
  // that one is asserted separately below.
  assert.deepEqual(effects, [
    'metaballs', 'starfield', 'plasma', 'mandelbrot', 'feedback', 'rotozoom', 'copperBars'
  ]);
  // The point of this guard was always to keep animation libraries and vendored
  // bundles out of the page; the section accent names are now first-party
  // effect identifiers rather than forbidden substrings.
  assert.doesNotMatch(html, /gsap|ScrollTrigger|vendor\/demoscene/i);
});

test('the starfield canvas lives in the bot-managed template, not just index.html', async () => {
  // Everything between the PROFILE:STARS markers is regenerated from the Jinja
  // template on every bot sync, so a canvas added only to index.html silently
  // disappears the next day. profile/tests/test_site_sync.py pins the template
  // side; this pins the rendered side.
  const html = await source('index.html');
  const template = await source('profile/sync/templates/stars.html.j2');
  for (const markup of ['data-effect="starfield"', 'id="stars-starfield"', 'class="stars-field-visual"']) {
    assert.ok(html.includes(markup), `index.html must contain ${markup}`);
    assert.ok(template.includes(markup), `stars.html.j2 must contain ${markup}`);
  }
});

test('Open Source uses the asymmetric R1 field without duplicated cards', async () => {
  const html = await source('index.html');
  assert.match(html, /class="visual-field proof-field reveal"/);
  assert.match(html, /class="proof-field-copy veil-panel"/);
  // data-target and the element's text must be the same bot-synced number --
  // pinning one literal value here would break on every daily stats sync
  // (see the PROFILE:* markers in CLAUDE.md), so check the pattern instead.
  assert.match(html, /data-profile-value="merged_upstream_prs" data-target="(\d+)">\1/);
  assert.match(html, /class="proof-field-visual"/);
  assert.equal((html.match(/class="proof-row"/g) || []).length, 5);
  assert.doesNotMatch(html, /ai-resto/);
  assert.equal((html.match(/data-contribution-repo=/g) || []).length, 5);
  for (const repo of ['steipete/CodexBar', 'ranaroussi/yfinance', 'IBM/mcp-cli', 'AgentWrapper/agent-orchestrator', 'ccusage/ccusage']) {
    assert.ok(html.includes(`data-contribution-repo="${repo}"`));
  }
  assert.equal((html.match(/github\.com\/steipete\/CodexBar\/pull\/2814/g) || []).length, 1);
  assert.equal((html.match(/github\.com\/ranaroussi\/yfinance\/pull\/2627/g) || []).length, 1);
  assert.doesNotMatch(html, /proof-stage|contribution-card|proof-layout|mandelbrot-frame|Iteration \/ proof/i);
});

test('navigation and generated values are data-driven', async () => {
  const html = await source('index.html');
  const navIds = Array.from(html.matchAll(/data-nav="([^"]+)"/g), (match) => match[1]);
  assert.deepEqual(navIds, ['stars', 'projects', 'opensource', 'experience', 'about', 'contact']);
  for (const id of navIds) assert.match(html, new RegExp(`id="${id}"`));
  for (const key of ['stars_earned', 'merged_upstream_prs', 'starred_projects']) {
    assert.match(html, new RegExp(`data-profile-value="${key}"`));
  }
  assert.equal((html.match(/data-profile-value="merged_upstream_prs"/g) || []).length, 3);
  assert.match(html, /Cumulative GitHub stars across all repositories since/);
});

test('mobile navigation uses an accessible menu with full-size links', async () => {
  const html = await source('index.html');
  const css = await source('styles.css');
  const script = await source('main.js');
  assert.match(html, /id="menu-toggle"[^>]*aria-controls="section-navigation"[^>]*aria-expanded="false"/);
  assert.match(html, /<nav id="section-navigation" class="section-nav"/);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.section-nav\.is-open\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.section-nav a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.brand\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(script, /function closeMenu\(\)/);
  assert.match(script, /event\.key === "Escape"/);
  assert.match(script, /link\.addEventListener\("click", closeMenu\)/);
});

test('contact uses the configured Telegram channel chat link', async () => {
  const html = await source('index.html');
  const profile = JSON.parse(await source('profile/projects.json'));
  assert.equal(profile.telegram, 'https://t.me/prog_ai?direct');
  assert.match(html, new RegExp(`href="${profile.telegram.replace('?', '\\?')}"`));
  assert.doesNotMatch(html, /href="https:\/\/t\.me\/axisrow"/);
});

function collectI18nKeys(html) {
  const keys = new Set();
  for (const match of html.matchAll(/data-i18n="([^"]+)"/g)) keys.add(match[1]);
  for (const match of html.matchAll(/data-i18n-meta="([^"]+)"/g)) keys.add(match[1]);
  for (const match of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of match[1].split(',')) {
      const key = pair.split(':')[1];
      if (key) keys.add(key.trim());
    }
  }
  // Drop Jinja template expressions — they expand at build time, and the
  // rendered index.html (also collected) carries the concrete keys.
  for (const key of keys) {
    if (key.includes('{{')) keys.delete(key);
  }
  return keys;
}

function fakeDocumentElement() {
  return { lang: '', dataset: {}, classList: { remove() {}, add() {} } };
}

function loadI18nSandbox(script) {
  const sandbox = {
    window: {},
    document: {
      querySelectorAll: () => [],
      documentElement: fakeDocumentElement(),
      getElementById() { return null; },
      querySelector() { return null; }
    },
    navigator: { languages: ['en'] },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox, { filename: 'i18n.js' });
  return sandbox.window.PortfolioI18n;
}

test('i18n dictionaries cover every data-i18n / data-i18n-attr / data-i18n-meta key used in the markup', async () => {
  const html = await source('index.html');
  const starsTemplate = await source('profile/sync/templates/stars.html.j2');
  const projectsTemplate = await source('profile/sync/templates/projects.html.j2');
  const usedKeys = new Set([
    ...collectI18nKeys(html),
    ...collectI18nKeys(starsTemplate),
    ...collectI18nKeys(projectsTemplate)
  ]);
  assert.ok(usedKeys.size > 20, 'expected a substantial set of translatable keys');

  const i18nScript = await source('i18n.js');
  const i18n = loadI18nSandbox(i18nScript);
  // i18n.js runs inside its own vm context, so its Array differs from this
  // file's Array — deepEqual across realms reports "same structure but not
  // reference-equal". Compare via a realm-neutral primitive instead.
  assert.deepEqual(Array.from(i18n.SUPPORTED).sort().join(','), 'en,hi,ru,zh');

  for (const key of usedKeys) {
    for (const lang of ['en', 'ru', 'zh', 'hi']) {
      const value = i18n.translate(lang, key);
      assert.notEqual(value, key, `missing "${lang}" translation for key "${key}"`);
    }
  }
});

test('i18n dictionaries carry the exact same key set in both languages', async () => {
  const i18nScript = await source('i18n.js');
  // translate() silently falls back to English (and then the raw key) for a
  // missing entry, which would hide a one-sided dictionary edit from the
  // coverage test above. Read the dictionary objects directly instead.
  const sandbox = {
    window: {},
    document: {
      querySelectorAll: () => [],
      documentElement: fakeDocumentElement(),
      getElementById() { return null; },
      querySelector() { return null; }
    },
    navigator: { languages: ['en'] },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(i18nScript.replace(
    'window.PortfolioI18n = {',
    'window.__I18N_DICTIONARIES__ = DICTIONARIES;\n  window.PortfolioI18n = {'
  ), sandbox, { filename: 'i18n.js' });
  const dictionaries = sandbox.window.__I18N_DICTIONARIES__;
  const enKeys = Object.keys(dictionaries.en).sort();
  for (const lang of ['ru', 'zh', 'hi']) {
    assert.deepEqual(Object.keys(dictionaries[lang]).sort(), enKeys, `"${lang}" key set differs from "en"`);
  }
});

test('i18n switcher is wired into the topbar next to the theme toggle and GitHub link', async () => {
  const html = await source('index.html');
  assert.match(html, /<label class="lang-select-label icon-button" for="lang-select"/);
  assert.match(html, /<select id="lang-select" class="lang-select">/);
  assert.match(html, /<option value="ru">RU<\/option>/);
  assert.match(html, /<option value="en">EN<\/option>/);
  assert.match(html, /<option value="zh">ZH<\/option>/);
  assert.match(html, /<option value="hi">HI<\/option>/);
  // Same relative position as issue #41 requires: theme toggle, then
  // language switcher, then the GitHub link, all inside .topbar-actions.
  assert.match(html, /theme-select-label[\s\S]*?lang-select-label[\s\S]*?topbar-link icon-button/);
  assert.match(html, /<script src="i18n\.js\?v=/);
  // i18n.js must load before main.js: main.js reads window.PortfolioI18n for
  // the mobile-menu aria-label.
  assert.ok(html.indexOf('i18n.js?v=') < html.indexOf('main.js?v='));
});

test('language is resolved before first paint like the theme bootstrap, with a FOUC guard', async () => {
  const html = await source('index.html');
  const css = await source('styles.css');
  assert.match(html, /localStorage\.getItem\("lang-choice"\)/);
  assert.match(html, /navigator\.languages/);
  assert.match(html, /document\.documentElement\.dataset\.lang = lang;/);
  assert.match(html, /document\.documentElement\.lang = lang;/);
  assert.match(html, /document\.documentElement\.classList\.add\("lang-loading"\)/);
  assert.match(css, /\.lang-loading body\s*\{[^}]*visibility: hidden;/s);
});

test('the lang-loading guard fails open if i18n.js never runs', async () => {
  // i18n.js is normally the only thing that removes .lang-loading. If it
  // never executes (blocked by an ad-blocker/CSP, a network failure, a
  // missing/stale deploy artifact), styles.css's `.lang-loading body {
  // visibility: hidden; }` would otherwise hide the page forever. The
  // bootstrap script must carry an independent timeout that removes the
  // guard on its own, so a visitor gets a possible flash of untranslated
  // English rather than a permanently blank page.
  const html = await source('index.html');
  assert.match(
    html,
    /if \(lang !== "en"\) \{[\s\S]*?classList\.add\("lang-loading"\)[\s\S]*?setTimeout\(function \(\) \{[\s\S]*?classList\.remove\("lang-loading"\)[\s\S]*?\}, \d+\);[\s\S]*?\}/
  );
});

function fakeElement({ tagName = 'SPAN', attrs = {} } = {}) {
  const attributes = { ...attrs };
  return {
    tagName,
    textContent: '',
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(attributes, name) ? attributes[name] : null; },
    setAttribute(name, value) { attributes[name] = String(value); }
  };
}

test('applyTranslations rewrites textContent, attributes, and meta tags for the selected language', async () => {
  const i18nScript = await source('i18n.js');
  const heroLead = fakeElement({ attrs: { 'data-i18n': 'hero.lead' } });
  const brandLink = fakeElement({ tagName: 'A', attrs: { 'data-i18n-attr': 'aria-label:topbar.brand', 'aria-label': 'axisrow — back to top' } });
  const githubLink = fakeElement({ tagName: 'A', attrs: { 'data-i18n-attr': 'aria-label:topbar.github,title:topbar.github', 'aria-label': 'GitHub', title: 'GitHub' } });
  const titleTag = fakeElement({ tagName: 'TITLE', attrs: { 'data-i18n-meta': 'meta.title' } });
  const descriptionMeta = fakeElement({ tagName: 'META', attrs: { 'data-i18n-meta': 'meta.description', content: 'placeholder' } });

  const byAttr = {
    '[data-i18n]': [heroLead],
    '[data-i18n-attr]': [brandLink, githubLink],
    '[data-i18n-meta]': [titleTag, descriptionMeta]
  };
  const documentElement = { lang: 'en', dataset: { lang: 'en' }, classList: { remove() {} } };
  const sandbox = {
    window: {},
    document: {
      documentElement,
      querySelectorAll(selector) { return byAttr[selector] || []; },
      getElementById() { return null; },
      querySelector() { return null; }
    },
    navigator: { languages: ['en'] },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(i18nScript, sandbox, { filename: 'i18n.js' });
  const i18n = sandbox.window.PortfolioI18n;

  i18n.setLanguage('ru', false);
  assert.equal(documentElement.lang, 'ru');
  assert.equal(heroLead.textContent, i18n.translate('ru', 'hero.lead'));
  assert.notEqual(heroLead.textContent, i18n.translate('en', 'hero.lead'));
  assert.equal(brandLink.getAttribute('aria-label'), i18n.translate('ru', 'topbar.brand'));
  assert.equal(githubLink.getAttribute('aria-label'), i18n.translate('ru', 'topbar.github'));
  assert.equal(githubLink.getAttribute('title'), i18n.translate('ru', 'topbar.github'));
  assert.equal(titleTag.textContent, i18n.translate('ru', 'meta.title'));
  assert.equal(descriptionMeta.getAttribute('content'), i18n.translate('ru', 'meta.description'));

  i18n.setLanguage('en', false);
  assert.equal(heroLead.textContent, i18n.translate('en', 'hero.lead'));
});

test('applyTranslations interpolates data-i18n-vars placeholders for text and meta nodes', async () => {
  const i18nScript = await source('i18n.js');
  // stars.chartTitle/stars.chartDesc carry {startDate}/{count}/{endDate}
  // placeholders (the SVG chart's <title>/<desc> are bot-synced, not static
  // strings) — data-i18n-vars supplies per-node values, same JSON-on-attribute
  // shape used in index.html and the stars.html.j2 template.
  const chartTitle = fakeElement({
    tagName: 'title',
    attrs: { 'data-i18n-meta': 'stars.chartTitle', 'data-i18n-vars': '{"startDate":"2026-03-01"}' }
  });
  const chartDesc = fakeElement({
    tagName: 'desc',
    attrs: { 'data-i18n-meta': 'stars.chartDesc', 'data-i18n-vars': '{"count":"108","endDate":"2026-08-14"}' }
  });
  const malformed = fakeElement({
    attrs: { 'data-i18n': 'stars.chartTitle', 'data-i18n-vars': '{not valid json' }
  });

  const byAttr = {
    '[data-i18n]': [malformed],
    '[data-i18n-attr]': [],
    '[data-i18n-meta]': [chartTitle, chartDesc]
  };
  const documentElement = { lang: 'en', dataset: { lang: 'en' }, classList: { remove() {} } };
  const sandbox = {
    window: {},
    document: {
      documentElement,
      querySelectorAll(selector) { return byAttr[selector] || []; },
      getElementById() { return null; },
      querySelector() { return null; }
    },
    navigator: { languages: ['en'] },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(i18nScript, sandbox, { filename: 'i18n.js' });
  const i18n = sandbox.window.PortfolioI18n;

  i18n.setLanguage('ru', false);
  assert.equal(chartTitle.textContent, 'Совокупное число звёзд на GitHub с 2026-03-01');
  assert.equal(chartDesc.textContent, 'На графике показано 108 звёзд по состоянию на 2026-08-14.');
  // A malformed data-i18n-vars degrades to the untranslated {placeholder}
  // tokens instead of throwing, so the rest of the page still translates.
  assert.equal(malformed.textContent, i18n.translate('ru', 'stars.chartTitle'));
  assert.match(malformed.textContent, /\{startDate\}/);
});

test('applyTranslations interpolates meta.description/ogDescription from live data-profile-value counters', async () => {
  const i18nScript = await source('i18n.js');
  // meta.description/meta.ogDescription no longer bake PR/star/starred counts
  // as dictionary literals (those went stale the moment profile/sync's daily
  // bot updated the numbers elsewhere on the page without touching i18n.js).
  // Instead they carry {prs}/{stars}/{starred} placeholders that
  // readProfileVars fills from the same <span data-profile-value> nodes the
  // bot keeps current.
  const descriptionMeta = fakeElement({ tagName: 'META', attrs: { 'data-i18n-meta': 'meta.description', content: 'placeholder' } });
  const ogDescriptionMeta = fakeElement({ tagName: 'META', attrs: { 'data-i18n-meta': 'meta.ogDescription', content: 'placeholder' } });
  const profileSpans = {
    merged_upstream_prs: fakeElement({ attrs: {} }),
    stars_earned: fakeElement({ attrs: {} }),
    starred_projects: fakeElement({ attrs: {} })
  };
  profileSpans.merged_upstream_prs.textContent = '42';
  profileSpans.stars_earned.textContent = '150';
  profileSpans.starred_projects.textContent = '9';

  const byAttr = {
    '[data-i18n]': [],
    '[data-i18n-attr]': [],
    '[data-i18n-meta]': [descriptionMeta, ogDescriptionMeta]
  };
  const documentElement = { lang: 'en', dataset: { lang: 'en' }, classList: { remove() {} } };
  const sandbox = {
    window: {},
    document: {
      documentElement,
      querySelectorAll(selector) { return byAttr[selector] || []; },
      getElementById() { return null; },
      querySelector(selector) {
        const match = /data-profile-value="([^"]+)"/.exec(selector);
        return match ? profileSpans[match[1]] || null : null;
      }
    },
    navigator: { languages: ['en'] },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(i18nScript, sandbox, { filename: 'i18n.js' });
  const i18n = sandbox.window.PortfolioI18n;

  i18n.setLanguage('ru', false);
  assert.equal(
    descriptionMeta.getAttribute('content'),
    'Python-инженер: инструменты для AI-агентов, автоматизация и системы данных. 42 PR, принятых в upstream · 150 звёзд · 9 проектов со звёздами.'
  );
  assert.equal(
    ogDescriptionMeta.getAttribute('content'),
    'Инструменты для AI-агентов, автоматизация и системы данных. 42 PR, принятых в upstream · 150 звёзд · 9 проектов со звёздами.'
  );
  assert.doesNotMatch(descriptionMeta.getAttribute('content'), /\{prs\}|\{stars\}|\{starred\}/);
});

test('SVG stars chart title/desc are translated and interpolated, in both index.html and the bot template', async () => {
  const html = await source('index.html');
  const starsTemplate = await source('profile/sync/templates/stars.html.j2');
  for (const markup of [html, starsTemplate]) {
    assert.match(
      markup,
      /<title id="stars-chart-title" data-i18n-meta="stars\.chartTitle" data-i18n-vars='\{"startDate":"[^"]+"\}'/
    );
    assert.match(
      markup,
      /<desc id="stars-chart-desc" data-i18n-meta="stars\.chartDesc" data-i18n-vars='\{"count":"[^"]+","endDate":"[^"]+"\}'/
    );
  }
});

test('the source stars chart keeps its interactive overlay in sync with the bot template', async () => {
  const html = await source('index.html');
  const starsTemplate = await source('profile/sync/templates/stars.html.j2');
  for (const markup of [
    'class="stars-hit-area"',
    'class="stars-crosshair"',
    'class="stars-hover-dot"',
    'class="stars-tooltip"',
    'class="stars-tooltip-value"',
    'class="stars-tooltip-date"'
  ]) {
    assert.ok(html.includes(markup), `index.html must contain ${markup}`);
    assert.ok(starsTemplate.includes(markup), `stars.html.j2 must contain ${markup}`);
  }
});

test('the stars chart tooltip default and current total stay in sync with the hero counter', async () => {
  const html = await source('index.html');
  const tooltip = /class="stars-tooltip-value">(\d+)★/.exec(html);
  const current = /class="stars-current"><strong>(\d+)★/.exec(html);
  const hero = /data-profile-value="stars_earned" data-target="(\d+)">\1/.exec(html);
  assert.ok(tooltip, 'index.html must contain a stars-tooltip-value');
  assert.ok(current, 'index.html must contain a stars-current total');
  assert.ok(hero, 'index.html must contain the hero stars_earned counter');
  assert.equal(tooltip[1], current[1], 'tooltip default must match the current total');
  assert.equal(current[1], hero[1], 'current total must match the hero stars_earned counter');
});

test('main.js keeps the mobile-menu aria-label translated via PortfolioI18n', async () => {
  const script = await source('main.js');
  assert.match(script, /window\.PortfolioI18n\.translate/);
  assert.match(script, /topbar\.menuOpen/);
  assert.match(script, /topbar\.menuClose/);
});

test('publishing fails closed when GitHub App credentials are unavailable', async () => {
  const workflow = await source('.github/workflows/publish.yml');
  assert.match(workflow, /Validate publishing secrets/);
  assert.match(workflow, /PAT_APP_ID is not configured/);
  assert.match(workflow, /APP_PRIVATE_KEY is not configured/);
  assert.match(workflow, /GitHub App token is empty/);
});

test('loader uses the version manifest and retains explicit fallbacks', async () => {
  const script = await source('main.js');
  const skins = await source('effect-skins.js');
  const html = await source('index.html');
  assert.match(script, /manifest\.json/);
  assert.match(script, /window\.location\.protocol === "file:"/);
  assert.match(script, /manifest\.apiVersion !== 3/);
  assert.match(script, /searchParams\.set\("v", manifest\.version\)/);
  assert.match(script, /demoscene-fallback/);
  assert.match(script, /function useStaticFallback\(error\) \{\s*destroyEffects\(\);\s*root\.classList\.remove\("demoscene-ready"\);\s*root\.classList\.add\("demoscene-fallback"\);/);
  assert.match(script, /catch \(error\) \{\s*useStaticFallback\(error\);/);
  assert.match(script, /controller\.renderOnce\(0\)/);
  assert.match(script, /controller\.getStats\(\)\.backend === "canvas2d"/);
  assert.match(script, /definition\.staticOnly \|\| cpuOnlyMandelbrot/);
  assert.match(script, /selector: "#opensource-mandelbrot",\s*surface: "preview",\s*staticOnly: reduced/);
  assert.doesNotMatch(script, /staticOnly: reduced \|\| mobile/);
  // The four section accents are optional by design: mountEffects() skips a
  // missing factory, so requiring them here would turn a partial bundle into a
  // whole-site fallback instead of four missing accents.
  assert.match(script, /var requiredEffects = \["metaballs", "plasma", "mandelbrot"\];/);
  for (const name of ['starfield', 'feedback', 'rotozoom', 'copperBars']) {
    assert.match(script, new RegExp(`name: "${name}",\\s*selector: "#[a-z-]+",\\s*surface: "preview",\\s*staticOnly: reduced`));
  }
  assert.match(html, /effect-skins\.js/);
  assert.doesNotMatch(skins, /runtime:|maxFps:|pixelRatio:|pauseWhenHidden:/);
  assert.match(skins, /backend: "auto"/);
  assert.match(skins, /minZoom: 4000/);
  assert.match(skins, /maxZoom: 250000/);
  assert.match(skins, /startPhase: mobile \? 0\.12 : 0\.25/);
  assert.match(skins, /cycleSeconds: 4800/);
  assert.doesNotMatch(script, /palette:|fieldStrength:|renderResolution:/);
});

const EFFECT_NAMES = [
  'metaballs', 'plasma', 'mandelbrot', 'starfield', 'feedback', 'rotozoom', 'copperBars'
];

test('all seven effects use one exact palette in each theme', async () => {
  const skinScript = await source('effect-skins.js');
  const sandbox = { window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });

  const expected = {
    light: ['#f7f1e6', '#cad8dc', '#79a7ad', '#d49368', '#526b75'],
    dark: ['#090b0f', '#17405f', '#2e7180', '#dc8d67', '#f0c36d']
  };
  for (const theme of ['light', 'dark']) {
    const skins = sandbox.PortfolioEffectSkins.create(theme, false);
    for (const name of EFFECT_NAMES) {
      assert.deepEqual(Array.from(skins[name].appearance.palette), expected[theme], `${theme} ${name}`);
      assert.equal(skins[name].appearance.colorCount, 256, `${theme} ${name} colorCount`);
      assert.equal(skins[name].appearance.backgroundColor, expected[theme][0]);
      // Each effect now gets its own frozen appearance object (it may carry
      // effect-specific modifiers), but the palette ARRAY is still one shared
      // reference — that is the single-source-of-truth invariant.
      assert.equal(skins[name].appearance.palette, skins.metaballs.appearance.palette, `${theme} ${name} palette`);
      assert.ok(Object.isFrozen(skins[name].appearance), `${theme} ${name} frozen`);
    }
    assert.equal(skins.mandelbrot.appearance.interiorColor, expected.dark[0]);
    // Colour-typed modifiers must reference the palette, never a fresh literal.
    assert.equal(typeof skins.feedback.appearance.strokeAlpha, 'number');
    assert.ok(Object.isFrozen(skins.metaballs.appearance.palette));
  }
  for (const color of [...expected.light, ...expected.dark]) {
    assert.equal(skinScript.split(color).length - 1, 1, `${color} must have one source of truth`);
  }
});

test('no effect carries an appearance key its library defaults would reject', async () => {
  // The library's assertKnownKeys throws RangeError on any config key absent
  // from that effect's configDefaults, and main.js mounts every effect in one
  // unguarded pass — so a single foreign key drops the whole site to the static
  // fallback. This pins the shared core plus each effect's allowed modifiers.
  const skinScript = await source('effect-skins.js');
  const sandbox = { window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });

  const core = ['palette', 'colorCount', 'backgroundColor'];
  const allowed = {
    metaballs: [],
    plasma: [],
    copperBars: [],
    mandelbrot: ['interiorColor', 'colorScale', 'colorCurve', 'colorOffset', 'cycleSpeed'],
    starfield: ['trailFade', 'minAlpha', 'maxAlpha', 'minLineWidth', 'maxLineWidth'],
    feedback: ['strokeAlpha'],
    rotozoom: ['contrast']
  };
  for (const mobile of [false, true]) {
    const skins = sandbox.PortfolioEffectSkins.create('dark', mobile);
    for (const name of EFFECT_NAMES) {
      const permitted = new Set([...core, ...allowed[name]]);
      for (const key of Object.keys(skins[name].appearance)) {
        assert.ok(permitted.has(key), `${name}.appearance.${key} is not permitted (mobile=${mobile})`);
      }
    }
  }
  assert.throws(
    () => sandbox.PortfolioEffectSkins.create('dark', false, {
      starfield: { appearance: { trailFade: 0.9 } }
    }),
    /PortfolioEffectSkins\.effects\.starfield\.appearance is forbidden/
  );
});

test('shared colors cannot be overridden from an individual effect', async () => {
  const skinScript = await source('effect-skins.js');
  const sandbox = { window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });

  assert.throws(
    () => sandbox.PortfolioEffectSkins.create('dark', false, {
      metaballs: { appearance: { palette: ['#000000', '#ffffff'] } }
    }),
    /PortfolioEffectSkins\.effects\.metaballs\.appearance is forbidden/
  );
  const skins = sandbox.PortfolioEffectSkins.create('dark', false);
  assert.throws(() => { skins.metaballs.appearance.palette[0] = '#ffffff'; }, TypeError);
  assert.equal(skins.plasma.appearance.palette[0], '#090b0f');
});

test('individual non-color settings remain independently configurable', async () => {
  const skinScript = await source('effect-skins.js');
  const sandbox = { window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });

  const baseline = sandbox.PortfolioEffectSkins.create('dark', false);
  const customized = sandbox.PortfolioEffectSkins.create('dark', false, {
    plasma: { motion: { speed: 0.9 }, field: { radialCenterX: 0.3 } }
  });
  assert.equal(customized.plasma.motion.speed, 0.9);
  assert.equal(customized.plasma.field.radialCenterX, 0.3);
  assert.equal(customized.metaballs.motion.speed, baseline.metaballs.motion.speed);
  assert.equal(customized.mandelbrot.motion.speed, baseline.mandelbrot.motion.speed);
  // Each effect owns its appearance object now, but the palette array behind
  // them stays one shared reference.
  assert.equal(customized.plasma.appearance.palette, customized.metaballs.appearance.palette);
});

test('mobile skins render a finer pattern without changing desktop composition', async () => {
  const skinScript = await source('effect-skins.js');
  const sandbox = { window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });

  const desktop = sandbox.PortfolioEffectSkins.create('dark', false);
  const mobile = sandbox.PortfolioEffectSkins.create('dark', true);
  assert.equal(desktop.metaballs.field.strength, 0.75);
  assert.equal(mobile.metaballs.field.strength, 0.72);
  assert.equal(desktop.metaballs.field.fieldStrength, undefined);
  assert.equal(mobile.metaballs.field.fieldStrength, undefined);
  assert.equal(desktop.metaballs.field.pointCount, 5);
  assert.equal(mobile.metaballs.field.pointCount, 5);
  assert.deepEqual(Array.from(desktop.plasma.field.frequencies), [0.04, 0.04, 0.04, 1]);
  assert.deepEqual(Array.from(mobile.plasma.field.frequencies), [0.09, 0.09, 0.09, 1.8]);
  assert.equal(desktop.mandelbrot.motion.startPhase, 0.25);
  assert.equal(mobile.mandelbrot.motion.startPhase, 0.12);
  assert.equal(desktop.mandelbrot.runtime, undefined);
  assert.equal(mobile.mandelbrot.runtime, undefined);
  assert.equal(desktop.mandelbrot.render.resolution, undefined);
  assert.equal(mobile.mandelbrot.render.resolution, undefined);
  assert.equal(desktop.mandelbrot.render.backend, 'auto');
  assert.equal(mobile.mandelbrot.render.backend, 'auto');
  assert.equal(desktop.mandelbrot.motion.cycleSeconds, 4800);
});

test('starfield particle count stays within the vendored preview budget', async () => {
  const skinScript = await source('effect-skins.js');
  const sandbox = { window: null };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });

  const desktop = sandbox.PortfolioEffectSkins.create('dark', false);
  const mobile = sandbox.PortfolioEffectSkins.create('dark', true);
  // main.js mounts starfield on the "preview" surface, whose vendored
  // profiles use densityMode "explicit" -- particleCount passes straight
  // through with no densityMax clamp (that clamp only applies in "area"
  // mode). The library's own preview.desktop/preview.mobile budgets are
  // 120/90; a raised count is fine, but it must stay a bounded multiple of
  // that budget, not the ~10x this panel-sized, 24-30fps surface can't
  // absorb on constrained devices.
  assert.ok(desktop.starfield.particles.particleCount <= 120 * 2);
  assert.ok(mobile.starfield.particles.particleCount <= 90 * 2);
});

function createClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    toggle(name, force) {
      if (force === true) values.add(name);
      else if (force === false) values.delete(name);
      else if (values.has(name)) values.delete(name);
      else values.add(name);
      return values.has(name);
    },
    contains(name) { return values.has(name); }
  };
}

async function runLoader({
  manifest,
  responseOk = true,
  bundleError = false,
  missingApi = false,
  reducedMotion = false,
  fileProtocol = false
}) {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const appendedScripts = [];
  const warnings = [];
  let fetchCalls = 0;

  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
  }

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: MockIntersectionObserver,
    console: { warn(...args) { warnings.push(args.join(' ')); } },
    document: {
      hidden: false,
      documentElement: root,
      head: {
        appendChild(element) {
          appendedScripts.push(element.src);
          queueMicrotask(() => {
            if (bundleError) {
              element.onerror();
              return;
            }
            if (!missingApi) {
              sandbox.Demoscene = {
                metaballs() {},
                plasma() {},
                mandelbrot() {},
                starfield() {},
                feedback() {},
                rotozoom() {},
                copperBars() {}
              };
            }
            element.onload();
          });
        }
      },
      addEventListener() {},
      createElement(tag) {
        assert.equal(tag, 'script');
        return {};
      },
      getElementById() { return null; },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') {
          return { getAttribute() { return 'assets/demoscene'; } };
        }
        return null;
      },
      querySelectorAll() { return []; }
    },
    fetch: async () => {
      fetchCalls++;
      return { ok: responseOk, async json() { return manifest; } };
    },
    location: {
      href: fileProtocol ? 'file:///tmp/portfolio/index.html' : 'http://localhost/',
      protocol: fileProtocol ? 'file:' : 'http:'
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia(query) {
      return {
        matches: reducedMotion && query.includes('prefers-reduced-motion'),
        addEventListener() {}
      };
    },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));
  return { root, appendedScripts, warnings, fetchCalls };
}

async function runEffectRuntime({ reducedMotion = false, mobile = false, throwingEffect = null, renderOnceThrows = null, fxControls = false, storedFxPause = null } = {}) {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const warnings = [];
  const factoryCalls = [];
  const controllers = [];
  const effectEntries = [
    ['metaballs', '#hero-metaballs'],
    ['plasma', '#projects-plasma'],
    ['mandelbrot', '#opensource-mandelbrot'],
    ['starfield', '#stars-starfield'],
    ['feedback', '#experience-feedback'],
    ['rotozoom', '#about-rotozoom'],
    ['copperBars', '#contact-copper-bars']
  ];
  const elements = new Map(effectEntries.map(([name, selector]) => [selector, {
    id: selector.slice(1),
    dataset: { effect: name },
    classList: createClassList()
  }]));
  const observers = [];
  const mediaChangeHandlers = {};
  const unloadHandlers = [];

  // A working localStorage mock so FX-pause persistence can be exercised:
  // `breakStorage()` simulates a full/quota-failed store (setItem must throw)
  // without touching getItem, mirroring real storage failure modes.
  const localStorageData = {};
  if (storedFxPause !== null) localStorageData['fx-paused'] = storedFxPause;
  let storageBroken = false;
  const localStorageMock = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(localStorageData, key) ? localStorageData[key] : null; },
    setItem(key, value) {
      if (storageBroken) throw new Error('quota exceeded');
      localStorageData[key] = String(value);
    }
  };

  // FX panel controls (only resolved from getElementById when fxControls is
  // set, so existing sandboxes that return null keep their behaviour).
  const fxSpeed = { value: '1', addEventListener(type, handler) { if (type === 'input') this._input = handler; } };
  const fxSpeedVal = { textContent: '' };
  const fxReset = { addEventListener(type, handler) { if (type === 'click') this._click = handler; } };
  const fxPause = { checked: true, addEventListener(type, handler) { if (type === 'change') this._change = handler; } };
  const fxPauseState = {
    textContent: '',
    attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; }
  };
  const fxElements = { 'fx-speed': fxSpeed, 'fx-speed-val': fxSpeedVal, 'fx-reset': fxReset, 'fx-pause': fxPause, 'fx-pause-state': fxPauseState };

  class MockIntersectionObserver {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
      this.observed = new Set();
      observers.push(this);
    }

    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    deliver(entries) {
      const observedEntries = entries.filter((entry) => this.observed.has(entry.target));
      if (observedEntries.length) this.callback(observedEntries);
    }
  }

  const factories = Object.fromEntries(effectEntries.map(([name]) => [name, (element) => {
    factoryCalls.push(name);
    if (name === throwingEffect) throw new Error(`${name} mount failed`);
    const controller = {
      name,
      element,
      destroyed: false,
      running: false,
      renderTimes: [],
      start() { this.running = true; },
      stop() { this.running = false; },
      destroy() { this.destroyed = true; this.running = false; },
      renderOnce(time) {
        this.renderTimes.push(time);
        if (name === renderOnceThrows) throw new Error(`${name} renderOnce failed`);
      },
      getStats() { return { backend: 'webgl2' }; }
    };
    controllers.push(controller);
    return controller;
  }]));

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: MockIntersectionObserver,
    console: { warn(...args) { warnings.push(args.join(' ')); } },
    document: {
      hidden: false,
      documentElement: root,
      head: {
        appendChild(element) {
          queueMicrotask(() => {
            sandbox.Demoscene = factories;
            element.onload();
          });
        }
      },
      addEventListener() {},
      createElement(tag) {
        assert.equal(tag, 'script');
        return {};
      },
      getElementById(id) { return fxControls && fxElements[id] ? fxElements[id] : null; },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') {
          return { getAttribute() { return 'assets/demoscene'; } };
        }
        return elements.get(selector) || null;
      },
      querySelectorAll() { return []; }
    },
    fetch: async () => ({
      ok: true,
      async json() { return { version: 'lazy123', apiVersion: 3, bundle: 'demoscene.js' }; }
    }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: localStorageMock,
    matchMedia(query) {
      const mql = {
        matches: (reducedMotion && query.includes('prefers-reduced-motion'))
          || (mobile && query.includes('max-width')),
        addEventListener(type, handler) {
          if (type !== 'change') return;
          (mediaChangeHandlers[query] || (mediaChangeHandlers[query] = [])).push(handler);
        }
      };
      return mql;
    },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener(type, handler) {
      if (type === 'beforeunload') unloadHandlers.push(handler);
    },
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  return {
    root,
    warnings,
    factoryCalls,
    controllers,
    elements,
    observers,
    window: sandbox,
    mediaChangeHandlers,
    unloadHandlers,
    fxPause,
    fxPauseState,
    fxReset,
    fxSpeed,
    localStorageData,
    breakStorage() { storageBroken = true; },
    remount() {
      const reducedHandlers = mediaChangeHandlers['(prefers-reduced-motion: reduce)'] || [];
      reducedHandlers.forEach((handler) => handler());
    },
    mountObserver: observers.find((observer) => observer.options.threshold === 0),
    playbackObserver: observers.find((observer) => observer.options.rootMargin && observer !== observers.at(-1))
  };
}

test('effect controllers mount only on their first viewport intersection', async () => {
  const runtime = await runEffectRuntime();
  const hero = runtime.elements.get('#hero-metaballs');

  assert.deepEqual(runtime.factoryCalls, []);
  assert.equal(runtime.mountObserver.observed.size, 7);

  runtime.mountObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.1 }]);
  assert.deepEqual(runtime.factoryCalls, ['metaballs']);
  assert.equal(runtime.mountObserver.observed.has(hero), false);
  assert.equal(runtime.playbackObserver.observed.has(hero), true);

  runtime.mountObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 1 }]);
  assert.deepEqual(runtime.factoryCalls, ['metaballs'], 'an effect must mount at most once before a remount');
});

test('lazy-mounted effects retain the desktop playback ratio budget', async () => {
  const runtime = await runEffectRuntime();
  const hero = runtime.elements.get('#hero-metaballs');
  const projects = runtime.elements.get('#projects-plasma');
  const opensource = runtime.elements.get('#opensource-mandelbrot');

  runtime.mountObserver.deliver([
    { target: hero, isIntersecting: true, intersectionRatio: 0.1 },
    { target: projects, isIntersecting: true, intersectionRatio: 0.1 },
    { target: opensource, isIntersecting: true, intersectionRatio: 0.1 }
  ]);
  runtime.playbackObserver.deliver([
    { target: hero, isIntersecting: true, intersectionRatio: 0.4 },
    { target: projects, isIntersecting: true, intersectionRatio: 0.8 },
    { target: opensource, isIntersecting: true, intersectionRatio: 0.6 }
  ]);

  const running = runtime.controllers.filter((controller) => controller.running).map((controller) => controller.name);
  assert.deepEqual(running, ['plasma', 'mandelbrot']);
});

test('lazy-mounted effects retain the one-scene mobile playback budget', async () => {
  const runtime = await runEffectRuntime({ mobile: true });
  const hero = runtime.elements.get('#hero-metaballs');
  const projects = runtime.elements.get('#projects-plasma');

  runtime.mountObserver.deliver([
    { target: hero, isIntersecting: true, intersectionRatio: 0.1 },
    { target: projects, isIntersecting: true, intersectionRatio: 0.1 }
  ]);
  runtime.playbackObserver.deliver([
    { target: hero, isIntersecting: true, intersectionRatio: 0.4 },
    { target: projects, isIntersecting: true, intersectionRatio: 0.8 }
  ]);

  const running = runtime.controllers.filter((controller) => controller.running).map((controller) => controller.name);
  assert.deepEqual(running, ['plasma']);
});

test('reduced-motion effects lazy-render once and leave both effect observers', async () => {
  const runtime = await runEffectRuntime({ reducedMotion: true });
  const stars = runtime.elements.get('#stars-starfield');

  assert.deepEqual(runtime.factoryCalls, []);
  runtime.mountObserver.deliver([{ target: stars, isIntersecting: true, intersectionRatio: 0.01 }]);

  assert.deepEqual(runtime.factoryCalls, ['starfield']);
  assert.deepEqual(runtime.controllers[0].renderTimes, [0]);
  assert.equal(runtime.controllers[0].running, false);
  assert.equal(runtime.observers.some((observer) => observer.observed.has(stars)), false);
});

test('a reduced-motion renderOnce failure activates the static fallback without a stale scene', async () => {
  const runtime = await runEffectRuntime({ reducedMotion: true, renderOnceThrows: 'starfield' });
  const stars = runtime.elements.get('#stars-starfield');

  runtime.mountObserver.deliver([{ target: stars, isIntersecting: true, intersectionRatio: 0.01 }]);

  assert.equal(runtime.root.classList.contains('demoscene-ready'), false);
  assert.equal(runtime.root.classList.contains('demoscene-fallback'), true);
  assert.match(runtime.warnings.join('\n'), /starfield renderOnce failed/);
  assert.equal(runtime.controllers[0].destroyed, true);

  // The fallback resets every mount observer; a leftover scene entry from the
  // failed renderOnce path would otherwise leave this element still observed.
  assert.equal(runtime.observers.some((observer) => observer.observed.has(stars)), false);
});

test('a lazy mount failure activates the static fallback', async () => {
  const runtime = await runEffectRuntime({ throwingEffect: 'plasma' });
  const projects = runtime.elements.get('#projects-plasma');

  runtime.mountObserver.deliver([{ target: projects, isIntersecting: true, intersectionRatio: 0.2 }]);

  assert.equal(runtime.root.classList.contains('demoscene-ready'), false);
  assert.equal(runtime.root.classList.contains('demoscene-fallback'), true);
  assert.match(runtime.warnings.join('\n'), /plasma mount failed/);
});

test('manifest loader succeeds and cache-busts the bundle', async () => {
  const result = await runLoader({
    manifest: { version: 'abc123', apiVersion: 3, bundle: 'demoscene.js' }
  });
  assert.equal(result.root.classList.contains('demoscene-ready'), true);
  assert.equal(result.root.classList.contains('demoscene-fallback'), false);
  assert.deepEqual(result.appendedScripts, [
    'http://localhost/assets/demoscene/demoscene.js?v=abc123'
  ]);
});

test('file previews load the vendored API v3 bundle without fetching a manifest', async () => {
  const result = await runLoader({
    fileProtocol: true,
    manifest: { version: 'unused', apiVersion: 3, bundle: 'demoscene.js' }
  });
  assert.equal(result.root.classList.contains('demoscene-ready'), true);
  assert.equal(result.fetchCalls, 0);
  assert.deepEqual(result.appendedScripts, [
    'file:///tmp/portfolio/assets/demoscene/demoscene.js'
  ]);
});

test('manifest loader falls back when the manifest is missing', async () => {
  const result = await runLoader({ responseOk: false });
  assert.equal(result.root.classList.contains('demoscene-fallback'), true);
  assert.deepEqual(result.appendedScripts, []);
  assert.match(result.warnings.join('\n'), /manifest is unavailable/i);
});

test('manifest loader rejects an incompatible API version', async () => {
  const result = await runLoader({
    manifest: { version: 'abc123', apiVersion: 1, bundle: 'demoscene.js' }
  });
  assert.equal(result.root.classList.contains('demoscene-fallback'), true);
  assert.deepEqual(result.appendedScripts, []);
  assert.match(result.warnings.join('\n'), /manifest is incompatible/i);
});

test('manifest loader falls back when the bundle fails', async () => {
  const result = await runLoader({
    manifest: { version: 'abc123', apiVersion: 3, bundle: 'demoscene.js' },
    bundleError: true
  });
  assert.equal(result.root.classList.contains('demoscene-fallback'), true);
  assert.equal(result.appendedScripts.length, 1);
  assert.match(result.warnings.join('\n'), /bundle failed to load/i);
});

test('manifest loader falls back when the loaded bundle lacks API v3 effects', async () => {
  const result = await runLoader({
    manifest: { version: 'abc123', apiVersion: 3, bundle: 'demoscene.js' },
    missingApi: true
  });
  assert.equal(result.root.classList.contains('demoscene-fallback'), true);
  assert.match(result.warnings.join('\n'), /required API v3 effects/i);
});

test('reduced motion loads the library in static mode without starting animated scenes', async () => {
  const result = await runLoader({
    reducedMotion: true,
    manifest: { version: 'static123', apiVersion: 3, bundle: 'demoscene.js' }
  });
  assert.equal(result.root.classList.contains('demoscene-reduced'), true);
  assert.equal(result.root.classList.contains('demoscene-ready'), true);
  assert.equal(result.fetchCalls, 1);
  assert.deepEqual(result.appendedScripts, [
    'http://localhost/assets/demoscene/demoscene.js?v=static123'
  ]);
});

test('both themes and reduced-motion rendering are present', async () => {
  const css = await source('styles.css');
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /--veil: rgba\(/);
  assert.match(css, /\.visual-field\s*\{/);
  // Fields run edge to edge -- no max width, no side gutter.
  assert.match(css, /\.visual-field\s*\{[^}]*width: 100vw;/s);
  assert.match(css, /\.proof-field\s*\{/);
  assert.match(css, /grid-template-columns: minmax\(360px, 0\.38fr\) minmax\(0, 0\.62fr\)/);
  assert.match(css, /\.proof-field\s*\{[^}]*height: 412px;/s);
  // Panels over a live canvas fade towards their canvas instead of painting a
  // flat near-opaque plate, matching .experience-field / .about-field.
  assert.match(css, /\.contact-card\.veil-panel[^{]*\{[^}]*linear-gradient\(90deg, var\(--veil\), var\(--veil\) 46%, transparent 100%\)/s);
  assert.match(css, /\.projects-field-copy\.veil-panel\s*\{[^}]*linear-gradient\(270deg, var\(--veil\), var\(--veil\) 46%, transparent 100%\)/s);
  assert.match(css, /\.proof-field-copy\s*\{[^}]*overflow: hidden/s);
  assert.match(css, /mandelbrot-proof-fallback\.jpg/);
  assert.doesNotMatch(css, /backdrop-filter: blur\(3px\)/);
  assert.doesNotMatch(css, /\.hero-visual \.effect-canvas\s*\{[^}]*filter:/s);
  assert.doesNotMatch(css, /\.plasma-frame \.effect-canvas\s*\{[^}]*filter:/s);
  assert.doesNotMatch(css, /proof-stage|clip-path 900ms|proof-shadow/);
  assert.doesNotMatch(css, /\.effect-canvas\s*\{\s*display: none;/);
  assert.match(css, /min-width: 801px\) and \(max-width: 1180px/);
});

test('the collapsed theme select keeps its option labels readable', async () => {
  const css = await source('styles.css');
  // .theme-select is visually collapsed onto the icon (color: transparent so
  // the underlying icon glyph is what's seen), but that color is inherited by
  // its <option> elements too -- the open dropdown must restore a real color
  // there or the System/Light/Dark labels render invisible.
  assert.match(css, /\.theme-select\s*\{[^}]*color: transparent;/s);
  assert.match(css, /\.theme-select option\s*\{[^}]*color: var\(--ink\);/s);
});

test('Open Source keeps a real rendered JPEG fallback', async () => {
  const fallback = await readFile(new URL('mandelbrot-proof-fallback.jpg', root));
  assert.deepEqual([...fallback.subarray(0, 3)], [255, 216, 255]);
  assert.ok(fallback.length > 40_000);
});

test('social preview is the final 1200 by 630 dark hero', async () => {
  const png = await readFile(new URL('og.png', root));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test('vendored Demoscene manifest and bundle are present for Pages', async () => {
  const manifest = JSON.parse(await source('assets/demoscene/manifest.json'));
  const bundle = await source('assets/demoscene/demoscene.js');
  assert.equal(manifest.apiVersion, 3);
  assert.equal(manifest.bundle, 'demoscene.js');
  for (const name of EFFECT_NAMES) {
    assert.match(bundle, new RegExp(name), `bundle must expose ${name}`);
  }
});

test('the FX speed multiplier does not mutate the frozen effect-skins config', async () => {
  // effect-skins.js deep-freezes every config object it returns (CLAUDE.md:
  // "pure, deeply-frozen config factory"). effectDefinitions() must honour
  // window.__FX_SPEED_MULTIPLIER__ without assigning into that frozen
  // structure, or the assignment throws in strict mode and aborts mounting.
  // effectDefinitions() is only re-evaluated on a fresh mountEffects() call,
  // so set the multiplier and force a remount (remountEffects() debounces
  // via setTimeout(180)) rather than delivering to an already-computed scene.
  const runtime = await runEffectRuntime();
  runtime.window.__FX_SPEED_MULTIPLIER__ = function () { return 1.5; };
  runtime.remount();
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.deepEqual(runtime.warnings, [], 'a non-1 speed multiplier must not trip the static fallback');
  assert.equal(runtime.root.classList.contains('demoscene-fallback'), false);
});

test('changing the reduced-motion preference mid-session remounts effects into static mode', async () => {
  const runtime = await runEffectRuntime();
  const changeHandlers = runtime.mediaChangeHandlers['(prefers-reduced-motion: reduce)'];
  assert.ok(changeHandlers && changeHandlers.length > 0, 'main.js must listen for reduced-motion changes');
});

test('destroyEffects is wired to beforeunload for explicit cleanup', async () => {
  const runtime = await runEffectRuntime();
  assert.ok(runtime.unloadHandlers.length > 0, 'main.js must register a beforeunload cleanup handler');
});

test('stars chart tooltip derives its scale from the rendered y-axis labels, not a hardcoded ceiling', async () => {
  const script = await source('main.js');
  assert.doesNotMatch(script, /110 - \(\(y - 22\)/, 'tooltip must not hardcode the 110/22/298 scale');
});

test('a failed navigator.clipboard write still shows the copy toast via a fallback path', async () => {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const toastClassList = createClassList();
  const toast = { classList: toastClassList };
  const textarea = { style: {}, setAttribute() {}, select() {} };
  let execCommandCalled = false;
  let clickHandler = null;
  const button = {
    dataset: { copyText: 'axisrow@gmail.com' },
    addEventListener(type, handler) { if (type === 'click') clickHandler = handler; }
  };

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: class { observe() {} unobserve() {} },
    console: { warn() {}, error() {} },
    navigator: { clipboard: { writeText() { return Promise.reject(new Error('denied')); } } },
    document: {
      hidden: false,
      documentElement: root,
      body: { appendChild() {}, removeChild() {} },
      head: { appendChild() {} },
      addEventListener() {},
      createElement(tag) { return tag === 'textarea' ? textarea : {}; },
      execCommand() { execCommandCalled = true; return true; },
      getElementById(id) { return id === 'copy-toast' ? toast : null; },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') {
          return { getAttribute() { return 'assets/demoscene'; } };
        }
        return null;
      },
      querySelectorAll(selector) { return selector === '.copy-button' ? [button] : []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: false }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.ok(clickHandler, 'the copy button must be wired to a click handler');
  clickHandler();
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.ok(execCommandCalled, 'a rejected clipboard write must fall back to document.execCommand("copy")');
  assert.equal(toastClassList.contains('is-active'), true, 'the copy toast must still show after the fallback succeeds');
});

test('the scroll-progress bar guards against a zero-height scrollable range', async () => {
  const script = await source('main.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const scrollBar = { style: {} };
  let onScrollHandler = null;

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: class { observe() {} unobserve() {} },
    console: { warn() {}, error() {} },
    document: {
      hidden: false,
      documentElement: Object.assign(root, { scrollTop: 0, scrollHeight: 800, clientHeight: 800 }),
      body: { scrollTop: 0 },
      head: { appendChild() {} },
      addEventListener() {},
      createElement() { return {}; },
      getElementById(id) { return id === 'scroll-progress' ? scrollBar : null; },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') {
          return { getAttribute() { return 'assets/demoscene'; } };
        }
        return null;
      },
      querySelectorAll() { return []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: false }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener(type, handler) { if (type === 'scroll') onScrollHandler = handler; },
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(await source('effect-skins.js'), sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  // scrollHeight === clientHeight -> a zero-height scrollable range.
  assert.ok(onScrollHandler, 'a scroll listener must be registered');
  onScrollHandler();
  assert.notEqual(scrollBar.style.width, 'NaN%', 'the progress bar must not be set to NaN% on a non-overflowing page');
});

test('the stars chart tooltip shows an interpolated calendar date, not a shared month label', async () => {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const tooltipDate = { textContent: '' };
  const tooltipValue = { textContent: '' };
  const tooltip = {
    classList: createClassList(),
    querySelector(selector) {
      if (selector === '.stars-tooltip-value') return tooltipValue;
      if (selector === '.stars-tooltip-date') return tooltipDate;
      return null;
    }
  };
  const titleMeta = { getAttribute() { return JSON.stringify({ startDate: '2026-03-01' }); } };
  const descMeta = { getAttribute() { return JSON.stringify({ endDate: '2026-08-15' }); } };
  // Three points spanning the full chart width; hovering near the middle
  // one should interpolate to a date roughly halfway between start and
  // end, not just whichever of the 6 month labels happens to be nearest.
  const polyline = { getAttribute() { return '54.0,298.0 495.0,160.0 936.0,22.0'; } };
  const yLabel0 = { textContent: '0', getAttribute(attr) { return attr === 'y' ? '298.0' : null; } };
  const yLabel1 = { textContent: '110', getAttribute(attr) { return attr === 'y' ? '22.0' : null; } };
  let pointermoveHandler = null;
  const hitArea = { addEventListener(type, handler) { if (type === 'pointermove') pointermoveHandler = handler; }, getBoundingClientRect() { return { left: 0, width: 960 }; } };
  const starsSvg = {
    viewBox: { baseVal: { width: 960 } },
    getBoundingClientRect() { return { left: 0, width: 960 }; },
    querySelector(selector) {
      if (selector === '.stars-crosshair') return null;
      if (selector === '.stars-hover-dot') return null;
      if (selector === '.stars-hit-area') return hitArea;
      if (selector === '.stars-line') return polyline;
      if (selector === '#stars-chart-title') return titleMeta;
      if (selector === '#stars-chart-desc') return descMeta;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.stars-y-label') return [yLabel0, yLabel1];
      if (selector === '.stars-x-label') return [];
      return [];
    }
  };

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: class { observe() {} unobserve() {} },
    console: { warn() {}, error() {} },
    document: {
      hidden: false,
      documentElement: root,
      body: { appendChild() {}, removeChild() {} },
      head: { appendChild() {} },
      addEventListener() {},
      createElement() { return {}; },
      getElementById() { return null; },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') {
          return { getAttribute() { return 'assets/demoscene'; } };
        }
        if (selector === '.stars-chart svg') return starsSvg;
        if (selector === '.stars-chart .stars-tooltip') return tooltip;
        return null;
      },
      querySelectorAll(selector) { return selector === '.copy-button' ? [] : []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: false }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.ok(pointermoveHandler, 'a pointermove handler must be registered on the hit area');
  pointermoveHandler({ clientX: 495 }); // roughly the chart's horizontal midpoint

  assert.match(tooltipDate.textContent, /^\d{4}-\d{2}-\d{2}$/, 'the tooltip date must be a full ISO date, not a month name');
  assert.notEqual(tooltipDate.textContent, '2026-03-01');
  assert.notEqual(tooltipDate.textContent, '2026-08-15');
});

test('the stars chart ships the raw series and a 12px label floor for the adaptive layout', async () => {
  const html = await source('index.html');
  const starsTemplate = await source('profile/sync/templates/stars.html.j2');
  const styles = await source('styles.css');
  // The generator template pins the data source; the deployed index.html
  // carries the rendered totals on the polyline itself.
  assert.ok(
    starsTemplate.includes('data-series="{{ star_history.chart.series }}"'),
    'stars.html.j2 must bind the generator series onto the polyline'
  );
  assert.match(
    html,
    /class="stars-line"[^>]*data-series="[\d ]+"/,
    'index.html must ship the rendered data-series on the stars polyline'
  );
  assert.match(
    styles,
    /\.stars-y-label,\s*\.stars-x-label\s*\{[^}]*font:\s*12px/s,
    'stars labels must not render below 12 CSS px'
  );
});

test('the stars chart rebuilds its geometry in CSS pixels under ResizeObserver and keeps the tooltip exact after resize', async () => {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const rootEl = { dataset: { theme: 'dark', lang: 'en' }, classList: createClassList() };
  const tooltipDate = { textContent: '' };
  const tooltipValue = { textContent: '' };
  const tooltip = {
    classList: createClassList(),
    querySelector(selector) {
      if (selector === '.stars-tooltip-value') return tooltipValue;
      if (selector === '.stars-tooltip-date') return tooltipDate;
      return null;
    }
  };
  const titleMeta = { getAttribute() { return JSON.stringify({ startDate: '2026-03-01' }); } };
  const descMeta = { getAttribute() { return JSON.stringify({ count: '100', endDate: '2026-04-01' }); } };

  // Minimal fake SVG element factory: enough shape (attributes, parent
  // wiring, tag) for main.js's createElementNS-based rebuild.
  function makeNode(tag) {
    return {
      tag,
      attrs: {},
      textContent: '',
      parentNode: null,
      addEventListener() {},
      setAttribute(key, value) { this.attrs[key] = String(value); },
      getAttribute(key) { return key in this.attrs ? this.attrs[key] : null; }
    };
  }
  const staticPolyline = Object.assign(makeNode('polyline'), {
    // Seven daily points spanning 2026-03-01 → 2026-04-01 so two month
    // anchors (Mar at index 0, Apr at the last day-1 index) exist.
    attrs: { points: '54.0,298.0 200.0,270.0 340.0,240.0 495.0,160.0 640.0,110.0 790.0,80.0 936.0,22.0', 'data-series': '0 10 20 30 60 60 100' }
  });
  let crosshair = Object.assign(makeNode('line'), { attrs: { class: 'stars-crosshair', y1: '22', y2: '298' } });
  let hoverDot = Object.assign(makeNode('circle'), { attrs: { class: 'stars-hover-dot' } });
  const children = [crosshair, hoverDot, staticPolyline];
  const starsSvg = {
    attrs: {},
    children,
    // addLayer() inserts before crosshair only when it is a real child.
    viewBox: { baseVal: { width: 960, height: 340 } },
    setAttribute(key, value) {
      this.attrs[key] = String(value);
      if (key === 'viewBox') {
        const parts = String(value).split(' ');
        this.viewBox.baseVal.width = +parts[2];
        this.viewBox.baseVal.height = +parts[3];
      }
    },
    getAttribute(key) { return key in this.attrs ? this.attrs[key] : null; },
    getBoundingClientRect() { return { left: 0, width: this.viewBox.baseVal.width }; },
    insertBefore(el, ref) {
      el.parentNode = this;
      this.children.splice(Math.max(0, this.children.indexOf(ref)), 0, el);
    },
    removeChild(el) {
      el.parentNode = null;
      this.children.splice(this.children.indexOf(el), 1);
    },
    querySelector(selector) {
      if (selector === '.stars-crosshair') return crosshair;
      if (selector === '.stars-hover-dot') return hoverDot;
      if (selector === '.stars-hit-area') return null;
      if (selector === '.stars-line') return staticPolyline;
      if (selector === '#stars-chart-title') return titleMeta;
      if (selector === '#stars-chart-desc') return descMeta;
      return null;
    },
    querySelectorAll(selector) {
      const cls = selector.split(',').map((s) => s.trim().replace(/^\./, ''));
      return this.children.filter((el) => el.attrs.class && cls.includes(el.attrs.class));
    }
  };
  crosshair.parentNode = starsSvg;
  hoverDot.parentNode = starsSvg;
  staticPolyline.parentNode = starsSvg;
  let pointermoveHandler = null;
  starsSvg.addEventListener = function (type, handler) { if (type === 'pointermove') pointermoveHandler = handler; };
  let resizeCallback = null;
  class MockResizeObserver {
    constructor(callback) { resizeCallback = callback; }
    observe() {} unobserve() {} disconnect() {}
  }

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: class { observe() {} unobserve() {} },
    ResizeObserver: MockResizeObserver,
    console: { warn() {}, error() {} },
    document: {
      hidden: false,
      documentElement: rootEl,
      body: { appendChild() {}, removeChild() {} },
      head: { appendChild() {} },
      addEventListener() {},
      createElement() { return {}; },
      createElementNS: (ns, tag) => makeNode(tag),
      getElementById() { return null; },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') {
          return { getAttribute() { return 'assets/demoscene'; } };
        }
        if (selector === '.stars-chart svg') return starsSvg;
        if (selector === '.stars-chart .stars-tooltip') return tooltip;
        return null;
      },
      querySelectorAll() { return []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: false }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.ok(resizeCallback, 'a ResizeObserver must watch the stars svg');

  // Phone width: the geometry must be rebuilt in CSS pixels…
  resizeCallback([{ contentRect: { width: 320 } }]);
  assert.equal(starsSvg.attrs.viewBox, '0 0 320 180', 'viewBox must switch to CSS-pixel geometry');
  const line = starsSvg.children.filter((el) => el.attrs.class === 'stars-line' && el !== staticPolyline)[0];
  assert.ok(line, 'the polyline must be redrawn');
  const xs = line.attrs.points.split(' ').map((pt) => +pt.split(',')[0]);
  assert.ok(xs.every((x) => x >= 0 && x <= 320), 're plotted coordinates must live inside the 320px viewBox');
  const yLabels = starsSvg.children.filter((el) => el.attrs.class === 'stars-y-label').map((el) => String(el.textContent));
  assert.deepEqual(yLabels, ['0', '50', '100'], 'ticks must be 0/half/ceiling of the dynamic ceiling');
  const xLabels = starsSvg.children.filter((el) => el.attrs.class === 'stars-x-label');
  assert.ok(xLabels.length >= 2, 'at least the first and last month anchors survive thinning');
  assert.ok(xLabels.every((el) => /^month\./.test(el.attrs['data-i18n'])), 'rebuilt month labels must keep their i18n keys');
  assert.ok(xLabels.every((el) => +el.attrs.x >= 0 && +el.attrs.x <= 320), 'month labels must not spill outside the chart');

  // …and the tooltip must stay exact at the series' start, middle, and end.
  assert.ok(pointermoveHandler, 'a pointermove handler must be registered');
  pointermoveHandler({ clientX: 1 });
  assert.equal(tooltipValue.textContent, '0★');
  assert.equal(tooltipDate.textContent, '2026-03-01');
  pointermoveHandler({ clientX: 125 });
  assert.equal(tooltipValue.textContent, '20★');
  assert.equal(tooltipDate.textContent, '2026-03-11');
  pointermoveHandler({ clientX: 319 });
  assert.equal(tooltipValue.textContent, '100★');
  assert.equal(tooltipDate.textContent, '2026-04-01');

  // Desktop width: geometry re-derives, tooltip endpoints remain correct.
  resizeCallback([{ contentRect: { width: 900 } }]);
  assert.match(starsSvg.attrs.viewBox, /^0 0 900 /, 'the viewBox must track the wider container');
  pointermoveHandler({ clientX: 899 });
  assert.equal(tooltipValue.textContent, '100★');
  assert.equal(tooltipDate.textContent, '2026-04-01');
  pointermoveHandler({ clientX: 1 });
  assert.equal(tooltipValue.textContent, '0★');
  assert.equal(tooltipDate.textContent, '2026-03-01');
});

test('dragging the FX speed slider remounts effects so the new speed reaches active scenes', async () => {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const factoryCalls = [];
  function makeController(name) {
    return function () {
      factoryCalls.push(name);
      return { destroy() {}, start() {}, stop() {}, renderOnce() {}, getStats() { return { backend: 'webgl2' }; } };
    };
  }
  // loadDemoscene() requires metaballs/plasma/mandelbrot to all be present
  // (its API-v3 contract check) or it falls back without mounting anything;
  // only metaballs's element resolves via querySelector below, so it's the
  // only one that actually mounts.
  const factories = { metaballs: makeController('metaballs'), plasma: makeController('plasma'), mandelbrot: makeController('mandelbrot') };
  const heroElement = { id: 'hero-metaballs', dataset: { effect: 'metaballs' }, classList: createClassList() };
  const fxSpeed = { value: '1', addEventListener(type, handler) { if (type === 'input') this._input = handler; } };
  const fxSpeedVal = { textContent: '' };

  const ioInstances = [];
  class MockIO {
    constructor(callback, options = {}) { this.callback = callback; this.options = options; this.observed = new Set(); ioInstances.push(this); }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    deliver(entries) { this.callback(entries.filter((entry) => this.observed.has(entry.target))); }
  }

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: MockIO,
    console: { warn() {}, error() {} },
    document: {
      hidden: false,
      documentElement: root,
      head: { appendChild(element) { queueMicrotask(() => { sandbox.Demoscene = factories; element.onload(); }); } },
      addEventListener() {},
      createElement() { return {}; },
      getElementById(id) {
        if (id === 'fx-speed') return fxSpeed;
        if (id === 'fx-speed-val') return fxSpeedVal;
        return null;
      },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') return { getAttribute() { return 'assets/demoscene'; } };
        if (selector === '#hero-metaballs') return heroElement;
        return null;
      },
      querySelectorAll() { return []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: true, async json() { return { version: 'x', apiVersion: 3, bundle: 'demoscene.js' }; } }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Force the hero scene into its first viewport intersection so it
  // actually mounts (mountEffects() otherwise only observes it lazily),
  // then mark it currently visible via the playback observer — a remount
  // must only eagerly re-mount scenes that are actually on screen right
  // now, not every selector ever activated in the session.
  const mountObserver = ioInstances.find((observer) => observer.options.threshold === 0);
  const playbackObserver = ioInstances.find((observer) => Array.isArray(observer.options.threshold) && observer.options.threshold.length > 1);
  assert.ok(mountObserver, 'a mount IntersectionObserver must exist');
  assert.ok(playbackObserver, 'a playback IntersectionObserver must exist');
  mountObserver.deliver([{ target: heroElement, isIntersecting: true, intersectionRatio: 0.1 }]);
  assert.deepEqual(factoryCalls, ['metaballs'], 'the hero effect must mount on first intersection');
  playbackObserver.deliver([{ target: heroElement, isIntersecting: true, intersectionRatio: 0.5 }]);

  assert.ok(fxSpeed._input, 'the fx-speed input handler must be registered');
  fxSpeed.value = '2';
  fxSpeed._input();
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.deepEqual(factoryCalls, ['metaballs', 'metaballs'],
    'moving the speed slider must remount the already-active, currently-visible scene (a 2nd factory call), not just update a stored multiplier');
});

test('a remount does not eagerly re-mount effects that are currently off-screen', async () => {
  const runtime = await runEffectRuntime();
  const hero = runtime.elements.get('#hero-metaballs');

  // Mount the hero effect (first intersection), then scroll it back out of
  // view (playback observer reports isIntersecting: false) before the next
  // remount — e.g. from a later theme toggle or FX-speed slider tick.
  runtime.mountObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.1 }]);
  assert.deepEqual(runtime.factoryCalls, ['metaballs']);
  runtime.playbackObserver.deliver([{ target: hero, isIntersecting: false, intersectionRatio: 0 }]);

  runtime.window.__FX_SPEED_MULTIPLIER__ = function () { return 1.5; };
  runtime.remount();
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.deepEqual(runtime.factoryCalls, ['metaballs'],
    'a scene that is off-screen at remount time must not be eagerly re-created; it should fall back to lazy (IntersectionObserver-gated) mounting');
});

test('the FX playground panel toggles aria-hidden and aria-expanded when opened/closed', async () => {
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');
  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const fxPanelClassList = createClassList();
  let fxPanelAriaHidden = 'true';
  let fxToggleAriaExpanded = 'false';
  let toggleClickHandler = null;
  let closeClickHandler = null;
  const fxToggle = {
    addEventListener(type, handler) { if (type === 'click') toggleClickHandler = handler; },
    setAttribute(name, value) { if (name === 'aria-expanded') fxToggleAriaExpanded = value; }
  };
  const fxPanel = {
    classList: fxPanelClassList,
    setAttribute(name, value) { if (name === 'aria-hidden') fxPanelAriaHidden = value; }
  };
  const fxClose = { addEventListener(type, handler) { if (type === 'click') closeClickHandler = handler; } };

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: class { observe() {} unobserve() {} },
    console: { warn() {}, error() {} },
    document: {
      hidden: false,
      documentElement: root,
      head: { appendChild() {} },
      addEventListener() {},
      createElement() { return {}; },
      getElementById(id) {
        if (id === 'fx-toggle') return fxToggle;
        if (id === 'fx-playground') return fxPanel;
        if (id === 'fx-close') return fxClose;
        return null;
      },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') return { getAttribute() { return 'assets/demoscene'; } };
        return null;
      },
      querySelectorAll() { return []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: false }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.ok(toggleClickHandler, 'the fx-toggle click handler must be registered');
  toggleClickHandler();
  assert.equal(fxPanelClassList.contains('is-open'), true);
  assert.equal(fxPanelAriaHidden, 'false', 'opening the panel must clear aria-hidden');
  assert.equal(fxToggleAriaExpanded, 'true', 'opening the panel must set aria-expanded on the toggle');

  assert.ok(closeClickHandler, 'the fx-close click handler must be registered');
  closeClickHandler();
  assert.equal(fxPanelClassList.contains('is-open'), false);
  assert.equal(fxPanelAriaHidden, 'true', 'closing the panel must restore aria-hidden');
  assert.equal(fxToggleAriaExpanded, 'false', 'closing the panel must clear aria-expanded on the toggle');
});

test('the closed FX panel is excluded from keyboard navigation and Escape closes it', async () => {
  const html = await source('index.html');
  const script = await source('main.js');
  const skinScript = await source('effect-skins.js');

  // Initial markup: the panel ships hidden+inert so no invisible controls are
  // reachable by Tab before any JS runs.
  const asideMatch = html.match(/<aside id="fx-playground"[^>]*>/);
  assert.ok(asideMatch, 'the fx-playground aside must exist in the markup');
  assert.match(asideMatch[0], /\bhidden\b/, 'the panel must ship hidden in the source HTML');
  assert.match(asideMatch[0], /\binert\b/, 'the panel must ship inert in the source HTML');

  const root = { dataset: { theme: 'dark' }, classList: createClassList() };
  const fxPanelClassList = createClassList();
  let fxPanelAriaHidden = 'true';
  let fxToggleAriaExpanded = 'false';
  let toggleClickHandler = null;
  let closeClickHandler = null;
  let keydownHandler = null;
  const focusLog = [];
  let activeElement = null;

  const fxToggle = {
    addEventListener(type, handler) { if (type === 'click') toggleClickHandler = handler; },
    setAttribute(name, value) { if (name === 'aria-expanded') fxToggleAriaExpanded = value; },
    focus() { focusLog.push('fx-toggle'); activeElement = fxToggle; }
  };
  const fxClose = {
    addEventListener(type, handler) { if (type === 'click') closeClickHandler = handler; },
    focus() { focusLog.push('fx-close'); activeElement = fxClose; }
  };
  const fxPanel = {
    classList: fxPanelClassList,
    hidden: true,
    inert: true,
    setAttribute(name, value) { if (name === 'aria-hidden') fxPanelAriaHidden = value; },
    contains(node) { return node === fxClose; }
  };

  const sandbox = {
    AbortController,
    Demoscene: {},
    URL,
    IntersectionObserver: class { observe() {} unobserve() {} },
    console: { warn() {}, error() {} },
    document: {
      hidden: false,
      documentElement: root,
      head: { appendChild() {} },
      addEventListener(type, handler) { if (type === 'keydown') keydownHandler = handler; },
      createElement() { return {}; },
      get activeElement() { return activeElement; },
      getElementById(id) {
        if (id === 'fx-toggle') return fxToggle;
        if (id === 'fx-playground') return fxPanel;
        if (id === 'fx-close') return fxClose;
        return null;
      },
      querySelector(selector) {
        if (selector === 'meta[name="demoscene-base"]') return { getAttribute() { return 'assets/demoscene'; } };
        return null;
      },
      querySelectorAll() { return []; },
      readyState: 'complete'
    },
    fetch: async () => ({ ok: false }),
    location: { href: 'http://localhost/', protocol: 'http:' },
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia() { return { matches: false, addEventListener() {} }; },
    requestAnimationFrame(callback) { callback(0); return 1; },
    addEventListener() {},
    removeEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(skinScript, sandbox, { filename: 'effect-skins.js' });
  vm.runInContext(script, sandbox, { filename: 'main.js' });
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.ok(keydownHandler, 'a keydown handler for Escape must be registered on the document');

  // Open: hidden/inert lifted, focus moves to the panel's close control.
  toggleClickHandler();
  assert.equal(fxPanel.hidden, false, 'opening must remove hidden');
  assert.equal(fxPanel.inert, false, 'opening must remove inert');
  assert.equal(fxPanelAriaHidden, 'false');
  assert.equal(fxToggleAriaExpanded, 'true');
  assert.deepEqual(focusLog, ['fx-close'], 'opening must focus the panel close control');

  // Close via Escape while focus is inside the panel: inert applies
  // immediately, focus returns to the toggle.
  keydownHandler({ key: 'Escape' });
  assert.equal(fxPanelClassList.contains('is-open'), false, 'Escape must close the panel');
  assert.equal(fxPanel.inert, true, 'closing must apply inert immediately (tab order)');
  assert.equal(fxPanelAriaHidden, 'true');
  assert.equal(fxToggleAriaExpanded, 'false');
  assert.deepEqual(focusLog, ['fx-close', 'fx-toggle'],
    'closing while focus is inside the panel must return focus to the fx-toggle');

  // The hidden attribute arrives via the timer fallback (no transitionend in
  // this sandbox), and only while the panel is actually closed.
  await new Promise((resolve) => setTimeout(resolve, 320));
  assert.equal(fxPanel.hidden, true, 'the timer fallback must set hidden after the close transition window');

  // Reopening before the fallback fires must not re-hide the panel.
  toggleClickHandler();
  assert.equal(fxPanel.hidden, false);
  assert.equal(fxPanel.inert, false);
  assert.equal(fxPanelClassList.contains('is-open'), true);

  // Escape with another key does nothing; closing via the close button with
  // focus outside the panel does not steal focus.
  keydownHandler({ key: 'Enter' });
  assert.equal(fxPanelClassList.contains('is-open'), true, 'non-Escape keys must not close the panel');
  activeElement = null; // focus elsewhere, outside the panel
  closeClickHandler();
  assert.equal(fxToggleAriaExpanded, 'false');
  assert.equal(focusLog[focusLog.length - 1], 'fx-close',
    'closing with focus outside the panel must not move focus');
});

// All seven effects scrolled into view with distinct ratios, mirroring how
// the playback observer reports a full-page render at load time.
function deliverAllScenesVisible(runtime) {
  const ratios = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
  const entries = [...runtime.elements.values()].map((element, index) => ({
    target: element,
    isIntersecting: true,
    intersectionRatio: ratios[index]
  }));
  runtime.mountObserver.deliver(entries);
  runtime.playbackObserver.deliver(entries);
}

test('the FX pause switch stops every running controller and resume obeys the scene budget', async () => {
  const runtime = await runEffectRuntime({ fxControls: true });
  assert.ok(runtime.fxPause._change, 'the fx-pause change handler must be registered');
  assert.equal(runtime.fxPause.checked, true, 'animation defaults to running');

  deliverAllScenesVisible(runtime);
  let running = runtime.controllers.filter((controller) => controller.running);
  assert.equal(running.length, 2, 'the desktop budget of 2 running scenes must hold before pausing');

  // Pausing: flip the switch to "off" and fire the change event. No remount
  // is involved — the controllers must be stopped through the playback path.
  runtime.fxPause.checked = false;
  runtime.fxPause._change();
  running = runtime.controllers.filter((controller) => controller.running);
  assert.equal(running.length, 0, 'pausing must stop every controller — no render loop may idle at low speed');

  // The pause must also survive the events that normally drive playback:
  // tab visibility, scroll-driven ratio updates, and a remount.
  runtime.playbackObserver.deliver([...runtime.elements.values()].map((element, index) => ({
    target: element,
    isIntersecting: true,
    intersectionRatio: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3][index]
  })));
  runtime.remount();
  await new Promise((resolve) => setTimeout(resolve, 200));
  runtime.mountObserver.deliver([...runtime.elements.values()].map((element) => ({
    target: element,
    isIntersecting: true,
    intersectionRatio: 0.5
  })));
  // A real IntersectionObserver reports the current intersection when an
  // element is (re)observed; the mock needs the entries delivered explicitly.
  runtime.playbackObserver.deliver([...runtime.elements.values()].map((element, index) => ({
    target: element,
    isIntersecting: true,
    intersectionRatio: [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3][index]
  })));
  running = runtime.controllers.filter((controller) => controller.running);
  assert.equal(running.length, 0, 'visibility changes and remounts must not self-resume a paused page');

  // Resuming restarts at most the budget (2 desktop), picking the highest
  // intersectionRatio scenes via the same playback mechanism.
  runtime.fxPause.checked = true;
  runtime.fxPause._change();
  running = runtime.controllers.filter((controller) => controller.running);
  assert.equal(running.length, 2, 'resuming must restart at most 2 scenes on desktop');
});

test('a scene lazily mounted while paused stays stopped and paints one static frame', async () => {
  const runtime = await runEffectRuntime({ fxControls: true });
  const hero = runtime.elements.get('#hero-metaballs');

  // Pause first, before anything has mounted.
  runtime.fxPause.checked = false;
  runtime.fxPause._change();

  // Now scroll the hero into view for the first time: it must lazily mount
  // (so resuming works later) but never start its loop.
  runtime.mountObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.4 }]);
  runtime.playbackObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.4 }]);
  assert.equal(runtime.factoryCalls.length, 1, 'the lazy mount must still happen under pause');
  const controller = runtime.controllers[0];
  assert.equal(controller.running, false, 'a lazily mounted scene under pause must not run');
  assert.deepEqual(controller.renderTimes, [0], 'it must paint exactly one static frame instead');

  // Resuming starts the already-mounted controller without a new mount.
  runtime.fxPause.checked = true;
  runtime.fxPause._change();
  assert.equal(controller.running, true, 'resume must start the lazily mounted controller');
  assert.equal(runtime.factoryCalls.length, 1, 'resume must not remount the scene');
});

test('the FX pause choice persists to storage and a reset keeps it', async () => {
  const runtime = await runEffectRuntime({ fxControls: true });
  const hero = runtime.elements.get('#hero-metaballs');
  runtime.mountObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.4 }]);
  runtime.playbackObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.4 }]);
  assert.equal(runtime.controllers[0].running, true);

  runtime.fxPause.checked = false;
  runtime.fxPause._change();
  assert.equal(runtime.localStorageData['fx-paused'], '1', 'pausing must persist the choice to storage');

  // Reset restores the speed but must not silently undo the user's pause.
  assert.ok(runtime.fxReset._click, 'the fx-reset click handler must be registered');
  runtime.fxReset._click();
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(runtime.controllers[0].running, false, 'reset must keep an explicit pause in place');
  assert.equal(runtime.fxPause.checked, false, 'reset must keep the switch reflecting the pause');
  assert.equal(runtime.localStorageData['fx-paused'], '1');

  // A fresh page (new runtime) with the stored choice starts paused.
  const reloaded = await runEffectRuntime({ fxControls: true, storedFxPause: '1' });
  assert.equal(reloaded.fxPause.checked, false, 'a reload must restore the paused switch state');
  deliverAllScenesVisible(reloaded);
  assert.equal(reloaded.controllers.filter((controller) => controller.running).length, 0,
    'a reloaded page with a stored pause must not run any scene');
});

test('a failing storage backend must not break pausing', async () => {
  const runtime = await runEffectRuntime({ fxControls: true });
  const hero = runtime.elements.get('#hero-metaballs');
  runtime.mountObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.4 }]);
  runtime.playbackObserver.deliver([{ target: hero, isIntersecting: true, intersectionRatio: 0.4 }]);

  runtime.breakStorage();
  runtime.fxPause.checked = false;
  runtime.fxPause._change();
  assert.equal(runtime.controllers[0].running, false,
    'pausing must still stop the controller when localStorage.setItem throws');
  runtime.fxPause.checked = true;
  runtime.fxPause._change();
  assert.equal(runtime.controllers[0].running, true,
    'resuming must still work when localStorage.setItem throws');
});

test('a stored pause coexists with reduced motion and the mobile budget', async () => {
  // Reduced motion keeps priority: even after un-pausing, scenes stay static.
  const reduced = await runEffectRuntime({ fxControls: true, reducedMotion: true });
  const reducedHero = reduced.elements.get('#hero-metaballs');
  reduced.mountObserver.deliver([{ target: reducedHero, isIntersecting: true, intersectionRatio: 0.4 }]);
  assert.deepEqual(reduced.controllers[0].renderTimes, [0], 'reduced motion must render one static frame');
  reduced.fxPause.checked = false;
  reduced.fxPause._change();
  reduced.fxPause.checked = true;
  reduced.fxPause._change();
  assert.equal(reduced.controllers[0].running, false,
    'resume must not override reduced motion — reduced motion keeps priority');

  // Mobile budget: resume starts at most 1 scene.
  const mobile = await runEffectRuntime({ fxControls: true, mobile: true });
  deliverAllScenesVisible(mobile);
  mobile.fxPause.checked = false;
  mobile.fxPause._change();
  assert.equal(mobile.controllers.filter((controller) => controller.running).length, 0);
  mobile.fxPause.checked = true;
  mobile.fxPause._change();
  assert.equal(mobile.controllers.filter((controller) => controller.running).length, 1,
    'resuming on mobile must restart at most 1 scene');
});

test('the FX pause switch is accessible and translated in all four languages', async () => {
  const html = await source('index.html');
  const asideMatch = html.match(/<aside id="fx-playground"[\s\S]*?<\/aside>/);
  assert.ok(asideMatch, 'the fx-playground aside must exist');
  const aside = asideMatch[0];
  assert.match(aside, /<label for="fx-pause" class="fx-label" data-i18n="fx\.animation">/);
  assert.match(aside, /<input id="fx-pause" class="fx-switch" type="checkbox" role="switch" checked \/>/);
  assert.match(aside, /<span id="fx-pause-state" class="fx-val" data-i18n="fx\.state\.running">/);

  const i18nScript = await source('i18n.js');
  const sandbox = {
    window: {},
    document: {
      querySelectorAll: () => [],
      documentElement: fakeDocumentElement(),
      getElementById() { return null; },
      querySelector() { return null; }
    },
    navigator: { languages: ['en'] },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(i18nScript.replace(
    'window.PortfolioI18n = {',
    'window.__I18N_DICTIONARIES__ = DICTIONARIES;\n  window.PortfolioI18n = {'
  ), sandbox, { filename: 'i18n.js' });
  const dictionaries = sandbox.window.__I18N_DICTIONARIES__;
  for (const lang of ['en', 'ru', 'zh', 'hi']) {
    for (const key of ['fx.animation', 'fx.state.running', 'fx.state.paused']) {
      const value = dictionaries[lang][key];
      assert.ok(value && typeof value === 'string' && value !== key,
        `${lang} must carry a real translation for "${key}"`);
    }
  }
});
