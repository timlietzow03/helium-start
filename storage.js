/**
 * HeliumStorage — centralised localStorage layer.
 * All reads/writes go through here so app.js stays clean.
 */
window.HeliumStorage = (function () {
    const KEYS = {
        collapse: "helium_collapse",
        notes:    "helium_notes",
        overlay:  "helium_overlay"
    };

    // ── Helpers ──────────────────────────────────────────────────────────────

    function load(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw !== null ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }

    /**
     * Deterministic stable ID for a link (djb2 hash of "title|url").
     * Same title+url always produces the same ID across page loads.
     */
    function linkId(link) {
        const str = (link.title || "") + "|" + (link.url || "");
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h) + str.charCodeAt(i);
            h = h & h; // keep 32-bit
        }
        return "l" + (h >>> 0).toString(36);
    }

    // ── Overlay merge ────────────────────────────────────────────────────────

    /**
     * Returns the fully-merged silo array:
     *   base data  →  apply deletions  →  apply edits  →  append additions
     *
     * If the overlay contains _fullReplace (set by importAll), that array is
     * used as the base instead of window.LINK_SILOS.
     */
    function getMergedSilos() {
        const overlay   = load(KEYS.overlay, { added: [], edited: {}, deleted: [] });
        const base      = overlay._fullReplace
            || (Array.isArray(window.LINK_SILOS) ? window.LINK_SILOS : []);

        // Deep-copy and stamp every link with a stable _id
        const silos = base.map(silo => ({
            ...silo,
            links: (silo.links || []).map(link => ({ ...link, _id: linkId(link) }))
        }));

        const deletedSet = new Set(overlay.deleted || []);
        const edited     = overlay.edited || {};

        silos.forEach(silo => {
            silo.links = silo.links
                .filter(l => !deletedSet.has(l._id))
                .map(l => edited[l._id] ? { ...l, ...edited[l._id], _id: l._id } : l);
        });

        // Append user-added links to their target silo (or create a new one)
        (overlay.added || []).forEach(link => {
            const target = silos.find(s => s.title === link._siloTitle);
            if (target) {
                target.links.push({ ...link });
            } else {
                silos.push({
                    title: link._siloTitle || "Custom",
                    icon:  "fa-solid fa-folder",
                    links: [{ ...link }]
                });
            }
        });

        return silos;
    }

    // ── Export / Import ──────────────────────────────────────────────────────

    /** Returns a clean JSON string (strips internal _id / _siloTitle fields). */
    function exportAll() {
        return JSON.stringify(
            getMergedSilos().map(silo => ({
                title: silo.title,
                icon:  silo.icon,
                ...(silo.color && { color: silo.color }),
                links: silo.links.map(({ _id, _siloTitle, ...rest }) => rest)
            })),
            null, 2
        );
    }

    /**
     * Replaces all data with the imported JSON.
     * Validates basic shape; throws on malformed input.
     */
    function importAll(jsonStr) {
        const data = JSON.parse(jsonStr);
        if (!Array.isArray(data)) throw new Error("Expected an array of categories");
        data.forEach((s, i) => {
            if (typeof s.title !== "string")
                throw new Error(`Category ${i} is missing a title`);
            if (!Array.isArray(s.links))
                throw new Error(`Category "${s.title}" is missing a links array`);
            s.links.forEach((l, j) => {
                if (typeof l.title !== "string" || typeof l.url !== "string")
                    throw new Error(`Link ${j} in "${s.title}" must have title and url`);
            });
        });
        // Store as full replacement; clears all previous overlay deltas
        save(KEYS.overlay, { added: [], edited: {}, deleted: [], _fullReplace: data });
    }

    // ── Public API ───────────────────────────────────────────────────────────

    return {
        getCollapse: ()    => load(KEYS.collapse, {}),
        setCollapse: (map) => save(KEYS.collapse, map),
        getNotes:    ()    => load(KEYS.notes, ""),
        setNotes:    (str) => save(KEYS.notes, str),
        getOverlay:  ()    => load(KEYS.overlay, { added: [], edited: {}, deleted: [] }),
        setOverlay:  (data)=> save(KEYS.overlay, data),
        getMergedSilos,
        exportAll,
        importAll,
        linkId
    };
})();
