/**
 * Chat direkt auf der Insights-Seite: eigener Anthropic-API-Schlüssel, Streaming, einfache Markdown-Darstellung.
 * Alles wird per DOM-Knoten gebaut (kein innerHTML), Antworten von der API bleiben also reiner Text.
 */
window.InsightsChat = (function () {
    const KEY_K = "helium_claude_key", MODEL_K = "helium_claude_model";
    const SYSTEM = "Du wertest den Browserverlauf einer Person aus. "
        + "Antworte auf Deutsch, konkret und freundlich, stütze dich auf die gelieferten Zahlen und erfinde keine Daten. "
        + "Nutze kurze Absätze, Listen und **Fettdruck** sparsam.";

    const store = {
        get: k => { try { return localStorage.getItem(k) || ""; } catch { return ""; } },
        set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
        del: k => { try { localStorage.removeItem(k); } catch {} }
    };

    // ── Minimales Markdown → DOM ─────────────────────────────────────────────
    function inline(el, text) {
        // **fett** und `code`, alles andere bleibt Text
        text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).forEach(part => {
            if (!part) return;
            let node;
            if (part.startsWith("**") && part.endsWith("**") && part.length > 4) { node = document.createElement("strong"); node.textContent = part.slice(2, -2); }
            else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) { node = document.createElement("code"); node.textContent = part.slice(1, -1); }
            else node = document.createTextNode(part);
            el.append(node);
        });
    }

    function renderMarkdown(target, text) {
        const frag = document.createDocumentFragment();
        let list = null, para = null;
        const flush = () => { list = null; para = null; };

        text.split(/\r?\n/).forEach(raw => {
            const line = raw.trimEnd();
            const h = line.match(/^(#{1,4})\s+(.*)$/);
            const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
            const ordered = /^\s*\d+[.)]\s/.test(line);

            if (!line.trim()) { flush(); return; }
            if (h) { flush(); const e = document.createElement("h4"); inline(e, h[2]); frag.append(e); return; }
            if (li) {
                const tag = ordered ? "ol" : "ul";
                if (!list || list.tagName.toLowerCase() !== tag) { list = document.createElement(tag); frag.append(list); }
                const item = document.createElement("li"); inline(item, li[1]); list.append(item); para = null; return;
            }
            list = null;
            if (!para) { para = document.createElement("p"); frag.append(para); } else para.append(document.createElement("br"));
            inline(para, line);
        });
        target.replaceChildren(frag);
    }

    // ── Streaming (Server-Sent Events) ───────────────────────────────────────
    async function streamMessage({ key, model, messages, onText, signal }) {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST", signal,
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01",
                       "anthropic-dangerous-direct-browser-access": "true" },
            body: JSON.stringify({ model, max_tokens: 1800, system: SYSTEM, messages, stream: true })
        });
        if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            throw new Error((j.error && j.error.message) || `HTTP ${r.status}`);
        }

        const reader = r.body.getReader(), dec = new TextDecoder();
        let buf = "", full = "";
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            const events = buf.split("\n\n");
            buf = events.pop();
            for (const ev of events) {
                const data = ev.split("\n").find(l => l.startsWith("data:"));
                if (!data) continue;
                let j; try { j = JSON.parse(data.slice(5)); } catch { continue; }
                if (j.type === "content_block_delta" && j.delta && j.delta.type === "text_delta") { full += j.delta.text; onText(full); }
                else if (j.type === "error") throw new Error((j.error && j.error.message) || "Stream-Fehler");
            }
        }
        return full;
    }

    // ── UI ───────────────────────────────────────────────────────────────────
    function setup({ $, el }) {
        let msgs = [], busy = false, abort = null;
        const sendBtn = $("chatSend");
        $("apiKey").value = store.get(KEY_K);
        $("apiModel").value = store.get(MODEL_K) || $("apiModel").value;

        function bubble(role, text) {
            const b = el("div", { class: `bubble ${role}` }, text);
            if (role === "user" && text.length > 240) b.classList.add("long");
            $("chatLog").append(b);
            b.scrollIntoView({ block: "nearest", behavior: "smooth" });
            return b;
        }

        // Kopieren-Knopf an fertigen Antworten
        function addCopy(bubbleEl, text) {
            const b = el("button", { class: "bubble-copy", type: "button", title: "Antwort kopieren", "aria-label": "Antwort kopieren" },
                         el("i", { class: "fa-regular fa-copy" }));
            b.addEventListener("click", async () => {
                try { await navigator.clipboard.writeText(text); } catch {
                    const ta = document.createElement("textarea"); ta.value = text; document.body.append(ta); ta.select(); document.execCommand("copy"); ta.remove();
                }
                b.firstChild.className = "fa-solid fa-check";
                UIKit.toast("Antwort kopiert.", { timeout: 2200 });
                setTimeout(() => { b.firstChild.className = "fa-regular fa-copy"; }, 1600);
            });
            bubbleEl.append(b);
        }

        function setBusy(on) {
            busy = on;
            sendBtn.replaceChildren(el("i", { class: on ? "fa-solid fa-stop" : "fa-solid fa-paper-plane" }), on ? " Stopp" : " Hier fragen");
        }

        async function ask(text, fresh) {
            const key = $("apiKey").value.trim(), model = $("apiModel").value.trim();
            if (!key || !model) { $("claudeHint").textContent = "Bitte API-Schlüssel und Modell eintragen."; return; }
            store.set(KEY_K, key); store.set(MODEL_K, model);
            if (fresh) { msgs = []; $("chatLog").replaceChildren(); $("chatFollow").hidden = true; }

            msgs.push({ role: "user", content: text });
            bubble("user", text);
            const out = bubble("assistant", "Claude denkt nach …");
            out.classList.add("wait", "md");
            setBusy(true);
            abort = new AbortController();

            let partial = "", frame = 0;
            try {
                const answer = await streamMessage({
                    key, model, messages: msgs, signal: abort.signal,
                    onText: t => {
                        partial = t;
                        if (!frame) frame = requestAnimationFrame(() => { frame = 0; out.classList.remove("wait"); renderMarkdown(out, partial); });
                    }
                });
                msgs.push({ role: "assistant", content: answer });
                out.classList.remove("wait"); renderMarkdown(out, answer);
                addCopy(out, answer);
                $("chatFollow").hidden = false;
            } catch (e) {
                if (e.name === "AbortError") {
                    // Abbruch: das bisher Gelesene bleibt Teil des Gesprächs, damit Nachfragen Sinn ergeben
                    if (partial) msgs.push({ role: "assistant", content: partial }); else msgs.pop();
                    out.classList.remove("wait");
                    if (!partial) out.textContent = "Abgebrochen.";
                    $("chatFollow").hidden = !partial;
                } else {
                    msgs.pop();   // Verlauf soll abwechselnd bleiben, damit eine neue Anfrage wieder geht
                    out.classList.remove("wait"); out.classList.add("err");
                    out.textContent = `Fehler: ${e.message}`;
                }
            } finally {
                if (frame) cancelAnimationFrame(frame);
                setBusy(false); abort = null;
            }
        }

        sendBtn.onclick = () => { if (busy && abort) abort.abort(); else ask($("claudePrompt").value, true); };
        $("chatFollow").onsubmit = e => {
            e.preventDefault();
            const t = $("followInput").value.trim();
            if (t && !busy) { $("followInput").value = ""; ask(t, false); }
        };
        $("keyClear").onclick = () => {
            store.del(KEY_K); $("apiKey").value = "";
            $("claudeHint").textContent = "Schlüssel aus diesem Browser gelöscht.";
        };
    }

    return { setup, renderMarkdown };
})();
