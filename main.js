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
    root.dataset.themeChoice = next;
    root.dataset.theme = resolveTheme(next);
    if (themeSelect) themeSelect.value = next;
    if (persist) {
      try { localStorage.setItem("theme-choice", next); } catch (error) {}
    }
  }

  applyTheme(readStoredThemeChoice(), false);

  function closeMenu() {
    if (!menuToggle || !sectionNavigation) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open section navigation");
    sectionNavigation.classList.remove("is-open");
  }

  function toggleMenu() {
    if (!menuToggle || !sectionNavigation) return;
    var open = menuToggle.getAttribute("aria-expanded") !== "true";
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close section navigation" : "Open section navigation");
    sectionNavigation.classList.toggle("is-open", open);
  }

  function destroyEffects() {
    scenes.forEach(function (scene) {
      scene.controller.destroy();
      observer.unobserve(scene.element);
    });
    scenes = [];
  }

  function effectDefinitions() {
    var dark = root.dataset.theme === "dark";
    var mobile = mobileQuery.matches;
    var reduced = reduceMotionQuery.matches;
    var skins = window.PortfolioEffectSkins.create(dark ? "dark" : "light", mobile);
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
      }
    ];
  }

  function syncEffectPlayback() {
    var allowed = mobileQuery.matches ? 1 : 2;
    var active = document.hidden ? [] : scenes
      .filter(function (scene) { return !scene.staticOnly && scene.visible; })
      .sort(function (left, right) { return right.ratio - left.ratio; })
      .slice(0, allowed);

    scenes.forEach(function (scene) {
      if (scene.staticOnly) return;
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
  // `config.render.resolution` throws a TypeError that aborts the unguarded
  // mountEffects() loop and drops the whole site to the static fallback.
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
    }
    return config;
  }
  window.applyTunedV3Overrides = applyTunedV3Overrides;

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
        descriptor.config.render.resolution = 0.45;
        controller = factory(element, descriptor);
      }
      var scene = {
        controller: controller,
        element: element,
        // A full-resolution CPU fallback is kept as the correctness path, but
        // the portfolio presents one static frame so an old/no-WebGL browser
        // cannot turn that fallback into a scroll-blocking animation.
        staticOnly: Boolean(definition.staticOnly || cpuOnlyMandelbrot),
        visible: false,
        ratio: 0
      };
      scenes.push(scene);
      if (scene.staticOnly) {
        if (typeof controller.renderOnce === "function") controller.renderOnce(0);
        else {
          controller.destroy();
          scenes.pop();
        }
      } else observer.observe(element);
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
      mountEffects();
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

      if (target.dataset.effect) {
        scenes.forEach(function (scene) {
          if (scene.element === target) {
            scene.visible = entry.isIntersecting;
            scene.ratio = entry.intersectionRatio;
          }
        });
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
      var requiredEffects = ["metaballs", "plasma", "mandelbrot"];
      if (!window.Demoscene || requiredEffects.some(function (name) {
        return typeof window.Demoscene[name] !== "function";
      })) {
        throw new Error("Demoscene bundle does not expose the required API v3 effects.");
      }
      libraryReady = true;
      mountEffects();
    } catch (error) {
      root.classList.remove("demoscene-ready");
      root.classList.add("demoscene-fallback");
      console.warn("Animated accents are using their static fallback.", error.message);
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

  loadDemoscene();
}());
