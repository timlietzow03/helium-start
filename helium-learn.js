/**
 * HeliumLearn: lokale Einstellungen und gelernte Klicks für den Tageszeit-Modus.
 * Gespeichert wird nur URL, Titel, Zähler je Stunde und Zeitpunkt des letzten Klicks, in diesem Browser.
 */
window.HeliumLearn = (function () {
    const K = { clicks: "helium_clicks_v1", prefs: "helium_prefs_v1" };
    const MAX_ITEMS = 300;
    const DEFAULT_PREFS = { name: "Tim", start: 8, end: 17, weekend: false, density: "comfortable" };

    function load(key, fallback) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    // ── Einstellungen ────────────────────────────────────────────────────────
    /** groups: eigene Zuordnung je Kategorie, { "Gaming": "private", … } */
    function prefs() {
        const p = load(K.prefs, {});
        return { ...DEFAULT_PREFS, ...p, groups: p.groups || {} };
    }
    function setPrefs(patch) { save(K.prefs, { ...prefs(), ...patch }); }

    function setGroup(title, group) {
        const groups = { ...prefs().groups };
        if (group) groups[title] = group; else delete groups[title];
        setPrefs({ groups });
    }

    // ── Gelernte Klicks ──────────────────────────────────────────────────────
    function record(url, title, group) {
        if (!url) return;
        const d = load(K.clicks, { items: {} });
        const it = d.items[url] || { t: title, n: 0, h: Array(24).fill(0), g: group || "both", last: 0 };
        it.n++;
        it.h[new Date().getHours()]++;
        it.last = Date.now();
        it.t = title || it.t;
        if (group) it.g = group;
        d.items[url] = it;

        const keys = Object.keys(d.items);
        if (keys.length > MAX_ITEMS) {
            keys.sort((a, b) => d.items[a].last - d.items[b].last)
                .slice(0, keys.length - MAX_ITEMS).forEach(k => delete d.items[k]);
        }
        save(K.clicks, d);
    }

    function items() {
        const d = load(K.clicks, { items: {} });
        return Object.entries(d.items).map(([url, it]) => ({ url, title: it.t, n: it.n, hours: it.h, group: it.g, last: it.last }));
    }

    function total() { return items().reduce((s, i) => s + i.n, 0); }

    /** Klicks je Stunde, getrennt nach Work und Freizeit (Links ohne klare Zuordnung zählen nicht). */
    function groupHours() {
        const out = { work: Array(24).fill(0), private: Array(24).fill(0) };
        items().forEach(i => { if (out[i.group]) i.hours.forEach((n, h) => { out[i.group][h] += n; }); });
        return out;
    }

    function clearClicks() { try { localStorage.removeItem(K.clicks); } catch {} }

    return { prefs, setPrefs, setGroup, record, items, total, groupHours, clearClicks };
})();
