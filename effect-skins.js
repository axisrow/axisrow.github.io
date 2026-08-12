(function () {
  "use strict";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
    return value;
  }

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!value || typeof value !== "object") return value;
    return Object.keys(value).reduce(function (copy, key) {
      copy[key] = clone(value[key]);
      return copy;
    }, {});
  }

  function merge(base, override) {
    var result = clone(base);
    if (!override) return result;
    Object.keys(override).forEach(function (key) {
      var next = override[key];
      var current = result[key];
      result[key] = next && current
        && typeof next === "object" && typeof current === "object"
        && !Array.isArray(next) && !Array.isArray(current)
        ? merge(current, next)
        : clone(next);
    });
    return result;
  }

  function colors(palette) {
    return {
      palette: palette,
      colorCount: 256,
      backgroundColor: palette[0]
    };
  }

  // The site's ink black: dark-theme background and, for mandelbrot, the
  // interior fill in BOTH themes — a light interior reads as a washed-out
  // hole against the light page, the set body must stay dark.
  var ink = "#090b0f";

  var themes = deepFreeze({
    light: {
      colors: colors(["#f7f1e6", "#cad8dc", "#79a7ad", "#d49368", "#526b75"])
    },
    dark: {
      colors: colors([ink, "#17405f", "#2e7180", "#dc8d67", "#f0c36d"])
    }
  });

  // API v3 ships each effect as a descriptor `{ skin, surface, device, config }`.
  // Execution budgets (runtime.maxFps / pixelRatio / pauseWhenHidden and
  // render.resolution / smoothing) are owned by the library's per-(surface,
  // device) profile slots, so a skin only carries algorithmic identity
  // (field / camera / algorithm), motion identity and the rendering backend
  // choice. Colours arrive through `appearance`, attached in create().
  function effectSettings(mobile) {
    return {
      metaballs: {
        motion: { speed: 0.72 },
        field: {
          // Metaballs only read as a field when neighbouring blobs merge. Three
          // points on a phone-sized canvas stay isolated: measured ink coverage
          // was 18% against 46.7% for the desktop five, which is why the mobile
          // hero looked empty (issue #23). Keep both at five.
          pointCount: 5,
          // API v3 renamed the peak field scalar from the v2 `fieldStrength` to
          // `strength` (configDefaults). The v2 key is now an "Unknown option"
          // and throws inside the descriptor resolver, which (because main.js
          // mounts all effects in one unguarded pass) drops the whole site to the
          // static fallback. Use the v3 key here.
          strength: mobile ? 0.72 : 0.75
        }
      },
      plasma: {
        motion: { speed: 0.42, paletteCycleSpeed: 0 },
        field: mobile ? {
          frequencies: [0.09, 0.09, 0.09, 1.8],
          radialCenterX: 0.5,
          radialCenterY: 0.5,
          amplitudes: [1, 1, 1, 1],
          phaseRates: [1, 0.5, 0.5, 1]
        } : {
          frequencies: [0.04, 0.04, 0.04, 1],
          radialCenterX: 0.5,
          radialCenterY: 0.5,
          amplitudes: [1, 1, 1, 1],
          phaseRates: [1, 0.5, 0.5, 1]
        }
      },
      mandelbrot: {
        render: { backend: "auto" },
        motion: { speed: 1, cycleSeconds: 4800, startPhase: mobile ? 0.12 : 0.25 },
        camera: {
          centerX: -0.7436438870371587,
          centerY: 0.1318259042053119,
          minZoom: 4000,
          maxZoom: 250000
        },
        algorithm: {
          iterationBase: 80,
          iterationGrowth: 60,
          maxIterations: 140,
          escapeRadius: 16
        }
      },
      starfield: {
        motion: { speed: 0.6 }
        // particles.* is projection identity and the profile slot already sizes
        // the population per (surface, device); leaving it alone keeps the seed
        // sequence — and therefore the composition — stable across breakpoints.
      },
      tunnel: {
        // The library defaults (forwardSpeed 0.9 / rotationSpeed 0.25) are demo
        // pace. Behind the contact CTA that reads as motion sickness, so the
        // corridor is slowed to a drift.
        motion: { speed: 1, forwardSpeed: mobile ? 0.45 : 0.55, rotationSpeed: mobile ? 0.08 : 0.12, colorCycleSpeed: 0.05 }
      },
      feedback: {
        motion: { speed: 0.8, colorCycleSpeed: 0.08 },
        geometry: { sides: 6, passes: mobile ? 2 : 3 },
        feedback: { decayPerSecond: 0.35 }
      },
      copperBars: {
        motion: { speed: 1, colorCycleSpeed: 0.03 },
        // `bars` is deliberately not set: the library ships distinct desktop
        // (5 bars) and mobile (4 bars) layouts per profile slot, and overriding
        // here would discard that responsive tuning.
        shading: { barAlphaScale: mobile ? 0.5 : 0.55 }
      }
    };
  }

  function assertNoLocalAppearance(effects) {
    Object.keys(effects).forEach(function (name) {
      if (Object.prototype.hasOwnProperty.call(effects[name], "appearance")) {
        throw new RangeError(
          "PortfolioEffectSkins.effects." + name
          + ".appearance is forbidden; edit the shared theme colors instead."
        );
      }
    });
  }

  // Appearance is split in two. The COLOUR CORE (palette / colorCount /
  // backgroundColor) is identical for all seven effects — the single source of
  // truth. On top of it an effect may carry non-colour appearance MODIFIERS,
  // but only the ones its own configDefaults declares: the library's
  // assertKnownKeys throws RangeError on any foreign key, and main.js mounts
  // every effect in one unguarded pass, so a single stray key would drop the
  // WHOLE site to the static fallback. This table is the site-side guard.
  //
  // The right home for this is the library itself (either let a caller pass a
  // shared appearance and ignore inapplicable keys, or expose the per-effect
  // modifier set for introspection) so this hand-maintained table can be
  // deleted rather than re-checked against every bundle bump. Tracked upstream.
  var APPEARANCE_MODIFIERS = deepFreeze({
    metaballs: [],
    plasma: [],
    copperBars: [],
    mandelbrot: ["interiorColor", "colorScale", "colorCurve", "colorOffset", "cycleSpeed"],
    starfield: ["trailFade", "minAlpha", "maxAlpha", "minLineWidth", "maxLineWidth"],
    tunnel: ["fogColor"],
    feedback: ["strokeAlpha"]
  });

  function appearance(colors, name, modifiers) {
    var allowed = APPEARANCE_MODIFIERS[name];
    if (!allowed) throw new RangeError("Unknown portfolio effect: " + name);
    var shared = {
      palette: colors.palette,
      colorCount: colors.colorCount,
      backgroundColor: colors.backgroundColor
    };
    Object.keys(modifiers || {}).forEach(function (key) {
      if (allowed.indexOf(key) === -1) {
        throw new RangeError(
          "PortfolioEffectSkins." + name + ".appearance." + key
          + " is not an allowed modifier for this effect."
        );
      }
      shared[key] = modifiers[key];
    });
    return deepFreeze(shared);
  }

  function create(theme, mobile, overrides) {
    var selectedTheme = themes[theme === "dark" ? "dark" : "light"];
    var effects = effectSettings(Boolean(mobile));
    var custom = overrides || {};
    assertNoLocalAppearance(effects);
    assertNoLocalAppearance(custom);

    Object.keys(custom).forEach(function (name) {
      if (!Object.prototype.hasOwnProperty.call(effects, name)) {
        throw new RangeError("Unknown portfolio effect: " + name);
      }
      effects[name] = merge(effects[name], custom[name]);
    });
    assertNoLocalAppearance(effects);

    var themeColors = selectedTheme.colors;
    // Colour-typed modifiers reference the shared palette by index rather than
    // repeating a literal, so the palette stays the only place a hex is written.
    var backdrop = themeColors.palette[0];
    effects.metaballs.appearance = appearance(themeColors, "metaballs", null);
    effects.plasma.appearance = appearance(themeColors, "plasma", null);
    effects.copperBars.appearance = appearance(themeColors, "copperBars", null);
    effects.mandelbrot.appearance = appearance(themeColors, "mandelbrot", { interiorColor: ink });
    effects.starfield.appearance = appearance(themeColors, "starfield", {
      // Shorter streaks on the smaller canvas: at the desktop fade a mobile
      // trail smears across the panel instead of reading as a star.
      trailFade: mobile ? 0.5 : 0.42,
      // Well under the library's 0.95 ceiling so the field stays a texture
      // behind the copy rather than competing with it.
      minAlpha: 0.18,
      maxAlpha: mobile ? 0.62 : 0.72,
      minLineWidth: 1,
      maxLineWidth: mobile ? 1.6 : 2.2
    });
    // The corridor recedes into the page background rather than a foreign navy.
    effects.tunnel.appearance = appearance(themeColors, "tunnel", { fogColor: backdrop });
    effects.feedback.appearance = appearance(themeColors, "feedback", {
      strokeAlpha: mobile ? 0.45 : 0.55
    });
    return deepFreeze(effects);
  }

  window.PortfolioEffectSkins = Object.freeze({ create: create });
}());
