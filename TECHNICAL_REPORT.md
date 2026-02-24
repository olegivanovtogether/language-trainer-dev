# Language Trainer — Complete Technical Report

**Generated:** Analysis only (no files modified)

---

## 1. Full folder structure

```
language-trainer/
├── .git/
├── english/
│   ├── index.html              # Entry page (UA UI, EN content)
│   ├── js/
│   │   └── app.js              # Shell, loader, game logic, UI (~861 lines)
│   └── exercises/
│       ├── manifest.json       # ["ex1.js","ex2.js"]
│       ├── ex1.js              # Single exercise (window.exerciseData = { ... })
│       └── ex2.js              # Single exercise
├── spanish/
│   ├── index.html
│   ├── js/
│   │   └── app.js              # Same structure as English
│   └── exercises/
│       ├── manifest.json       # 15 files: ex1.js … ex15.js
│       └── ex1.js … ex15.js
├── russian/
│   ├── index.html
│   ├── js/
│   │   └── app.js              # Same structure, manifest supports { exercises: [] }
│   └── exercises/
│       ├── manifest.json       # {"exercises":["ex1.js","ex2.js","ex3.js"]}
│       └── ex1.js, ex2.js, ex3.js
├── source/
│   ├── spanish_A1_preterito_indefinido_FULL.txt
│   ├── russian_A0_Eto_FULL.txt
│   ├── video105.txt
│   ├── Video101_104.html
│   ├── Video101_104 – копія.html
│   ├── index_back.html
│   └── Spanish_SER_ESTAR_Game_UA_ES_TTS_SEQ_PENALTY_v4.html
├── tts-test/
│   └── index.html
├── Back/
│   └── index – копія.html
└── TECHNICAL_REPORT.md         # This file
```

**Notes:**
- Each language (english, spanish, russian) is a self-contained app: its own `index.html`, `js/app.js`, and `exercises/` with manifest + ex*.js.
- `source/`, `tts-test/`, `Back/` are supporting/legacy assets, not part of the main app flow.

---

## 2. All exercise files and their format

### Schema (same for all three languages)

Each exercise file is a single script that assigns one object to `window.exerciseData`:

```js
window.exerciseData = {
    title: string,       // Display name in block selector and header
    topicTag: string,     // Optional tag shown above explanation (e.g. "🧩 базова дія")
    explanation: string,  // HTML fragment (template literal), can contain <hr>
    vocab: [              // Array of { ua: string, en: string }
        { ua: "…", en: "…" },
        …
    ],
    sentences: [          // Array of { ua: string, en: string }
        { ua: "…", en: "…" },
        …
    ]
};
```

- **english:** `vocab.en` / `sentences.en` = English; UI and prompts are Ukrainian (UA).
- **spanish:** `vocab.en` / `sentences.en` = Spanish; UI is Ukrainian; TTS uses `es-ES`.
- **russian:** `vocab.ua` / `sentences.ua` are Spanish (source language), `vocab.en` / `sentences.en` are Russian (target); UI is Spanish; content is “Spanish → Russian”.

### Per-language inventory

| Language | Exercise files | Manifest format |
|----------|----------------|-----------------|
| **english** | ex1.js, ex2.js | `["ex1.js","ex2.js"]` |
| **spanish** | ex1.js … ex15.js | `["ex1.js", …, "ex15.js"]` |
| **russian** | ex1.js, ex2.js, ex3.js | `{"exercises":["ex1.js","ex2.js","ex3.js"]}` |

- **english ex1.js:** Single merged-style exercise (title "English A0 — Present Simple (Video 01)", long explanation with `<hr>`, many vocab/sentences).
- **english ex2.js:** Second exercise (Present Simple Video 02).
- **spanish:** Each exN.js is one topic (e.g. SER, ESTAR, numbers, pretérito).
- **russian:** Each exN.js uses keys `ua` (Spanish source) and `en` (Russian target); explanation text is in Spanish.

---

## 3. How exercises are loaded

1. **Manifest:** App fetches `exercises/manifest.json` from the same origin as the script (derived from `document.currentScript.src` → `../exercises/`).
2. **Manifest shape:**
   - **english / spanish:** JSON array of file names: `["ex1.js", "ex2.js", ...]`.
   - **russian:** Can be array or `{ exercises: [...] }`; if object with `exercises` array, that array is used.
3. **Per file:** For each entry, a `<script>` is created, `src = dir + fileName`, and appended to `document.head`. Load is async (Promise per file, sequenced in a loop).
4. **Contract:** When the script runs, it must set `window.exerciseData` to one object. On success, the loader does `blocks.push(window.exerciseData)` and sets `window.exerciseData = null`.
5. **Fallback:** If fetch or JSON parse fails, loader falls back to trying `ex1.js`, `ex2.js`, … until one fails to load (no manifest required).

**Relevant code (english/js/app.js):**

```js
const dir = base ? base + "../exercises/" : "exercises/";
const manifestUrl = dir + "manifest.json";
// fetch(manifestUrl) -> fileList = await res.json()
for (let i = 0; i < fileList.length; i++) await loadOne(fileList[i]);
// loadOne: loadScript(dir + fileName, cb) -> if (success && window.exerciseData) { blocks.push(window.exerciseData); window.exerciseData = null; }
```

There is **no** support for a single file exposing multiple exercises (e.g. `window.exerciseData` as an array). One script run = one `blocks.push()`.

---

## 4. Entry point file

- **Per language:** `index.html` in that folder (e.g. `english/index.html`).
- **Script:** One script tag: `<script src="js/app.js"></script>` (no other JS).
- **Bootstrap:** At the end of `app.js`: `loadExercises().then(init);`
  - So the effective entry is `app.js`, which first loads exercises, then runs `init()`.

---

## 5. How `window.exerciseData` is used

- **Writer:** Each exercise script sets `window.exerciseData = { title, topicTag, explanation, vocab, sentences }` once.
- **Reader:** Only the loader in `app.js` reads it:
  - After each script load: `if (success && window.exerciseData) { blocks.push(window.exerciseData); window.exerciseData = null; }`
- **After load:** All exercise state lives in the `blocks` array (module-level in `app.js`). The global `window.exerciseData` is not used again until the next exercise script runs (and is cleared after each push).
- So: **single write per script, single read by loader, then data lives only in `blocks`.**

---

## 6. How UI interacts with exercise data

Exercise data is used only via `blocks` and `currentBlockIndex`:

- **Block selector:** `init()` fills `<select id="block-select">` with one `<option>` per block: `value = index`, `textContent = "${i+1}. ${b.title}"`.
- **Block change:** User selects an option or clicks Prev/Next → `loadBlock(index)`.
- **loadBlock(index):**
  - Sets `currentBlockIndex = index`, resets `currentExerciseStep` to 0, resets stage state and seq.
  - Reads `block = blocks[currentBlockIndex]` and:
    - Sets block title: `blockTitleEl.textContent = "Вправа N. " + block.title`
    - Sets progress text: `blockProgressTextEl.textContent = "Вправа N з M"`
    - Injects explanation: `explainEl.innerHTML = (topicTag div) + block.explanation`
    - Adjusts `GAME.stage.*.needCorrect` from `block.vocab.length` / `block.sentences.length` (scaled).
  - Calls `loadMCQuestion()`, `loadWQuestion()`, `loadSentence()` to prime the three exercise types (they also read `blocks[currentBlockIndex]`).
- **Stage 1 (MC):** `block.vocab` → one item chosen as correct, others (or others from vocab) as wrong options; `card.ua` as question, `card.en` as correct answer.
- **Stage 2 (Write):** Same `block.vocab`; question = `card.ua`, user types; compared to `card.en`.
- **Stage 3 (Sentences):** `block.sentences`; question = `card.ua`, user input compared to `card.en`.

All UI text for instructions, buttons, and feedback is hardcoded in the HTML or app.js (Ukrainian in english/spanish, Spanish in russian). The only content from the exercise is `title`, `topicTag`, `explanation`, and the `ua`/`en` pairs in `vocab` and `sentences`.

---

## 7. Manifest system

| Aspect | English | Spanish | Russian |
|--------|--------|--------|--------|
| **Path** | `exercises/manifest.json` | Same | Same |
| **Format** | Array of strings | Array of strings | Array or `{ exercises: array }` |
| **Resolved from** | `getExercisesBaseUrl()` → `../exercises/` | Same | Same |
| **Fallback** | Yes: ex1.js, ex2.js, … until 404 | Same | Same |

- **English/Spanish:** `const fileList = await res.json();` — must be array.
- **Russian:** `if (fileList && typeof fileList === "object" && Array.isArray(fileList.exercises)) fileList = fileList.exercises;` — so either a bare array or an object with `exercises` array is accepted.

---

## 8. All global variables (english/js/app.js)

**Module-level (effectively global within the app):**

- **blocks** — array of exercise objects (from `window.exerciseData`).
- **currentBlockIndex**, **currentExerciseStep** — which block and which of the 3 steps (0 = intro, 1 = MC, 2 = write, 3 = sentences).
- **GAME** — config: livesPerStage, stage.{mc,write,sent}.{needCorrect, minAccuracy}, stars.
- **gameXP** — numeric XP.
- **stageState** — { mc, write, sent } with correct, attempts, streak, lives, cleared, stars.
- **seq** — { mc, write, sent } with pos, last, n (for “next index” in vocab/sentences).
- **stats** — object keyed by block index: { mc: { correct, total }, write: {…}, sent: {…} }.
- **Modal:** modalOverlayEl, modalTitleEl, modalTextEl, modalPrimaryEl, modalSecondaryEl, modalTertiaryEl, modalPrimaryAction, modalSecondaryAction, modalTertiaryAction.
- **autoNextTimeout** — timeout id for auto-advance after correct answer.
- **wrongAttemptsMC**, **wrongAttemptsWrite**, **wrongAttemptsSent** — counts for “3 wrong → show hint”.
- **lastVocabIndexMC**, **lastVocabIndexWrite**, **lastSentenceIndex** — last indices used.
- **currentVocabIndexMC**, **currentVocabIndexWrite**, **currentSentenceIndex** — current item.
- **explainVisible**, **topPanelVisibleInPractice** — UI toggles.
- **TTS_ENABLED**, **TTS_LANG** — speech (e.g. "en-US" for English app).
- **All DOM refs** — blockTitleEl, blockProgressTextEl, exerciseStepEl, stageBarWrapEl, stageBarEl, explainEl, btnToggleExplain, blockSelectEl, ex1Card, ex2Card, ex3Card, mcQuestionEl, mcOptionsEl, mcFeedbackEl, mcNextBtn, wQuestionEl, wInputEl, wFeedbackEl, wCheckBtn, wShowBtn, wNextBtn, sQuestionEl, sInputEl, sFeedbackEl, sCheckBtn, sShowBtn, sNextBtn, btnPrev, btnNext, btnNextEx, btnRestart, statsEl, topPanelEl, btnTopPanelEl.

**Global on window (from exercise scripts):**

- **window.exerciseData** — set by each ex*.js, read once by loader, then cleared.

---

## 9. Execution flow from start to exercise display

1. User opens e.g. `english/index.html`.
2. Browser loads and runs `english/js/app.js`.
3. **loadExercises()** runs:
   - `getExercisesBaseUrl()` from `document.currentScript.src` → base path to `js/`.
   - `dir = base + "../exercises/"` → exercises folder URL.
   - `fetch(dir + "manifest.json")` → get file list (e.g. `["ex1.js","ex2.js"]`).
   - For each file: `loadScript(dir + fileName, callback)` (create script, set src, append to head).
   - On each script load: if `window.exerciseData` is set, `blocks.push(window.exerciseData)`, then `window.exerciseData = null`.
   - If fetch/manifest fails: fallback loop `ex1.js`, `ex2.js`, … until load fails.
4. **loadExercises().then(init)**:
   - **init():** For each `blocks[i]`, add `<option value=i>${i+1}. ${b.title}</option>` to `#block-select`. Then `loadBlock(0)`.
5. **loadBlock(0):**
   - Sets `currentBlockIndex = 0`, `currentExerciseStep = 0`, resets stages and seq.
   - Reads `block = blocks[0]`, fills block title, progress text, explanation (topicTag + explanation).
   - Optionally overwrites `GAME.stage.mc/write/sent.needCorrect` from block vocab/sentences length.
   - Calls `loadMCQuestion()`, `loadWQuestion()`, `loadSentence()` (they read current block and set question/options for each card type).
   - **updateExerciseVisibility():** Shows step 0 text and “Почати вправи”; hides ex1/ex2/ex3 cards.
6. User sees: block selector, block title, progress, explanation, “Почати вправи”. After clicking, `currentExerciseStep` becomes 1, ex1 (MC) card is shown and MC question is already filled from **loadMCQuestion()** (which uses `blocks[currentBlockIndex].vocab`).

So: **HTML → app.js → loadExercises (fetch manifest → load each ex*.js → push to blocks) → init (populate select, loadBlock(0)) → loadBlock fills header/explanation and preloads MC/Write/Sentence from blocks[currentBlockIndex].**

---

## 10. Architectural issues and risks

1. **Toast DOM missing (English):**  
   `showToast()` uses `document.getElementById("toastOverlay")` and `document.getElementById("toastMsg")`. The English (and likely Spanish/Russian) index has CSS for `.toast-overlay` and `.toast` but no elements with `id="toastOverlay"` or `id="toastMsg"`. So the penalty toast never appears (function returns early). **Risk:** Silent failure of feedback on fail.

2. **No array support in loader:**  
   One script can only contribute one block. A file that sets `window.exerciseData = [ex1, ex2, ...]` would push one array as one block and break the UI (block.title etc. would be undefined). **Risk:** Cannot merge multiple exercises into one file without changing the loader.

3. **Triplicated app logic:**  
   English, Spanish, and Russian each have their own `index.html` and `js/app.js` with the same structure and slight differences (manifest parsing in Russian, TTS lang in each). **Risk:** Bug fixes and features must be applied in three places; easy to diverge.

4. **Global mutation and order dependency:**  
   Exercise scripts rely on global `window.exerciseData` and run in sequence; the loader clears it after each push. Any other script or extension that sets `window.exerciseData` between loads could inject or reorder data. **Risk:** Fragile in environments with other scripts.

5. **No validation of exercise shape:**  
   The loader only checks `window.exerciseData` truthy. If an exercise omits `vocab` or `sentences`, or uses wrong keys, the UI will hit undefined/null at runtime (e.g. “Для цієї вправи поки немає слів”). **Risk:** Runtime errors or empty screens instead of clear load-time errors.

6. **GAME.stage mutated in loadBlock:**  
   `loadBlock()` overwrites `GAME.stage.mc.needCorrect`, `GAME.stage.write.needCorrect`, `GAME.stage.sent.needCorrect` from the current block’s vocab/sentences length (with scaling). So global game config depends on the last loaded block. **Risk:** Switching blocks can leave needCorrect out of sync if not recalculated elsewhere; first block’s values depend on load order.

7. **Sync script loading:**  
   Scripts are appended one-by-one and awaited; each blocks the next. Many exercises mean many sequential network requests. **Risk:** Slow first load when manifest has many files.

8. **Russian manifest shape differs:**  
   Russian accepts `{ exercises: [...] }`; English and Spanish expect a bare array. **Risk:** Copy-paste or shared tooling could break one of the apps if manifest format is assumed to be the same everywhere.

9. **No cleanup on navigation:**  
   If the app were later converted to a SPA or multiple “pages”, there is no teardown of timers (e.g. `autoNextTimeout`), listeners, or state. **Risk:** For current single-page use this is acceptable; for future SPA it could cause leaks.

10. **Hardcoded UI language:**  
    All labels and messages are in Ukrainian (english/spanish) or Spanish (russian) inside HTML and JS. **Risk:** Adding another UI language requires editing many strings and possibly duplicating HTML or introducing a simple i18n layer.

---

**End of report.**
