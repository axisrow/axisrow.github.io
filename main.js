(function () {
  "use strict";

  var root = document.documentElement;
  var themeToggle = document.getElementById("theme-toggle");
  var reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mobileQuery = window.matchMedia("(max-width: 720px)");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".section-nav a[data-nav]"));
  var sectionStates = new Map();
  var scenes = [];
  var libraryReady = false;
  var remountTimer = null;

  function applyTheme(theme, persist) {
    var nextTheme = theme === "dark" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
      themeToggle.setAttribute("title", nextTheme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    if (persist) {
      try { localStorage.setItem("theme", nextTheme); } catch (error) {}
    }
  }

  applyTheme(root.dataset.theme || "light", false);

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
      var controller = factory(element, descriptor);
      var cpuOnlyMandelbrot = definition.name === "mandelbrot"
        && definition.options.render.backend !== "canvas2d"
        && typeof controller.getStats === "function"
        && controller.getStats().backend === "canvas2d";
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

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
      remountEffects();
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
  });

  function assetBaseUrl() {
    var meta = document.querySelector('meta[name="demoscene-base"]');
    var configured = meta ? meta.getAttribute("content") : "/demoscene_classics/dist";
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
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 4000);
    try {
      var response = await fetch(new URL("manifest.json", base), {
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Demoscene manifest is unavailable.");
      var manifest = await response.json();
      if (manifest.apiVersion !== 3 || typeof manifest.version !== "string" || typeof manifest.bundle !== "string") {
        throw new Error("Demoscene manifest is incompatible.");
      }
      var bundle = new URL(manifest.bundle, base);
      bundle.searchParams.set("v", manifest.version);
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
  mobileQuery.addEventListener("change", remountEffects);
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
