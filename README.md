# Helium Start

Eine persönliche Browser-Startseite: Links in Silos, Tageszeit-Modus, Befehlspalette,
Notizen und eine Auswertung des eigenen Browser-Verlaufs. Reines HTML, CSS und
JavaScript — kein Build, kein Server, keine Abhängigkeiten außer zwei CDNs
(Font Awesome, Google Fonts).

## Starten

`Nav.html` im Browser öffnen — fertig. Für die Auswertungen zusätzlich `insights.html`.

> Läuft direkt über `file://`. Ein lokaler Server ist nicht nötig, funktioniert aber
> genauso (`npx serve .`) und vermeidet Einschränkungen bei `file://`.

## Funktionen

**Helium Start (`Nav.html`)**
- Links in Silos, nach Uhrzeit gewichtet (Work / Freizeit / Auto)
- Suche mit Web-Kürzeln (z. B. `g hunde`), Befehlspalette (`Strg + K`)
- Notizen, Favoriten, „zuletzt genutzt“, Links selbst bearbeiten und ergänzen
- Anpassbare Silo-Reihenfolge und Klick-Lernen (`helium-learn.js`)

**Insights (`insights.html`)**
- Browser-Verlauf einlesen (Chrome/Edge-Export) und auswerten
- Aufrufe pro Kategorie, Stunde, Wochentag; genutzte vs. nie geöffnete Links
- Vorschläge für fehlende Links, Profil-Planung, Prompts für Claude
- Optionaler Chat mit eigenem Anthropic-API-Schlüssel (wird nur im `localStorage`
  des Browsers gespeichert, nie übertragen außer direkt an die API)

## Dateien

| Datei | Zweck |
|---|---|
| `Nav.html` | Startseite |
| `insights.html` | Verlaufs-Auswertung |
| `links-data.js` | Link-Silos (hier: Beispieldaten) |
| `history-data.js` | Verlaufs-Snapshot (hier: Beispieldaten) |
| `local-data.js` | **optional, nicht im Repo**: eigene Links + echter Verlauf |
| `storage.js` | Overlay-Speicher (localStorage) für Änderungen |
| `app.js` | Rendering, Suche, Favoriten |
| `time-mode.js` | Tageszeit-Modus |
| `helium-learn.js` | gelernte Klick-Zeiten |
| `command-palette.js` | Befehlspalette |
| `nav-ui.js`, `ui-kit.js`, `usage-strip.js` | UI-Bausteine |
| `insights-core.js` | Verlaufs-Parsing, Kategorien, Statistik |
| `insights-ui.js` | Charts und Karten |
| `insights-chat.js` | Anthropic-Chat |
| `*.css` | `styles.css` (Grundlage), `polish.css`, `time-mode.css`, `nav-ui.css`, `insights.css` |

## Eigene Daten statt Demo-Daten

Das Repo enthält bewusst nur erfundene Beispieldaten. Wer die Seite dauerhaft
mit eigenen Links und eigenem Verlauf nutzen will, legt im selben Ordner eine
`local-data.js` an:

```js
// Eigene Silos ergänzen
window.LINK_SILOS = window.LINK_SILOS || [];
window.LINK_SILOS.push({ title: "Meine Links", icon: "fa-solid fa-star", color: "#f59e0b",
    links: [{ title: "Beispiel", url: "https://example.com/", icon: "fa-solid fa-link" }] });

// Eigenen Verlaufs-Snapshot setzen (Format: DATUM STUNDE HOST ANZAHL)
window.HISTORY_SNAPSHOT = { generated: "2026-01-01", rows: `2026-01-01 09 github.com 3`, gh: [], accounts: [], observations: [] };
```

Die Datei wird von `Nav.html` und `insights.html` direkt nach `links-data.js`
geladen und steht in `.gitignore`. Fehlt sie, erscheint in der Browser-Konsole
eine harmlose 404-Meldung — die Seiten laufen mit den Demo-Daten weiter.

## Datenschutz

`local-data.js` ist der einzige Ort für persönliche Daten und wird nicht
versioniert. Alles andere in diesem Repo ist Beispielinhalt.
