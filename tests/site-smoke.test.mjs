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
  assert.match(html, /id="stars"[\s\S]*?<span>01<\/span> Momentum/);
  assert.match(html, /id="projects"[\s\S]*?<span>02<\/span> Selected Work/);
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
  assert.match(css, /@media \(max-width: 720px\)\s*\{\s*:root\s*\{[^}]*--panel-space:\s*24px/s);
  assert.match(css, /@media \(max-width: 720px\)\s*\{\s*:root\s*\{[^}]*--effect-field-gutter:\s*24px/s);
  assert.doesNotMatch(css, /height:\s*clamp\(330px,\s*30vw,\s*(?:390|410)px\)/);
});

test('animated fields remain behind readable mobile cards', async () => {
  const css = await source('styles.css');
  assert.match(css, /\.projects-field-visual\s*\{[^}]*inset:\s*0 calc\(50% - 50vw\);/s);
  assert.match(css, /\.proof-field-visual\s*\{[^}]*inset:\s*0 calc\(50% - 50vw\);/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.visual-field\s*\{[^}]*width:\s*100vw;/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.projects-field-copy\s*\{[^}]*width:\s*calc\(100% - \(var\(--effect-field-gutter\) \* 2\)\)[^}]*margin:\s*var\(--effect-field-gutter\)[^}]*background:\s*var\(--panel-veil\)[^}]*backdrop-filter:\s*none;/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.projects-field-visual\s*\{[^}]*inset:\s*0[^}]*opacity:\s*0\.9[^}]*mask-image:\s*none;/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.proof-field-visual\s*\{[^}]*inset:\s*0[^}]*opacity:\s*0\.9[^}]*mask-image:\s*none;/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.proof-field-copy\s*\{[^}]*width:\s*calc\(100% - \(var\(--effect-field-gutter\) \* 2\)\)[^}]*margin:\s*var\(--effect-field-gutter\)/s);
  assert.doesNotMatch(css, /\.projects-field-visual\s*\{[^}]*inset:[^;}]*-\d+px[^;}]*-\d+px[^;}]*;/s);
  assert.doesNotMatch(css, /\.proof-field-visual\s*\{[^}]*inset:[^;}]*-\d+px[^;}]*-\d+px[^;}]*;/s);
});

test('every section accent is mounted in document order and nothing else is', async () => {
  const html = await source('index.html');
  const effects = Array.from(html.matchAll(/data-effect="([^"]+)"/g), (match) => match[1]);
  // Document order, which is NOT the effectDefinitions() order in main.js —
  // that one is asserted separately below.
  assert.deepEqual(effects, [
    'metaballs', 'starfield', 'plasma', 'mandelbrot', 'tunnel', 'rotozoom', 'copperBars'
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
  assert.match(html, /data-profile-value="merged_upstream_prs" data-target="37">37/);
  assert.match(html, /class="proof-field-visual"/);
  assert.equal((html.match(/class="proof-row"/g) || []).length, 4);
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
  assert.match(html, /chart excludes the 5 stars earned on maintained forks/);
});

test('mobile navigation uses an accessible menu with full-size links', async () => {
  const html = await source('index.html');
  const css = await source('styles.css');
  const script = await source('main.js');
  assert.match(html, /id="menu-toggle"[^>]*aria-controls="section-navigation"[^>]*aria-expanded="false"/);
  assert.match(html, /<nav id="section-navigation" class="section-nav"/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.section-nav\.is-open\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.section-nav a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.brand\s*\{[^}]*width:\s*44px[^}]*height:\s*44px/s);
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
  for (const name of ['starfield', 'tunnel', 'rotozoom', 'copperBars']) {
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
  'metaballs', 'plasma', 'mandelbrot', 'starfield', 'tunnel', 'rotozoom', 'copperBars'
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
    assert.equal(skins.tunnel.appearance.fogColor, expected[theme][0]);
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
    tunnel: ['fogColor'],
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
                tunnel() {},
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

async function runEffectRuntime({ reducedMotion = false, mobile = false, throwingEffect = null } = {}) {
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
    ['tunnel', '#experience-tunnel'],
    ['rotozoom', '#about-rotozoom'],
    ['copperBars', '#contact-copper-bars']
  ];
  const elements = new Map(effectEntries.map(([name, selector]) => [selector, {
    id: selector.slice(1),
    dataset: { effect: name },
    classList: createClassList()
  }]));
  const observers = [];

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
      renderOnce(time) { this.renderTimes.push(time); },
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
      getElementById() { return null; },
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
    localStorage: { getItem() { return null; }, setItem() {} },
    matchMedia(query) {
      return {
        matches: (reducedMotion && query.includes('prefers-reduced-motion'))
          || (mobile && query.includes('max-width')),
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

  return {
    root,
    warnings,
    factoryCalls,
    controllers,
    elements,
    observers,
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
  assert.match(css, /width: min\(1440px, calc\(100vw - 24px\)\)/);
  assert.match(css, /\.proof-field\s*\{/);
  assert.match(css, /grid-template-columns: minmax\(360px, 0\.38fr\) minmax\(0, 0\.62fr\)/);
  assert.match(css, /\.proof-field\s*\{[^}]*height: 380px;/s);
  assert.match(css, /background: color-mix\(in srgb, var\(--veil-solid\) 97%, transparent\)/);
  assert.match(css, /\.proof-field-copy\s*\{[^}]*overflow: hidden/s);
  assert.match(css, /mandelbrot-proof-fallback\.jpg/);
  assert.doesNotMatch(css, /backdrop-filter: blur\(3px\)/);
  assert.doesNotMatch(css, /\.hero-visual \.effect-canvas\s*\{[^}]*filter:/s);
  assert.doesNotMatch(css, /\.plasma-frame \.effect-canvas\s*\{[^}]*filter:/s);
  assert.doesNotMatch(css, /proof-stage|clip-path 900ms|proof-shadow/);
  assert.doesNotMatch(css, /\.effect-canvas\s*\{\s*display: none;/);
  assert.match(css, /min-width: 721px\) and \(max-width: 980px/);
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
