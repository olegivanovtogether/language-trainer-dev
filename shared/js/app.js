/* ====== SHARED ENGINE — course-agnostic; uses window.COURSE_CONFIG ====== */
(function () {
    "use strict";
    const CFG = window.COURSE_CONFIG || {};
    const ui = CFG.ui || {};

    let blocks = [];

    function getCourseExercisesBaseUrl() {
        const path = (window.location && window.location.pathname) || "";
        const normalized = path.replace(/\/index\.html$/i, "").replace(/\/$/, "") || "/";
        const segments = normalized.split("/").filter(Boolean);
        const courseIndex = segments.findIndex(function (s) { return s === "english" || s === "spanish" || s === "russian"; });
        if (courseIndex < 0) {
            return (window.location.origin || "") + "/english/exercises/";
        }
        const coursePath = segments.slice(0, courseIndex + 1).join("/");
        return (window.location.origin || "") + "/" + coursePath + "/exercises/";
    }

    function getCurrentCourse() {
        const path = (window.location && window.location.pathname) || "";
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
                }
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
        const step = progress.step;
        if (step === 1 && block.vocab && block.vocab.length) {
            const pos = Math.max(0, Math.min(progress.mcPos, block.vocab.length - 1));
            return (block.vocab[pos] && block.vocab[pos].ua) ? block.vocab[pos].ua : "";
        }
        if (step === 2 && block.vocab && block.vocab.length) {
            const pos = Math.max(0, Math.min(progress.writePos, block.vocab.length - 1));
            return (block.vocab[pos] && block.vocab[pos].ua) ? block.vocab[pos].ua : "";
        }
        if (step === 3 && block.sentences && block.sentences.length) {
            const pos = Math.max(0, Math.min(progress.sentPos, block.sentences.length - 1));
            return (block.sentences[pos] && block.sentences[pos].ua) ? block.sentences[pos].ua : "";
        }
        return "";
    }

    function showResumeModal(progress) {
        const block = blocks[progress.blockIndex];
        if (!block) { loadBlock(0); return; }
        const stageNames = (ui.stageNames && ui.stageNames.length >= 4) ? ui.stageNames : ["Вступ", "Вибір", "Вписати", "Речення"];
        const stage = stageNames[progress.step] || ("Етап " + progress.step);
        const preview = getResumePreview(progress);
        let k = 0;
        if (progress.step === 1) k = (progress.mcPos || 0) + 1;
        else if (progress.step === 2) k = (progress.writePos || 0) + 1;
        else if (progress.step === 3) k = (progress.sentPos || 0) + 1;
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
            onPrimary: function () { applyResumeState(progress); },
            onSecondary: function () {
                clearProgress();
                loadBlock(0);
            }
        });
    }

    function applyResumeState(progress) {
        const block = blocks[progress.blockIndex];
        if (!block) { loadBlock(0); return; }
        currentBlockIndex = progress.blockIndex;
        currentExerciseStep = progress.step;
        explainVisible = (progress.step === 0);
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
        const total = blocks.length;
        blockTitleEl.textContent = (ui.blockTitlePrefix || "Вправа ") + (currentBlockIndex + 1) + (ui.blockTitleSuffix || ". ") + block.title;
        blockProgressTextEl.textContent = (ui.blockTitlePrefix || "Вправа ") + (currentBlockIndex + 1) + (ui.blockProgressOf || " з ") + total;
        explainEl.innerHTML = (block.topicTag ? "<div class=\"topic-tag\">" + block.topicTag + "</div>" : "") + (block.explanation || "");
        blockSelectEl.value = String(currentBlockIndex);
        btnPrev.disabled = currentBlockIndex === 0;
        btnNext.disabled = currentBlockIndex === total - 1;
        mcFeedbackEl.textContent = "";
        mcFeedbackEl.className = "feedback";
        wFeedbackEl.textContent = "";
        wFeedbackEl.className = "feedback";
        sFeedbackEl.textContent = "";
        sFeedbackEl.className = "feedback";
        ensureStatsForBlock(currentBlockIndex);
        updateStatsView();
        updateExerciseVisibility();
        if (currentExerciseStep === 1) loadMCQuestion();
        else if (currentExerciseStep === 2) loadWQuestion();
        else if (currentExerciseStep === 3) loadSentence();
        updateGateUI();
    }

    function getBasePrefix() {
        const path = (window.location && window.location.pathname) || "";
        const normalized = path.replace(/\/index\.html$/i, "").replace(/\/$/, "") || "/";
        const segments = normalized.split("/").filter(Boolean);
        const i = segments.findIndex(function (s) { return s === "english" || s === "spanish" || s === "russian"; });
        if (i < 0 || i === 0) return "";
        return "/" + segments.slice(0, i).join("/");
    }

    function getTheme() {
        try {
            var name = typeof localStorage !== "undefined" ? localStorage.getItem("ui-theme") : null;
            if (!name || (typeof name === "string" && name.trim() === "")) return "cyberpunk";
            return (name === "cyberpunk" || name === "classic") ? name : "cyberpunk";
        } catch (e) {
            return "cyberpunk";
        }
    }

    function setTheme(name) {
        try {
            if (typeof localStorage !== "undefined") localStorage.setItem("ui-theme", name);
        } catch (e) { }
        var link = document.getElementById("theme-css");
        if (link) {
            var base = getBasePrefix();
            link.href = (window.location.origin || "") + (base ? base : "") + "/shared/css/theme-" + name + ".css";
        }
    }

    function ensureThemeLink() {
        var link = document.getElementById("theme-css");
        if (!link) {
            link = document.createElement("link");
            link.id = "theme-css";
            link.rel = "stylesheet";
            document.head.appendChild(link);
        }
        var theme = getTheme();
        var base = getBasePrefix();
        link.href = (window.location.origin || "") + (base ? base : "") + "/shared/css/theme-" + theme + ".css";
    }

    ensureThemeLink();

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

    let currentBlockIndex = 0;
    let currentExerciseStep = 0;
    let explainVisible = true;
    let lastVocabIndexMC = -1;
    let lastVocabIndexWrite = -1;
    let lastSentenceIndex = -1;
    let topPanelVisibleInPractice = false;
    let autoNextTimeout = null;
    let wrongAttemptsMC = 0;
    let wrongAttemptsWrite = 0;
    let wrongAttemptsSent = 0;
    let currentVocabIndexMC = 0;
    let currentVocabIndexWrite = 0;
    let currentSentenceIndex = 0;
    const stats = {};

    function getNFor(kind) {
        const b = blocks[currentBlockIndex];
        if (kind === "sent") return (b && b.sentences && b.sentences.length) ? b.sentences.length : 0;
        return (b && b.vocab && b.vocab.length) ? b.vocab.length : 0;
    }
    function getLivesMax(kind) {
        const n = getNFor(kind);
        return (n <= 3) ? 3 : 5;
    }
    function getRollbackSteps(kind) {
        const n = getNFor(kind);
        return (n <= 3) ? 3 : 5;
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
        if (currentExerciseStep === 1) return "mc";
        if (currentExerciseStep === 2) return "write";
        if (currentExerciseStep === 3) return "sent";
        return null;
    }
    function stageAccuracy(kind) {
        const s = stageState[kind];
        return s.attempts ? (s.correct / s.attempts) : 0;
    }
    function stageGoalMet(kind) {
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
    let modalPrimaryAction = null;
    let modalSecondaryAction = null;
    let modalTertiaryAction = null;

    function openModal(opts) {
        const title = opts.title || "";
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
        modalSecondaryEl.style.display = secondaryText ? "inline-flex" : "none";
        modalTertiaryEl.style.display = tertiaryText ? "inline-flex" : "none";
        modalOverlayEl.style.display = "flex";
        modalOverlayEl.setAttribute("aria-hidden", "false");
        modalPrimaryEl.focus();
    }
    function closeModal() {
        modalOverlayEl.style.display = "none";
        modalOverlayEl.setAttribute("aria-hidden", "true");
        modalPrimaryAction = null;
        modalSecondaryAction = null;
        modalTertiaryAction = null;
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
    modalOverlayEl.addEventListener("click", function (e) {
        if (e.target === modalOverlayEl) closeModal();
    });

    function showVictory(kind) {
        clearAutoNext();
        const stageNumber = (kind === "mc") ? 1 : (kind === "write") ? 2 : 3;
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
        if (kind === "mc") loadMCQuestion();
        if (kind === "write") loadWQuestion();
        if (kind === "sent") loadSentence();
        saveProgress();
    }

    function onCorrect(kind) {
        const s = stageState[kind];
        s.attempts++;
        s.correct++;
        s.streak++;
        gameXP += 10;
        if (!s.cleared && stageGoalMet(kind)) {
            s.cleared = true;
            s.stars = calcStars(kind);
            updateGateUI();
            showVictory(kind);
            return;
        }
        updateGateUI();
        saveProgress();
    }
    function onWrong(kind) {
        const s = stageState[kind];
        s.attempts++;
        s.streak = 0;
        s.lives--;
        if (s.lives <= 0) {
            showFail(kind);
            return;
        }
        updateGateUI();
        saveProgress();
    }

    const blockTitleEl = document.getElementById("block-title");
    const blockProgressTextEl = document.getElementById("block-progress-text");
    const exerciseStepEl = document.getElementById("exercise-step");
    const stageBarWrapEl = document.getElementById("stage-bar-wrap");
    const stageBarEl = document.getElementById("stage-bar");
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

    function updateGateUI() {
        const kind = currentKind();
        if (currentExerciseStep === 0) {
            topPanelEl.style.display = "block";
            btnTopPanelEl.style.display = "none";
            btnTopPanelEl.textContent = ui.showPanel || "";
        } else {
            topPanelEl.style.display = topPanelVisibleInPractice ? "block" : "none";
            btnTopPanelEl.style.display = "inline-flex";
            btnTopPanelEl.textContent = topPanelVisibleInPractice ? (ui.hidePanel || "") : (ui.showPanel || "");
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
        if (stageBarWrapEl && stageBarEl) {
            if (currentExerciseStep === 0) {
                stageBarWrapEl.style.display = "none";
            } else {
                stageBarWrapEl.style.display = "block";
                const progress = Math.max(0, Math.min(1, s.correct / cfg.needCorrect));
                stageBarEl.style.width = Math.round(progress * 100) + "%";
                stageBarEl.style.backgroundColor = "hsl(" + Math.round(progress * 120) + ", 85%, 45%)";
            }
        }
        const stepLabel = ui.stepLabel !== undefined ? ui.stepLabel : "Етап ";
        const stepOf = ui.stepOf !== undefined ? ui.stepOf : " з ";
        exerciseStepEl.textContent = stepLabel + currentExerciseStep + stepOf + "3 • ❤️ " + s.lives + " • ✅ " + s.correct + "/" + cfg.needCorrect + " • 🎯 " + acc + "% (" + (ui.needAccLabel || "") + needAcc + "%) • XP " + gameXP;
    }

    function updateExerciseVisibility() {
        ex1Card.style.display = (currentExerciseStep === 1) ? "block" : "none";
        ex2Card.style.display = (currentExerciseStep === 2) ? "block" : "none";
        ex3Card.style.display = (currentExerciseStep === 3) ? "block" : "none";
        if (currentExerciseStep === 0) {
            exerciseStepEl.textContent = ui.introText || "";
            btnNextEx.textContent = ui.startExercises || "";
        } else if (currentExerciseStep === 1) {
            exerciseStepEl.textContent = ui.stage1Desc || "";
            btnNextEx.textContent = ui.goToStage2 || "";
        } else if (currentExerciseStep === 2) {
            exerciseStepEl.textContent = ui.stage2Desc || "";
            btnNextEx.textContent = ui.goToStage3 || "";
        } else {
            exerciseStepEl.textContent = ui.stage3Desc || "";
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
        if (currentExerciseStep < 3) {
            currentExerciseStep++;
            updateExerciseVisibility();
            saveProgress();
        } else {
            openModal({ title: ui.lastStageTitle || "", text: ui.lastStageText || "", primaryText: ui.ok || "OK" });
        }
    }

    function restartStage(kind) {
        clearAutoNext();
        resetStage(kind);
        if (kind === "mc") {
            wrongAttemptsMC = 0;
            lastVocabIndexMC = -1;
            try {
                const b = blocks[currentBlockIndex];
                resetSeq("mc", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            } catch (e) { }
            loadMCQuestion();
        }
        if (kind === "write") {
            wrongAttemptsWrite = 0;
            lastVocabIndexWrite = -1;
            try {
                const b = blocks[currentBlockIndex];
                resetSeq("write", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            } catch (e) { }
            loadWQuestion();
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
        if (total === 0) return;
        if (index < 0) index = 0;
        if (index >= total) index = total - 1;
        currentBlockIndex = index;
        currentExerciseStep = 0;
        explainVisible = true;
        topPanelVisibleInPractice = false;
        resetAllStages();
        lastVocabIndexMC = -1;
        lastVocabIndexWrite = -1;
        lastSentenceIndex = -1;
        try {
            const b = blocks[currentBlockIndex];
            resetSeq("mc", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            resetSeq("write", (b && b.vocab && b.vocab.length) ? b.vocab.length : 0);
            resetSeq("sent", (b && b.sentences && b.sentences.length) ? b.sentences.length : 0);
        } catch (e) { }
        const block = blocks[currentBlockIndex];
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
        btnPrev.disabled = currentBlockIndex === 0;
        btnNext.disabled = currentBlockIndex === total - 1;
        loadMCQuestion();
        loadWQuestion();
        loadSentence();
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
        currentVocabIndexMC = nextIndex("mc", block.vocab.length);
        lastVocabIndexMC = currentVocabIndexMC;
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
        currentVocabIndexWrite = nextIndex("write", block.vocab.length);
        lastVocabIndexWrite = currentVocabIndexWrite;
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

    btnPrev.addEventListener("click", function () { if (currentBlockIndex > 0) loadBlock(currentBlockIndex - 1); });
    btnNext.addEventListener("click", function () { if (currentBlockIndex < blocks.length - 1) loadBlock(currentBlockIndex + 1); });
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
        } catch (e) { }
        gameXP = 0;
        currentExerciseStep = 0;
        explainVisible = true;
        updateExerciseVisibility();
        loadMCQuestion();
        loadWQuestion();
        loadSentence();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

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
                var base = getBasePrefix();
                var target = (base ? base + "/" : "/") + courseSelect.value + "/index.html";
                window.location.href = target;
            });
            toolbar.appendChild(courseLabel);
            toolbar.appendChild(courseSelect);
        }

        var themeBtn = document.createElement("button");
        themeBtn.type = "button";
        themeBtn.id = "btn-theme";
        themeBtn.textContent = ui.themeToggleLabel || "Theme";
        themeBtn.addEventListener("click", function toggleTheme() {
            var next = getTheme() === "classic" ? "cyberpunk" : "classic";
            setTheme(next);
            var msg = next === "cyberpunk" ? "Cyberpunk" : "Classic";
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

    function init() {
        if (isDevMode()) document.body.classList.add("dev-mode");

        createTopToolbar();

        blocks.forEach(function (b, i) {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = (i + 1) + ". " + b.title;
            blockSelectEl.appendChild(opt);
        });

        const p = loadProgress();
        if (p && typeof p.blockIndex === "number" && p.blockIndex >= 0 && p.blockIndex < blocks.length) {
            showResumeModal(p);
        } else {
            loadBlock(0);
        }
        try { resetStage("mc"); resetStage("write"); resetStage("sent"); } catch (e) { }
    }

    loadExercises().then(init);
})();
