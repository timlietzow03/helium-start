(function () {
    // ── DOM refs ─────────────────────────────────────────────────────────────
    const siloContainer = document.getElementById("silos");
    const statsEl       = document.getElementById("stats");
    const searchInput   = document.getElementById("searchInput");
    const toggleAllBtn  = document.getElementById("toggleAllBtn");
    const siloTmpl      = document.getElementById("siloTemplate");
    const linkTmpl      = document.getElementById("linkTemplate");
    const quickBar      = document.getElementById("quickBar");
    const clockEl       = document.getElementById("clock");
    const notesToggle   = document.getElementById("notesToggle");
    const notesWidget   = document.getElementById("notesWidget");
    const notesArea     = document.getElementById("notesArea");
    const editModeBtn   = document.getElementById("editModeBtn");
    const exportBtn     = document.getElementById("exportBtn");
    const importBtn     = document.getElementById("importBtn");
    const importFile    = document.getElementById("importFileInput");
    const linkModal     = document.getElementById("linkModal");

    // ── Mutable state ────────────────────────────────────────────────────────
    let allCollapsed   = false;
    let editMode       = false;
    let collapseState  = window.HeliumStorage.getCollapse();
    let displaySilos   = [];
    let totalLinkCount = 0;

    // ── Search engine shortcuts ──────────────────────────────────────────────
    const SEARCH_ENGINES = {
        g:   "https://www.google.com/search?q=",
        yt:  "https://www.youtube.com/results?search_query=",
        gh:  "https://github.com/search?q=",
        ddg: "https://duckduckgo.com/?q=",
        mdn: "https://developer.mozilla.org/search?q=",
        wp:  "https://en.wikipedia.org/w/index.php?search=",
        npm: "https://www.npmjs.com/search?q=",
        so:  "https://stackoverflow.com/search?q="
    };

    // ── Utilities ────────────────────────────────────────────────────────────
    function debounce(fn, delay) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    function hostnameOf(url) {
        try { return new URL(url).hostname.replace(/^www\./, ""); }
        catch { return ""; }
    }

    function normalize(s) { return String(s || "").toLowerCase(); }

    function sortLinks(links) {
        return [...links].sort((a, b) => a.title.localeCompare(b.title));
    }

    // ── Data layer ───────────────────────────────────────────────────────────
    function refreshDisplaySilos() {
        const source = window.HeliumStorage.getMergedSilos();
        totalLinkCount = source.reduce((n, s) => n + (s.links || []).length, 0);

        const silos    = source.map(s => ({ ...s, links: sortLinks(s.links || []) }));
        const allLinks = silos.flatMap(s => s.links || []);
        const favorites = sortLinks(allLinks.filter(l => l.favorite === true));

        const priorityTitles = ["School & Mail"];
        const pri = t => { const i = priorityTitles.indexOf(t); return i < 0 ? Infinity : i; };

        const sorted = [...silos].sort((a, b) => {
            const d = pri(a.title) - pri(b.title);
            return d !== 0 ? d : a.title.localeCompare(b.title);
        });

        displaySilos = favorites.length
            ? [{ title: "Favorites", icon: "fa-solid fa-star", links: favorites }, ...sorted]
            : sorted;
    }

    // ── Feature 1: Live clock ────────────────────────────────────────────────
    function startClock() {
        function tick() {
            const now   = new Date();
            const time  = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
            const date  = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
            const small = document.createElement("small");
            small.textContent = date;
            clockEl.replaceChildren(time, small);
        }
        tick();
        setInterval(tick, 15000);
    }

    // ── Feature 5: Pinned quick bar ──────────────────────────────────────────
    function renderQuickBar() {
        quickBar.replaceChildren();
        const fav = displaySilos.find(s => s.title === "Favorites");
        if (!fav || !fav.links.length) { quickBar.hidden = true; return; }
        quickBar.hidden = false;

        fav.links.forEach(link => {
            const a    = document.createElement("a");
            const icon = document.createElement("i");
            const span = document.createElement("span");
            a.className      = "qb-link";
            a.href           = link.url;
            a.target         = "_blank";
            a.rel            = "noopener noreferrer";
            icon.className   = link.icon || "fa-solid fa-link";
            span.textContent = link.title;
            a.append(icon, span);
            quickBar.appendChild(a);
        });
    }

    // ── Main render ──────────────────────────────────────────────────────────
    function render(filterValue = "") {
        const query = normalize(filterValue).trim();
        siloContainer.replaceChildren();

        let renderedSilos = 0;
        let renderedLinks = 0;

        displaySilos.forEach(silo => {
            const links = (silo.links || []).filter(link => {
                if (!query) return true;
                const hay = [silo.title, link.title, link.url, ...(link.tags || [])]
                    .map(normalize).join(" ");
                return hay.includes(query);
            });
            if (!links.length) return;

            const siloNode    = siloTmpl.content.firstElementChild.cloneNode(true);
            const collapseBtn = siloNode.querySelector(".silo-collapse-btn");
            const titleEl     = siloNode.querySelector(".silo-title");
            const iconEl      = siloNode.querySelector(".silo-icon");
            const metaEl      = siloNode.querySelector(".silo-meta");
            const openAllBtn  = siloNode.querySelector(".open-all-btn");
            const linksWrap   = siloNode.querySelector(".silo-links");

            siloNode.dataset.siloTitle = silo.title;
            titleEl.textContent  = silo.title;
            iconEl.className     = `silo-icon ${silo.icon || "fa-solid fa-folder"}`;
            metaEl.textContent   = String(links.length);

            // Feature 7: color accent
            if (silo.color) {
                siloNode.style.setProperty("--silo-accent", silo.color);
                siloNode.classList.add("has-accent");
            }

            // Feature 4: open all (direct listener avoids stale closure issues)
            openAllBtn.addEventListener("click", () => {
                linksWrap.querySelectorAll(".link-card").forEach(a => window.open(a.href, "_blank"));
            });

            links.forEach(link => {
                const linkNode  = linkTmpl.content.firstElementChild.cloneNode(true);
                const icon      = linkNode.querySelector(".link-icon");
                const titleSpan = linkNode.querySelector(".link-title");
                const host      = linkNode.querySelector(".link-host");
                const tagsWrap  = linkNode.querySelector(".link-tags");

                linkNode.href           = link.url;
                linkNode.dataset.linkId = link._id || "";
                titleSpan.textContent   = link.title;
                host.textContent        = hostnameOf(link.url);
                icon.className          = `link-icon ${link.icon || "fa-solid fa-link"}`;

                if (link.favorite === true && silo.title !== "Favorites") {
                    linkNode.classList.add("favorite-link");
                }

                // Feature 3: tag pills
                (link.tags || []).forEach(tag => {
                    const btn       = document.createElement("button");
                    btn.className   = "tag-pill";
                    btn.type        = "button";
                    btn.dataset.tag = tag;
                    btn.textContent = tag;
                    tagsWrap.appendChild(btn);
                });

                // Feature 8: edit button overlay (edit mode only)
                if (editMode) {
                    const editBtn               = document.createElement("button");
                    editBtn.className           = "link-edit-btn";
                    editBtn.type                = "button";
                    editBtn.title               = "Link bearbeiten";
                    editBtn.dataset.linkId      = link._id || "";
                    editBtn.dataset.siloTitle   = silo.title;
                    editBtn.innerHTML           = '<i class="fa-solid fa-pen-to-square"></i>';
                    linkNode.classList.add("edit-mode-card");
                    linkNode.appendChild(editBtn);
                }

                linksWrap.appendChild(linkNode);
            });

            // Feature 8: "Add link" button at the bottom of each silo in edit mode
            if (editMode && silo.title !== "Favorites") {
                const addBtn               = document.createElement("button");
                addBtn.className           = "add-link-btn";
                addBtn.type                = "button";
                addBtn.dataset.siloTitle   = silo.title;
                addBtn.innerHTML           = '<i class="fa-solid fa-plus"></i> Link hinzufügen';
                linksWrap.appendChild(addBtn);
            }

            // Feature 2: collapse persistence
            const shouldCollapse = allCollapsed || collapseState[silo.title] === true;
            if (shouldCollapse) {
                siloNode.classList.add("collapsed");
                collapseBtn.setAttribute("aria-expanded", "false");
            }

            siloContainer.appendChild(siloNode);
            renderedSilos++;
            renderedLinks += links.length;
        });

        if (!renderedSilos) {
            const box = document.createElement("div");
            box.className = "empty-state";
            const ic = document.createElement("i");
            ic.className = "fa-solid fa-ghost es-icon";
            const h3 = document.createElement("h3");
            h3.textContent = query ? `Nichts zu „${filterValue.trim()}“ gefunden` : "Noch keine Links";
            const hint = document.createElement("p");
            hint.textContent = query
                ? "Mit Enter in der Suche wird nichts im Web gesucht. Nimm dafür ein Kürzel: g, yt, gh, ddg, mdn, wp, npm oder so, zum Beispiel „g " + filterValue.trim() + "“."
                : "Im Bearbeiten-Modus kannst du Links hinzufügen oder eine JSON-Datei importieren.";
            box.append(ic, h3, hint);
            siloContainer.appendChild(box);
        }

        const cats = renderedSilos !== 1 ? "Kategorien" : "Kategorie";
        statsEl.textContent = query
            ? `${renderedLinks} von ${totalLinkCount} Links in ${renderedSilos} ${cats}`
            : `${totalLinkCount} Links in ${renderedSilos} ${cats}`;
    }

    // ── Event delegation on siloContainer ───────────────────────────────────
    siloContainer.addEventListener("click", e => {
        // Feature 3: tag pill → set search filter
        const pill = e.target.closest(".tag-pill");
        if (pill) {
            searchInput.value = pill.dataset.tag;
            render(pill.dataset.tag);
            return;
        }

        // Feature 8: edit button → open modal
        const editBtn = e.target.closest(".link-edit-btn");
        if (editBtn) {
            e.preventDefault();
            openEditModal(editBtn.dataset.linkId, editBtn.dataset.siloTitle);
            return;
        }

        // Feature 8: add link button → open blank modal
        const addBtn = e.target.closest(".add-link-btn");
        if (addBtn) {
            openAddModal(addBtn.dataset.siloTitle);
            return;
        }

        // Feature 4: open-all is handled with a direct listener in render()
        if (e.target.closest(".open-all-btn")) return;

        // Feature 2: collapse toggle + persist state
        const collapseBtn = e.target.closest(".silo-collapse-btn");
        if (collapseBtn) {
            const siloNode  = collapseBtn.closest(".silo");
            const collapsed = siloNode.classList.toggle("collapsed");
            collapseBtn.setAttribute("aria-expanded", String(!collapsed));
            const title = siloNode.dataset.siloTitle;
            if (title) {
                collapseState[title] = collapsed;
                window.HeliumStorage.setCollapse(collapseState);
            }
        }
    });

    // ── Feature 6: Search shortcuts + debounced filter ───────────────────────
    const debouncedRender = debounce(render, 180);
    searchInput.addEventListener("input",   e => debouncedRender(e.target.value));
    searchInput.addEventListener("keydown", e => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const value = searchInput.value.trim();
        const m     = value.match(/^(\w+)\s+(.+)$/);
        if (m && SEARCH_ENGINES[m[1].toLowerCase()]) {
            window.open(SEARCH_ENGINES[m[1].toLowerCase()] + encodeURIComponent(m[2]), "_blank");
            searchInput.value = "";
            render();
        } else {
            render(searchInput.value);
        }
    });

    // Toggle-all
    toggleAllBtn.addEventListener("click", () => {
        allCollapsed = !allCollapsed;
        toggleAllBtn.textContent = allCollapsed ? "Alle ausklappen" : "Alle einklappen";
        render(searchInput.value);
    });

    // ── Global keyboard shortcuts ────────────────────────────────────────────
    document.addEventListener("keydown", e => {
        const active  = document.activeElement;
        const inInput = active.tagName === "INPUT" || active.tagName === "TEXTAREA";

        if (e.key === "/" && !inInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (e.key === "Escape") {
            if (active === searchInput) {
                searchInput.value = "";
                render();
                searchInput.blur();
            }
            if (linkModal.open) linkModal.close();
        }
    });

    // ── Feature 10: Quick notes ──────────────────────────────────────────────
    notesArea.value = window.HeliumStorage.getNotes();
    notesArea.addEventListener("input", debounce(
        () => window.HeliumStorage.setNotes(notesArea.value), 400
    ));
    notesToggle.addEventListener("click", () => {
        const open = notesWidget.classList.toggle("notes-open");
        notesToggle.setAttribute("aria-expanded", String(open));
        notesToggle.classList.toggle("active", open);
        if (open) notesArea.focus();
    });

    // ── Feature 8: Edit mode toggle ──────────────────────────────────────────
    editModeBtn.addEventListener("click", () => {
        editMode = !editMode;
        editModeBtn.textContent = editMode ? "Fertig" : "Bearbeiten";
        editModeBtn.classList.toggle("active", editMode);
        render(searchInput.value);
    });

    // ── Feature 9: Export ────────────────────────────────────────────────────
    exportBtn.addEventListener("click", () => {
        const blob = new Blob([window.HeliumStorage.exportAll()], { type: "application/json" });
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = "helium-links.json";
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // ── Feature 9: Import ────────────────────────────────────────────────────
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", () => {
        const file = importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                window.HeliumStorage.importAll(ev.target.result);
                refreshDisplaySilos();
                renderQuickBar();
                render(searchInput.value);
            } catch (err) {
                alert("Import fehlgeschlagen: " + err.message);
            } finally {
                importFile.value = "";
            }
        };
        reader.readAsText(file);
    });

    // ── Feature 8: Modal helpers ─────────────────────────────────────────────
    function populateModal(heading, id, siloTitle, link, isEdit) {
        document.getElementById("modalTitle").textContent          = heading;
        document.getElementById("modalLinkId").value               = id;
        document.getElementById("modalSiloTitle").value            = siloTitle;
        document.getElementById("modalSiloTitle").readOnly         = isEdit;
        document.getElementById("modalLinkTitle").value            = link.title   || "";
        document.getElementById("modalLinkUrl").value              = link.url     || "";
        document.getElementById("modalLinkIcon").value             = link.icon    || "";
        document.getElementById("modalLinkTags").value             = (link.tags || []).join(", ");
        document.getElementById("modalLinkFavorite").checked       = link.favorite === true;
        document.getElementById("modalDeleteBtn").style.display    = isEdit ? "" : "none";
        linkModal.showModal();
    }

    function openEditModal(linkId, siloTitle) {
        let found = null;
        for (const s of displaySilos) {
            found = (s.links || []).find(l => l._id === linkId);
            if (found) break;
        }
        if (!found) return;
        populateModal("Link bearbeiten", linkId, siloTitle, found, true);
    }

    function openAddModal(siloTitle) {
        populateModal("Link hinzufügen", "", siloTitle, {}, false);
    }

    function saveModal() {
        const title    = document.getElementById("modalLinkTitle").value.trim();
        const url      = document.getElementById("modalLinkUrl").value.trim();
        if (!title || !url) { alert("Titel und URL sind Pflichtfelder."); return; }

        const siloTitle = document.getElementById("modalSiloTitle").value.trim();
        const icon      = document.getElementById("modalLinkIcon").value.trim();
        const tags      = document.getElementById("modalLinkTags").value
            .split(",").map(t => t.trim()).filter(Boolean);
        const favorite  = document.getElementById("modalLinkFavorite").checked;
        const linkId    = document.getElementById("modalLinkId").value;
        const overlay   = window.HeliumStorage.getOverlay();

        if (linkId) {
            overlay.edited        = overlay.edited || {};
            overlay.edited[linkId] = {
                title, url,
                ...(icon  && { icon }),
                ...(tags.length && { tags }),
                favorite
            };
        } else {
            overlay.added = overlay.added || [];
            overlay.added.push({
                title, url,
                icon:        icon || "fa-solid fa-link",
                ...(tags.length && { tags }),
                favorite,
                _siloTitle:  siloTitle
            });
        }

        window.HeliumStorage.setOverlay(overlay);
        refreshDisplaySilos();
        renderQuickBar();
        render(searchInput.value);
        linkModal.close();
    }

    function deleteModal() {
        const linkId = document.getElementById("modalLinkId").value;
        if (!linkId) return;
        const overlay    = window.HeliumStorage.getOverlay();
        overlay.deleted  = overlay.deleted || [];
        if (!overlay.deleted.includes(linkId)) overlay.deleted.push(linkId);
        window.HeliumStorage.setOverlay(overlay);
        refreshDisplaySilos();
        renderQuickBar();
        render(searchInput.value);
        linkModal.close();
    }

    document.getElementById("modalSaveBtn").addEventListener("click",   saveModal);
    document.getElementById("modalDeleteBtn").addEventListener("click",  deleteModal);
    document.getElementById("modalCancelBtn").addEventListener("click",  () => linkModal.close());
    // Close on backdrop click
    linkModal.addEventListener("click", e => { if (e.target === linkModal) linkModal.close(); });

    // ── Init ─────────────────────────────────────────────────────────────────
    startClock();
    refreshDisplaySilos();
    renderQuickBar();
    render();
})();
