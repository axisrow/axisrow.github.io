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

  var themes = deepFreeze({
    light: {
      colors: colors(["#f7f1e6", "#cad8dc", "#79a7ad", "#d49368", "#526b75"])
    },
    dark: {
      colors: colors(["#090b0f", "#17405f", "#2e7180", "#dc8d67", "#f0c36d"])
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
          pointCount: mobile ? 3 : 5,
          fieldStrength: mobile ? 0.72 : 3.4
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

  function appearance(colors, includeInterior) {
    var shared = {
      palette: colors.palette,
      colorCount: colors.colorCount,
      backgroundColor: colors.backgroundColor
    };
    if (includeInterior) shared.interiorColor = colors.backgroundColor;
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

    var commonAppearance = appearance(selectedTheme.colors, false);
    effects.metaballs.appearance = commonAppearance;
    effects.plasma.appearance = commonAppearance;
    effects.mandelbrot.appearance = appearance(selectedTheme.colors, true);
    return deepFreeze(effects);
  }

  window.PortfolioEffectSkins = Object.freeze({ create: create });
}());
