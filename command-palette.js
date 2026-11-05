/**
 * Befehlspalette (Strg+K): springt zu Links, führt Befehle aus, sucht im Web.
 * Ranking: Treffer im Titel, dann deine Klick-Gewohnheit, Favoriten und der aktuelle Modus.
 * Plus Tastenkürzel-Hilfe (?).
 */
(function () {
    const learn = window.HeliumLearn, Mode = () => window.HeliumMode;
    if (!learn || !window.HeliumStorage) return;

    const $ = id => document.getElementById(id);
    const ENGINES = {
        g:   ["Google",        "https://www.google.com/search?q=",                "fa-brands fa-google"],
        yt:  ["YouTube",       "https://www.youtube.com/results?search_query=",   "fa-brands fa-youtube"],
        gh:  ["GitHub",        "https://github.com/search?q=",                    "fa-brands fa-github"],
        ddg: ["DuckDuckGo",    "https://duckduckgo.com/?q=",                      "fa-solid fa-magnifying-glass"],
        mdn: ["MDN",           "https://developer.mozilla.org/search?q=",         "fa-brands fa-firefox-browser"],
        wp:  ["Wikipedia",     "https://en.wikipedia.org/w/index.php?search=",    "fa-brands fa-wikipedia-w"],
        npm: ["npm",           "https://www.npmjs.com/search?q=",                 "fa-brands fa-npm"],
        so:  ["Stack Overflow", "https://stackoverflow.com/search?q=",            "fa-brands fa-stack-overflow"]
    };

    const COMMANDS = [
        { title: "Modus: Auto",    sub: "Nach Uhrzeit, Verlauf und deinen Klicks", icon: "fa-solid fa-wand-magic-sparkles", kw: "auto modus tageszeit", run: () => Mode().setPref("auto") },
        { title: "Modus: Work",    sub: "Work-Links zuerst",                       icon: "fa-solid fa-briefcase",           kw: "work arbeit modus",    run: () => Mode().setPref("work") },
        { title: "Modus: Freizeit", sub: "Freizeit-Links zuerst",                  icon: "fa-solid fa-couch",               kw: "freizeit privat modus", run: () => Mode().setPref("private") },
        { title: "Modus: Alle",    sub: "Nicht sortieren",                         icon: "fa-solid fa-layer-group",         kw: "alle modus",           run: () => Mode().setPref("all") },
        { title: "Bearbeiten umschalten", sub: "Links ändern, hinzufügen, löschen", icon: "fa-solid fa-pen",                kw: "edit bearbeiten",      run: () => $("editModeBtn").click() },
        { title: "Notizen ein- oder ausblenden", sub: "Schnelle Notizen",          icon: "fa-solid fa-note-sticky",         kw: "notizen notes",        run: () => $("notesToggle").click() },
        { title: "Einstellungen",  sub: "Name, Arbeitszeit, Dichte, Gelerntes",    icon: "fa-solid fa-sliders",             kw: "einstellungen prefs name arbeitszeit dichte", run: () => Mode().openPrefs() },
        { title: "Verlaufs-Auswertung öffnen", sub: "Insights",                    icon: "fa-solid fa-chart-pie",           kw: "insights auswertung verlauf statistik", run: () => { location.href = "./insights.html"; } },
        { title: "Alle Kategorien ein- oder ausklappen", sub: "",                  icon: "fa-solid fa-angles-up",           kw: "einklappen ausklappen collapse", run: () => $("toggleAllBtn").click() },
        { title: "Dichte umschalten", sub: "Angenehm oder kompakt",                icon: "fa-solid fa-table-cells",         kw: "dichte kompakt density", run: () => {
            const next = learn.prefs().density === "compact" ? "comfortable" : "compact";
            learn.setPrefs({ density: next }); document.body.dataset.density = next;
            UIKit.toast(next === "compact" ? "Kompakte Ansicht" : "Angenehme Ansicht");
        } },
        { title: "Links exportieren", sub: "Als JSON-Datei",                       icon: "fa-solid fa-file-export",         kw: "export sichern backup", run: () => $("exportBtn").click() },
        { title: "Links importieren", sub: "Aus einer JSON-Datei",                 icon: "fa-solid fa-file-import",         kw: "import laden", run: () => $("importBtn").click() },
        { title: "Tastenkürzel anzeigen", sub: "",                                 icon: "fa-regular fa-keyboard",          kw: "hilfe kürzel shortcuts tastatur", run: () => openHelp() }
    ];

    // ── Dialoge einmal bauen ─────────────────────────────────────────────────
    const el = (tag, cls, ...kids) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...kids.filter(k => k != null)); return e; };
    const icon = cls => { const i = document.createElement("i"); i.className = cls; return i; };

    const dlg = el("dialog", "palette");
    dlg.setAttribute("aria-label", "Befehlspalette");
    const input = el("input", "pal-input");
    Object.entries({ type: "text", role: "combobox", "aria-expanded": "true", "aria-controls": "palList", "aria-autocomplete": "list",
                     autocomplete: "off", spellcheck: "false", placeholder: "Link suchen, Befehl ausführen oder im Web suchen …",
                     "aria-label": "Suche in der Befehlspalette" }).forEach(([k, v]) => input.setAttribute(k, v));
    const list = el("div", "pal-list");
    list.id = "palList"; list.setAttribute("role", "listbox");
    dlg.append(
        el("div", "pal-input-row", icon("fa-solid fa-bolt"), input, el("kbd", "", "Esc")),
        list,
        el("div", "pal-foot",
            el("span", "", el("kbd", "", "↑"), el("kbd", "", "↓"), "auswählen"),
            el("span", "", el("kbd", "", "↵"), "öffnen"),
            el("span", "", el("kbd", "", "g"), "Begriff = Google, ", el("kbd", "", "yt"), "YouTube …"),
            el("span", "", el("kbd", "", "?"), "Kürzel")));
    document.body.append(dlg);

    // ── Daten und Ranking ────────────────────────────────────────────────────
    let rows = [], active = 0, shown = [];

    function collect() {
        const clicks = new Map(learn.items().map(i => [i.url, i.n]));
        const seen = new Map();
        window.HeliumStorage.getMergedSilos().forEach(s => (s.links || []).forEach(l => {
            const prev = seen.get(l.url);
            // Favoriten-Kopien nicht doppelt zeigen, aber die Favoriten-Markierung behalten
            if (prev) { prev.fav = prev.fav || l.favorite === true; return; }
            let host = ""; try { host = new URL(l.url).hostname.replace(/^www\./, ""); } catch {}
            seen.set(l.url, { kind: "link", title: l.title, url: l.url, host, silo: s.title === "Favorites" ? "" : s.title,
                              tags: (l.tags || []).join(" "), icon: l.icon || "fa-solid fa-link", fav: l.favorite === true, clicks: clicks.get(l.url) || 0 });
        }));
        rows = [...seen.values()];
    }

    const boost = r => Math.min(24, r.clicks * 3) + (r.fav ? 6 : 0) + (Mode() && Mode().relevant(r.url) ? 8 : 0);

    function matchScore(r, tokens) {
        const t = r.title.toLowerCase(), h = r.host.toLowerCase(), g = r.tags.toLowerCase(), s = r.silo.toLowerCase();
        let total = 0;
        for (const tok of tokens) {
            let sc = 0;
            if (t.startsWith(tok)) sc = 100;
            else if (t.split(/[\s\-_.:/()&]+/).some(w => w.startsWith(tok))) sc = 80;
            else if (t.includes(tok)) sc = 60;
            else if (h.includes(tok)) sc = 45;
            else if (g.includes(tok)) sc = 30;
            else if (s.includes(tok)) sc = 20;
            else return -1;
            total += sc;
        }
        return total / tokens.length;
    }

    function build(q) {
        const query = q.trim(), tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        const out = [];

        if (!tokens.length) {
            const sug = [...rows].sort((a, b) => boost(b) - boost(a) || a.title.localeCompare(b.title)).slice(0, 7);
            out.push({ group: "Vorschläge", items: sug });
            out.push({ group: "Befehle", items: COMMANDS.slice(0, 5).map(c => ({ kind: "cmd", ...c })) });
            return out;
        }

        // Web-Kürzel: "yt katzen"
        const m = query.match(/^(\w+)\s+(.+)$/);
        const eng = m && ENGINES[m[1].toLowerCase()];
        const links = rows.map(r => ({ r, s: matchScore(r, tokens) })).filter(x => x.s >= 0)
            .sort((a, b) => (b.s + boost(b.r)) - (a.s + boost(a.r))).slice(0, 8).map(x => x.r);
        const cmds = COMMANDS.filter(c => tokens.every(t => (c.title + " " + c.kw).toLowerCase().includes(t))).slice(0, 4).map(c => ({ kind: "cmd", ...c }));
        const web = [];
        if (eng) web.push({ kind: "web", title: `${eng[0]}: ${m[2]}`, sub: "Im Web suchen", icon: eng[2], url: eng[1] + encodeURIComponent(m[2]) });
        web.push({ kind: "web", title: `Im Web suchen: ${query}`, sub: "Google", icon: "fa-brands fa-google", url: ENGINES.g[1] + encodeURIComponent(query) });

        if (links.length) out.push({ group: "Links", items: links });
        if (cmds.length) out.push({ group: "Befehle", items: cmds });
        out.push({ group: "Web", items: web });
        return out;
    }

    // ── Darstellung ──────────────────────────────────────────────────────────
    function highlight(text, tokens) {
        const frag = document.createDocumentFragment();
        const safe = tokens.filter(Boolean).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (!safe.length) { frag.append(text); return frag; }
        text.split(new RegExp(`(${safe.join("|")})`, "i")).forEach((part, i) => {
            if (i % 2) { const mk = document.createElement("mark"); mk.textContent = part; frag.append(mk); } else if (part) frag.append(part);
        });
        return frag;
    }

    function render() {
        const q = input.value, tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const groups = build(q);
        shown = groups.flatMap(g => g.items);
        active = Math.min(active, Math.max(0, shown.length - 1));
        list.replaceChildren();
        let idx = 0;

        groups.forEach(g => {
            list.append(el("div", "pal-group", g.group));
            g.items.forEach(it => {
                const i = idx++;
                const row = el("div", "pal-item" + (i === active ? " active" : ""));
                row.id = `pal-${i}`; row.setAttribute("role", "option"); row.setAttribute("aria-selected", String(i === active));
                row.style.setProperty("--i", Math.min(i, 10)); row.dataset.i = i;
                const title = el("div", "pal-title"); title.append(it.kind === "link" ? highlight(it.title, tokens) : it.title);
                const sub = it.kind === "link" ? it.host : it.sub;
                row.append(el("div", "pal-icon", icon(it.icon)), el("div", "pal-text", title, sub ? el("div", "pal-sub", sub) : null));
                if (it.kind === "link" && it.silo) row.append(el("span", "pal-tag", it.silo));
                row.append(el("span", "pal-enter", icon("fa-solid fa-arrow-turn-down fa-rotate-90")));
                list.append(row);
            });
        });

        if (!shown.length) list.append(el("div", "pal-empty", "Nichts gefunden."));
        input.setAttribute("aria-activedescendant", shown.length ? `pal-${active}` : "");
    }

    function setActive(i, scroll) {
        if (!shown.length) return;
        active = (i + shown.length) % shown.length;
        list.querySelectorAll(".pal-item").forEach(r => {
            const on = Number(r.dataset.i) === active;
            r.classList.toggle("active", on); r.setAttribute("aria-selected", String(on));
            if (on && scroll) r.scrollIntoView({ block: "nearest" });
        });
        input.setAttribute("aria-activedescendant", `pal-${active}`);
    }

    function choose(i) {
        const it = shown[i];
        if (!it) return;
        dlg.close();
        if (it.kind === "cmd") { setTimeout(it.run, 120); return; }   // erst der Dialog, dann die Aktion
        if (it.kind === "link") learn.record(it.url, it.title, Mode() ? Mode().groupOfUrl(it.url) : "both");
        window.open(it.url, "_blank", "noopener");
    }

    let lastFocus = null;
    // Nach dem Schließen gehört der Fokus wieder dorthin, wo er vorher war (nie im versteckten Eingabefeld)
    dlg.addEventListener("close", () => {
        input.blur();
        if (lastFocus && lastFocus.isConnected && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
        lastFocus = null;
    });

    function openPalette() {
        lastFocus = document.activeElement;
        collect(); input.value = ""; active = 0; render();
        if (!dlg.open) dlg.showModal();
        input.focus();
    }

    input.addEventListener("input", () => { active = 0; render(); });
    input.addEventListener("keydown", e => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1, true); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1, true); }
        else if (e.key === "Home") { e.preventDefault(); setActive(0, true); }
        else if (e.key === "End") { e.preventDefault(); setActive(shown.length - 1, true); }
        else if (e.key === "Enter") { e.preventDefault(); choose(active); }
    });
    list.addEventListener("mousemove", e => { const r = e.target.closest(".pal-item"); if (r && Number(r.dataset.i) !== active) setActive(Number(r.dataset.i), false); });
    list.addEventListener("click", e => { const r = e.target.closest(".pal-item"); if (r) choose(Number(r.dataset.i)); });
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    $("paletteBtn").addEventListener("click", openPalette);

    // ── Hilfe ────────────────────────────────────────────────────────────────
    const help = el("dialog", "link-modal");
    help.setAttribute("aria-labelledby", "helpTitle");
    const rowsHelp = [
        [["Strg", "K"], "Befehlspalette: springen, Befehle, Web-Suche"],
        [["/"], "Links in der Seite filtern"],
        [["M"], "Modus wechseln (Auto, Work, Freizeit, Alle)"],
        [["E"], "Bearbeiten ein- oder ausschalten"],
        [["N"], "Notizen ein- oder ausblenden"],
        [["?"], "Diese Hilfe"],
        [["Esc"], "Schließen oder Filter leeren"]
    ];
    const title = el("h2", "modal-heading", "Tastenkürzel"); title.id = "helpTitle";
    const closeBtn = el("button", "btn-primary", "Verstanden"); closeBtn.type = "button";
    closeBtn.addEventListener("click", () => help.close());
    help.append(title,
        el("div", "help-list", ...rowsHelp.map(([keys, text]) =>
            el("div", "help-row", el("span", "", text), el("span", "help-keys", ...keys.map(k => el("kbd", "", k)))))),
        el("p", "hint", "Im Suchfeld: „g Begriff“ sucht bei Google, „yt“, „gh“, „ddg“, „mdn“, „wp“, „npm“ und „so“ gehen auch."),
        el("div", "modal-actions", closeBtn));
    help.addEventListener("click", e => { if (e.target === help) help.close(); });
    document.body.append(help);
    function openHelp() { if (!help.open) help.showModal(); }
    $("helpBtn").addEventListener("click", openHelp);

    // ── Globale Tasten ───────────────────────────────────────────────────────
    document.addEventListener("keydown", e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            if (dlg.open) dlg.close(); else if (!document.querySelector("dialog[open]")) openPalette();
            return;
        }
        const t = document.activeElement.tagName;
        if (e.ctrlKey || e.metaKey || e.altKey || t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || document.querySelector("dialog[open]")) return;
        if (e.key === "?") { e.preventDefault(); openHelp(); }
        else if (e.key === "e") $("editModeBtn").click();
        else if (e.key === "n") { e.preventDefault(); $("notesToggle").click(); }
    });
})();
