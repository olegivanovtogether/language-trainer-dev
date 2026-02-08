/* ====== ДИНАМІЧНЕ ЗАВАНТАЖЕННЯ ВПРАВ ====== */
let blocks = [];

function getExercisesBaseUrl() {
    const s = document.currentScript && document.currentScript.src;
    if (s) {
        const i = s.lastIndexOf("/");
        return i >= 0 ? s.slice(0, i + 1) : "";
    }
    return "";
}

function loadScript(src, callback) {
    const script = document.createElement("script");
    script.src = src;
    script.onload = function () { callback(true); };
    script.onerror = function () { callback(false); };
    document.head.appendChild(script);
}

async function loadExercises() {
    const base = getExercisesBaseUrl();
    const dir = base ? base + "../exercises/" : "exercises/";

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

    let n = 1;
    while (true) {
        const ok = await loadOne("ex" + n + ".js");
        if (!ok) break;
        n++;
    }
}

/* ====== ІГРОВА ЛОГІКА (цілі етапів) ====== */
const GAME = {
    livesPerStage: 3,
    stage: {
        mc: { needCorrect: 5, minAccuracy: 0.70 },
        write: { needCorrect: 5, minAccuracy: 0.70 },
        sent: { needCorrect: 3, minAccuracy: 0.60 }
    },
    stars: {
        two: 0.85,
        three: 0.95,
        streakForThree: 5
    }
};

let gameXP = 0;

let stageState = {
    mc: { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 },
    write: { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 },
    sent: { correct: 0, attempts: 0, streak: 0, lives: 3, cleared: false, stars: 0 }
};

function getNFor(kind) {
    const b = blocks[currentBlockIndex];
    if (kind === "sent") return (b.sentences && b.sentences.length) ? b.sentences.length : 0;
    return (b.vocab && b.vocab.length) ? b.vocab.length : 0;
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
    setTimeout(() => {
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

function restartStage(kind) {
    clearAutoNext();
    resetStage(kind);
    if (kind === "mc") { wrongAttemptsMC = 0; lastVocabIndexMC = -1; try { const b = blocks[currentBlockIndex]; resetSeq("mc", (b.vocab && b.vocab.length) ? b.vocab.length : 0); } catch (e) { } loadMCQuestion(); }
    if (kind === "write") { wrongAttemptsWrite = 0; lastVocabIndexWrite = -1; try { const b = blocks[currentBlockIndex]; resetSeq("write", (b.vocab && b.vocab.length) ? b.vocab.length : 0); } catch (e) { } loadWQuestion(); }
    if (kind === "sent") { wrongAttemptsSent = 0; lastSentenceIndex = -1; try { const b = blocks[currentBlockIndex]; resetSeq("sent", (b.sentences && b.sentences.length) ? b.sentences.length : 0); } catch (e) { } loadSentence(); }
    updateExerciseVisibility();
    updateGateUI();
}

function restartCurrentBlock() {
    clearAutoNext();
    try { if (typeof resetAllStages === "function") resetAllStages(); } catch (e) { }
    try {
        if (typeof stats !== "undefined") {
            stats[currentBlockIndex] = { mc: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, sent: { correct: 0, total: 0 } };
        }
    } catch (e) { }
    loadBlock(currentBlockIndex);
    try { if (typeof updateStatsView === "function") updateStatsView(); } catch (e) { }
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

function currentKind() {
    if (currentExerciseStep === 1) return "mc";
    if (currentExerciseStep === 2) return "write";
    if (currentExerciseStep === 3) return "sent";
    return null;
}

/* ====== MODAL ====== */
const modalOverlayEl = document.getElementById("modalOverlay");
const modalTitleEl = document.getElementById("modalTitle");
const modalTextEl = document.getElementById("modalText");
const modalPrimaryEl = document.getElementById("modalPrimary");
const modalSecondaryEl = document.getElementById("modalSecondary");
const modalTertiaryEl = document.getElementById("modalTertiary");

let modalPrimaryAction = null;
let modalSecondaryAction = null;
let modalTertiaryAction = null;

function openModal({ title, text, primaryText = "Продовжити", secondaryText = null, tertiaryText = null, onPrimary = null, onSecondary = null, onTertiary = null }) {
    modalTitleEl.textContent = title;
    modalTextEl.textContent = text;
    modalPrimaryEl.textContent = primaryText;
    modalSecondaryEl.textContent = secondaryText || "";
    modalTertiaryEl.textContent = tertiaryText || "";
    modalPrimaryAction = onPrimary;
    modalSecondaryAction = onSecondary;
    modalTertiaryAction = onTertiary;
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

modalPrimaryEl.addEventListener("click", () => {
    const fn = modalPrimaryAction;
    closeModal();
    if (typeof fn === "function") fn();
});

modalSecondaryEl.addEventListener("click", () => {
    const fn = modalSecondaryAction;
    closeModal();
    if (typeof fn === "function") fn();
});

modalTertiaryEl.addEventListener("click", () => {
    const fn = modalTertiaryAction;
    closeModal();
    if (typeof fn === "function") fn();
});

modalOverlayEl.addEventListener("click", (e) => {
    if (e.target === modalOverlayEl) closeModal();
});

function showVictory(kind) {
    clearAutoNext();
    const stageNumber = (kind === "mc") ? 1 : (kind === "write") ? 2 : 3;
    const isFinalStage = (kind === "sent");
    const exerciseDone = isFinalStage && stageState.mc.cleared && stageState.write.cleared && stageState.sent.cleared;

    if (exerciseDone) {
        const stars = calcStars(kind);
        stageState[kind].stars = stars;
        openModal({
            title: "УРА! ВИ ПРОЙШЛИ ЦЮ ВПРАВУ 🎉 " + "⭐".repeat(stars),
            text: "Ви завершили всі етапи цієї вправи.",
            primaryText: "Продовжити навчання",
            secondaryText: "Повторити останній етап",
            tertiaryText: "Повторити вправу",
            onPrimary: () => { closeModal(); nextBlock(); },
            onSecondary: () => { closeModal(); restartStage(kind); },
            onTertiary: () => { closeModal(); restartCurrentBlock(); }
        });
        return;
    }

    const stars = calcStars(kind);
    stageState[kind].stars = stars;
    openModal({
        title: "ЕТАП " + stageNumber + " З 3 ПРОЙДЕНО  " + "⭐".repeat(stars),
        text: "Чудово! Можеш продовжити або повторити цей етап.",
        primaryText: "Продовжити",
        secondaryText: "Повторити етап",
        tertiaryText: "",
        onPrimary: () => { closeModal(); goNextStep(); },
        onSecondary: () => { closeModal(); restartStage(kind); }
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
    flashScreen("red");
    showToast(`Упс! Помилка 😅 Штраф: -${rollback}`);
    updateGateUI();
    if (kind === "mc") loadMCQuestion();
    if (kind === "write") loadWQuestion();
    if (kind === "sent") loadSentence();
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
}

function updateGateUI() {
    const kind = currentKind();
    if (currentExerciseStep === 0) {
        topPanelEl.style.display = "block";
        btnTopPanelEl.style.display = "none";
        btnTopPanelEl.textContent = "Показати панель";
    } else {
        topPanelEl.style.display = topPanelVisibleInPractice ? "block" : "none";
        btnTopPanelEl.style.display = "inline-flex";
        btnTopPanelEl.textContent = topPanelVisibleInPractice ? "Сховати панель" : "Показати панель";
    }
    if (!kind) {
        btnNextEx.disabled = false;
        return;
    }
    btnNextEx.disabled = !stageState[kind].cleared;
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
            stageBarEl.style.width = `${Math.round(progress * 100)}%`;
            const hue = Math.round(progress * 120);
            stageBarEl.style.backgroundColor = `hsl(${hue}, 85%, 45%)`;
        }
    }
    exerciseStepEl.textContent =
        `Етап ${currentExerciseStep} з 3 • ❤️ ${s.lives} • ✅ ${s.correct}/${cfg.needCorrect} • 🎯 ${acc}% (потрібно ${needAcc}%) • XP ${gameXP}`;
}

/* ====== ДОПОМІЖНІ ====== */
let autoNextTimeout = null;
let wrongAttemptsMC = 0;
let wrongAttemptsWrite = 0;
let wrongAttemptsSent = 0;

function randInt(max) {
    return Math.floor(Math.random() * max);
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = randInt(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function normalizeAnswer(str) {
    return str.toLowerCase().replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
}

function flashScreen(type) {
    const cls = type === "green" ? "flash-green" : "flash-red";
    document.body.classList.remove("flash-green", "flash-red");
    void document.body.offsetWidth;
    document.body.classList.add(cls);
    const duration = type === "red" ? 750 : 500;
    setTimeout(() => document.body.classList.remove(cls), duration);
}

function clearAutoNext() {
    if (autoNextTimeout !== null) {
        clearTimeout(autoNextTimeout);
        autoNextTimeout = null;
    }
}

/* ====== DOM ====== */
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

let topPanelVisibleInPractice = false;
let currentBlockIndex = 0;
let currentExerciseStep = 0;
let explainVisible = true;
let lastVocabIndexMC = -1;
let lastVocabIndexWrite = -1;
let lastSentenceIndex = -1;

function makeSeq() { return { pos: 0, last: -1, n: 0 }; }
const seq = { mc: makeSeq(), write: makeSeq(), sent: makeSeq() };

function resetSeq(kind, n) {
    seq[kind] = makeSeq();
    seq[kind].n = n || 0;
    seq[kind].pos = 0;
    seq[kind].last = -1;
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

function randIntExcept(max, last) {
    if (max <= 1) return 0;
    let i = randInt(max);
    if (i === last) {
        i = (i + 1 + randInt(max - 1)) % max;
        if (i === last) i = (i + 1) % max;
    }
    return i;
}

let currentVocabIndexMC = 0;
let currentVocabIndexWrite = 0;
let currentSentenceIndex = 0;
const stats = {};

function ensureStatsForBlock(index) {
    if (!stats[index]) {
        stats[index] = { mc: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, sent: { correct: 0, total: 0 } };
    }
}

function updateStatsView() {
    ensureStatsForBlock(currentBlockIndex);
    const st = stats[currentBlockIndex];
    statsEl.textContent =
        `Статистика цієї вправи (лише за цю сесію): вибір — ${st.mc.correct}/${st.mc.total}, написання — ${st.write.correct}/${st.write.total}, речення — ${st.sent.correct}/${st.sent.total}.`;
}

function updateExplainVisibility() {
    if (currentExerciseStep === 0) {
        explainVisible = true;
        explainEl.style.display = "block";
        btnToggleExplain.disabled = true;
        btnToggleExplain.textContent = "Сховати пояснення";
    } else {
        btnToggleExplain.disabled = false;
        explainEl.style.display = explainVisible ? "block" : "none";
        btnToggleExplain.textContent = explainVisible ? "Сховати пояснення" : "Показати пояснення";
    }
}

function updateExerciseVisibility() {
    ex1Card.style.display = (currentExerciseStep === 1) ? "block" : "none";
    ex2Card.style.display = (currentExerciseStep === 2) ? "block" : "none";
    ex3Card.style.display = (currentExerciseStep === 3) ? "block" : "none";
    if (currentExerciseStep === 0) {
        exerciseStepEl.textContent = "Спочатку спокійно прочитай пояснення, потім натисни «Почати вправи».";
        btnNextEx.textContent = "Почати вправи";
    } else if (currentExerciseStep === 1) {
        exerciseStepEl.textContent = "Етап 1 з 3: просто обери правильну фразу.";
        btnNextEx.textContent = "Перейти до 2-го етапу";
    } else if (currentExerciseStep === 2) {
        exerciseStepEl.textContent = "Етап 2 з 3: напиши фразу сам.";
        btnNextEx.textContent = "Перейти до 3-го етапу";
    } else {
        exerciseStepEl.textContent = "Етап 3 з 3: переклади маленькі речення.";
        btnNextEx.textContent = "Усі етапи пройдені — можна перейти до наступної вправи";
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
        return;
    }
    if (currentExerciseStep < 3) {
        currentExerciseStep++;
        updateExerciseVisibility();
    } else {
        openModal({ title: "Вже останній етап", text: "Ця вправа вже на останньому етапі. Можна повторити її або перейти далі.", primaryText: "Ок" });
    }
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
        resetSeq("mc", (b.vocab && b.vocab.length) ? b.vocab.length : 0);
        resetSeq("write", (b.vocab && b.vocab.length) ? b.vocab.length : 0);
        resetSeq("sent", (b.sentences && b.sentences.length) ? b.sentences.length : 0);
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
    blockTitleEl.textContent = `Вправа ${currentBlockIndex + 1}. ${block.title}`;
    blockProgressTextEl.textContent = `Вправа ${currentBlockIndex + 1} з ${total}`;
    explainEl.innerHTML = `${block.topicTag ? `<div class="topic-tag">${block.topicTag}</div>` : ""}${block.explanation}`;
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
}

function loadMCQuestion() {
    clearAutoNext();
    wrongAttemptsMC = 0;
    const block = blocks[currentBlockIndex];
    if (!block || !block.vocab || !block.vocab.length) {
        mcQuestionEl.textContent = "Для цієї вправи поки немає слів.";
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
        if (!options.includes(opt)) options.push(opt);
    }
    shuffle(options);
    mcOptionsEl.innerHTML = "";
    options.forEach(text => {
        const btn = document.createElement("button");
        btn.textContent = text;
        btn.className = "option-btn";
        btn.addEventListener("click", () => checkMCAnswer(btn, text, card.en));
        mcOptionsEl.appendChild(btn);
    });
}

function checkMCAnswer(button, chosen, correct) {
    clearAutoNext();
    ensureStatsForBlock(currentBlockIndex);
    const st = stats[currentBlockIndex].mc;
    st.total++;
    if (normalizeAnswer(chosen) === normalizeAnswer(correct)) {
        flashScreen("green");
        mcFeedbackEl.textContent = "✅ Правильно!";
        mcFeedbackEl.className = "feedback correct";
        st.correct++;
        onCorrect("mc");
        speakSpanish(correct);
        button.classList.add("correct");
        updateStatsView();
        autoNextTimeout = setTimeout(() => loadMCQuestion(), 900);
    } else {
        wrongAttemptsMC++;
        flashScreen("red");
        if (wrongAttemptsMC >= 3) {
            mcFeedbackEl.textContent = "❌ Не зовсім. Підказка: правильна відповідь — " + correct;
            speakSpanish(correct);
        } else {
            mcFeedbackEl.textContent = "❌ Не зовсім. Спробуй ще раз.";
        }
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
        wQuestionEl.textContent = "Для цієї вправи поки немає слів.";
        return;
    }
    currentVocabIndexWrite = nextIndex("write", block.vocab.length);
    lastVocabIndexWrite = currentVocabIndexWrite;
    const card = block.vocab[currentVocabIndexWrite];
    wQuestionEl.textContent = card.ua;
    wInputEl.value = "";
    wFeedbackEl.textContent = "";
    wFeedbackEl.className = "feedback";
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
        flashScreen("green");
        wFeedbackEl.textContent = "✅ Чудово! Саме так і пишеться.";
        wFeedbackEl.className = "feedback correct";
        st.correct++;
        onCorrect("write");
        speakSpanish(card.en);
        updateStatsView();
        autoNextTimeout = setTimeout(() => loadWQuestion(), 900);
    } else {
        wrongAttemptsWrite++;
        flashScreen("red");
        if (wrongAttemptsWrite >= 3) {
            wFeedbackEl.textContent = "❌ Трохи не так. Підказка: правильна відповідь — " + card.en;
            speakSpanish(card.en);
        } else {
            wFeedbackEl.textContent = "❌ Трохи не так. Виправ і натисни ще раз.";
        }
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
    wFeedbackEl.textContent = "Правильна відповідь: " + card.en;
    wFeedbackEl.className = "feedback";
    speakSpanish(card.en);
}

wCheckBtn.addEventListener("click", checkWAnswer);
wShowBtn.addEventListener("click", showWAnswer);
wNextBtn.addEventListener("click", loadWQuestion);
wInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") checkWAnswer(); });

function loadSentence() {
    clearAutoNext();
    wrongAttemptsSent = 0;
    const block = blocks[currentBlockIndex];
    if (!block || !block.sentences || !block.sentences.length) {
        sQuestionEl.textContent = "Для цієї вправи поки немає речень.";
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
        flashScreen("green");
        sFeedbackEl.textContent = "✅ Чудово! Речення перекладено точно.";
        sFeedbackEl.className = "feedback correct";
        st.correct++;
        onCorrect("sent");
        speakSpanish(card.en);
        updateStatsView();
        autoNextTimeout = setTimeout(() => loadSentence(), 900);
    } else {
        wrongAttemptsSent++;
        flashScreen("red");
        if (wrongAttemptsSent >= 3) {
            sFeedbackEl.textContent = "❌ Трохи не так. Підказка: правильний варіант —\n" + card.en;
        } else {
            sFeedbackEl.textContent = "❌ Трохи не так. Спробуй ще раз або натисни «Показати відповідь».";
        }
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
    sFeedbackEl.textContent = "Правильний варіант:\n" + card.en;
    sFeedbackEl.className = "feedback";
    speakSpanish(card.en);
}

sCheckBtn.addEventListener("click", checkSentence);
sShowBtn.addEventListener("click", showSentenceAnswer);
sNextBtn.addEventListener("click", loadSentence);
sInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) checkSentence(); });

btnPrev.addEventListener("click", () => { if (currentBlockIndex > 0) loadBlock(currentBlockIndex - 1); });
btnNext.addEventListener("click", () => { if (currentBlockIndex < blocks.length - 1) loadBlock(currentBlockIndex + 1); });
btnNextEx.addEventListener("click", nextExerciseStep);

btnToggleExplain.addEventListener("click", () => {
    if (currentExerciseStep === 0) {
        explainVisible = true;
        updateExplainVisibility();
        return;
    }
    explainVisible = !explainVisible;
    updateExplainVisibility();
});

btnTopPanelEl.addEventListener("click", () => {
    if (currentExerciseStep === 0) return;
    topPanelVisibleInPractice = !topPanelVisibleInPractice;
    updateGateUI();
});

blockSelectEl.addEventListener("change", () => {
    const idx = parseInt(blockSelectEl.value, 10);
    loadBlock(idx);
});

btnRestart.addEventListener("click", () => {
    clearAutoNext();
    stats[currentBlockIndex] = { mc: { correct: 0, total: 0 }, write: { correct: 0, total: 0 }, sent: { correct: 0, total: 0 } };
    updateStatsView();
    resetAllStages();
    lastVocabIndexMC = -1;
    lastVocabIndexWrite = -1;
    lastSentenceIndex = -1;
    try {
        const b = blocks[currentBlockIndex];
        resetSeq("mc", (b.vocab && b.vocab.length) ? b.vocab.length : 0);
        resetSeq("write", (b.vocab && b.vocab.length) ? b.vocab.length : 0);
        resetSeq("sent", (b.sentences && b.sentences.length) ? b.sentences.length : 0);
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

let TTS_ENABLED = true;
let TTS_LANG = "es-ES";

function speakSpanish(text) {
    if (!TTS_ENABLED) return;
    if (!("speechSynthesis" in window)) return;
    try { window.speechSynthesis.cancel(); } catch (e) { }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS_LANG;
    u.rate = 0.95;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
}

function init() {
    blocks.forEach((b, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `${i + 1}. ${b.title}`;
        blockSelectEl.appendChild(opt);
    });
    loadBlock(0);
    try { resetStage("mc"); resetStage("write"); resetStage("sent"); } catch (e) { }
}

loadExercises().then(init);
