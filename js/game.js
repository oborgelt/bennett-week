(function (global) {
  const KEYS = {
    progress: "bw-progress",
    unlocks: "bw-unlocks",
    bananas: "bw-bananas",
    eggs: "bw-eggs",
    mom: "bw-mom-achievements",
    family: "bw-family",
    trophyOrder: "bw-trophy-order",
    opened: "bw-opened",
    opens: "bw-opens"
  };

  const EGG_NAMES = {
    "banner-monkey": "Garage-band grin",
    "hidden-ball": "Stray tennis ball",
    "clarinet-honk": "Bass clarinet honk"
  };

  const OPEN_DEBOUNCE_MS = 15 * 60 * 1000;

  const ICONS = {
    tennis: "img/monkey-tennis.png",
    guitar: "img/monkey-guitar-clarinet.png",
    clarinet: "img/monkey-guitar-clarinet.png",
    badge: "img/monkey-badge.png",
    banana: "img/monkey-badge.png",
    band: "img/monkey-band-banner.png"
  };

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function currency(pack) {
    return pack.currency || { name: "bananas", singular: "banana", emoji: "🍌" };
  }

  function iconFor(name) {
    return ICONS[name] || ICONS.badge;
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function fmtStamp(iso) {
    if (!iso) return "";
    const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).formatToParts(d);
    const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
    const day = `${get("month")}/${get("day")}`;
    const time = `${get("hour")}:${get("minute")} ${get("dayPeriod")}`.trim();
    return day && time ? `${day}, ${time}` : d.toLocaleString("en-US");
  }

  function chicagoYmd(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date || new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  function lastNChicagoDays(n) {
    const [y, m, d] = chicagoYmd().split("-").map(Number);
    const start = new Date(y, m - 1, d);
    return Array.from({ length: n }, (_, i) => {
      const x = new Date(start);
      x.setDate(start.getDate() - (n - 1 - i));
      const yy = x.getFullYear();
      const mm = String(x.getMonth() + 1).padStart(2, "0");
      const dd = String(x.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    });
  }

  function parseStamp(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function getProgress() {
    return read(KEYS.progress, {});
  }

  function getUnlocks() {
    return read(KEYS.unlocks, {});
  }

  function getBananas() {
    return Number(read(KEYS.bananas, 0)) || 0;
  }

  function addBananas(n) {
    const next = getBananas() + (Number(n) || 0);
    write(KEYS.bananas, next);
    return next;
  }

  function getEggs() {
    return read(KEYS.eggs, {});
  }

  function usingMomDraft() {
    return !!localStorage.getItem(KEYS.mom);
  }

  function getMomDraft() {
    return read(KEYS.mom, null);
  }

  function saveMomDraft(pack) {
    write(KEYS.mom, pack);
  }

  function clearMomDraft() {
    localStorage.removeItem(KEYS.mom);
  }

  function emptyFamily() {
    return { notes: [], reflections: { pool: [], answers: [] }, streaks: {} };
  }

  function normalizeFamily(raw) {
    const f = raw && typeof raw === "object" ? raw : {};
    const reflections = f.reflections && typeof f.reflections === "object" ? f.reflections : {};
    return {
      notes: Array.isArray(f.notes) ? f.notes : [],
      reflections: {
        pool: Array.isArray(reflections.pool) ? reflections.pool : [],
        answers: Array.isArray(reflections.answers) ? reflections.answers : []
      },
      streaks: f.streaks && typeof f.streaks === "object" && !Array.isArray(f.streaks) ? f.streaks : {}
    };
  }

  function getFamilyDraft() {
    const stored = read(KEYS.family, null);
    return stored ? normalizeFamily(stored) : null;
  }

  function saveFamily(family) {
    write(KEYS.family, normalizeFamily(family));
  }

  function clearFamilyDraft() {
    localStorage.removeItem(KEYS.family);
  }

  function usingFamilyDraft() {
    return !!localStorage.getItem(KEYS.family);
  }

  function getTrophyOrder() {
    const order = read(KEYS.trophyOrder, []);
    return Array.isArray(order) ? order : [];
  }

  function saveTrophyOrder(ids) {
    write(KEYS.trophyOrder, ids);
  }

  function parseSeed(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (_) {
      return null;
    }
  }

  async function fetchJson(path, fallback) {
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (_) {}
    return fallback;
  }

  async function loadWeek() {
    const seed = parseSeed("week-seed") || parseSeed("seed");
    return fetchJson("week.json", seed);
  }

  async function loadAchievements() {
    const seed = parseSeed("ach-seed");
    const file = await fetchJson("achievements.json", seed);
    const draft = getMomDraft();
    return draft || file || { currency: currency({}), achievements: [] };
  }

  async function loadFamily() {
    const seed = normalizeFamily(parseSeed("family-seed") || emptyFamily());
    const stored = getFamilyDraft();
    if (stored) return stored;
    const file = await fetchJson("family.json", null);
    return normalizeFamily(file || seed);
  }

  function emptyProgressSeed() {
    return { timezone: "America/Chicago", classes: [], sampleOpens: [], eggNames: EGG_NAMES };
  }

  function normalizeProgressSeed(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    return {
      timezone: p.timezone || "America/Chicago",
      gradesNote: p.gradesNote || "",
      classes: Array.isArray(p.classes) ? p.classes : [],
      sampleOpens: Array.isArray(p.sampleOpens) ? p.sampleOpens : [],
      eggNames: p.eggNames && typeof p.eggNames === "object" ? Object.assign({}, EGG_NAMES, p.eggNames) : Object.assign({}, EGG_NAMES)
    };
  }

  async function loadProgress() {
    const seed = normalizeProgressSeed(parseSeed("progress-seed") || emptyProgressSeed());
    const file = await fetchJson("progress.json", null);
    return normalizeProgressSeed(file || seed);
  }

  function workState(id) {
    const cur = getProgress()[id] || {};
    const started = !!(cur.started || cur.startedAt);
    let startedAt = cur.startedAt || null;
    if (!startedAt && typeof cur.started === "number") {
      startedAt = new Date(cur.started).toISOString();
    }
    if (!startedAt && typeof cur.started === "string" && cur.started !== "true") {
      startedAt = cur.started;
    }
    return { started, startedAt, done: cur.done || null };
  }

  function touchWork(id, kind) {
    const all = getProgress();
    const cur = Object.assign({}, all[id] || {});
    let first = false;
    if (kind === "started") {
      if (!cur.started && !cur.startedAt) {
        cur.started = true;
        cur.startedAt = nowIso();
        first = true;
        addBananas(2);
      }
    } else if (kind === "done") {
      if (!cur.done) {
        cur.done = Date.now();
        first = true;
        addBananas(3);
      }
    }
    all[id] = cur;
    write(KEYS.progress, all);
    return { first, state: workState(id) };
  }

  function recordHelp(id) {
    if (!id) return workState(id);
    const all = getProgress();
    const cur = Object.assign({}, all[id] || {});
    const times = Array.isArray(cur.helpOpened) ? cur.helpOpened.slice() : [];
    const last = times[times.length - 1];
    const lastMs = last ? (parseStamp(last) || {}).getTime?.() || 0 : 0;
    if (!last || Date.now() - lastMs > 60 * 1000) {
      times.push(nowIso());
    }
    cur.helpOpened = times;
    all[id] = cur;
    write(KEYS.progress, all);
    return workState(id);
  }

  function helpOpens(id) {
    const cur = getProgress()[id] || {};
    return Array.isArray(cur.helpOpened) ? cur.helpOpened : [];
  }

  function alreadyUnlocked(id) {
    return !!getUnlocks()[id];
  }

  function markUnlocked(id) {
    const all = getUnlocks();
    if (all[id]) return false;
    all[id] = Date.now();
    write(KEYS.unlocks, all);
    return true;
  }

  function evaluate(ach, ctx) {
    const rule = ach.unlock || {};
    if (rule.type === "easter_egg") return !!(ctx.eggs && ctx.eggs[rule.egg]);
    return false;
  }

  function checkUnlocks(pack, ctx) {
    const fresh = [];
    (pack.achievements || []).forEach((ach) => {
      if (alreadyUnlocked(ach.id)) return;
      if (!evaluate(ach, ctx)) return;
      if (markUnlocked(ach.id)) {
        addBananas(ach.reward || 0);
        fresh.push(ach);
      }
    });
    return fresh;
  }

  function awardAchievement(pack, id) {
    const ach = (pack.achievements || []).find((a) => a.id === id);
    if (!ach) return null;
    if (!markUnlocked(id)) return null;
    addBananas(ach.reward || 0);
    return ach;
  }

  function recordEgg(egg) {
    const eggs = getEggs();
    if (eggs[egg]) return false;
    eggs[egg] = Date.now();
    write(KEYS.eggs, eggs);
    return true;
  }

  function bumpEggCount(egg) {
    const eggs = getEggs();
    const n = (Number(eggs[egg + "-count"]) || 0) + 1;
    eggs[egg + "-count"] = n;
    write(KEYS.eggs, eggs);
    return n;
  }

  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function confetti() {
    if (prefersReducedMotion()) return;
    let layer = document.getElementById("confetti");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "confetti";
      layer.className = "confetti";
      document.body.appendChild(layer);
    }
    const colors = ["#c6e03a", "#f4d35e", "#f4a261", "#2a9d8f", "#8ec5ff", "#f0a8b8"];
    for (let i = 0; i < 28; i += 1) {
      const bit = document.createElement("i");
      bit.style.left = Math.random() * 100 + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.2) + "s";
      bit.style.transform = "translateY(0) rotate(" + (Math.random() * 80) + "deg)";
      layer.appendChild(bit);
      setTimeout(() => bit.remove(), 1300);
    }
  }

  function honk() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = honk._ctx || new Ctx();
      honk._ctx = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(260, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.28);
      g.gain.setValueAtTime(0.07, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.42);
    } catch (_) {}
  }

  function celebrate(ach, pack) {
    const cur = currency(pack);
    const prize = ach.incentive ? " · " + ach.incentive : "";
    const extra = ach.reward ? " · +" + ach.reward + " " + cur.name : "";
    toast((ach.title || "Achievement") + " unlocked!" + prize + extra);
    confetti();
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }

  function readOpenLog() {
    const stored = read(KEYS.opens, null);
    if (Array.isArray(stored)) return stored.slice();
    return null;
  }

  function firstOpenedIso() {
    const raw = localStorage.getItem(KEYS.opened);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const d = parseStamp(parsed);
      return d ? d.toISOString() : null;
    } catch (_) {
      const d = parseStamp(raw);
      return d ? d.toISOString() : null;
    }
  }

  function getOpens() {
    const log = readOpenLog();
    if (log && log.length) return log;
    const first = firstOpenedIso();
    return first ? [first] : [];
  }

  function markOpened() {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    if (!localStorage.getItem(KEYS.opened)) write(KEYS.opened, nowMs);

    let opens = readOpenLog();
    if (!opens) {
      opens = [];
      const first = firstOpenedIso();
      if (first && first !== nowIso) opens.push(first);
    }

    const last = opens[opens.length - 1];
    const lastMs = last ? (parseStamp(last) || {}).getTime?.() || 0 : 0;
    if (!last || nowMs - lastMs >= OPEN_DEBOUNCE_MS) {
      opens.push(nowIso);
      write(KEYS.opens, opens);
    }
    return opens;
  }

  function foundEggs(eggNames) {
    const eggs = getEggs();
    const names = eggNames && typeof eggNames === "object" ? eggNames : EGG_NAMES;
    return Object.keys(eggs)
      .filter((k) => !k.endsWith("-count") && eggs[k])
      .map((id) => ({
        id,
        name: names[id] || "A jungle surprise",
        at: parseStamp(eggs[id]) ? parseStamp(eggs[id]).toISOString() : null
      }));
  }

  function notesFor(family, targetType, targetId) {
    return (family.notes || []).filter((n) => n.targetType === targetType && n.targetId === targetId);
  }

  function addNote(family, note) {
    const next = normalizeFamily(family);
    next.notes = next.notes.concat([note]);
    saveFamily(next);
    return next;
  }

  function exportPack(pack, family) {
    return {
      version: 2,
      currency: currency(pack),
      achievements: pack.achievements || [],
      family: normalizeFamily(family),
      unlocks: getUnlocks(),
      trophyOrder: getTrophyOrder()
    };
  }

  function importPack(obj) {
    if (!obj || typeof obj !== "object") return null;
    const pack = {
      currency: obj.currency || currency({}),
      achievements: Array.isArray(obj.achievements)
        ? obj.achievements
        : (obj.achievementsPack && obj.achievementsPack.achievements) || []
    };
    if (obj.achievementsPack && obj.achievementsPack.currency) {
      pack.currency = obj.achievementsPack.currency;
    }
    saveMomDraft(pack);
    if (obj.family) saveFamily(obj.family);
    if (obj.unlocks && typeof obj.unlocks === "object") write(KEYS.unlocks, obj.unlocks);
    if (Array.isArray(obj.trophyOrder)) saveTrophyOrder(obj.trophyOrder);
    return pack;
  }

  global.Game = {
    KEYS,
    esc,
    uid,
    nowIso,
    fmtStamp,
    currency,
    iconFor,
    prefersReducedMotion,
    loadWeek,
    loadAchievements,
    loadFamily,
    loadProgress,
    getProgress,
    getUnlocks,
    getBananas,
    addBananas,
    getEggs,
    usingMomDraft,
    getMomDraft,
    saveMomDraft,
    clearMomDraft,
    getFamilyDraft,
    saveFamily,
    clearFamilyDraft,
    usingFamilyDraft,
    emptyFamily,
    normalizeFamily,
    getTrophyOrder,
    saveTrophyOrder,
    workState,
    touchWork,
    recordHelp,
    helpOpens,
    checkUnlocks,
    awardAchievement,
    recordEgg,
    bumpEggCount,
    toast,
    confetti,
    honk,
    celebrate,
    downloadJson,
    markOpened,
    getOpens,
    chicagoYmd,
    lastNChicagoDays,
    parseStamp,
    foundEggs,
    EGG_NAMES,
    alreadyUnlocked,
    markUnlocked,
    notesFor,
    addNote,
    exportPack,
    importPack
  };
})(window);
