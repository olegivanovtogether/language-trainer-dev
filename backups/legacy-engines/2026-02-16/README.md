# Legacy per-course engines backup — 2026-02-16

## What was moved and why

The three course-specific engine files were **moved here** as part of the shared-engine refactor:

| Original path | Backup filename |
|---------------|-----------------|
| `english/js/app.js`  | `english_app.js`  |
| `spanish/js/app.js`  | `spanish_app.js`  |
| `russian/js/app.js`  | `russian_app.js`  |

They were replaced by:

- **One shared engine:** `shared/js/app.js` — used by all three courses. It reads UI language and TTS from `window.COURSE_CONFIG` and loads exercises from the **current course folder** (derived from `window.location.pathname`).
- **Per-course config:** Each course now has `js/course_config.js` that sets `window.COURSE_CONFIG` (e.g. `uiLang`, `ttsLang`, `ttsEnabled`, and all `ui` strings for that course’s interface).

Entry pages (`english/index.html`, `spanish/index.html`, `russian/index.html`) were updated to load:

1. `js/course_config.js`
2. `../shared/js/app.js`

**Exercises were not changed.** All `*/exercises/ex*.js` and `*/exercises/manifest.json` are untouched.

## How to rollback

**Option A — Restore script tags only (keep shared engine):**  
No change needed; the shared engine is the only engine in use. To revert to the old behavior you must restore the legacy files and script tags.

**Option B — Full rollback to legacy engines:**

1. Copy the files from this folder back to their original locations:
   - `english_app.js` → `english/js/app.js`
   - `spanish_app.js` → `spanish/js/app.js`
   - `russian_app.js` → `russian/js/app.js`

2. In each of `english/index.html`, `spanish/index.html`, and `russian/index.html`, replace:
   ```html
   <script src="js/course_config.js"></script>
   <script src="../shared/js/app.js"></script>
   ```
   with:
   ```html
   <script src="js/app.js"></script>
   ```

3. Optionally remove or keep `js/course_config.js` in each course (legacy app.js does not use it).

After rollback, each course will again use its own engine and load exercises from its own `exercises/` folder via `document.currentScript.src` (as before).
