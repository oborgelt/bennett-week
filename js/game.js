(function (global) {
  const KEYS = {
    progress: "bw-progress",
    unlocks: "bw-unlocks",
    bananas: "bw-bananas",
    eggs: "bw-eggs",
    mom: "bw-mom-achievements",
    opened: "bw-opened"
  };

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

  function workState(id) {
    return getProgress()[id] || {};
  }

  function touchWork(id, kind) {
    const all = getProgress();
    const cur = all[id] || {};
    const first = !cur[kind];
    if (first) cur[kind] = Date.now();
    all[id] = cur;
    write(KEYS.progress, all);
    if (first) addBananas(kind === "done" ? 3 : 2);
    return { first, state: cur };
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

  function dueDate(work) {
    if (!work || !work.due) return null;
    const [d, t] = work.due.split("T");
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day, 0, 0, 0);
  }

  function todayLocal() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return new Date(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  }

  function beforeDue(work) {
    const due = dueDate(work);
    if (!due) return true;
    return todayLocal() < due;
  }

  function findWork(week, id) {
    return (week.work || []).find((w) => w.id === id);
  }

  function evaluate(ach, ctx) {
    const rule = ach.unlock || {};
    const type = rule.type;
    if (type === "open_week") return true;
    if (type === "easter_egg") return !!(ctx.eggs && ctx.eggs[rule.egg]);
    if (type === "view_event") return !!(ctx.viewedEvents && ctx.viewedEvents[rule.eventId]);
    const work = findWork(ctx.week, rule.workId);
    const st = workState(rule.workId);
    const earlyOk = !rule.beforeDue || beforeDue(work);
    if (type === "start_work") return !!(st.started && earlyOk);
    if (type === "done_work") return !!(st.done && earlyOk);
    if (type === "touch_work") return !!((st.started || st.done) && earlyOk);
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

  function markOpened() {
    if (!localStorage.getItem(KEYS.opened)) write(KEYS.opened, Date.now());
  }

  global.Game = {
    KEYS,
    esc,
    currency,
    iconFor,
    prefersReducedMotion,
    loadWeek,
    loadAchievements,
    getProgress,
    getUnlocks,
    getBananas,
    addBananas,
    getEggs,
    usingMomDraft,
    getMomDraft,
    saveMomDraft,
    clearMomDraft,
    workState,
    touchWork,
    checkUnlocks,
    recordEgg,
    bumpEggCount,
    toast,
    confetti,
    honk,
    celebrate,
    downloadJson,
    markOpened,
    alreadyUnlocked
  };
})(window);
