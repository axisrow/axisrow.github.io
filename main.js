(function () {
  "use strict";

  var root = document.documentElement;
  var themeSelect = document.getElementById("theme-select");
  var systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var menuToggle = document.getElementById("menu-toggle");
  var sectionNavigation = document.getElementById("section-navigation");
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileQuery = window.matchMedia("(max-width: 720px)");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".section-nav a[data-nav]"));
  var sectionStates = new Map();
  var scenes = [];
  var activatedEffectSelectors = new Set();
  var libraryReady = false;
  var remountTimer = null;

  function readStoredThemeChoice() {
    // The <head> bootstrap script already resolved this (and migrated the
    // legacy "theme" key) before main.js loaded; reuse it instead of
    // re-reading localStorage. Fall back to a fresh read only if that
    // bootstrap didn't run (e.g. it errored, or this is a test sandbox).
    var stashed = root.dataset.themeChoice;
    if (stashed === "light" || stashed === "dark" || stashed === "system") return stashed;
    try {
      var saved = localStorage.getItem("theme-choice");
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
    } catch (error) {}
    return "system";
  }

  function resolveTheme(choice) {
    if (choice === "dark") return "dark";
    if (choice === "light") return "light";
    return systemThemeQuery.matches ? "dark" : "light";
  }

  function applyTheme(choice, persist) {
    var next = choice === "dark" || choice === "light" ? choice : "system";
    var update = function () {
      root.dataset.themeChoice = next;
      root.dataset.theme = resolveTheme(next);
      if (themeSelect) themeSelect.value = next;
    };
    if (typeof document !== "undefined" && document.startViewTransition && !reduceMotionQuery.matches) {
      document.startViewTransition(update);
    } else {
      update();
    }
    if (persist) {
      try { localStorage.setItem("theme-choice", next); } catch (error) {}
    }
  }

  applyTheme(readStoredThemeChoice(), false);

  function menuLabel(key, fallback) {
    // i18n.js (loaded before main.js) owns the dictionaries; fall back to the
    // English literal if it failed to load so the button never ends up
    // without an accessible name.
    var lang = root.dataset.lang;
    return window.PortfolioI18n ? window.PortfolioI18n.translate(lang, key) : fallback;
  }

  function closeMenu() {
    if (!menuToggle || !sectionNavigation) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", menuLabel("topbar.menuOpen", "Open section navigation"));
    sectionNavigation.classList.remove("is-open");
  }

  function toggleMenu() {
    if (!menuToggle || !sectionNavigation) return;
    var open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", menuLabel(open ? "topbar.menuClose" : "topbar.menuOpen", open ? "Close section navigation" : "Open section navigation"));
    sectionNavigation.classList.toggle("is-open", open);
  }

  function destroyEffects() {
    scenes.forEach(function (scene) {
      effectMountObserver.unobserve(scene.element);
      effectPlaybackObserver.unobserve(scene.element);
      if (scene.controller) scene.controller.destroy();
      // A remount (theme toggle, FX speed slider, media-query change) must
      // not eagerly recreate every effect a visitor has ever scrolled past.
      // Only selectors still visible right now stay "activated"; scenes
      // currently off-screen fall back to lazy (IntersectionObserver-gated)
      // mounting on the next mountEffects() call, same as on first load.
      if (!scene.visible) activatedEffectSelectors.delete(scene.definition.selector);
    });
    scenes = [];
  }

  function effectDefinitions() {
    var dark = root.dataset.theme === "dark";
    var mobile = mobileQuery.matches;
    var reduced = reduceMotionQuery.matches;
    var skins = window.PortfolioEffectSkins.create(dark ? "dark" : "light", mobile);
    var speedMul = typeof window.__FX_SPEED_MULTIPLIER__ === "function" ? window.__FX_SPEED_MULTIPLIER__() : 1;
    if (speedMul !== 1) {
      // effect-skins.js deep-freezes every config it returns; mutate a plain
      // clone instead of writing into the frozen `motion` object (which
      // throws in strict mode and aborts the whole effect mount).
      var scaled = {};
      Object.keys(skins).forEach(function (name) {
        var skin = skins[name];
        if (skin && skin.motion && typeof skin.motion.speed === "number") {
          scaled[name] = Object.assign({}, skin, {
            motion: Object.assign({}, skin.motion, { speed: skin.motion.speed * speedMul })
          });
        } else {
          scaled[name] = skin;
        }
      });
      skins = scaled;
    }
    return [
      {
        name: "metaballs",
        selector: "#hero-metaballs",
        surface: "fullscreen",
        staticOnly: reduced,
        options: skins.metaballs
      },
      {
        name: "plasma",
        selector: "#projects-plasma",
        surface: "preview",
        staticOnly: reduced,
        options: skins.plasma
      },
      {
        name: "mandelbrot",
        selector: "#opensource-mandelbrot",
        surface: "preview",
        staticOnly: reduced,
        options: skins.mandelbrot
      },
      // The four section accents below are all banded panels rather than
      // viewports, so they take the "preview" profile slot: the "fullscreen"
      // slot would request a 60fps, full-resolution budget for a strip a few
      // hundred pixels tall.
      {
        name: "starfield",
        selector: "#stars-starfield",
        surface: "preview",
        staticOnly: reduced,
        options: skins.starfield
      },
  {
    name: "feedback",
    selector: "#experience-feedback",
    surface: "preview",
    staticOnly: reduced,
    options: skins.feedback
  },
      {
        name: "rotozoom",
        selector: "#about-rotozoom",
        surface: "preview",
        staticOnly: reduced,
        options: skins.rotozoom
      },
      {
        name: "copperBars",
        selector: "#contact-copper-bars",
        surface: "preview",
        staticOnly: reduced,
        options: skins.copperBars
      }
    ];
  }

  function syncEffectPlayback() {
    var allowed = mobileQuery.matches ? 1 : 2;
    var active = document.hidden ? [] : scenes
      .filter(function (scene) { return scene.controller && !scene.staticOnly && scene.visible; })
      .sort(function (left, right) { return right.ratio - left.ratio; })
      .slice(0, allowed);

    scenes.forEach(function (scene) {
      if (!scene.controller || scene.staticOnly) return;
      if (active.indexOf(scene) !== -1) scene.controller.start();
      else scene.controller.stop();
    });
  }

  // Restore the tuned API v3 visuals for plasma and mandelbrot. After the
  // library refactor the skins (effect-skins.js) only carry algorithmic
  // identity; the execution budgets (`render.*`) and the continuous-coloring
  // controls live here as site-level overrides on top of the skin. The skin
  // does NOT emit a `render` group for plasma (the library owns it via a
  // profile slot), so the group is created before it is written — without that,
  // `config.render.resolution` throws a TypeError that aborts an effect mount
  // and drops the whole site to the static fallback.
  // Exposed on window so the regression test drives this exact code path
  // instead of re-implementing it (which would silently drift out of sync).
  function applyTunedV3Overrides(name, options) {
    var config = JSON.parse(JSON.stringify(options));
    if (name === "plasma") {
      if (!config.render) config.render = {};
      config.field.frequencies = [3, 3, 2, 2.5];
      config.field.aspectCorrection = true;
      config.appearance.contrast = 0.85;
      config.render.resolution = 0.3;
      config.render.smoothing = true;
    } else if (name === "mandelbrot") {
      if (!config.render) config.render = {};
      // Dense continuous colouring: at 0.06 the palette is stretched into a few
      // broad washes and the boundary loses its swirling filigree. 0.35 wraps
      // the palette often enough that ribbons hug the set like the classic
      // demoscene renders, in both themes, without turning the far field into
      // stripes.
      config.appearance.colorScale = 0.35;
      config.appearance.colorCurve = 1;
      config.appearance.colorOffset = 0;
      config.appearance.cycleSpeed = 0.02;
      // Full internal resolution: the preview canvas is upscaled ~2.2x by CSS,
      // so anything lower leaves visible stair-stepping on the set boundary.
      // On the GPU backends a full-res frame costs <1ms; the CPU-only path is
      // downgraded at mount time instead (see cpuOnlyMandelbrot).
      config.render.resolution = 1;
      config.render.smoothing = true;
      if (root.dataset.theme !== "dark" && config.appearance.palette) {
        // Light theme only: the shared palette ramps light-to-dark, which
        // wraps a broad cream band right against the ink interior — a white
        // halo on an already-light page. Re-anchor the ramp on slate at both
        // wrap ends (slate, teal, cream, orange, slate) so the boundary melts
        // into the interior, and shift the cycle phase so the far field stays
        // pale. The dark theme already melts into its ink background.
        var palette = config.appearance.palette;
        config.appearance.palette = [palette[4], palette[2], palette[0], palette[3], palette[4]];
        config.appearance.colorOffset = 0.35;
      }
    } else if (name === "feedback") {
      if (!config.geometry) config.geometry = {};
      if (!config.feedback) config.feedback = {};
      // The ring must keep travelling: a slow orbit lets the recursive loop
      // re-strike the same spot and blow out into a white blob. Wider orbit
      // excursions and thinner strokes spread the trails into ribbons
      // instead. The orbit centre sits in the right half (with the CSS
      // canvas shift) where the mask clears room for the copy.
      config.geometry.sides = 6;
      config.geometry.passes = 3;
      config.geometry.radius = 0.14;
      config.geometry.orbitX = 0.22;
      config.geometry.orbitY = 0.22;
      config.feedback.scalePerSecond = 0.8;
      config.feedback.rotationPerSecond = 0.6;
      if (root.dataset.theme === "dark") {
        // Approved dark look: glowing comet ribbons on ink.
        config.geometry.strokeWidth = 0.0035;
        config.geometry.shadowBlur = 0.03;
        config.feedback.decayPerSecond = 0.35;
      } else {
        // Light theme composites the canvas with the CSS `multiply` blend.
        // The renderer's strokes are additive glow — their hot cores blow
        // out brighter than the cream buffer background, and bright content
        // is invisible under multiply — so the light theme deliberately
        // reads only the warm halo: a soft, slowly breathing tint along the
        // right edge. Fast decay and a soft stroke keep that halo smooth
        // (no pooled cloud, no blown-out holes); the palette re-anchor
        // (same colours, mandelbrot precedent) keeps the tint warm instead
        // of grey.
        var lightRamp = config.appearance.palette;
        config.appearance.palette = [lightRamp[0], lightRamp[1], lightRamp[2], lightRamp[4], lightRamp[3]];
        config.geometry.strokeWidth = 0.004;
        config.geometry.shadowBlur = 0.008;
        config.feedback.decayPerSecond = 0.75;
      }
    }
    return config;
  }
  window.applyTunedV3Overrides = applyTunedV3Overrides;

  function mountEffectScene(scene) {
    if (scene.controller) return;

    var definition = scene.definition;
    var element = scene.element;
    var factory = window.Demoscene[definition.name];
    activatedEffectSelectors.add(definition.selector);
    effectMountObserver.unobserve(element);
    // API v3 takes a descriptor `{ skin, surface, device, config }`. The skin
    // carries only algorithmic identity, motion and colours (see
    // effect-skins.js); execution budgets come from the library's matched
    // (surface, device) profile slot. `device: "auto"` lets the library pick
    // mobile vs desktop from the viewport itself.
    var descriptor = {
      skin: "classic",
      surface: definition.surface,
      device: "auto",
      config: definition.options
    };
    descriptor.config = applyTunedV3Overrides(definition.name, definition.options);
    var controller = factory(element, descriptor);
    var cpuOnlyMandelbrot = definition.name === "mandelbrot"
      && definition.options.render.backend !== "canvas2d"
      && typeof controller.getStats === "function"
      && controller.getStats().backend === "canvas2d";
    if (cpuOnlyMandelbrot) {
      // The CPU fallback paints its one static frame on the main thread and
      // its cost scales with render.resolution (~130ms at 0.45 vs ~640ms at
      // full res on a fast machine). Mounting is cheap — nothing is rendered
      // until renderOnce below — so remount at a reduced resolution first.
      controller.destroy();
      controller = null;
      try {
        descriptor.config.render.resolution = 0.45;
        controller = factory(element, descriptor);
      } catch (error) {
        // The first controller has already been released; leave no partial
        // scene behind when the lower-resolution retry also fails.
        throw error;
      }
    }

    scene.controller = controller;
    // A full-resolution CPU fallback is kept as the correctness path, but
    // the portfolio presents one static frame so an old/no-WebGL browser
    // cannot turn that fallback into a scroll-blocking animation.
    scene.staticOnly = Boolean(definition.staticOnly || cpuOnlyMandelbrot);

    if (scene.staticOnly) {
      if (typeof controller.renderOnce === "function") {
        try {
          controller.renderOnce(0);
        } catch (error) {
          controller.destroy();
          scene.controller = null;
          scenes.splice(scenes.indexOf(scene), 1);
          throw error;
        }
      }
      else {
        controller.destroy();
        scene.controller = null;
        scenes.splice(scenes.indexOf(scene), 1);
      }
    } else {
      effectPlaybackObserver.observe(element);
    }
  }

  function useStaticFallback(error) {
    destroyEffects();
    root.classList.remove("demoscene-ready");
    root.classList.add("demoscene-fallback");
    console.warn("Animated accents are using their static fallback.", error.message);
  }

  var effectMountObserver = new IntersectionObserver(function (entries) {
    try {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        scenes.forEach(function (scene) {
          if (scene.element === entry.target && !scene.controller) mountEffectScene(scene);
        });
      });
    } catch (error) {
      useStaticFallback(error);
    }
  }, { threshold: 0 });

  // Keep playback visibility and intersectionRatio accounting separate from
  // the one-shot mount observer so the existing 2-desktop / 1-mobile budget
  // keeps its original thresholds and viewport margins.
  var effectPlaybackObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      scenes.forEach(function (scene) {
        if (scene.element === entry.target) {
          scene.visible = entry.isIntersecting;
          scene.ratio = entry.intersectionRatio;
        }
      });
    });
    syncEffectPlayback();
  }, { threshold: [0, 0.08, 0.2, 0.4, 0.6, 0.8], rootMargin: "-8% 0px -12% 0px" });

  function mountEffects() {
    destroyEffects();
    if (!libraryReady || !window.Demoscene) {
      root.classList.remove("demoscene-ready");
      root.classList.toggle("demoscene-reduced", reduceMotionQuery.matches);
      return;
    }

    effectDefinitions().forEach(function (definition) {
      var element = document.querySelector(definition.selector);
      var factory = window.Demoscene[definition.name];
      if (!element || typeof factory !== "function") return;
      var scene = {
        controller: null,
        definition: definition,
        element: element,
        staticOnly: Boolean(definition.staticOnly),
        visible: false,
        ratio: 0
      };
      scenes.push(scene);

      if (activatedEffectSelectors.has(definition.selector)) {
        mountEffectScene(scene);
      } else {
        // Observe only until the canvas first meets the viewport. Reduced-
        // motion scenes also take this path, renderOnce(0) immediately on that
        // first intersection, then unsubscribe without entering playback.
        effectMountObserver.observe(element);
      }
    });

    root.classList.remove("demoscene-fallback");
    root.classList.toggle("demoscene-reduced", reduceMotionQuery.matches);
    root.classList.add("demoscene-ready");
    syncEffectPlayback();
  }

  function remountEffects() {
    if (!libraryReady) return;
    root.classList.add("effects-changing");
    window.clearTimeout(remountTimer);
    remountTimer = window.setTimeout(function () {
      try {
        mountEffects();
      } catch (error) {
        useStaticFallback(error);
      }
      window.requestAnimationFrame(function () {
        root.classList.remove("effects-changing");
      });
    }, 180);
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", function () {
      applyTheme(themeSelect.value, true);
      remountEffects();
    });
  }

  systemThemeQuery.addEventListener("change", function () {
    if (root.dataset.themeChoice !== "system") return;
    applyTheme("system", false);
    remountEffects();
  });

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      toggleMenu();
    });
  }

  function updateActiveNavigation() {
    var activeId = null;
    var activeRatio = 0;
    sectionStates.forEach(function (ratio, id) {
      if (ratio > activeRatio) {
        activeRatio = ratio;
        activeId = id;
      }
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.dataset.nav === activeId);
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var target = entry.target;

      if (target.classList.contains("reveal") && entry.isIntersecting) {
        target.classList.add("is-visible");
        observer.unobserve(target);
      }

      if (target.id && sectionStates.has(target.id)) {
        sectionStates.set(target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
    });
    updateActiveNavigation();
    syncEffectPlayback();
  }, { threshold: [0, 0.08, 0.2, 0.4, 0.6, 0.8], rootMargin: "-8% 0px -12% 0px" });

  document.querySelectorAll(".reveal").forEach(function (element) {
    if (reduceMotionQuery.matches) element.classList.add("is-visible");
    else observer.observe(element);
  });

  navLinks.forEach(function (link) {
    var section = document.getElementById(link.dataset.nav);
    if (!section) return;
    sectionStates.set(section.id, 0);
    observer.observe(section);
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", function (event) {
    if (!mobileQuery.matches || !sectionNavigation || !menuToggle) return;
    if (!sectionNavigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
  });

  function assetBaseUrl() {
    var meta = document.querySelector('meta[name="demoscene-base"]');
    var configured = meta ? meta.getAttribute("content") : "assets/demoscene";
    return new URL(configured.replace(/\/?$/, "/"), window.location.href);
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("Demoscene bundle failed to load.")); };
      document.head.appendChild(script);
    });
  }

  async function loadDemoscene() {
    var base = assetBaseUrl();
    var localFile = window.location.protocol === "file:";
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 4000);
    try {
      var manifest;
      var bundle;
      if (localFile) {
        // Browsers do not allow fetch() of a file:// manifest. The vendored
        // bundle is API v3 and can be loaded directly for local previews.
        manifest = { apiVersion: 3 };
        bundle = new URL("demoscene.js", base);
      } else {
        var response = await fetch(new URL("manifest.json", base), {
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Demoscene manifest is unavailable.");
        manifest = await response.json();
        if (manifest.apiVersion !== 3 || typeof manifest.version !== "string" || typeof manifest.bundle !== "string") {
          throw new Error("Demoscene manifest is incompatible.");
        }
        bundle = new URL(manifest.bundle, base);
        bundle.searchParams.set("v", manifest.version);
      }
      await loadScript(bundle.href);
      // Deliberately only the three original accents, not all seven. The four
      // section effects are inherently optional: mountEffects() already skips a
      // definition whose factory is missing, so a partial bundle costs those
      // accents and nothing else. Listing them here would instead turn "four
      // accents missing" into "entire site in the static fallback" — strictly
      // worse than the degradation this check exists to prevent.
      var requiredEffects = ["metaballs", "plasma", "mandelbrot"];
      if (!window.Demoscene || requiredEffects.some(function (name) {
        return typeof window.Demoscene[name] !== "function";
      })) {
        throw new Error("Demoscene bundle does not expose the required API v3 effects.");
      }
      libraryReady = true;
      mountEffects();
    } catch (error) {
      useStaticFallback(error);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  document.addEventListener("visibilitychange", syncEffectPlayback);
  mobileQuery.addEventListener("change", function () {
    if (!mobileQuery.matches) closeMenu();
    remountEffects();
  });
  reduceMotionQuery.addEventListener("change", function () {
    document.querySelectorAll(".reveal").forEach(function (element) {
      element.classList.add("is-visible");
    });
    if (libraryReady) {
      remountEffects();
    } else {
      loadDemoscene();
    }
  });
  window.addEventListener("beforeunload", destroyEffects);
  // ==== Interactive UI Features ==== //
  function initInteractiveFeatures() {
    // Scroll progress bar
    var scrollBar = document.getElementById('scroll-progress');
    if (scrollBar) {
      var onScroll = function () {
        var doc = document.documentElement;
        var scrollTop = doc.scrollTop || document.body.scrollTop;
        var scrollHeight = doc.scrollHeight - doc.clientHeight;
        var percent = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        scrollBar.style.width = percent + '%';
      };
      window.addEventListener('scroll', onScroll);
      onScroll();
    }

    // Stars chart tooltip & crosshair
    var starsSvg = document.querySelector('.stars-chart svg');
    var tooltip = document.querySelector('.stars-chart .stars-tooltip');
    var tooltipValue = tooltip && tooltip.querySelector('.stars-tooltip-value');
    var tooltipDate  = tooltip && tooltip.querySelector('.stars-tooltip-date');
    if (starsSvg) {
      var crosshair = starsSvg.querySelector('.stars-crosshair');
      var hoverDot  = starsSvg.querySelector('.stars-hover-dot');
      var hitArea   = starsSvg.querySelector('.stars-hit-area');
      var hoverTarget = hitArea || starsSvg;
      var polyline  = starsSvg.querySelector('.stars-line');
      var points    = [];
      // Derive the Y-axis scale from the chart's own rendered labels instead
      // of a hardcoded ceiling: the generator (profile/sync/generate.py)
      // computes the ceiling dynamically from the data, so a fixed constant
      // here silently desyncs from the plotted line once the total crosses
      // the next ceiling boundary.
      var yLabels = [];
      starsSvg.querySelectorAll('.stars-y-label').forEach(function (el) {
        var value = parseFloat(el.textContent);
        var y = parseFloat(el.getAttribute('y'));
        if (!isNaN(value) && !isNaN(y)) yLabels.push({ value: value, y: y });
      });
      var yZero = null, yCeiling = null;
      yLabels.forEach(function (label) {
        if (yZero === null || label.y > yZero.y) yZero = label;
        if (yCeiling === null || label.value > yCeiling.value) yCeiling = label;
      });
      // Build data from polyline points
      if (polyline && yZero && yCeiling && yCeiling.y !== yZero.y) {
        polyline.getAttribute('points').trim().split(/\s+/).forEach(function (pt, i) {
          var xy = pt.split(',');
          if (xy.length === 2) {
            var y = +xy[1];
            var stars = Math.round(yZero.value + ((y - yZero.y) / (yCeiling.y - yZero.y)) * (yCeiling.value - yZero.value));
            points.push({ x: +xy[0], y: y, stars: Math.max(0, stars), idx: i });
          }
        });
      }
      // Derive the actual calendar date for a hovered point by linearly
      // interpolating between the chart's start/end dates (the generator
      // spaces points evenly by day index across that range — see
      // profile/sync/generate.py's x()) instead of snapping to one of the
      // 6 coarse month-tick labels, which every point in that month would
      // otherwise share.
      var titleMeta = starsSvg.querySelector('#stars-chart-title');
      var descMeta = starsSvg.querySelector('#stars-chart-desc');
      var startDate = null, endDate = null;
      try {
        if (titleMeta) startDate = JSON.parse(titleMeta.getAttribute('data-i18n-vars') || '{}').startDate;
        if (descMeta) endDate = JSON.parse(descMeta.getAttribute('data-i18n-vars') || '{}').endDate;
      } catch (e) {}
      var startX = polyline ? +polyline.getAttribute('points').trim().split(/\s+/)[0].split(',')[0] : null;
      var pointsList = polyline ? polyline.getAttribute('points').trim().split(/\s+/) : [];
      var endX = pointsList.length ? +pointsList[pointsList.length - 1].split(',')[0] : null;
      var startMs = startDate ? Date.parse(startDate + 'T00:00:00Z') : null;
      var endMs = endDate ? Date.parse(endDate + 'T00:00:00Z') : null;
      function getDateForX(x) {
        if (startMs === null || endMs === null || startX === null || endX === null || endX === startX) return '';
        var ratio = Math.min(1, Math.max(0, (x - startX) / (endX - startX)));
        var ms = startMs + ratio * (endMs - startMs);
        return new Date(ms).toISOString().slice(0, 10);
      }
      var viewBox = starsSvg.viewBox.baseVal;
      function nearest(svgX) {
        var best = null, bestDist = Infinity;
        points.forEach(function (p) {
          var d = Math.abs(p.x - svgX);
          if (d < bestDist) { bestDist = d; best = p; }
        });
        return best;
      }
      function clientToSvgX(clientX) {
        var r = starsSvg.getBoundingClientRect();
        return ((clientX - r.left) / r.width) * viewBox.width;
      }
      hoverTarget.addEventListener('pointermove', function (e) {
        var svgX = clientToSvgX(e.clientX);
        var n = nearest(svgX);
        if (!n) return;
        if (crosshair) {
          crosshair.setAttribute('x1', n.x);
          crosshair.setAttribute('x2', n.x);
          crosshair.setAttribute('opacity', '1');
        }
        if (hoverDot) {
          hoverDot.setAttribute('cx', n.x);
          hoverDot.setAttribute('cy', n.y);
          hoverDot.setAttribute('opacity', '1');
        }
        if (tooltipValue) tooltipValue.textContent = n.stars + '★';
        if (tooltipDate)  tooltipDate.textContent  = getDateForX(n.x);
        if (tooltip) tooltip.classList.add('is-active');
      });
      hoverTarget.addEventListener('pointerleave', function () {
        if (crosshair) crosshair.setAttribute('opacity', '0');
        if (hoverDot)  hoverDot.setAttribute('opacity', '0');
        if (tooltip)   tooltip.classList.remove('is-active');
      });
    }

    // Copy buttons & toast
    var toast = document.getElementById('copy-toast');
    function showToast() {
      if (!toast) return;
      toast.classList.add('is-active');
      setTimeout(function () { toast.classList.remove('is-active'); }, 2000);
    }
    // Fallback for browsers/contexts without the async Clipboard API (e.g.
    // non-secure origins): still surface the toast on success so a copy
    // failure isn't silently swallowed with only a console.error.
    function legacyCopy(text) {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      var copied = false;
      var execError = null;
      try { copied = document.execCommand('copy'); } catch (e) { execError = e; copied = false; }
      document.body.removeChild(textarea);
      if (copied) showToast();
      else console.error('Copy to clipboard failed.', execError || new Error('document.execCommand("copy") returned false'));
    }
    document.querySelectorAll('.copy-button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.dataset.copyText;
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(showToast).catch(function (clipboardError) {
            console.error('navigator.clipboard.writeText failed, falling back to execCommand.', clipboardError);
            legacyCopy(text);
          });
        } else {
          legacyCopy(text);
        }
      });
    });

    // Project filter pills
    var pills = document.querySelectorAll('.filter-pill');
    var groups = document.querySelectorAll('.project-group');
    pills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var filter = pill.dataset.filter;
        pills.forEach(function (p) { p.classList.toggle('is-active', p === pill); });
        groups.forEach(function (g) {
          var cat = g.dataset.category;
          var hide = filter !== 'all' && cat !== filter;
          g.classList.toggle('is-hidden', hide);
        });
      });
    });

    // FX Playground
    var fxToggle = document.getElementById('fx-toggle');
    var fxPanel = document.getElementById('fx-playground');
    var fxClose = document.getElementById('fx-close');
    var fxSpeed = document.getElementById('fx-speed');
    var fxSpeedVal = document.getElementById('fx-speed-val');
    var fxReset = document.getElementById('fx-reset');
    function setFxPanelOpen(open) {
      fxPanel.classList.toggle('is-open', open);
      fxPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (fxToggle) fxToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    if (fxToggle && fxPanel) {
      fxToggle.addEventListener('click', function () {
        setFxPanelOpen(!fxPanel.classList.contains('is-open'));
      });
    }
    if (fxClose && fxPanel) fxClose.addEventListener('click', function () {
      setFxPanelOpen(false);
    });
    if (fxSpeed && fxSpeedVal) {
      var updateSpeed = function (remount) {
        var v = parseFloat(fxSpeed.value).toFixed(1);
        fxSpeedVal.textContent = v + 'x';
        window.__FX_SPEED_MULTIPLIER__ = function () { return parseFloat(fxSpeed.value); };
        // Apply the new speed to already-mounted effects, not just the next
        // unrelated remount (theme toggle, media-query change). remountEffects()
        // is already debounced 180ms, so this is safe on every 'input' tick.
        if (remount) remountEffects();
      };
      fxSpeed.addEventListener('input', function () { updateSpeed(true); });
      updateSpeed(false);
    }
    if (fxReset) {
      fxReset.addEventListener('click', function () {
        if (fxSpeed) fxSpeed.value = '1';
        if (fxSpeed && fxSpeedVal) fxSpeedVal.textContent = '1.0x';
        window.__FX_SPEED_MULTIPLIER__ = function () { return 1; };
        remountEffects();
      });
    }
  }

  // Initialise UI features after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInteractiveFeatures);
  } else {
    initInteractiveFeatures();
  }

  // Load Demoscene after UI init
  loadDemoscene();
}());
