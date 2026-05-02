/**
 * Speed puzzle timer: stopwatch, named splits (tap to record), PPM metronome after a chosen split.
 */

const STORAGE_SPLITS = "speedpuzzle_split_names";
const STORAGE_PPM = "speedpuzzle_ppm_target";
const STORAGE_WAKE = "speedpuzzle_wake_default";
const STORAGE_SOUND = "speedpuzzle_ppm_sound";
const STORAGE_TRIGGER = "speedpuzzle_ppm_trigger";
const STORAGE_PIECES = "speedpuzzle_piece_count";
const STORAGE_PIECES_FINAL = "speedpuzzle_piece_count_final";
const STORAGE_PIECES_PACE = "speedpuzzle_piece_count_pace";

let running = false;
let startPerf = 0;
let elapsedOffsetMs = 0;
let rafId = 0;

let splitNames = loadSplitNames();
let recordedSplits = [];
let splitIndex = 0;

let wakeLock = null;
let wakeRequested = true;

let audioCtx = null;
let ppmActive = false;
let ppmIntervalId = 0;

const els = {
  timeDisplay: document.getElementById("timeDisplay"),
  pieceCountFinal: document.getElementById("pieceCountFinal"),
  pieceCountPace: document.getElementById("pieceCountPace"),
  finalPpmValue: document.getElementById("finalPpmValue"),
  expectedDuration: document.getElementById("expectedDuration"),
  btnStart: document.getElementById("btnStart"),
  btnStop: document.getElementById("btnStop"),
  btnReset: document.getElementById("btnReset"),
  wakeLockToggle: document.getElementById("wakeLockToggle"),
  splitEditor: document.getElementById("splitEditor"),
  btnAddSplit: document.getElementById("btnAddSplit"),
  tapZone: document.getElementById("tapZone"),
  tapZoneLabel: document.getElementById("tapZoneLabel"),
  splitList: document.getElementById("splitList"),
  ppmAfterSplit: document.getElementById("ppmAfterSplit"),
  ppmTarget: document.getElementById("ppmTarget"),
  ppmSound: document.getElementById("ppmSound"),
  ppmStatus: document.getElementById("ppmStatus"),
  btnPpmStop: document.getElementById("btnPpmStop"),
  btnPreviewTick: document.getElementById("btnPreviewTick"),
};

function loadSplitNames() {
  try {
    const raw = localStorage.getItem(STORAGE_SPLITS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed.map(String);
    }
  } catch {
    /* ignore */
  }
  return ["Flipped pieces", "Edges"];
}

function saveSplitNames() {
  localStorage.setItem(STORAGE_SPLITS, JSON.stringify(splitNames));
}

function loadNum(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    return audioCtx.resume();
  }
  return Promise.resolve();
}

function playTick(kind) {
  const ctx = audioCtx;
  if (!ctx) return;
  const t = ctx.currentTime;
  const dur = kind === "click" ? 0.012 : kind === "tick" ? 0.02 : 0.06;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (kind === "click") {
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  } else if (kind === "tick") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  } else {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(660, t);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  }

  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const frac = total % 1000;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(frac).padStart(3, "0")}`;
}

/** Duration for pace estimates (supports hours). */
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const total = Math.floor(ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const frac = total % 1000;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(frac).padStart(3, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}.${String(frac).padStart(3, "0")}`;
}

function getPieceCountFinal() {
  const n = Math.floor(Number(els.pieceCountFinal.value));
  if (!Number.isFinite(n) || n < 1) return 500;
  return Math.min(99999, n);
}

function getPieceCountPace() {
  const n = Math.floor(Number(els.pieceCountPace.value));
  if (!Number.isFinite(n) || n < 1) return 500;
  return Math.min(99999, n);
}

function updateExpectedDuration() {
  const pieces = getPieceCountPace();
  const ppm = Math.max(1, Math.min(600, Number(els.ppmTarget.value) || 40));
  const ms = (pieces / ppm) * 60000;
  els.expectedDuration.textContent = formatDuration(ms);
}

function updateFinalPpmDisplay() {
  if (running || elapsedOffsetMs <= 0) {
    els.finalPpmValue.textContent = "—";
    return;
  }
  const pieces = getPieceCountFinal();
  const ppm = (pieces * 60000) / elapsedOffsetMs;
  els.finalPpmValue.textContent = ppm.toFixed(1);
}

function currentElapsedMs() {
  if (!running) return elapsedOffsetMs;
  return elapsedOffsetMs + (performance.now() - startPerf);
}

function tickDisplay() {
  els.timeDisplay.textContent = formatTime(currentElapsedMs());
  if (running) rafId = requestAnimationFrame(tickDisplay);
}

async function requestWake() {
  if (!wakeRequested || !("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    wakeLock = null;
  }
}

async function releaseWake() {
  try {
    if (wakeLock) await wakeLock.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && running && wakeRequested) {
    requestWake();
  }
});

function updateTapZoneLabel() {
  if (!running) {
    els.tapZoneLabel.textContent = "Start the timer, then tap here to record splits";
    return;
  }
  const nextName = splitNames[splitIndex];
  if (nextName !== undefined && String(nextName).trim() !== "") {
    els.tapZoneLabel.textContent = `Next: "${nextName}" — tap to record`;
  } else {
    els.tapZoneLabel.textContent = `Next split #${splitIndex + 1} — tap to record`;
  }
}

function renderSplitEditor() {
  els.splitEditor.innerHTML = "";
  splitNames.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "split-row";
    const input = document.createElement("input");
    input.type = "text";
    input.value = name;
    input.placeholder = `Split ${i + 1}`;
    input.autocomplete = "off";
    input.addEventListener("change", () => {
      splitNames[i] = input.value;
      saveSplitNames();
      refreshPpmTriggerOptions();
      updateTapZoneLabel();
    });
    input.addEventListener("input", () => {
      splitNames[i] = input.value;
    });
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove";
    btn.setAttribute("aria-label", "Remove split");
    btn.textContent = "×";
    btn.addEventListener("click", () => {
      splitNames.splice(i, 1);
      saveSplitNames();
      renderSplitEditor();
      refreshPpmTriggerOptions();
      updateTapZoneLabel();
    });
    row.append(input, btn);
    els.splitEditor.append(row);
  });
}

function refreshPpmTriggerOptions() {
  const sel = els.ppmAfterSplit;
  const saved = localStorage.getItem(STORAGE_TRIGGER) || "";
  sel.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "(none)";
  sel.append(none);
  splitNames.forEach((name, i) => {
    const opt = document.createElement("option");
    const label = String(name).trim() || `Split ${i + 1}`;
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${label}`;
    sel.append(opt);
  });
  let pick = "";
  if (/^\d+$/.test(saved)) {
    pick = [...sel.options].some((o) => o.value === saved) ? saved : "";
  } else if (saved) {
    const j = splitNames.findIndex((n) => String(n).trim() === saved);
    if (j >= 0) pick = String(j);
  }
  sel.value = pick;
}

function renderSplitList() {
  els.splitList.innerHTML = "";
  recordedSplits.forEach((s) => {
    const li = document.createElement("li");
    const lab = document.createElement("span");
    lab.className = "label";
    lab.textContent = s.label;
    const el = document.createElement("span");
    el.className = "elapsed";
    el.textContent = formatTime(s.atMs);
    li.append(lab, el);
    els.splitList.append(li);
  });
}

function maybeStartPpmAfterRecordedSplit() {
  const raw = els.ppmAfterSplit.value;
  if (raw === "" || ppmActive) return;
  const triggerIdx = Number(raw);
  if (!Number.isFinite(triggerIdx)) return;
  const recordedIdx = splitIndex - 1;
  if (recordedIdx !== triggerIdx) return;
  const ppm = Math.max(1, Math.min(600, Number(els.ppmTarget.value) || 40));
  els.ppmTarget.value = String(ppm);
  localStorage.setItem(STORAGE_PPM, String(ppm));
  startPpmMetronome(ppm);
}

function startPpmMetronome(ppm) {
  stopPpmMetronome(false);
  ppmActive = true;
  const intervalMs = 60000 / ppm;
  const sound = els.ppmSound.value || "beep";
  els.ppmStatus.textContent = `Metronome: ${ppm} ppm (${intervalMs.toFixed(0)} ms per piece)`;
  els.ppmStatus.classList.add("active");
  els.btnPpmStop.disabled = false;

  ensureAudio().then(() => {
    playTick(sound);
    ppmIntervalId = window.setInterval(() => {
      playTick(sound);
    }, intervalMs);
  });
}

function stopPpmMetronome(updateUi) {
  if (ppmIntervalId) {
    clearInterval(ppmIntervalId);
    ppmIntervalId = 0;
  }
  ppmActive = false;
  if (updateUi !== false) {
    els.ppmStatus.textContent = "";
    els.ppmStatus.classList.remove("active");
    els.btnPpmStop.disabled = true;
  }
}

function recordSplit() {
  if (!running) return;
  ensureAudio();
  const at = currentElapsedMs();
  const rawName = splitNames[splitIndex];
  const label =
    rawName !== undefined && String(rawName).trim() !== ""
      ? String(rawName).trim()
      : `Split ${splitIndex + 1}`;
  recordedSplits.push({ label, atMs: at });
  splitIndex += 1;
  renderSplitList();
  maybeStartPpmAfterRecordedSplit();

  els.tapZone.classList.add("split-flash");
  window.setTimeout(() => els.tapZone.classList.remove("split-flash"), 120);
  updateTapZoneLabel();
}

function onTapZoneDown(e) {
  if (e.target.closest("input, button, select, label")) return;
  recordSplit();
}

function startTimer() {
  if (running) return;
  ensureAudio();
  running = true;
  startPerf = performance.now();
  if (elapsedOffsetMs > 0) {
    /* continue from pause — offset already set */
  }
  els.btnStart.disabled = true;
  els.btnStop.disabled = false;
  tickDisplay();
  if (els.wakeLockToggle.checked) requestWake();
  updateTapZoneLabel();
  updateFinalPpmDisplay();
}

function stopTimer() {
  if (!running) return;
  /* Freeze elapsed while `running` is still true, then commit state. Otherwise a queued
     requestAnimationFrame tick can run after running=false but before elapsedOffsetMs is
     written and redraw the display from stale offset (e.g. 0). */
  const frozen = currentElapsedMs();
  elapsedOffsetMs = frozen;
  running = false;
  cancelAnimationFrame(rafId);
  els.btnStart.disabled = false;
  els.btnStop.disabled = true;
  els.timeDisplay.textContent = formatTime(elapsedOffsetMs);
  releaseWake();
  stopPpmMetronome();
  updateTapZoneLabel();
  updateFinalPpmDisplay();
}

function resetAll() {
  running = false;
  cancelAnimationFrame(rafId);
  elapsedOffsetMs = 0;
  recordedSplits = [];
  splitIndex = 0;
  els.timeDisplay.textContent = formatTime(0);
  els.btnStart.disabled = false;
  els.btnStop.disabled = true;
  renderSplitList();
  releaseWake();
  stopPpmMetronome();
  updateTapZoneLabel();
  updateFinalPpmDisplay();
}

els.btnStart.addEventListener("click", () => {
  if (!running && elapsedOffsetMs === 0) {
    splitIndex = 0;
    recordedSplits = [];
    renderSplitList();
  }
  startTimer();
});

els.btnStop.addEventListener("click", stopTimer);

els.btnReset.addEventListener("click", resetAll);

els.btnAddSplit.addEventListener("click", () => {
  splitNames.push(`Split ${splitNames.length + 1}`);
  saveSplitNames();
  renderSplitEditor();
  refreshPpmTriggerOptions();
});

els.tapZone.addEventListener("click", (e) => {
  e.preventDefault();
  onTapZoneDown(e);
});

els.tapZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    recordSplit();
  }
});

document.body.addEventListener(
  "click",
  (e) => {
    if (!running) return;
    const t = e.target;
    if (t.closest(".tap-zone")) return;
    if (t.closest("button, input, select, textarea, label, a")) return;
    if (t.closest(".split-editor")) return;
    recordSplit();
  },
  true,
);

els.wakeLockToggle.addEventListener("change", () => {
  wakeRequested = els.wakeLockToggle.checked;
  localStorage.setItem(STORAGE_WAKE, wakeRequested ? "1" : "0");
  if (running && wakeRequested) requestWake();
  else releaseWake();
});

els.ppmTarget.addEventListener("change", () => {
  const v = Math.max(1, Math.min(600, Number(els.ppmTarget.value) || 40));
  els.ppmTarget.value = String(v);
  localStorage.setItem(STORAGE_PPM, String(v));
  updateExpectedDuration();
  if (ppmActive && els.ppmAfterSplit.value !== "") startPpmMetronome(v);
});

function persistPieceCountFinal() {
  const v = getPieceCountFinal();
  els.pieceCountFinal.value = String(v);
  localStorage.setItem(STORAGE_PIECES_FINAL, String(v));
}

function persistPieceCountPace() {
  const v = getPieceCountPace();
  els.pieceCountPace.value = String(v);
  localStorage.setItem(STORAGE_PIECES_PACE, String(v));
}

els.pieceCountFinal.addEventListener("change", () => {
  persistPieceCountFinal();
  updateFinalPpmDisplay();
});

els.pieceCountFinal.addEventListener("input", () => {
  if (!running) updateFinalPpmDisplay();
});

els.pieceCountPace.addEventListener("change", () => {
  persistPieceCountPace();
  updateExpectedDuration();
});

els.pieceCountPace.addEventListener("input", () => {
  updateExpectedDuration();
});

els.ppmSound.addEventListener("change", () => {
  localStorage.setItem(STORAGE_SOUND, els.ppmSound.value);
  if (ppmActive) {
    const ppm = Number(els.ppmTarget.value) || 40;
    startPpmMetronome(ppm);
  }
});

els.btnPreviewTick.addEventListener("click", () => {
  const kind = els.ppmSound.value || "beep";
  ensureAudio().then(() => playTick(kind));
});

els.ppmAfterSplit.addEventListener("change", () => {
  localStorage.setItem(STORAGE_TRIGGER, els.ppmAfterSplit.value);
});

els.btnPpmStop.addEventListener("click", () => stopPpmMetronome());

function init() {
  const migrated = loadNum(STORAGE_PIECES, 500);
  const final = loadNum(STORAGE_PIECES_FINAL, migrated);
  const pace = loadNum(STORAGE_PIECES_PACE, migrated);
  els.pieceCountFinal.value = String(Math.min(99999, Math.max(1, final)));
  els.pieceCountPace.value = String(Math.min(99999, Math.max(1, pace)));
  els.ppmTarget.value = String(loadNum(STORAGE_PPM, 40));
  els.wakeLockToggle.checked = localStorage.getItem(STORAGE_WAKE) !== "0";
  wakeRequested = els.wakeLockToggle.checked;
  const snd = localStorage.getItem(STORAGE_SOUND);
  if (snd && ["beep", "click", "tick"].includes(snd)) els.ppmSound.value = snd;

  renderSplitEditor();
  refreshPpmTriggerOptions();

  updateTapZoneLabel();
  updateExpectedDuration();
  updateFinalPpmDisplay();
}

init();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
