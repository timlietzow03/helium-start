/**
 * Demo-Link-Silos.
 *
 * Dieses Repo enthält absichtlich nur Beispieldaten: eine Auswahl allgemein
 * bekannter Seiten, damit die Startseite nach dem Klonen sofort sinnvoll
 * aussieht — und niemand etwas über den Autor verrät.
 *
 * Eigene Links gehören NICHT hierher, sondern in local-data.js
 * (siehe README, steht in .gitignore).
 */
window.LINK_SILOS = [
    {
        title: "Development",
        icon:  "fa-solid fa-code",
        color: "#60a5fa",
        links: [
            { title: "GitHub",         url: "https://github.com/",                    icon: "fa-brands fa-github",            tags: ["code", "git"],      favorite: true },
            { title: "Stack Overflow", url: "https://stackoverflow.com/questions",    icon: "fa-brands fa-stack-overflow",    tags: ["help", "q&a"],      favorite: true },
            { title: "MDN Web Docs",   url: "https://developer.mozilla.org/",         icon: "fa-brands fa-firefox-browser",   tags: ["docs", "web"] },
            { title: "npm",            url: "https://www.npmjs.com/",                 icon: "fa-brands fa-npm",               tags: ["packages"] },
            { title: "Can I use",      url: "https://caniuse.com/",                   icon: "fa-solid fa-circle-check",       tags: ["compat"] },
            { title: "CodePen",        url: "https://codepen.io/",                    icon: "fa-brands fa-codepen",           tags: ["playground"] },
            { title: "Vercel",         url: "https://vercel.com/dashboard",           icon: "fa-solid fa-triangle-exclamation", tags: ["deploy", "hosting"] },
            { title: "Supabase",       url: "https://supabase.com/dashboard",         icon: "fa-solid fa-database",           tags: ["db", "backend"] }
        ]
    },
    {
        title: "Research & Papers",
        icon:  "fa-solid fa-book",
        color: "#a78bfa",
        links: [
            { title: "arXiv",             url: "https://arxiv.org/",                        icon: "fa-solid fa-square-root-variable", tags: ["papers", "preprint"] },
            { title: "Google Scholar",    url: "https://scholar.google.com/",               icon: "fa-brands fa-google",              tags: ["papers", "search"] },
            { title: "Semantic Scholar",  url: "https://www.semanticscholar.org/",          icon: "fa-solid fa-graduation-cap",       tags: ["papers", "ai"] },
            { title: "Hugging Face",      url: "https://huggingface.co/",                   icon: "fa-solid fa-face-smile",           tags: ["models", "ml"] },
            { title: "Papers with Code",  url: "https://paperswithcode.com/",               icon: "fa-solid fa-laptop-code",          tags: ["papers", "code"] },
            { title: "ACM DL",            url: "https://dl.acm.org/",                       icon: "fa-solid fa-database",             tags: ["papers"] }
        ]
    },
    {
        title: "AI Tools",
        icon:  "fa-solid fa-wand-magic-sparkles",
        color: "#f472b6",
        links: [
            { title: "Claude",       url: "https://claude.ai/new",                icon: "fa-solid fa-comment-dots",   tags: ["chat", "llm"], favorite: true },
            { title: "ChatGPT",      url: "https://chatgpt.com/",                 icon: "fa-solid fa-robot",          tags: ["chat", "llm"] },
            { title: "Gemini",       url: "https://gemini.google.com/app",        icon: "fa-solid fa-star",           tags: ["chat", "llm"] },
            { title: "Perplexity",   url: "https://www.perplexity.ai/",           icon: "fa-solid fa-magnifying-glass", tags: ["search", "llm"] },
            { title: "Google AI Studio", url: "https://aistudio.google.com/",     icon: "fa-solid fa-flask",          tags: ["prompts", "api"] }
        ]
    },
    {
        title: "Design",
        icon:  "fa-solid fa-palette",
        color: "#fbbf24",
        links: [
            { title: "Figma",        url: "https://www.figma.com/files",   icon: "fa-brands fa-figma",        tags: ["ui", "design"] },
            { title: "Dribbble",     url: "https://dribbble.com/",         icon: "fa-brands fa-dribbble",     tags: ["inspiration"] },
            { title: "Awwwards",     url: "https://www.awwwards.com/",     icon: "fa-solid fa-trophy",        tags: ["inspiration", "web"] },
            { title: "Coolors",      url: "https://coolors.co/",           icon: "fa-solid fa-swatchbook",    tags: ["colors"] },
            { title: "Google Fonts", url: "https://fonts.google.com/",     icon: "fa-solid fa-font",          tags: ["type"] },
            { title: "Unsplash",     url: "https://unsplash.com/",         icon: "fa-solid fa-camera",        tags: ["photos"] },
            { title: "Excalidraw",   url: "https://excalidraw.com/",       icon: "fa-solid fa-pen-ruler",     tags: ["sketch", "diagram"] }
        ]
    },
    {
        title: "Learning",
        icon:  "fa-solid fa-graduation-cap",
        color: "#34d399",
        links: [
            { title: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/",           icon: "fa-brands fa-free-code-camp", tags: ["course", "web"] },
            { title: "MIT OCW",      url: "https://ocw.mit.edu/",                          icon: "fa-solid fa-university",      tags: ["course", "cs"] },
            { title: "CS50",         url: "https://cs50.harvard.edu/x/",                   icon: "fa-solid fa-school",          tags: ["course", "cs"] },
            { title: "Coursera",     url: "https://www.coursera.org/",                     icon: "fa-solid fa-certificate",     tags: ["course"] },
            { title: "Kaggle",       url: "https://www.kaggle.com/learn",                  icon: "fa-solid fa-chart-line",      tags: ["data", "ml"] },
            { title: "LeetCode",     url: "https://leetcode.com/problemset/",              icon: "fa-solid fa-code-branch",     tags: ["algo", "practice"] },
            { title: "roadmap.sh",   url: "https://roadmap.sh/",                           icon: "fa-solid fa-route",           tags: ["career", "guide"] }
        ]
    },
    {
        title: "Work & Ops",
        icon:  "fa-solid fa-briefcase",
        color: "#38bdf8",
        links: [
            { title: "Gmail",            url: "https://mail.google.com/",            icon: "fa-solid fa-envelope",       tags: ["mail"],      favorite: true },
            { title: "Google Calendar",  url: "https://calendar.google.com/",        icon: "fa-solid fa-calendar-days",  tags: ["calendar"] },
            { title: "Google Drive",     url: "https://drive.google.com/",           icon: "fa-brands fa-google-drive",  tags: ["files"] },
            { title: "Notion",           url: "https://www.notion.so/",              icon: "fa-solid fa-book-open",      tags: ["notes", "wiki"] },
            { title: "Linear",           url: "https://linear.app/",                 icon: "fa-solid fa-list-check",     tags: ["issues", "tracking"] },
            { title: "Slack",            url: "https://app.slack.com/",              icon: "fa-brands fa-slack",         tags: ["chat", "team"] },
            { title: "Excalidraw",       url: "https://excalidraw.com/",             icon: "fa-solid fa-pen-ruler",      tags: ["diagram"] }
        ]
    },
    {
        title: "Media & Streaming",
        icon:  "fa-solid fa-film",
        color: "#c084fc",
        links: [
            { title: "YouTube",     url: "https://www.youtube.com/",       icon: "fa-brands fa-youtube",      tags: ["video"],  favorite: true },
            { title: "Netflix",     url: "https://www.netflix.com/browse", icon: "fa-solid fa-clapperboard",  tags: ["series"] },
            { title: "Spotify",     url: "https://open.spotify.com/",      icon: "fa-brands fa-spotify",      tags: ["music"],  favorite: true },
            { title: "Twitch",      url: "https://www.twitch.tv/",         icon: "fa-brands fa-twitch",       tags: ["stream"] },
            { title: "Prime Video", url: "https://www.primevideo.com/",    icon: "fa-solid fa-play",          tags: ["series"] }
        ]
    },
    {
        title: "Communities & Social",
        icon:  "fa-solid fa-users",
        color: "#22d3ee",
        links: [
            { title: "Reddit",             url: "https://www.reddit.com/",     icon: "fa-brands fa-reddit",   tags: ["forum"] },
            { title: "Hacker News",        url: "https://news.ycombinator.com/", icon: "fa-brands fa-y-combinator", tags: ["news", "tech"] },
            { title: "LinkedIn",           url: "https://www.linkedin.com/",    icon: "fa-brands fa-linkedin", tags: ["network"] },
            { title: "Discord",            url: "https://discord.com/app",      icon: "fa-brands fa-discord",  tags: ["chat"] }
        ]
    },
    {
        title: "Gaming",
        icon:  "fa-solid fa-gamepad",
        color: "#4ade80",
        links: [
            { title: "Steam",           url: "https://store.steampowered.com/",  icon: "fa-brands fa-steam",     tags: ["store"],   favorite: true },
            { title: "itch.io",         url: "https://itch.io/",                 icon: "fa-solid fa-gamepad",    tags: ["indie"] },
            { title: "HowLongToBeat",   url: "https://howlongtobeat.com/",       icon: "fa-solid fa-hourglass",  tags: ["guide"] },
            { title: "PCGamingWiki",    url: "https://www.pcgamingwiki.com/",    icon: "fa-solid fa-wrench",     tags: ["fixes"] }
        ]
    }
];
