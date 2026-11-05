/**
 * Tageszeit-Modus für Helium Start.
 *  - Phase (Morgen/Tag/Abend/Nacht) färbt den Hintergrund und bestimmt die Begrüßung.
 *  - Modus (Work/Freizeit) sortiert die passenden Kategorien nach vorne und klappt die anderen ein.
 *  - Auto-Modus: Arbeitszeit-Erwartung, gemischt mit deinem Verlauf und deinen Klicks in Helium (Insights.modeAt).
 *  - Einstellungen, eigene Zuordnung je Kategorie und gelernte Klicks liegen in HeliumLearn.
 * Greift nur über CSS-order, Klassen und Attribute ein; app.js bleibt unverändert.
 */
(function () {
    const KEY = "helium_mode";

    const $ = id => document.getElementById(id);
    const silosEl  = $("silos");
    const quickBar = $("quickBar");
    const switchEl = $("modeSwitch");
    const learn    = window.HeliumLearn;
    if (!silosEl || !switchEl || !window.Insights || !learn) return;

    const I = window.Insights;
    const A = I.aggregate(window.HISTORY_SNAPSHOT ? I.loadData(window.HISTORY_SNAPSHOT).rows : []);

    // Welche Helium-Kategorien zu Work oder Freizeit gehören. Alles andere wird aus den Links abgeleitet,
    // und eigene Zuordnungen (Bearbeiten-Modus) haben Vorrang.
    const GROUP_BY_TITLE = {
        "Favorites": "both",
        "Research & Papers": "work", "Development": "work", "Design": "work", "AI Tools": "work", "Learning": "work",
        "Google Sheets": "work", "School & Mail": "work", "Work & Ops": "work", "Domains & Hosting": "work",
        "Shopping & Style": "private", "Events & Places": "private", "Communities & Social": "private",
        "Media & Streaming": "private", "Gaming": "private", "Eigene Projekte": "private"
    };

    const LABEL = { work: "Work", private: "Freizeit", all: "Alles", both: "Beides" };
    const GROUP_ICON = { auto: "fa-wand-magic-sparkles", work: "fa-briefcase", private: "fa-couch", both: "fa-layer-group" };
    const PHASES = [
        { id: "morning", from: 5,  emoji: "☀️", hello: "Guten Morgen" },
        { id: "day",     from: 11, emoji: "🌤️", hello: "Guten Tag" },
        { id: "evening", from: 17, emoji: "🌆", hello: "Guten Abend" },
        { id: "night",   from: 22, emoji: "🌙", hello: "Noch wach" }
    ];
    const phaseOf = h => (h < 5 ? PHASES[3] : [...PHASES].reverse().find(p => h >= p.from));

    let pref = "auto";
    try { pref = localStorage.getItem(KEY) || "auto"; } catch {}
    let manualLock = false;   // nach "Collapse/Expand all" lassen wir das Ein-/Ausklappen in Ruhe
    let lastKey = "", lastMode = null;
    let urlGroups = new Map();

    const isEditing = () => $("editModeBtn").classList.contains("active");
    const isSearching = () => $("searchInput").value.trim() !== "";

    // ── Gruppe einer Kategorie ───────────────────────────────────────────────
    const guessCache = new Map();
    function groupOf(title) {
        const own = learn.prefs().groups[title];
        if (own) return own;
        if (GROUP_BY_TITLE[title]) return GROUP_BY_TITLE[title];
        if (guessCache.has(title)) return guessCache.get(title);
        // Unbekannte Kategorie: Mehrheit der Link-Dienste entscheidet
        const silo = window.HeliumStorage.getMergedSilos().find(s => s.title === title);
        const votes = { work: 0, private: 0 };
        ((silo && silo.links) || []).forEach(l => {
            let host = ""; try { host = new URL(l.url).hostname; } catch {}
            const g = I.CAT_GROUP[I.serviceOf(host).cat];
            if (g) votes[g]++;
        });
        const g = votes.work === votes.private ? "both" : votes.work > votes.private ? "work" : "private";
        guessCache.set(title, g);
        return g;
    }

    function buildUrlGroups() {
        urlGroups = new Map();
        window.HeliumStorage.getMergedSilos().forEach(s => {
            if (s.title === "Favorites") return;
            const g = groupOf(s.title);
            (s.links || []).forEach(l => {
                const prev = urlGroups.get(l.url);
                urlGroups.set(l.url, prev && prev !== g ? "both" : g);
            });
        });
    }

    // ── Aktuellen Modus bestimmen ────────────────────────────────────────────
    function current() {
        const now = new Date(), h = now.getHours();
        if (pref !== "auto") return { mode: pref, hour: h, why: "Manuell gewählt (Auto: Taste M)" };
        const clicks = learn.groupHours(), total = learn.total();
        const m = I.modeAt(A, h, now.getDay(), { sched: learn.prefs(), clicks });
        const pct = x => Math.round(100 * x) + " %";
        return { mode: m.mode, hour: h,
                 why: `Auto: ${pct(m.share)} Work-Anteil (Erwartung ${pct(m.prior)}${m.data == null ? "" : `, Verlauf und Klicks ${pct(m.data)}`})`
                      + (total ? ` · ${total} ${total === 1 ? "Klick" : "Klicks"} gelernt` : "") };
    }

    // ── Anwenden ─────────────────────────────────────────────────────────────
    function decorateEditButtons() {
        silosEl.querySelectorAll(".silo").forEach(silo => {
            const title = silo.dataset.siloTitle, right = silo.querySelector(".silo-header-right");
            if (!right || title === "Favorites" || right.querySelector(".group-btn")) return;
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "group-btn";
            const paint = () => {
                const own = learn.prefs().groups[title] || "auto";
                btn.replaceChildren(Object.assign(document.createElement("i"), { className: `fa-solid ${GROUP_ICON[own]}` }),
                                    ` ${own === "auto" ? `Auto: ${LABEL[groupOf(title)]}` : LABEL[own]}`);
                btn.title = "Zuordnung für den Tageszeit-Modus ändern (Auto, Work, Freizeit, Beides)";
            };
            paint();
            btn.addEventListener("click", e => {
                e.stopPropagation();
                const order = ["auto", "work", "private", "both"];
                const own = learn.prefs().groups[title] || "auto";
                const next = order[(order.indexOf(own) + 1) % order.length];
                learn.setGroup(title, next === "auto" ? null : next);
                paint(); apply(true);
            });
            right.prepend(btn);
        });
    }

    function applySilos(mode, paused) {
        silosEl.querySelectorAll(".silo").forEach(silo => {
            const title = silo.dataset.siloTitle, g = groupOf(title);
            const inMode = mode === "all" || g === "both" || g === mode;
            silo.style.order = paused ? "" : (title === "Favorites" ? 0 : inMode ? 1 : 2);
            const off = !paused && !inMode;
            silo.classList.toggle("off-mode", off);
            if (paused || manualLock) return;

            const btn = silo.querySelector(".silo-collapse-btn");
            if (off && !silo.classList.contains("collapsed")) {
                silo.classList.add("collapsed", "auto-collapsed");
                btn.setAttribute("aria-expanded", "false");
            } else if (!off && silo.classList.contains("auto-collapsed")) {
                // Nur zurückklappen, wenn nicht von dir selbst eingeklappt
                const mine = window.HeliumStorage.getCollapse()[title] === true;
                silo.classList.remove("auto-collapsed");
                if (!mine) { silo.classList.remove("collapsed"); btn.setAttribute("aria-expanded", "true"); }
            }
        });
        if (isEditing()) decorateEditButtons();
    }

    function applyQuickBar(mode) {
        quickBar.querySelectorAll(".qb-link").forEach(a => {
            const g = urlGroups.get(a.getAttribute("href")) || "both";
            const inMode = mode === "all" || g === "both" || g === mode;
            a.style.order = inMode ? 0 : 1;
            a.classList.toggle("off-mode", !inMode);
        });
    }

    function apply(force) {
        const c = current(), ph = phaseOf(c.hour), searching = isSearching(), editing = isEditing();
        const key = [c.mode, ph.id, c.hour, searching, editing].join("|");
        if (!force && key === lastKey) return;
        lastKey = key;

        buildUrlGroups();
        document.body.dataset.phase = ph.id;
        const tagline = c.mode === "work" ? "Work-Links zuerst" : c.mode === "private" ? "Freizeit zuerst" : "alles im Blick";
        const late = c.hour >= 1 && c.hour < 5 ? " (es ist spät)" : "";
        const name = learn.prefs().name;
        document.body.dataset.density = learn.prefs().density;
        UIKit.swapText($("greeting"), `${ph.emoji} ${ph.hello}${name ? ", " + name : ""}${late} · ${tagline}`);
        UIKit.swapText($("modeWhy"), c.why);
        switchEl.querySelectorAll("button").forEach(b => {
            const on = b.dataset.mode === pref;
            b.classList.toggle("active", on);
            b.setAttribute("aria-pressed", String(on));
        });

        applySilos(c.mode, searching || editing);
        applyQuickBar(c.mode);
        if (window.HeliumUsage) window.HeliumUsage.render({ mode: c.mode, hour: c.hour });

        // Wechselt Auto von selbst (z. B. um 17 Uhr), sagen wir es und bieten Rückgängig an
        if (!force && pref === "auto" && lastMode && lastMode !== c.mode) {
            const prev = lastMode;
            UIKit.toast(`Es ist ${c.hour} Uhr: Wechsel auf ${LABEL[c.mode]}.`, { action: `Bei ${LABEL[prev]} bleiben`, onAction: () => setPref(prev), timeout: 9000 });
        }
        lastMode = c.mode;
    }

    function setPref(p) {
        pref = p; manualLock = false;
        try { localStorage.setItem(KEY, p); } catch {}
        apply(true);
    }

    // ── Klicks lernen ────────────────────────────────────────────────────────
    function groupOfLink(a) {
        const g = urlGroups.get(a.getAttribute("href"));
        if (g) return g;
        let host = ""; try { host = new URL(a.href).hostname; } catch {}
        return I.CAT_GROUP[I.serviceOf(host).cat] || "both";
    }
    function onLinkClick(e) {
        const a = e.target.closest("a.link-card, a.qb-link");
        if (!a || a.classList.contains("edit-mode-card") || (e.type === "auxclick" && e.button !== 1)) return;
        const title = (a.querySelector(".link-title") || a).textContent.trim();
        learn.record(a.href, title, groupOfLink(a));
    }
    document.addEventListener("click", onLinkClick, true);
    document.addEventListener("auxclick", onLinkClick, true);

    // ── Einstellungen ────────────────────────────────────────────────────────
    const dlg = $("prefsModal");
    function openPrefs() {
        const p = learn.prefs();
        $("prefName").value = p.name;
        $("prefStart").value = p.start;
        $("prefEnd").value = p.end;
        $("prefWeekend").checked = p.weekend;
        $("prefDensity").value = p.density;
        $("prefLearned").textContent = `${learn.total()} ${learn.total() === 1 ? "Klick" : "Klicks"} gelernt`;
        $("prefMsg").textContent = "";
        dlg.showModal();
    }
    $("prefsBtn").addEventListener("click", openPrefs);
    $("prefCancel").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
    $("prefSave").addEventListener("click", () => {
        const start = Number($("prefStart").value), end = Number($("prefEnd").value);
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > 24 || start >= end) {
            $("prefMsg").textContent = "Arbeitszeit: Start 0–23, Ende bis 24, und Start vor Ende.";
            return;
        }
        learn.setPrefs({ name: $("prefName").value.trim().slice(0, 24), start, end, weekend: $("prefWeekend").checked, density: $("prefDensity").value });
        dlg.close(); apply(true);
    });
    $("prefForget").addEventListener("click", () => {
        learn.clearClicks();
        $("prefLearned").textContent = "0 Klicks gelernt";
        apply(true);
    });

    // ── Events ───────────────────────────────────────────────────────────────
    switchEl.addEventListener("click", e => {
        const b = e.target.closest("button[data-mode]");
        if (b) setPref(b.dataset.mode);
    });

    // "m" wechselt den Modus, solange nicht getippt wird
    document.addEventListener("keydown", e => {
        const t = document.activeElement.tagName;
        if (e.key !== "m" || e.ctrlKey || e.metaKey || e.altKey || t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || document.querySelector("dialog[open]")) return;
        window.HeliumMode.cycle();
    });

    $("toggleAllBtn").addEventListener("click", () => { manualLock = true; });
    $("searchInput").addEventListener("input", () => apply(true));
    $("editModeBtn").addEventListener("click", () => setTimeout(() => apply(true), 0));

    // app.js baut die Kategorien bei Suche, Bearbeiten und Import neu auf
    new MutationObserver(() => applySilos(current().mode, isSearching() || isEditing())).observe(silosEl, { childList: true });
    new MutationObserver(() => applyQuickBar(current().mode)).observe(quickBar, { childList: true });

    window.HeliumMode = {
        setPref, openPrefs,
        cycle() { const o = ["auto", "work", "private", "all"]; setPref(o[(o.indexOf(pref) + 1) % o.length]); },
        pref: () => pref,
        current: () => current().mode,
        groupOfUrl: url => urlGroups.get(url) || "both",
        relevant: url => { const m = current().mode, g = urlGroups.get(url) || "both"; return m === "all" || g === "both" || g === m; }
    };

    apply(true);
    setInterval(() => apply(false), 60 * 1000);   // Stunden- und Phasenwechsel mitnehmen
})();
