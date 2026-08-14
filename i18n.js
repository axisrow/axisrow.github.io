(function () {
  "use strict";

  // Two flat dictionaries keyed by "section.item" — meaningful, grouped keys
  // rather than key1/key2 so the mapping to markup stays legible. index.html
  // ships English text inline (also what tests/site-smoke.test.mjs pins), so
  // the "en" dictionary below must mirror that literal markup exactly — it is
  // the no-op fallback language, not a translation target. "ru" carries the
  // real Russian copy. Every data-i18n / data-i18n-attr / data-i18n-meta key
  // used in index.html (and mirrored in profile/sync/templates/*.j2) must
  // exist in both languages.
  var DICTIONARIES = {
    en: {
      "meta.title": "axisrow — Python engineer",
      "meta.description": "Python engineer building AI agent tooling, automation, and data systems. 37 merged upstream PRs · 108 stars · 7 starred projects.",
      "meta.ogTitle": "axisrow — Python engineer",
      "meta.ogDescription": "AI agent tooling, automation, and data systems. 37 merged upstream PRs · 108 stars · 7 starred projects.",
      "meta.twitterTitle": "axisrow — Python engineer",
      "meta.twitterDescription": "AI agent tooling, automation, and production Python systems.",

      "topbar.brand": "axisrow — back to top",
      "topbar.menuOpen": "Open section navigation",
      "topbar.menuClose": "Close section navigation",
      "topbar.nav": "Section navigation",
      "topbar.theme": "Colour theme",
      "topbar.themeSystem": "System",
      "topbar.themeLight": "Light",
      "topbar.themeDark": "Dark",
      "topbar.language": "Language",
      "topbar.github": "GitHub",

      "nav.stars": "Stars",
      "nav.projects": "Projects",
      "nav.opensource": "Open Source",
      "nav.experience": "Experience",
      "nav.about": "About",
      "nav.contact": "Contact",

      "hero.availability": "Available for selected engineering work",
      "hero.lead": "Python engineer building AI agent tooling, automation, and data systems that survive production.",
      "hero.viewWork": "View selected work",
      "hero.startConversation": "Start a conversation",
      "hero.statsLabel": "Open-source statistics",
      "hero.starsLabel": "Stars across GitHub",
      "hero.prsLabel": "Merged upstream PRs",
      "hero.starredLabel": "Starred projects",
      "hero.footEffect": "Canvas 2D / Metaballs",
      "hero.footScroll": "Scroll to inspect ↓",

      "stars.eyebrow": "Momentum",
      "stars.title": "Stars over time.",
      "stars.currentLabel": "original repositories",

      "projects.eyebrow": "Selected Work",
      "projects.title": "Systems with measurable output.",
      "projects.notePrefix": "Original repositories with the most stars — see all at ",
      "projects.captionLabel": "Selected systems",
      "projects.captionStrong": "Automation that ships.",
      "projects.captionSmall": "Agents · integrations · data",
      "projects.viewRepository": "View repository ↗",

      "opensource.eyebrow": "Proof of Work",
      "opensource.title": "Useful changes, merged upstream.",
      "opensource.note": "Every contribution below points to accepted production code.",
      "opensource.ariaLabel": "Merged upstream contributions",
      "opensource.prsLabel": "merged upstream PRs",
      "opensource.row1Desc": "Side project of Peter Steinberger, creator of OpenClaw (github.com/steipete/openclaw).",
      "opensource.row1Status": "Merged · PR #2814 ↗",
      "opensource.row2Desc": "Retry transient network errors.",
      "opensource.row2Status": "Merged · PR #2627 ↗",
      "opensource.row3Desc": "Unix-friendly automation and serialization.",
      "opensource.row3Status": "Merged · PR #227 ↗",
      "opensource.row4Desc": "Auth, caching, database, E2E, PWA and security.",
      "opensource.row4Status": "23 merged PRs ↗",
      "opensource.row5Desc": "Multiline submit and safer permission handling.",
      "opensource.row5Status": "Merged · PR #2357 ↗",

      "experience.eyebrow": "Experience",
      "experience.title": "Engineering through shipped work.",
      "experience.item1Title": "Open-Source Contributor",
      "experience.item1Period": "2024 — Present",
      "experience.item1Bullet1Suffix": "merged PRs across upstream projects.",
      "experience.item1Bullet2": "Reliability fixes, production features, automation, and safer interfaces.",
      "experience.item1Bullet3": "Changes are scoped, tested, reviewed, and maintained after merge.",
      "experience.item2Title": "Independent Python Engineer",
      "experience.item2Period": "2021 — Present",
      "experience.item2Bullet1": "Production services built around Python, asyncio, agents, and APIs.",
      "experience.item2Bullet2Prefix": "Author of ",
      "experience.item2Bullet2Suffix": " starred open-source projects.",
      "experience.item2Bullet3Suffix": "stars across original work and maintained forks.",

      "about.eyebrow": "About",
      "about.title": "Calm systems for complicated work.",
      "about.copy1": "I build AI agent tooling, Telegram automation, and data systems with a bias toward explicit behaviour, observable failures, and boring operations.",
      "about.copy2": "When a dependency needs a fix, I prefer contributing the improvement upstream instead of carrying a permanent local patch.",
      "about.stackLabel": "Working stack",

      "contact.availability": "Open to contributions, tooling, and selected contract work",
      "contact.title": "Need a system that should keep working?",
      "contact.copy": "Bring the difficult integration, unreliable workflow, or data process. I’ll help turn it into explicit, tested software.",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas effects powered by ",
      "footer.effectsLink": "Demoscene Classics ↗"
    },
    ru: {
      "meta.title": "axisrow — Python-инженер",
      "meta.description": "Python-инженер, создающий инструменты для AI-агентов, автоматизацию и системы данных. 37 принятых upstream PR · 108 звёзд · 7 проектов в избранном.",
      "meta.ogTitle": "axisrow — Python-инженер",
      "meta.ogDescription": "Инструменты для AI-агентов, автоматизация и системы данных. 37 принятых upstream PR · 108 звёзд · 7 проектов в избранном.",
      "meta.twitterTitle": "axisrow — Python-инженер",
      "meta.twitterDescription": "Инструменты для AI-агентов, автоматизация и production-системы на Python.",

      "topbar.brand": "axisrow — наверх страницы",
      "topbar.menuOpen": "Открыть навигацию по разделам",
      "topbar.menuClose": "Закрыть навигацию по разделам",
      "topbar.nav": "Навигация по разделам",
      "topbar.theme": "Цветовая тема",
      "topbar.themeSystem": "Системная",
      "topbar.themeLight": "Светлая",
      "topbar.themeDark": "Тёмная",
      "topbar.language": "Язык",
      "topbar.github": "GitHub",

      "nav.stars": "Звёзды",
      "nav.projects": "Проекты",
      "nav.opensource": "Open Source",
      "nav.experience": "Опыт",
      "nav.about": "Обо мне",
      "nav.contact": "Контакты",

      "hero.availability": "Открыт для выборочных проектов",
      "hero.lead": "Python-инженер, создающий инструменты для AI-агентов, автоматизацию и системы данных, которые выдерживают продакшен.",
      "hero.viewWork": "Смотреть работы",
      "hero.startConversation": "Начать разговор",
      "hero.statsLabel": "Статистика open source",
      "hero.starsLabel": "Звёзд на GitHub",
      "hero.prsLabel": "Принятых upstream PR",
      "hero.starredLabel": "Проектов в избранном",
      "hero.footEffect": "Canvas 2D / Метаболы",
      "hero.footScroll": "Прокрутите, чтобы изучить ↓",

      "stars.eyebrow": "Динамика",
      "stars.title": "Звёзды во времени.",
      "stars.currentLabel": "оригинальные репозитории",

      "projects.eyebrow": "Избранные работы",
      "projects.title": "Системы с измеримым результатом.",
      "projects.notePrefix": "Оригинальные репозитории с наибольшим числом звёзд — все проекты на ",
      "projects.captionLabel": "Отобранные системы",
      "projects.captionStrong": "Автоматизация, которая работает.",
      "projects.captionSmall": "Агенты · интеграции · данные",
      "projects.viewRepository": "Открыть репозиторий ↗",

      "opensource.eyebrow": "Подтверждённая работа",
      "opensource.title": "Полезные изменения, принятые upstream.",
      "opensource.note": "Каждый вклад ниже ведёт к принятому production-коду.",
      "opensource.ariaLabel": "Принятые upstream-вклады",
      "opensource.prsLabel": "принятых upstream PR",
      "opensource.row1Desc": "Побочный проект Питера Стейнбергера, создателя OpenClaw (github.com/steipete/openclaw).",
      "opensource.row1Status": "Принят · PR #2814 ↗",
      "opensource.row2Desc": "Повтор при временных сетевых ошибках.",
      "opensource.row2Status": "Принят · PR #2627 ↗",
      "opensource.row3Desc": "Unix-подобная автоматизация и сериализация.",
      "opensource.row3Status": "Принят · PR #227 ↗",
      "opensource.row4Desc": "Авторизация, кеширование, база данных, E2E, PWA и безопасность.",
      "opensource.row4Status": "23 принятых PR ↗",
      "opensource.row5Desc": "Многострочный ввод и более безопасная обработка прав.",
      "opensource.row5Status": "Принят · PR #2357 ↗",

      "experience.eyebrow": "Опыт",
      "experience.title": "Инженерия через реализованную работу.",
      "experience.item1Title": "Контрибьютор open source",
      "experience.item1Period": "2024 — настоящее время",
      "experience.item1Bullet1Suffix": "принятых PR в сторонних проектах.",
      "experience.item1Bullet2": "Исправления надёжности, production-функции, автоматизация и более безопасные интерфейсы.",
      "experience.item1Bullet3": "Изменения ограничены по объёму, протестированы, прошли ревью и поддерживаются после merge.",
      "experience.item2Title": "Независимый Python-инженер",
      "experience.item2Period": "2021 — настоящее время",
      "experience.item2Bullet1": "Production-сервисы на Python, asyncio, агентах и API.",
      "experience.item2Bullet2Prefix": "Автор ",
      "experience.item2Bullet2Suffix": " open source проектов в избранном у других.",
      "experience.item2Bullet3Suffix": "звёзд в оригинальных и поддерживаемых форк-проектах.",

      "about.eyebrow": "Обо мне",
      "about.title": "Спокойные системы для сложных задач.",
      "about.copy1": "Я создаю инструменты для AI-агентов, автоматизацию Telegram и системы данных с упором на явное поведение, наблюдаемые сбои и предсказуемую эксплуатацию.",
      "about.copy2": "Когда зависимость требует исправления, я предпочитаю вносить улучшение в upstream, а не поддерживать локальный патч навсегда.",
      "about.stackLabel": "Рабочий стек",

      "contact.availability": "Открыт для контрибьюций, инструментов и выборочных контрактов",
      "contact.title": "Нужна система, которая должна продолжать работать?",
      "contact.copy": "Приносите сложную интеграцию, ненадёжный процесс или задачу с данными. Я помогу превратить это в понятный, протестированный код.",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas-эффекты работают на ",
      "footer.effectsLink": "Demoscene Classics ↗"
    }
  };

  var SUPPORTED = ["en", "ru"];
  var DEFAULT_LANG = "ru";
  var STORAGE_KEY = "lang-choice";

  function detectLanguage() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (error) {}
    try {
      var browserLangs = navigator.languages && navigator.languages.length
        ? navigator.languages
        : [navigator.language];
      for (var i = 0; i < browserLangs.length; i++) {
        var lang = String(browserLangs[i] || "").slice(0, 2).toLowerCase();
        if (SUPPORTED.indexOf(lang) !== -1) return lang;
      }
    } catch (error) {}
    return DEFAULT_LANG;
  }

  function translate(lang, key) {
    var dictionary = DICTIONARIES[lang] || DICTIONARIES[DEFAULT_LANG];
    if (Object.prototype.hasOwnProperty.call(dictionary, key)) return dictionary[key];
    var fallback = DICTIONARIES[DEFAULT_LANG];
    return Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : key;
  }

  function applyTranslations(root, lang) {
    var scope = root || document;

    var textNodes = scope.querySelectorAll("[data-i18n]");
    for (var i = 0; i < textNodes.length; i++) {
      var node = textNodes[i];
      var key = node.getAttribute("data-i18n");
      if (key) node.textContent = translate(lang, key);
    }

    var attrNodes = scope.querySelectorAll("[data-i18n-attr]");
    for (var j = 0; j < attrNodes.length; j++) {
      var attrNode = attrNodes[j];
      var spec = attrNode.getAttribute("data-i18n-attr");
      if (!spec) continue;
      var pairs = spec.split(",");
      for (var k = 0; k < pairs.length; k++) {
        var pair = pairs[k].split(":");
        var attrName = pair[0] && pair[0].trim();
        var attrKey = pair[1] && pair[1].trim();
        if (attrName && attrKey) attrNode.setAttribute(attrName, translate(lang, attrKey));
      }
    }

    var metaNodes = scope.querySelectorAll("[data-i18n-meta]");
    for (var m = 0; m < metaNodes.length; m++) {
      var metaNode = metaNodes[m];
      var metaKey = metaNode.getAttribute("data-i18n-meta");
      if (!metaKey) continue;
      var value = translate(lang, metaKey);
      if (metaNode.tagName === "TITLE") metaNode.textContent = value;
      else metaNode.setAttribute("content", value);
    }
  }

  function setLanguage(lang, persist) {
    var next = SUPPORTED.indexOf(lang) !== -1 ? lang : DEFAULT_LANG;
    document.documentElement.lang = next;
    document.documentElement.dataset.lang = next;
    applyTranslations(document, next);
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch (error) {}
    }
    return next;
  }

  window.PortfolioI18n = {
    SUPPORTED: SUPPORTED.slice(),
    DEFAULT_LANG: DEFAULT_LANG,
    detectLanguage: detectLanguage,
    translate: translate,
    applyTranslations: applyTranslations,
    setLanguage: setLanguage
  };

  // Apply immediately, synchronously, as this script parses — before the
  // browser paints the rest of the (English-authored) body. The <head>
  // bootstrap script already resolved dataset.lang and, for any non-English
  // result, added .lang-loading to hide <body> until this runs. Reuse that
  // resolution instead of re-detecting, then always remove the guard class
  // (even if translation throws) so a bad dictionary never leaves the page
  // blank.
  var root = document.documentElement;
  var resolvedLang = root.dataset.lang;
  if (SUPPORTED.indexOf(resolvedLang) === -1) resolvedLang = detectLanguage();
  try {
    setLanguage(resolvedLang, false);
  } finally {
    root.classList.remove("lang-loading");
  }

  var langSelect = document.getElementById("lang-select");
  var langIcon = document.querySelector("[data-lang-icon]");
  var menuToggle = document.getElementById("menu-toggle");

  function syncLangUi(lang) {
    if (langSelect) langSelect.value = lang;
    if (langIcon) langIcon.textContent = lang.toUpperCase();
    if (menuToggle) {
      var open = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-label", translate(lang, open ? "topbar.menuClose" : "topbar.menuOpen"));
    }
  }

  syncLangUi(resolvedLang);

  if (langSelect) {
    langSelect.addEventListener("change", function () {
      var next = setLanguage(langSelect.value, true);
      syncLangUi(next);
    });
  }
}());
