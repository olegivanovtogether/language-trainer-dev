/* ====== SHARED ENGINE — course-agnostic; uses window.COURSE_CONFIG ====== */
(function () {
    "use strict";
    if (window.COURSE_CONFIG && window.COURSE_CONFIG.uiLang) {
        try { document.documentElement.lang = window.COURSE_CONFIG.uiLang; } catch (e) { }
    }
    const CFG = window.COURSE_CONFIG || {};
    const ui = CFG.ui || {};

    let blocks = [];

    function getCourseExercisesBaseUrl() {
        const origin = (window.location.origin || "").toString();
        const course = getCurrentCourse();
        const base = getBasePrefix();
        const path = (base ? base + "/" : "") + course + "/exercises/";
        const pathNorm = path.startsWith("/") ? path : "/" + path;
        if (!origin || origin === "null" || origin === "undefined" || window.location.protocol === "file:") {
            var filePrefix = pathnameContainsRoot() ? "../" : "";
            return filePrefix + course + "/exercises/";
        }
        if (isRootFolder()) return origin + "/" + course + "/exercises/";
        return origin + pathNorm;
    }

    function getCurrentCourse() {
        const path = (window.location && window.location.pathname) || "";
        const search = (window.location && window.location.search) || "";
        const params = new URLSearchParams(search);
        const fromParam = params.get("course");
        if (fromParam === "english" || fromParam === "spanish" || fromParam === "russian") {
            return fromParam;
        }
        const normalized = path.replace(/\/index\.html$/i, "").replace(/\/$/, "") || "/";
        const segments = normalized.split("/").filter(Boolean);
        const i = segments.findIndex(function (s) { return s === "english" || s === "spanish" || s === "russian"; });
        return i >= 0 ? segments[i] : "english";
    }

    function getProgressKey() {
        return "progress-" + getCurrentCourse();
    }

    function saveProgress() {
        try {
            if (typeof localStorage === "undefined") return;
            const p = {
                blockIndex: currentBlockIndex,
                step: currentExerciseStep,
                mcPos: currentVocabIndexMC,
                writePos: currentVocabIndexWrite,
                sentPos: currentSentenceIndex,
                ts: Date.now(),
                seqMC: seq.mc ? seq.mc.pos : 0,
                seqWrite: seq.write ? seq.write.pos : 0,
                seqSent: seq.sent ? seq.sent.pos : 0,
                stageState: {
                    mc: stageState.mc ? { correct: stageState.mc.correct, attempts: stageState.mc.attempts, streak: stageState.mc.streak, lives: stageState.mc.lives, cleared: stageState.mc.cleared, stars: stageState.mc.stars } : { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 },
                    write: stageState.write ? { correct: stageState.write.correct, attempts: stageState.write.attempts, streak: stageState.write.streak, lives: stageState.write.lives, cleared: stageState.write.cleared, stars: stageState.write.stars } : { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 },
                    sent: stageState.sent ? { correct: stageState.sent.correct, attempts: stageState.sent.attempts, streak: stageState.sent.streak, lives: stageState.sent.lives, cleared: stageState.sent.cleared, stars: stageState.sent.stars } : { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 }
                },
                phaseState: {
                    mc: phaseState.mc ? { phase: phaseState.mc.phase, wrongInPhase1: phaseState.mc.wrongInPhase1 ? phaseState.mc.wrongInPhase1.slice() : [], phase2Correct: phaseState.mc.phase2Correct ? phaseState.mc.phase2Correct.slice() : [] } : getDefaultPhaseState(0),
                    write: phaseState.write ? { phase: phaseState.write.phase, wrongInPhase1: phaseState.write.wrongInPhase1 ? phaseState.write.wrongInPhase1.slice() : [], phase2Correct: phaseState.write.phase2Correct ? phaseState.write.phase2Correct.slice() : [] } : getDefaultPhaseState(0)
                },
                lastEncouragementMilestone: { mc: lastEncouragementMilestone.mc, write: lastEncouragementMilestone.write, combined: lastEncouragementMilestone.combined },
                correctSinceRollback: { mc: correctSinceRollback.mc, write: correctSinceRollback.write },
                currentBatchStart: currentBatchStart,
                combinedStagePart: combinedStagePart,
                writeQueue: Array.isArray(writeQueue) ? writeQueue.slice() : [],
                writeQueuePos: writeQueuePos,
                mcBatchPhase: mcBatchPhase,
                mcBatchPos: mcBatchPos,
                writeBatchPhase: writeBatchPhase,
                writeMistakeCounts: Array.isArray(writeMistakeCounts) ? writeMistakeCounts.slice() : [],
                mcMistakeCounts: Array.isArray(mcMistakeCounts) ? mcMistakeCounts.slice() : [],
                remediationActive: !!remediationActive,
                remediationRound: remediationRound,
                remediationWrongThisRound: Array.isArray(remediationWrongThisRound) ? remediationWrongThisRound.slice() : []
            };
            localStorage.setItem(getProgressKey(), JSON.stringify(p));
        } catch (e) { }
    }

    function loadProgress() {
        try {
            if (typeof localStorage === "undefined") return null;
            const raw = localStorage.getItem(getProgressKey());
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) { return null; }
    }

    function clearProgress() {
        try {
            if (typeof localStorage !== "undefined") localStorage.removeItem(getProgressKey());
        } catch (e) { }
    }

    function getResumePreview(progress) {
        const block = blocks[progress.blockIndex];
        if (!block) return "";
        let step = progress.step;
        if (step === 3) step = 2;
        if (step === 1 && block.vocab && block.vocab.length) {
            let pos = Math.max(0, Math.min(progress.mcPos != null ? progress.mcPos : 0, block.vocab.length - 1));
            if (progress.combinedStagePart === "write" && progress.writeQueue && progress.writeQueue.length && progress.writeQueuePos != null && progress.writeQueue[progress.writeQueuePos] != null)
                pos = progress.writeQueue[progress.writeQueuePos];
            return (block.vocab[pos] && block.vocab[pos].ua) ? block.vocab[pos].ua : "";
        }
        if (step === 2 && block.sentences && block.sentences.length) {
            const pos = Math.max(0, Math.min(progress.sentPos || 0, block.sentences.length - 1));
            return (block.sentences[pos] && block.sentences[pos].ua) ? block.sentences[pos].ua : "";
        }
        return "";
    }

    function getValidSavedProgress() {
        const p = loadProgress();
        if (!p || typeof p.blockIndex !== "number" || p.blockIndex < 0 || p.blockIndex >= blocks.length) return null;
        return p;
    }

    function showResumeModal(progress, handlers) {
        const block = blocks[progress.blockIndex];
        if (!block) { loadBlock(0); return; }
        const stageNames = (ui.stageNames && ui.stageNames.length >= 3) ? ui.stageNames : ["Вступ", "Вибір + Вписати", "Речення"];
        let step = progress.step;
        if (step === 3) step = 2;
        const stage = stageNames[step] || ("Етап " + step);
        const preview = getResumePreview(progress);
        let k = 0;
        if (step === 1) {
            if (progress.combinedStagePart === "write" && progress.writeQueuePos != null) k = progress.writeQueuePos + 1;
            else k = (progress.mcPos != null ? progress.mcPos : 0) + 1;
        } else if (step === 2) k = (progress.sentPos || 0) + 1;
        const body = (ui.resumeBodyTemplate || "Продовжити з: {exerciseTitle}\nЕтап: {stage}\nКартка: {k}\n«{preview}»")
            .replace(/\{exerciseTitle\}/g, block.title)
            .replace(/\{stage\}/g, stage)
            .replace(/\{k\}/g, String(k))
            .replace(/\{preview\}/g, preview);
        openModal({
            title: ui.resumeTitle || "Продовжити?",
            text: body,
            primaryText: ui.resumeContinue || "Продовжити",
            secondaryText: ui.resumeRestart || "З початку",
            tertiaryText: "",
            showCloseX: true,
            onPrimary: function () {
                applyResumeState(progress);
                if (handlers && typeof handlers.onContinue === "function") handlers.onContinue(progress);
            },
            onSecondary: function () {
                clearProgress();
                if (handlers && typeof handlers.onRestart === "function") {
                    handlers.onRestart();
                } else {
                    loadBlock(0);
                }
            }
        });
    }

    function promptResumeBeforeExercises(handlers) {
        const p = getValidSavedProgress();
        if (!p) return false;
        showResumeModal(p, handlers || {});
        return true;
    }

    function resumeLatestProgress() {
        const p = getValidSavedProgress();
        if (!p) return false;
        applyResumeState(p);
        return true;
    }

    function hasAnySavedProgress() {
        return !!getValidSavedProgress();
    }

    function applyResumeState(progress) {
        const block = blocks[progress.blockIndex];
        if (!block) { loadBlock(0); return; }
        currentBlockIndex = progress.blockIndex;
        currentExerciseStep = (progress.step === 0) ? 1 : (progress.step === 3 ? 2 : progress.step);
        explainVisible = false;
        const nV = (block.vocab && block.vocab.length) ? block.vocab.length : 0;
        const nS = (block.sentences && block.sentences.length) ? block.sentences.length : 0;
        if (progress.stageState) {
            ["mc", "write", "sent"].forEach(function (k) {
                const saved = progress.stageState[k];
                if (saved && stageState[k]) {
                    stageState[k].correct = saved.correct != null ? saved.correct : 0;
                    stageState[k].attempts = saved.attempts != null ? saved.attempts : 0;
                    stageState[k].streak = saved.streak != null ? saved.streak : 0;
                    stageState[k].lives = saved.lives != null ? saved.lives : getLivesMax(k);
                    stageState[k].cleared = !!saved.cleared;
                    stageState[k].stars = saved.stars != null ? saved.stars : 0;
                }
            });
        } else {
            resetAllStages();
        }
        if (progress.phaseState) {
            if (progress.phaseState.mc) {
                phaseState.mc = {
                    phase: progress.phaseState.mc.phase || 1,
                    wrongInPhase1: Array.isArray(progress.phaseState.mc.wrongInPhase1) ? progress.phaseState.mc.wrongInPhase1.slice() : [],
                    phase2Correct: Array.isArray(progress.phaseState.mc.phase2Correct) ? progress.phaseState.mc.phase2Correct.slice() : []
                };
            }
            if (progress.phaseState.write) {
                phaseState.write = {
                    phase: progress.phaseState.write.phase || 1,
                    wrongInPhase1: Array.isArray(progress.phaseState.write.wrongInPhase1) ? progress.phaseState.write.wrongInPhase1.slice() : [],
                    phase2Correct: Array.isArray(progress.phaseState.write.phase2Correct) ? progress.phaseState.write.phase2Correct.slice() : []
                };
            }
        }
        if (nV > 0) {
            ["mc", "write"].forEach(function (k) {
                const ps = phaseState[k];
                if (ps && ps.phase2Correct) {
                    while (ps.phase2Correct.length < nV) ps.phase2Correct.push(0);
                    if (ps.phase2Correct.length > nV) ps.phase2Correct = ps.phase2Correct.slice(0, nV);
                }
            });
        }
        if (progress.lastEncouragementMilestone) {
            lastEncouragementMilestone.mc = progress.lastEncouragementMilestone.mc != null ? progress.lastEncouragementMilestone.mc : 0;
            lastEncouragementMilestone.write = progress.lastEncouragementMilestone.write != null ? progress.lastEncouragementMilestone.write : 0;
            lastEncouragementMilestone.combined = progress.lastEncouragementMilestone.combined != null ? progress.lastEncouragementMilestone.combined : 0;
        }
        if (progress.correctSinceRollback) {
            correctSinceRollback.mc = progress.correctSinceRollback.mc != null ? progress.correctSinceRollback.mc : 0;
            correctSinceRollback.write = progress.correctSinceRollback.write != null ? progress.correctSinceRollback.write : 0;
        }
        if (progress.currentBatchStart != null) currentBatchStart = Math.max(0, progress.currentBatchStart);
        combinedStagePart = (progress.combinedStagePart === "write") ? "write" : "mc";
        writeQueue = Array.isArray(progress.writeQueue) ? progress.writeQueue.slice() : [];
        writeQueuePos = Math.max(0, (progress.writeQueuePos != null ? progress.writeQueuePos : 0));
        if (progress.mcBatchPhase != null) mcBatchPhase = progress.mcBatchPhase;
        if (progress.mcBatchPos != null) mcBatchPos = Math.max(0, progress.mcBatchPos);
        if (progress.writeBatchPhase != null) writeBatchPhase = progress.writeBatchPhase;
        writeMistakeCounts = Array.isArray(progress.writeMistakeCounts) ? progress.writeMistakeCounts.slice() : [];
        while (writeMistakeCounts.length < nV) writeMistakeCounts.push(0);
        if (writeMistakeCounts.length > nV) writeMistakeCounts = writeMistakeCounts.slice(0, nV);
        mcMistakeCounts = Array.isArray(progress.mcMistakeCounts) ? progress.mcMistakeCounts.slice() : [];
        while (mcMistakeCounts.length < nV) mcMistakeCounts.push(0);
        if (mcMistakeCounts.length > nV) mcMistakeCounts = mcMistakeCounts.slice(0, nV);
        remediationActive = !!progress.remediationActive;
        remediationRound = Math.max(0, progress.remediationRound != null ? progress.remediationRound : 0);
        remediationWrongThisRound = Array.isArray(progress.remediationWrongThisRound) ? progress.remediationWrongThisRound.slice() : [];
        if (phaseState.mc) phaseState.mc.phase = (mcBatchPhase === 2) ? 2 : 1;
        if (phaseState.write) phaseState.write.phase = (writeBatchPhase === 2) ? 2 : 1;
        lastVocabIndexMC = -1;
        lastVocabIndexWrite = -1;
        lastSentenceIndex = -1;
        resetSeq("mc", nV);
        resetSeq("write", nV);
        resetSeq("sent", nS);
        const seqMC = progress.seqMC !== undefined ? progress.seqMC : (progress.mcPos != null ? progress.mcPos : 0);
        const seqWrite = progress.seqWrite !== undefined ? progress.seqWrite : (progress.writePos != null ? progress.writePos : 0);
        const seqSent = progress.seqSent !== undefined ? progress.seqSent : (progress.sentPos != null ? progress.sentPos : 0);
        seq.mc.pos = Math.max(0, Math.min(seqMC, nV));
        seq.mc.last = -1;
        seq.write.pos = Math.max(0, Math.min(seqWrite, nV));
        seq.write.last = -1;
        seq.sent.pos = Math.max(0, Math.min(seqSent, nS));
        seq.sent.last = -1;
        if (nV > 0) {
            GAME.stage.mc.needCorrect = nV * 4;
            GAME.stage.write.needCorrect = nV * 4;
        }
        if (nS > 0) GAME.stage.sent.needCorrect = nS * 4;
        while (writeMistakeCounts.length < nV) writeMistakeCounts.push(0);
        if (writeMistakeCounts.length > nV) writeMistakeCounts = writeMistakeCounts.slice(0, nV);
        while (mcMistakeCounts.length < nV) mcMistakeCounts.push(0);
        if (mcMistakeCounts.length > nV) mcMistakeCounts = mcMistakeCounts.slice(0, nV);
        const total = blocks.length;
        blockTitleEl.textContent = (ui.blockTitlePrefix || "Вправа ") + (currentBlockIndex + 1) + (ui.blockTitleSuffix || ". ") + block.title;
        blockProgressTextEl.textContent = (ui.blockTitlePrefix || "Вправа ") + (currentBlockIndex + 1) + (ui.blockProgressOf || " з ") + total;
        explainEl.innerHTML = (block.topicTag ? "<div class=\"topic-tag\">" + block.topicTag + "</div>" : "") + (block.explanation || "");
        blockSelectEl.value = String(currentBlockIndex);
        if (btnPrev) btnPrev.disabled = currentBlockIndex === 0;
        if (btnNext) btnNext.disabled = currentBlockIndex === total - 1;
        mcFeedbackEl.textContent = "";
        mcFeedbackEl.className = "feedback";
        wFeedbackEl.textContent = "";
        wFeedbackEl.className = "feedback";
        sFeedbackEl.textContent = "";
        sFeedbackEl.className = "feedback";
        ensureStatsForBlock(currentBlockIndex);
        updateStatsView();
        updateExerciseVisibility();
        if (currentExerciseStep === 1) {
            if (combinedStagePart === "write") loadWQuestion();
            else loadMCQuestion();
        } else if (currentExerciseStep === 2) loadSentence();
        updateGateUI();
    }

    function resumeProgressForBlock(blockIndex) {
        const idx = parseInt(blockIndex, 10);
        if (isNaN(idx)) return false;
        const p = getValidSavedProgress();
        if (!p || p.blockIndex !== idx) return false;
        applyResumeState(p);
        return true;
    }

    function hasSavedProgressForBlock(blockIndex) {
        const idx = parseInt(blockIndex, 10);
        if (isNaN(idx)) return false;
        const p = getValidSavedProgress();
        return !!(p && p.blockIndex === idx);
    }

    function getSavedProgressBlockIndex() {
        const p = getValidSavedProgress();
        if (!p || typeof p.blockIndex !== "number") return -1;
        return p.blockIndex;
    }

    function getExercisePreviewData(blockIndex) {
        const idx = parseInt(blockIndex, 10);
        if (isNaN(idx) || idx < 0 || idx >= blocks.length) return null;
        const block = blocks[idx];
        if (!block) return null;
        return {
            title: (ui.blockTitlePrefix || "Вправа ") + (idx + 1) + (ui.blockTitleSuffix || ". ") + (block.title || ""),
            explanationHtml: (block.topicTag ? "<div class=\"topic-tag\">" + block.topicTag + "</div>" : "") + (block.explanation || "")
        };
    }

    function getBasePrefix() {
        const path = (window.location && window.location.pathname) || "";
        const search = (window.location && window.location.search) || "";
        const params = new URLSearchParams(search);
        const hasCourseParam = (params.get("course") === "english" || params.get("course") === "spanish" || params.get("course") === "russian");
        if (hasCourseParam) {
            const dir = path.replace(/\/[^/]*$/, "").replace(/\/$/, "") || "";
            return dir === "" ? "" : (dir.charAt(0) === "/" ? dir : "/" + dir);
        }
        const normalized = path.replace(/\/index\.html$/i, "").replace(/\/$/, "") || "/";
        const segments = normalized.split("/").filter(Boolean);
        const i = segments.findIndex(function (s) { return s === "english" || s === "spanish" || s === "russian"; });
        if (i < 0 || i === 0) return "";
        return "/" + segments.slice(0, i).join("/");
    }

    function isRootFolder() {
        var b = getBasePrefix();
        if (!b) return false;
        var n = b.replace(/\/$/, "");
        return n === "root" || n.endsWith("/root");
    }

    function pathnameContainsRoot() {
        var p = (window.location && window.location.pathname) || "";
        return p.indexOf("root") >= 0;
    }

    var AVAILABLE_THEMES = ["classic", "cyberpunk", "kawaii"];

    function getTheme() {
        try {
            var name = typeof localStorage !== "undefined" ? localStorage.getItem("ui-theme") : null;
            if (!name || (typeof name === "string" && name.trim() === "")) return "cyberpunk";
            return AVAILABLE_THEMES.indexOf(name) >= 0 ? name : "cyberpunk";
        } catch (e) {
            return "cyberpunk";
        }
    }

    function setTheme(name) {
        try {
            if (typeof localStorage !== "undefined") localStorage.setItem("ui-theme", name);
        } catch (e) { }
        var link = document.getElementById("theme-css");
        if (link) link.href = getThemeCssHref(name);
        updateThemeBodyClass();
        if (name === "cyberpunk" && typeof cpScheduleNext === "function") {
            if (typeof window.matchMedia === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                if (!cpScheduleTimer) cpScheduleNext();
            }
        }
    }

    function getThemeCssHref(themeName) {
        var theme = themeName || getTheme();
        var origin = (window.location.origin || "").toString();
        var base = getBasePrefix();
        if (!origin || origin === "null" || origin === "undefined" || window.location.protocol === "file:") {
            var filePrefix = pathnameContainsRoot() ? "../" : "";
            var rel = filePrefix + "shared/css/theme-" + theme + ".css";
            return rel;
        }
        if (isRootFolder()) return origin + "/shared/css/theme-" + theme + ".css";
        return origin + (base ? base + "/" : "/") + "shared/css/theme-" + theme + ".css";
    }

    function updateThemeBodyClass() {
        var theme = getTheme();
        document.body.classList.toggle("theme-cyberpunk", theme === "cyberpunk");
        document.body.classList.toggle("theme-kawaii", theme === "kawaii");
        var hearts = document.getElementById("kawaii-hearts");
        if (hearts) hearts.style.display = theme === "kawaii" ? "block" : "none";
    }

    function ensureThemeLink() {
        var link = document.getElementById("theme-css");
        if (!link) {
            link = document.createElement("link");
            link.id = "theme-css";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        link.href = getThemeCssHref();
    }

    ensureThemeLink();

    var CP_GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ0123456789#$%&*";
    var MAX_STREAMS_TOTAL = 40;
    var cpStreamCount = 0;
    var cpScheduleTimer = null;
    var cpSpawnLogged = false;
    var KAWAII_HEARTS_COUNT = 18;

    function createCyberpunkMatrixContainer() {
        if (document.getElementById("cp-matrix")) return;
        var matrix = document.createElement("div");
        matrix.id = "cp-matrix";
        matrix.setAttribute("aria-hidden", "true");
        matrix.style.display = "none";
        document.body.appendChild(matrix);
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function ensureKawaiiHearts() {
        if (document.getElementById("kawaii-hearts")) return;
        var wrap = document.createElement("div");
        wrap.id = "kawaii-hearts";
        wrap.setAttribute("aria-hidden", "true");
        wrap.style.cssText = "display:none;position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden;";
        var symbols = ["\u2764", "\u2661", "\u2665"];
        for (var i = 0; i < KAWAII_HEARTS_COUNT; i++) {
            var heart = document.createElement("span");
            heart.className = "kh-heart";
            heart.textContent = symbols[i % symbols.length];
            heart.style.setProperty("--x", randomBetween(2, 98).toFixed(2) + "vw");
            heart.style.setProperty("--y", randomBetween(2, 96).toFixed(2) + "vh");
            heart.style.setProperty("--dx", randomBetween(-22, 22).toFixed(2) + "px");
            heart.style.setProperty("--dy", randomBetween(-16, 16).toFixed(2) + "px");
            heart.style.setProperty("--size", randomBetween(12, 36).toFixed(0) + "px");
            heart.style.setProperty("--dur", randomBetween(5.0, 11.0).toFixed(2) + "s");
            heart.style.setProperty("--spin", randomBetween(8.0, 17.0).toFixed(2) + "s");
            heart.style.setProperty("--pulse", randomBetween(2.0, 4.6).toFixed(2) + "s");
            heart.style.setProperty("--delay", (-randomBetween(0, 12)).toFixed(2) + "s");
            heart.style.setProperty("--alpha", randomBetween(0.16, 0.48).toFixed(2));
            wrap.appendChild(heart);
        }
        document.body.appendChild(wrap);
    }

    function cpRandomGlyphString(len) {
        var s = "";
        for (var i = 0; i < len; i++) s += CP_GLYPHS[Math.floor(Math.random() * CP_GLYPHS.length)];
        return s;
    }

    function cpSpawnStream() {
        var theme = getTheme();
        if (theme !== "cyberpunk") return;
        if (typeof window.matchMedia !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (document.hidden) return;
        if (cpStreamCount >= MAX_STREAMS_TOTAL) return;
        var matrix = document.getElementById("cp-matrix");
        if (!matrix || matrix.parentNode !== document.body) return;
        var vertical = Math.random() < 0.8;
        var len = vertical ? (18 + Math.floor(Math.random() * 23)) : (14 + Math.floor(Math.random() * 15));
        var el = document.createElement("span");
        el.className = "cp-stream " + (vertical ? "cp-vert" : "cp-horiz");
        var text = cpRandomGlyphString(len);
        el.dataset.text = text;
        el.textContent = text;
        var duration = (Math.random() * 5 + 6).toFixed(2);
        el.style.setProperty("--dur", duration + "s");
        el.style.setProperty("--flow", (Math.random() * 1.2 + 0.9).toFixed(2) + "s");
        el.style.setProperty("--baseOp", (Math.random() * 0.06 + 0.06).toFixed(2));
        el.style.setProperty("--hiOp", (Math.random() * 0.35 + 0.35).toFixed(2));
        el.style.fontSize = (Math.random() * 10 + 12).toFixed(0) + "px";
        if (vertical) {
            el.style.left = (Math.random() * 100).toFixed(2) + "vw";
            el.style.top = "-25vh";
        } else {
            el.style.top = (Math.random() * 100).toFixed(2) + "vh";
            el.style.left = "-35vw";
        }
        cpStreamCount++;
        el.addEventListener("animationend", function () {
            if (el.parentNode) el.parentNode.removeChild(el);
            cpStreamCount--;
        });
        matrix.appendChild(el);
        if (typeof isDevMode === "function" && isDevMode() && !cpSpawnLogged) {
            cpSpawnLogged = true;
            console.log("[cp] spawn active", { theme: theme, count: cpStreamCount });
        }
    }

    function cpScheduleNext() {
        if (typeof window.matchMedia !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (getTheme() !== "cyberpunk") return;
        cpScheduleTimer = setTimeout(function () {
            cpSpawnStream();
            cpScheduleNext();
        }, 420);
    }

    function cpOnVisibilityChange() {
        if (document.hidden) {
            if (cpScheduleTimer) { clearTimeout(cpScheduleTimer); cpScheduleTimer = null; }
        } else {
            if (!cpScheduleTimer && getTheme() === "cyberpunk") cpScheduleNext();
        }
    }

    var DEV_MODE_KEY = "dev-mode-enabled";
    var DEV_CODE = "19337";

    function isDevMode() {
        try {
            return (typeof localStorage !== "undefined" && localStorage.getItem(DEV_MODE_KEY)) === "1";
        } catch (e) {
            return false;
        }
    }

    function setDevMode(enabled) {
        try {
            if (typeof localStorage !== "undefined") localStorage.setItem(DEV_MODE_KEY, enabled ? "1" : "0");
        } catch (e) { }
        if (enabled) document.body.classList.add("dev-mode"); else document.body.classList.remove("dev-mode");
        if (typeof updateGateUI === "function") updateGateUI();
    }

    function loadScript(src, callback) {
        const script = document.createElement("script");
        script.src = src;
        script.onload = function () { callback(true); };
        script.onerror = function () { callback(false); };
        document.head.appendChild(script);
    }

    async function loadExercises() {
        const dir = getCourseExercisesBaseUrl();
        const manifestUrl = dir + "manifest.json";

        function loadOne(fileName) {
            return new Promise(function (resolve) {
                loadScript(dir + fileName, function (success) {
                    if (success && window.exerciseData) {
                        blocks.push(window.exerciseData);
                        window.exerciseData = null;
                    }
                    resolve(success);
                });
            });
        }

        try {
            const res = await fetch(manifestUrl);
            if (!res.ok) throw new Error("manifest not ok");
            const fileList = await res.json();
            if (!Array.isArray(fileList)) throw new Error("manifest not array");
            for (let i = 0; i < fileList.length; i++) {
                await loadOne(fileList[i]);
            }
        } catch (e) {
            let n = 1;
            while (true) {
                const ok = await loadOne("ex" + n + ".js");
                if (!ok) break;
                n++;
            }
        }
    }

    const GAME = {
        livesPerStage: 3,
        stage: {
            mc: { needCorrect: 5, minAccuracy: 0.70 },
            write: { needCorrect: 5, minAccuracy: 0.70 },
            sent: { needCorrect: 3, minAccuracy: 0.60 }
        },
        stars: { two: 0.85, three: 0.95, streakForThree: 5 }
    };

    let gameXP = 0;
    let stageState = {
        mc: { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 },
        write: { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 },
        sent: { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 }
    };

    function getDefaultPhaseState(n) {
        const arr = [];
        for (let i = 0; i < n; i++) arr.push(0);
        return { phase: 1, wrongInPhase1: [], phase2Correct: arr };
    }
    let phaseState = {
        mc: getDefaultPhaseState(0),
        write: getDefaultPhaseState(0)
    };
    let lastEncouragementMilestone = { mc: 0, write: 0, combined: 0 };
    let correctSinceRollback = { mc: 0, write: 0 };

    let currentBlockIndex = 0;
    let currentExerciseStep = 0;
    let explainVisible = true;
    let lastVocabIndexMC = -1;
    let lastVocabIndexWrite = -1;
    let lastSentenceIndex = -1;
    let topPanelVisibleInPractice = true;
    let autoNextTimeout = null;
    let wrongAttemptsMC = 0;
    let wrongAttemptsWrite = 0;
    let wrongAttemptsSent = 0;
    let currentVocabIndexMC = 0;
    let currentVocabIndexWrite = 0;
    let currentSentenceIndex = 0;
    let currentBatchStart = 0;
    let combinedStagePart = "mc";
    let writeQueue = [];
    let writeQueuePos = 0;
    let mcBatchPhase = 1;
    let mcBatchPos = 0;
    let writeBatchPhase = 1;
    let writeMistakeCounts = [];
    let mcMistakeCounts = [];
    let remediationActive = false;
    let remediationRound = 0;
    let remediationWrongThisRound = [];
    const remediationMaxRounds = 3;
    const stats = {};

    function getNFor(kind) {
        const b = blocks[currentBlockIndex];
        if (kind === "sent") return (b && b.sentences && b.sentences.length) ? b.sentences.length : 0;
        return (b && b.vocab && b.vocab.length) ? b.vocab.length : 0;
    }
    function getLivesMax(kind) {
        const n = getNFor(kind);
        return (n < 10) ? 3 : 5;
    }
    function getRollbackSteps(kind) {
        const n = getNFor(kind);
        return (n < 10) ? 3 : 5;
    }
    function getBatchSize(n) { return (n >= 10) ? 5 : 3; }
    function getMcBatchIndices() {
        const n = getNFor("mc");
        if (n <= 0) return [];
        const B = getBatchSize(n);
        const start = currentBatchStart;
        const end = Math.min(start + B, n);
        const arr = [];
        for (let i = start; i < end; i++) arr.push(i);
        return arr;
    }
    function nextIndexMCBatch() {
        const n = getNFor("mc");
        const batchIndices = getMcBatchIndices();
        if (batchIndices.length === 0) return -1;
        ensurePhaseState("mc", n);
        if (mcBatchPos < batchIndices.length) return batchIndices[mcBatchPos];
        return -1;
    }
    function getNextWriteBatchIndex() {
        if (writeQueuePos < writeQueue.length) return writeQueue[writeQueuePos];
        return -1;
    }
    function collectWriteMistakeIndices() {
        const out = [];
        const n = Math.max(writeMistakeCounts.length, mcMistakeCounts.length);
        for (let i = 0; i < n; i++) {
            if ((writeMistakeCounts[i] || 0) > 0 || (mcMistakeCounts[i] || 0) > 0) out.push(i);
        }
        return out;
    }
    function setWriteMistakeIndices(indices) {
        const n = getNFor("write");
        writeMistakeCounts = [];
        mcMistakeCounts = [];
        for (let i = 0; i < n; i++) writeMistakeCounts.push(0);
        for (let i = 0; i < n; i++) mcMistakeCounts.push(0);
        for (let i = 0; i < indices.length; i++) {
            const idx = indices[i];
            if (idx >= 0 && idx < n) {
                writeMistakeCounts[idx] = 1;
                mcMistakeCounts[idx] = 1;
            }
        }
    }
    function collectRoundMistakesUnique() {
        const seen = {};
        const out = [];
        for (let i = 0; i < remediationWrongThisRound.length; i++) {
            const idx = remediationWrongThisRound[i];
            if (!seen[idx]) {
                seen[idx] = true;
                out.push(idx);
            }
        }
        return out;
    }
    function buildMistakesPreview(indices) {
        const block = blocks[currentBlockIndex];
        if (!block || !block.vocab || !block.vocab.length || !indices.length) return "";
        const maxItems = 8;
        const lines = [];
        for (let i = 0; i < indices.length && i < maxItems; i++) {
            const idx = indices[i];
            const card = block.vocab[idx];
            if (card && card.ua) lines.push("• " + card.ua);
        }
        if (indices.length > maxItems) lines.push("… +" + (indices.length - maxItems));
        return lines.join("\n");
    }
    function startRemediationRound(indices) {
        remediationActive = true;
        remediationRound++;
        combinedStagePart = "write";
        writeQueue = indices.slice();
        writeQueuePos = 0;
        writeBatchPhase = 1;
        if (phaseState.write) phaseState.write.phase = 1;
        remediationWrongThisRound = [];
        updateExerciseVisibility();
        loadWQuestion();
        saveProgress();
    }
    function finishRemediationRound() {
        const nextIndices = collectRoundMistakesUnique();
        remediationActive = false;
        remediationWrongThisRound = [];
        combinedStagePart = "write";
        writeQueue = [];
        writeQueuePos = 0;
        writeBatchPhase = 1;
        if (phaseState.write) phaseState.write.phase = 1;
        setWriteMistakeIndices(nextIndices);
        updateExerciseVisibility();
        if (nextIndices.length <= 0) {
            openModal({
                title: ui.remediationDoneTitle || "",
                text: ui.remediationDoneText || "Помилок не залишилось. Можеш перейти до фінального етапу.",
                primaryText: ui.goToStage3 || "Перейти до фінального етапу",
                secondaryText: "",
                tertiaryText: "",
                onPrimary: advanceToFinalStage
            });
            saveProgress();
            return;
        }
        const preview = buildMistakesPreview(nextIndices);
        if (remediationRound >= remediationMaxRounds) {
            openModal({
                title: ui.remediationLaterTitle || "",
                text: (ui.remediationLaterText || "Ще є фрази для практики. Попрацюємо пізніше.\n\n") + preview,
                primaryText: ui.goToStage3 || "Перейти до фінального етапу",
                secondaryText: "",
                tertiaryText: "",
                onPrimary: advanceToFinalStage
            });
            saveProgress();
            return;
        }
        openModal({
            title: ui.remediationContinueTitle || "",
            text: (ui.remediationContinueText || "Є фрази, які варто ще раз пропрацювати:\n\n") + preview,
            primaryText: ui.remediationPracticeBtn || "Опрацювати помилки",
            secondaryText: ui.goToStage3 || "Перейти до фінального етапу",
            tertiaryText: "",
            onPrimary: function () { startRemediationRound(nextIndices); },
            onSecondary: advanceToFinalStage
        });
        saveProgress();
    }

    function showToast(msg) {
        const ov = document.getElementById("toastOverlay");
        const el = document.getElementById("toastMsg");
        if (!ov || !el) return;
        el.textContent = msg;
        ov.classList.add("show");
        ov.setAttribute("aria-hidden", "false");
        setTimeout(function () {
            ov.classList.remove("show");
            ov.setAttribute("aria-hidden", "true");
        }, 1200);
    }

    function resetStage(kind) {
        stageState[kind] = { correct: 0, attempts: 0, streak: 0, lives: getLivesMax(kind), cleared: false, stars: 0 };
        if (kind === "mc" || kind === "write") {
            const n = getNFor(kind);
            phaseState[kind] = getDefaultPhaseState(n);
            lastEncouragementMilestone[kind] = 0;
            correctSinceRollback[kind] = 0;
        }
    }
    function resetAllStages() {
        resetStage("mc");
        resetStage("write");
        resetStage("sent");
    }

    function makeSeq() { return { pos: 0, last: -1, n: 0 }; }
    const seq = { mc: makeSeq(), write: makeSeq(), sent: makeSeq() };
    function resetSeq(kind, n) {
        seq[kind] = makeSeq();
        seq[kind].n = n || 0;
        seq[kind].pos = 0;
        seq[kind].last = -1;
    }
    function randInt(max) { return Math.floor(Math.random() * max); }
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = randInt(i + 1);
            const t = array[i];
            array[i] = array[j];
            array[j] = t;
        }
    }
    function randIntExcept(max, last) {
        if (max <= 1) return 0;
        let i = randInt(max);
        if (i === last) {
            i = (i + 1 + randInt(max - 1)) % max;
            if (i === last) i = (i + 1) % max;
        }
        return i;
    }
    function nextIndex(kind, n) {
        if (!seq[kind] || seq[kind].n !== n) resetSeq(kind, n);
        const s = seq[kind];
        if (n <= 0) return 0;
        let idx;
        if (s.pos < n) idx = s.pos;
        else idx = randIntExcept(n, s.last);
        s.pos++;
        s.last = idx;
        return idx;
    }

    function ensurePhaseState(kind, n) {
        if (kind !== "mc" && kind !== "write") return;
        const ps = phaseState[kind];
        if (!ps.phase2Correct || ps.phase2Correct.length !== n) {
            const arr = [];
            for (let i = 0; i < n; i++) arr.push(0);
            ps.phase2Correct = arr;
        }
        if (!ps.wrongInPhase1) ps.wrongInPhase1 = [];
    }

    function nextIndexMcOrWrite(kind, n) {
        if (n <= 0) return 0;
        ensurePhaseState(kind, n);
        const s = seq[kind];
        const ps = phaseState[kind];
        if (!seq[kind] || seq[kind].n !== n) resetSeq(kind, n);
        if (ps.phase === 1) {
            if (s.pos < n) {
                const idx = s.pos;
                s.last = idx;
                return idx;
            }
            ps.phase = 2;
        }
        const need = [];
        for (let i = 0; i < n; i++) {
            const required = ps.wrongInPhase1.indexOf(i) >= 0 ? 3 : 1;
            if ((ps.phase2Correct[i] || 0) < required) need.push(i);
        }
        if (need.length === 0) return 0;
        const idx = need[randInt(need.length)];
        s.last = idx;
        return idx;
    }

    function normalizeAnswer(str) {
        return str.toLowerCase().replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
    }
    function triggerCyberpunkRipple(isCorrect, sourceEl) {
        if (!sourceEl) {
            document.documentElement.style.setProperty("--fx-x", "50vw");
            document.documentElement.style.setProperty("--fx-y", "50vh");
        } else {
            var rect = sourceEl.getBoundingClientRect();
            document.documentElement.style.setProperty("--fx-x", (rect.left + rect.width / 2) + "px");
            document.documentElement.style.setProperty("--fx-y", (rect.top + rect.height / 2) + "px");
        }
        document.body.classList.remove("cp-ok", "cp-bad");
        void document.body.offsetWidth;
        document.body.classList.add(isCorrect ? "cp-ok" : "cp-bad");
    }

    function showFeedback(isCorrect, sourceEl) {
        if (currentExerciseStep === 1 || currentExerciseStep === 2 || currentExerciseStep === 3) return;
        var x, y;
        if (sourceEl && sourceEl.getBoundingClientRect) {
            var r = sourceEl.getBoundingClientRect();
            x = r.left + r.width / 2;
            y = r.top + r.height / 2;
        } else {
            x = (window.innerWidth || document.documentElement.clientWidth) / 2;
            y = (window.innerHeight || document.documentElement.clientHeight) / 2;
        }
        document.documentElement.style.setProperty("--fx-x", x + "px");
        document.documentElement.style.setProperty("--fx-y", y + "px");
        document.body.classList.remove("flash-green", "flash-red", "fx-ok", "fx-bad");
        void document.body.offsetWidth;
        if (isCorrect) {
            document.body.classList.add("fx-ok", "flash-green");
        } else {
            document.body.classList.add("fx-bad", "flash-red");
        }
        triggerCyberpunkRipple(isCorrect, sourceEl);
        setTimeout(function () {
            document.body.classList.remove("fx-ok", "fx-bad", "flash-green", "flash-red", "cp-ok", "cp-bad");
        }, isCorrect ? 500 : 750);
    }

    function flashScreen(type) {
        showFeedback(type === "green", null);
    }
    function clearAutoNext() {
        if (autoNextTimeout !== null) {
            clearTimeout(autoNextTimeout);
            autoNextTimeout = null;
        }
    }

    function currentKind() {
        if (currentExerciseStep === 2) return "sent";
        if (currentExerciseStep === 1 && combinedStagePart === "write") return "write";
        if (currentExerciseStep === 1) return "mc";
        return null;
    }
    function stageAccuracy(kind) {
        const s = stageState[kind];
        return s.attempts ? (s.correct / s.attempts) : 0;
    }
    function stageGoalMet(kind) {
        if (kind === "mc" || kind === "write") {
            const n = getNFor(kind);
            if (n <= 0) return false;
            ensurePhaseState(kind, n);
            const ps = phaseState[kind];
            if (ps.phase !== 2) return false;
            for (let i = 0; i < n; i++) {
                const required = ps.wrongInPhase1.indexOf(i) >= 0 ? 3 : 1;
                if ((ps.phase2Correct[i] || 0) < required) return false;
            }
            return true;
        }
        const cfg = GAME.stage[kind];
        const s = stageState[kind];
        return s.correct >= cfg.needCorrect && stageAccuracy(kind) >= cfg.minAccuracy;
    }
    function calcStars(kind) {
        const s = stageState[kind];
        if (!s.cleared) return 0;
        const a = stageAccuracy(kind);
        if (a >= GAME.stars.three && s.streak >= GAME.stars.streakForThree) return 3;
        if (a >= GAME.stars.two) return 2;
        return 1;
    }

    const modalOverlayEl = document.getElementById("modalOverlay");
    const modalTitleEl = document.getElementById("modalTitle");
    const modalTextEl = document.getElementById("modalText");
    const modalPrimaryEl = document.getElementById("modalPrimary");
    const modalSecondaryEl = document.getElementById("modalSecondary");
    const modalTertiaryEl = document.getElementById("modalTertiary");
    const modalEl = modalOverlayEl ? modalOverlayEl.querySelector(".modal") : null;
    let modalCloseXEl = document.getElementById("modalCloseX");
    if (!modalCloseXEl && modalEl) {
        modalCloseXEl = document.createElement("button");
        modalCloseXEl.type = "button";
        modalCloseXEl.id = "modalCloseX";
        modalCloseXEl.setAttribute("aria-label", "Close");
        modalCloseXEl.innerHTML = "&times;";
        modalCloseXEl.style.position = "absolute";
        modalCloseXEl.style.top = "10px";
        modalCloseXEl.style.right = "10px";
        modalCloseXEl.style.width = "34px";
        modalCloseXEl.style.height = "34px";
        modalCloseXEl.style.minWidth = "34px";
        modalCloseXEl.style.padding = "0";
        modalCloseXEl.style.borderRadius = "10px";
        modalCloseXEl.style.display = "none";
        modalCloseXEl.style.alignItems = "center";
        modalCloseXEl.style.justifyContent = "center";
        modalCloseXEl.style.fontSize = "1.1rem";
        modalCloseXEl.style.fontWeight = "700";
        modalCloseXEl.style.lineHeight = "1";
        modalEl.style.position = "relative";
        modalEl.insertBefore(modalCloseXEl, modalEl.firstChild);
    }
    let modalPrimaryAction = null;
    let modalSecondaryAction = null;
    let modalTertiaryAction = null;
    let modalCloseXAction = null;

    function openModal(opts) {
        const title = opts.title || ui.modalImportantTitle || "Важливе повідомлення";
        const text = opts.text || "";
        const primaryText = opts.primaryText !== undefined ? opts.primaryText : (ui.modalContinue || "OK");
        const secondaryText = opts.secondaryText || "";
        const tertiaryText = opts.tertiaryText || "";
        modalTitleEl.textContent = title;
        modalTextEl.textContent = text;
        modalPrimaryEl.textContent = primaryText;
        modalSecondaryEl.textContent = secondaryText;
        modalTertiaryEl.textContent = tertiaryText;
        modalPrimaryAction = opts.onPrimary || null;
        modalSecondaryAction = opts.onSecondary || null;
        modalTertiaryAction = opts.onTertiary || null;
        modalCloseXAction = opts.onCloseX || null;
        modalSecondaryEl.style.display = secondaryText ? "inline-flex" : "none";
        modalTertiaryEl.style.display = tertiaryText ? "inline-flex" : "none";
        const actionsEl = modalPrimaryEl ? modalPrimaryEl.parentElement : null;
        if (actionsEl) actionsEl.style.justifyContent = (secondaryText || tertiaryText) ? "flex-end" : "center";
        if (modalCloseXEl) modalCloseXEl.style.display = opts.showCloseX ? "inline-flex" : "none";
        modalOverlayEl.style.display = "flex";
        modalOverlayEl.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        modalPrimaryEl.focus();
    }
    function closeModal() {
        modalOverlayEl.style.display = "none";
        modalOverlayEl.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
        modalPrimaryAction = null;
        modalSecondaryAction = null;
        modalTertiaryAction = null;
        modalCloseXAction = null;
    }
    modalPrimaryEl.addEventListener("click", function () {
        const fn = modalPrimaryAction;
        closeModal();
        if (typeof fn === "function") fn();
    });
    modalSecondaryEl.addEventListener("click", function () {
        const fn = modalSecondaryAction;
        closeModal();
        if (typeof fn === "function") fn();
    });
    modalTertiaryEl.addEventListener("click", function () {
        const fn = modalTertiaryAction;
        closeModal();
        if (typeof fn === "function") fn();
    });
    if (modalCloseXEl) {
        modalCloseXEl.addEventListener("click", function () {
            const fn = modalCloseXAction;
            closeModal();
            if (typeof fn === "function") fn();
        });
    }
    modalOverlayEl.addEventListener("click", function (e) {
        if (e.target === modalOverlayEl) closeModal();
    });

    function showVictory(kind) {
        clearAutoNext();
        const stageNumber = (kind === "mc") ? 1 : (kind === "write") ? 1 : 2;
        const isFinalStage = (kind === "sent");
        const exerciseDone = isFinalStage && stageState.mc.cleared && stageState.write.cleared && stageState.sent.cleared;
        const stars = calcStars(kind);
        stageState[kind].stars = stars;
        saveProgress();

        if (exerciseDone) {
            openModal({
                title: (ui.victoryTitle || "") + "⭐".repeat(stars),
                text: ui.victoryText || "",
                primaryText: ui.modalContinueLearning || ui.modalContinue,
                secondaryText: ui.modalRepeatLastStage || "",
                tertiaryText: ui.modalRepeatExercise || "",
                onPrimary: function () { closeModal(); nextBlock(); },
                onSecondary: function () { closeModal(); restartStage(kind); },
                onTertiary: function () { closeModal(); restartCurrentBlock(); }
            });
            return;
        }
        openModal({
            title: (ui.stageDoneTitle || "") + stageNumber + (ui.stageDoneTitleSuffix || "") + "⭐".repeat(stars),
            text: ui.stageDoneText || "",
            primaryText: ui.modalContinue || "",
            secondaryText: ui.modalRepeatStage || "",
            tertiaryText: "",
            onPrimary: function () { closeModal(); goNextStep(); },
            onSecondary: function () { closeModal(); restartStage(kind); }
        });
    }

    function showFail(kind) {
        clearAutoNext();
        const rollback = getRollbackSteps(kind);
        const s = stageState[kind];
        s.correct = Math.max(0, s.correct - rollback);
        s.lives = getLivesMax(kind);
        try {
            if (seq && seq[kind]) {
                seq[kind].pos = Math.max(0, (seq[kind].pos || 0) - rollback);
                seq[kind].last = -1;
            }
        } catch (e) { }
        showFeedback(false, null);
        showToast((ui.toastPenalty || "") + rollback);
        updateGateUI();
        if (kind === "mc" || kind === "write") {
            correctSinceRollback[kind] = 0;
        }
        if (kind === "mc") loadMCQuestion();
        if (kind === "write") loadWQuestion();
        if (kind === "sent") loadSentence();
        saveProgress();
    }

    function showRollbackModalThenFail(kind) {
        const texts = (ui.rollbackModalTexts && Array.isArray(ui.rollbackModalTexts) && ui.rollbackModalTexts.length) ? ui.rollbackModalTexts : (ui.rollbackModalText ? [ui.rollbackModalText] : ["Ой, як шкода! Повернемось назад і спробуємо ще раз."]);
        const text = texts[Math.floor(Math.random() * texts.length)];
        openModal({
            title: "",
            text: text,
            primaryText: ui.ok || "Ок",
            secondaryText: "",
            tertiaryText: "",
            onPrimary: function () {
                closeModal();
                showFail(kind);
            }
        });
    }

    function completeCombinedStageAndProceed() {
        stageState.mc.cleared = true;
        stageState.write.cleared = true;
        stageState.mc.stars = calcStars("mc");
        stageState.write.stars = calcStars("write");
        saveProgress();
        nextExerciseStep();
    }
    function advanceToFinalStage() {
        currentExerciseStep = 2;
        updateExerciseVisibility();
        loadSentence();
        saveProgress();
    }

    function onCorrect(kind) {
        const s = stageState[kind];
        s.attempts++;
        s.correct++;
        s.streak++;
        gameXP += 10;
        if (kind === "mc" || kind === "write") {
            if (currentExerciseStep === 1) {
                if (kind === "mc" && mcBatchPhase === 1) mcBatchPos++;
                if (kind === "write" && writeBatchPhase === 1) writeQueuePos++;
            }
            const ps = phaseState[kind];
            if (ps && ps.phase === 1) {
                if (seq[kind]) seq[kind].pos++;
                // Phase 1 correct answer counts as the baseline "1 correct" for this card.
                if (ps.phase2Correct) {
                    const idx1 = kind === "mc" ? currentVocabIndexMC : currentVocabIndexWrite;
                    if (idx1 >= 0 && idx1 < ps.phase2Correct.length) {
                        ps.phase2Correct[idx1] = (ps.phase2Correct[idx1] || 0) + 1;
                    }
                }
            }
            if (ps && ps.phase === 2 && ps.phase2Correct) {
                const idx = kind === "mc" ? currentVocabIndexMC : currentVocabIndexWrite;
                if (idx >= 0 && idx < ps.phase2Correct.length) ps.phase2Correct[idx] = (ps.phase2Correct[idx] || 0) + 1;
            }
            correctSinceRollback[kind]++;
            const rollbackSteps = getRollbackSteps(kind);
            const progressPct = Math.round((currentExerciseStep === 1 ? getProgressPercentCombined() : getProgressPercentMcWrite(kind)) * 100);
            const milestoneKey = (currentExerciseStep === 1) ? "combined" : kind;
            if (correctSinceRollback[kind] >= rollbackSteps) {
                if (progressPct >= 75 && lastEncouragementMilestone[milestoneKey] < 75) {
                    lastEncouragementMilestone[milestoneKey] = 75;
                    saveProgress();
                    addFlashBlockOverlay();
                    flashProgressBarGreen(function () {
                        removeFlashBlockOverlay();
                        openModal({ title: "", text: ui.encourageNearEnd || "Ще трохи — і ти завершиш етап!", primaryText: ui.ok || "Ок", onPrimary: closeModal });
                    });
                    return;
                } else if (progressPct >= 50 && lastEncouragementMilestone[milestoneKey] < 50) {
                    lastEncouragementMilestone[milestoneKey] = 50;
                    saveProgress();
                    addFlashBlockOverlay();
                    flashProgressBarGreen(function () {
                        removeFlashBlockOverlay();
                        openModal({ title: "", text: ui.encourageHalf || "Вітаємо! Ти вже пройшов половину.", primaryText: ui.ok || "Ок", onPrimary: closeModal });
                    });
                    return;
                } else if (progressPct >= 25 && lastEncouragementMilestone[milestoneKey] < 25) {
                    lastEncouragementMilestone[milestoneKey] = 25;
                    saveProgress();
                    addFlashBlockOverlay();
                    flashProgressBarGreen(function () {
                        removeFlashBlockOverlay();
                        openModal({ title: "", text: ui.encourageUnder50 || "Який ти молодець! Ти йдеш до успіху.", primaryText: ui.ok || "Ок", onPrimary: closeModal });
                    });
                    return;
                }
            }
        }
        const allowAutoStageGoal = !(currentExerciseStep === 1 && (kind === "mc" || kind === "write"));
        if (allowAutoStageGoal && !s.cleared && stageGoalMet(kind)) {
            s.cleared = true;
            s.stars = calcStars(kind);
            updateGateUI();
            addFlashBlockOverlay();
            flashProgressBarGreen(function () {
                removeFlashBlockOverlay();
                showVictory(kind);
            });
            return;
        }
        updateGateUI();
        flashProgressBarGreen();
        saveProgress();
    }
    function onWrong(kind) {
        const s = stageState[kind];
        s.attempts++;
        s.streak = 0;
        s.lives--;
        if (kind === "mc" || kind === "write") {
            const ps = phaseState[kind];
            if (ps && ps.phase === 1 && ps.wrongInPhase1) {
                const idx = kind === "mc" ? currentVocabIndexMC : currentVocabIndexWrite;
                if (ps.wrongInPhase1.indexOf(idx) < 0) ps.wrongInPhase1.push(idx);
                if (kind === "mc" && currentExerciseStep === 1 && idx >= 0) {
                    while (mcMistakeCounts.length <= idx) mcMistakeCounts.push(0);
                    mcMistakeCounts[idx] = (mcMistakeCounts[idx] || 0) + 1;
                }
            }
            if (kind === "write" && currentExerciseStep === 1) {
                const idxw = currentVocabIndexWrite;
                if (idxw >= 0) {
                    while (writeMistakeCounts.length <= idxw) writeMistakeCounts.push(0);
                    writeMistakeCounts[idxw] = (writeMistakeCounts[idxw] || 0) + 1;
                    if (remediationActive) remediationWrongThisRound.push(idxw);
                }
            }
            correctSinceRollback[kind] = 0;
        }
        updateGateUI();
        if (s.lives > 0) {
            flashProgressBarRedThree(function () { saveProgress(); });
            return;
        }
        addFlashBlockOverlay();
        flashProgressBarRedThree(function () {
            removeFlashBlockOverlay();
            if (kind === "mc" || kind === "write") {
                showRollbackModalThenFail(kind);
            } else {
                showFail(kind);
            }
        });
    }

    const blockTitleEl = document.getElementById("block-title");
    const blockProgressTextEl = document.getElementById("block-progress-text");
    const exerciseStepEl = document.getElementById("exercise-step");
    const stageBarWrapEl = document.getElementById("stage-bar-wrap");
    const stageBarEl = document.getElementById("stage-bar");
    var stageBarFlashEl = document.getElementById("stage-bar-flash");
    if (!stageBarFlashEl && stageBarWrapEl) {
        stageBarFlashEl = document.createElement("div");
        stageBarFlashEl.id = "stage-bar-flash";
        stageBarFlashEl.setAttribute("aria-hidden", "true");
        stageBarFlashEl.style.cssText = "position:absolute;left:0;top:0;height:100%;width:0;border-radius:999px;pointer-events:none;z-index:2;opacity:0;transition:opacity 0.12s ease-out;";
        stageBarWrapEl.style.position = "relative";
        stageBarWrapEl.appendChild(stageBarFlashEl);
    }
    var flashBlockOverlayEl = null;
    function addFlashBlockOverlay() {
        if (!flashBlockOverlayEl) {
            flashBlockOverlayEl = document.createElement("div");
            flashBlockOverlayEl.id = "flash-block-overlay";
            flashBlockOverlayEl.setAttribute("aria-hidden", "true");
            flashBlockOverlayEl.style.cssText = "position:fixed;inset:0;z-index:9990;pointer-events:all;background:transparent;";
            document.body.appendChild(flashBlockOverlayEl);
        }
        flashBlockOverlayEl.style.display = "block";
    }
    function removeFlashBlockOverlay() {
        if (flashBlockOverlayEl) flashBlockOverlayEl.style.display = "none";
    }
    const explainEl = document.getElementById("explain");
    const btnToggleExplain = document.getElementById("btn-toggle-explain");
    const blockSelectEl = document.getElementById("block-select");
    const ex1Card = document.getElementById("ex1");
    const ex2Card = document.getElementById("ex2");
    const ex3Card = document.getElementById("ex3");
    const mcQuestionEl = document.getElementById("mc-question");
    const mcOptionsEl = document.getElementById("mc-options");
    const mcFeedbackEl = document.getElementById("mc-feedback");
    const mcNextBtn = document.getElementById("mc-next");
    const wQuestionEl = document.getElementById("w-question");
    const wInputEl = document.getElementById("w-input");
    const wFeedbackEl = document.getElementById("w-feedback");
    const wCheckBtn = document.getElementById("w-check");
    const wShowBtn = document.getElementById("w-show");
    const wNextBtn = document.getElementById("w-next");
    const sQuestionEl = document.getElementById("s-question");
    const sInputEl = document.getElementById("s-input");
    const sFeedbackEl = document.getElementById("s-feedback");
    const sCheckBtn = document.getElementById("s-check");
    const sShowBtn = document.getElementById("s-show");
    const sNextBtn = document.getElementById("s-next");
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    const btnNextEx = document.getElementById("btn-next-ex");
    const btnRestart = document.getElementById("btn-restart");
    const statsEl = document.getElementById("stats");
    const topPanelEl = document.getElementById("topPanel");
    const btnTopPanelEl = document.getElementById("btn-topPanel");

    function ensureStatsForBlock(index) {
        if (!stats[index]) {
            stats[index] = { mc: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, sent: { correct: 0, total: 0 } };
        }
    }

    function updateStatsView() {
        ensureStatsForBlock(currentBlockIndex);
        const st = stats[currentBlockIndex];
        const t = (ui.statsTemplate || "")
            .replace(/%mc%/g, st.mc.correct + "/" + st.mc.total)
            .replace(/%write%/g, st.write.correct + "/" + st.write.total)
            .replace(/%sent%/g, st.sent.correct + "/" + st.sent.total);
        statsEl.textContent = t;
    }

    function updateExplainVisibility() {
        if (currentExerciseStep === 0) {
            explainVisible = true;
            explainEl.style.display = "block";
            btnToggleExplain.disabled = true;
            btnToggleExplain.textContent = ui.hideExplain || "";
        } else {
            btnToggleExplain.disabled = false;
            explainEl.style.display = explainVisible ? "block" : "none";
            btnToggleExplain.textContent = explainVisible ? (ui.hideExplain || "") : (ui.showExplain || "");
        }
    }

    function getProgressPercentMcWrite(kind) {
        const n = getNFor(kind);
        if (n <= 0) return 0;
        ensurePhaseState(kind, n);
        const ps = phaseState[kind];
        const s = seq[kind];
        if (ps.phase === 1) {
            return Math.min(1, (s.pos || 0) / n) * 0.5;
        }
        const needPhase2 = n + 2 * (ps.wrongInPhase1 ? ps.wrongInPhase1.length : 0);
        if (needPhase2 <= 0) return 1;
        let completed = 0;
        for (let i = 0; i < (ps.phase2Correct || []).length; i++) completed += ps.phase2Correct[i] || 0;
        return 0.5 + 0.5 * Math.min(1, completed / needPhase2);
    }
    function getProgressPercentForBatchCombined() {
        const nV = getNFor("mc");
        if (nV <= 0) return 0;
        const B = getBatchSize(nV);
        const totalBatches = Math.ceil(nV / B);
        if (totalBatches <= 0) return 0;
        const completedBatchCount = Math.floor(currentBatchStart / B);
        const batchIndices = getMcBatchIndices();
        const batchSize = batchIndices.length;
        if (batchSize <= 0) return Math.min(1, completedBatchCount / totalBatches);
        let progressInBatch = 0;
        if (combinedStagePart === "mc") {
            progressInBatch = (batchSize > 0) ? Math.min(1, mcBatchPos / batchSize) * 0.5 : 0;
        } else {
            if (writeQueue.length <= 0) progressInBatch = 0.5;
            else progressInBatch = 0.5 + 0.5 * Math.min(1, writeQueuePos / writeQueue.length);
        }
        return Math.min(1, (completedBatchCount + progressInBatch) / totalBatches);
    }
    function getProgressPercentCombined() {
        const nV = getNFor("mc");
        if (nV > 0 && currentExerciseStep === 1) return getProgressPercentForBatchCombined();
        const pmc = getProgressPercentMcWrite("mc");
        const pwrite = getProgressPercentMcWrite("write");
        return (pmc + pwrite) * 0.5;
    }

    function updateGateUI() {
        const kind = currentKind();
        if (currentExerciseStep === 0) {
            topPanelEl.style.display = "block";
            btnTopPanelEl.style.display = "none";
            btnTopPanelEl.textContent = ui.showPanel || "";
        } else {
            // Keep the training top panel visible so quick actions stay embedded above exercises.
            topPanelEl.style.display = "block";
            btnTopPanelEl.style.display = "none";
            btnTopPanelEl.textContent = ui.hidePanel || "";
        }
        if (!kind) {
            btnNextEx.disabled = false;
            return;
        }
        var stageCleared = stageState[kind].cleared;
        btnNextEx.disabled = !stageCleared && !isDevMode();
        const cfg = GAME.stage[kind];
        const s = stageState[kind];
        const acc = Math.round(stageAccuracy(kind) * 100);
        const needAcc = Math.round(cfg.minAccuracy * 100);
        let progress = 0;
        let progressText = "";
        if (kind === "mc" || kind === "write") {
            progress = getProgressPercentCombined();
            progressText = " • " + (ui.progressLabel || "Прогрес") + " " + Math.round(progress * 100) + "%";
        } else {
            progress = Math.max(0, Math.min(1, s.correct / cfg.needCorrect));
            progressText = " • ✅ " + s.correct + "/" + cfg.needCorrect;
        }
        if (stageBarWrapEl && stageBarEl) {
            if (currentExerciseStep === 0) {
                stageBarWrapEl.style.display = "none";
            } else {
                stageBarWrapEl.style.display = "block";
                stageBarEl.style.width = Math.round(progress * 100) + "%";
                stageBarEl.style.backgroundColor = "hsl(" + Math.round(progress * 120) + ", 85%, 45%)";
            }
        }
        const stepLabel = ui.stepLabel !== undefined ? ui.stepLabel : "Етап ";
        const stepOf = ui.stepOf !== undefined ? ui.stepOf : " з ";
        const displayStep = (currentExerciseStep === 1 || currentExerciseStep === 2) ? currentExerciseStep : 2;
        const stepTotal = 2;
        exerciseStepEl.textContent = stepLabel + displayStep + stepOf + stepTotal + " • ❤️ " + s.lives + progressText + " • 🎯 " + acc + "% (" + (ui.needAccLabel || "") + needAcc + "%) • XP " + gameXP;
    }

    function flashProgressBarGreen(callback) {
        if (!stageBarEl || !stageBarFlashEl) { if (callback) callback(); return; }
        stageBarFlashEl.style.width = stageBarEl.style.width || "0%";
        stageBarFlashEl.style.backgroundColor = "rgba(40, 180, 99, 0.95)";
        stageBarFlashEl.classList.remove("stage-bar-flash-red");
        stageBarFlashEl.classList.add("stage-bar-flash-green");
        stageBarFlashEl.style.opacity = "1";
        stageBarFlashEl.offsetHeight;
        setTimeout(function () {
            stageBarFlashEl.style.opacity = "0";
            setTimeout(function () {
                stageBarFlashEl.classList.remove("stage-bar-flash-green");
                stageBarFlashEl.style.width = "0";
                stageBarFlashEl.style.backgroundColor = "";
                if (callback) callback();
            }, 150);
        }, 500);
    }
    function flashProgressBarRedOnce(callback) {
        if (!stageBarEl || !stageBarFlashEl) { if (callback) callback(); return; }
        stageBarEl.offsetHeight;
        stageBarFlashEl.style.width = stageBarEl.style.width || "0%";
        stageBarFlashEl.style.backgroundColor = "rgba(220, 53, 69, 0.95)";
        stageBarFlashEl.classList.remove("stage-bar-flash-green");
        stageBarFlashEl.classList.add("stage-bar-flash-red");
        stageBarFlashEl.style.opacity = "1";
        stageBarFlashEl.offsetHeight;
        setTimeout(function () {
            stageBarFlashEl.style.opacity = "0";
            setTimeout(function () {
                stageBarFlashEl.classList.remove("stage-bar-flash-red");
                stageBarFlashEl.style.width = "0";
                stageBarFlashEl.style.backgroundColor = "";
                if (callback) callback();
            }, 150);
        }, 220);
    }
    function flashProgressBarRedThree(callback) {
        if (!stageBarEl || !stageBarFlashEl) { if (callback) callback(); return; }
        var count = 0;
        function doFlash() {
            if (count >= 3) {
                stageBarFlashEl.style.opacity = "0";
                setTimeout(function () {
                    stageBarFlashEl.classList.remove("stage-bar-flash-red");
                    stageBarFlashEl.style.width = "0";
                    stageBarFlashEl.style.backgroundColor = "";
                    if (callback) callback();
                }, 150);
                return;
            }
            stageBarEl.offsetHeight;
            stageBarFlashEl.style.width = stageBarEl.style.width || "0%";
            stageBarFlashEl.style.backgroundColor = "rgba(220, 53, 69, 0.95)";
            stageBarFlashEl.classList.remove("stage-bar-flash-green");
            stageBarFlashEl.classList.add("stage-bar-flash-red");
            stageBarFlashEl.style.opacity = "1";
            stageBarFlashEl.offsetHeight;
            setTimeout(function () {
                stageBarFlashEl.style.opacity = "0";
                count++;
                if (count < 3) setTimeout(doFlash, 180);
                else doFlash();
            }, 220);
        }
        doFlash();
    }

    function updateExerciseVisibility() {
        ex1Card.style.display = (currentExerciseStep === 1 && combinedStagePart === "mc") ? "block" : "none";
        ex2Card.style.display = (currentExerciseStep === 1 && combinedStagePart === "write") ? "block" : "none";
        ex3Card.style.display = (currentExerciseStep === 2) ? "block" : "none";
        if (currentExerciseStep === 0) {
            exerciseStepEl.textContent = ui.introText || "";
            btnNextEx.textContent = ui.startExercises || "";
        } else if (currentExerciseStep === 1) {
            exerciseStepEl.textContent = ui.stage1Desc || "";
            btnNextEx.textContent = ui.goToStage3 || ui.goToStage2 || "";
        } else {
            exerciseStepEl.textContent = ui.stage3Desc || ui.stage2Desc || "";
            btnNextEx.textContent = ui.allStagesDone || "";
        }
        updateExplainVisibility();
        updateGateUI();
    }

    function nextExerciseStep() {
        clearAutoNext();
        if (currentExerciseStep === 0) {
            currentExerciseStep = 1;
            explainVisible = false;
            updateExerciseVisibility();
            saveProgress();
            return;
        }
        if (currentExerciseStep === 1) {
            const toPractice = collectWriteMistakeIndices();
            if (!remediationActive && toPractice.length > 0 && remediationRound < remediationMaxRounds) {
                const preview = buildMistakesPreview(toPractice);
                openModal({
                    title: ui.remediationStartTitle || "",
                    text: (ui.remediationStartText || "Перед фінальним етапом можна допрацювати ці фрази:\n\n") + preview,
                    primaryText: ui.remediationPracticeBtn || "Опрацювати помилки",
                    secondaryText: ui.goToStage3 || "Перейти до фінального етапу",
                    tertiaryText: "",
                    onPrimary: function () { startRemediationRound(toPractice); },
                    onSecondary: advanceToFinalStage
                });
                return;
            }
            if (!remediationActive && toPractice.length > 0 && remediationRound >= remediationMaxRounds) {
                const preview = buildMistakesPreview(toPractice);
                openModal({
                    title: ui.remediationLaterTitle || "",
                    text: (ui.remediationLaterText || "Ще є фрази для практики. Попрацюємо пізніше.\n\n") + preview,
                    primaryText: ui.goToStage3 || "Перейти до фінального етапу",
                    secondaryText: "",
                    tertiaryText: "",
                    onPrimary: advanceToFinalStage
                });
                return;
            }
        }
        if (currentExerciseStep < 2) {
            currentExerciseStep++;
            updateExerciseVisibility();
            if (currentExerciseStep === 2) loadSentence();
            saveProgress();
        } else {
            if (currentBlockIndex < blocks.length - 1) {
                nextBlock();
            } else {
                openModal({ title: ui.lastStageTitle || "", text: ui.lastStageText || "", primaryText: ui.ok || "OK" });
            }
        }
    }

    function restartStage(kind) {
        clearAutoNext();
        resetStage(kind);
        if (kind === "mc") {
            wrongAttemptsMC = 0;
            lastVocabIndexMC = -1;
            currentBatchStart = 0;
            combinedStagePart = "mc";
            writeQueue = [];
            writeQueuePos = 0;
            mcBatchPhase = 1;
            mcBatchPos = 0;
            writeBatchPhase = 1;
            remediationActive = false;
            remediationRound = 0;
            remediationWrongThisRound = [];
            setWriteMistakeIndices([]);
            try {
                const b = blocks[currentBlockIndex];
                resetSeq("mc", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            } catch (e) { }
            loadMCQuestion();
        }
        if (kind === "write") {
            wrongAttemptsWrite = 0;
            lastVocabIndexWrite = -1;
            currentBatchStart = 0;
            combinedStagePart = "mc";
            writeQueue = [];
            writeQueuePos = 0;
            mcBatchPhase = 1;
            mcBatchPos = 0;
            writeBatchPhase = 1;
            remediationActive = false;
            remediationRound = 0;
            remediationWrongThisRound = [];
            setWriteMistakeIndices([]);
            try {
                const b = blocks[currentBlockIndex];
                resetSeq("write", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            } catch (e) { }
            loadMCQuestion();
        }
        if (kind === "sent") {
            wrongAttemptsSent = 0;
            lastSentenceIndex = -1;
            try {
                const b = blocks[currentBlockIndex];
                resetSeq("sent", (b && b.sentences && b.sentences.length) ? b.sentences.length : 0);
            } catch (e) { }
            loadSentence();
        }
        updateExerciseVisibility();
        updateGateUI();
    }

    function restartCurrentBlock() {
        clearAutoNext();
        resetAllStages();
        try {
            stats[currentBlockIndex] = { mc: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, sent: { correct: 0, total: 0 } };
        } catch (e) { }
        loadBlock(currentBlockIndex);
        updateStatsView();
    }

    function goNextStep() {
        clearAutoNext();
        nextExerciseStep();
    }

    function nextBlock() {
        clearAutoNext();
        if (currentBlockIndex < blocks.length - 1) {
            loadBlock(currentBlockIndex + 1);
        } else {
            loadBlock(currentBlockIndex);
        }
    }

    function speak(text) {
        if (!CFG.ttsEnabled) return;
        if (!("speechSynthesis" in window)) return;
        try { window.speechSynthesis.cancel(); } catch (e) { }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = CFG.ttsLang || "en-US";
        u.rate = 0.95;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
    }

    function loadBlock(index) {
        clearAutoNext();
        const total = blocks.length;
        if (total === 0) {
            if (blockTitleEl) blockTitleEl.textContent = "";
            if (blockProgressTextEl) blockProgressTextEl.textContent = "";
            if (explainEl) explainEl.innerHTML = "<p style=\"color:#666;\">Вправи не завантажились. Перевірте, що відкриваєте через веб-сервер (наприклад Live Server) або оберіть курс у налаштуваннях.</p>";
            if (blockSelectEl) blockSelectEl.innerHTML = "";
            updateExerciseVisibility();
            return;
        }
        if (index < 0) index = 0;
        if (index >= total) index = total - 1;
        currentBlockIndex = index;
        currentExerciseStep = 1;
        explainVisible = false;
        topPanelVisibleInPractice = true;
        currentBatchStart = 0;
        combinedStagePart = "mc";
        writeQueue = [];
        writeQueuePos = 0;
        mcBatchPhase = 1;
        mcBatchPos = 0;
        writeBatchPhase = 1;
        remediationActive = false;
        remediationRound = 0;
        remediationWrongThisRound = [];
        resetAllStages();
        lastVocabIndexMC = -1;
        lastVocabIndexWrite = -1;
        lastSentenceIndex = -1;
        try {
            const b = blocks[currentBlockIndex];
            resetSeq("mc", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            resetSeq("write", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            resetSeq("sent", (b && b.sentences && b.sentences.length) ? b.sentences.length : 0);
            setWriteMistakeIndices([]);
        } catch (e) { }
        const block = blocks[currentBlockIndex];
        if (!block) return;
        try {
            const nV = (block.vocab && block.vocab.length) ? block.vocab.length : 0;
            const nS = (block.sentences && block.sentences.length) ? block.sentences.length : 0;
            if (nV > 0) {
                GAME.stage.mc.needCorrect = nV * 4;
                GAME.stage.write.needCorrect = nV * 4;
            }
            if (nS > 0) GAME.stage.sent.needCorrect = nS * 4;
        } catch (e) { }
        blockTitleEl.textContent = (ui.blockTitlePrefix || "Вправа ") + (currentBlockIndex + 1) + (ui.blockTitleSuffix || ". ") + block.title;
        blockProgressTextEl.textContent = (ui.blockTitlePrefix || "Вправа ") + (currentBlockIndex + 1) + (ui.blockProgressOf || " з ") + total;
        explainEl.innerHTML = (block.topicTag ? "<div class=\"topic-tag\">" + block.topicTag + "</div>" : "") + (block.explanation || "");
        blockSelectEl.value = String(currentBlockIndex);
        if (btnPrev) btnPrev.disabled = currentBlockIndex === 0;
        if (btnNext) btnNext.disabled = currentBlockIndex === total - 1;
        loadMCQuestion();
        mcFeedbackEl.textContent = "";
        mcFeedbackEl.className = "feedback";
        wFeedbackEl.textContent = "";
        wFeedbackEl.className = "feedback";
        sFeedbackEl.textContent = "";
        sFeedbackEl.className = "feedback";
        ensureStatsForBlock(currentBlockIndex);
        updateStatsView();
        updateExerciseVisibility();
        saveProgress();
    }

    function loadMCQuestion() {
        clearAutoNext();
        wrongAttemptsMC = 0;
        const block = blocks[currentBlockIndex];
        if (!block || !block.vocab || !block.vocab.length) {
            mcQuestionEl.textContent = ui.noWords || "";
            mcOptionsEl.innerHTML = "";
            return;
        }
        const n = block.vocab.length;
        if (currentExerciseStep === 1 && combinedStagePart === "mc") {
            const idx = nextIndexMCBatch();
            if (idx < 0) {
                const text = ui.beforeWritePartText || ui.encourageHarderSuffix || "А тепер трохи складніше.";
                openModal({
                    title: ui.encourageTitle || "",
                    text: text,
                    primaryText: ui.continueLabel || "Продовжити",
                    secondaryText: "",
                    tertiaryText: "",
                    showCloseX: false,
                    onPrimary: function () {
                        combinedStagePart = "write";
                        writeQueue = getMcBatchIndices().slice();
                        writeQueuePos = 0;
                        writeBatchPhase = 1;
                        phaseState.write.phase = 1;
                        updateExerciseVisibility();
                        loadWQuestion();
                        saveProgress();
                    }
                });
                return;
            }
            currentVocabIndexMC = idx;
            lastVocabIndexMC = idx;
        } else {
            if (stageGoalMet("mc")) {
                showVictory("mc");
                return;
            }
            currentVocabIndexMC = nextIndexMcOrWrite("mc", n);
            lastVocabIndexMC = currentVocabIndexMC;
        }
        const card = block.vocab[currentVocabIndexMC];
        mcQuestionEl.textContent = card.ua;
        mcFeedbackEl.textContent = "";
        mcFeedbackEl.className = "feedback";
        const maxOptions = Math.min(4, block.vocab.length);
        const options = [card.en];
        while (options.length < maxOptions) {
            const idx = randInt(block.vocab.length);
            const opt = block.vocab[idx].en;
            if (options.indexOf(opt) === -1) options.push(opt);
        }
        shuffle(options);
        mcOptionsEl.innerHTML = "";
        options.forEach(function (text) {
            const btn = document.createElement("button");
            btn.textContent = text;
            btn.className = "option-btn";
            btn.addEventListener("click", function () { checkMCAnswer(btn, text, card.en); });
            mcOptionsEl.appendChild(btn);
        });
        saveProgress();
    }

    function checkMCAnswer(button, chosen, correct) {
        clearAutoNext();
        ensureStatsForBlock(currentBlockIndex);
        const st = stats[currentBlockIndex].mc;
        st.total++;
        if (normalizeAnswer(chosen) === normalizeAnswer(correct)) {
            showFeedback(true, button);
            mcFeedbackEl.textContent = ui.mcCorrect || "✅";
            mcFeedbackEl.className = "feedback correct";
            st.correct++;
            onCorrect("mc");
            speak(correct);
            button.classList.add("correct");
            updateStatsView();
            autoNextTimeout = setTimeout(loadMCQuestion, 900);
        } else {
            wrongAttemptsMC++;
            showFeedback(false, button);
            mcFeedbackEl.textContent = (wrongAttemptsMC >= 3) ? (ui.mcWrongHint || "") + correct : (ui.mcWrongTry || "");
            if (wrongAttemptsMC >= 3) speak(correct);
            mcFeedbackEl.className = "feedback wrong";
            button.classList.add("wrong");
            onWrong("mc");
            updateStatsView();
        }
    }

    mcNextBtn.addEventListener("click", loadMCQuestion);

    function loadWQuestion() {
        clearAutoNext();
        wrongAttemptsWrite = 0;
        const block = blocks[currentBlockIndex];
        if (!block || !block.vocab || !block.vocab.length) {
            wQuestionEl.textContent = ui.noWords || "";
            return;
        }
        const n = block.vocab.length;
        if (currentExerciseStep === 1 && combinedStagePart === "write") {
            if (remediationActive) {
                if (writeQueuePos >= writeQueue.length) {
                    finishRemediationRound();
                    return;
                }
                const ridx = writeQueue[writeQueuePos];
                currentVocabIndexWrite = ridx;
                lastVocabIndexWrite = ridx;
                const rcard = block.vocab[ridx];
                wQuestionEl.textContent = rcard.ua;
                wInputEl.value = "";
                wFeedbackEl.textContent = "";
                wFeedbackEl.className = "feedback";
                saveProgress();
                return;
            }
            const idx = getNextWriteBatchIndex();
            if (idx < 0) {
                currentBatchStart += getBatchSize(n);
                if (currentBatchStart >= n) {
                    completeCombinedStageAndProceed();
                } else {
                    combinedStagePart = "mc";
                    mcBatchPhase = 1;
                    mcBatchPos = 0;
                    phaseState.mc.phase = 1;
                    writeQueue = [];
                    writeQueuePos = 0;
                    writeBatchPhase = 1;
                    phaseState.write.phase = 1;
                    updateExerciseVisibility();
                    loadMCQuestion();
                }
                saveProgress();
                return;
            }
            currentVocabIndexWrite = idx;
            lastVocabIndexWrite = idx;
        } else {
            if (stageGoalMet("write")) {
                showVictory("write");
                return;
            }
            currentVocabIndexWrite = nextIndexMcOrWrite("write", n);
            lastVocabIndexWrite = currentVocabIndexWrite;
        }
        const card = block.vocab[currentVocabIndexWrite];
        wQuestionEl.textContent = card.ua;
        wInputEl.value = "";
        wFeedbackEl.textContent = "";
        wFeedbackEl.className = "feedback";
        saveProgress();
    }

    function checkWAnswer() {
        clearAutoNext();
        const block = blocks[currentBlockIndex];
        if (!block || !block.vocab || !block.vocab.length) return;
        const card = block.vocab[currentVocabIndexWrite];
        const user = wInputEl.value;
        if (!user.trim()) return;
        ensureStatsForBlock(currentBlockIndex);
        const st = stats[currentBlockIndex].write;
        st.total++;
        if (normalizeAnswer(user) === normalizeAnswer(card.en)) {
            showFeedback(true, wCheckBtn);
            wFeedbackEl.textContent = ui.wCorrect || "";
            wFeedbackEl.className = "feedback correct";
            st.correct++;
            onCorrect("write");
            speak(card.en);
            updateStatsView();
            autoNextTimeout = setTimeout(loadWQuestion, 900);
        } else {
            wrongAttemptsWrite++;
            showFeedback(false, wCheckBtn);
            wFeedbackEl.textContent = (wrongAttemptsWrite >= 3) ? (ui.wWrongHint || "") + card.en : (ui.wWrongTry || "");
            if (wrongAttemptsWrite >= 3) speak(card.en);
            wFeedbackEl.className = "feedback wrong";
            onWrong("write");
            updateStatsView();
        }
    }

    function showWAnswer() {
        clearAutoNext();
        const block = blocks[currentBlockIndex];
        if (!block || !block.vocab || !block.vocab.length) return;
        const card = block.vocab[currentVocabIndexWrite];
        wFeedbackEl.textContent = (ui.wShowAnswer || "") + card.en;
        wFeedbackEl.className = "feedback";
        speak(card.en);
    }

    wCheckBtn.addEventListener("click", checkWAnswer);
    wShowBtn.addEventListener("click", showWAnswer);
    wNextBtn.addEventListener("click", loadWQuestion);
    wInputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") checkWAnswer(); });

    function loadSentence() {
        clearAutoNext();
        wrongAttemptsSent = 0;
        const block = blocks[currentBlockIndex];
        if (!block || !block.sentences || !block.sentences.length) {
            sQuestionEl.textContent = ui.noSentences || "";
            sInputEl.value = "";
            sFeedbackEl.textContent = "";
            sFeedbackEl.className = "feedback";
            return;
        }
        currentSentenceIndex = nextIndex("sent", block.sentences.length);
        lastSentenceIndex = currentSentenceIndex;
        const card = block.sentences[currentSentenceIndex];
        sQuestionEl.textContent = card.ua;
        sInputEl.value = "";
        sFeedbackEl.textContent = "";
        sFeedbackEl.className = "feedback";
        saveProgress();
    }

    function checkSentence() {
        clearAutoNext();
        const block = blocks[currentBlockIndex];
        if (!block || !block.sentences || !block.sentences.length) return;
        const card = block.sentences[currentSentenceIndex];
        const user = sInputEl.value;
        if (!user.trim()) return;
        ensureStatsForBlock(currentBlockIndex);
        const st = stats[currentBlockIndex].sent;
        st.total++;
        if (normalizeAnswer(user) === normalizeAnswer(card.en)) {
            showFeedback(true, sCheckBtn);
            sFeedbackEl.textContent = ui.sCorrect || "";
            sFeedbackEl.className = "feedback correct";
            st.correct++;
            onCorrect("sent");
            speak(card.en);
            updateStatsView();
            autoNextTimeout = setTimeout(loadSentence, 900);
        } else {
            wrongAttemptsSent++;
            showFeedback(false, sCheckBtn);
            sFeedbackEl.textContent = (wrongAttemptsSent >= 3) ? (ui.sWrongHint || "") + card.en : (ui.sWrongTry || "");
            sFeedbackEl.className = "feedback wrong";
            onWrong("sent");
            updateStatsView();
        }
    }

    function showSentenceAnswer() {
        clearAutoNext();
        const block = blocks[currentBlockIndex];
        if (!block || !block.sentences || !block.sentences.length) return;
        const card = block.sentences[currentSentenceIndex];
        sFeedbackEl.textContent = (ui.sShowAnswer || "") + card.en;
        sFeedbackEl.className = "feedback";
        speak(card.en);
    }

    sCheckBtn.addEventListener("click", checkSentence);
    sShowBtn.addEventListener("click", showSentenceAnswer);
    sNextBtn.addEventListener("click", loadSentence);
    sInputEl.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) checkSentence(); });

    if (btnPrev) btnPrev.addEventListener("click", function () { if (currentBlockIndex > 0) loadBlock(currentBlockIndex - 1); });
    if (btnNext) btnNext.addEventListener("click", function () { if (currentBlockIndex < blocks.length - 1) loadBlock(currentBlockIndex + 1); });
    btnNextEx.addEventListener("click", nextExerciseStep);
    btnToggleExplain.addEventListener("click", function () {
        if (currentExerciseStep === 0) { explainVisible = true; updateExplainVisibility(); return; }
        explainVisible = !explainVisible;
        updateExplainVisibility();
    });
    btnTopPanelEl.addEventListener("click", function () {
        if (currentExerciseStep === 0) return;
        topPanelVisibleInPractice = !topPanelVisibleInPractice;
        updateGateUI();
    });
    blockSelectEl.addEventListener("change", function () {
        loadBlock(parseInt(blockSelectEl.value, 10));
    });
    btnRestart.addEventListener("click", function () {
        clearAutoNext();
        stats[currentBlockIndex] = { mc: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, sent: { correct: 0, total: 0 } };
        updateStatsView();
        resetAllStages();
        lastVocabIndexMC = -1;
        lastVocabIndexWrite = -1;
        lastSentenceIndex = -1;
        try {
            const b = blocks[currentBlockIndex];
            resetSeq("mc", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            resetSeq("write", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            resetSeq("sent", (b && b.sentences && b.sentences.length) ? b.sentences.length : 0);
            setWriteMistakeIndices([]);
        } catch (e) { }
        gameXP = 0;
        // Restart should return directly to stage 1 (no intro/explanation screen).
        currentExerciseStep = 1;
        currentBatchStart = 0;
        combinedStagePart = "mc";
        writeQueue = [];
        writeQueuePos = 0;
        mcBatchPhase = 1;
        mcBatchPos = 0;
        writeBatchPhase = 1;
        remediationActive = false;
        remediationRound = 0;
        remediationWrongThisRound = [];
        explainVisible = false;
        updateExerciseVisibility();
        loadMCQuestion();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    function ensureAppStyles() {
        if (document.getElementById("app-styles")) return;
        var link = document.createElement("link");
        link.id = "app-styles";
        link.rel = "stylesheet";
        var origin = (window.location.origin || "").toString();
        var base = getBasePrefix();
        if (!origin || origin === "null" || origin === "undefined" || window.location.protocol === "file:") {
            link.href = (pathnameContainsRoot() ? "../" : "") + "shared/css/app.css";
        } else {
            link.href = isRootFolder() ? origin + "/shared/css/app.css" : origin + (base ? base + "/" : "/") + "shared/css/app.css";
        }
        document.head.appendChild(link);
    }

    function createTopToolbar() {
        var toolbar = document.getElementById("app-toolbar");
        if (toolbar) return;
        toolbar = document.createElement("div");
        toolbar.id = "app-toolbar";
        toolbar.className = "top-row";
        toolbar.setAttribute("aria-label", "Course, theme, and developer options");

        if (ui.courseSwitcherLabel || ui.courseOptionEnglish) {
            var courseLabel = document.createElement("span");
            courseLabel.className = "block-selector-label";
            courseLabel.textContent = (ui.courseSwitcherLabel || "Course") + " ";
            var courseSelect = document.createElement("select");
            courseSelect.id = "course-select";
            var opts = [
                { value: "english", text: ui.courseOptionEnglish || "English" },
                { value: "spanish", text: ui.courseOptionSpanish || "Spanish" },
                { value: "russian", text: ui.courseOptionRussian || "Russian" }
            ];
            opts.forEach(function (o) {
                var opt = document.createElement("option");
                opt.value = o.value;
                opt.textContent = o.text;
                courseSelect.appendChild(opt);
            });
            courseSelect.value = getCurrentCourse();
            courseSelect.addEventListener("change", function () {
                window.location.href = "index.html?course=" + courseSelect.value;
            });
            toolbar.appendChild(courseLabel);
            toolbar.appendChild(courseSelect);
        }

        var themeBtn = document.createElement("button");
        themeBtn.type = "button";
        themeBtn.id = "btn-theme";
        themeBtn.textContent = ui.themeToggleLabel || "Theme";
        themeBtn.addEventListener("click", function toggleTheme() {
            var current = getTheme();
            var idx = AVAILABLE_THEMES.indexOf(current);
            var next = AVAILABLE_THEMES[(idx + 1) % AVAILABLE_THEMES.length];
            setTheme(next);
            var msgMap = {
                classic: "Classic",
                cyberpunk: "Cyberpunk",
                kawaii: "Kawaii Hearts"
            };
            var msg = msgMap[next] || next;
            showToast(msg);
        });
        toolbar.appendChild(themeBtn);

        if (ui.devModeButtonLabel !== undefined || ui.devModeEnterCodeLabel !== undefined) {
            var devModeBtn = document.createElement("button");
            devModeBtn.type = "button";
            devModeBtn.id = "btn-dev-mode";

            function updateDevModeButton() {
                if (isDevMode()) {
                    devModeBtn.textContent = ui.devModeButtonLabel || "Dev";
                    devModeBtn.classList.add("dev-mode-active");
                } else {
                    devModeBtn.textContent = ui.devModeEnterCodeLabel || "Code";
                    devModeBtn.classList.remove("dev-mode-active");
                }
            }
            updateDevModeButton();

            devModeBtn.addEventListener("click", function () {
                if (isDevMode()) {
                    openModal({
                        title: ui.devModeButtonLabel || "Dev",
                        text: ui.devModeConfirmDisable || "",
                        primaryText: ui.ok || "OK",
                        secondaryText: ui.devModeCancel || "Cancel",
                        onPrimary: function () {
                            setDevMode(false);
                            updateDevModeButton();
                            updateGateUI();
                        },
                        onSecondary: function () { }
                    });
                } else {
                    var input = window.prompt(ui.devModePromptText || "Code:");
                    if (input === null) return;
                    if (input.trim() === DEV_CODE) {
                        openModal({
                            title: ui.devModeButtonLabel || "Dev",
                            text: ui.devModeConfirmEnable || "",
                            primaryText: ui.ok || "OK",
                            secondaryText: ui.devModeCancel || "Cancel",
                            onPrimary: function () {
                                setDevMode(true);
                                updateDevModeButton();
                                updateGateUI();
                            },
                            onSecondary: function () { }
                        });
                    } else {
                        var wrongMsg = ui.devModeWrongCode || "Невідома команда";
                        showToast(wrongMsg);
                        if (!document.getElementById("toastOverlay")) alert(wrongMsg);
                    }
                }
            });
            toolbar.appendChild(devModeBtn);
        }

        var topPanelEl = document.getElementById("topPanel");
        if (topPanelEl && topPanelEl.parentNode) {
            topPanelEl.parentNode.insertBefore(toolbar, topPanelEl);
        } else {
            document.body.insertBefore(toolbar, document.body.firstChild);
        }
    }

    function applyStaticUI() {
        var u = ui;
        var el = function (id) { return document.getElementById(id); };
        if (el("main-subtitle")) el("main-subtitle").textContent = u.mainSubtitle || "";
        if (el("main-warning")) el("main-warning").textContent = u.warningText || "";
        if (el("block-select-label")) el("block-select-label").textContent = u.blockSelectorLabel || "";
        if (el("btn-settings")) el("btn-settings").textContent = u.settingsButton || "";
        if (el("btn-toggle-explain")) el("btn-toggle-explain").textContent = u.hideExplain || "";
        if (el("settings-page-title")) el("settings-page-title").textContent = u.settingsTitle || "";
        if (el("btn-settings-back")) el("btn-settings-back").textContent = u.settingsBack || "";
    }

    function init() {
        if (isDevMode()) document.body.classList.add("dev-mode");

        ensureAppStyles();

        updateThemeBodyClass();
        createCyberpunkMatrixContainer();
        ensureKawaiiHearts();
        updateThemeBodyClass();
        var reducedMotion = typeof window.matchMedia !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        document.body.classList.toggle("cp-reduced-motion", !!reducedMotion);
        if (!reducedMotion) {
            cpScheduleNext();
            document.addEventListener("visibilitychange", cpOnVisibilityChange);
        }

        createTopToolbar();

        applyStaticUI();

        blockSelectEl.innerHTML = "";
        blocks.forEach(function (b, i) {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = (i + 1) + ". " + b.title;
            blockSelectEl.appendChild(opt);
        });

        var p = getValidSavedProgress();
        if (p) {
            applyResumeState(p);
        } else {
            loadBlock(0);
            try { resetStage("mc"); resetStage("write"); resetStage("sent"); } catch (e) { }
        }
        if (typeof window.onAppReady === "function") window.onAppReady();
    }

    // Експортуємо функції глобально для доступу зі сторінки налаштувань
    window.getCurrentCourse = getCurrentCourse;
    window.getBasePrefix = getBasePrefix;
    window.getTheme = getTheme;
    window.setTheme = setTheme;
    window.isDevMode = isDevMode;
    window.setDevMode = setDevMode;
    window.openModal = openModal;
    window.promptResumeBeforeExercises = promptResumeBeforeExercises;
    window.resumeLatestProgress = resumeLatestProgress;
    window.hasAnySavedProgress = hasAnySavedProgress;
    window.resumeProgressForBlock = resumeProgressForBlock;
    window.hasSavedProgressForBlock = hasSavedProgressForBlock;
    window.getSavedProgressBlockIndex = getSavedProgressBlockIndex;
    window.getExercisePreviewData = getExercisePreviewData;

    loadExercises().then(init);
})();
