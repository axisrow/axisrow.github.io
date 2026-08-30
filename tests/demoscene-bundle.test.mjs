import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Integration test against the REAL, vendored API v3 Demoscene bundle that the
// site serves from assets/demoscene/demoscene.js.
//
// The existing descriptor test in site-smoke.test.mjs re-implements the v3
// resolver's detectLegacy() from memory and therefore only checks descriptor
// SHAPE ({ skin, surface, device, config }), never whether the config KEYS the
// skins emit are still recognised by the bundle's configDefaults. API v3 added a
// strict recursive assertKnownKeys() that throws RangeError("Unknown option: …")
// on any config key (including nested ones) absent from an effect's
// configDefaults. main.js mounts all effects in one unguarded forEach, so a
// single throwing effect drops the whole site to the static fallback — which is
// exactly the production regression this test guards against.
//
// To stay a true regression guard (not a mock), this test loads the local
// vendored bundle verbatim into a sandbox and drives the real
// factory: Demoscene.<name>(canvas, descriptor) must not throw and must return a
// controller whose start()/stop()/renderOnce() are functions. The descriptor is
// built exactly as main.js builds it, from the skins effect-skins.js produces.

const root = new URL('../', import.meta.url);
const EFFECTS = [
  'metaballs', 'plasma', 'mandelbrot', 'starfield', 'feedback', 'rotozoom', 'copperBars'
];
const SURFACES = {
  metaballs: 'fullscreen',
  plasma: 'preview',
  mandelbrot: 'preview',
  starfield: 'preview',
  feedback: 'preview',
  rotozoom: 'preview',
  copperBars: 'preview'
};

async function source(filename) {
  return readFile(new URL(filename, root), 'utf8');
}

// Minimal Canvas 2D / DOM shims — enough for the bundle's descriptor resolver
// and CPU renderers (createPixelBuffer → getContext2D → createImageData) to run
// end to end. These shims DO NOT mock Demoscene; they mock only the host
// graphics/DOM surface the bundle renders onto, the same way a real browser
// provides it.
function makeContext2D() {
  return {
    canvas: { width: 2, height: 2 },
    getImageData(x, y, w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4) };
    },
    createImageData(w, h) {
      return { data: new Uint8ClampedArray(Math.max(1, w) * Math.max(1, h) * 4), width: w, height: h };
    },
    putImageData() {},
    drawImage() {},
    clearRect() {},
    fillRect() {},
    fillStyle: '',
    imageSmoothingEnabled: false,
    save() {}, restore() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, fill() {}, stroke() {},
    translate() {}, scale() {}, rotate() {}
  };
}
function makeCanvas() {
  const ctx = makeContext2D();
  return {
    width: 2, height: 2, clientWidth: 2, clientHeight: 2,
    getBoundingClientRect() { return { width: 2, height: 2, left: 0, top: 0 }; },
    getContext() { return ctx; },
    style: {},
    addEventListener() {}, removeEventListener() {}
  };
}

function makeSandbox() {
  const sandbox = {
    console,
    performance: { now: () => 1 },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    matchMedia() { return { matches: false }; },
    setTimeout, clearTimeout,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    document: { querySelector() { return null; }, createElement() { return makeCanvas(); } }
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  return sandbox;
}

async function loadVendoredBundle() {
  const manifest = JSON.parse(await source('assets/demoscene/manifest.json'));
  assert.equal(manifest.apiVersion, 3, 'vendored manifest must advertise apiVersion 3');
  assert.ok(typeof manifest.version === 'string' && manifest.version.length > 0,
    'vendored manifest must provide the cache-busting version used by main.js');
  assert.equal(manifest.bundle, 'demoscene.js', 'vendored manifest must select the bundle served by the site');
  const bundleSource = await source('assets/demoscene/demoscene.js');

  const sandbox = makeSandbox();
  vm.runInContext(bundleSource, sandbox, { filename: 'assets/demoscene/demoscene.js' });
  assert.ok(sandbox.Demoscene, 'vendored bundle must expose globalThis.Demoscene');
  for (const name of EFFECTS) {
    assert.equal(typeof sandbox.Demoscene[name], 'function', `Demoscene.${name} must be a factory`);
  }
  return { sandbox };
}

test('vendored v3 bundle builds every portfolio effect from the main.js descriptor', async () => {
  const { sandbox } = await loadVendoredBundle();

  const skinSource = await source('effect-skins.js');
  vm.runInContext(skinSource, sandbox, { filename: 'effect-skins.js' });

  for (const theme of ['light', 'dark']) {
    const applyOverrides = await loadMainJsOverrides(theme);
    assert.equal(typeof applyOverrides, 'function', 'main.js must expose window.applyTunedV3Overrides');
    for (const mobile of [false, true]) {
      const skins = sandbox.PortfolioEffectSkins.create(theme, mobile);
      for (const name of EFFECTS) {
        // Exactly the descriptor main.js assembles at the factory call site
        // (main.js mountEffects): { skin, surface, device, config }.
        const descriptor = {
          skin: 'classic',
          surface: SURFACES[name],
          device: 'auto',
          config: applyOverrides(name, skins[name])
        };
        const canvas = makeCanvas();
        // The real resolver + renderer construction must run without throwing. A
        // throw here is what drops the whole site into the static fallback at
        // runtime. Call the factory directly so we can also assert on its return
        // value (assert.doesNotThrow discards the function's return value).
        const controller = (() => {
          try {
            return sandbox.Demoscene[name](canvas, descriptor);
          } catch (error) {
            assert.fail(`${name} (theme=${theme} mobile=${mobile}) factory threw: ${error.message}`);
          }
        })();
        assert.ok(controller && typeof controller === 'object', `${name} must return a controller`);
        assert.equal(typeof controller.start, 'function', `${name} controller.start`);
        assert.equal(typeof controller.stop, 'function', `${name} controller.stop`);
        assert.equal(typeof controller.renderOnce, 'function', `${name} controller.renderOnce`);
        assert.doesNotThrow(() => controller.renderOnce(0), `${name} renderOnce(0)`);
        assert.doesNotThrow(() => { controller.start(); controller.stop(); }, `${name} start/stop`);
      }
    }
  }
});

// Drive main.js's own override function (window.applyTunedV3Overrides) rather
// than re-implementing it, so the test cannot drift out of sync with the code
// that ships. Loading main.js runs its top-level IIFE, which touches the DOM
// and window at load time; makeMainJsSandbox() stubs just enough for the IIFE
// to finish so the export lands.
function makeMainJsSandbox(theme = 'light') {
  const noopMedia = { addEventListener() {}, removeEventListener() {} };
  const document = {
    // main.js's IIFE calls applyTheme(readStoredThemeChoice(), false) at load
    // time, which re-resolves root.dataset.theme from root.dataset.themeChoice
    // (falling back to "system" + matchMedia() when themeChoice is absent). Our
    // stubbed matchMedia() always reports { matches: false }, so without an
    // explicit themeChoice matching `theme`, a requested "dark" sandbox gets
    // silently reset to "light" before applyTunedV3Overrides ever runs — which
    // would make the dark-theme test iteration a no-op duplicate of light.
    documentElement: { dataset: { theme, themeChoice: theme }, classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    head: { appendChild() {} },
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    addEventListener() {},
    hidden: false
  };
  const win = {
    console,
    matchMedia: () => noopMedia,
    addEventListener() {},
    setTimeout, clearTimeout,
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    // main.js's top-level IIFE also kicks off its async library bootstrap, which
    // uses URL/fetch; we only need the applyTunedV3Overrides export, so let the
    // bootstrap run harmlessly against stubs that resolve to nothing.
    URL,
    fetch: async () => ({ ok: false, json: async () => ({}) }),
    AbortController,
    location: { href: 'https://axisrow.github.io/' },
    document
  };
  win.window = win;
  const sandbox = vm.createContext(win);
  return { sandbox, document };
}

async function loadMainJsOverrides(theme) {
  const { sandbox, document } = makeMainJsSandbox(theme);
  const mainSource = await source('main.js');
  vm.runInContext(mainSource, sandbox, { filename: 'main.js' });
  // Guard against the sandbox's own theme drifting away from what we asked
  // for (main.js's load-time applyTheme() call can silently override it —
  // see the comment in makeMainJsSandbox). If this fails, applyTunedV3Overrides
  // below would be exercised under the wrong theme and the test would give
  // false confidence about dark/light coverage.
  assert.equal(document.documentElement.dataset.theme, theme,
    `test sandbox theme drifted: requested ${theme}, main.js resolved ${document.documentElement.dataset.theme}`);
  return sandbox.window.applyTunedV3Overrides;
}

test('vendored v3 bundle accepts the execution-budget overrides main.js applies', async () => {
  // Regression guard: main.js restores the tuned v3 visuals by mutating a deep
  // copy of each skin (window.applyTunedV3Overrides), writing render.resolution
  // / smoothing and appearance controls. The plasma skin has NO `render` group
  // (the library owns it via a profile slot), so writing config.render.resolution
  // used to throw a TypeError and abort the unguarded mountEffects() loop,
  // dropping the whole site to the static fallback. This test drives main.js's
  // OWN override function and feeds the result to the real factory, so a future
  // regression in that function surfaces here instead of in production.
  const { sandbox } = await loadVendoredBundle();

  const skinSource = await source('effect-skins.js');
  const skinSandbox = makeSandbox();
  vm.runInContext(skinSource, skinSandbox, { filename: 'effect-skins.js' });

  for (const theme of ['light', 'dark']) {
    const applyOverrides = await loadMainJsOverrides(theme);
    assert.equal(typeof applyOverrides, 'function', 'main.js must expose window.applyTunedV3Overrides');
    for (const mobile of [false, true]) {
      const skins = skinSandbox.PortfolioEffectSkins.create(theme, mobile);
      for (const name of ['plasma', 'mandelbrot']) {
        const config = applyOverrides(name, skins[name]);
        // The bug this guards: plasma's skin has no `render`, so a regression
        // that drops the guard throws here (TypeError) before the factory runs.
        assert.ok(config && config.render && typeof config.render.resolution === 'number',
          `${name} override must produce a config with render.resolution`);
        const descriptor = { skin: 'classic', surface: SURFACES[name], device: 'auto', config };
        const canvas = makeCanvas();
        const controller = (() => {
          try {
            return sandbox.Demoscene[name](canvas, descriptor);
          } catch (error) {
            assert.fail(`${name} (theme=${theme} mobile=${mobile}) override descriptor threw: ${error.message}`);
          }
        })();
        assert.ok(controller && typeof controller === 'object', `${name} must return a controller`);
        assert.doesNotThrow(() => controller.renderOnce(0), `${name} override renderOnce(0)`);
      }
    }
  }
});

test('the v2 metaballs fieldStrength key is rejected by the vendored resolver', async () => {
  // Regression guard for the exact production failure: the v2 key
  // `metaballs.field.fieldStrength` is no longer in v3 configDefaults (the v3
  // name is `strength`), so the bundle's assertKnownKeys() must throw on it.
  const { sandbox } = await loadVendoredBundle();

  const canvas = makeCanvas();
  const descriptor = {
    skin: 'classic',
    surface: 'fullscreen',
    device: 'auto',
    config: { field: { pointCount: 5, fieldStrength: 3.4 } }
  };
  assert.throws(
    () => sandbox.Demoscene.metaballs(canvas, descriptor),
    /Unknown option: metaballs\.field\.fieldStrength/,
    'vendored bundle must reject the v2 fieldStrength key'
  );
});
