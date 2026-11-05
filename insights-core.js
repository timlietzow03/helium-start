/**
 * Insights core: Kategorien, Parser (kompakt + Browser-Rohverlauf) und Aggregation.
 * Keine DOM-Zugriffe, alles in window.Insights.
 */
window.Insights = (function () {
    const CATS = {
        dev:      { label: "Dev & Build",       color: "#60a5fa", icon: "fa-solid fa-code" },
        ops:      { label: "Startup & Ops",     color: "#a78bfa", icon: "fa-solid fa-briefcase" },
        infra:    { label: "Domains & Hosting", color: "#22d3ee", icon: "fa-solid fa-globe" },
        ai:       { label: "AI-Tools",          color: "#f472b6", icon: "fa-solid fa-wand-magic-sparkles" },
        shop:     { label: "Shopping & Style",  color: "#fbbf24", icon: "fa-solid fa-bag-shopping" },
        media:    { label: "Anime & Serien",    color: "#c084fc", icon: "fa-solid fa-tv" },
        games:    { label: "Gaming & Video",    color: "#4ade80", icon: "fa-solid fa-gamepad" },
        learn:    { label: "Studium & Lernen",  color: "#34d399", icon: "fa-solid fa-user-graduate" },
        personal: { label: "Eigene Projekte",   color: "#fb923c", icon: "fa-solid fa-heart" },
        accounts: { label: "Konten & Geld",     color: "#94a3b8", icon: "fa-solid fa-key" },
        search:   { label: "Suche & News",      color: "#cbd5e1", icon: "fa-solid fa-magnifying-glass" },
        other:    { label: "Sonstiges",         color: "#64748b", icon: "fa-solid fa-ellipsis" }
    };

    // Welche Kategorien zu welchem Browser-Profil gehören
    const PROFILES = [
        { id: "work",    label: "Work",             icon: "fa-solid fa-briefcase",      color: "#60a5fa", cats: ["dev", "ops", "infra"] },
        { id: "uni",     label: "Studium",          icon: "fa-solid fa-user-graduate",  color: "#34d399", cats: ["learn"] },
        { id: "private", label: "Privat & Freizeit", icon: "fa-solid fa-couch",         color: "#f472b6", cats: ["shop", "media", "games", "personal", "ai", "search"] }
    ];

    // [Regex auf Host, Anzeigename, Kategorie, Favicon-Host, Start-URL für "zu Helium hinzufügen"]
    const SERVICES = [
        [/^(localhost|127\.0\.0\.1):3000$/,  "Dev-Server (:3000)",          "dev", null, "http://localhost:3000/"],
        [/^(localhost|127\.0\.0\.1):8001$/,  "Staff-Admin (:8001)",         "dev", null, "http://127.0.0.1:8001/"],
        [/^(localhost|127\.0\.0\.1):8025$/,  "Mailpit (:8025)",             "dev", null, "http://127.0.0.1:8025/"],
        [/^(localhost|127\.0\.0\.1)(:\d+)?$/, "Dev-Server",                 "dev", null, null],
        [/(^|\.)github\.com$/,               "GitHub",         "dev",  "github.com",  "https://github.com/"],
        [/(^|\.)vercel\.(com|app)$/,         "Vercel",         "dev",  "vercel.com",  "https://vercel.com/dashboard"],
        [/(^|\.)v0\.app$/,                   "v0",             "dev",  "v0.app",      "https://v0.app/"],
        [/(^|\.)supabase\.com$/,             "Supabase",       "dev",  "supabase.com","https://supabase.com/dashboard"],

        [/(^|\.)slack\.com$/,                "Slack",          "ops",  "slack.com",   "https://app.slack.com/"],
        [/(^|\.)atlassian\.net$/,            "Jira",           "ops",  "atlassian.com","https://www.atlassian.com/"],
        [/^docs\.google\.com$/,              "Google Docs & Forms", "ops", "docs.google.com", "https://docs.google.com/"],
        [/(^|\.)figma\.com$/,                "Figma",          "ops",  "figma.com",   "https://www.figma.com/files"],
        [/(^|\.)mural\.co$/,                 "Mural",          "ops",  "mural.co",    "https://app.mural.co/"],
        [/(^|\.)excalidraw\.com$/,           "Excalidraw",     "ops",  "excalidraw.com","https://excalidraw.com/"],
        [/(^|\.)microsoftonline\.com$/,      "Microsoft-SSO",  "ops",  "microsoft.com", null],
        [/(^|\.)(moj|mol)\.gov\.tw$/,        "Taiwan Recht & Löhne", "ops", "gov.tw", null],
        [/^meet\.google\.com$/,              "Google Meet",    "ops",  "meet.google.com", "https://meet.google.com/"],
        [/^calendar\.google\.com$/,          "Google Kalender","ops",  "calendar.google.com", "https://calendar.google.com/"],
        [/(^|\.)kiwi\.com$/,                 "Flugsuche (Kiwi)", "ops", "kiwi.com",   null],

        [/(^|\.)cloudflare\.com$/,           "Cloudflare",     "infra", "cloudflare.com", "https://dash.cloudflare.com/"],
        [/(^|\.)godaddy\.com$/,              "GoDaddy",        "infra", "godaddy.com",    "https://dcc.godaddy.com/"],
        [/(^|\.)ionos\.de$/,                 "IONOS Webmail",  "infra", "ionos.de",       "https://email.ionos.de/"],
        [/^(workspace|support|knowledge\.workspace)\.google\.com$/, "Google Workspace-Hilfe", "infra", "workspace.google.com", null],

        [/(^|\.)claude\.ai$/,                "Claude",         "ai",   "claude.ai",   "https://claude.ai/new"],
        [/(^|\.)chatgpt\.com$/,              "ChatGPT",        "ai",   "chatgpt.com", "https://chatgpt.com/"],
        [/^gemini\.google(\.com)?$/,         "Gemini",         "ai",   "gemini.google.com", "https://gemini.google.com/app"],

        [/(^|\.)bestsecret\.com$/,           "BestSecret",     "shop", "bestsecret.com", "https://www.bestsecret.com/"],
        [/(^|\.)otto\.de$/,                  "OTTO",           "shop", "otto.de",        "https://www.otto.de/"],
        [/(^|\.)pedroshoes\.com$/,           "Pedro",          "shop", "pedroshoes.com", "https://www.pedroshoes.com/"],
        [/(^|\.)suitsupply\.com$/,           "Suitsupply",     "shop", "suitsupply.com", "https://suitsupply.com/de-de/"],
        [/(^|\.)seidensticker\.com$/,        "Seidensticker",  "shop", "seidensticker.com", "https://www.seidensticker.com/"],
        [/(^|\.)cos\.com$/,                  "COS",            "shop", "cos.com",        "https://www.cos.com/de_de/"],
        [/(^|\.)kohlenstoff-12\.com$/,       "Kohlenstoff 12", "shop", "kohlenstoff-12.com", null],

        [/(^|\.)aniworld\.to$/,              "AniWorld",       "media", "aniworld.to",   "https://aniworld.to/"],
        [/(^|\.)primevideo\.com$/,           "Prime Video",    "media", "primevideo.com","https://www.primevideo.com/"],
        [/(^|\.)teleparty\.com$/,            "Teleparty",      "media", "teleparty.com", null],
        [/(^|\.)amazon\.de$/,                "Amazon",         "media", "amazon.de",     "https://www.amazon.de/"],

        [/(^|\.)youtube\.com$/,              "YouTube",        "games", "youtube.com",   "https://www.youtube.com/"],
        [/(^|\.)ign\.com$/,                  "IGN",            "games", "ign.com",       null],
        [/(^|\.)gamivo\.com$/,               "Gamivo",         "games", "gamivo.com",    "https://www.gamivo.com/"],
        [/(^|\.)keyforsteam\.de$/,           "Keyforsteam",    "games", "keyforsteam.de","https://www.keyforsteam.de/"],
        [/(^|\.)steampowered\.com$/,         "Steam",          "games", "steampowered.com", null],
        [/(^|\.)(cheatengine\.org|softonic\.com|xmodhub\.com)$/, "Mods & Cheats", "games", "cheatengine.org", null],
        [/(^|\.)(snowcrows\.com|gw2mastery\.com|guildwars2\.com)$/, "Guild Wars 2", "games", "guildwars2.com", null],

        [/(^|\.)acm\.org$/,                  "ACM Digital Library", "learn", "acm.org",     null],
        [/(^|\.)humblebundle\.com$/,         "Humble Bundle",  "shop",  "humblebundle.com", "https://www.humblebundle.com/"],

        [/(^|\.)example\.com$/,              "example.com (Demo)", "personal", "example.com", "https://example.com/"],
        [/(^|\.)(lensbooth\.app|beautyplus\.com|meitudata\.com)$/, "Photo-Booth-Recherche", "personal", "lensbooth.app", null],
        [/^photos\.google\.com$/,            "Google Fotos",   "personal", "photos.google.com", "https://photos.google.com/"],

        [/^accounts\.google\.com$/,          "Google-Login",   "accounts", "google.com", null],
        [/^mail\.google\.com$/,              "Gmail",          "accounts", "mail.google.com", "https://mail.google.com/"],
        [/(^|\.)paypal\.com$/,               "PayPal",         "accounts", "paypal.com", "https://www.paypal.com/myaccount/summary"],
        [/^bitwarden$/,                      "Bitwarden",      "accounts", "bitwarden.com", null],
        [/(^|\.)n26\.com$/,                  "N26",            "accounts", "n26.com", "https://app.n26.com/"],

        [/(^|\.)search\.brave\.com$/,        "Brave Search",   "search", "search.brave.com", null],
        [/(^|\.)(mopo\.de|wdr\.de|giga\.de)$/, "News & Ratgeber", "search", "wdr.de", null],

        [/^helium-start$/,                   "Helium Start",   "start", null, null],
        [/^lokale-datei$/,                   "Lokale Datei",   "other", null, null]
    ];

    const cache = new Map();

    function stripWww(h) { return String(h || "").toLowerCase().replace(/^www\d*\./, ""); }

    function serviceOf(host) {
        const h = stripWww(host);
        if (cache.has(h)) return cache.get(h);
        let res = null;
        for (const [re, name, cat, fav, url] of SERVICES) {
            if (re.test(h)) { res = { name, cat, fav, url }; break; }
        }
        if (!res) {
            const parts = h.split(".");
            const reg = parts.length > 2 ? parts.slice(-2).join(".") : h;
            res = { name: reg, cat: "other", fav: reg, url: null };
        }
        cache.set(h, res);
        return res;
    }

    // ── Parser ───────────────────────────────────────────────────────────────

    /** Kompaktes Format: "YYYY-MM-DD HH host count" je Zeile. */
    function parseCompact(text) {
        const rows = [];
        String(text || "").split(/\r?\n/).forEach(line => {
            const m = line.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2})\s+(\S+)\s+(\d+)$/);
            if (m) rows.push({ date: m[1], hour: +m[2], host: m[3], n: +m[4] });
        });
        return rows;
    }

    const MONTHS = { januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7,
                     august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
    const DAY_RE  = /^(?:Heute\s*-\s*|Gestern\s*-\s*)?(?:Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s*(\d{1,2})\.\s*(\S+)\s+(\d{4})$/;
    const TIME_RE = /^(\d{1,2}):(\d{2})$/;

    /**
     * Rohverlauf aus der Verlaufsseite (Strg+A, Strg+C):
     *   Tag-Überschrift / Uhrzeit / Titel / Host, je Eintrag drei Zeilen.
     * Gibt verdichtete Zeilen zurück plus Repo- und Gmail-Funde aus den Titeln.
     */
    function parseRaw(text) {
        const lines = String(text || "").split(/\r?\n/).map(l => l.trim()).filter(l => l && !/ausgewählt$/i.test(l));
        const counts = new Map();
        const ghHits = new Map();
        const mails = new Map();
        let date = null;
        let i = 0;

        while (i < lines.length) {
            const dm = lines[i].match(DAY_RE);
            if (dm) {
                const mon = MONTHS[dm[2].toLowerCase()];
                date = mon ? `${dm[3]}-${String(mon).padStart(2, "0")}-${String(dm[1]).padStart(2, "0")}` : null;
                i++; continue;
            }
            const tm = lines[i].match(TIME_RE);
            if (!tm || !date) { i++; continue; }

            let j = i + 1;
            const block = [];
            while (j < lines.length && !TIME_RE.test(lines[j]) && !DAY_RE.test(lines[j])) block.push(lines[j++]);
            i = j;
            if (block.length < 2) continue;

            const hostRaw = block[block.length - 1];
            const title   = block.slice(0, -1).join(" ");
            let host = hostRaw.toLowerCase();
            if (host.startsWith("file:")) host = /^helium start$/i.test(title) ? "helium-start" : "lokale-datei";
            else if (/\s/.test(host)) host = host.split(/\s+/)[0].toLowerCase();

            const key = `${date} ${+tm[1]} ${host}`;
            counts.set(key, (counts.get(key) || 0) + 1);

            if (host === "github.com") {
                // GitHub hängt "· owner/repo" ans Titelende, deshalb der letzte Treffer
                const all = [...title.matchAll(/(?:^|[\s·])([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/g)];
                const m = all[all.length - 1];
                if (m && !/^(pull|issues|blob|tree)$/i.test(m[2])) {
                    const k = `${m[1]}/${m[2]}`;
                    ghHits.set(k, (ghHits.get(k) || 0) + 1);
                }
            }
            const em = title.match(/[\w.+-]+@gmail\.com/i);
            if (em) mails.set(em[0].toLowerCase(), (mails.get(em[0].toLowerCase()) || 0) + 1);
        }

        const rows = [...counts].map(([k, n]) => {
            const [d, h, host] = k.split(" ");
            return { date: d, hour: +h, host, n };
        });
        return {
            rows,
            gh: [...ghHits].map(([k, n]) => { const [owner, repo] = k.split("/"); return { owner, repo, n }; }),
            mails: [...mails].map(([label, n]) => ({ label, n }))
        };
    }

    const STORE_KEY = "helium_history_v1";

    /** Eingelesener Verlauf (localStorage) hat Vorrang vor dem Snapshot aus history-data.js. */
    function loadData(snap) {
        try {
            const saved = JSON.parse(localStorage.getItem(STORE_KEY));
            if (saved && saved.rows) {
                return { imported: true, rows: parseCompact(saved.rows), gh: saved.gh || [],
                         accounts: (saved.mails || []).map(m => ({ label: m.label, kind: "Gmail", note: `${m.n} Seitentitel` })) };
            }
        } catch {}
        return { imported: false, rows: parseCompact(snap.rows), gh: snap.gh, accounts: snap.accounts };
    }

    function toCompact(rows) {
        return rows.map(r => `${r.date} ${String(r.hour).padStart(2, "0")} ${r.host} ${r.n}`).join("\n");
    }

    // ── Aggregation ──────────────────────────────────────────────────────────

    function isoDay(d) { return d.toISOString().slice(0, 10); }

    /** range {start, end} erzwingt den Zeitraum, damit gefilterte Auswertungen dieselben Tage zeigen. */
    function aggregate(rows, range) {
        const A = {
            total: 0, starts: 0, days: [], hours: Array(24).fill(0),
            hourCats: Array.from({ length: 24 }, () => ({})),
            byCat: {}, services: new Map(), hosts: new Set(), blocks: []
        };
        if (!rows.length && !range) return A;

        const dates = range ? [range.start, range.end] : rows.map(r => r.date).sort();
        const dayIndex = new Map();
        for (let d = new Date(dates[0] + "T12:00:00Z"); isoDay(d) <= dates[dates.length - 1]; d.setUTCDate(d.getUTCDate() + 1)) {
            const date = isoDay(d);
            dayIndex.set(date, A.days.length);
            A.days.push({ date, total: 0, hours: Array(24).fill(0), cats: {} });
        }

        rows.forEach(r => {
            const svc = serviceOf(r.host);
            if (svc.cat === "start") { A.starts += r.n; return; }
            const day = A.days[dayIndex.get(r.date)];
            A.total += r.n;
            day.total += r.n;
            day.hours[r.hour] += r.n;
            day.cats[svc.cat] = (day.cats[svc.cat] || 0) + r.n;
            A.hours[r.hour] += r.n;
            A.hourCats[r.hour][svc.cat] = (A.hourCats[r.hour][svc.cat] || 0) + r.n;
            A.byCat[svc.cat] = (A.byCat[svc.cat] || 0) + r.n;
            A.hosts.add(stripWww(r.host));

            let s = A.services.get(svc.name);
            if (!s) { s = { ...svc, n: 0, days: new Set(), hours: Array(24).fill(0) }; A.services.set(svc.name, s); }
            s.n += r.n; s.days.add(r.date); s.hours[r.hour] += r.n;
        });

        // Aktivitätsblöcke: zusammenhängende Stunden mit Aufrufen, auch über Mitternacht
        let cur = null;
        A.days.forEach((day, di) => day.hours.forEach((n, h) => {
            const idx = di * 24 + h;
            if (n > 0) {
                if (!cur) cur = { from: idx, to: idx, n: 0 };
                cur.to = idx; cur.n += n;
            } else if (cur) { A.blocks.push(cur); cur = null; }
        }));
        if (cur) A.blocks.push(cur);

        return A;
    }

    // ── Tagesmodus: Work oder Freizeit je nach Uhrzeit und eigenem Verlauf ───
    const CAT_GROUP = { dev: "work", ops: "work", infra: "work", learn: "work", ai: "work",
                        shop: "private", media: "private", games: "private", personal: "private" };

    /**
     * Grobe Erwartung (0..1), dass jetzt Work dran ist.
     * sched: { start, end, weekend } = deine Arbeitszeit; am Wochenende nur mit weekend=true wie werktags.
     */
    function priorWork(h, dow, sched) {
        const s = sched || {}, start = s.start ?? 8, end = s.end ?? 17;
        if ((dow === 0 || dow === 6) && !s.weekend) return h >= 9 && h < 18 ? 0.35 : 0.2;
        if (h >= start && h < end) return 0.8;
        if (h >= start - 2 && h < start) return 0.6;
        if (h >= end && h < end + 5) return 0.4;
        return 0.15;
    }

    /**
     * Work-Anteil rund um die Stunde (±1 h) aus Verlauf und gelernten Klicks, null bei zu wenig Daten.
     * clicks: { work: [24], private: [24] }. Ein Klick in Helium zählt dreifach, weil er bewusst war.
     */
    function dataWork(A, h, clicks) {
        let w = 0, p = 0;
        [h - 1, h, h + 1].forEach(x => {
            const hh = (x + 24) % 24;
            Object.entries(A.hourCats[hh]).forEach(([c, n]) => {
                if (CAT_GROUP[c] === "work") w += n; else if (CAT_GROUP[c] === "private") p += n;
            });
            if (clicks) { w += 3 * clicks.work[hh]; p += 3 * clicks.private[hh]; }
        });
        return w + p >= 8 ? w / (w + p) : null;
    }

    /** opts: { sched, clicks }. Mehr gelernte Klicks geben deinem Verhalten mehr Gewicht gegenüber der Erwartung. */
    function modeAt(A, h, dow, opts) {
        const o = opts || {};
        const prior = priorWork(h, dow, o.sched), data = dataWork(A, h, o.clicks);
        let weight = 0.45;
        if (o.clicks) {
            const near = [h - 1, h, h + 1].reduce((s, x) => s + o.clicks.work[(x + 24) % 24] + o.clicks.private[(x + 24) % 24], 0);
            weight = Math.min(0.7, 0.45 + 0.03 * near);
        }
        const share = data == null ? prior : (1 - weight) * prior + weight * data;
        return { share, prior, data, weight, mode: share >= 0.5 ? "work" : "private" };
    }

    function blockLabel(A, b) {
        const f = A.days[Math.floor(b.from / 24)].date, t = A.days[Math.floor(b.to / 24)].date;
        const fmt = (d, h) => `${d.slice(8)}.${d.slice(5, 7)}. ${String(h).padStart(2, "0")}:00`;
        return `${fmt(f, b.from % 24)} bis ${fmt(t, b.to % 24)}`;
    }

    return { CATS, PROFILES, SERVICES, serviceOf, stripWww, parseCompact, parseRaw, toCompact, loadData, aggregate, blockLabel, CAT_GROUP, modeAt };
})();
