# Language Trainer Project - Structural Report

**Generated:** 2025-01-27  
**Scope:** Complete project analysis without modifications

---

## 1. File Structure

### 1.1 Folder Tree

```
language-trainer/
├── english/
│   ├── index.html
│   ├── js/
│   │   └── course_config.js
│   └── exercises/
│       ├── manifest.json
│       ├── ex1.js
│       └── ex2.js
├── spanish/
│   ├── index.html
│   ├── js/
│   │   └── course_config.js
│   └── exercises/
│       ├── manifest.json
│       ├── ex1.js through ex15.js (15 files)
├── russian/
│   ├── index.html
│   ├── js/
│   │   └── course_config.js
│   └── exercises/
│       ├── manifest.json
│       ├── ex1.js
│       ├── ex2.js
│       └── ex3.js
├── shared/
│   ├── js/
│   │   ├── app.js (main engine, ~1439 lines)
│   │   └── modal-safety.js (safety reset script)
│   └── css/
│       ├── app.css (shared styles, ~88 lines)
│       ├── theme-cyberpunk.css (cyberpunk theme, ~549 lines)
│       └── theme-classic.css (mac/classic theme, ~228 lines)
├── backups/
│   └── legacy-engines/
│       └── 2026-02-16/ (old versions)
├── source/ (source files)
└── tts-test/ (test files)
```

### 1.2 HTML Files (5 total)

1. `english/index.html` - English course entry point
2. `spanish/index.html` - Spanish course entry point
3. `russian/index.html` - Russian course entry point
4. `tts-test/index.html` - Test file
5. `source/Spanish_SER_ESTAR_Game_UA_ES_TTS_SEQ_PENALTY_v4.html` - Source template

### 1.3 CSS Files (3 total)

1. `shared/css/app.css` - Shared/base styles (~88 lines)
2. `shared/css/theme-cyberpunk.css` - Cyberpunk theme styles (~549 lines)
3. `shared/css/theme-classic.css` - Mac/Classic theme styles (~228 lines)

### 1.4 JavaScript Files (27 total)

**Core Engine:**
- `shared/js/app.js` - Main shared engine (~1439 lines)
- `shared/js/modal-safety.js` - Modal safety reset script

**Course Configs:**
- `english/js/course_config.js`
- `spanish/js/course_config.js`
- `russian/js/course_config.js`

**Exercise Files:**
- English: `ex1.js`, `ex2.js` (2 files)
- Spanish: `ex1.js` through `ex15.js` (15 files)
- Russian: `ex1.js`, `ex2.js`, `ex3.js` (3 files)

**Legacy/Backups:**
- `backups/legacy-engines/2026-02-16/english_app.js`
- `backups/legacy-engines/2026-02-16/spanish_app.js`
- `backups/legacy-engines/2026-02-16/russian_app.js`

---

## 2. UI Architecture

### 2.1 Main Containers

**HTML Structure (from `english/index.html`):**

```html
<body>
  <h1>English A0 – тренажер</h1>
  <div class="subtitle">...</div>
  
  <!-- Top Panel (can be hidden during exercises) -->
  <div id="topPanel">
    <div class="warning">...</div>
    <div class="top-row">
      <div class="block-selector-label">...</div>
      <select id="block-select"></select>
    </div>
    <div class="block-header">
      <div class="block-title" id="block-title"></div>
    </div>
    <div class="block-progress">
      <span class="progress-dot"></span>
      <span id="block-progress-text"></span>
    </div>
  </div>
  
  <button id="btn-topPanel">Показати панель</button>
  
  <!-- Exercise Step Indicator -->
  <div class="exercise-step" id="exercise-step"></div>
  
  <!-- Stage Progress Bar -->
  <div id="stage-bar-wrap">
    <div id="stage-bar"></div>
  </div>
  
  <!-- Explanation Toggle -->
  <div class="toggle-explain-row">
    <button id="btn-toggle-explain">Сховати пояснення</button>
  </div>
  
  <!-- Explanation Block -->
  <div id="explain" class="explain"></div>
  
  <!-- Exercise Cards (3 types) -->
  <div id="ex1" class="card" style="display:none;">...</div>
  <div id="ex2" class="card" style="display:none;">...</div>
  <div id="ex3" class="card" style="display:none;">...</div>
  
  <!-- Navigation -->
  <div class="next-ex-btn-wrap">
    <button id="btn-restart">...</button>
    <button id="btn-next-ex">...</button>
  </div>
  
  <div id="stats" class="stats"></div>
  
  <div class="nav-buttons">
    <button id="btn-prev">...</button>
    <button id="btn-next">...</button>
  </div>
  
  <!-- General Modal (for game modals) -->
  <div id="modalOverlay" class="modal-overlay" role="dialog" aria-modal="true" aria-hidden="true" hidden>
    <div class="modal">
      <h2 id="modalTitle">Готово</h2>
      <p id="modalText"></p>
      <div class="modal-actions">
        <button id="modalSecondary">...</button>
        <button id="modalPrimary" class="primary">...</button>
        <button id="modalTertiary" class="secondary">...</button>
      </div>
    </div>
  </div>
</body>
```

### 2.2 Settings Modal Implementation

**STATUS: NOT IMPLEMENTED**

The codebase does **NOT** contain a settings modal implementation. Evidence:

1. **No `#settingsModal` element** in any HTML file
2. **No `#btnSettings` (gear button)** in HTML or JS
3. **No `openSettingsModal()` or `closeSettingsModal()` functions** in `app.js`
4. **`modal-safety.js` references `settingsModal`** but the element doesn't exist:
   ```javascript
   // Line 9: var modal = document.getElementById("settingsModal");
   // This will always return null
   ```

**What EXISTS instead:**

- `createTopToolbar()` function (line 1291) creates:
  - Course selector (`#course-select`)
  - Theme button (`#btn-theme`)
  - Dev mode button (`#btn-dev-mode`)
  - All appended to `#app-toolbar` div
  - Toolbar inserted before `#topPanel` or at start of body

### 2.3 Gear Button

**STATUS: DOES NOT EXIST**

- No gear button (`#btnSettings`) in codebase
- No settings modal infrastructure
- Conversation history mentions settings modal work, but code was reverted/removed

### 2.4 Modal System

**General Modal (`#modalOverlay`):**

- **Location:** Last child of `<body>` in all HTML files
- **Structure:**
  ```html
  <div id="modalOverlay" class="modal-overlay" hidden>
    <div class="modal">
      <h2 id="modalTitle">...</h2>
      <p id="modalText">...</p>
      <div class="modal-actions">...</div>
    </div>
  </div>
  ```
- **Functions:** `openModal(opts)` and `closeModal()` in `app.js` (lines 568-596)
- **Usage:** Game modals (victory, stage completion, resume, dev mode confirmations)

---

## 3. CSS Architecture

### 3.1 Theme Files

**Theme System:**
- **2 themes:** `cyberpunk` (default) and `classic` (Mac-style)
- **Storage:** `localStorage.getItem("ui-theme")`
- **Default:** `"cyberpunk"` if not set
- **Body class:** `body.theme-cyberpunk` applied via `updateThemeBodyClass()`

### 3.2 CSS File Breakdown

#### `shared/css/app.css` (~88 lines)

**Purpose:** Theme-independent shared styles

**Key Sections:**
1. **Minimal UI Mode** (lines 1-87)
   - `.btn-minimal-toggle` - Toggle button in card headers
   - `body.ui-minimal` - Hides UI noise, shows HUD + exercise cards
   - `#hudBar` - HUD container for minimal mode

**NOTABLE:** No modal overlay or settings modal CSS in this file

#### `shared/css/theme-cyberpunk.css` (~549 lines)

**Purpose:** Cyberpunk theme styling

**Key Sections:**
1. **CSS Variables** (`:root`, lines 2-22)
   - `--neon-cyan`, `--neon-magenta`, `--neon-green`
   - `--dark-bg`, `--panel-bg`, `--panel-border`
   - UI color variables

2. **Glyph Matrix** (lines 18-34)
   - `#cp-matrix` - Fullscreen animation container
   - Only visible when `body.theme-cyberpunk`

3. **Z-Index Rules** (lines 44-47)
   ```css
   body.theme-cyberpunk > *:not(#modalOverlay):not(#cp-matrix) {
     position: relative;
     z-index: 5;
   }
   ```
   **ISSUE:** Doesn't exclude `#settingsModal` (but it doesn't exist anyway)

4. **Modal Overlay** (lines 353-365)
   ```css
   .modal-overlay,
   #modalOverlay {
     position: fixed;
     inset: 0;
     background: #0a0a12;
     z-index: 9998;
     display: none;  /* Always hidden by default */
     align-items: center;
     justify-content: center;
     padding: 16px;
   }
   ```
   **ISSUE:** Uses `display: none` instead of `[hidden]` attribute handling

5. **Modal** (lines 367-373)
   ```css
   .modal {
     position: relative;  /* NOT fixed/centered */
     z-index: 9999;
     background: var(--panel-bg);
     border: 1px solid var(--neon-cyan);
   }
   ```
   **ISSUE:** Modal is `position: relative`, not centered independently

6. **Body Scroll Lock** (lines 376-378)
   ```css
   body.modal-open {
     overflow: hidden;
   }
   ```

#### `shared/css/theme-classic.css` (~228 lines)

**Purpose:** Mac/Classic theme styling

**Key Sections:**
1. **CSS Variables** (`:root`, lines 2-21)
   - `--accent`, `--accent-soft`, `--card-bg`
   - UI color variables

2. **Modal Overlay** (lines 179-198)
   ```css
   .modal-overlay,
   #modalOverlay {
     position: fixed;
     inset: 0;
     background: [gradient layers];
     z-index: 9998;
     display: none;  /* Always hidden by default */
     align-items: center;
     justify-content: center;
     padding: 16px;
   }
   ```
   **ISSUE:** Same as cyberpunk - uses `display: none` instead of `[hidden]`

3. **Modal** (lines 200-210)
   ```css
   .modal {
     position: relative;  /* NOT fixed/centered */
     z-index: 9999;
     background: rgba(255, 255, 255, 0.85);
     backdrop-filter: blur(20px);
   }
   ```
   **ISSUE:** Same as cyberpunk - `position: relative`

4. **Body Scroll Lock** (lines 213-215)
   ```css
   body.modal-open {
     overflow: hidden;
   }
   ```

5. **Mac Theme Overlay** (lines 241-245)
   ```css
   body.theme-mac .modal-overlay,
   body.theme-classic .modal-overlay {
     background: rgba(255, 255, 255, 0.75);
     backdrop-filter: blur(14px);
   }
   ```

### 3.3 CSS Selectors Summary

**Modal Overlay:**
- `.modal-overlay` - Class selector
- `#modalOverlay` - ID selector
- Both defined in `theme-cyberpunk.css` and `theme-classic.css`
- **Conflict:** Both files define same selectors with different styles

**Modal Window:**
- `.modal` - Class selector
- Defined in both theme files
- **Issue:** `position: relative` means it relies on overlay flexbox centering

**Settings Modal:**
- **DOES NOT EXIST** - No CSS rules found

**Gear Button:**
- **DOES NOT EXIST** - No CSS rules found

**Exercise Panel:**
- `#topPanel` - Main top panel container
- `#ex1`, `#ex2`, `#ex3` - Exercise card containers
- `#hudBar` - HUD bar (created dynamically)

### 3.4 Duplicated/Conflicting Rules

1. **Modal Overlay:**
   - Defined in BOTH `theme-cyberpunk.css` (line 353) and `theme-classic.css` (line 179)
   - Different background colors/styles
   - Both use `display: none` (conflicts with `[hidden]` attribute)

2. **Modal Window:**
   - Defined in BOTH theme files
   - Both use `position: relative` (not independently centered)

3. **Body Scroll Lock:**
   - Defined in BOTH theme files (lines 376, 213)
   - Identical rules (no conflict, but duplication)

---

## 4. JavaScript Architecture

### 4.1 Main Entry Point

**File:** `shared/js/app.js`  
**Entry:** `loadExercises().then(init);` (line 1437)

**Flow:**
1. `loadExercises()` - Fetches manifest, loads exercise files
2. `init()` - Initializes UI, loads first block

### 4.2 Key Functions

#### Theme Management

**`getTheme()`** (line 192)
- Reads `localStorage.getItem("ui-theme")`
- Returns `"cyberpunk"` or `"classic"`
- Default: `"cyberpunk"`

**`setTheme(name)`** (line 202)
- Saves to `localStorage.setItem("ui-theme", name)`
- Updates `<link id="theme-css">` href
- Calls `updateThemeBodyClass()`
- Starts cyberpunk animation if needed

**`updateThemeBodyClass()`** (line 219)
- Toggles `body.theme-cyberpunk` class
- Only sets cyberpunk class (classic is default/absence)

**`ensureThemeLink()`** (line 223)
- Creates/updates theme CSS link in `<head>`
- Called at module load (line 236)

#### Modal System

**`openModal(opts)`** (line 568)
- Sets modal title, text, button labels
- Sets `modalOverlayEl.style.display = "flex"`
- Sets `modalOverlayEl.setAttribute("aria-hidden", "false")`
- Adds `body.modal-open` class
- **ISSUE:** Uses `style.display` instead of `hidden` attribute

**`closeModal()`** (line 589)
- Sets `modalOverlayEl.style.display = "none"`
- Sets `modalOverlayEl.setAttribute("aria-hidden", "true")`
- Removes `body.modal-open` class
- **ISSUE:** Uses `style.display` instead of `hidden` attribute

**Event Handlers:**
- `modalPrimaryEl` click → calls `onPrimary` callback
- `modalSecondaryEl` click → calls `onSecondary` callback
- `modalTertiaryEl` click → calls `onTertiary` callback
- `modalOverlayEl` click (on overlay itself) → closes modal

#### Minimal/Extended Mode

**`applyMinimalState()`** (line 1209)
- Reads `localStorage.getItem("ui_minimal_mode")`
- Defaults to `"1"` (enabled) if null
- Toggles `body.ui-minimal` class
- Calls `updateMinimalToggleButtons()`

**`setMinimalMode(on)`** (line 1223)
- Saves to `localStorage.setItem("ui_minimal_mode", on ? "1" : "0")`
- Toggles `body.ui-minimal` class
- Calls `updateMinimalToggleButtons()`

**`updateMinimalToggleButtons()`** (line 1229)
- Updates `.btn-minimal-toggle` button labels
- Reads state from `body.classList.contains("ui-minimal")`

**`ensureHudBar()`** (line 1240)
- Creates `#hudBar` container if missing
- Moves progress, exercise-step, stage-bar-wrap into HUD

**`ensureMinimalToggleInCards()`** (line 1258)
- Adds `.btn-minimal-toggle` buttons to `#ex1`, `#ex2`, `#ex3` card headers
- Wires click handlers to toggle minimal mode

#### UI Initialization

**`createTopToolbar()`** (line 1291)
- Creates `#app-toolbar` div
- Adds course selector, theme button, dev mode button
- Inserts before `#topPanel` or at start of body
- **NOTE:** No gear button or settings modal

**`ensureAppStyles()`** (line 1281)
- Creates `<link id="app-styles">` pointing to `shared/css/app.css`
- Appends to `<head>`

**`init()`** (line 1402)
- Calls `ensureAppStyles()`
- Calls `applyMinimalState()`
- Calls `ensureHudBar()`
- Calls `ensureMinimalToggleInCards()`
- Calls `updateThemeBodyClass()`
- Creates cyberpunk matrix container
- Calls `createTopToolbar()`
- Populates block selector
- Loads progress or starts first block

#### Exercise Management

**`loadBlock(index)`** (line 924)
- Sets `currentBlockIndex`, `currentExerciseStep = 0`
- Resets stages and sequences
- Loads block data, fills UI
- Calls `loadMCQuestion()`, `loadWQuestion()`, `loadSentence()`
- Calls `updateExerciseVisibility()`
- Calls `applyMinimalState()` at end

**`updateExerciseVisibility()`** (line 799)
- Shows/hides `#ex1`, `#ex2`, `#ex3` based on `currentExerciseStep`
- Updates exercise step text and button labels
- Calls `updateExplainVisibility()` and `updateGateUI()`

**`updateGateUI()`** (line 763)
- Controls `#topPanel` visibility based on `currentExerciseStep` and `topPanelVisibleInPractice`
- Updates stage progress bar
- Updates exercise step indicator text
- Controls `#btn-next-ex` disabled state

**`nextExerciseStep()`** (line 820)
- Advances `currentExerciseStep` (0 → 1 → 2 → 3)
- Calls `updateExerciseVisibility()`
- Calls `applyMinimalState()` when starting (step 0 → 1)

### 4.3 Settings Modal Functions

**STATUS: DO NOT EXIST**

- No `openSettingsModal()` function
- No `closeSettingsModal()` function
- No `createSettingsModal()` function
- No gear button creation code

**Reference in `modal-safety.js`:**
- Line 5: `function closeSettingsModal()` - tries to close non-existent modal
- Line 9: `document.getElementById("settingsModal")` - will always return `null`

---

## 5. State Management

### 5.1 Theme State

**Storage:** `localStorage.getItem("ui-theme")`  
**Key:** `"ui-theme"`  
**Values:** `"cyberpunk"` or `"classic"`  
**Default:** `"cyberpunk"` (if null/empty)  
**Functions:**
- `getTheme()` - Reads from localStorage
- `setTheme(name)` - Writes to localStorage
- `updateThemeBodyClass()` - Applies `body.theme-cyberpunk` class

**Body Class:**
- `body.theme-cyberpunk` - Applied when theme is cyberpunk
- No `body.theme-classic` class (classic is absence of cyberpunk class)

### 5.2 Minimal Mode State

**Storage:** `localStorage.getItem("ui_minimal_mode")`  
**Key:** `"ui_minimal_mode"`  
**Values:** `"1"` (enabled) or `"0"` (disabled)  
**Default:** `"1"` (enabled) if null  
**Functions:**
- `applyMinimalState()` - Reads and applies state
- `setMinimalMode(on)` - Writes and applies state

**Body Class:**
- `body.ui-minimal` - Applied when minimal mode is enabled

**NOTE:** Code also references `window.UI_STATE` in conversation history, but **DOES NOT EXIST** in current codebase.

### 5.3 Other State

**Progress:**
- Key: `"progress-{course}"` (e.g., `"progress-english"`)
- Stores: block index, step, positions, stage state, XP

**Dev Mode:**
- Key: `"dev-mode"` (from `DEV_MODE_KEY` constant)
- Values: `"1"` (enabled) or not set

**Exercise State:**
- Variables: `currentBlockIndex`, `currentExerciseStep`, `explainVisible`, `topPanelVisibleInPractice`
- Stage state objects: `stageState.mc`, `stageState.write`, `stageState.sent`

---

## 6. Problems Detection

### 6.1 Missing Settings Modal Implementation

**Severity:** CRITICAL  
**Issue:** Settings modal system referenced in `modal-safety.js` but doesn't exist

**Evidence:**
- `modal-safety.js` line 9: `document.getElementById("settingsModal")` - element doesn't exist
- No `#btnSettings` gear button in codebase
- No `openSettingsModal()` or `closeSettingsModal()` functions
- No settings modal HTML structure

**Impact:**
- `modal-safety.js` will fail silently (try/catch prevents errors)
- No way to access settings during exercises
- Settings controls only available via `#app-toolbar` (which may be hidden)

### 6.2 Modal Overlay CSS Conflicts

**Severity:** MEDIUM  
**Issue:** Both theme files define `.modal-overlay` and `#modalOverlay` with different styles

**Location:**
- `theme-cyberpunk.css` line 353: Dark background `#0a0a12`
- `theme-classic.css` line 179: Light gradient background

**Impact:**
- Last-loaded theme CSS wins
- Theme switching may not update overlay appearance correctly
- Both use `display: none` which conflicts with `[hidden]` attribute

### 6.3 Modal Positioning Issues

**Severity:** MEDIUM  
**Issue:** Modal uses `position: relative` instead of `position: fixed`

**Location:**
- `theme-cyberpunk.css` line 367: `.modal { position: relative; }`
- `theme-classic.css` line 201: `.modal { position: relative; }`

**Impact:**
- Modal relies on overlay's flexbox centering
- If overlay positioning changes, modal won't be centered
- Not independently positioned

### 6.4 Hidden Attribute Not Respected

**Severity:** MEDIUM  
**Issue:** CSS uses `display: none` instead of `[hidden]` attribute handling

**Location:**
- `theme-cyberpunk.css` line 361: `display: none;`
- `theme-classic.css` line 194: `display: none;`
- HTML files have `hidden` attribute on `#modalOverlay`

**Impact:**
- `hidden` attribute and CSS `display: none` may conflict
- JavaScript must use `style.display` instead of `hidden` attribute
- Inconsistent API

### 6.5 Top Panel Visibility Logic

**Severity:** LOW  
**Issue:** `#topPanel` hidden during exercises, but `#app-toolbar` (with controls) may also be affected

**Location:**
- `app.js` line 770: `topPanelEl.style.display = topPanelVisibleInPractice ? "block" : "none";`
- `app.js` line 1394: Toolbar inserted before `#topPanel`

**Impact:**
- If toolbar is inside `#topPanel` or affected by same logic, controls disappear
- Current code inserts toolbar before `#topPanel`, so should be safe

### 6.6 Z-Index Rule Missing Settings Modal

**Severity:** LOW (but would be HIGH if settings modal existed)  
**Issue:** Cyberpunk z-index rule doesn't exclude `#settingsModal`

**Location:**
- `theme-cyberpunk.css` line 44: `body.theme-cyberpunk > *:not(#modalOverlay):not(#cp-matrix)`

**Impact:**
- If `#settingsModal` existed, it would get `z-index: 5` instead of higher value
- Currently no impact since element doesn't exist

### 6.7 Modal Safety Script References Non-Existent Elements

**Severity:** LOW  
**Issue:** `modal-safety.js` tries to close `#settingsModal` that doesn't exist

**Location:**
- `modal-safety.js` line 9: `document.getElementById("settingsModal")`

**Impact:**
- Script fails silently (try/catch)
- No actual harm, but misleading code

### 6.8 Duplicate Minimal State Application

**Severity:** LOW  
**Issue:** `applyMinimalState()` called in multiple places with duplicate logic

**Location:**
- `app.js` line 828-835: In `nextExerciseStep()` (duplicate localStorage read)
- `app.js` line 966-973: In `loadBlock()` (duplicate localStorage read)
- `app.js` line 1209-1221: `applyMinimalState()` function definition

**Impact:**
- Code duplication
- Should call `applyMinimalState()` instead of duplicating logic

---

## 7. Summary

### 7.1 What Exists

✅ **General Modal System:**
- `#modalOverlay` element in HTML
- `openModal()` and `closeModal()` functions
- Works for game modals (victory, resume, dev mode)

✅ **Theme System:**
- Two themes: cyberpunk and classic
- Theme switching works
- Body classes applied correctly

✅ **Minimal Mode:**
- Toggle buttons in exercise cards
- HUD bar creation
- UI hiding/showing logic

✅ **Top Toolbar:**
- Course selector
- Theme button
- Dev mode button

### 7.2 What's Missing

❌ **Settings Modal:**
- No `#settingsModal` element
- No `#btnSettings` gear button
- No `openSettingsModal()` function
- No `closeSettingsModal()` function
- Referenced in `modal-safety.js` but doesn't exist

❌ **Persistent Header:**
- No `#appHeader` container
- No `#appHeaderRight` container
- Controls are in `#app-toolbar` which may be affected by panel visibility

### 7.3 Critical Issues

1. **Settings modal completely missing** - Referenced but not implemented
2. **Modal CSS conflicts** - Both themes define same selectors differently
3. **Modal positioning** - Uses `position: relative` instead of `position: fixed`
4. **Hidden attribute** - CSS uses `display: none` instead of respecting `[hidden]`

### 7.4 Recommendations

1. **Implement settings modal** if needed, or remove references from `modal-safety.js`
2. **Consolidate modal CSS** - Move shared styles to `app.css`, theme-specific to theme files
3. **Fix modal positioning** - Use `position: fixed` with centering transforms
4. **Respect hidden attribute** - Use `[hidden]` selector instead of `display: none`
5. **Remove duplicate code** - Consolidate minimal state application logic

---

**Report End**
