(function () {
  "use strict";

  // Flat dictionaries keyed by "section.item" — meaningful, grouped keys
  // rather than key1/key2 so the mapping to markup stays legible. index.html
  // ships English text inline (also what tests/site-smoke.test.mjs pins), so
  // the "en" dictionary below must mirror that literal markup exactly — it is
  // the no-op fallback language, not a translation target. "ru", "zh", and
  // "hi" carry real translations. Every data-i18n / data-i18n-attr /
  // data-i18n-meta key used in index.html (and mirrored in
  // profile/sync/templates/*.j2) must exist in every language.
  var DICTIONARIES = {
    en: {
      "meta.title": "axisrow — Python engineer",
      "meta.description": "Python engineer building AI agent tooling, automation, and data systems. {prs} merged upstream PRs · {stars} stars · {starred} starred projects.",
      "meta.ogTitle": "axisrow — Python engineer",
      "meta.ogDescription": "AI agent tooling, automation, and data systems. {prs} merged upstream PRs · {stars} stars · {starred} starred projects.",
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
      "stars.sectionNote": "Cumulative GitHub stars across all repositories since ",
      "stars.currentLabel": "all repositories",
      "stars.chartTitle": "Cumulative GitHub stars since {startDate}",
      "stars.chartDesc": "The chart ends at {count} stars on {endDate}.",

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

      "projects.filterAll": "All",
      "projects.filterLabel": "Filter projects by category",
      "projects.group.telegram-yandex": "Telegram & Yandex",
      "projects.group.ai-agent-tooling": "AI / Agent Tooling",
      "projects.group.data-ml": "Data / ML",
      "projects.desc.tg_content_factory": "Content-factory pipeline for Telegram — flagship project.",
      "projects.desc.yandex-direct-mcp-plugin": "Claude Code plugin for Yandex.Direct — MCP server + skills + OAuth.",
      "projects.desc.direct-cli": "CLI for Yandex.Direct.",
      "projects.desc.clihost": "Self-hosting / proxy CLI, security-hardened.",
      "projects.desc.claude-code-cycle-review-skill": "Automated PR review cycle for Claude Code.",
      "projects.desc.claude_code_gmail_plugin": "Gmail plugin for Claude Code.",
      "projects.desc.zai-codex-helper": "CLI to switch Codex between Z.ai and OpenAI (archived).",
      "projects.desc.ccusage-dashboard": "Hourly cost dashboard for Claude Code and Codex usage.",
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
      "footer.effectsLink": "Demoscene Classics ↗",

      "common.copied": "Copied to clipboard!",

      "fx.title": "FX Playground",
      "fx.close": "Close panel",
      "fx.toggle": "Tune effects",
      "fx.speed": "Speed",
      "fx.fps": "Performance",
      "fx.reset": "Reset",
      "contact.copyEmail": "Copy email address",
    },
    ru: {
      "meta.title": "axisrow — Python-инженер",
      "meta.description": "Python-инженер: инструменты для AI-агентов, автоматизация и системы данных. {prs} PR, принятых в upstream · {stars} звёзд · {starred} проектов со звёздами.",
      "meta.ogTitle": "axisrow — Python-инженер",
      "meta.ogDescription": "Инструменты для AI-агентов, автоматизация и системы данных. {prs} PR, принятых в upstream · {stars} звёзд · {starred} проектов со звёздами.",
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
      "stars.sectionNote": "Совокупное число звёзд на всех репозиториях с ",
      "stars.currentLabel": "все репозитории",
      "stars.chartTitle": "Совокупное число звёзд на GitHub с {startDate}",
      "stars.chartDesc": "На графике показано {count} звёзд по состоянию на {endDate}.",

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
      "projects.filterAll": "Все",
      "projects.filterLabel": "Фильтровать проекты по категории",


      "projects.group.telegram-yandex": "Telegram и Яндекс",
      "projects.group.ai-agent-tooling": "AI / Инструменты для агентов",
      "projects.group.data-ml": "Данные / ML",
      "projects.desc.tg_content_factory": "Контент-фабрика для Telegram — главный проект.",
      "projects.desc.yandex-direct-mcp-plugin": "Плагин Claude Code для Яндекс.Директа — MCP-сервер + навыки + OAuth.",
      "projects.desc.direct-cli": "CLI для Яндекс.Директа.",
      "projects.desc.clihost": "CLI для self-hosting / прокси, с усиленной безопасностью.",
      "projects.desc.claude-code-cycle-review-skill": "Автоматический цикл PR-ревью для Claude Code.",
      "projects.desc.claude_code_gmail_plugin": "Gmail-плагин для Claude Code.",
      "projects.desc.zai-codex-helper": "CLI для переключения Codex между Z.ai и OpenAI (архивирован).",
      "projects.desc.ccusage-dashboard": "Почасовой дашборд расхода Claude Code и Codex.",
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

      "contact.availability": "Открыт к сотрудничеству, open source и проектной работе",
      "contact.title": "Нужна система, которая действительно работает?",
      "contact.copy": "Есть сложная интеграция, нестабильный процесс или задача с данными? Помогу превратить это в понятный, протестированный код.",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas-эффекты работают на ",
      "footer.effectsLink": "Demoscene Classics ↗",
      "common.copied": "Скопировано в буфер обмена!",

      "fx.title": "FX-плейграунд",
      "fx.close": "Закрыть панель",
      "fx.toggle": "Настроить эффекты",
      "fx.speed": "Скорость",
      "fx.fps": "Производительность",
      "fx.reset": "Сброс",
      "contact.copyEmail": "Скопировать email"
    },
    zh: {
      "meta.title": "axisrow — Python 工程师",
      "meta.description": "Python 工程师，专注于 AI Agent 工具、自动化和数据系统。{prs} 个已合并的上游 PR · {stars} 个星标 · {starred} 个获星项目。",
      "meta.ogTitle": "axisrow — Python 工程师",
      "meta.ogDescription": "AI Agent 工具、自动化和数据系统。{prs} 个已合并的上游 PR · {stars} 个星标 · {starred} 个获星项目。",
      "meta.twitterTitle": "axisrow — Python 工程师",
      "meta.twitterDescription": "AI Agent 工具与生产环境 Python 系统。",

      "topbar.brand": "axisrow — 返回顶部",
      "topbar.menuOpen": "打开分区导航",
      "topbar.menuClose": "关闭分区导航",
      "topbar.nav": "分区导航",
      "topbar.theme": "配色主题",
      "topbar.themeSystem": "跟随系统",
      "topbar.themeLight": "浅色",
      "topbar.themeDark": "深色",
      "topbar.language": "语言",
      "topbar.github": "GitHub",

      "nav.stars": "星标",
      "nav.projects": "项目",
      "nav.opensource": "开源",
      "nav.experience": "经历",
      "nav.about": "关于",
      "nav.contact": "联系方式",

      "hero.availability": "有选择地接受工程项目",
      "hero.lead": "Python 工程师，打造经得起生产环境考验的 AI Agent 工具、自动化和数据系统。",
      "hero.viewWork": "查看代表作品",
      "hero.startConversation": "取得联系",
      "hero.statsLabel": "开源统计数据",
      "hero.starsLabel": "GitHub 星标总数",
      "hero.prsLabel": "已合并的上游 PR",
      "hero.starredLabel": "获星项目数",
      "hero.footEffect": "Canvas 2D / 元球效果",
      "hero.footScroll": "向下滚动查看 ↓",

      "stars.eyebrow": "增长趋势",
      "stars.title": "星标增长曲线",
      "stars.sectionNote": "所有仓库的累计 GitHub 星标数，自 ",
      "stars.currentLabel": "全部仓库",
      "stars.chartTitle": "自 {startDate} 起的累计 GitHub 星标数",
      "stars.chartDesc": "该图表截至 {endDate}，共计 {count} 个星标。",

      "month.Jan": "1月",
      "month.Feb": "2月",
      "month.Mar": "3月",
      "month.Apr": "4月",
      "month.May": "5月",
      "month.Jun": "6月",
      "month.Jul": "7月",
      "month.Aug": "8月",
      "month.Sep": "9月",
      "month.Oct": "10月",
      "month.Nov": "11月",
      "month.Dec": "12月",

      "projects.eyebrow": "代表作品",
      "projects.title": "带来可衡量成果的系统",
      "projects.notePrefix": "星标最多的个人仓库 — 查看全部项目：",
      "projects.captionLabel": "精选系统",
      "projects.captionStrong": "能落地的自动化",
      "projects.captionSmall": "Agent · 集成 · 数据",
      "projects.viewRepository": "查看仓库 ↗",

      "projects.group.telegram-yandex": "Telegram 与 Yandex",
      "projects.group.ai-agent-tooling": "AI / Agent 工具",
      "projects.group.data-ml": "数据 / 机器学习",
      "projects.desc.tg_content_factory": "Telegram 内容工厂流水线 — 旗舰项目。",
      "projects.desc.yandex-direct-mcp-plugin": "面向 Yandex.Direct 的 Claude Code 插件 — MCP 服务器 + 技能 + OAuth。",
      "projects.desc.direct-cli": "Yandex.Direct 命令行工具。",
      "projects.desc.clihost": "经过安全加固的自托管 / 代理命令行工具。",
      "projects.desc.claude-code-cycle-review-skill": "Claude Code 的自动化 PR 审查流程。",
      "projects.desc.claude_code_gmail_plugin": "Claude Code 的 Gmail 插件。",
      "projects.desc.zai-codex-helper": "在 Z.ai 与 OpenAI 之间切换 Codex 的命令行工具（已归档）。",
      "projects.desc.ccusage-dashboard": "Claude Code 与 Codex 用量的按小时成本仪表盘。",
      "projects.desc.llm_benchmark": "LLM 基准测试框架。",

      "opensource.eyebrow": "开源贡献",
      "opensource.title": "已合并到上游的实用改进",
      "opensource.note": "以下每一条都链接到已被采纳的生产代码。",
      "opensource.ariaLabel": "已合并的上游贡献",
      "opensource.prsLabel": "个已合并的上游 PR",
      "opensource.row1Desc": "为 Peter Steinberger 的桌面工具贡献功能与文档。",
      "opensource.row1Status": "已合并 · PR #2814 ↗",
      "opensource.row2Desc": "对临时性网络错误进行重试。",
      "opensource.row2Status": "已合并 · PR #2627 ↗",
      "opensource.row3Desc": "符合 Unix 风格的自动化与序列化。",
      "opensource.row3Status": "已合并 · PR #227 ↗",
      "opensource.row4Desc": "认证、缓存、数据库、端到端测试、PWA 与安全性。",
      "opensource.row4Status": "23 个已合并的 PR ↗",
      "opensource.row5Desc": "多行提交与更安全的权限处理。",
      "opensource.row5Status": "已合并 · PR #2357 ↗",

      "experience.eyebrow": "经历",
      "experience.title": "构建、发布、持续维护",
      "experience.item1Title": "开源贡献者",
      "experience.item1Period": "2024 — 至今",
      "experience.item1Bullet1Suffix": "个已合并到上游项目的 PR。",
      "experience.item1Bullet2": "可靠性修复、生产环境功能、自动化以及更安全的接口设计。",
      "experience.item1Bullet3": "每一次改动都范围明确、经过测试与审查，并在合并后持续维护。",
      "experience.item2Title": "独立 Python 工程师",
      "experience.item2Org": "Telegram 自动化 · AI Agent 工具 · 数据与金融",
      "experience.item2Period": "2021 — 至今",
      "experience.item2Bullet1": "基于 Python、asyncio、Agent 与各类 API 构建的生产环境服务。",
      "experience.item2Bullet2Prefix": "作者，拥有 ",
      "experience.item2Bullet2Suffix": " 个获星开源项目。",
      "experience.item2Bullet3Suffix": "个星标，来自个人项目与维护的分支。",

      "about.eyebrow": "关于我",
      "about.title": "为复杂工作打造稳定的系统",
      "about.copy1": "我构建 AI Agent 工具、Telegram 自动化和数据系统，注重行为的明确性、故障的可观测性以及运行的平稳可靠。",
      "about.copy2": "当依赖项需要修复时，我更倾向于将改进直接贡献回上游，而不是长期维护本地补丁。",
      "about.stackLabel": "常用技术栈",

      "contact.availability": "欢迎开源贡献、工具合作与精选项目合作",
      "contact.title": "需要一套真正稳定运行的系统？",
      "contact.copy": "有棘手的集成需求、不稳定的工作流程或数据处理问题？我可以帮你把它变成明确、经过测试的软件。",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas 效果由 ",
      "footer.effectsLink": "Demoscene Classics ↗"
    },
    hi: {
      "meta.title": "axisrow — Python इंजीनियर",
      "meta.description": "AI एजेंट टूलिंग, ऑटोमेशन और डेटा सिस्टम बनाने वाला Python इंजीनियर। {prs} मर्ज किए गए अपस्ट्रीम PR · {stars} स्टार · {starred} स्टार-प्राप्त प्रोजेक्ट।",
      "meta.ogTitle": "axisrow — Python इंजीनियर",
      "meta.ogDescription": "AI एजेंट टूलिंग, ऑटोमेशन और डेटा सिस्टम। {prs} मर्ज किए गए अपस्ट्रीम PR · {stars} स्टार · {starred} स्टार-प्राप्त प्रोजेक्ट।",
      "meta.twitterTitle": "axisrow — Python इंजीनियर",
      "meta.twitterDescription": "AI एजेंट टूलिंग, ऑटोमेशन और प्रोडक्शन Python सिस्टम।",

      "topbar.brand": "axisrow — शीर्ष पर वापस जाएं",
      "topbar.menuOpen": "सेक्शन नेविगेशन खोलें",
      "topbar.menuClose": "सेक्शन नेविगेशन बंद करें",
      "topbar.nav": "सेक्शन नेविगेशन",
      "topbar.theme": "रंग थीम",
      "topbar.themeSystem": "सिस्टम",
      "topbar.themeLight": "हल्का",
      "topbar.themeDark": "गहरा",
      "topbar.language": "भाषा",
      "topbar.github": "GitHub",

      "nav.stars": "स्टार",
      "nav.projects": "प्रोजेक्ट",
      "nav.opensource": "ओपन सोर्स",
      "nav.experience": "अनुभव",
      "nav.about": "परिचय",
      "nav.contact": "संपर्क",

      "hero.availability": "चुनिंदा इंजीनियरिंग कार्य के लिए उपलब्ध",
      "hero.lead": "Python इंजीनियर, जो प्रोडक्शन में टिकने के लिए बनाए गए AI एजेंट टूलिंग, ऑटोमेशन और डेटा सिस्टम विकसित करता है।",
      "hero.viewWork": "चुनिंदा काम देखें",
      "hero.startConversation": "संपर्क करें",
      "hero.statsLabel": "ओपन-सोर्स आँकड़े",
      "hero.starsLabel": "GitHub पर कुल स्टार",
      "hero.prsLabel": "मर्ज किए गए अपस्ट्रीम PR",
      "hero.starredLabel": "स्टार-प्राप्त प्रोजेक्ट",
      "hero.footEffect": "Canvas 2D / मेटाबॉल्स",
      "hero.footScroll": "एक्सप्लोर करने के लिए स्क्रॉल करें ↓",

      "stars.eyebrow": "प्रगति",
      "stars.title": "समय के साथ स्टार वृद्धि",
      "stars.sectionNote": "सभी रिपॉज़िटरी में संचयी GitHub स्टार, इस तारीख़ से: ",
      "stars.currentLabel": "सभी रिपॉज़िटरी",
      "stars.chartTitle": "{startDate} से संचयी GitHub स्टार",
      "stars.chartDesc": "यह चार्ट {endDate} को {count} स्टार पर समाप्त होता है।",

      "month.Jan": "जन",
      "month.Feb": "फ़र",
      "month.Mar": "मार्च",
      "month.Apr": "अप्रै",
      "month.May": "मई",
      "month.Jun": "जून",
      "month.Jul": "जुल",
      "month.Aug": "अग",
      "month.Sep": "सित",
      "month.Oct": "अक्टू",
      "month.Nov": "नव",
      "month.Dec": "दिस",

      "projects.eyebrow": "चुनिंदा काम",
      "projects.title": "मापने योग्य परिणाम देने वाले सिस्टम",
      "projects.notePrefix": "सबसे ज़्यादा स्टार वाली निजी रिपॉज़िटरी — सभी प्रोजेक्ट यहाँ देखें: ",
      "projects.captionLabel": "चुनिंदा सिस्टम",
      "projects.captionStrong": "ऑटोमेशन जो वाक़ई काम करता है",
      "projects.captionSmall": "एजेंट · इंटीग्रेशन · डेटा",
      "projects.viewRepository": "रिपॉज़िटरी देखें ↗",

      "projects.group.telegram-yandex": "Telegram और Yandex",
      "projects.group.ai-agent-tooling": "AI / एजेंट टूलिंग",
      "projects.group.data-ml": "डेटा / ML",
      "projects.desc.tg_content_factory": "Telegram के लिए कंटेंट-फ़ैक्ट्री पाइपलाइन — प्रमुख प्रोजेक्ट।",
      "projects.desc.yandex-direct-mcp-plugin": "Yandex.Direct के लिए Claude Code प्लगइन — MCP सर्वर + स्किल्स + OAuth।",
      "projects.desc.direct-cli": "Yandex.Direct के लिए CLI।",
      "projects.desc.clihost": "सुरक्षा की दृष्टि से मज़बूत सेल्फ़-होस्टिंग / प्रॉक्सी CLI।",
      "projects.desc.claude-code-cycle-review-skill": "Claude Code के लिए ऑटोमेटेड PR रिव्यू साइकल।",
      "projects.desc.claude_code_gmail_plugin": "Claude Code के लिए Gmail प्लगइन।",
      "projects.desc.zai-codex-helper": "Codex को Z.ai और OpenAI के बीच स्विच करने वाला CLI (आर्काइव्ड)।",
      "projects.desc.ccusage-dashboard": "Claude Code और Codex उपयोग के लिए प्रति-घंटा लागत डैशबोर्ड।",
      "projects.desc.llm_benchmark": "LLM बेंचमार्क हार्नेस।",

      "opensource.eyebrow": "योगदान",
      "opensource.title": "उपयोगी बदलाव, अपस्ट्रीम में मर्ज किए गए",
      "opensource.note": "नीचे दी गई हर एंट्री स्वीकृत प्रोडक्शन कोड से जुड़ी है।",
      "opensource.ariaLabel": "मर्ज किए गए अपस्ट्रीम योगदान",
      "opensource.prsLabel": "मर्ज किए गए अपस्ट्रीम PR",
      "opensource.row1Desc": "Peter Steinberger के डेस्कटॉप यूटिलिटी के लिए फ़ीचर और डॉक्यूमेंटेशन योगदान।",
      "opensource.row1Status": "मर्ज किया गया · PR #2814 ↗",
      "opensource.row2Desc": "अस्थायी नेटवर्क त्रुटियों के लिए पुनः प्रयास।",
      "opensource.row2Status": "मर्ज किया गया · PR #2627 ↗",
      "opensource.row3Desc": "Unix-अनुकूल ऑटोमेशन और सीरियलाइज़ेशन।",
      "opensource.row3Status": "मर्ज किया गया · PR #227 ↗",
      "opensource.row4Desc": "ऑथ, कैशिंग, डेटाबेस, E2E, PWA और सुरक्षा।",
      "opensource.row4Status": "23 मर्ज किए गए PR ↗",
      "opensource.row5Desc": "मल्टीलाइन सबमिट और सुरक्षित परमिशन हैंडलिंग।",
      "opensource.row5Status": "मर्ज किया गया · PR #2357 ↗",

      "experience.eyebrow": "अनुभव",
      "experience.title": "बनाया, रिलीज़ किया, बनाए रखा",
      "experience.item1Title": "ओपन-सोर्स योगदानकर्ता",
      "experience.item1Period": "2024 — अब तक",
      "experience.item1Bullet1Suffix": "अपस्ट्रीम प्रोजेक्ट्स में मर्ज किए गए PR।",
      "experience.item1Bullet2": "रिलायबिलिटी फ़िक्स, प्रोडक्शन फ़ीचर्स, ऑटोमेशन और सुरक्षित इंटरफ़ेस।",
      "experience.item1Bullet3": "हर बदलाव सीमित दायरे का, टेस्ट किया हुआ, रिव्यू किया हुआ और मर्ज के बाद बनाए रखा जाता है।",
      "experience.item2Title": "स्वतंत्र Python इंजीनियर",
      "experience.item2Org": "Telegram ऑटोमेशन · AI एजेंट टूलिंग · डेटा और फ़ाइनेंस",
      "experience.item2Period": "2021 — अब तक",
      "experience.item2Bullet1": "Python, asyncio, एजेंट्स और API पर आधारित प्रोडक्शन सर्विसेज़।",
      "experience.item2Bullet2Prefix": "लेखक — ",
      "experience.item2Bullet2Suffix": " स्टार-प्राप्त ओपन-सोर्स प्रोजेक्ट्स के।",
      "experience.item2Bullet3Suffix": "स्टार, निजी प्रोजेक्ट्स और मेंटेन किए गए फ़ॉर्क्स में।",

      "about.eyebrow": "परिचय",
      "about.title": "जटिल काम के लिए स्थिर सिस्टम",
      "about.copy1": "मैं AI एजेंट टूलिंग, Telegram ऑटोमेशन और डेटा सिस्टम बनाता हूँ — स्पष्ट व्यवहार, देखने योग्य विफलताओं और बिना उतार-चढ़ाव वाले संचालन को प्राथमिकता देते हुए।",
      "about.copy2": "जब किसी डिपेंडेंसी में फ़िक्स की ज़रूरत होती है, तो मैं स्थायी लोकल पैच बनाए रखने के बजाय सुधार सीधे अपस्ट्रीम में योगदान करना पसंद करता हूँ।",
      "about.stackLabel": "कार्य स्टैक",

      "contact.availability": "योगदान, टूलिंग और चुनिंदा कॉन्ट्रैक्ट कार्य के लिए उपलब्ध",
      "contact.title": "ऐसा सिस्टम चाहिए जो वाक़ई काम करता रहे?",
      "contact.copy": "कोई मुश्किल इंटीग्रेशन, अविश्वसनीय वर्कफ़्लो, या डेटा प्रोसेस? मैं इसे स्पष्ट, टेस्ट किए गए सॉफ़्टवेयर में बदलने में मदद करूँगा।",
      "contact.telegram": "Telegram ↗",
      "contact.github": "GitHub ↗",

      "footer.copyright": "© axisrow · 2026",
      "footer.effectsPrefix": "Canvas इफ़ेक्ट्स का आधार: ",
      "footer.effectsLink": "Demoscene Classics ↗"
    }
  };

  // Supported-languages list + default read from the <meta name="i18n-languages">
  // tag in index.html's <head> — the single source of truth also read by the
  // inline pre-paint bootstrap script there, so the two never hardcode the
  // language list independently and silently diverge if a language is added.
  // Falls back to the current supported-languages list when the meta tag is
  // absent (e.g. this file's `vm` sandbox in tests/site-smoke.test.mjs has no
  // real DOM).
  var langMeta = typeof document !== "undefined" && document.querySelector
    ? document.querySelector('meta[name="i18n-languages"]')
    : null;
  var SUPPORTED = (langMeta && langMeta.content ? langMeta.content : "en,ru,zh,hi").split(",");
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

  // Substitutes {placeholder} tokens in a translated string with caller-supplied
  // values. Used for copy that embeds bot-synced data (star counts, PR counts,
  // dates) so those numbers live in one place (the DOM, updated daily by
  // profile/sync/apply_site_fragments.py) instead of being duplicated as
  // literals inside both language dictionaries above, where they'd silently
  // go stale every time the bot updates the page but not this file.
  function interpolate(text, vars) {
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match;
    });
  }

  // Reads a node's `data-i18n-vars` attribute — a small JSON object of
  // placeholder values, e.g. {"count":"108","date":"2026-08-14"} — and returns
  // it, or null if absent/malformed (malformed is treated as "no vars", not an
  // error, so a bad attribute degrades to the untranslated {placeholder} tokens
  // rather than throwing and leaving the rest of the page untranslated).
  function readVars(node) {
    var raw = node.getAttribute("data-i18n-vars");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  // Reads the hero's live profile counters straight from the DOM
  // (<span data-profile-value="…">), the same nodes
  // profile/sync/apply_site_fragments.py keeps current on every bot sync, so
  // meta.description/meta.ogDescription always interpolate today's numbers
  // instead of a snapshot baked into this dictionary at PR time.
  function readProfileVars(scope) {
    var doc = (scope && scope.ownerDocument) || (typeof document !== "undefined" ? document : null);
    if (!doc || !doc.querySelector) return null;
    var read = function (key) {
      var node = doc.querySelector('[data-profile-value="' + key + '"]');
      return node ? node.textContent.trim() : null;
    };
    var prs = read("merged_upstream_prs");
    var stars = read("stars_earned");
    var starred = read("starred_projects");
    if (prs === null || stars === null || starred === null) return null;
    return { prs: prs, stars: stars, starred: starred };
  }

  function applyTranslations(root, lang) {
    var scope = root || document;

    var textNodes = scope.querySelectorAll("[data-i18n]");
    for (var i = 0; i < textNodes.length; i++) {
      var node = textNodes[i];
      var key = node.getAttribute("data-i18n");
      if (key) node.textContent = interpolate(translate(lang, key), readVars(node));
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
    var profileVars = null;
    for (var m = 0; m < metaNodes.length; m++) {
      var metaNode = metaNodes[m];
      var metaKey = metaNode.getAttribute("data-i18n-meta");
      if (!metaKey) continue;
      var vars = readVars(metaNode);
      if (!vars && (metaKey === "meta.description" || metaKey === "meta.ogDescription")) {
        if (profileVars === null) profileVars = readProfileVars(scope) || false;
        vars = profileVars || null;
      }
      var value = interpolate(translate(lang, metaKey), vars);
      // SVG <title>/<desc> keep their source-case tagName ("title"/"desc"),
      // unlike HTML elements (always uppercased) — compare case-insensitively
      // so both the document <title> and an in-chart <title>/<desc> take the
      // textContent branch instead of falling through to setAttribute.
      var tag = metaNode.tagName.toLowerCase();
      if (tag === "title" || tag === "desc") metaNode.textContent = value;
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
