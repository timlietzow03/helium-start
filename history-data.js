/**
 * Verlaufs-Snapshot — DEMO-DATEN.
 *
 * Dieses Repo enthält absichtlich nur Beispieldaten: einen frei erfundenen
 * Verlauf über eine Woche, damit insights.html, die "Meistgenutzt"-Leiste und
 * der Tageszeit-Modus etwas anzuzeigen haben.
 *
 * Echte Daten bleiben lokal: local-data.js (steht in .gitignore) setzt
 * window.HISTORY_SNAPSHOT vor dieser Datei — dann gewinnt die lokale Fassung.
 *
 * Format pro Zeile: DATUM STUNDE HOST ANZAHL
 */
window.HISTORY_SNAPSHOT = window.HISTORY_SNAPSHOT || {
    generated: "2026-11-01",
    rows: `
2026-10-26 08 mail.google.com 4
2026-10-26 09 github.com 6
2026-10-26 09 stackoverflow.com 3
2026-10-26 09 developer.mozilla.org 2
2026-10-26 10 localhost:3000 12
2026-10-26 11 claude.ai 5
2026-10-26 11 docs.python.org 2
2026-10-26 12 calendar.google.com 2
2026-10-26 13 localhost:3000 9
2026-10-26 14 npmjs.com 3
2026-10-26 15 figma.com 4
2026-10-26 17 github.com 8
2026-10-26 19 youtube.com 2
2026-10-26 21 news.ycombinator.com 2
2026-10-27 08 mail.google.com 3
2026-10-27 09 github.com 7
2026-10-27 09 arxiv.org 2
2026-10-27 10 localhost:3000 14
2026-10-27 10 claude.ai 6
2026-10-27 11 developer.mozilla.org 3
2026-10-27 11 caniuse.com 2
2026-10-27 12 localhost:8001 4
2026-10-27 13 figma.com 6
2026-10-27 14 dribbble.com 3
2026-10-27 15 notion.so 2
2026-10-27 16 github.com 4
2026-10-27 18 open.spotify.com 2
2026-10-27 20 netflix.com 1
2026-10-28 08 mail.google.com 2
2026-10-28 09 github.com 5
2026-10-28 09 stackoverflow.com 4
2026-10-28 10 localhost:3000 11
2026-10-28 11 huggingface.co 3
2026-10-28 12 docs.google.com 5
2026-10-28 13 calendar.google.com 2
2026-10-28 14 leetcode.com 4
2026-10-28 15 figma.com 3
2026-10-28 17 github.com 8
2026-10-28 18 news.ycombinator.com 3
2026-10-28 19 discord.com 2
2026-10-28 21 youtube.com 3
2026-10-29 08 mail.google.com 2
2026-10-29 09 github.com 4
2026-10-29 10 localhost:3000 8
2026-10-29 11 npmjs.com 3
2026-10-29 11 roadmap.sh 1
2026-10-29 12 developer.mozilla.org 2
2026-10-29 13 claude.ai 4
2026-10-29 14 vercel.com 3
2026-10-29 15 supabase.com 2
2026-10-29 16 store.steampowered.com 2
2026-10-29 18 youtube.com 4
2026-10-29 20 reddit.com 2
2026-10-30 09 github.com 3
2026-10-30 10 localhost:3000 6
2026-10-30 10 claude.ai 3
2026-10-30 11 news.ycombinator.com 2
2026-10-30 12 stackoverflow.com 2
2026-10-30 13 figma.com 3
2026-10-30 15 codepen.io 2
2026-10-30 17 github.com 2
2026-10-30 19 open.spotify.com 3
2026-10-30 20 netflix.com 2
2026-10-31 11 github.com 2
2026-10-31 12 scholar.google.com 2
2026-10-31 13 paperswithcode.com 1
2026-10-31 14 localhost:3000 5
2026-10-31 15 unsplash.com 2
2026-10-31 16 awwwards.com 2
2026-10-31 18 youtube.com 3
2026-10-31 20 itch.io 1
2026-11-01 10 github.com 2
2026-11-01 11 mail.google.com 3
2026-11-01 12 claude.ai 2
2026-11-01 13 localhost:3000 7
2026-11-01 14 calendar.google.com 1
2026-11-01 15 wikipedia.org 2
2026-11-01 17 figma.com 2
`,

    // Repos aus den GitHub-Seitentiteln (Beispieldaten)
    gh: [
        { owner: "octocat", repo: "Hello-World", n: 12 },
        { owner: "octocat", repo: "Spoon-Knife", n: 5 }
    ],

    // Konten, die in den Seitentiteln auftauchen (Beispieldaten)
    accounts: [
        { label: "demo@example.com", kind: "Gmail", note: "Beispielkonto für die Demo-Daten" }
    ],

    // Von Hand aus Zeiten und Titeln gelesene Beobachtungen (Beispieldaten)
    observations: [
        { icon: "fa-solid fa-code", title: "Der lokale Dev-Server ist der Anker",
          text: "Ein großer Teil der Aufrufe geht an localhost:3000 — in diesen Demo-Daten führt der Weg fast immer zuerst in die lokale Entwicklungsumgebung, bevor Dokumentation oder GitHub folgt." },
        { icon: "fa-solid fa-book", title: "Recherche in Blöcken",
          text: "Dokumentations- und Forum-Aufrufe clustern vormittags zwischen 9 und 12 Uhr. Nachmittags verschiebt sich der Schwerpunkt sichtbar zu GitHub und Design-Tools." },
        { icon: "fa-solid fa-moon", title: "Ruhiger Freitag",
          text: "Am Freitag bricht die Zahl der Aufrufe ein — der typische Übergang ins Wochenende, in den Demo-Daten gut an den Stundenwerten zu sehen." }
    ]
};
