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
      fire: {
        motion: { speed: mobile ? 0.85 : 1 },
        simulation: {
          sourceWidthFrac: mobile ? 0.9 : 0.82,
          sourceIntensity: mobile ? 0.85 : 1,
          cooling: 0.27
        }
      },
      tunnel: {
        motion: { speed: 1, forwardSpeed: mobile ? 0.7 : 0.9, rotationSpeed: 0.22, colorCycleSpeed: 0.1 },
        geometry: {
          wallFrequency: 2.4,
          angularFrequency: 3
        }
      },
      rotozoom: {
        motion: {
          speed: 1,
          rotationSpeed: 0.1,
          zoomAmplitude: mobile ? 0.35 : 0.5,
          zoomSpeed: 0.24
        },
        texture: {
          tiles: mobile ? 4 : 5,
          frequencyU: 3,
          frequencyV: 2
        }
      },
      sineScroller: {
        motion: { speed: 1, scrollSpeed: mobile ? 0.14 : 0.18, phaseSpeed: 2.6, colorCycleSpeed: 0.28 },
        text: { content: "AXISROW // PYTHON ENGINEER // OPEN SOURCE" },
        wave: { baseline: 0.58, amplitude: mobile ? 0.05 : 0.06, cycles: 2.5 },
        stars: { count: mobile ? 140 : 220 }
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

  function appearance(colors, extra) {
    var shared = {
      palette: colors.palette,
      colorCount: colors.colorCount,
      backgroundColor: colors.backgroundColor
    };
    if (extra) Object.keys(extra).forEach(function (key) { shared[key] = extra[key]; });
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
    var commonAppearance = appearance(themeColors, null);
    effects.metaballs.appearance = commonAppearance;
    effects.plasma.appearance = commonAppearance;
    effects.mandelbrot.appearance = appearance(themeColors, { interiorColor: ink });
    effects.fire.appearance = commonAppearance;
    // Tunnel's vanishing point recedes into shadow: reuse the shared ink black
    // instead of introducing a second dark colour, keeping one fog source.
    effects.tunnel.appearance = appearance(themeColors, { fogColor: ink });
    // Rotozoom's texture lattice needs a touch more shadow contrast to stay
    // readable while rotating; still derived, no new palette hex.
    effects.rotozoom.appearance = appearance(themeColors, { contrast: 0.82 });
    // Sine scroller reuses the palette's warmest accent for the drop shadow and
    // its coolest accent for the starfield behind the banner text.
    effects.sineScroller.appearance = appearance(themeColors, {
      shadowColor: ink,
      shadowAlpha: 0.6,
      starColor: themeColors.palette[2],
      fontFamily: "IBM Plex Mono, monospace",
      fontWeight: 700
    });
    return deepFreeze(effects);
  }

  window.PortfolioEffectSkins = Object.freeze({ create: create });
}());
