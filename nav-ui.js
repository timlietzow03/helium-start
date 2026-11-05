/**
 * Helium Start: Verhalten der Oberfläche (kein Datenzugriff).
 * Einblende-Staffelung, mitwachsende Topbar, gleitende Modus-Pille, Mehr-Menü, Rakete.
 */
(function () {
    const $ = id => document.getElementById(id);
    const silos = $("silos");

    // ── Erster Aufbau: Kategorien steigen nacheinander auf ───────────────────
    [...silos.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, 14)));
    silos.classList.add("boot");
    setTimeout(() => silos.classList.remove("boot"), 1800);

    // ── Topbar wird kompakt, sobald du scrollst (mit Hysterese gegen Flackern) ──
    let scrolled = false;
    const onScroll = () => {
        const y = window.scrollY;
        if (!scrolled && y > 90) scrolled = true;
        else if (scrolled && y < 24) scrolled = false;
        document.body.classList.toggle("scrolled", scrolled);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // ── Rakete: ein Klick auf das Logo ───────────────────────────────────────
    const logo = $("logoBtn");
    logo.addEventListener("click", () => {
        logo.classList.remove("launch"); void logo.offsetWidth; logo.classList.add("launch");
        if (!UIKit.reduced()) UIKit.confetti(logo.getBoundingClientRect().left + 14, logo.getBoundingClientRect().top + 14, 18);
    });
    logo.addEventListener("animationend", () => logo.classList.remove("launch"));

    // ── Modus-Pille gleitet zur aktiven Auswahl ──────────────────────────────
    const sw = $("modeSwitch"), pill = sw.querySelector(".mode-pill");
    function placePill() {
        const a = sw.querySelector("button.active");
        if (!a) { pill.style.width = "0"; return; }
        pill.style.width = a.offsetWidth + "px";
        pill.style.transform = `translateX(${a.offsetLeft}px)`;
    }
    pill.style.transition = "none";
    placePill();
    requestAnimationFrame(() => requestAnimationFrame(() => { pill.style.transition = ""; }));
    new MutationObserver(placePill).observe(sw, { attributes: true, subtree: true, attributeFilter: ["class"] });
    window.addEventListener("resize", placePill);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { pill.style.transition = "none"; placePill(); requestAnimationFrame(() => { pill.style.transition = ""; }); });

    // ── Bearbeiten-Knopf: Zustand auch für Screenreader ──────────────────────
    const edit = $("editModeBtn");
    const syncEdit = () => edit.setAttribute("aria-pressed", String(edit.classList.contains("active")));
    new MutationObserver(syncEdit).observe(edit, { attributes: true, attributeFilter: ["class"] });
    syncEdit();

    // ── Mehr-Menü ────────────────────────────────────────────────────────────
    const btn = $("moreBtn"), menu = $("moreMenu");
    const items = () => [...menu.querySelectorAll("button[role=menuitem]")];

    function openMenu() {
        menu.hidden = false; menu.classList.remove("closing");
        btn.setAttribute("aria-expanded", "true");
        const first = items()[0]; if (first) first.focus();
    }
    function closeMenu(returnFocus) {
        if (menu.hidden || menu.classList.contains("closing")) return;
        btn.setAttribute("aria-expanded", "false");
        const done = () => { if (!menu.classList.contains("closing")) return; menu.classList.remove("closing"); menu.hidden = true; };
        if (UIKit.reduced()) { menu.classList.add("closing"); done(); }
        else { menu.classList.add("closing"); menu.addEventListener("animationend", done, { once: true }); setTimeout(done, 300); }
        if (returnFocus) btn.focus();
    }
    btn.addEventListener("click", () => (menu.hidden ? openMenu() : closeMenu()));
    document.addEventListener("click", e => { if (!menu.hidden && !e.target.closest(".menu-wrap")) closeMenu(); });
    menu.addEventListener("click", e => { if (e.target.closest("button[role=menuitem]")) closeMenu(); });
    menu.addEventListener("keydown", e => {
        const list = items(), i = list.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
        else if (e.key === "Tab") closeMenu();
    });
    btn.addEventListener("keydown", e => { if (e.key === "ArrowDown" && menu.hidden) { e.preventDefault(); openMenu(); } });
})();
