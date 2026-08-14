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

      "hero.availability": "Selectively available for engineering work",
      "hero.lead": "Python engineer building AI agent tooling, automation, and data systems — built to survive production.",
      "hero.viewWork": "View selected work",
      "hero.startConversation": "Get in touch",
      "hero.statsLabel": "Open-source statistics",
      "hero.starsLabel": "Stars across GitHub",
      "hero.prsLabel": "Merged upstream PRs",
      "hero.starredLabel": "Starred projects",
      "hero.footEffect": "Canvas 2D / Metaballs",
      "hero.footScroll": "Scroll to explore ↓",

      "stars.eyebrow": "Momentum",
      "stars.title": "Stars over time",
      "stars.notePrefix": "Daily cumulative stars on own GitHub repositories. Opening balance on ",
      "stars.noteMiddle": "; this chart excludes the ",
      "stars.noteSuffix": " stars earned on maintained forks.",
      "stars.currentLabel": "own repositories",

      "month.Jan": "Jan",
      "month.Feb": "Feb",
      "month.Mar": "Mar",
      "month.Apr": "Apr",
      "month.May": "May",
      "month.Jun": "Jun",
      "month.Jul": "Jul",
      "month.Aug": "Aug",
      "month.Sep": "Sep",
      "month.Oct": "Oct",
      "month.Nov": "Nov",
      "month.Dec": "Dec",

      "projects.eyebrow": "Selected Work",
      "projects.title": "Systems with measurable output",
      "projects.notePrefix": "Own repositories with the most stars — see all at ",
      "projects.captionLabel": "Selected systems",
      "projects.captionStrong": "Automation that ships",
      "projects.captionSmall": "Agents · integrations · data",
      "projects.viewRepository": "View repository ↗",

      "projects.group.telegram-yandex": "Telegram & Yandex",
      "projects.group.ai-agent-tooling": "AI / Agent Tooling",
      "projects.group.data-ml": "Data / ML",
      "projects.desc.tg_content_factory": "Content-factory pipeline for Telegram — flagship project.",
      "projects.desc.yandex-direct-mcp-plugin": "Claude Code plugin for Yandex.Direct — MCP server + skills + OAuth.",
      "projects.desc.direct-cli": "CLI for Yandex.Direct.",
      "projects.desc.clihost": "Self-hosting / proxy CLI, security-hardened.",
      "projects.desc.claude-code-cycle-review-skill": "Automated PR review cycle for Claude Code.",
      "projects.desc.claude_code_gmail_plugin": "Gmail plugin for Claude Code.",
      "projects.desc.llm_benchmark": "LLM benchmark harness.",

      "opensource.eyebrow": "Contributions",
      "opensource.title": "Useful changes, merged upstream",
      "opensource.note": "Every entry below links to accepted production code.",
      "opensource.ariaLabel": "Merged upstream contributions",
      "opensource.prsLabel": "merged upstream PRs",
      "opensource.row1Desc": "Feature and documentation contributions to Peter Steinberger's desktop utility.",
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
      "experience.title": "Built, shipped, maintained",
      "experience.item1Title": "Open-Source Contributor",
      "experience.item1Period": "2024 — Present",
      "experience.item1Bullet1Suffix": "merged PRs across upstream projects.",
      "experience.item1Bullet2": "Reliability fixes, production features, automation, and safer interfaces.",
      "experience.item1Bullet3": "Changes are scoped, tested, reviewed, and maintained after merge.",
      "experience.item2Title": "Independent Python Engineer",
      "experience.item2Org": "Telegram automation · AI agent tooling · data & finance",
      "experience.item2Period": "2021 — Present",
      "experience.item2Bullet1": "Production services built around Python, asyncio, agents, and APIs.",
      "experience.item2Bullet2Prefix": "Author of ",
      "experience.item2Bullet2Suffix": " starred open-source projects.",
      "experience.item2Bullet3Suffix": "stars across own projects and maintained forks.",

      "about.eyebrow": "About",
      "about.title": "Calm systems for complicated work",
      "about.copy1": "I build AI agent tooling, Telegram automation, and data systems with a bias toward explicit behaviour, observable failures, and uneventful operations.",
      "about.copy2": "When a dependency needs a fix, I prefer contributing the improvement upstream instead of carrying a permanent local patch.",
      "about.stackLabel": "Working stack",

      "contact.availability": "Open to contributions, tooling, and select contract work",
      "contact.title": "Need a system that actually keeps working?",
      "contact.copy": "Got a difficult integration, unreliable workflow, or data process? I’ll help turn it into explicit, tested software.",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas effects powered by ",
      "footer.effectsLink": "Demoscene Classics ↗"
    },
    ru: {
      "meta.title": "axisrow — Python-инженер",
      "meta.description": "Python-инженер: инструменты для AI-агентов, автоматизация и системы данных. 37 PR, принятых в upstream · 108 звёзд · 7 проектов со звёздами.",
      "meta.ogTitle": "axisrow — Python-инженер",
      "meta.ogDescription": "Инструменты для AI-агентов, автоматизация и системы данных. 37 PR, принятых в upstream · 108 звёзд · 7 проектов со звёздами.",
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

      "hero.availability": "Избирательно принимаю проекты",
      "hero.lead": "Python-инженер: инструменты для AI-агентов, автоматизация и системы данных — всё, что работает в продакшене.",
      "hero.viewWork": "Смотреть работы",
      "hero.startConversation": "Написать мне",
      "hero.statsLabel": "Статистика open source",
      "hero.starsLabel": "Звёзд на GitHub",
      "hero.prsLabel": "Принятых upstream PR",
      "hero.starredLabel": "Проектов со звёздами",
      "hero.footEffect": "Canvas 2D / Метаболы",
      "hero.footScroll": "Листайте вниз ↓",

      "stars.eyebrow": "Динамика",
      "stars.title": "Рост звёзд",
      "stars.notePrefix": "Ежедневная сумма звёзд на собственных GitHub-репозиториях. Начальный баланс на ",
      "stars.noteMiddle": "; график не учитывает ",
      "stars.noteSuffix": " звёзд, полученных на поддерживаемых форках.",
      "stars.currentLabel": "собственные репозитории",

      "month.Jan": "Янв",
      "month.Feb": "Фев",
      "month.Mar": "Мар",
      "month.Apr": "Апр",
      "month.May": "Май",
      "month.Jun": "Июн",
      "month.Jul": "Июл",
      "month.Aug": "Авг",
      "month.Sep": "Сен",
      "month.Oct": "Окт",
      "month.Nov": "Ноя",
      "month.Dec": "Дек",

      "projects.eyebrow": "Проекты",
      "projects.title": "Системы, которые дают результат",
      "projects.notePrefix": "Собственные репозитории с наибольшим числом звёзд — все проекты на ",
      "projects.captionLabel": "Лучшие системы",
      "projects.captionStrong": "Автоматизация, которая работает",
      "projects.captionSmall": "Агенты · интеграции · данные",
      "projects.viewRepository": "Открыть репозиторий ↗",

      "projects.group.telegram-yandex": "Telegram и Яндекс",
      "projects.group.ai-agent-tooling": "AI / Инструменты для агентов",
      "projects.group.data-ml": "Данные / ML",
      "projects.desc.tg_content_factory": "Контент-фабрика для Telegram — главный проект.",
      "projects.desc.yandex-direct-mcp-plugin": "Плагин Claude Code для Яндекс.Директа — MCP-сервер + навыки + OAuth.",
      "projects.desc.direct-cli": "CLI для Яндекс.Директа.",
      "projects.desc.clihost": "CLI для self-hosting / прокси, с усиленной безопасностью.",
      "projects.desc.claude-code-cycle-review-skill": "Автоматический цикл PR-ревью для Claude Code.",
      "projects.desc.claude_code_gmail_plugin": "Gmail-плагин для Claude Code.",
      "projects.desc.llm_benchmark": "Стенд для бенчмарков LLM.",

      "opensource.eyebrow": "Принятые PR",
      "opensource.title": "Полезные изменения, принятые в upstream",
      "opensource.note": "Каждая строка ниже — это принятый production-код.",
      "opensource.ariaLabel": "PR, принятые в upstream",
      "opensource.prsLabel": "PR, принятых в upstream",
      "opensource.row1Desc": "Функциональность и документация для десктопной утилиты Питера Стейнбергера.",
      "opensource.row1Status": "Принят · PR #2814 ↗",
      "opensource.row2Desc": "Повторные запросы при временных сетевых ошибках.",
      "opensource.row2Status": "Принят · PR #2627 ↗",
      "opensource.row3Desc": "Автоматизация и сериализация в Unix-стиле.",
      "opensource.row3Status": "Принят · PR #227 ↗",
      "opensource.row4Desc": "Авторизация, кеширование, база данных, E2E-тесты, PWA и безопасность.",
      "opensource.row4Status": "23 принятых PR ↗",
      "opensource.row5Desc": "Многострочный ввод и безопасная обработка разрешений.",
      "opensource.row5Status": "Принят · PR #2357 ↗",

      "experience.eyebrow": "Опыт",
      "experience.title": "Создано, выпущено, поддерживается",
      "experience.item1Title": "Контрибьютор open source",
      "experience.item1Period": "2024 — настоящее время",
      "experience.item1Bullet1Suffix": "PR, принятых в upstream-проекты.",
      "experience.item1Bullet2": "Исправления надёжности, production-фичи, автоматизация и безопасные интерфейсы.",
      "experience.item1Bullet3": "Каждое изменение — точечное, с тестами, прошло ревью и поддерживается после merge.",
      "experience.item2Title": "Независимый Python-инженер",
      "experience.item2Org": "Автоматизация Telegram · инструменты для AI-агентов · данные и финансы",
      "experience.item2Period": "2021 — настоящее время",
      "experience.item2Bullet1": "Production-сервисы на Python, asyncio, агентах и API.",
      "experience.item2Bullet2Prefix": "Автор ",
      "experience.item2Bullet2Suffix": " open-source-проектов, отмеченных звёздами.",
      "experience.item2Bullet3Suffix": "звёзд на собственных проектах и поддерживаемых форках.",

      "about.eyebrow": "Обо мне",
      "about.title": "Спокойные системы для сложных задач",
      "about.copy1": "Я создаю инструменты для AI-агентов, автоматизацию Telegram и системы данных с упором на явное поведение, наблюдаемые сбои и предсказуемую эксплуатацию.",
      "about.copy2": "Когда зависимость требует исправления, я предпочитаю вносить улучшение в upstream, а не поддерживать локальный патч навсегда.",
      "about.stackLabel": "Рабочий стек",

      "contact.availability": "Открыт к сотрудничеству, вкладу в open source и отдельным проектам",
      "contact.title": "Нужна система, которая действительно работает?",
      "contact.copy": "Есть сложная интеграция, нестабильный процесс или задача с данными? Помогу превратить это в понятный, протестированный код.",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas-эффекты работают на ",
      "footer.effectsLink": "Demoscene Classics ↗"
    }
  };

  // Supported-languages list + default read from the <meta name="i18n-languages">
  // tag in index.html's <head> — the single source of truth also read by the
  // inline pre-paint bootstrap script there, so the two never hardcode the
  // language list independently and silently diverge if a language is added.
  // Falls back to the current en/ru pair when the meta tag is absent (e.g.
  // this file's `vm` sandbox in tests/site-smoke.test.mjs has no real DOM).
  var langMeta = typeof document !== "undefined" && document.querySelector
    ? document.querySelector('meta[name="i18n-languages"]')
    : null;
  var SUPPORTED = (langMeta && langMeta.content ? langMeta.content : "en,ru").split(",");
  var DEFAULT_LANG = (langMeta && langMeta.getAttribute("data-default")) || "ru";
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
