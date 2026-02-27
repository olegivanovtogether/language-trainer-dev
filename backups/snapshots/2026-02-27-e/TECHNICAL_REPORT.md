# Language Trainer — Technical Report

**Updated:** Current architecture (root entry, shared engine, two-phase logic, progress per course)

---

## 1. Full folder structure

```
language-trainer/
├── root/
│   └── index.html              # Single full app entry (exercises list, main, settings, bottom tabs)
├── index.html                  # Redirect to root/index.html (preserves query string)
├── english/
│   ├── index.html              # Redirect to root/index.html?course=english
│   ├── js/
│   │   └── course_config.js    # UI strings, TTS config
│   └── exercises/
│       ├── manifest.json       # ["ex1.js","ex2.js"]
│       ├── ex1.js, ex2.js      # window.exerciseData = { title, explanation, vocab, sentences }
├── spanish/
│   ├── index.html              # Redirect to root?course=spanish
│   ├── js/course_config.js
│   └── exercises/              # manifest.json, ex1.js … exN.js
├── russian/
│   ├── index.html              # Redirect to root?course=russian
│   ├── js/course_config.js
│   └── exercises/              # manifest.json, ex1.js …
├── shared/
│   ├── js/
│   │   └── app.js              # Single engine: load, phases, progress, flash, modals
│   └── css/
│       ├── app.css             # Shared + stage-bar-flash glow
│       ├── theme-classic.css
│       ├── theme-cyberpunk.css
│       └── theme-kawaii.css
├── source/                     # Legacy/source assets
├── tts-test/
└── backups/                    # Per-project backup policy
```

**Entry points:**
- **root/index.html** — only full UI (course home, exercises list, main training page, settings page, bottom tabs).
- **english/index.html**, **spanish/index.html**, **russian/index.html** — redirect to `root/index.html?course=...` so course is preselected.
- **index.html** (repo root) — redirect to `root/index.html`, query string preserved.

---

## 2. Exercise format and loading

Each exercise file sets `window.exerciseData = { title, topicTag?, explanation, vocab, sentences }`.  
**shared/js/app.js** resolves course from URL (`?course=` or path), then:

- Fetches `{course}/exercises/manifest.json` (array of filenames or `{ exercises: [] }` for Russian).
- Loads each `exN.js` via script tag; each run sets `window.exerciseData`, loader does `blocks.push(window.exerciseData)`.
- After load, **init()** fills block selector; if **getValidSavedProgress()** returns data, **applyResumeState(p)** runs instead of **loadBlock(0)** so progress is not overwritten on reload or course switch.

Progress key: `progress-{course}` (e.g. `progress-english`). Each course has its own saved state.

---

## 3. Shared engine (shared/js/app.js)

**Core behaviour:**
- **Two-phase logic (mc, write):** Phase 1 — in order; Phase 2 — random. **phaseState**, **correctSinceRollback**, **getRollbackSteps(kind)** (3 or 5). On lives exhausted: rollback modal then **showFail** (rollback steps, reset lives).
- **Encouragement:** 25/50/75% modals only after **N correct in a row** after last penalty/error; **correctSinceRollback[kind] = 0** in **onWrong** for mc/write.
- **Progress bar flash:** Overlay **#stage-bar-flash** (created in JS if missing). **flashProgressBarGreen(callback)** / **flashProgressBarRedThree(callback)**; CSS classes **stage-bar-flash-green** / **stage-bar-flash-red** with glow in app.css and themes. Green on every correct; red (3x) on every wrong. Before any modal (rollback, encouragement, victory), a blocking overlay is shown, flash runs, then callback removes overlay and opens modal.
- **Save/load:** **saveProgress()** writes blockIndex, step, positions, **stageState**, **phaseState**, **lastEncouragementMilestone**, **correctSinceRollback** to localStorage. **applyResumeState(p)** restores UI and loads the right question.

**Stages:** mc (choice), write (type word), sent (sentences). **stageState**, **seq**, **updateGateUI()**, **loadMCQuestion** / **loadWQuestion** / **loadSentence**.

---

## 4. UI (root/index.html)

- **#stage-bar-wrap**, **#stage-bar**, **#stage-bar-flash** — progress bar and flash overlay.
- **#modalOverlay** — game modals (resume, rollback, encouragement, victory).
- Settings: separate **settings** page/tab, not a modal. Toast for penalty text.
- Themes: classic, cyberpunk, kawaii (body class, theme CSS).

---

## 5. Architectural notes

- **Single engine:** One **shared/js/app.js**; no per-language app.js. Course-specific only **course_config.js** and **exercises/**.
- **Resume on load:** **init()** uses **getValidSavedProgress()** and, when valid, **applyResumeState(p)** so reload or course switch does not overwrite progress.
- **Flash independent of bar:** Flash uses overlay and CSS classes; **updateGateUI()** inline styles do not override it.
- **One entry for full app:** root/index.html; repo root and course indices redirect to it.

---

**End of report.**
