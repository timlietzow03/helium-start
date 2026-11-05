(function () {
    const I    = window.Insights;
    const SNAP = window.HISTORY_SNAPSHOT;
    const KEY  = "helium_history_v1";
    const $    = id => document.getElementById(id);
    const nf   = n => Number(n).toLocaleString("de-DE");

    // ── Helfer ───────────────────────────────────────────────────────────────
    function el(tag, props, ...kids) {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(props || {})) {
            if (v == null || v === false || k === "vars") continue;
            if (k === "class") e.className = v;
            else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
            else e.setAttribute(k, v);
        }
        // Custom Properties zuletzt: ein style-Attribut davor würde sie sonst überschreiben
        if (props && props.vars) Object.entries(props.vars).forEach(([n, val]) => e.style.setProperty(n, val));
        kids.flat().forEach(c => { if (c != null) e.append(c); });
        return e;
    }
    const icon = cls => el("i", { class: cls });
    const dayLabel = (d, long) => new Date(d + "T12:00:00Z").toLocaleDateString("de-DE",
        long ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }
             : { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
    const emptyState = (ic, title, text) => el("div", { class: "empty-state" }, icon(`${ic} es-icon`), el("h3", {}, title), el("p", {}, text));
    const catColor = c => (I.CATS[c] || I.CATS.other).color;
    const catLabel = c => (I.CATS[c] || I.CATS.other).label;
    const sum = o => Object.values(o).reduce((a, b) => a + b, 0);

    // ── Daten laden (Snapshot oder eingelesener Verlauf) ─────────────────────
    const loadData = () => I.loadData(SNAP);

    let D, A, AF, filterCat = null;   // AF: Auswertung der gewählten Kategorie (oder gleich A)

    // ── KPIs ─────────────────────────────────────────────────────────────────
    function renderKpis() {
        const active = A.days.filter(d => d.total > 0).length;
        const gaps = A.days.filter(d => d.total === 0).map(d => d.date.slice(8) + "." + d.date.slice(5, 7) + ".");
        const peak = A.hours.indexOf(Math.max(...A.hours));
        const night = [22, 23, 0, 1, 2, 3].reduce((s, h) => s + A.hours[h], 0);
        const best = A.blocks.slice().sort((a, b) => (b.to - b.from) - (a.to - a.from))[0];
        const bestH = best ? best.to - best.from + 1 : 0;
        const tiles = [
            ["Seiten-Aufrufe", nf(A.total), `plus ${A.starts} Starts der Helium-Startseite`, "#60a5fa", { n: A.total }],
            ["Dienste", nf(A.services.size), `${nf(A.hosts.size)} verschiedene Hosts`, "#a78bfa", { n: A.services.size }],
            ["Aktive Tage", `${active} von ${A.days.length}`, gaps.length ? `kein Eintrag am ${gaps.join(", ")}` : "jeder Tag aktiv", "#34d399"],
            ["Spitzenstunde", `${String(peak).padStart(2, "0")}–${String((peak + 1) % 24).padStart(2, "0")} Uhr`, `${nf(A.hours[peak])} Aufrufe`, "#fbbf24"],
            ["Längste Aktivphase", `${bestH} Std.`, best ? I.blockLabel(A, best) : "", "#f472b6", { n: bestH, fmt: n => `${Math.round(n)} Std.` }],
            ["Nachteule (22–04 Uhr)", `${Math.round(100 * night / Math.max(1, A.total))} %`, `${nf(night)} Aufrufe`, "#c084fc",
                { n: 100 * night / Math.max(1, A.total), fmt: n => `${Math.round(n)} %` }]
        ];
        $("kpis").replaceChildren(...tiles.map(([l, v, s, c], i) =>
            el("div", { class: "kpi", vars: { "--k": c, "--i": i } },
                el("div", { class: "kpi-label" }, l), el("div", { class: "kpi-value" }, v), el("div", { class: "kpi-sub" }, s))));
        tiles.forEach(([, , , , spec], i) => {
            if (spec) UIKit.countUp($("kpis").children[i].querySelector(".kpi-value"), spec.n, { format: spec.fmt });
        });
        const first = A.days[0].date, last = A.days[A.days.length - 1].date;
        $("rangeLabel").textContent = `${dayLabel(first)} bis ${dayLabel(last)} · ${A.days.length} Tage · ${D.imported ? "eigener Verlauf" : "Snapshot vom " + SNAP.generated}`;
    }

    // ── Heatmap ──────────────────────────────────────────────────────────────
    function renderHeatmap(A = AF) {
        const max = Math.max(1, ...A.days.flatMap(d => d.hours));
        const cells = [el("div"), ...Array.from({ length: 24 }, (_, h) => el("div", { class: "hm-hour" }, h % 3 === 0 ? String(h) : ""))];
        A.days.forEach(day => {
            cells.push(el("div", { class: "hm-day" + (day.total ? "" : " hm-empty-row") }, dayLabel(day.date)));
            day.hours.forEach((n, h) => {
                const a = n ? 0.15 + 0.85 * Math.sqrt(n / max) : 0;
                cells.push(el("div", { class: "hm-cell", "data-tip": `${dayLabel(day.date, true)}, ${h}:00 Uhr: ${n} Aufrufe`,
                    style: `--c:${h};` + (n ? `background: color-mix(in srgb, var(--accent) ${Math.round(a * 100)}%, transparent)` : "") }));
            });
        });
        $("heatmap").replaceChildren(...cells);
    }

    // ── Donut ────────────────────────────────────────────────────────────────
    function renderDonut() {
        const cats = Object.entries(A.byCat).sort((a, b) => b[1] - a[1]);
        const R = 70, C = 2 * Math.PI * R, ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 200 200"); svg.setAttribute("class", "donut");
        svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "Kategorien");
        let off = 0;
        cats.forEach(([c, n]) => {
            const len = C * n / A.total;
            const ring = document.createElementNS(ns, "circle");
            ["cx:100", "cy:100", `r:${R}`, "fill:none", `stroke:${catColor(c)}`, "stroke-width:26",
             `stroke-dasharray:${len} ${C - len}`, `stroke-dashoffset:${-off}`, "transform:rotate(-90 100 100)"]
                .forEach(kv => { const [k, v] = kv.split(":"); ring.setAttribute(k, v); });
            const t = document.createElementNS(ns, "title"); t.textContent = `${catLabel(c)}: ${n}`; ring.append(t);
            svg.append(ring); off += len;
        });
        const mid = (txt, y, size, w) => { const t = document.createElementNS(ns, "text");
            t.setAttribute("x", 100); t.setAttribute("y", y); t.setAttribute("font-size", size); t.setAttribute("font-weight", w);
            t.textContent = txt; return t; };
        svg.append(mid(nf(A.total), 106, 26, 700), mid("Aufrufe", 126, 11, 400));

        const legend = el("div", { class: "legend" }, cats.map(([c, n], i) =>
            el("button", { type: "button", class: "legend-item" + (filterCat === c ? " active" : ""), vars: { "--c": catColor(c), "--i": i },
                           title: "Klicken zum Filtern", onclick: () => setFilter(filterCat === c ? null : c) },
                el("span", { class: "legend-dot" }), catLabel(c), el("b", {}, `${Math.round(100 * n / A.total)} %`))));
        $("donut").replaceChildren(svg, legend);
    }

    // ── Top-Dienste ──────────────────────────────────────────────────────────
    function favicon(s) {
        if (!s.fav) return el("i", { class: `${I.CATS[s.cat].icon} ts-fallback`, vars: { "--c": catColor(s.cat) } });
        const img = el("img", { class: "ts-icon", alt: "", loading: "lazy", referrerpolicy: "no-referrer",
            src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(s.fav)}&sz=64` });
        img.addEventListener("error", () => img.replaceWith(favicon({ ...s, fav: null })));
        return img;
    }
    function renderTop(A = AF) {
        const list = [...A.services.values()].sort((a, b) => b.n - a.n).slice(0, 12);
        const max = list[0] ? list[0].n : 1;
        $("topServices").replaceChildren(...list.map((s, i) =>
            el("div", { class: "ts-row", vars: { "--c": catColor(s.cat) } },
                favicon(s),
                el("div", {},
                    el("div", { class: "ts-name" }, el("span", {}, s.name), el("span", {}, `${catLabel(s.cat)} · ${s.days.size} Tage`)),
                    el("div", { class: "ts-bar" }, el("i", { vars: { "--w": `${Math.max(3, 100 * s.n / max)}%`, "--i": i } }))),
                el("span", { class: "ts-n" }, nf(s.n)))));
    }

    // ── Tagesrhythmus ────────────────────────────────────────────────────────
    function renderHours(A = AF) {
        const max = Math.max(1, ...A.hours);
        const order = Object.keys(A.byCat).sort((a, b) => A.byCat[b] - A.byCat[a]);
        $("hourChart").replaceChildren(...A.hourCats.map((cats, h) =>
            el("div", { class: "hc-col", "data-tip": `${h}:00 Uhr: ${A.hours[h]} Aufrufe` },
                order.filter(c => cats[c]).map(c => el("div", { class: "hc-seg",
                    vars: { "--c": catColor(c), "--d": h }, style: `height:${(100 * cats[c] / max).toFixed(1)}%` })),
                el("span", { class: "hc-lbl" }, h % 3 === 0 ? String(h) : ""))));
        $("hourLegend").replaceChildren(...order.slice(0, 7).map(c =>
            el("span", { class: "legend-item", vars: { "--c": catColor(c) } }, el("span", { class: "legend-dot" }), catLabel(c))));
    }

    // ── Profile & Konten ─────────────────────────────────────────────────────
    const GH_ROLES = {
        octocat: "Demo-Account aus den Beispieldaten"
    };

    function ghCard(owner, hits, main) {
        const repos = hits.filter(h => h.owner === owner).sort((a, b) => b.n - a.n);
        const total = repos.reduce((s, r) => s + r.n, 0);
        const stats = el("div", { class: "gh-stats" }, el("span", {}, `${total} Aufrufe im Verlauf`),
            el("span", {}, repos.slice(0, 3).map(r => r.repo).join(", ")));
        const name = el("a", { class: "gh-name", href: `https://github.com/${owner}`, target: "_blank", rel: "noopener noreferrer" },
            owner, main ? el("span", { class: "badge" }, "meistgenutzt") : null);
        const role = el("div", { class: "gh-role" }, GH_ROLES[owner.toLowerCase()] || "Aus dem Verlauf erkannt");
        const avatar = el("img", { class: "gh-avatar", alt: `Avatar von ${owner}`, loading: "lazy", src: `https://github.com/${encodeURIComponent(owner)}.png?size=144` });
        avatar.addEventListener("error", () => { avatar.style.visibility = "hidden"; });
        const card = el("div", { class: "gh-card" + (main ? " main" : "") }, avatar, el("div", { class: "gh-body" }, name, role, stats));

        // Live-Daten, falls GitHub erreichbar ist. Ohne Netz bleibt die Karte wie sie ist.
        fetch(`https://api.github.com/users/${encodeURIComponent(owner)}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(u => {
                if (u.bio) role.textContent = `${role.textContent} · ${u.bio}`;
                stats.append(el("span", {}, `${u.public_repos} öffentliche Repos`), el("span", {}, `${u.followers} Follower`));
            }).catch(() => {});
        return card;
    }

    function renderProfiles() {
        const byOwner = {};
        D.gh.forEach(h => { byOwner[h.owner] = (byOwner[h.owner] || 0) + h.n; });
        const owners = Object.entries(byOwner).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).map(([o]) => o).slice(0, 3);
        $("ghAnswer").textContent = owners.length
            ? `Welches GitHub-Profil? Im Verlauf dominiert ${owners[0]} (${byOwner[owners[0]]} Aufrufe)${owners[1] ? `, daneben ${owners[1]} (${byOwner[owners[1]]})` : ""}.`
            : "Keine GitHub-Repos im Verlauf erkannt.";
        $("ghProfiles").replaceChildren(...owners.map((o, i) => ghCard(o, D.gh, i === 0)));

        $("accounts").replaceChildren(...D.accounts.map(a => el("div", { class: "chip" },
            el("span", {}, icon(a.kind === "Gmail" ? "fa-brands fa-google" : "fa-solid fa-envelope"), " ", a.label), el("small", {}, a.note))));
        if (!D.accounts.length) $("accounts").append(el("span", { class: "empty" }, "Keine Gmail-Konten in den Seitentiteln gefunden."));

        const repos = D.gh.filter(r => owners.includes(r.owner)).sort((a, b) => b.n - a.n).slice(0, 6);
        $("repos").replaceChildren(...repos.map(r => {
            const img = el("img", { alt: "", loading: "lazy", src: `https://opengraph.githubassets.com/1/${encodeURIComponent(r.owner)}/${encodeURIComponent(r.repo)}` });
            img.addEventListener("error", () => { img.style.display = "none"; });
            // Private Repos haben keine Vorschau: der Platzhalter dahinter bleibt dann sichtbar
            const thumb = el("div", { class: "repo-thumb" }, icon("fa-brands fa-github"), el("b", {}, r.repo), img);
            return el("a", { class: "repo", href: `https://github.com/${r.owner}/${r.repo}`, target: "_blank", rel: "noopener noreferrer" },
                thumb, el("div", { class: "repo-meta" }, `${r.owner}/${r.repo}`, el("span", {}, `${r.n}×`)));
        }));
    }

    // ── Browser-Profile ──────────────────────────────────────────────────────
    function renderBrowserProfiles() {
        $("browserProfiles").replaceChildren(...I.PROFILES.map(p => {
            const n = p.cats.reduce((s, c) => s + (A.byCat[c] || 0), 0);
            const top = [...A.services.values()].filter(s => p.cats.includes(s.cat)).sort((a, b) => b.n - a.n).slice(0, 5);
            const note = p.id === "work" ? "Arbeits-Accounts (GitHub, Jira, Slack)"
                       : p.id === "uni"  ? "Lernplattformen und Literaturdatenbanken"
                       :                   "Persönliche Accounts und Freizeit-Dienste";
            return el("div", { class: "bp", vars: { "--c": p.color } },
                el("h3", {}, icon(p.icon), p.label),
                el("div", { class: "bp-share" }, `${Math.round(100 * n / Math.max(1, A.total))} %`, el("span", { class: "hint" }, ` · ${nf(n)} Aufrufe`)),
                el("ul", {}, top.map(s => el("li", {}, el("b", {}, s.name), ` (${s.n})`))),
                el("div", { class: "hint" }, note));
        }));
    }

    function renderModeStrip() {
        const nowH = new Date().getHours();
        // Dieselben Einstellungen und gelernten Klicks wie auf Helium Start
        const L = window.HeliumLearn;
        const opts = L ? { sched: L.prefs(), clicks: L.groupHours() } : undefined;
        const row = (label, dow) => {
            const cells = Array.from({ length: 24 }, (_, h) => {
                const m = I.modeAt(A, h, dow, opts);
                // 0 = Freizeit (rosa), 1 = Work (blau)
                const color = `color-mix(in srgb, #60a5fa ${Math.round(m.share * 100)}%, #f472b6)`;
                const src = m.data == null ? "nur Erwartung" : `Erwartung ${Math.round(100 * m.prior)} %, Verlauf ${Math.round(100 * m.data)} %`;
                return el("div", { class: "ms-cell" + (h === nowH && label === "Werktag" ? " now" : ""), style: `background:${color}`,
                    title: `${label}, ${h}:00 Uhr: ${m.mode === "work" ? "Work" : "Freizeit"} (${Math.round(100 * m.share)} % Work; ${src})` });
            });
            return [el("div", { class: "ms-label" }, label), ...cells];
        };
        const axis = [el("div"), ...Array.from({ length: 24 }, (_, h) => el("div", { class: "ms-axis" }, h % 3 === 0 ? String(h) : ""))];
        $("modeStrip").replaceChildren(...axis, ...row("Werktag", 3), ...row("Wochenende", 6));
    }

    function renderObservations() {
        $("obsCard").hidden = D.imported;
        if (D.imported) return;
        $("observations").replaceChildren(...SNAP.observations.map(o =>
            el("div", { class: "ob" }, icon(o.icon), el("div", {}, el("b", {}, o.title), el("p", {}, o.text)))));
    }

    // ── Helium-Abgleich ──────────────────────────────────────────────────────
    function linkIndex() {
        const hosts = new Set(), items = [];
        (window.HeliumStorage ? window.HeliumStorage.getMergedSilos() : []).forEach(s => (s.links || []).forEach(l => {
            let h = ""; try { h = I.stripWww(new URL(l.url).hostname); } catch {}
            if (h) { hosts.add(h); items.push({ silo: s.title, title: l.title, host: h }); }
        }));
        return { hosts, items };
    }

    const SILO_FOR = { dev: "Development", ops: "Work & Ops", infra: "Domains & Hosting", ai: "AI Tools", shop: "Shopping & Style",
                       media: "Media & Streaming", games: "Gaming", learn: "Learning", personal: "Eigene Projekte", accounts: "Konten & Geld" };
    function addToHelium(s, btn) {
        const o = window.HeliumStorage.getOverlay();
        o.added = o.added || [];
        o.added.push({ title: s.name, url: s.url, icon: I.CATS[s.cat].icon, tags: [s.cat], favorite: false, _siloTitle: SILO_FOR[s.cat] || "Custom" });
        window.HeliumStorage.setOverlay(o);
        btn.replaceChildren(icon("fa-solid fa-check"), " Hinzugefügt");
        btn.disabled = true; btn.classList.add("done-pop");
        const where = SILO_FOR[s.cat] || "Custom";
        if ([...document.querySelectorAll(".sg button")].some(b => !b.disabled)) {
            UIKit.toast(`${s.name} liegt jetzt unter „${where}“. Auf Helium Start siehst du es nach dem Neuladen.`);
        } else {
            // Letzter Vorschlag: das ist selten, also darf es feiern
            const r = btn.getBoundingClientRect();
            UIKit.confetti(r.left + r.width / 2, r.top, 64);
            UIKit.toast("Alles drin. Deine Startseite kennt jetzt, was du wirklich nutzt.", { timeout: 6000 });
        }
    }

    function renderSuggestions(idx) {
        const list = [...A.services.values()]
            .filter(s => s.url && s.n >= 6 && !["search", "accounts"].includes(s.cat))
            .filter(s => { try { return !idx.hosts.has(I.stripWww(new URL(s.url).hostname)); } catch { return false; } })
            // Erst nach Anzahl Tage, damit ein einmaliger Ausreißer (z. B. Foto-Aufräumen) nicht oben steht
            .sort((a, b) => b.days.size - a.days.size || b.n - a.n).slice(0, 12);
        $("suggestions").replaceChildren(...(list.length ? list.map(s => {
            const btn = el("button", { type: "button" }, "Hinzufügen");
            btn.addEventListener("click", () => addToHelium(s, btn));
            return el("div", { class: "sg" }, favicon(s),
                el("div", {}, s.name, el("small", {}, `${s.n} Aufrufe · ${s.days.size} Tage · → ${SILO_FOR[s.cat] || "Custom"}`)), btn);
        }) : [emptyState("fa-solid fa-circle-check", "Alles drin", "Alles, was du oft nutzt, hat schon einen Link in Helium.")]));
        return list;
    }

    function renderUnused(idx) {
        const visited = [...A.hosts];
        const seen = h => visited.some(v => v === h || v.endsWith("." + h));
        const unused = idx.items.filter(i => !seen(i.host));
        const bySilo = {};
        unused.forEach(i => (bySilo[i.silo] = bySilo[i.silo] || []).push(i));
        $("unusedSub").textContent = `${unused.length} von ${idx.items.length} Links wurden in diesen ${A.days.length} Tagen nicht geöffnet. Das ist ein schwaches Signal: ein Zeitraum von einer Woche ist kurz.`;
        const groups = Object.entries(bySilo).sort((a, b) => b[1].length - a[1].length);
        if (!groups.length) { $("unused").replaceChildren(emptyState("fa-solid fa-sparkles", "Kein Ballast", "Jeder Link in Helium wurde in diesem Zeitraum geöffnet.")); return unused; }
        $("unused").replaceChildren(...groups.map(([silo, items]) =>
            el("details", { class: "un" }, el("summary", {}, el("span", {}, silo), el("span", { class: "hint" }, `${items.length}`)),
                el("div", { class: "chips" }, items.map(i => el("span", { class: "chip" }, i.title))))));
        return unused;
    }

    // ── Claude ───────────────────────────────────────────────────────────────
    function summary() {
        const cats = Object.entries(A.byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ kategorie: catLabel(c), prozent: Math.round(100 * n / A.total) }));
        const top = [...A.services.values()].sort((a, b) => b.n - a.n).slice(0, 20).map(s => ({ dienst: s.name, kategorie: catLabel(s.cat), aufrufe: s.n, tage: s.days.size }));
        const days = A.days.map(d => ({ tag: d.date, aufrufe: d.total, work: (d.cats.dev || 0) + (d.cats.ops || 0) + (d.cats.infra || 0) }));
        return JSON.stringify({ zeitraum: `${A.days[0].date} bis ${A.days[A.days.length - 1].date}`, aufrufe: A.total, kategorien: cats, topDienste: top, proTag: days, aufrufeProStunde: A.hours }, null, 1);
    }

    function buildPrompts(sug, unused) {
        const data = "Daten (nur Dienstnamen und Zähler, keine URLs):\n" + summary();
        const head = "Ich habe eine eigene Browser-Startseite (Helium Start) und habe meinen Verlauf der letzten Woche ausgewertet.\n";
        return {
            habits: { label: "Gewohnheiten & Fokus", text: `${head}Analysiere meine Gewohnheiten: Wann bin ich fokussiert, wann zerfasere ich, was fällt dir auf? Gib mir fünf konkrete, freundliche Verbesserungsvorschläge und zitiere die Zahlen, auf die du dich stützt.\n\n${data}` },
            links:  { label: "Helium-Links aufräumen", text: `${head}Diese Dienste nutze ich oft, sie fehlen aber in meiner Startseite: ${sug.map(s => `${s.name} (${s.n}×)`).join(", ") || "keine"}.\nDiese Links in meiner Startseite habe ich in der Woche nie geöffnet: ${unused.slice(0, 40).map(u => u.title).join(", ") || "keine"}.\nSchlage eine bessere Kategorisierung vor, sag mir welche Links ich streichen kann und welche ich als Favoriten setzen sollte.\n\n${data}` },
            profiles: { label: "Browser-Profile planen", text: `${head}Ich nutze mehrere GitHub- und Google-Konten (Arbeit, Studium, Privat). Plane mir drei Browser-Profile (Work, Studium, Privat): welche Dienste, Konten und Lesezeichen gehören wohin, und wie richte ich es in einem Chromium-Browser ein?\n\n${data}` },
            week:   { label: "Work-Wochenrückblick", text: `${head}Schreibe mir einen kurzen Wochenrückblick zu meiner Arbeit (Kategorien Dev, Ops und Infra; die Spalte "work" in proTag). Wo ging die Zeit hin, an welchen Tagen war ich am produktivsten, und was sollte ich nächste Woche anders machen?\n\n${data}` }
        };
    }

    function renderClaude(sug, unused) {
        const prompts = buildPrompts(sug, unused);
        const area = $("claudePrompt");
        const box = $("claudePresets");
        const pick = key => {
            area.value = prompts[key].text;
            box.querySelectorAll(".preset").forEach(b => b.classList.toggle("active", b.dataset.key === key));
            $("claudeHint").textContent = `${area.value.length} Zeichen`;
        };
        box.replaceChildren(...Object.entries(prompts).map(([k, p]) => el("button", { class: "preset", type: "button", "data-key": k, onclick: () => pick(k) }, p.label)));
        pick("habits");
        area.oninput = () => { $("claudeHint").textContent = `${area.value.length} Zeichen`; };

        $("claudeOpen").onclick = () => {
            const text = area.value;
            if (text.length > 7000) {
                $("claudeHint").textContent = "Zu lang für den Link. Kopiere den Text und füge ihn in Claude ein.";
                return;
            }
            window.open("https://claude.ai/new?q=" + encodeURIComponent(text), "_blank", "noopener");
        };
        $("claudeCopy").onclick = async () => {
            try { await navigator.clipboard.writeText(area.value); }
            catch { area.select(); document.execCommand("copy"); }
            $("claudeHint").textContent = "Kopiert.";
        };
    }

    // ── Verlauf einlesen ─────────────────────────────────────────────────────
    function setupImport() {
        const modal = $("importModal");
        $("importOpenBtn").onclick = () => { $("importMsg").textContent = ""; modal.showModal(); };
        $("importCancel").onclick = () => modal.close();
        modal.addEventListener("click", e => { if (e.target === modal) modal.close(); });
        $("importGo").onclick = () => {
            const parsed = I.parseRaw($("importText").value);
            if (!parsed.rows.length) {
                $("importMsg").textContent = "Nichts erkannt. Erwartet wird Tag-Überschrift, Uhrzeit, Titel, Host je Eintrag.";
                return;
            }
            try { localStorage.setItem(KEY, JSON.stringify({ rows: I.toCompact(parsed.rows), gh: parsed.gh, mails: parsed.mails })); } catch {}
            modal.close(); $("importText").value = ""; render();
        };
        $("resetBtn").onclick = () => { try { localStorage.removeItem(KEY); } catch {} render(); };
    }

    // ── Kategorie-Filter ─────────────────────────────────────────────────────
    function computeFiltered() {
        if (!filterCat) { AF = A; return; }
        const rows = D.rows.filter(r => I.serviceOf(r.host).cat === filterCat);
        AF = I.aggregate(rows, { start: A.days[0].date, end: A.days[A.days.length - 1].date });
    }

    function setFilter(cat) {
        filterCat = cat;
        computeFiltered();
        const note = $("filterNote");
        note.hidden = !cat;
        note.replaceChildren(...(cat ? [icon("fa-solid fa-filter"), ` Filter: ${catLabel(cat)}, ${nf(AF.total)} Aufrufe. `,
            el("button", { type: "button", class: "link-btn", onclick: () => setFilter(null) }, "Filter entfernen")] : []));
        renderDonut(); renderHeatmap(); renderTop(); renderHours();
    }

    // ── Bericht als Markdown ─────────────────────────────────────────────────
    function exportReport() {
        const pct = n => Math.round(100 * n / Math.max(1, A.total));
        const L = [`# Helium Insights`, `${dayLabel(A.days[0].date)} bis ${dayLabel(A.days[A.days.length - 1].date)}, ${nf(A.total)} Aufrufe, ${A.services.size} Dienste`, "",
            "## Kategorien", ...Object.entries(A.byCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${catLabel(c)}: ${pct(n)} % (${nf(n)})`), "",
            "## Top-Dienste", ...[...A.services.values()].sort((a, b) => b.n - a.n).slice(0, 15).map(s => `- ${s.name}: ${nf(s.n)} Aufrufe an ${s.days.size} Tagen`), "",
            "## Pro Tag", ...A.days.map(d => `- ${dayLabel(d.date)}: ${nf(d.total)}`), ""];
        if (!D.imported) L.push("## Auffälligkeiten", ...SNAP.observations.map(o => `- **${o.title}**: ${o.text}`), "");
        const a = el("a", { href: URL.createObjectURL(new Blob([L.join("\n")], { type: "text/markdown" })), download: "helium-insights.md" });
        a.click(); URL.revokeObjectURL(a.href);
    }

    // ── Render ───────────────────────────────────────────────────────────────
    function render() {
        D = loadData();
        A = I.aggregate(D.rows);
        if (filterCat && !A.byCat[filterCat]) filterCat = null;
        computeFiltered();
        $("resetBtn").hidden = !D.imported;
        if (!A.total) { $("kpis").replaceChildren(el("p", { class: "empty-message" }, "Keine Daten.")); return; }
        renderKpis(); renderHeatmap(); renderDonut(); renderTop(); renderHours();
        renderProfiles(); renderBrowserProfiles(); renderModeStrip(); renderObservations();
        const idx = linkIndex();
        const sug = renderSuggestions(idx);
        const unused = renderUnused(idx);
        renderClaude(sug, unused);
        $("footNote").textContent = D.imported
            ? "Aus deinem eingelesenen Verlauf berechnet. Gespeichert sind nur Datum, Stunde, Host und Zähler, in diesem Browser."
            : "Der Snapshot wurde von Hand aus deinem Verlauf ausgezählt, einzelne Werte können um ein paar Einträge abweichen. 'Verlauf einlesen' rechnet exakt nach. Favicons, GitHub-Avatare und Repo-Vorschauen werden live von Google bzw. GitHub geladen.";
    }

    document.body.classList.add("boot");
    setTimeout(() => document.body.classList.remove("boot"), 2800);
    UIKit.tooltip($("heatmap"), ".hm-cell", t => t.dataset.tip);
    UIKit.tooltip($("hourChart"), ".hc-col", t => t.dataset.tip);

    // Abschnitts-Navigation zeigt, wo du gerade liest
    const navLinks = [...document.querySelectorAll("#secnav a")];
    const targets = navLinks.map(a => document.querySelector(a.getAttribute("href")));
    let spyQueued = false;
    function spy() {
        spyQueued = false;
        let cur = 0;
        targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= 140) cur = i; });
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = targets.length - 1;
        navLinks.forEach((a, i) => { a.classList.toggle("active", i === cur); if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
        const act = navLinks[cur]; if (act && act.scrollIntoView) act.scrollIntoView({ block: "nearest", inline: "center" });
    }
    window.addEventListener("scroll", () => { if (!spyQueued) { spyQueued = true; requestAnimationFrame(spy); } }, { passive: true });

    setupImport();
    $("exportMd").onclick = exportReport;
    window.InsightsChat.setup({ $, el });
    render();
    spy();
})();
