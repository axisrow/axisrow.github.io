(function () {
  "use strict";

  /* ---------- theme ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (toggle) toggle.textContent = theme === "dark" ? "☾" : "☀";
    try { localStorage.setItem("theme", theme); } catch (e) {}
  }
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  applyTheme(stored || (systemPrefersDark() ? "dark" : "light"));

  if (toggle) {
    toggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(current);
    });
  }

  /* ---------- animations (GSAP) ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion && window.gsap) {
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    // hero intro — animate TO the visible state (never leaves elements stuck hidden
    // if requestAnimationFrame is throttled, e.g. in a background tab)
    gsap.set([".hero-name", ".hero-sub", ".scroll-hint"], { opacity: 0, y: 20 });
    gsap.to(".hero-name", { y: 0, opacity: 1, duration: 1, ease: "power3.out", clearProps: "opacity,transform" });
    gsap.to(".hero-sub", { y: 0, opacity: 1, duration: 0.9, delay: 0.25, ease: "power3.out", clearProps: "opacity,transform" });
    gsap.to(".scroll-hint", { y: 0, opacity: 1, duration: 1, delay: 0.7, clearProps: "opacity,transform" });

    // reveal-on-scroll
    if (window.ScrollTrigger) {
      gsap.utils.toArray(".reveal").forEach(function (el) {
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" }
        });
      });

      // section titles
      gsap.utils.toArray(".section-title").forEach(function (el) {
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" }
        });
      });

      // parallax decorative letters
      gsap.utils.toArray(".deco-l").forEach(function (el, i) {
        gsap.to(el, {
          yPercent: (i % 2 === 0 ? -12 : 12),
          ease: "none",
          scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: 1 }
        });
      });
    }
  } else {
    // no-motion fallback: make sure everything is visible
    Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
  }
})();
