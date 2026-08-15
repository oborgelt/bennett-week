(function (global) {
  const KEYS = {
    progress: "bw-progress",
    unlocks: "bw-unlocks",
    bananas: "bw-bananas",
    eggs: "bw-eggs",
    mom: "bw-mom-achievements",
    characters: "bw-mom-characters",
    family: "bw-family",
    trophyOrder: "bw-trophy-order",
    characterUnlocks: "bw-character-unlocks",
    characterSeen: "bw-character-seen",
    library: "bw-mom-library",
    gear: "bw-gear-unlocks",
    content: "bw-content-unlocks",
    contentSeen: "bw-content-seen",
    ask: "bw-ask-thread",
    opened: "bw-opened",
    opens: "bw-opens"
  };

  const LIBRARY_GROUPS = ["ace", "riff", "scorch", "deuce", "fuzz", "crew", "fun"];
  const LIBRARY_KINDS = ["image", "video", "audio", "link"];
  const SOUND_CUES = [
    { id: "egg-end", label: "1. Egg game ends (41 eggs)" },
    { id: "egg-closed", label: "Egg game closed by the company" },
    { id: "streak-award", label: "A streak is awarded" }
  ];
  const PACK_BLOB_MAX = 2 * 1024 * 1024;
  const IDB_NAME = "bennett-week";
  const IDB_STORE = "library-blobs";
  const blobUrlCache = Object.create(null);
  const memoryBlobs = Object.create(null);

  const KHAN = [
    { id: "ela", label: "Khan Academy — ELA", url: "https://www.khanacademy.org/ela" },
    { id: "grammar", label: "Khan Academy — Grammar", url: "https://www.khanacademy.org/humanities/grammar" },
    { id: "hs-chemistry", label: "Khan Academy — HS Chemistry", url: "https://www.khanacademy.org/science/hs-chemistry" },
    { id: "geometry-home", label: "Khan Academy — Geometry", url: "https://www.khanacademy.org/math/geometry-home" },
    { id: "science", label: "Khan Academy — Science", url: "https://www.khanacademy.org/science" }
  ];

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

  function emptyOverlay() {
    return {
      week: {
        deleted: { events: [], work: [], notes: [] },
        edits: { events: {}, work: {}, notes: {} }
      },
      progress: {
        deletedClasses: [],
        deletedItems: [],
        classEdits: {},
        itemEdits: {},
        addedClasses: []
      }
    };
  }

  function asStringList(value) {
    return Array.isArray(value) ? value.filter((id) => id != null && id !== "").map(String) : [];
  }

  function asIdMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out = {};
    Object.keys(value).forEach((id) => {
      if (value[id] && typeof value[id] === "object" && !Array.isArray(value[id])) {
        out[id] = Object.assign({}, value[id]);
      }
    });
    return out;
  }

  function normalizeKhanIds(value) {
    if (Array.isArray(value)) return value.map((id) => String(id || "").trim()).filter(Boolean);
    if (typeof value === "string" && value.trim()) return [value.trim()];
    return [];
  }

  function normalizeAddedClass(row) {
    if (!row || typeof row !== "object") return null;
    const id = String(row.id || "").trim();
    const name = String(row.name || "").trim();
    if (!id || !name) return null;
    const next = {
      id,
      name,
      items: Array.isArray(row.items) ? row.items.filter((item) => item && item.id) : []
    };
    if (row.khan != null) next.khan = normalizeKhanIds(row.khan);
    if (row.grade && typeof row.grade === "object") next.grade = row.grade;
    if (row.test) next.test = true;
    return next;
  }

  function normalizeAddedClasses(value) {
    if (!Array.isArray(value)) return [];
    return value.map(normalizeAddedClass).filter(Boolean);
  }

  function normalizeOverlay(raw) {
    const o = raw && typeof raw === "object" ? raw : {};
    const week = o.week && typeof o.week === "object" ? o.week : {};
    const progress = o.progress && typeof o.progress === "object" ? o.progress : {};
    const deleted = week.deleted && typeof week.deleted === "object" ? week.deleted : {};
    const edits = week.edits && typeof week.edits === "object" ? week.edits : {};
    return {
      week: {
        deleted: {
          events: asStringList(deleted.events),
          work: asStringList(deleted.work),
          notes: asStringList(deleted.notes)
        },
        edits: {
          events: asIdMap(edits.events),
          work: asIdMap(edits.work),
          notes: asIdMap(edits.notes)
        }
      },
      progress: {
        deletedClasses: asStringList(progress.deletedClasses),
        deletedItems: asStringList(progress.deletedItems),
        classEdits: asIdMap(progress.classEdits),
        itemEdits: asIdMap(progress.itemEdits),
        addedClasses: normalizeAddedClasses(progress.addedClasses)
      }
    };
  }

  function emptyStory() {
    return { ingredients: [], includeNote: "", attachments: {} };
  }

  function normalizeStory(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    const attachments = s.attachments && typeof s.attachments === "object" && !Array.isArray(s.attachments)
      ? Object.assign({}, s.attachments)
      : {};
    const ingredients = Array.isArray(s.ingredients)
      ? s.ingredients.filter((row) => row && typeof row === "object").map((row) => ({
        id: String(row.id || "").trim() || uid("si"),
        text: String(row.text || "").trim(),
        test: !!row.test
      }))
      : [];
    return {
      ingredients,
      includeNote: String(s.includeNote || "").trim(),
      attachments
    };
  }

  function emptyFamily() {
    return {
      notes: [],
      reflections: { pool: [], answers: [] },
      streaks: {},
      characterUnlocks: {},
      gearUnlocks: {},
      contentUnlocks: {},
      soundCues: {},
      story: emptyStory(),
      overlay: emptyOverlay()
    };
  }

  function asUnlockMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out = {};
    Object.keys(value).forEach((id) => {
      if (value[id]) out[id] = value[id];
    });
    return out;
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
      streaks: f.streaks && typeof f.streaks === "object" && !Array.isArray(f.streaks) ? f.streaks : {},
      characterUnlocks: asUnlockMap(f.characterUnlocks),
      gearUnlocks: asUnlockMap(f.gearUnlocks),
      contentUnlocks: asUnlockMap(f.contentUnlocks),
      soundCues: asCueMap(f.soundCues),
      story: normalizeStory(f.story),
      overlay: normalizeOverlay(f.overlay)
    };
  }

  function asCueMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out = {};
    Object.keys(value).forEach((id) => {
      const v = String(value[id] || "").trim();
      if (id && v) out[id] = v;
    });
    return out;
  }

  function slugId(text, fallback) {
    const slug = String(text || fallback || "item")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32);
    return slug || fallback || "item";
  }

  function ensureWeekIds(week) {
    const src = week && typeof week === "object" ? week : {};
    const notes = (src.notes || []).map((n, i) => {
      if (n && n.id) return n;
      const id = "note-" + (n && n.date ? n.date : "x") + "-" + slugId(n && n.title, "note-" + i);
      return Object.assign({}, n, { id });
    });
    return Object.assign({}, src, { notes });
  }

  function applyListOverlay(list, deleted, edits) {
    const gone = new Set(deleted || []);
    const patches = edits || {};
    return (list || []).filter((item) => item && item.id && !gone.has(item.id)).map((item) => {
      const patch = patches[item.id];
      return patch ? Object.assign({}, item, patch, { id: item.id }) : item;
    });
  }

  function applyWeekOverlay(week, family) {
    const base = ensureWeekIds(week);
    const overlay = normalizeFamily(family).overlay.week;
    return Object.assign({}, base, {
      events: applyListOverlay(base.events, overlay.deleted.events, overlay.edits.events),
      work: applyListOverlay(base.work, overlay.deleted.work, overlay.edits.work),
      notes: applyListOverlay(base.notes, overlay.deleted.notes, overlay.edits.notes)
    });
  }

  function applyProgressOverlay(seed, family) {
    const base = seed && typeof seed === "object" ? seed : {};
    const overlay = normalizeFamily(family).overlay.progress;
    const classes = (base.classes || [])
      .filter((cls) => cls && cls.id && overlay.deletedClasses.indexOf(cls.id) < 0)
      .map((cls) => {
        const patch = overlay.classEdits[cls.id] || {};
        const items = (cls.items || [])
          .filter((item) => item && item.id && overlay.deletedItems.indexOf(item.id) < 0)
          .map((item) => {
            const ip = overlay.itemEdits[item.id];
            return ip ? Object.assign({}, item, ip, { id: item.id }) : item;
          });
        return Object.assign({}, cls, patch, { id: cls.id, items });
      });
    const seen = new Set(classes.map((cls) => cls.id));
    (overlay.addedClasses || []).forEach((row) => {
      const added = normalizeAddedClass(row);
      if (!added || seen.has(added.id) || overlay.deletedClasses.indexOf(added.id) >= 0) return;
      const patch = overlay.classEdits[added.id] || {};
      const items = (added.items || [])
        .filter((item) => item && item.id && overlay.deletedItems.indexOf(item.id) < 0)
        .map((item) => {
          const ip = overlay.itemEdits[item.id];
          return ip ? Object.assign({}, item, ip, { id: item.id }) : item;
        });
      classes.push(Object.assign({}, added, patch, { id: added.id, items }));
      seen.add(added.id);
    });
    return Object.assign({}, base, { classes });
  }

  function pushUnique(list, id) {
    const next = list.slice();
    if (next.indexOf(id) < 0) next.push(id);
    return next;
  }

  function editWeekOverlay(family, kind, id, patch) {
    const next = normalizeFamily(family);
    if (!next.overlay.week.edits[kind]) next.overlay.week.edits[kind] = {};
    next.overlay.week.edits[kind][id] = Object.assign({}, next.overlay.week.edits[kind][id] || {}, patch, { id });
    saveFamily(next);
    return next;
  }

  function deleteWeekOverlay(family, kind, id) {
    const next = normalizeFamily(family);
    next.overlay.week.deleted[kind] = pushUnique(next.overlay.week.deleted[kind] || [], id);
    saveFamily(next);
    return next;
  }

  function editProgressClass(family, id, patch) {
    const next = normalizeFamily(family);
    next.overlay.progress.classEdits[id] = Object.assign({}, next.overlay.progress.classEdits[id] || {}, patch, { id });
    saveFamily(next);
    return next;
  }

  function addProgressClass(family, name, seed) {
    const next = normalizeFamily(family);
    const trimmed = String(name || "").trim();
    if (!trimmed) return next;
    const applied = applyProgressOverlay(seed || { classes: [] }, next);
    const existing = (applied.classes || []).find((cls) => {
      return String(cls.name || "").trim().toLowerCase() === trimmed.toLowerCase()
        || String(cls.id || "").toLowerCase() === slugId(trimmed, "class");
    });
    if (existing) return next;
    const taken = new Set((applied.classes || []).map((cls) => cls.id));
    (next.overlay.progress.addedClasses || []).forEach((row) => {
      if (row && row.id) taken.add(row.id);
    });
    let id = slugId(trimmed, "class");
    let n = 2;
    while (taken.has(id)) {
      id = slugId(trimmed, "class") + "-" + n;
      n += 1;
    }
    next.overlay.progress.addedClasses = (next.overlay.progress.addedClasses || []).concat([{
      id,
      name: trimmed,
      items: []
    }]);
    saveFamily(next);
    return next;
  }

  function deleteProgressClass(family, id) {
    const next = normalizeFamily(family);
    next.overlay.progress.deletedClasses = pushUnique(next.overlay.progress.deletedClasses, id);
    saveFamily(next);
    return next;
  }

  function editProgressItem(family, id, patch) {
    const next = normalizeFamily(family);
    next.overlay.progress.itemEdits[id] = Object.assign({}, next.overlay.progress.itemEdits[id] || {}, patch, { id });
    saveFamily(next);
    return next;
  }

  function deleteProgressItem(family, id) {
    const next = normalizeFamily(family);
    next.overlay.progress.deletedItems = pushUnique(next.overlay.progress.deletedItems, id);
    saveFamily(next);
    return next;
  }

  function updateById(list, id, patch) {
    return (list || []).map((row) => (row && row.id === id ? Object.assign({}, row, patch, { id }) : row));
  }

  function updateNote(family, id, patch) {
    const next = normalizeFamily(family);
    next.notes = updateById(next.notes, id, patch);
    saveFamily(next);
    return next;
  }

  function deleteNote(family, id) {
    const next = normalizeFamily(family);
    next.notes = next.notes.filter((n) => n.id !== id);
    saveFamily(next);
    return next;
  }

  function updatePrompt(family, id, patch) {
    const next = normalizeFamily(family);
    next.reflections.pool = updateById(next.reflections.pool, id, patch);
    saveFamily(next);
    return next;
  }

  function deletePrompt(family, id) {
    const next = normalizeFamily(family);
    next.reflections.pool = next.reflections.pool.filter((p) => p.id !== id);
    saveFamily(next);
    return next;
  }

  function updateAnswer(family, id, patch) {
    const next = normalizeFamily(family);
    next.reflections.answers = updateById(next.reflections.answers, id, patch);
    saveFamily(next);
    return next;
  }

  function deleteAnswer(family, id) {
    const next = normalizeFamily(family);
    next.reflections.answers = next.reflections.answers.filter((a) => a.id !== id);
    saveFamily(next);
    return next;
  }

  function confirmDelete(label) {
    return window.confirm("Delete this " + (label || "entry") + "? It disappears on this device. Export the family pack so Mom and Orin stay in sync.");
  }

  function entryButtons(editToken, delToken) {
    return `
      <button type="button" class="tiny" data-edit="${esc(editToken)}">Edit</button>
      <button type="button" class="tiny danger" data-del="${esc(delToken)}">Delete</button>`;
  }

  function hasEggGame(pack) {
    return (pack && pack.achievements || []).some((ach) => ach.unlocksGame === "egg" && alreadyUnlocked(ach.id));
  }

  function gameHref(ach) {
    return ach && ach.unlocksGame === "egg" ? "egg.html" : "";
  }

  function toLocalInput(iso) {
    if (!iso) return "";
    const s = String(iso);
    if (s.length === 10) return s;
    return s.slice(0, 16);
  }

  function fromLocalInput(value, asDate) {
    if (!value) return "";
    const s = String(value).trim();
    if (asDate || s.length === 10) return s.slice(0, 10);
    if (s.length === 16) return s + ":00";
    return s;
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

  function defaultCharacters() {
    return {
      comicStartsAfter: 3,
      characters: [
        {
          id: "ace",
          name: "Ace",
          talent: "The Closer",
          tagline: "Last point counts.",
          status: "ready",
          video: "img/characters/ace.mp4",
          poster: "img/characters/ace.jpg"
        },
        {
          id: "riff",
          name: "Riff",
          talent: "Daily Reps",
          tagline: "Again. Louder.",
          status: "ready",
          video: "img/characters/riff.mp4",
          poster: "img/characters/riff.jpg"
        },
        {
          id: "scorch",
          name: "Scorch",
          talent: "The Recover",
          tagline: "Burned. Not out.",
          status: "ready",
          video: "img/characters/scorch.mp4",
          poster: "img/characters/scorch.jpg"
        },
        {
          id: "deuce",
          name: "Deuce",
          talent: "The Return",
          tagline: "Send it back.",
          status: "ready",
          video: "img/characters/deuce.mp4",
          poster: "img/characters/deuce.jpg"
        },
        {
          id: "fuzz",
          name: "Fuzz",
          talent: "Unplugged",
          tagline: "Quiet still counts.",
          status: "ready",
          video: "img/characters/fuzz.mp4",
          poster: "img/characters/fuzz.jpg"
        }
      ]
    };
  }

  function normalizeCharacter(ch, i) {
    const src = ch && typeof ch === "object" ? ch : {};
    const id = String(src.id || "").trim() || ("slot-" + (i + 1));
    const video = String(src.video || "").trim();
    const poster = String(src.poster || "").trim();
    const status = src.status === "ready" || src.status === "coming"
      ? src.status
      : (video ? "ready" : "coming");
    return {
      id,
      name: String(src.name || "").trim(),
      talent: String(src.talent || "").trim(),
      tagline: String(src.tagline || src.tagLine || "").trim(),
      status,
      video,
      poster,
      test: !!src.test
    };
  }

  function normalizeCharacters(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const list = Array.isArray(src.characters) ? src.characters : [];
    return {
      comicStartsAfter: Number(src.comicStartsAfter) > 0 ? Number(src.comicStartsAfter) : 3,
      characters: list.map(normalizeCharacter)
    };
  }

  function usingMomCharacters() {
    return !!localStorage.getItem(KEYS.characters);
  }

  function getMomCharacters() {
    const stored = read(KEYS.characters, null);
    return stored ? normalizeCharacters(stored) : null;
  }

  function saveMomCharacters(roster) {
    write(KEYS.characters, normalizeCharacters(roster));
  }

  function clearMomCharacters() {
    localStorage.removeItem(KEYS.characters);
  }

  async function loadCharacters() {
    const seed = normalizeCharacters(parseSeed("char-seed") || defaultCharacters());
    const file = await fetchJson("characters.json", null);
    const draft = getMomCharacters();
    return normalizeCharacters(draft || file || seed);
  }

  function characterLabel(ch, fallback) {
    if (!ch) return fallback || "Character";
    if (ch.name) return ch.name;
    if (ch.id === "slot-3") return "#3";
    if (/^slot-/.test(ch.id)) return "#" + String(ch.id).replace("slot-", "");
    return fallback || ch.id;
  }

  function getCharacterUnlocks() {
    return asUnlockMap(read(KEYS.characterUnlocks, {}));
  }

  function saveCharacterUnlocks(map) {
    write(KEYS.characterUnlocks, asUnlockMap(map));
  }

  function mergeCharacterUnlocks(extra) {
    const next = Object.assign({}, getCharacterUnlocks(), asUnlockMap(extra));
    saveCharacterUnlocks(next);
    return next;
  }

  function alreadyUnlockedCharacter(id) {
    return !!(id && getCharacterUnlocks()[id]);
  }

  function markCharacterUnlocked(id) {
    if (!id) return false;
    const all = getCharacterUnlocks();
    if (all[id]) return false;
    all[id] = Date.now();
    saveCharacterUnlocks(all);
    return true;
  }

  function revokeCharacterUnlock(id) {
    if (!id) return false;
    const all = getCharacterUnlocks();
    if (!all[id]) return false;
    delete all[id];
    saveCharacterUnlocks(all);
    return true;
  }

  function unlockedCharacters(roster) {
    const unlocks = getCharacterUnlocks();
    return ((roster && roster.characters) || []).filter((ch) => unlocks[ch.id]);
  }

  function comicUnlocked(roster) {
    const need = (roster && roster.comicStartsAfter) || 3;
    return unlockedCharacters(roster).length >= need;
  }

  function getCharacterSeen() {
    return asUnlockMap(read(KEYS.characterSeen, {}));
  }

  function markCharacterSeen(id) {
    if (!id) return;
    const seen = getCharacterSeen();
    seen[id] = Date.now();
    write(KEYS.characterSeen, seen);
  }

  function pendingCharacterCelebrations(roster) {
    const seen = getCharacterSeen();
    return unlockedCharacters(roster).filter((ch) => !seen[ch.id]);
  }

  function characterMedia(roster, ch) {
    if (ch && (ch.video || ch.poster)) {
      return { video: ch.video || "", poster: ch.poster || "" };
    }
    const ace = ((roster && roster.characters) || []).find((row) => row.id === "ace");
    return {
      video: (ace && ace.video) || "img/characters/ace.mp4",
      poster: (ace && ace.poster) || "img/characters/ace.jpg"
    };
  }

  function aceMedia(roster) {
    return characterMedia(roster, ((roster && roster.characters) || []).find((ch) => ch.id === "ace"));
  }

  function defaultLibrary() {
    return {
      items: [
        { id: "ace-clip", label: "Ace locker clip", path: "img/characters/ace.mp4", poster: "img/characters/ace.jpg", kind: "video", character: "ace" },
        { id: "ace-poster", label: "Ace poster", path: "img/characters/ace.jpg", kind: "image", character: "ace" },
        { id: "riff-clip", label: "Riff locker clip", path: "img/characters/riff.mp4", poster: "img/characters/riff.jpg", kind: "video", character: "riff" },
        { id: "riff-poster", label: "Riff poster", path: "img/characters/riff.jpg", kind: "image", character: "riff" },
        { id: "scorch-clip", label: "Scorch locker clip", path: "img/characters/scorch.mp4", poster: "img/characters/scorch.jpg", kind: "video", character: "scorch" },
        { id: "scorch-poster", label: "Scorch poster", path: "img/characters/scorch.jpg", kind: "image", character: "scorch" },
        { id: "deuce-clip", label: "Deuce locker clip", path: "img/characters/deuce.mp4", poster: "img/characters/deuce.jpg", kind: "video", character: "deuce" },
        { id: "deuce-poster", label: "Deuce poster", path: "img/characters/deuce.jpg", kind: "image", character: "deuce" },
        { id: "fuzz-clip", label: "Fuzz locker clip", path: "img/characters/fuzz.mp4", poster: "img/characters/fuzz.jpg", kind: "video", character: "fuzz" },
        { id: "fuzz-poster", label: "Fuzz poster", path: "img/characters/fuzz.jpg", kind: "image", character: "fuzz" },
        { id: "crew-hero", label: "Crew hero lineup", path: "img/library/crew-hero.jpg", kind: "image", character: "crew" },
        { id: "crew-run", label: "Crew run", path: "img/library/crew-run.jpg", kind: "image", character: "crew" },
        { id: "crew-burst", label: "Crew burst", path: "img/library/crew-burst.jpg", kind: "image", character: "crew" },
        { id: "crew-adventure", label: "Crew adventure clip", path: "img/library/crew-adventure.mp4", poster: "img/library/crew-hero.jpg", kind: "video", character: "crew" },
        { id: "banana-honk", label: "Banana honk", kind: "audio", character: "fun", synth: "honk", test: true }
      ]
    };
  }

  function isSafeHttpUrl(value) {
    try {
      const u = new URL(String(value || ""));
      return u.protocol === "https:" || u.protocol === "http:";
    } catch (_) {
      return false;
    }
  }

  function isLocalLibraryPath(value) {
    const s = String(value || "").trim();
    if (!s || s === "#") return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("//")) return false;
    return !s.includes("..");
  }

  function inferKind(path, url, kind) {
    if (LIBRARY_KINDS.indexOf(kind) >= 0) return kind;
    const src = String(url || path || "");
    if (/\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(src)) return "audio";
    if (/\.(mp4|webm|mov)(\?|$)/i.test(src)) return "video";
    if (src === "#" || /^https?:\/\//i.test(src)) return "link";
    return "image";
  }

  function kindFromFile(file) {
    if (!file) return "";
    const name = String(file.name || "");
    const type = String(file.type || "").toLowerCase();
    if (type.indexOf("audio/") === 0 || /\.(mp3|wav|ogg|m4a|aac)$/i.test(name)) return "audio";
    if (type.indexOf("video/") === 0 || /\.(mp4|webm|mov)$/i.test(name)) return "video";
    if (type.indexOf("image/") === 0 || /\.(jpe?g|png|gif|webp|svg)$/i.test(name)) return "image";
    return "";
  }

  function labelFromFilename(name) {
    const base = String(name || "").replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
    const pretty = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!pretty) return "Sound";
    return pretty.replace(/(^|\s)([a-z])/g, (_m, sp, c) => sp + c.toUpperCase());
  }

  function fileBasename(name) {
    return String(name || "").replace(/^.*[\\/]/, "").trim();
  }

  const SKIP_DEVICE_SOUNDS = {
    cumshot: 1,
    jackoff: 1,
    beahit: 1,
    whothef: 1,
    donthavebd: 1,
    tunacan: 1,
    quitfuckingwithem: 1,
    gotabush: 1,
    dfwmagain: 1
  };

  function isSkippedDeviceSound(name) {
    const base = fileBasename(name).replace(/\.[^.]+$/, "").toLowerCase();
    return !!SKIP_DEVICE_SOUNDS[base];
  }

  function labelsFromManifest(data) {
    const list = Array.isArray(data)
      ? data
      : (data && Array.isArray(data.clips) ? data.clips : []);
    const map = {};
    list.forEach((item) => {
      if (typeof item === "string") {
        const base = fileBasename(item).toLowerCase();
        if (base) map[base] = labelFromFilename(item);
        return;
      }
      const file = fileBasename((item && (item.file || item.src || item.path)) || "");
      if (!file) return;
      const label = String((item && item.label) || "").trim() || labelFromFilename(file);
      map[file.toLowerCase()] = label;
    });
    return map;
  }

  function stripStoredSrc(value) {
    const s = String(value || "").trim();
    if (!s || /^blob:/i.test(s) || /^data:/i.test(s)) return "";
    return s;
  }

  function revokeBlobUrl(id) {
    if (!id || !blobUrlCache[id]) return;
    try { URL.revokeObjectURL(blobUrlCache[id]); } catch (_) {}
    delete blobUrlCache[id];
  }

  function rememberBlobUrl(id, blob) {
    if (!id || !blob) return "";
    revokeBlobUrl(id);
    try {
      blobUrlCache[id] = URL.createObjectURL(blob);
      return blobUrlCache[id];
    } catch (_) {
      return "";
    }
  }

  function libraryBlobUrl(id) {
    return (id && blobUrlCache[id]) || "";
  }

  function openLibraryDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined" || !indexedDB) {
        reject(new Error("no-idb"));
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("idb"));
    });
  }

  async function putLibraryBlob(id, blob, meta) {
    if (!id || !blob) return false;
    const rec = {
      blob,
      mime: (meta && meta.mime) || blob.type || "",
      name: (meta && meta.name) || "",
      size: blob.size || 0
    };
    memoryBlobs[id] = rec;
    try {
      const db = await openLibraryDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(rec, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      try { db.close(); } catch (_) {}
    } catch (_) {}
    return true;
  }

  async function getLibraryBlob(id) {
    if (!id) return null;
    try {
      const db = await openLibraryDb();
      const rec = await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      try { db.close(); } catch (_) {}
      if (rec && rec.blob) {
        memoryBlobs[id] = rec;
        return rec;
      }
    } catch (_) {}
    return memoryBlobs[id] || null;
  }

  async function deleteLibraryBlob(id) {
    revokeBlobUrl(id);
    delete memoryBlobs[id];
    try {
      const db = await openLibraryDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      try { db.close(); } catch (_) {}
    } catch (_) {}
  }

  async function clearLibraryBlobs() {
    Object.keys(blobUrlCache).forEach(revokeBlobUrl);
    Object.keys(memoryBlobs).forEach((key) => { delete memoryBlobs[key]; });
    try {
      const db = await openLibraryDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      try { db.close(); } catch (_) {}
    } catch (_) {}
  }

  async function hydrateLibraryBlobs(lib) {
    const items = (lib && lib.items) || [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || !item.device || blobUrlCache[item.id]) continue;
      const rec = await getLibraryBlob(item.id);
      if (rec && rec.blob) rememberBlobUrl(item.id, rec.blob);
    }
    return lib;
  }

  function bytesToBase64(u8) {
    let s = "";
    const chunk = 0x8000;
    for (let i = 0; i < u8.length; i += chunk) {
      s += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
    }
    return btoa(s);
  }

  function base64ToBytes(data) {
    const bin = atob(String(data || ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function blobToBase64(blob) {
    if (blob && typeof blob.arrayBuffer === "function") {
      const buf = await blob.arrayBuffer();
      return bytesToBase64(new Uint8Array(buf));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result || "");
        const comma = s.indexOf(",");
        resolve(comma >= 0 ? s.slice(comma + 1) : s);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(data, mime) {
    return new Blob([base64ToBytes(data)], { type: mime || "application/octet-stream" });
  }

  async function collectLibraryBlobs(library) {
    const blobs = {};
    const skipped = [];
    const items = (library && library.items) || [];
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || !item.device) continue;
      const label = item.label || item.filename || item.id;
      try {
        const rec = await getLibraryBlob(item.id);
        if (!rec || !rec.blob) {
          skipped.push(label);
          continue;
        }
        if ((rec.blob.size || 0) > PACK_BLOB_MAX) {
          skipped.push(label);
          continue;
        }
        blobs[item.id] = {
          mime: rec.mime || rec.blob.type || item.mime || "",
          name: rec.name || item.filename || "",
          data: await blobToBase64(rec.blob)
        };
      } catch (_) {
        skipped.push(label);
      }
    }
    return { blobs, skipped };
  }

  async function applyLibraryBlobs(map) {
    const blobs = map && typeof map === "object" ? map : {};
    const stored = [];
    const skipped = [];
    const ids = Object.keys(blobs);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      const rec = blobs[id];
      const label = (rec && (rec.name || rec.label)) || id;
      if (!rec || !rec.data) {
        skipped.push(label);
        continue;
      }
      try {
        const blob = base64ToBlob(rec.data, rec.mime || "application/octet-stream");
        if ((blob.size || 0) > PACK_BLOB_MAX) {
          skipped.push(label);
          continue;
        }
        await putLibraryBlob(id, blob, { name: rec.name || "", mime: rec.mime || blob.type });
        rememberBlobUrl(id, blob);
        stored.push(id);
      } catch (_) {
        skipped.push(label);
      }
    }
    return { stored, skipped };
  }

  async function addDeviceLibraryFile(lib, file, extras) {
    const kind = kindFromFile(file);
    if (!kind) return { ok: false, reason: "kind" };
    const next = normalizeLibrary(lib || { items: [] });
    const id = uid("lib");
    const filename = String((file && file.name) || "").trim();
    const mime = String((file && file.type) || "").trim();
    const label = (extras && extras.label) || labelFromFilename(filename);
    const test = extras && Object.prototype.hasOwnProperty.call(extras, "test")
      ? !!extras.test
      : /^test\b/i.test(label);
    await putLibraryBlob(id, file, { name: filename, mime });
    rememberBlobUrl(id, file);
    const item = normalizeLibraryItem({
      id,
      label,
      kind,
      character: (extras && extras.character) || "fun",
      device: true,
      filename,
      mime,
      test
    }, next.items.length);
    next.items.push(item);
    saveMomLibrary(next);
    if (lib && Array.isArray(lib.items)) lib.items = next.items;
    return { ok: true, item, library: next };
  }

  function youtubeId(url) {
    try {
      const u = new URL(String(url || ""));
      const host = u.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "youtu.be") return (u.pathname.replace(/^\//, "").split("/")[0] || "").trim();
      if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        if (u.searchParams.get("v")) return String(u.searchParams.get("v")).trim();
        const m = u.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/);
        return m ? m[1] : "";
      }
    } catch (_) {}
    return "";
  }

  function youtubeEmbedSrc(url) {
    const id = youtubeId(url);
    if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) return "";
    return "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id);
  }

  function librarySrc(item) {
    if (!item) return "";
    if (item.device) {
      const blobUrl = libraryBlobUrl(item.id);
      if (blobUrl) return blobUrl;
    }
    const url = String(item.url || "").trim();
    const path = String(item.path || "").trim();
    if (url === "#") return "#";
    if (url && isSafeHttpUrl(url)) return url;
    if (path && (isLocalLibraryPath(path) || isSafeHttpUrl(path))) return path;
    return "";
  }

  function libraryKindLabel(item) {
    if (!item) return "";
    if (item.kind === "audio") return item.synth ? "Sound" : "Audio";
    if (item.kind === "link") return youtubeId(item.url || item.path) ? "YouTube" : "Link";
    if (item.kind === "video") return "Video";
    return "Still";
  }

  function normalizeLibraryItem(item, i) {
    const src = item && typeof item === "object" ? item : {};
    const path = stripStoredSrc(src.path);
    const url = stripStoredSrc(src.url);
    const synth = String(src.synth || "").trim();
    const device = !!src.device;
    const filename = String(src.filename || "").trim();
    const mime = String(src.mime || "").trim();
    const character = LIBRARY_GROUPS.indexOf(src.character) >= 0 ? src.character : (device ? "fun" : "crew");
    const kind = inferKind(path || filename, url, src.kind);
    const labelFallback = filename || (path || url).split("/").pop() || (synth ? "Sound" : (device ? "Sound" : "Untitled"));
    return {
      id: String(src.id || "").trim() || ("lib-" + (i + 1)),
      label: String(src.label || "").trim() || labelFromFilename(labelFallback),
      path,
      url,
      poster: stripStoredSrc(src.poster),
      kind,
      character,
      synth,
      device,
      filename,
      mime,
      test: !!src.test
    };
  }

  function normalizeLibrary(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const list = Array.isArray(src.items) ? src.items : [];
    return {
      items: list.map(normalizeLibraryItem).filter((item) => item.path || item.url || item.synth || item.device)
    };
  }

  function usingMomLibrary() {
    return !!localStorage.getItem(KEYS.library);
  }

  function getMomLibrary() {
    const stored = read(KEYS.library, null);
    return stored ? normalizeLibrary(stored) : null;
  }

  function saveMomLibrary(lib) {
    write(KEYS.library, normalizeLibrary(lib));
  }

  function clearMomLibrary() {
    localStorage.removeItem(KEYS.library);
    clearLibraryBlobs();
  }

  async function loadLibrary() {
    const seed = normalizeLibrary(parseSeed("library-seed") || defaultLibrary());
    const file = await fetchJson("library.json", null);
    const draft = getMomLibrary();
    const lib = normalizeLibrary(draft || file || seed);
    await hydrateLibraryBlobs(lib);
    return lib;
  }

  function libraryItem(lib, id) {
    return ((lib && lib.items) || []).find((item) => item.id === id) || null;
  }

  function libraryFor(lib, character, includeCrew, includeFun) {
    return ((lib && lib.items) || []).filter((item) => {
      if (item.character === character) return true;
      if (includeCrew && item.character === "crew") return true;
      return !!(includeFun && item.character === "fun");
    });
  }

  function libraryForAttach(lib, character) {
    return libraryFor(lib, character, false, character !== "fun");
  }

  function contentLibraryItems(lib) {
    return ((lib && lib.items) || []).filter((item) => {
      return item.kind === "audio" || item.kind === "link" || item.character === "fun";
    });
  }

  function libraryThumb(item) {
    if (!item) return "";
    if (item.kind === "video") return item.poster || "";
    if (item.kind === "image") return item.path || item.url || "";
    return "";
  }

  function libraryThumbHtml(item, cls) {
    const klass = cls || "lib-thumb";
    if (!item) return `<div class="${klass} lib-ph" aria-hidden="true">?</div>`;
    if (item.kind === "video") {
      const src = librarySrc(item);
      return `<video class="${klass}" src="${esc(src)}" poster="${esc(item.poster || "")}" preload="metadata" muted playsinline></video>`;
    }
    if (item.kind === "image") {
      const src = librarySrc(item);
      return src ? `<img class="${klass}" src="${esc(src)}" alt="">` : `<div class="${klass} lib-ph" aria-hidden="true">🖼</div>`;
    }
    if (item.kind === "audio") {
      return `<div class="${klass} lib-audio-ph" aria-hidden="true">🔊</div>`;
    }
    return `<div class="${klass} lib-link-ph" aria-hidden="true">🔗</div>`;
  }

  function libraryPlayerHtml(item) {
    if (!item) return `<p class="empty">Nothing to play.</p>`;
    const src = librarySrc(item);
    if (item.kind === "video") {
      return src
        ? `<video class="lib-play" src="${esc(src)}" poster="${esc(item.poster || "")}" controls playsinline></video>`
        : `<p class="empty">${item.device ? "On this device — file is still loading." : "No video path."}</p>`;
    }
    if (item.kind === "image") {
      return src
        ? `<img class="lib-play" src="${esc(src)}" alt="">`
        : `<p class="empty">${item.device ? "On this device — file is still loading." : "No image path."}</p>`;
    }
    if (item.kind === "audio") {
      if (item.synth) {
        return `<p class="empty">Generated beep — no file in the repo.</p><button type="button" class="btn primary" data-play-lib="${esc(item.id)}">Play</button>`;
      }
      if (src) {
        return `<audio class="lib-play" src="${esc(src)}" controls preload="metadata"></audio>`;
      }
      if (item.device) {
        return `<p class="empty">On this device — tap Play.</p><button type="button" class="btn primary" data-play-lib="${esc(item.id)}">Play</button>`;
      }
      return `<p class="empty">Add a path or URL to preview audio.</p>`;
    }
    const embed = youtubeEmbedSrc(item.url || item.path || src);
    const open = src && src !== "#"
      ? `<a class="btn primary" href="${esc(src)}" target="_blank" rel="noopener">Open</a>`
      : `<p class="empty">No URL yet.</p>`;
    const frame = embed
      ? `<iframe class="lib-embed" src="${esc(embed)}" title="${esc(item.label || "YouTube")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : "";
    return `${open}${frame}`;
  }

  function bananasOf(ach) {
    if (!ach) return 0;
    if (typeof ach.bananas === "number") return Number(ach.bananas) || 0;
    if (typeof ach.reward === "number") return Number(ach.reward) || 0;
    return 0;
  }

  function rewardUnlockOf(ach) {
    if (!ach) return null;
    const obj = (ach.rewardUnlock && typeof ach.rewardUnlock === "object")
      ? ach.rewardUnlock
      : (ach.reward && typeof ach.reward === "object" ? ach.reward : null);
    if (obj && obj.type && obj.id) {
      return {
        type: String(obj.type),
        id: String(obj.id),
        label: String(obj.label || obj.id)
      };
    }
    if (ach.rewardCharacter) {
      return { type: "character", id: String(ach.rewardCharacter), label: String(ach.rewardCharacter) };
    }
    return null;
  }

  function rewardCharacterId(ach) {
    const unlock = rewardUnlockOf(ach);
    if (unlock && unlock.type === "character") return unlock.id;
    return ach && ach.rewardCharacter ? String(ach.rewardCharacter) : "";
  }

  function getGearUnlocks() {
    return asUnlockMap(read(KEYS.gear, {}));
  }

  function saveGearUnlocks(map) {
    write(KEYS.gear, asUnlockMap(map));
  }

  function mergeGearUnlocks(extra) {
    const next = Object.assign({}, getGearUnlocks(), asUnlockMap(extra));
    saveGearUnlocks(next);
    return next;
  }

  function alreadyUnlockedGear(id) {
    return !!(id && getGearUnlocks()[id]);
  }

  function markGearUnlocked(unlock) {
    if (!unlock || !unlock.id) return false;
    const all = getGearUnlocks();
    if (all[unlock.id]) return false;
    all[unlock.id] = {
      type: unlock.type || "tool",
      id: unlock.id,
      label: unlock.label || unlock.id,
      at: nowIso()
    };
    saveGearUnlocks(all);
    return true;
  }

  function revokeGearUnlock(id) {
    if (!id) return false;
    const all = getGearUnlocks();
    if (!all[id]) return false;
    delete all[id];
    saveGearUnlocks(all);
    return true;
  }

  function unlockedGear() {
    const map = getGearUnlocks();
    return Object.keys(map).map((id) => {
      const row = map[id] && typeof map[id] === "object" ? map[id] : { id };
      return {
        type: row.type || "tool",
        id,
        label: row.label || id,
        at: row.at || row
      };
    });
  }

  function getContentUnlocks() {
    return asUnlockMap(read(KEYS.content, {}));
  }

  function saveContentUnlocks(map) {
    write(KEYS.content, asUnlockMap(map));
  }

  function mergeContentUnlocks(extra) {
    const next = Object.assign({}, getContentUnlocks(), asUnlockMap(extra));
    saveContentUnlocks(next);
    return next;
  }

  function alreadyUnlockedContent(id) {
    return !!(id && getContentUnlocks()[id]);
  }

  function markContentUnlocked(unlock) {
    if (!unlock || !unlock.id) return false;
    const all = getContentUnlocks();
    if (all[unlock.id]) return false;
    all[unlock.id] = {
      type: "content",
      id: unlock.id,
      label: unlock.label || unlock.id,
      at: nowIso()
    };
    saveContentUnlocks(all);
    return true;
  }

  function revokeContentUnlock(id) {
    if (!id) return false;
    const all = getContentUnlocks();
    if (!all[id]) return false;
    delete all[id];
    saveContentUnlocks(all);
    return true;
  }

  function unlockedContent(lib) {
    const map = getContentUnlocks();
    return Object.keys(map).map((id) => {
      const row = map[id] && typeof map[id] === "object" ? map[id] : { id };
      const item = libraryItem(lib, id);
      return {
        type: "content",
        id,
        label: (item && item.label) || row.label || id,
        at: row.at || row,
        item: item
      };
    });
  }

  function lockedContentCount(lib) {
    return contentLibraryItems(lib).filter((item) => !alreadyUnlockedContent(item.id)).length;
  }

  function getContentSeen() {
    return asUnlockMap(read(KEYS.contentSeen, {}));
  }

  function markContentSeen(id) {
    if (!id) return;
    const seen = getContentSeen();
    seen[id] = Date.now();
    write(KEYS.contentSeen, seen);
  }

  function pendingContentCelebrations(lib) {
    const seen = getContentSeen();
    return unlockedContent(lib).filter((row) => !seen[row.id]);
  }

  function applyFamilyContentUnlocks(family) {
    const next = normalizeFamily(family);
    mergeContentUnlocks(next.contentUnlocks);
    return next;
  }

  function grantContent(family, unlock) {
    const next = normalizeFamily(family);
    if (!unlock || !unlock.id) return { family: next, fresh: false };
    const fresh = markContentUnlocked(unlock);
    if (!next.contentUnlocks[unlock.id]) {
      next.contentUnlocks[unlock.id] = Object.assign({ at: nowIso() }, unlock);
      saveFamily(next);
    } else if (fresh) {
      saveFamily(next);
    }
    return { family: next, fresh };
  }

  function otherAwardGrantsContent(pack, family, contentId, exceptId) {
    return (pack.achievements || []).some((ach) => {
      if (!ach || ach.id === exceptId) return false;
      const unlock = rewardUnlockOf(ach);
      if (!unlock || unlock.type !== "content" || unlock.id !== contentId) return false;
      return !!(family.streaks[ach.id] && family.streaks[ach.id].awarded) || alreadyUnlocked(ach.id);
    });
  }

  function canPlayLibraryItem(item, preview) {
    if (!item) return false;
    if (preview) return true;
    if (item.kind !== "audio" && item.kind !== "link" && item.character !== "fun") return true;
    return alreadyUnlockedContent(item.id);
  }

  function attachedLibraryItem(family, lib, key) {
    const id = family && family.story && family.story.attachments && key
      ? family.story.attachments[key]
      : "";
    return id ? libraryItem(lib, id) : null;
  }

  function playSynth(name) {
    if (name === "honk" || !name) {
      honk();
      return true;
    }
    honk();
    return true;
  }

  let activeLibraryAudio = null;
  let lastLibraryItemId = "";

  function stopLibraryAudio() {
    if (!activeLibraryAudio) return;
    try {
      activeLibraryAudio.pause();
      activeLibraryAudio.currentTime = 0;
    } catch (_) {}
  }

  function primeLibraryAudio() {
    if (!activeLibraryAudio) {
      try { activeLibraryAudio = new Audio(); } catch (_) { return false; }
    }
    try {
      if (activeLibraryAudio.paused) {
        const p = activeLibraryAudio.play();
        if (p && p.catch) p.catch(function () {});
        activeLibraryAudio.pause();
      }
    } catch (_) {}
    return true;
  }

  function waitForLibraryAudio(ms) {
    return new Promise((resolve) => {
      const a = activeLibraryAudio;
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (a) {
          a.removeEventListener("ended", done);
          a.removeEventListener("error", done);
        }
        resolve();
      };
      if (!a || a.paused || a.ended) {
        resolve();
        return;
      }
      a.addEventListener("ended", done);
      a.addEventListener("error", done);
      setTimeout(done, Math.max(400, Number(ms) || 20000));
    });
  }

  function playLibraryItem(item) {
    if (!item) return false;
    lastLibraryItemId = item.id || "";
    if (item.synth) {
      stopLibraryAudio();
      return playSynth(item.synth);
    }
    const playSrc = (src) => {
      if (item.kind === "audio" && src && src !== "#") {
        try {
          primeLibraryAudio();
          stopLibraryAudio();
          if (!activeLibraryAudio) activeLibraryAudio = new Audio();
          activeLibraryAudio.src = src;
          const p = activeLibraryAudio.play();
          if (p && p.catch) p.catch(function () {});
          return true;
        } catch (_) {
          return false;
        }
      }
      return false;
    };
    if (playSrc(librarySrc(item))) return true;
    if (item.device && item.kind === "audio") {
      getLibraryBlob(item.id).then((rec) => {
        if (!rec || !rec.blob) return;
        playSrc(rememberBlobUrl(item.id, rec.blob));
      });
      return true;
    }
    return false;
  }

  function audioLibraryItems(lib) {
    return ((lib && lib.items) || []).filter((item) => item && (item.kind === "audio" || item.synth));
  }

  function playRandomLibraryItem(lib, exceptId) {
    const items = audioLibraryItems(lib).filter((item) => item.id !== exceptId && item.id !== lastLibraryItemId);
    const pool = items.length ? items : audioLibraryItems(lib);
    if (!pool.length) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    playLibraryItem(pick);
    return pick;
  }

  function cueLibraryItem(family, lib, cueId) {
    const id = family && family.soundCues && cueId ? family.soundCues[cueId] : "";
    return id ? libraryItem(lib, id) : null;
  }

  function setSoundCue(family, cueId, itemId) {
    const next = normalizeFamily(family);
    const key = String(cueId || "").trim();
    if (!key) return next;
    const id = String(itemId || "").trim();
    if (!id) delete next.soundCues[key];
    else next.soundCues[key] = id;
    saveFamily(next);
    return next;
  }

  function playSoundCue(family, lib, cueId) {
    return playLibraryItem(cueLibraryItem(family, lib, cueId));
  }

  function closeContentCelebrate() {
    const layer = document.getElementById("content-celebrate");
    if (!layer) return;
    const media = layer.querySelector("audio, video");
    if (media) {
      try { media.pause(); } catch (_) {}
    }
    layer.classList.remove("open");
  }

  function playContentReward(item) {
    if (!item) return false;
    let layer = document.getElementById("content-celebrate");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "content-celebrate";
      layer.className = "char-celebrate";
      document.body.appendChild(layer);
    }
    const src = librarySrc(item);
    const bits = [];
    if (item.kind === "audio" && !item.synth && src && src !== "#") {
      bits.push(`<audio class="lib-play" src="${esc(src)}" controls preload="metadata"></audio>`);
    }
    if (item.kind === "link" && src && src !== "#") {
      bits.push(`<a class="btn" href="${esc(src)}" target="_blank" rel="noopener">Open</a>`);
      const embed = youtubeEmbedSrc(item.url || item.path || src);
      if (embed) {
        bits.push(`<iframe class="lib-embed" src="${esc(embed)}" title="${esc(item.label || "YouTube")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`);
      }
    }
    layer.innerHTML = `
      <div class="char-celebrate-panel" role="dialog" aria-labelledby="content-celebrate-title">
        <p class="char-celebrate-kicker">New unlock</p>
        <h2 id="content-celebrate-title">${esc(item.label || "Sound")} unlocked!</h2>
        ${bits.join("")}
        <button type="button" class="btn primary" id="content-play-reward">Play reward</button>
        <button type="button" class="btn" id="content-celebrate-close">Nice</button>
      </div>`;
    layer.classList.add("open");
    const close = () => closeContentCelebrate();
    document.getElementById("content-play-reward").addEventListener("click", () => {
      if (!playLibraryItem(item) && item.kind === "link" && src && src !== "#") {
        window.open(src, "_blank", "noopener");
      }
    });
    document.getElementById("content-celebrate-close").addEventListener("click", close);
    layer.onclick = (e) => {
      if (e.target === layer) close();
    };
    markContentSeen(item.id);
    confetti();
    return true;
  }

  function maybePlayContentCelebration(lib) {
    const pending = pendingContentCelebrations(lib);
    if (!pending.length) return false;
    const first = pending[0];
    if (first.item) playContentReward(first.item);
    else markContentSeen(first.id);
    pending.slice(1).forEach((row) => markContentSeen(row.id));
    return true;
  }

  function hasUnlock(require) {
    if (!require || !require.type || !require.id) return true;
    if (require.type === "character") return alreadyUnlockedCharacter(require.id);
    if (require.type === "content") return alreadyUnlockedContent(require.id);
    return alreadyUnlockedGear(require.id);
  }

  function applyFamilyGearUnlocks(family) {
    const next = normalizeFamily(family);
    mergeGearUnlocks(next.gearUnlocks);
    return next;
  }

  function grantGear(family, unlock) {
    const next = normalizeFamily(family);
    if (!unlock || !unlock.id) return { family: next, fresh: false };
    const fresh = markGearUnlocked(unlock);
    if (!next.gearUnlocks[unlock.id]) {
      next.gearUnlocks[unlock.id] = Object.assign({ at: nowIso() }, unlock);
      saveFamily(next);
    } else if (fresh) {
      saveFamily(next);
    }
    return { family: next, fresh };
  }

  function otherAwardGrantsGear(pack, family, gearId, exceptId) {
    return (pack.achievements || []).some((ach) => {
      if (!ach || ach.id === exceptId) return false;
      const unlock = rewardUnlockOf(ach);
      if (!unlock || unlock.type === "character" || unlock.id !== gearId) return false;
      return !!(family.streaks[ach.id] && family.streaks[ach.id].awarded) || alreadyUnlocked(ach.id);
    });
  }

  function emptyAskThread() {
    return { messages: [] };
  }

  function normalizeAskThread(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const messages = Array.isArray(src.messages) ? src.messages.filter((m) => m && m.text).map((m) => ({
      id: String(m.id || uid("ask")),
      role: m.role === "mentor" ? "mentor" : "bennett",
      text: String(m.text || "").trim(),
      at: m.at || nowIso(),
      title: String(m.title || "").trim(),
      test: !!m.test
    })) : [];
    return { messages };
  }

  function getAskThread() {
    return normalizeAskThread(read(KEYS.ask, emptyAskThread()));
  }

  function saveAskThread(thread) {
    write(KEYS.ask, normalizeAskThread(thread));
  }

  function addAskMessage(thread, msg) {
    const next = normalizeAskThread(thread);
    next.messages = next.messages.concat([Object.assign({ id: uid("ask"), at: nowIso() }, msg)]);
    saveAskThread(next);
    return next;
  }

  function latestReflection(family) {
    const answers = ((family && family.reflections && family.reflections.answers) || []).slice();
    if (!answers.length) return null;
    answers.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const row = answers[0];
    if (!row || !String(row.text || "").trim()) return null;
    return row;
  }

  function latestBennettQuestion(family) {
    const notes = ((family && family.notes) || []).filter((n) => n && n.from === "bennett" && String(n.text || "").trim());
    if (!notes.length) return null;
    notes.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    return notes[0];
  }

  function classIdForTitle(title) {
    const t = String(title || "");
    if (/english(\s*10)?/i.test(t) || /\bela\b/i.test(t)) return "english-10";
    if (/\bband\b/i.test(t)) return "band";
    if (/sociolog/i.test(t)) return "sociology";
    if (/web\s*design/i.test(t)) return "web-design";
    if (/academic intervention|\bseminar\b/i.test(t)) return "academic-intervention";
    if (/chem/i.test(t)) return "chemistry";
    if (/strength|conditioning/i.test(t)) return "strength";
    if (/geometry/i.test(t)) return "geometry";
    return "";
  }

  function classNameForId(id) {
    const key = String(id || "").toLowerCase();
    if (key === "band") return "Marching Band";
    if (key === "sociology") return "Sociology";
    if (key === "web-design") return "Web Design I";
    if (key === "academic-intervention") return "Academic Intervention / Seminar";
    if (key === "chemistry") return "Chemistry";
    if (key === "strength") return "Strength & Conditioning I";
    if (key === "english-10") return "English 10";
    if (key === "geometry") return "Geometry";
    return "";
  }

  function classPeriodLine(cls) {
    const period = String((cls && cls.period) || "").trim();
    const name = String((cls && cls.name) || classNameForId(cls && cls.id) || "").trim();
    if (period && name && name.toLowerCase().indexOf(period.toLowerCase()) >= 0) return name;
    if (period && name) return period + " " + name;
    return name || period;
  }

  function classShowsPeriodChip(cls) {
    const period = String((cls && cls.period) || "").trim();
    const name = String((cls && cls.name) || "").trim();
    if (!period) return false;
    return name.toLowerCase().indexOf(period.toLowerCase()) < 0;
  }

  function classMetaLine(cls) {
    const bits = [];
    if (cls && cls.time) bits.push(cls.time);
    if (cls && cls.room) bits.push(cls.room);
    if (cls && cls.teacher) bits.push(cls.teacher);
    return bits.join(" · ");
  }

  function khanIdsForClass(cls) {
    if (!cls) return [];
    if (cls.khan != null) return normalizeKhanIds(cls.khan);
    const id = String(cls.id || "").toLowerCase();
    if (id === "english-10") return ["ela", "grammar"];
    if (id === "chemistry") return ["hs-chemistry"];
    if (id === "geometry") return ["geometry-home"];
    return [];
  }

  function khanLinksByIds(ids) {
    const want = new Set(normalizeKhanIds(ids));
    return KHAN.filter((k) => want.has(k.id));
  }

  function khanLinksForClass(cls) {
    return khanLinksByIds(khanIdsForClass(cls));
  }

  function khanShortLabel(link) {
    return String((link && link.label) || "").replace(/^Khan Academy —\s*/i, "") || (link && link.label) || "";
  }

  function khanLinksFor(title, hint) {
    const classId = String((hint && hint.classId) || "").toLowerCase();
    if (classId) {
      return khanLinksForClass({
        id: classId,
        name: (hint && hint.name) || title || classNameForId(classId),
        khan: hint && hint.khan
      });
    }
    const t = String(title || "").toLowerCase();
    if (/chem/.test(t)) {
      return KHAN.filter((k) => k.id === "hs-chemistry" || k.id === "science");
    }
    if (/english|ela|comic|names|notebook|grammar|panel/.test(t)) {
      return KHAN.filter((k) => k.id === "ela" || k.id === "grammar");
    }
    if (/geometry/.test(t)) {
      return KHAN.filter((k) => k.id === "geometry-home");
    }
    if (/science|bio/.test(t)) {
      return KHAN.filter((k) => k.id === "science");
    }
    return KHAN.slice();
  }

  function khanStripFromLinks(links) {
    if (!links || !links.length) return "";
    return `
      <div class="khan-strip">
        <p class="khan-kicker">Opens on Khan. No login needed.</p>
        <div class="khan-links">
          ${links.map((k) => `<a class="khan-link" href="${esc(k.url)}" target="_blank" rel="noopener">${esc(k.label)}</a>`).join("")}
        </div>
      </div>`;
  }

  function khanStripHtml(title, hint) {
    return khanStripFromLinks(khanLinksFor(title, hint));
  }

  function khanStripHtmlForClass(cls) {
    return khanStripFromLinks(khanLinksForClass(cls));
  }

  function khanInlineHtml(links) {
    if (!links || !links.length) return "";
    return links.map((k) => {
      return `<a class="khan-link" href="${esc(k.url)}" target="_blank" rel="noopener">${esc(khanShortLabel(k))}</a>`;
    }).join("");
  }

  function classDueCount(cls, week) {
    const ids = new Set(((cls && cls.items) || []).map((item) => item && item.id).filter(Boolean));
    return ((week && week.work) || []).filter((w) => {
      if (!w || !w.id) return false;
      if (workState(w.id).done) return false;
      if (ids.has(w.id)) return true;
      return classIdForTitle(w.title) === (cls && cls.id);
    }).length;
  }

  function classDueLabel(count) {
    if (!count) return "Nothing due yet";
    return count === 1 ? "1 due" : count + " due";
  }

  async function loadStory() {
    const seed = parseSeed("story-seed");
    return fetchJson("story.json", seed || { title: "Story", start: "start", nodes: [] });
  }

  function closeCharacterCelebrate() {
    const layer = document.getElementById("char-celebrate");
    if (!layer) return;
    const video = layer.querySelector("video");
    if (video) {
      try { video.pause(); } catch (_) {}
    }
    layer.classList.remove("open");
  }

  function playUnlockClip(roster, unlockedChar) {
    const media = characterMedia(roster, unlockedChar);
    const name = characterLabel(unlockedChar, "New teammate");
    let layer = document.getElementById("char-celebrate");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "char-celebrate";
      layer.className = "char-celebrate";
      document.body.appendChild(layer);
    }
    layer.innerHTML = `
      <div class="char-celebrate-panel" role="dialog" aria-labelledby="char-celebrate-title">
        <p class="char-celebrate-kicker">New teammate</p>
        <h2 id="char-celebrate-title">${esc(name)} unlocked!</h2>
        <video src="${esc(media.video)}" poster="${esc(media.poster)}" playsinline ${prefersReducedMotion() ? "" : "autoplay"} controls></video>
        <button type="button" class="btn primary" id="char-celebrate-close">Nice</button>
      </div>`;
    layer.classList.add("open");
    const close = () => closeCharacterCelebrate();
    document.getElementById("char-celebrate-close").addEventListener("click", close);
    layer.onclick = (e) => {
      if (e.target === layer) close();
    };
    if (unlockedChar && unlockedChar.id) markCharacterSeen(unlockedChar.id);
    confetti();
  }

  function maybePlayUnlockCelebration(roster) {
    const pending = pendingCharacterCelebrations(roster);
    if (!pending.length) return false;
    playUnlockClip(roster, pending[0]);
    pending.slice(1).forEach((ch) => markCharacterSeen(ch.id));
    return true;
  }

  function applyFamilyCharacterUnlocks(family) {
    const next = normalizeFamily(family);
    mergeCharacterUnlocks(next.characterUnlocks);
    applyFamilyGearUnlocks(next);
    applyFamilyContentUnlocks(next);
    return next;
  }

  function grantCharacter(family, characterId) {
    const next = normalizeFamily(family);
    if (!characterId) return { family: next, fresh: false };
    const fresh = markCharacterUnlocked(characterId);
    if (!next.characterUnlocks[characterId]) {
      next.characterUnlocks[characterId] = nowIso();
      saveFamily(next);
    } else if (fresh) {
      saveFamily(next);
    }
    return { family: next, fresh };
  }

  function otherAwardGrantsCharacter(pack, family, characterId, exceptId) {
    return (pack.achievements || []).some((ach) => {
      if (!ach || ach.id === exceptId) return false;
      const grant = (family.streaks[ach.id] && family.streaks[ach.id].grantedCharacter)
        || rewardCharacterId(ach);
      if (grant !== characterId) return false;
      return !!(family.streaks[ach.id] && family.streaks[ach.id].awarded) || alreadyUnlocked(ach.id);
    });
  }

  async function loadFamily() {
    const seed = normalizeFamily(parseSeed("family-seed") || emptyFamily());
    const stored = getFamilyDraft();
    if (stored) {
      applyFamilyCharacterUnlocks(stored);
      return stored;
    }
    const file = await fetchJson("family.json", null);
    const next = normalizeFamily(file || seed);
    applyFamilyCharacterUnlocks(next);
    return next;
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
    let startedAt = cur.startedAt || null;
    if (!startedAt && typeof cur.started === "number") {
      startedAt = new Date(cur.started).toISOString();
    }
    if (!startedAt && typeof cur.started === "string" && cur.started !== "true" && cur.started !== "false") {
      startedAt = cur.started;
    }
    const started = cur.started === false
      ? false
      : !!(cur.started === true || typeof cur.started === "number" || startedAt);
    return { started, startedAt, done: cur.done || null };
  }

  function touchWork(id, kind) {
    const all = getProgress();
    const cur = Object.assign({}, all[id] || {});
    const before = workState(id);
    let first = false;
    if (kind === "started") {
      if (before.started) {
        const hist = Array.isArray(cur.startedHistory) ? cur.startedHistory.slice() : [];
        if (cur.startedAt) hist.push(cur.startedAt);
        cur.startedHistory = hist;
        cur.started = false;
      } else {
        cur.started = true;
        if (!cur.startedAt) cur.startedAt = nowIso();
        else cur.startedAt = nowIso();
        first = !cur.startedAwarded;
        if (first) {
          cur.startedAwarded = true;
          addBananas(2);
        }
      }
    } else if (kind === "done") {
      if (cur.done) {
        cur.done = null;
      } else {
        cur.done = Date.now();
        first = !cur.doneAwarded;
        if (first) {
          cur.doneAwarded = true;
          addBananas(3);
        }
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
        addBananas(bananasOf(ach));
        fresh.push(ach);
      }
    });
    return fresh;
  }

  function awardAchievement(pack, id) {
    const ach = (pack.achievements || []).find((a) => a.id === id);
    if (!ach) return null;
    if (!markUnlocked(id)) return null;
    addBananas(bananasOf(ach));
    return ach;
  }

  function awardStreak(pack, family, id) {
    const ach = awardAchievement(pack, id);
    const next = normalizeFamily(family);
    const st = next.streaks[id] || { count: 0 };
    const unlock = rewardUnlockOf(ach) || (st.grantedUnlock && typeof st.grantedUnlock === "object" ? st.grantedUnlock : null);
    const granted = (unlock && unlock.type === "character" && unlock.id) || st.grantedCharacter || "";
    next.streaks[id] = Object.assign({}, st, {
      awarded: true,
      awardedAt: nowIso(),
      grantedCharacter: granted || undefined,
      grantedUnlock: unlock || undefined,
      rewardMedia: (ach && ach.rewardMedia) || st.rewardMedia || undefined
    });
    let freshCharacter = false;
    let freshGear = false;
    let freshContent = false;
    if (granted) {
      const grant = grantCharacter(next, granted);
      freshCharacter = grant.fresh;
      Object.assign(next, grant.family);
    }
    if (unlock && unlock.type === "content") {
      const grant = grantContent(next, unlock);
      freshContent = grant.fresh;
      Object.assign(next, grant.family);
    } else if (unlock && unlock.type !== "character") {
      const grant = grantGear(next, unlock);
      freshGear = grant.fresh;
      Object.assign(next, grant.family);
    }
    if (!granted && !(unlock && unlock.type && unlock.type !== "character")) {
      saveFamily(next);
    }
    return {
      family: next,
      achievement: ach,
      grantedCharacter: granted || "",
      grantedUnlock: unlock,
      freshCharacter,
      freshGear,
      freshContent
    };
  }

  function revokeUnlock(id) {
    const all = getUnlocks();
    if (!all[id]) return false;
    delete all[id];
    write(KEYS.unlocks, all);
    return true;
  }

  function revokeAchievement(pack, family, id) {
    const ach = (pack.achievements || []).find((a) => a.id === id);
    const was = revokeUnlock(id);
    const next = normalizeFamily(family);
    const st = next.streaks[id] || { count: 0 };
    const unlock = st.grantedUnlock || rewardUnlockOf(ach);
    const granted = st.grantedCharacter || (unlock && unlock.type === "character" && unlock.id) || "";
    next.streaks[id] = Object.assign({}, st, { awarded: false });
    let revokedCharacter = false;
    let revokedGear = false;
    let revokedContent = false;
    if (granted && !otherAwardGrantsCharacter(pack, next, granted, id)) {
      revokedCharacter = revokeCharacterUnlock(granted);
      if (next.characterUnlocks[granted]) {
        delete next.characterUnlocks[granted];
      }
    }
    if (unlock && unlock.type === "content" && unlock.id && !otherAwardGrantsContent(pack, next, unlock.id, id)) {
      revokedContent = revokeContentUnlock(unlock.id);
      if (next.contentUnlocks[unlock.id]) {
        delete next.contentUnlocks[unlock.id];
      }
    } else if (unlock && unlock.type !== "character" && unlock.id && !otherAwardGrantsGear(pack, next, unlock.id, id)) {
      revokedGear = revokeGearUnlock(unlock.id);
      if (next.gearUnlocks[unlock.id]) {
        delete next.gearUnlocks[unlock.id];
      }
    }
    saveFamily(next);
    if (was && ach) {
      write(KEYS.bananas, Math.max(0, getBananas() - bananasOf(ach)));
    }
    return { family: next, revoked: was, achievement: ach || null, revokedCharacter, revokedGear, revokedContent };
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
    const extra = bananasOf(ach) ? " · +" + bananasOf(ach) + " " + cur.name : "";
    const game = ach.unlocksGame === "egg" ? " · Egg game unlocked" : "";
    const unlock = rewardUnlockOf(ach);
    const mate = unlock && unlock.type === "character" ? " · teammate unlocked" : "";
    const content = unlock && unlock.type === "content" ? " · sound unlocked" : "";
    const gear = unlock && unlock.type !== "character" && unlock.type !== "content" ? " · " + (unlock.label || unlock.type) + " unlocked" : "";
    toast((ach.title || "Achievement") + " unlocked!" + prize + extra + game + mate + content + gear);
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

  function exportPack(pack, family, roster, library) {
    const characters = normalizeCharacters(roster || getMomCharacters() || defaultCharacters());
    const familyNext = normalizeFamily(family);
    familyNext.characterUnlocks = Object.assign({}, familyNext.characterUnlocks, getCharacterUnlocks());
    familyNext.gearUnlocks = Object.assign({}, familyNext.gearUnlocks, getGearUnlocks());
    familyNext.contentUnlocks = Object.assign({}, familyNext.contentUnlocks, getContentUnlocks());
    return {
      version: 7,
      currency: currency(pack),
      achievements: pack.achievements || [],
      characters,
      characterUnlocks: getCharacterUnlocks(),
      gearUnlocks: getGearUnlocks(),
      contentUnlocks: getContentUnlocks(),
      library: normalizeLibrary(library || getMomLibrary() || defaultLibrary()),
      libraryBlobs: {},
      askThread: getAskThread(),
      family: familyNext,
      unlocks: getUnlocks(),
      trophyOrder: getTrophyOrder(),
      progress: getProgress()
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
    if (obj.characters) saveMomCharacters(obj.characters);
    if (obj.library) saveMomLibrary(obj.library);
    if (obj.family) saveFamily(obj.family);
    if (obj.unlocks && typeof obj.unlocks === "object") write(KEYS.unlocks, obj.unlocks);
    if (Array.isArray(obj.trophyOrder)) saveTrophyOrder(obj.trophyOrder);
    if (obj.progress && typeof obj.progress === "object" && !Array.isArray(obj.progress)) {
      write(KEYS.progress, obj.progress);
    }
    if (obj.askThread) saveAskThread(obj.askThread);
    const importedUnlocks = Object.assign(
      {},
      asUnlockMap(obj.characterUnlocks),
      asUnlockMap(obj.family && obj.family.characterUnlocks)
    );
    if (obj.characterUnlocks || (obj.family && obj.family.characterUnlocks)) {
      saveCharacterUnlocks(importedUnlocks);
    }
    const importedGear = Object.assign(
      {},
      asUnlockMap(obj.gearUnlocks),
      asUnlockMap(obj.family && obj.family.gearUnlocks)
    );
    if (obj.gearUnlocks || (obj.family && obj.family.gearUnlocks)) {
      saveGearUnlocks(importedGear);
    }
    const importedContent = Object.assign(
      {},
      asUnlockMap(obj.contentUnlocks),
      asUnlockMap(obj.family && obj.family.contentUnlocks)
    );
    if (obj.contentUnlocks || (obj.family && obj.family.contentUnlocks)) {
      saveContentUnlocks(importedContent);
    }
    return pack;
  }

  async function exportFamilyPack(pack, family, roster, library) {
    const next = exportPack(pack, family, roster, library);
    const collected = await collectLibraryBlobs(next.library);
    next.libraryBlobs = collected.blobs;
    return { pack: next, skipped: collected.skipped };
  }

  async function importFamilyPack(obj) {
    const pack = importPack(obj);
    if (!pack) return null;
    const applied = await applyLibraryBlobs(obj && obj.libraryBlobs);
    const lib = getMomLibrary();
    if (lib) await hydrateLibraryBlobs(lib);
    const missing = ((lib && lib.items) || [])
      .filter((item) => item.device && !libraryBlobUrl(item.id) && !applied.stored.includes(item.id))
      .map((item) => item.label || item.id);
    const skipped = applied.skipped.concat(missing.filter((label) => applied.skipped.indexOf(label) < 0));
    return { pack, skipped, stored: applied.stored };
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
    loadCharacters,
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
    usingMomCharacters,
    getMomCharacters,
    saveMomCharacters,
    clearMomCharacters,
    usingMomLibrary,
    getMomLibrary,
    saveMomLibrary,
    clearMomLibrary,
    loadLibrary,
    defaultLibrary,
    normalizeLibrary,
    inferKind,
    kindFromFile,
    labelFromFilename,
    fileBasename,
    isSkippedDeviceSound,
    labelsFromManifest,
    addDeviceLibraryFile,
    putLibraryBlob,
    getLibraryBlob,
    deleteLibraryBlob,
    clearLibraryBlobs,
    hydrateLibraryBlobs,
    libraryBlobUrl,
    PACK_BLOB_MAX,
    libraryItem,
    libraryFor,
    libraryForAttach,
    libraryThumb,
    libraryThumbHtml,
    libraryPlayerHtml,
    librarySrc,
    libraryKindLabel,
    contentLibraryItems,
    isSafeHttpUrl,
    youtubeId,
    youtubeEmbedSrc,
    LIBRARY_GROUPS,
    LIBRARY_KINDS,
    getFamilyDraft,
    saveFamily,
    clearFamilyDraft,
    usingFamilyDraft,
    emptyFamily,
    normalizeFamily,
    emptyOverlay,
    normalizeOverlay,
    ensureWeekIds,
    applyWeekOverlay,
    applyProgressOverlay,
    addProgressClass,
    editWeekOverlay,
    deleteWeekOverlay,
    editProgressClass,
    deleteProgressClass,
    editProgressItem,
    deleteProgressItem,
    updateNote,
    deleteNote,
    updatePrompt,
    deletePrompt,
    updateAnswer,
    deleteAnswer,
    confirmDelete,
    entryButtons,
    hasEggGame,
    gameHref,
    toLocalInput,
    fromLocalInput,
    getTrophyOrder,
    saveTrophyOrder,
    workState,
    touchWork,
    recordHelp,
    helpOpens,
    checkUnlocks,
    awardAchievement,
    awardStreak,
    revokeUnlock,
    revokeAchievement,
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
    importPack,
    exportFamilyPack,
    importFamilyPack,
    defaultCharacters,
    normalizeCharacters,
    characterLabel,
    getCharacterUnlocks,
    alreadyUnlockedCharacter,
    markCharacterUnlocked,
    revokeCharacterUnlock,
    unlockedCharacters,
    comicUnlocked,
    pendingCharacterCelebrations,
    markCharacterSeen,
    aceMedia,
    playUnlockClip,
    maybePlayUnlockCelebration,
    applyFamilyCharacterUnlocks,
    grantCharacter,
    grantGear,
    grantContent,
    bananasOf,
    rewardUnlockOf,
    rewardCharacterId,
    getGearUnlocks,
    alreadyUnlockedGear,
    unlockedGear,
    getContentUnlocks,
    alreadyUnlockedContent,
    unlockedContent,
    lockedContentCount,
    canPlayLibraryItem,
    attachedLibraryItem,
    playLibraryItem,
    stopLibraryAudio,
    primeLibraryAudio,
    waitForLibraryAudio,
    playRandomLibraryItem,
    audioLibraryItems,
    SOUND_CUES,
    cueLibraryItem,
    setSoundCue,
    playSoundCue,
    playSynth,
    playContentReward,
    maybePlayContentCelebration,
    markContentSeen,
    hasUnlock,
    getAskThread,
    saveAskThread,
    addAskMessage,
    latestReflection,
    latestBennettQuestion,
    classIdForTitle,
    classNameForId,
    classPeriodLine,
    classShowsPeriodChip,
    classMetaLine,
    classDueCount,
    classDueLabel,
    khanIdsForClass,
    khanLinksByIds,
    khanLinksForClass,
    khanLinksFor,
    khanStripHtml,
    khanStripHtmlForClass,
    khanInlineHtml,
    khanShortLabel,
    KHAN,
    loadStory,
    characterMedia,
    paintStoryChip,
    paintBuild
  };

  function paintStoryChip(roster, force) {
    const el = document.getElementById("story-chip");
    if (!el) return;
    const open = !!force || comicUnlocked(roster);
    el.hidden = !open;
  }

  function paintBuild() {
    const meta = global.BW_BUILD || { build: 0, modified: "" };
    let el = document.getElementById("build-stamp");
    if (!el) {
      el = document.createElement("div");
      el.id = "build-stamp";
      el.className = "build-stamp";
      document.body.appendChild(el);
    }
    const when = fmtStamp(meta.modified) || meta.modified || "";
    el.innerHTML = `<span>Build ${esc(meta.build)}</span>${when ? `<span>${esc(when)}</span>` : ""}`;
    el.title = "Build " + meta.build + (when ? " · last modified " + when : "");
  }

  if (document.body) paintBuild();
  else document.addEventListener("DOMContentLoaded", paintBuild);
})(window);
