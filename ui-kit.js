/**
 * UIKit: kleine, gemeinsame Bausteine für Helium Start und Insights.
 * Animierte Dialoge, Toast, Tooltip, Zahlen-Zähler, Text-Überblendung und Konfetti.
 */
window.UIKit = (function () {
    const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
    const EASE_IN  = "cubic-bezier(0.4, 0, 1, 1)";

    // ── Dialoge schließen animiert (auch bei Esc und wenn app.js close() ruft) ──
    const nativeClose = HTMLDialogElement.prototype.close;
    HTMLDialogElement.prototype.close = function (returnValue) {
        if (!this.open || this.classList.contains("closing") || reduced()) {
            this.classList.remove("closing");
            return nativeClose.call(this, returnValue);
        }
        this.classList.add("closing");
        const finish = () => {
            if (!this.classList.contains("closing")) return;
            this.classList.remove("closing");
            nativeClose.call(this, returnValue);
        };
        this.addEventListener("animationend", e => { if (e.target === this) finish(); }, { once: true });
        setTimeout(finish, 420);   // Sicherheitsnetz, falls animationend ausbleibt
    };
    document.addEventListener("cancel", e => {
        if (e.target instanceof HTMLDialogElement) { e.preventDefault(); e.target.close(); }
    }, true);

    // ── Toast ────────────────────────────────────────────────────────────────
    let toastEl = null, toastTimer = 0;
    function toast(text, opts) {
        const o = opts || {};
        if (!toastEl) {
            toastEl = document.createElement("div");
            toastEl.className = "toast";
            toastEl.setAttribute("role", "status");
            document.body.append(toastEl);
        }
        toastEl.replaceChildren(document.createTextNode(text));
        if (o.action) {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = o.action;
            b.addEventListener("click", () => { toastEl.classList.remove("show"); if (o.onAction) o.onAction(); });
            toastEl.append(b);
        }
        // Reflow, damit die Einblende-Animation auch bei Folge-Toasts neu startet
        toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove("show"), o.timeout || 7000);
    }

    // ── Text überblenden: nur wenn er sich ändert ────────────────────────────
    function swapText(el, text) {
        if (el._swapTo === text || (!el._swapTo && el.textContent === text)) return;
        el._swapTo = text;
        // Im Hintergrund-Tab laufen keine Animationen: dort direkt setzen, sonst bliebe alter Text stehen
        if (reduced() || document.hidden || !el.isConnected || !el.textContent) { el.getAnimations().forEach(a => a.cancel()); el.textContent = text; return; }
        el.getAnimations().forEach(a => a.cancel());
        const out = el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-5px)" }],
                               { duration: 140, easing: EASE_IN, fill: "forwards" });
        const apply = () => {
            if (el._swapTo !== text) return;   // inzwischen wurde ein neuerer Text gesetzt
            out.cancel();                      // sonst bliebe der Text durch fill:forwards unsichtbar
            el.textContent = text;
            el.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
                       { duration: 360, easing: EASE_OUT, fill: "none" });
        };
        out.finished.then(apply).catch(() => {});
        // Gedrosselte Frames (z. B. Tab im Hintergrund): der Text darf nie hängen bleiben
        setTimeout(() => { if (el._swapTo === text && el.textContent !== text) { el.getAnimations().forEach(x => x.cancel()); el.textContent = text; } }, 700);
    }

    // ── Zahlen zählen hoch ───────────────────────────────────────────────────
    function countUp(el, to, opts) {
        const o = opts || {}, fmt = o.format || (n => Math.round(n).toLocaleString("de-DE"));
        if (reduced() || !Number.isFinite(to)) { el.textContent = fmt(to); return; }
        const dur = o.duration || 800, t0 = performance.now();
        const step = now => {
            const p = Math.min(1, (now - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(to * eased);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // ── Konfetti (selten, deshalb darf es theatralisch sein) ─────────────────
    function confetti(x, y, count) {
        if (reduced()) return;
        const colors = ["#60a5fa", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb923c"];
        for (let i = 0; i < (count || 42); i++) {
            const p = document.createElement("i");
            p.className = "confetti";
            p.style.left = x + "px"; p.style.top = y + "px";
            p.style.background = colors[i % colors.length];
            document.body.append(p);
            const ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 190;
            const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 80;
            p.animate([
                { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.55 },
                { transform: `translate(${dx * 1.15}px, ${dy + 220}px) rotate(${Math.random() * 900}deg)`, opacity: 0 }
            ], { duration: 1100 + Math.random() * 700, easing: EASE_OUT }).finished.then(() => p.remove()).catch(() => p.remove());
        }
    }

    // ── Tooltip für viele kleine Ziele (z. B. Heatmap-Zellen) ────────────────
    let tipEl = null;
    function tooltip(container, selector, getText) {
        const show = (e, target) => {
            if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip"; tipEl.setAttribute("role", "tooltip"); document.body.append(tipEl); }
            tipEl.textContent = getText(target);
            const r = tipEl.getBoundingClientRect();
            const x = Math.min(window.innerWidth - r.width - 10, Math.max(10, e.clientX + 14));
            const y = e.clientY + r.height + 24 > window.innerHeight ? e.clientY - r.height - 14 : e.clientY + 18;
            tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
            tipEl.classList.add("show");
        };
        container.addEventListener("mousemove", e => { const t = e.target.closest(selector); if (t && container.contains(t)) show(e, t); else if (tipEl) tipEl.classList.remove("show"); });
        container.addEventListener("mouseleave", () => { if (tipEl) tipEl.classList.remove("show"); });
    }

    return { toast, swapText, countUp, confetti, tooltip, reduced };
})();
