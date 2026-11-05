/**
 * Streifen unter den Favoriten: Dienste, die du um diese Uhrzeit erfahrungsgemäß öffnest.
 * Quellen: Verlauf (eingelesen oder Snapshot) und die Klicks, die Helium Start selbst mitzählt.
 * time-mode.js ruft render() auf.
 */
window.HeliumUsage = (function () {
    const bar = document.getElementById("usageBar");
    if (!bar || !window.Insights || !window.HISTORY_SNAPSHOT) return { render() {} };

    const I = window.Insights;
    const A = I.aggregate(I.loadData(window.HISTORY_SNAPSHOT).rows);
    const SKIP = new Set(["accounts", "search", "other", "start"]);
    const hostOf = u => { try { return I.stripWww(new URL(u).hostname); } catch { return ""; } };

    /** Alle Kandidaten je Host: Verlaufsdienste plus per Klick gelernte Links. */
    function candidates() {
        // Was schon als Favorit in der Schnellleiste liegt, muss hier nicht noch einmal stehen
        const pinned = new Set([...document.querySelectorAll("#quickBar a")].map(a => hostOf(a.href)));
        const byHost = new Map();

        [...A.services.values()].filter(s => s.url && !SKIP.has(s.cat)).forEach(s => {
            byHost.set(hostOf(s.url), { name: s.name, url: s.url, fav: s.fav, group: I.CAT_GROUP[s.cat] || "both",
                                        hist: s.hours, days: s.days.size, n: s.n, clk: Array(24).fill(0), clicks: 0 });
        });
        if (window.HeliumLearn) {
            window.HeliumLearn.items().forEach(it => {
                const h = hostOf(it.url);
                if (!h) return;
                let c = byHost.get(h);
                if (!c) {
                    c = { name: it.title, url: it.url, fav: h, group: it.group || "both", hist: Array(24).fill(0), days: 0, n: 0,
                          clk: Array(24).fill(0), clicks: 0 };
                    byHost.set(h, c);
                }
                it.hours.forEach((n, i) => { c.clk[i] += n; });
                c.clicks += it.n;
            });
        }
        return [...byHost].filter(([h]) => !pinned.has(h)).map(([, c]) => c);
    }

    /**
     * Wie typisch ist der Dienst für diese Uhrzeit? Verlauf in der Stunde und den Nachbarstunden,
     * gedeckelt (ein einmaliger Ausreißer soll nicht gewinnen) und mit Bonus für mehrere Tage.
     * Eigene Klicks in Helium wiegen schwerer.
     */
    const near = (arr, h) => arr[(h + 23) % 24] + arr[h] + arr[(h + 1) % 24];
    const score = (c, h) => Math.min(15, near(c.hist, h)) * (1 + 0.5 * Math.max(0, c.days - 1)) + 4 * near(c.clk, h);

    function chip(c) {
        const a = document.createElement("a");
        a.className = "qb-link";
        a.href = c.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.title = [c.n ? `${c.n} Aufrufe im Verlauf` : "", c.clicks ? `${c.clicks}× über Helium geöffnet` : ""].filter(Boolean).join(" · ");
        if (c.fav) {
            const img = document.createElement("img");
            img.className = "usage-fav";
            img.alt = "";
            img.loading = "lazy";
            img.referrerPolicy = "no-referrer";
            img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(c.fav)}&sz=32`;
            img.addEventListener("error", () => img.remove());
            a.append(img);
        }
        a.append(document.createTextNode(c.name));
        return a;
    }

    /** mode: "work" | "private" | "all", hour: 0..23 */
    function render({ mode = "all", hour = new Date().getHours() } = {}) {
        const list = candidates()
            .filter(c => mode === "all" || c.group === "both" || c.group === mode)
            .map(c => ({ c, s: score(c, hour) }))
            .sort((a, b) => b.s - a.s || b.c.days - a.c.days || b.c.n - a.c.n)
            .slice(0, 8).map(x => x.c);
        if (!list.length) { bar.hidden = true; return; }

        const label = document.createElement("a");
        label.className = "usage-label";
        label.href = "./insights.html";
        label.title = "Zur Auswertung";
        const icon = document.createElement("i");
        icon.className = "fa-solid fa-clock-rotate-left";
        label.append(icon, ` Typisch um ${String(hour).padStart(2, "0")} Uhr`);

        bar.replaceChildren(label, ...list.map(chip));
        bar.hidden = false;
    }

    render();
    return { render };
})();
