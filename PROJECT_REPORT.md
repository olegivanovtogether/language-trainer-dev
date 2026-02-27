# Language Trainer — Project Report

**Updated:** Current architecture (root entry, shared engine, progress per course)

---

## 1. File structure

### 1.1 Folder tree

```
language-trainer/
├── root/
│   └── index.html              # Full app: course home, exercises list, main page, settings page, bottom tabs
├── index.html                  # Redirect to root/index.html
├── english/
│   ├── index.html              # Redirect to root?course=english
│   ├── js/course_config.js
│   └── exercises/             # manifest.json, ex1.js, ex2.js
├── spanish/
│   ├── index.html              # Redirect to root?course=spanish
│   ├── js/course_config.js
│   └── exercises/             # manifest.json, ex1.js … exN.js
├── russian/
│   ├── index.html              # Redirect to root?course=russian
│   ├── js/course_config.js
│   └── exercises/              # manifest.json, ex1.js …
├── shared/
│   ├── js/
│   │   └── app.js              # Single engine (~1900 lines)
│   └── css/
│       ├── app.css
│       ├── theme-classic.css
│       ├── theme-cyberpunk.css
│       └── theme-kawaii.css
├── backups/
├── source/
└── tts-test/
```

### 1.2 Entry points

| File | Role |
|------|------|
| **root/index.html** | Only full UI entry (exercises list, main training, settings page, bottom tabs). |
| **english/index.html**, **spanish/index.html**, **russian/index.html** | Redirect to `root/index.html?course=...`. |
| **index.html** (repo root) | Redirect to `root/index.html` (query string preserved). |

### 1.3 Core files

- **shared/js/app.js** — Single engine: exercise loading from manifest, two-phase logic (phaseState, correctSinceRollback), rollback and encouragement modals, progress bar flash overlay, save/load progress per course, resume on load.
- **shared/css/app.css** — Shared styles and #stage-bar-flash glow.
- **theme-*.css** — Classic, cyberpunk, kawaii themes (including flash glow for bar).
- **{course}/js/course_config.js** — UI strings, TTS, labels.
- **{course}/exercises/manifest.json** — List of exN.js; each exN.js sets `window.exerciseData`.

---

## 2. Features (current)

- **Two-phase stages (mc, write):** Phase 1 in order, phase 2 random; penalty and rollback (3 or 5 steps); correctSinceRollback reset on wrong; encouragement 25/50/75% only after N correct in a row.
- **Progress bar flash:** Overlay #stage-bar-flash; green on every correct, red (3x) on every wrong; before modals (rollback, encouragement, victory) a blocking overlay runs flash then opens modal.
- **Progress:** Saved per course (`progress-english`, etc.); on init, if valid saved progress exists, applyResumeState(p) is used so reload or course switch does not overwrite it.
- **Settings:** Dedicated settings page (tab) in root UI; course and theme selectors, dev mode. No settings modal.
- **Themes:** classic, cyberpunk, kawaii; body class and theme CSS; flash glow defined in each theme.

---

## 3. Summary

- One engine (**shared/js/app.js**), one full entry (**root/index.html**). Course indices and repo root index redirect to root.
- Progress and phase state are persisted per course; resume on load/course switch is supported.
- Technical details: **TECHNICAL_REPORT.md**.

---

**End of report.**
