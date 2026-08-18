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
    opens: "bw-opens",
    previewAll: "bw-preview-all",
    previewIds: "bw-preview-ids",
    previewLocked: "bw-preview-locked",
    signinSeen: "bw-signin-seen",
    siteView: "bw-site-view"
  };

  const SITE_VIEWS = ["me", "bennett", "mom"];

  const LIBRARY_GROUPS = ["ace", "riff", "scorch", "deuce", "fuzz", "bennett", "crew", "fun"];
  const TEAMMATE_IDS = ["ace", "riff", "scorch", "deuce", "fuzz"];
  const SIGNIN_ACHIEVEMENT = "signin-bennett";
  const LIBRARY_KINDS = ["image", "video", "audio", "link"];
  const GEAR_SLOTS = ["tool", "weapon", "ability", "outfit"];
  const CONTENT_SLOT = "content";
  const SOUND_CUES = [
    { id: "undo", label: "Undo is clicked" },
    { id: "work-start", label: "I started this is clicked" },
    { id: "work-done", label: "Done is clicked" },
    { id: "tables", label: "The table is clicked" },
    { id: "egg-win", label: "Egg game — 41 eggs win" },
    { id: "egg-closed", label: "Egg game — company shutdown" },
    { id: "egg-end", label: "Egg game — closed by the company" },
    { id: "streak-award", label: "A streak is awarded" }
  ];
  const DEFAULT_SOUND_CUES = {
    undo: "undo-click",
    tables: "tablesloud"
  };
  const SHIPPED_UNDO_CLICK = {
    id: "undo-click",
    label: "Undo",
    kind: "audio",
    path: "audio/undo.wav",
    character: "fun"
  };
  const SHIPPED_TABLE_CLICK = {
    id: "tablesloud",
    label: "Table click",
    kind: "audio",
    path: "audio/tablesloud.mp3",
    character: "fun"
  };
  const RANDOM_CUE = "__random__";
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
    { id: "sociology", label: "Khan Academy — Sociology", url: "https://www.khanacademy.org/test-prep/mcat/society-and-culture" },
    { id: "science", label: "Khan Academy — Science", url: "https://www.khanacademy.org/science" }
  ];
  const KHAN_ROSTER_CLASS_IDS = ["english-10", "geometry", "chemistry", "sociology"];

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

  const DEFAULT_TERM = { id: "2025-26-s1", label: "2025–26 S1", grade: "sophomore" };

  function termOf(seed) {
    const t = seed && seed.term;
    if (t && t.id) {
      return {
        id: String(t.id),
        label: String(t.label || t.id),
        grade: String(t.grade || "")
      };
    }
    return Object.assign({}, DEFAULT_TERM);
  }

  function track(type, extra) {
    try {
      if (global.Telemetry && typeof global.Telemetry.track === "function") {
        global.Telemetry.track(type, extra || {});
      }
    } catch (_) {}
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

  function storedBananas() {
    return Number(read(KEYS.bananas, 0)) || 0;
  }

  function getBananas(pack) {
    if (kidViewHidesPreview()) return kidBananas(pack);
    return storedBananas();
  }

  function addBananas(n) {
    const next = storedBananas() + (Number(n) || 0);
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
        edits: { events: {}, work: {}, notes: {} },
        added: { events: [], work: [], notes: [] }
      },
      progress: {
        deletedClasses: [],
        deletedItems: [],
        classEdits: {},
        itemEdits: {},
        addedClasses: [],
        addedItems: []
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

  function normalizeAddedList(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((row) => row && typeof row === "object" && row.id).map((row) => Object.assign({}, row));
  }

  function normalizeAddedItems(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((row) => row && row.id && row.classId).map((row) => ({
      id: String(row.id),
      classId: String(row.classId),
      title: String(row.title || "").trim(),
      kind: String(row.kind || "assignment"),
      due: row.due || undefined,
      termId: row.termId ? String(row.termId) : undefined,
      note: row.note ? String(row.note) : undefined
    })).filter((row) => row.title);
  }

  function normalizeOverlay(raw) {
    const o = raw && typeof raw === "object" ? raw : {};
    const week = o.week && typeof o.week === "object" ? o.week : {};
    const progress = o.progress && typeof o.progress === "object" ? o.progress : {};
    const deleted = week.deleted && typeof week.deleted === "object" ? week.deleted : {};
    const edits = week.edits && typeof week.edits === "object" ? week.edits : {};
    const added = week.added && typeof week.added === "object" ? week.added : {};
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
        },
        added: {
          events: normalizeAddedList(added.events),
          work: normalizeAddedList(added.work),
          notes: normalizeAddedList(added.notes)
        }
      },
      progress: {
        deletedClasses: asStringList(progress.deletedClasses),
        deletedItems: asStringList(progress.deletedItems),
        classEdits: asIdMap(progress.classEdits),
        itemEdits: asIdMap(progress.itemEdits),
        addedClasses: normalizeAddedClasses(progress.addedClasses),
        addedItems: normalizeAddedItems(progress.addedItems)
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

  const SEED_GEN = 41;
  const SEED_GEN_KEY = "bw-seed-gen";

  function migrateCleanSlate() {
    try {
      if (Number(localStorage.getItem(SEED_GEN_KEY) || 0) >= SEED_GEN) return;
      const family = read(KEYS.family, null);
      const cues = family && family.soundCues && typeof family.soundCues === "object" ? family.soundCues : {};
      [
        KEYS.mom,
        KEYS.family,
        KEYS.progress,
        KEYS.unlocks,
        KEYS.bananas,
        KEYS.eggs,
        KEYS.trophyOrder,
        KEYS.characterUnlocks,
        KEYS.characterSeen,
        KEYS.gear,
        KEYS.content,
        KEYS.contentSeen,
        KEYS.ask,
        KEYS.opened,
        KEYS.opens
        // Keep bw-telemetry, bw-device-id, bw-session-at, bw-site-view — usage history and preview are not seed data.
      ].forEach((key) => {
        try { localStorage.removeItem(key); } catch (_) {}
      });
      if (Object.keys(cues).length) {
        const next = emptyFamily();
        next.soundCues = asCueMap(cues);
        write(KEYS.family, next);
      }
      localStorage.setItem(SEED_GEN_KEY, String(SEED_GEN));
    } catch (_) {}
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
      overlay: emptyOverlay(),
      basecamp: emptyBasecamp()
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
      overlay: normalizeOverlay(f.overlay),
      basecamp: normalizeBasecamp(f.basecamp)
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

  function mergeAddedList(baseList, addedList, deleted, edits) {
    const applied = applyListOverlay(baseList, deleted, edits);
    const seen = new Set(applied.map((item) => item.id));
    applyListOverlay(addedList, deleted, edits).forEach((item) => {
      if (!item || !item.id || seen.has(item.id)) return;
      applied.push(item);
      seen.add(item.id);
    });
    return applied;
  }

  function applyWeekOverlay(week, family) {
    const base = ensureWeekIds(week);
    const overlay = normalizeFamily(family).overlay.week;
    return Object.assign({}, base, {
      events: mergeAddedList(base.events, overlay.added.events, overlay.deleted.events, overlay.edits.events),
      work: mergeAddedList(base.work, overlay.added.work, overlay.deleted.work, overlay.edits.work),
      notes: mergeAddedList(base.notes, overlay.added.notes, overlay.deleted.notes, overlay.edits.notes)
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
    const byClass = new Map(classes.map((cls) => [cls.id, cls]));
    (overlay.addedItems || []).forEach((row) => {
      if (!row || !row.id || overlay.deletedItems.indexOf(row.id) >= 0) return;
      const cls = byClass.get(row.classId);
      if (!cls) return;
      if (cls.items.some((item) => item.id === row.id)) return;
      const ip = overlay.itemEdits[row.id];
      cls.items.push(ip ? Object.assign({}, row, ip, { id: row.id }) : Object.assign({}, row));
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

  function addWeekItem(family, kind, item) {
    const next = normalizeFamily(family);
    if (!item || !item.id || !next.overlay.week.added[kind]) return next;
    const list = next.overlay.week.added[kind];
    if (list.some((row) => row && row.id === item.id)) return next;
    next.overlay.week.added[kind] = list.concat([Object.assign({}, item)]);
    saveFamily(next);
    return next;
  }

  function addProgressItem(family, classId, item) {
    const next = normalizeFamily(family);
    const cid = String(classId || "").trim();
    if (!cid || !item || !item.id) return next;
    const list = next.overlay.progress.addedItems || [];
    if (list.some((row) => row && row.id === item.id)) return next;
    next.overlay.progress.addedItems = list.concat([Object.assign({}, item, { classId: cid })]);
    saveFamily(next);
    return next;
  }

  function assignmentTitle(classId, title) {
    const raw = String(title || "").trim();
    const prefix = classNameForId(classId);
    if (!raw) return raw;
    if (!prefix) return raw;
    if (raw.toLowerCase().indexOf(prefix.toLowerCase()) === 0) return raw;
    return prefix + ": " + raw;
  }

  function addAssignment(family, seed, fields) {
    const src = fields && typeof fields === "object" ? fields : {};
    const title = String(src.title || "").trim();
    const classId = String(src.classId || "").trim();
    if (!title) return { family: normalizeFamily(family), id: "" };
    const id = src.id || uid("w");
    const term = termOf(seed);
    const work = {
      id,
      title: assignmentTitle(classId, title),
      due: src.due,
      suggest_from: src.suggest_from || undefined,
      note: src.note ? String(src.note).trim() : undefined,
      classId: classId || undefined,
      termId: term.id,
      addedBy: src.addedBy || "bennett"
    };
    let next = addWeekItem(family, "work", work);
    if (classId) {
      next = addProgressItem(next, classId, {
        id,
        title: title,
        kind: "assignment",
        classId,
        termId: term.id
      });
    }
    const noteText = String(src.note || "").trim();
    if (noteText) {
      next = addNote(next, {
        id: uid("n"),
        targetType: "work",
        targetId: id,
        from: src.addedBy === "parent" ? "parent" : "bennett",
        kind: "note",
        text: noteText,
        at: nowIso(),
        classId: classId || undefined,
        termId: term.id
      });
    }
    track("work_add", { assignmentId: id, classId: classId || "", termId: term.id });
    return { family: next, id };
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
    queueNotePush(next);
    return next;
  }

  function deleteNote(family, id) {
    const next = normalizeFamily(family);
    next.notes = next.notes.filter((n) => n.id !== id);
    saveFamily(next);
    queueNotePush(next);
    const tel = global.Telemetry;
    if (tel && typeof tel.deleteNote === "function" && tel.connected && tel.connected()) {
      tel.deleteNote(id).catch(() => {});
    }
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
    if (siteViewHidesAdult()) return "";
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
    migrateCleanSlate();
    const seed = parseSeed("week-seed") || parseSeed("seed");
    return fetchJson("week.json", seed);
  }

  async function loadAchievements() {
    migrateCleanSlate();
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
        },
        {
          id: "bennett",
          name: "Bennett",
          talent: "The Show-Up",
          tagline: "I'm in.",
          status: "ready",
          video: "img/characters/bennett.mp4",
          poster: "img/characters/bennett.jpg"
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
    if (!id || !getCharacterUnlocks()[id]) return false;
    if (kidViewHidesPreview() && unlockTargetIsPreviewOnly("character", id)) return false;
    return true;
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
    return ((roster && roster.characters) || []).filter((ch) => alreadyUnlockedCharacter(ch.id));
  }

  function isTeammate(ch) {
    return !!(ch && TEAMMATE_IDS.indexOf(ch.id) >= 0);
  }

  function unlockedTeammates(roster) {
    return unlockedCharacters(roster).filter(isTeammate);
  }

  function comicUnlocked(roster) {
    const need = (roster && roster.comicStartsAfter) || 3;
    return unlockedTeammates(roster).length >= need;
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
    const id = (ch && ch.id) || "ace";
    if (ch && (ch.video || ch.poster)) {
      return {
        video: ch.video || ("img/characters/" + id + ".mp4"),
        poster: ch.poster || ("img/characters/" + id + ".jpg")
      };
    }
    const row = ((roster && roster.characters) || []).find((item) => item.id === id);
    if (row && (row.video || row.poster)) {
      return {
        video: row.video || ("img/characters/" + id + ".mp4"),
        poster: row.poster || ("img/characters/" + id + ".jpg")
      };
    }
    return {
      video: "img/characters/" + id + ".mp4",
      poster: "img/characters/" + id + ".jpg"
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
        { id: "bennett-clip", label: "Bennett locker clip", path: "img/characters/bennett.mp4", poster: "img/characters/bennett.jpg", kind: "video", character: "bennett" },
        { id: "bennett-poster", label: "Bennett poster", path: "img/characters/bennett.jpg", kind: "image", character: "bennett" },
        { id: "crew-hero", label: "Crew hero lineup", path: "img/library/crew-hero.jpg", kind: "image", character: "crew" },
        { id: "crew-run", label: "Crew run", path: "img/library/crew-run.jpg", kind: "image", character: "crew" },
        { id: "crew-burst", label: "Crew burst", path: "img/library/crew-burst.jpg", kind: "image", character: "crew" },
        { id: "crew-adventure", label: "Crew adventure clip", path: "img/library/crew-adventure.mp4", poster: "img/library/crew-hero.jpg", kind: "video", character: "crew" },
        { id: "angle-finder", label: "Angle Finder", path: "img/library/angle-finder.png", poster: "img/library/angle-finder.png", kind: "image", character: "deuce", slot: "tool" },
        { id: "field-kit", label: "Field Kit", path: "img/library/field-kit.png", poster: "img/library/field-kit.png", kind: "image", character: "scorch", slot: "tool" },
        { id: "unplugged-strap", label: "Unplugged Strap", path: "img/library/unplugged-strap.png", poster: "img/library/unplugged-strap.png", kind: "image", character: "fuzz", slot: "outfit" },
        { id: "daily-pick", label: "Daily Pick", path: "img/library/daily-pick.png", poster: "img/library/daily-pick.png", kind: "image", character: "riff", slot: "tool" },
        { id: "notebook-holding", label: "Notebook of Holding", path: "img/library/notebook-holding.png", poster: "img/library/notebook-holding.png", kind: "image", character: "ace", slot: "tool" },
        { id: "first-serve", label: "First Serve", path: "img/library/first-serve.png", poster: "img/library/first-serve.png", kind: "image", character: "ace", slot: "ability" },
        { id: "ace-frog", label: "Frog Serve", path: "img/library/ace-frog.mp4", poster: "img/library/ace-frog.jpg", kind: "video", character: "ace", slot: "content" },
        { id: "riff-bird", label: "Bird Blast", path: "img/library/riff-bird.mp4", poster: "img/library/riff-bird.jpg", kind: "video", character: "riff", slot: "content" },
        { id: "scorch-spider", label: "Web Burn", path: "img/library/scorch-spider.mp4", poster: "img/library/scorch-spider.jpg", kind: "video", character: "scorch", slot: "content" },
        { id: "scorch-spider-beam", label: "Web Burn beam", path: "img/library/scorch-spider-beam.jpg", kind: "image", character: "scorch" },
        { id: "trophy-room", label: "Trophy room", path: "img/library/trophy-room.jpg", kind: "image", character: "crew" },
        { id: "trophy-pedestal", label: "Pedestal", path: "img/library/trophy-pedestal.jpg", kind: "image", character: "crew" },
        { id: "trophy-window", label: "Window wall", path: "img/library/trophy-window.jpg", kind: "image", character: "crew" },
        { id: "trophy-cubbies", label: "Cubbies", path: "img/library/trophy-cubbies.jpg", kind: "image", character: "crew" },
        { id: "trophy-pegboard", label: "Peg wall", path: "img/library/trophy-pegboard.jpg", kind: "image", character: "crew" },
        { id: "trophy-lockers", label: "Lockers", path: "img/library/trophy-lockers.jpg", kind: "image", character: "crew" },
        { id: "tablesloud", label: "Table click", path: "audio/tablesloud.mp3", kind: "audio", character: "fun" },
        { id: "undo-click", label: "Undo", path: "audio/undo.wav", kind: "audio", character: "fun" }
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
    const rawSlot = String(src.slot || "").trim();
    const slot = (GEAR_SLOTS.indexOf(rawSlot) >= 0 || rawSlot === CONTENT_SLOT) ? rawSlot : "";
    const labelFallback = filename || (path || url).split("/").pop() || (synth ? "Sound" : (device ? "Sound" : "Untitled"));
    return {
      id: String(src.id || "").trim() || ("lib-" + (i + 1)),
      label: String(src.label || "").trim() || labelFromFilename(labelFallback),
      path,
      url,
      poster: stripStoredSrc(src.poster),
      kind,
      character,
      slot,
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

  function isDraftLocalItem(item) {
    if (!item) return false;
    if (item.device || item.synth) return true;
    if (item.kind === "audio" || item.kind === "link") return true;
    if (item.url && isSafeHttpUrl(item.url)) return true;
    return !!(item.path || item.url);
  }

  function keepDraftCharacter(ship, mom) {
    const tag = mom && mom.character;
    if (!tag || LIBRARY_GROUPS.indexOf(tag) < 0) return ship.character;
    if (tag === ship.character) return ship.character;
    if (tag === "fun" && ship.character !== "fun") return ship.character;
    if (ship.slot) return ship.character;
    if (/-(clip|poster)$/.test(ship.id)) return ship.character;
    return tag;
  }

  function mergeLibrary(shippedRaw, draftRaw) {
    const shipped = normalizeLibrary(shippedRaw || defaultLibrary());
    const draft = normalizeLibrary(draftRaw || { items: [] });
    const draftById = Object.create(null);
    draft.items.forEach((item) => { draftById[item.id] = item; });
    const seen = Object.create(null);
    const items = [];
    shipped.items.forEach((ship) => {
      const mom = draftById[ship.id];
      if (!mom) {
        items.push(ship);
        seen[ship.id] = true;
        return;
      }
      items.push(normalizeLibraryItem({
        id: ship.id,
        label: mom.label || ship.label,
        path: ship.path,
        url: ship.url,
        poster: ship.poster,
        kind: ship.kind,
        character: keepDraftCharacter(ship, mom),
        slot: ship.slot,
        synth: ship.synth,
        device: false,
        filename: ship.filename,
        mime: ship.mime,
        test: !!ship.test
      }, items.length));
      seen[ship.id] = true;
    });
    draft.items.forEach((mom) => {
      if (seen[mom.id] || !isDraftLocalItem(mom)) return;
      items.push(mom);
      seen[mom.id] = true;
    });
    return normalizeLibrary({ items });
  }

  function shippedLibrary(file) {
    return normalizeLibrary(file || parseSeed("library-seed") || defaultLibrary());
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
    const file = await fetchJson("library.json", null);
    const shipped = shippedLibrary(file);
    const draft = getMomLibrary();
    const lib = mergeLibrary(shipped, draft);
    saveMomLibrary(lib);
    await hydrateLibraryBlobs(lib);
    return lib;
  }

  async function reloadShippedLibrary() {
    return loadLibrary();
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

  function isGatedLibraryItem(item) {
    if (!item) return false;
    return item.kind === "audio" || item.kind === "link" || item.character === "fun" || item.slot === CONTENT_SLOT;
  }

  function contentLibraryItems(lib) {
    return ((lib && lib.items) || []).filter(isGatedLibraryItem);
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
    if (!id || !getGearUnlocks()[id]) return false;
    if (kidViewHidesPreview() && unlockTargetIsPreviewOnly("gear", id)) return false;
    return true;
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
    return Object.keys(map).filter((id) => alreadyUnlockedGear(id)).map((id) => {
      const row = map[id] && typeof map[id] === "object" ? map[id] : { id };
      return {
        type: row.type || "tool",
        id,
        label: row.label || id,
        at: row.at || row
      };
    });
  }

  function gearLibraryItems(lib) {
    return ((lib && lib.items) || []).filter((item) => item && item.slot && GEAR_SLOTS.indexOf(item.slot) >= 0);
  }

  function gearLibraryItem(lib, id) {
    if (!id) return null;
    const item = libraryItem(lib, id);
    return item && item.slot && GEAR_SLOTS.indexOf(item.slot) >= 0 ? item : null;
  }

  function gearThumbHtml(lib, id, cls) {
    const item = libraryItem(lib, id) || gearLibraryItem(lib, id);
    if (!item) return "";
    return libraryThumbHtml(item, cls || "lib-thumb");
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
    if (!id || !getContentUnlocks()[id]) return false;
    if (kidViewHidesPreview() && unlockTargetIsPreviewOnly("content", id)) return false;
    return true;
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
    return Object.keys(map).filter((id) => alreadyUnlockedContent(id)).map((id) => {
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
    if (!isGatedLibraryItem(item)) return true;
    return alreadyUnlockedContent(item.id);
  }

  function attachedLibraryItem(family, lib, key) {
    const id = family && family.story && family.story.attachments && key
      ? family.story.attachments[key]
      : "";
    return id ? libraryItem(lib, id) : null;
  }

  function playSynth(name) {
    if (!audioAllowed()) return false;
    if (name === "honk" || !name) {
      honk();
      return true;
    }
    honk();
    return true;
  }

  let sharedAudioCtx = null;
  let keepAliveOsc = null;
  let activeLibraryAudio = null;
  let activeSource = null;
  let lastLibraryItemId = "";
  let libraryPlayPending = 0;
  const decodedBuffers = Object.create(null);
  const playbackEnded = [];

  function onPlaybackEnded(fn) {
    playbackEnded.push(fn);
  }

  function firePlaybackEnded() {
    const list = playbackEnded.splice(0, playbackEnded.length);
    list.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }

  function getSharedAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) {
      try { sharedAudioCtx = new Ctx(); } catch (_) { return null; }
    }
    if (sharedAudioCtx.state === "suspended") {
      try { sharedAudioCtx.resume(); } catch (_) {}
    }
    if (!keepAliveOsc && sharedAudioCtx) {
      try {
        const osc = sharedAudioCtx.createOscillator();
        const gain = sharedAudioCtx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(sharedAudioCtx.destination);
        osc.start();
        keepAliveOsc = osc;
      } catch (_) {}
    }
    return sharedAudioCtx;
  }

  function decodeAudioBuffer(ctx, raw) {
    try {
      const ret = ctx.decodeAudioData(raw.slice(0));
      if (ret && typeof ret.then === "function") return ret;
    } catch (_) {}
    return new Promise((resolve, reject) => {
      try {
        ctx.decodeAudioData(raw.slice(0), resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  function startBuffer(buf) {
    if (!audioAllowed()) return false;
    const ctx = getSharedAudioContext();
    if (!ctx || !buf) return false;
    stopLibraryAudio();
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      activeSource = src;
      src.onended = () => {
        if (activeSource === src) activeSource = null;
        firePlaybackEnded();
      };
      src.start();
      return true;
    } catch (_) {
      return false;
    }
  }

  function playHtmlAudio(src) {
    if (!audioAllowed()) return false;
    if (!src || src === "#") return false;
    try {
      if (!activeLibraryAudio) activeLibraryAudio = new Audio();
      stopLibraryAudio();
      activeLibraryAudio.src = src;
      activeLibraryAudio.onended = firePlaybackEnded;
      activeLibraryAudio.onerror = firePlaybackEnded;
      const p = activeLibraryAudio.play();
      if (p && p.catch) p.catch(function () { firePlaybackEnded(); });
      return true;
    } catch (_) {
      return false;
    }
  }

  function stopLibraryAudio() {
    if (activeSource) {
      try { activeSource.stop(); } catch (_) {}
      activeSource = null;
    }
    if (!activeLibraryAudio) return;
    try {
      activeLibraryAudio.onended = null;
      activeLibraryAudio.onerror = null;
      activeLibraryAudio.pause();
      activeLibraryAudio.currentTime = 0;
    } catch (_) {}
  }

  function primeLibraryAudio() {
    if (!audioAllowed()) return false;
    getSharedAudioContext();
    if (!activeLibraryAudio) {
      try { activeLibraryAudio = new Audio(); } catch (_) {}
    }
    if (activeLibraryAudio) {
      try {
        activeLibraryAudio.muted = true;
        const p = activeLibraryAudio.play();
        if (p && p.then) {
          p.then(function () {
            try {
              activeLibraryAudio.pause();
              activeLibraryAudio.muted = false;
            } catch (_) {}
          }).catch(function () {
            try { activeLibraryAudio.muted = false; } catch (_) {}
          });
        } else {
          activeLibraryAudio.pause();
          activeLibraryAudio.muted = false;
        }
      } catch (_) {
        try { activeLibraryAudio.muted = false; } catch (_) {}
      }
    }
    return true;
  }

  function waitForLibraryAudio(ms) {
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      onPlaybackEnded(done);
      setTimeout(done, Math.max(400, Number(ms) || 20000));
      const poll = () => {
        if (settled) return;
        if (libraryPlayPending > 0 || activeSource) return;
        if (activeLibraryAudio && !activeLibraryAudio.paused && !activeLibraryAudio.ended) return;
        done();
      };
      setTimeout(poll, 80);
      setTimeout(poll, 500);
      setTimeout(poll, 1500);
    });
  }

  async function blobForLibraryItem(item) {
    if (!item) return null;
    const rec = await getLibraryBlob(item.id);
    if (rec && rec.blob) return rec.blob;
    const src = librarySrc(item);
    if (!src || src === "#") return null;
    try {
      const res = await fetch(src);
      if (res.ok) return await res.blob();
    } catch (_) {}
    return null;
  }

  async function decodeLibraryItem(item) {
    if (!item || item.synth) return null;
    if (decodedBuffers[item.id]) return decodedBuffers[item.id];
    const ctx = getSharedAudioContext();
    if (!ctx) return null;
    const blob = await blobForLibraryItem(item);
    if (!blob) return null;
    try {
      const raw = await blob.arrayBuffer();
      const buf = await decodeAudioBuffer(ctx, raw);
      decodedBuffers[item.id] = buf;
      return buf;
    } catch (_) {
      return null;
    }
  }

  async function playLibraryItemNow(item) {
    libraryPlayPending += 1;
    try {
      const buf = await decodeLibraryItem(item);
      if (buf && startBuffer(buf)) return true;
      let src = librarySrc(item);
      if (!src && item.device) {
        const rec = await getLibraryBlob(item.id);
        if (rec && rec.blob) src = rememberBlobUrl(item.id, rec.blob);
      }
      if (playHtmlAudio(src)) return true;
      firePlaybackEnded();
      return false;
    } catch (_) {
      firePlaybackEnded();
      return false;
    } finally {
      libraryPlayPending -= 1;
    }
  }

  function playLibraryItem(item) {
    if (!audioAllowed()) return false;
    if (!item) return false;
    lastLibraryItemId = item.id || "";
    if (item.synth) {
      stopLibraryAudio();
      return playSynth(item.synth);
    }
    if (item.kind !== "audio") return false;
    const src = librarySrc(item);
    if (!src && !item.device) return false;
    void playLibraryItemNow(item);
    return true;
  }

  function audioLibraryItems(lib) {
    return ((lib && lib.items) || []).filter((item) => item && (item.kind === "audio" || item.synth));
  }

  function pickRandomLibraryItem(lib, exceptId) {
    const all = audioLibraryItems(lib);
    const notExcept = exceptId ? all.filter((item) => item.id !== exceptId) : all;
    const notLast = notExcept.filter((item) => item.id !== lastLibraryItemId);
    const files = notLast.filter((item) => !item.synth);
    const use = files.length ? files : (notLast.length ? notLast : (notExcept.length ? notExcept : all));
    if (!use.length) return null;
    return use[Math.floor(Math.random() * use.length)];
  }

  function playRandomLibraryItem(lib, exceptId) {
    if (!audioAllowed()) return null;
    const pick = pickRandomLibraryItem(lib, exceptId);
    if (!pick) return null;
    playLibraryItem(pick);
    return pick;
  }

  function warmupLibraryAudio(lib, family) {
    if (!audioAllowed()) return;
    getSharedAudioContext();
    const ids = [];
    const cues = family && family.soundCues;
    if (cues) {
      Object.keys(cues).forEach((key) => {
        const id = cues[key];
        if (id && id !== RANDOM_CUE) ids.push(id);
      });
    }
    Object.keys(DEFAULT_SOUND_CUES).forEach((key) => {
      ids.push(DEFAULT_SOUND_CUES[key]);
    });
    const pick = pickRandomLibraryItem(lib);
    if (pick && !pick.synth) ids.push(pick.id);
    ids.forEach((id) => {
      const item = libraryItem(lib, id);
      if (item) decodeLibraryItem(item).catch(function () {});
    });
  }

  function cueStoredId(family, cueId) {
    return family && family.soundCues && cueId ? family.soundCues[cueId] : "";
  }

  function defaultSoundCueId(cueId) {
    return DEFAULT_SOUND_CUES[String(cueId || "")] || "";
  }

  function shippedUndoClick() {
    return normalizeLibraryItem(SHIPPED_UNDO_CLICK, 0);
  }

  function shippedTableClick() {
    return normalizeLibraryItem(SHIPPED_TABLE_CLICK, 0);
  }

  function shippedCueItem(id) {
    if (id === SHIPPED_UNDO_CLICK.id) return shippedUndoClick();
    if (id === SHIPPED_TABLE_CLICK.id) return shippedTableClick();
    return null;
  }

  function resolveCueItemId(family, lib, cueId) {
    const stored = cueStoredId(family, cueId);
    if (stored === RANDOM_CUE) return RANDOM_CUE;
    if (stored && libraryItem(lib, stored)) return stored;
    const fallback = defaultSoundCueId(cueId);
    if (fallback) return fallback;
    return stored || "";
  }

  function resolveCueLibraryItem(family, lib, cueId) {
    const id = resolveCueItemId(family, lib, cueId);
    if (!id || id === RANDOM_CUE) return null;
    return libraryItem(lib, id) || shippedCueItem(id);
  }

  function cueLibraryItem(family, lib, cueId) {
    return resolveCueLibraryItem(family, lib, cueId);
  }

  function cueSoundLabel(family, lib, cueId) {
    const id = resolveCueItemId(family, lib, cueId);
    if (!id) return "";
    if (id === RANDOM_CUE) return "Shuffle — any library clip";
    const item = resolveCueLibraryItem(family, lib, cueId);
    return item ? item.label : "Missing file";
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

  function resolveCuePlay(family, lib, cueId) {
    if (!audioAllowed()) return { played: false, item: null };
    const id = resolveCueItemId(family, lib, cueId);
    if (!id) return { played: false, item: null };
    if (id === RANDOM_CUE) {
      const pick = playRandomLibraryItem(lib);
      return { played: !!pick, item: pick };
    }
    const item = resolveCueLibraryItem(family, lib, cueId);
    return { played: playLibraryItem(item), item: item };
  }

  function playSoundCue(family, lib, cueId) {
    return resolveCuePlay(family, lib, cueId).played;
  }

  function workActionCueIds(workId, kind) {
    const id = String(workId || "").trim();
    if (kind === "done") return { specific: "work-done:" + id, fallback: "work-done" };
    return { specific: "work:" + id, fallback: "work-start" };
  }

  function playWorkActionCue(family, lib, workId, kind) {
    const ids = workActionCueIds(workId, kind);
    if (playSoundCue(family, lib, ids.specific)) return true;
    return playSoundCue(family, lib, ids.fallback);
  }

  function isUndoControl(el) {
    if (!el || typeof el.closest !== "function") return false;
    const btn = el.closest("button, [role='button']");
    if (!btn) return false;
    if (btn.classList && btn.classList.contains("undo-mini")) return true;
    if (btn.getAttribute("data-undo-trophy") || btn.getAttribute("data-revoke")) return true;
    const label = String(btn.getAttribute("aria-label") || btn.textContent || "").replace(/\s+/g, " ").trim();
    return /^undo\b/i.test(label);
  }

  async function playUndoSound() {
    try {
      let family = getFamilyDraft();
      if (!family) {
        try { family = await loadFamily(); } catch (_) { family = null; }
      }
      let library = getMomLibrary();
      if (!library) {
        try { library = await loadLibrary(); } catch (_) { library = defaultLibrary(); }
      }
      if (library) {
        try { await hydrateLibraryBlobs(library); } catch (_) {}
      }
      if (playSoundCue(family, library, "undo")) return true;
      return playLibraryItem((library && libraryItem(library, SHIPPED_UNDO_CLICK.id)) || shippedUndoClick());
    } catch (_) {
      try {
        return playLibraryItem(shippedUndoClick());
      } catch (__) {
        return false;
      }
    }
  }

  function bindUndoCue() {
    if (!global.document || !document.addEventListener || document.documentElement.getAttribute("data-undo-cue") === "on") return;
    document.documentElement.setAttribute("data-undo-cue", "on");
    document.addEventListener("click", (e) => {
      if (!isUndoControl(e.target)) return;
      playUndoSound();
    }, true);
  }

  function audioCueOptions(lib, selected) {
    const items = audioLibraryItems(lib).slice().sort((a, b) =>
      String(a.label || "").localeCompare(String(b.label || ""), undefined, { sensitivity: "base" })
    );
    const shuffleOn = selected === RANDOM_CUE ? " selected" : "";
    const opts = [
      '<option value="">None</option>',
      `<option value="${esc(RANDOM_CUE)}"${shuffleOn}>Shuffle — any library clip</option>`
    ].concat(items.map((item) => {
      const on = item.id === selected ? " selected" : "";
      return `<option value="${esc(item.id)}"${on}>${esc(item.label)}</option>`;
    }));
    return opts.join("");
  }

  function soundCueRows(week) {
    const rows = SOUND_CUES.slice();
    ((week && week.work) || []).forEach((w) => {
      if (w && w.id) {
        rows.push({ id: "work:" + w.id, label: "I started this · " + w.title });
        rows.push({ id: "work-done:" + w.id, label: "Done · " + w.title });
      }
    });
    ((week && week.events) || []).forEach((e) => {
      if (e && e.id) rows.push({ id: "event:" + e.id, label: "Event · " + e.title });
    });
    return rows;
  }

  function assignedCueRows(family, week) {
    const stored = (family && family.soundCues) || {};
    const cues = Object.assign({}, DEFAULT_SOUND_CUES, stored);
    const labels = {};
    soundCueRows(week).forEach((row) => {
      labels[row.id] = row.label;
    });
    return Object.keys(cues).filter((id) => cues[id]).map((id) => ({
      id,
      label: labels[id] || id,
      soundId: cues[id]
    })).sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base" }));
  }

  function bindSoundCues(opts) {
    const host = typeof opts.host === "string" ? document.getElementById(opts.host) : opts.host;
    if (!host) return;
    let family = opts.family;
    const library = opts.library;
    const week = opts.week || { work: [], events: [] };
    const onFamily = opts.onFamily || function () {};
    const draft = document.getElementById(opts.draftFlag || "draft-flag");

    function persist(next, message) {
      family = next;
      onFamily(family);
      if (draft) draft.hidden = false;
      render();
      if (message) toast(message);
    }

    function filterCueRows(rows) {
      const only = opts.only;
      const except = opts.except;
      return rows.filter((row) => {
        if (only && only.length && only.indexOf(row.id) < 0) return false;
        if (except && except.length && except.indexOf(row.id) >= 0) return false;
        return true;
      });
    }

    function render() {
      const catalog = filterCueRows(soundCueRows(week));
      const assigned = filterCueRows(assignedCueRows(family, week));
      const taken = new Set(assigned.map((row) => row.id));
      const open = catalog.filter((row) => !taken.has(row.id));
      const savedHtml = assigned.length
        ? assigned.map((row) => `
            <article class="cue-row">
              <h3>${esc(row.label)}</h3>
              <label>Sound
                <select data-cue-change="${esc(row.id)}">${audioCueOptions(library, row.soundId)}</select>
              </label>
              <div class="parent-actions">
                <button type="button" class="tiny primary" data-cue-play="${esc(row.id)}">Play</button>
                <button type="button" class="tiny danger" data-cue-clear="${esc(row.id)}">Delete</button>
              </div>
            </article>`)
          .join("")
        : `<p class="empty">None saved yet. Pick a moment and a clip, then Save.</p>`;
      const addHtml = open.length
        ? `
          <h3 class="cue-add-title">Add a sound</h3>
          <div class="form-grid cue-assign">
            <label>Moment
              <select data-cue-event>${open.map((row) => `<option value="${esc(row.id)}">${esc(row.label)}</option>`).join("")}</select>
            </label>
            <label>Sound
              <select data-cue-sound>${audioCueOptions(library, "")}</select>
            </label>
          </div>
          <div class="parent-actions">
            <button type="button" class="btn primary" data-cue-save>Save</button>
            <button type="button" class="tiny" data-cue-preview>Play</button>
          </div>`
        : `<p class="empty">Every listed moment has a sound. Change or delete one above to add another.</p>`;
      host.innerHTML = `
        <h3 class="cue-saved-title">Saved sounds</h3>
        <div class="cue-list">${savedHtml}</div>
        ${addHtml}`;
      const eventSel = host.querySelector("[data-cue-event]");
      const soundSel = host.querySelector("[data-cue-sound]");
      const saveBtn = host.querySelector("[data-cue-save]");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          const momentId = eventSel && eventSel.value;
          const soundId = soundSel && soundSel.value;
          if (!momentId) {
            toast("Pick a moment first.");
            return;
          }
          if (!soundId) {
            toast("Pick a sound first.");
            return;
          }
          persist(setSoundCue(family, momentId, soundId), "Saved on this device. Export the family pack to share.");
        });
      }
      const preview = host.querySelector("[data-cue-preview]");
      if (preview) {
        preview.addEventListener("click", () => {
          const id = soundSel && soundSel.value;
          if (id === RANDOM_CUE) {
            if (!playRandomLibraryItem(library)) toast("No clips in the library.");
            return;
          }
          const item = libraryItem(library, id);
          if (!item) {
            toast("Pick a sound first.");
            return;
          }
          playLibraryItem(item);
        });
      }
      host.querySelectorAll("[data-cue-change]").forEach((sel) => {
        sel.addEventListener("change", () => {
          const id = sel.dataset.cueChange;
          const next = setSoundCue(family, id, sel.value);
          persist(next, sel.value ? "Sound updated." : "Deleted.");
        });
      });
      host.querySelectorAll("[data-cue-play]").forEach((b) => {
        b.addEventListener("click", () => {
          if (!playSoundCue(family, library, b.dataset.cuePlay)) toast("That clip is missing.");
        });
      });
      host.querySelectorAll("[data-cue-clear]").forEach((b) => {
        b.addEventListener("click", () => {
          persist(setSoundCue(family, b.dataset.cueClear, ""), "Deleted.");
        });
      });
    }
    render();
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
    if ((item.kind === "audio" || item.synth) && !audioAllowed()) return false;
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

  function emptyBasecamp() {
    return { sessions: [] };
  }

  function normalizeBasecampMessage(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = String(raw.text || "").trim();
    const imageId = String(raw.imageId || "").trim();
    if (!text && !imageId) return null;
    const row = {
      role: raw.role === "mentor" ? "mentor" : "bennett",
      text: text,
      at: raw.at || nowIso()
    };
    if (imageId) row.imageId = imageId;
    if (raw.test) row.test = true;
    return row;
  }

  function normalizeBasecampSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const messages = Array.isArray(raw.messages)
      ? raw.messages.map(normalizeBasecampMessage).filter(Boolean)
      : [];
    const row = {
      id: String(raw.id || uid("bc")),
      classId: String(raw.classId || "").trim(),
      title: String(raw.title || "").trim() || "New climb",
      messages: messages,
      created: raw.created || nowIso(),
      updated: raw.updated || raw.created || nowIso(),
      pinned: !!raw.pinned
    };
    const pinnedAt = String(raw.pinnedAt || "").trim();
    if (row.pinned && pinnedAt) row.pinnedAt = pinnedAt;
    return row;
  }

  function normalizeBasecamp(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const sessions = Array.isArray(src.sessions)
      ? src.sessions.map(normalizeBasecampSession).filter(Boolean)
      : [];
    return { sessions: sessions };
  }

  function getBasecamp(family) {
    return normalizeBasecamp(family && family.basecamp);
  }

  function basecampSessionsForClass(family, classId) {
    const want = String(classId || "").trim();
    return getBasecamp(family).sessions
      .filter((s) => s && s.classId === want)
      .slice()
      .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));
  }

  function pinStamp(session) {
    return String((session && (session.pinnedAt || session.updated)) || "");
  }

  function basecampPinnedForClass(family, classId) {
    return basecampSessionsForClass(family, classId)
      .filter((s) => s && s.pinned)
      .sort((a, b) => pinStamp(b).localeCompare(pinStamp(a)));
  }

  function basecampSavedForClass(family, classId) {
    return basecampSessionsForClass(family, classId).filter((s) => s && !s.pinned);
  }

  function setBasecampPinned(family, sessionId, pinned) {
    const cur = basecampSession(family, sessionId);
    if (!cur) return { family: normalizeFamily(family), session: null };
    const nextSession = Object.assign({}, cur, { pinned: !!pinned });
    if (pinned) nextSession.pinnedAt = nowIso();
    else delete nextSession.pinnedAt;
    return upsertBasecampSession(family, nextSession);
  }

  function basecampSession(family, sessionId) {
    const id = String(sessionId || "");
    return getBasecamp(family).sessions.find((s) => s && s.id === id) || null;
  }

  function persistBasecamp(family, basecamp) {
    const next = normalizeFamily(family);
    next.basecamp = normalizeBasecamp(basecamp);
    saveFamily(next);
    return next;
  }

  function upsertBasecampSession(family, session) {
    const row = normalizeBasecampSession(session);
    if (!row) return normalizeFamily(family);
    const next = normalizeFamily(family);
    const list = next.basecamp.sessions.slice();
    const idx = list.findIndex((s) => s.id === row.id);
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    next.basecamp = { sessions: list };
    saveFamily(next);
    return { family: next, session: row };
  }

  function createBasecampSession(family, classId, title) {
    const now = nowIso();
    return upsertBasecampSession(family, {
      id: uid("bc"),
      classId: String(classId || "").trim(),
      title: String(title || "").trim() || "New climb",
      messages: [],
      pinned: false,
      created: now,
      updated: now
    });
  }

  function addBasecampMessage(family, sessionId, msg) {
    const cur = basecampSession(family, sessionId);
    if (!cur) return { family: normalizeFamily(family), session: null };
    const row = normalizeBasecampMessage(Object.assign({ at: nowIso() }, msg || {}));
    if (!row) return { family: normalizeFamily(family), session: cur };
    const nextSession = Object.assign({}, cur, {
      messages: cur.messages.concat([row]),
      updated: row.at
    });
    if (nextSession.title === "New climb" && row.role === "bennett" && row.text) {
      nextSession.title = row.text.slice(0, 48);
    }
    return upsertBasecampSession(family, nextSession);
  }

  function basecampImageIds(family) {
    const ids = [];
    const seen = Object.create(null);
    getBasecamp(family).sessions.forEach((s) => {
      (s.messages || []).forEach((m) => {
        const id = m && m.imageId;
        if (!id || seen[id]) return;
        seen[id] = true;
        ids.push(id);
      });
    });
    return ids;
  }

  async function collectBasecampBlobs(family) {
    const blobs = {};
    const skipped = [];
    const ids = basecampImageIds(family);
    for (let i = 0; i < ids.length; i += 1) {
      const id = ids[i];
      try {
        const rec = await getLibraryBlob(id);
        if (!rec || !rec.blob) {
          skipped.push(id);
          continue;
        }
        if ((rec.blob.size || 0) > PACK_BLOB_MAX) {
          skipped.push(id);
          continue;
        }
        blobs[id] = {
          mime: rec.mime || rec.blob.type || "",
          name: rec.name || "",
          data: await blobToBase64(rec.blob)
        };
      } catch (_) {
        skipped.push(id);
      }
    }
    return { blobs: blobs, skipped: skipped };
  }

  async function hydrateImageId(id) {
    if (!id) return "";
    if (blobUrlCache[id]) return blobUrlCache[id];
    const rec = await getLibraryBlob(id);
    if (rec && rec.blob) return rememberBlobUrl(id, rec.blob);
    return "";
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

  function classIdForWork(work) {
    if (work && work.classId) return String(work.classId);
    return classIdForTitle(work && work.title);
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
    if (id === "sociology") return ["sociology"];
    return [];
  }

  function khanLinksByIds(ids) {
    const want = new Set(normalizeKhanIds(ids));
    return KHAN.filter((k) => want.has(k.id));
  }

  function khanLinksForClass(cls) {
    return khanLinksByIds(khanIdsForClass(cls));
  }

  function khanLinksForRoster() {
    const ids = [];
    const seen = new Set();
    KHAN_ROSTER_CLASS_IDS.forEach((id) => {
      khanIdsForClass({ id }).forEach((khanId) => {
        if (!seen.has(khanId)) {
          seen.add(khanId);
          ids.push(khanId);
        }
      });
    });
    return khanLinksByIds(ids);
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
    if (/sociolog/.test(t)) {
      return KHAN.filter((k) => k.id === "sociology");
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

  function khanStripHtml() {
    return khanStripFromLinks(khanLinksForRoster());
  }

  function khanStripHtmlForClass() {
    return khanStripFromLinks(khanLinksForRoster());
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
      return classIdForWork(w) === (cls && cls.id);
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
    const name = characterLabel(unlockedChar, unlockedChar && unlockedChar.id === "bennett" ? "Bennett" : "New teammate");
    const kicker = unlockedChar && unlockedChar.id === "bennett" ? "You're in" : "New teammate";
    let layer = document.getElementById("char-celebrate");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "char-celebrate";
      layer.className = "char-celebrate";
      document.body.appendChild(layer);
    }
    layer.innerHTML = `
      <div class="char-celebrate-panel" role="dialog" aria-labelledby="char-celebrate-title">
        <p class="char-celebrate-kicker">${kicker}</p>
        <h2 id="char-celebrate-title">${esc(name)} unlocked!</h2>
        <video src="${esc(media.video)}" poster="${esc(media.poster)}" playsinline ${prefersReducedMotion() ? "" : "autoplay"} controls></video>
        <button type="button" class="btn primary" id="char-celebrate-close">Nice</button>
      </div>`;
    layer.classList.add("open");
    const close = () => closeCharacterCelebrate();
    const closeBtn = document.getElementById("char-celebrate-close");
    if (closeBtn && closeBtn.addEventListener) closeBtn.addEventListener("click", close);
    layer.onclick = (e) => {
      if (e.target === layer) close();
    };
    if (unlockedChar && unlockedChar.id) markCharacterSeen(unlockedChar.id);
    if (unlockedChar && unlockedChar.id === "bennett") markSignInSeen();
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
    migrateCleanSlate();
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
    return { timezone: "America/Chicago", term: Object.assign({}, DEFAULT_TERM), classes: [], sampleOpens: [], eggNames: EGG_NAMES };
  }

  function normalizeProgressSeed(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    return {
      timezone: p.timezone || "America/Chicago",
      gradesNote: p.gradesNote || "",
      term: termOf(p),
      classes: Array.isArray(p.classes) ? p.classes : [],
      sampleOpens: Array.isArray(p.sampleOpens) ? p.sampleOpens : [],
      eggNames: p.eggNames && typeof p.eggNames === "object" ? Object.assign({}, EGG_NAMES, p.eggNames) : Object.assign({}, EGG_NAMES)
    };
  }

  async function loadProgress() {
    migrateCleanSlate();
    const seed = normalizeProgressSeed(parseSeed("progress-seed") || emptyProgressSeed());
    const file = await fetchJson("progress.json", null);
    return normalizeProgressSeed(file || seed);
  }

  async function loadTerms() {
    const fallback = { current: DEFAULT_TERM.id, terms: [Object.assign({}, DEFAULT_TERM)] };
    const file = await fetchJson("data/terms.json", null);
    if (!file || typeof file !== "object") return fallback;
    const terms = Array.isArray(file.terms)
      ? file.terms.filter((t) => t && t.id).map((t) => ({
        id: String(t.id),
        label: String(t.label || t.id),
        grade: String(t.grade || ""),
        start: t.start ? String(t.start) : "",
        end: t.end ? String(t.end) : ""
      }))
      : [Object.assign({}, DEFAULT_TERM)];
    const current = String(file.current || (terms[0] && terms[0].id) || DEFAULT_TERM.id);
    return { current, terms };
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
    if (kind === "started" && !before.started) track("work_start", { assignmentId: id });
    if (kind === "done" && !before.done) track("work_done", { assignmentId: id });
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
    track("help_open", { assignmentId: id });
    return workState(id);
  }

  function helpOpens(id) {
    const cur = getProgress()[id] || {};
    return Array.isArray(cur.helpOpened) ? cur.helpOpened : [];
  }

  function alreadyUnlocked(id) {
    if (!id || !getUnlocks()[id]) return false;
    if (kidViewHidesPreview() && achievementIsPreviewOnly(id)) return false;
    return true;
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

  function awardStreak(pack, family, id, opts) {
    const preview = !!(opts && opts.preview);
    const force = !!(opts && opts.force);
    let ach = awardAchievement(pack, id);
    if (!ach && force) {
      ach = ((pack && pack.achievements) || []).find((row) => row && row.id === id) || null;
      if (ach && !getUnlocks()[id]) markUnlocked(id);
    }
    if (!ach) {
      return {
        family: normalizeFamily(family),
        achievement: null,
        grantedCharacter: "",
        grantedUnlock: null,
        freshCharacter: false,
        freshGear: false,
        freshContent: false
      };
    }
    const next = normalizeFamily(family);
    const st = next.streaks[id] || { count: 0 };
    const unlock = rewardUnlockOf(ach) || (st.grantedUnlock && typeof st.grantedUnlock === "object" ? st.grantedUnlock : null);
    const granted = (unlock && unlock.type === "character" && unlock.id) || st.grantedCharacter || "";
    next.streaks[id] = Object.assign({}, st, {
      awarded: true,
      awardedAt: st.awardedAt || nowIso(),
      grantedCharacter: granted || undefined,
      grantedUnlock: unlock || undefined,
      rewardMedia: (ach && ach.rewardMedia) || st.rewardMedia || undefined,
      preview: !!preview
    });
    if (preview) addPreviewIds([id]);
    else removePreviewIds([id]);
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
    saveFamily(next);
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
      write(KEYS.bananas, Math.max(0, storedBananas() - bananasOf(ach)));
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

  function normalizeSiteView(value) {
    const raw = String(value || "").trim().toLowerCase();
    return SITE_VIEWS.indexOf(raw) >= 0 ? raw : "me";
  }

  function siteViewFromRole(role) {
    const raw = String(role || "").trim().toLowerCase();
    if (raw === "bennett") return "bennett";
    if (raw === "parent") return "mom";
    return "me";
  }

  function telemetryDeviceRole() {
    let stored = null;
    try { stored = localStorage.getItem("bw-telemetry"); } catch (_) {}
    if (!stored) return "";
    try {
      if (global.Telemetry && typeof global.Telemetry.getConfig === "function") {
        const cfg = global.Telemetry.getConfig();
        if (cfg && cfg.role) return String(cfg.role);
      }
    } catch (_) {}
    try {
      const raw = JSON.parse(stored);
      if (raw && typeof raw === "object" && raw.role) return String(raw.role);
    } catch (_) {}
    return "";
  }

  function siteView() {
    try {
      const stored = localStorage.getItem(KEYS.siteView);
      if (stored != null && String(stored).trim() !== "") {
        return normalizeSiteView(stored);
      }
    } catch (_) {}
    return siteViewFromRole(telemetryDeviceRole());
  }

  function audioAllowed() {
    return siteView() !== "mom";
  }

  function siteViewHidesAdult(view) {
    const v = normalizeSiteView(view || siteView());
    return v === "bennett" || v === "mom";
  }

  function pageFile() {
    try {
      const path = String(((global.location || {}).pathname || "")).split("/").pop() || "";
      return path || "index.html";
    } catch (_) {
      return "index.html";
    }
  }

  function isAdultDeskPage(file) {
    const name = String(file || pageFile()).toLowerCase();
    return name === "admin.html" || name === "parent.html" || name === "refs.html" || name === "mom.html";
  }

  function shouldGateAdultPage(file, view) {
    return siteViewHidesAdult(view) && isAdultDeskPage(file);
  }

  function siteViewControlHtml(view) {
    const v = normalizeSiteView(view || siteView());
    const btn = (id, label) => {
      const on = v === id;
      return `<button type="button" class="site-view-btn${on ? " on" : ""}" data-site-view="${id}" aria-pressed="${on ? "true" : "false"}">${label}</button>`;
    };
    return `<span class="site-view-kicker">Preview</span><div class="site-view-seg">${btn("me", "Me")}${btn("bennett", "Bennett")}${btn("mom", "Mom")}</div>`;
  }

  function onSiteViewClick(e) {
    const btn = e.target && e.target.closest ? e.target.closest("[data-site-view]") : null;
    if (!btn) return;
    const next = btn.getAttribute("data-site-view");
    if (!next || next === siteView()) return;
    setSiteView(next);
  }

  function mountSiteViewControl() {
    if (!document.querySelectorAll) return null;
    const navs = document.querySelectorAll(".hud-nav");
    if (!navs || !navs.length) return null;
    // Device role, not the current preview view — Orin must keep the switch on his laptop.
    const hideSwitch = siteViewFromRole(telemetryDeviceRole()) === "bennett";
    let last = null;
    Array.from(navs).forEach((nav) => {
      let box = nav.querySelector ? nav.querySelector(".site-view") : null;
      if (hideSwitch) {
        if (box) {
          box.innerHTML = "";
          if (nav.removeChild) {
            try { nav.removeChild(box); } catch (_) {}
          } else if (box.parentNode && box.parentNode.removeChild) {
            try { box.parentNode.removeChild(box); } catch (_) {}
          }
        }
        return;
      }
      if (!box) {
        box = document.createElement("div");
        box.className = "site-view";
        box.setAttribute("role", "group");
        box.setAttribute("aria-label", "Preview as");
        if (nav.appendChild) nav.appendChild(box);
        if (box.addEventListener) box.addEventListener("click", onSiteViewClick);
      }
      box.innerHTML = siteViewControlHtml();
      last = box;
    });
    return last;
  }

  function hideAdultShortcuts(hide) {
    if (!document.querySelectorAll) return;
    const nodes = document.querySelectorAll(".admin-chip, .parent-chip, .refs-chip, a[href='admin.html'], a[href='parent.html'], a[href='refs.html'], a[href='mom.html']");
    Array.from(nodes || []).forEach((el) => {
      if (!el) return;
      if (el.closest && el.closest(".site-view-gate")) return;
      el.hidden = !!hide;
    });
  }

  function gateAdultPage() {
    if (!document.body) return false;
    const hide = shouldGateAdultPage();
    const existing = document.getElementById ? document.getElementById("site-view-gate") : null;
    if (!hide) {
      if (existing) existing.hidden = true;
      if (document.body.classList && document.body.classList.remove) {
        document.body.classList.remove("site-view-gated");
      }
      return false;
    }
    if (document.body.classList && document.body.classList.add) {
      document.body.classList.add("site-view-gated");
    }
    const who = siteView() === "mom" ? "Mom" : "Bennett";
    const html = `<p>${esc(who)} view — <a href="index.html">back to This Week</a></p>`;
    let gate = existing;
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "site-view-gate";
      gate.className = "site-view-gate";
      const header = document.querySelector ? document.querySelector(".week-head") : null;
      if (header && header.parentNode && header.parentNode.insertBefore) {
        header.parentNode.insertBefore(gate, header.nextSibling);
      } else if (document.body.appendChild) {
        document.body.appendChild(gate);
      }
    }
    gate.innerHTML = html;
    gate.hidden = false;
    return true;
  }

  function applySiteView() {
    const view = siteView();
    const hideAdult = siteViewHidesAdult(view);
    if (document.documentElement && document.documentElement.setAttribute) {
      document.documentElement.setAttribute("data-site-view", view);
    }
    if (document.body && document.body.classList) {
      if (document.body.classList.toggle) {
        document.body.classList.toggle("site-view-kid", hideAdult);
        document.body.classList.toggle("site-view-mom", view === "mom");
        document.body.classList.toggle("site-view-bennett", view === "bennett");
        document.body.classList.toggle("site-view-me", view === "me");
      } else {
        if (document.body.classList.add && document.body.classList.remove) {
          ["site-view-kid", "site-view-mom", "site-view-bennett", "site-view-me"].forEach((name) => {
            document.body.classList.remove(name);
          });
          document.body.classList.add("site-view-" + view);
          if (hideAdult) document.body.classList.add("site-view-kid");
        }
      }
    }
    mountSiteViewControl();
    mountMessagesChip();
    mountBaseCampChip();
    hideAdultShortcuts(hideAdult);
    hideMessagesChip(view);
    bounceMessagesIfKid();
    gateAdultPage();
    paintMessagesChip();
    notifySiteView(view);
    return view;
  }

  function notifySiteView(view) {
    try {
      if (!document || typeof document.dispatchEvent !== "function") return;
      const ev = typeof CustomEvent === "function"
        ? new CustomEvent("bw-site-view", { detail: { view: view } })
        : null;
      if (ev) document.dispatchEvent(ev);
    } catch (_) {}
  }

  function setSiteView(next) {
    const view = normalizeSiteView(next);
    try { localStorage.setItem(KEYS.siteView, view); } catch (_) {}
    applySiteView();
    return view;
  }

  function honk() {
    if (!audioAllowed()) return false;
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return false;
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
      return true;
    } catch (_) {
      return false;
    }
  }

  function celebrate(ach, pack) {
    const unlock = rewardUnlockOf(ach);
    const bennettWelcome = !!(ach && (
      ach.id === SIGNIN_ACHIEVEMENT
      || ach.rewardCharacter === "bennett"
      || (unlock && unlock.type === "character" && unlock.id === "bennett")
    ));
    if (siteViewHidesAdult() && bennettWelcome && !hasSignInSeen()) {
      playUnlockClip(null, {
        id: "bennett",
        name: "Bennett",
        video: "img/characters/bennett.mp4",
        poster: "img/characters/bennett.jpg"
      });
      return;
    }
    const cur = currency(pack);
    const prize = ach.incentive ? " · " + ach.incentive : "";
    const extra = bananasOf(ach) ? " · +" + bananasOf(ach) + " " + cur.name : "";
    const game = ach.unlocksGame === "egg" ? " · Egg game unlocked" : "";
    const mate = unlock && unlock.type === "character"
      ? (unlock.id === "bennett" ? " · Bennett unlocked" : " · teammate unlocked")
      : "";
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

  function signInAchievement(pack) {
    const found = ((pack && pack.achievements) || []).find((ach) => ach && ach.id === SIGNIN_ACHIEVEMENT);
    if (found) return found;
    return {
      id: SIGNIN_ACHIEVEMENT,
      title: "Signed in",
      description: "Opened Jungle Jam.",
      incentive: "Unlocks Bennett",
      reward: 10,
      rewardCharacter: "bennett",
      rewardUnlock: { type: "character", id: "bennett", label: "Bennett" },
      streak: { target: 1, unit: "time" }
    };
  }

  function hasSignInSeen() {
    try {
      const raw = localStorage.getItem(KEYS.signinSeen);
      return raw === "1" || raw === "true";
    } catch (_) {
      return false;
    }
  }

  function markSignInSeen() {
    try {
      localStorage.setItem(KEYS.signinSeen, "1");
    } catch (_) {}
  }

  function maybeAwardSignIn(pack, family) {
    const next = normalizeFamily(family);
    const st = next.streaks[SIGNIN_ACHIEVEMENT];
    if (st && st.awarded === false && st.awardedAt) {
      return { family: next, awarded: false, freshCharacter: false, achievement: null };
    }
    const kidWelcome = siteViewHidesAdult() || siteViewFromRole(telemetryDeviceRole()) === "bennett";
    if (!kidWelcome) {
      if (alreadyUnlocked(SIGNIN_ACHIEVEMENT) || alreadyUnlockedCharacter("bennett")) {
        return { family: next, awarded: false, freshCharacter: false, achievement: null };
      }
    } else {
      const earnedSignin = !!(getUnlocks()[SIGNIN_ACHIEVEMENT] && !achievementIsPreviewOnly(SIGNIN_ACHIEVEMENT));
      const earnedBennett = !!(getCharacterUnlocks().bennett && !unlockTargetIsPreviewOnly("character", "bennett"));
      if (earnedSignin && earnedBennett && hasSignInSeen()) {
        return { family: next, awarded: false, freshCharacter: false, achievement: null };
      }
      if (earnedSignin && earnedBennett) {
        return { family: next, awarded: true, freshCharacter: false, achievement: signInAchievement(pack) };
      }
    }
    const working = Object.assign({}, pack || {}, {
      achievements: ((pack && pack.achievements) || []).concat(
        ((pack && pack.achievements) || []).some((ach) => ach && ach.id === SIGNIN_ACHIEVEMENT)
          ? []
          : [signInAchievement(pack)]
      )
    });
    const result = awardStreak(working, next, SIGNIN_ACHIEVEMENT, { preview: false, force: kidWelcome });
    return {
      family: result.family,
      awarded: !!result.achievement,
      freshCharacter: result.freshCharacter,
      achievement: result.achievement
    };
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
    const row = Object.assign({}, note);
    if (!row.id) row.id = uid("n");
    if (!row.at) row.at = nowIso();
    next.notes = next.notes.concat([row]);
    saveFamily(next);
    track(row.kind === "question" ? "ask_parent" : "work_note", {
      assignmentId: row.targetId || "",
      classId: row.classId || "",
      termId: row.termId || ""
    });
    queueNotePush(next);
    return next;
  }

  function noteTargetKey(n) {
    return String((n && n.targetType) || "") + ":" + String((n && n.targetId) || "");
  }

  function isBennettAsk(n) {
    return !!(n && n.from === "bennett" && n.kind !== "note" && String(n.text || "").trim());
  }

  function isParentReply(n) {
    return !!(n && n.from === "parent" && (n.kind === "reply" || n.replyTo) && String(n.text || "").trim());
  }

  function parentRepliesForAsk(family, ask) {
    const notes = (family && family.notes) || [];
    if (!ask) return [];
    const byId = notes.filter((n) => isParentReply(n) && n.replyTo === ask.id);
    if (byId.length) return byId;
    return notes.filter((n) => {
      return isParentReply(n) && noteTargetKey(n) === noteTargetKey(ask);
    });
  }

  function askHasParentReply(family, ask) {
    return parentRepliesForAsk(family, ask).length > 0;
  }

  function bennettAsks(family) {
    return ((family && family.notes) || []).filter(isBennettAsk);
  }

  function unansweredBennettAsks(family) {
    return bennettAsks(family).filter((ask) => !askHasParentReply(family, ask));
  }

  function unansweredAskCount(family) {
    return unansweredBennettAsks(family).length;
  }

  function sortNotesNewest(list) {
    return (list || []).slice().sort((a, b) => String((b && b.at) || "").localeCompare(String((a && a.at) || "")));
  }

  function noteTargetLabel(week, targetType, targetId) {
    if (targetType === "work") {
      const w = ((week && week.work) || []).find((x) => x && x.id === targetId);
      return w ? w.title : targetId;
    }
    const e = ((week && week.events) || []).find((x) => x && x.id === targetId);
    return e ? e.title : targetId;
  }

  function noteTargetWhen(week, note) {
    if (!note) return "";
    if (note.targetType === "event") {
      const e = ((week && week.events) || []).find((x) => x && x.id === note.targetId);
      return (e && (e.start || e.date)) || "";
    }
    const w = ((week && week.work) || []).find((x) => x && x.id === note.targetId);
    return (w && (w.due || w.suggest_from)) || "";
  }

  function noteDayLabel(week, note) {
    const when = noteTargetWhen(week, note);
    if (!when) return "";
    const d = parseStamp(when) || new Date(when);
    if (!d || Number.isNaN(d.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        weekday: "long",
        month: "numeric",
        day: "numeric"
      }).format(d);
    } catch (_) {
      return chicagoYmd(d);
    }
  }

  function mergeNotesById(local, remote) {
    const map = Object.create(null);
    const put = (n) => {
      if (!n || !n.id) return;
      const cur = map[n.id];
      if (!cur) {
        map[n.id] = n;
        return;
      }
      if (String(n.at || "") > String(cur.at || "")) map[n.id] = Object.assign({}, cur, n);
    };
    (local || []).forEach(put);
    (remote || []).forEach(put);
    return Object.keys(map).map((id) => map[id]);
  }

  function notesNewerThan(local, remote) {
    const remoteMap = Object.create(null);
    (remote || []).forEach((n) => {
      if (n && n.id) remoteMap[n.id] = n;
    });
    return (local || []).filter((n) => {
      if (!n || !n.id) return false;
      const other = remoteMap[n.id];
      if (!other) return true;
      return String(n.at || "") > String(other.at || "");
    });
  }

  let notePushTimer = null;

  function queueNotePush(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.connected !== "function" || !tel.connected()) return;
    if (typeof setTimeout !== "function") {
      pushFamilyNotes(family);
      return;
    }
    if (notePushTimer) clearTimeout(notePushTimer);
    notePushTimer = setTimeout(() => {
      notePushTimer = null;
      pushFamilyNotes(family);
    }, 400);
  }

  async function pushFamilyNotes(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.upsertNotes !== "function" || !tel.connected()) return { pushed: 0, missing: false };
    const notes = ((family && family.notes) || []).filter((n) => n && n.id);
    if (!notes.length) return { pushed: 0, missing: false };
    try {
      await tel.upsertNotes(notes);
      return { pushed: notes.length, missing: false };
    } catch (err) {
      const missing = !!(err && (err.status === 404 || err.status === 406));
      return { pushed: 0, missing };
    }
  }

  async function pullFamilyNotes() {
    const tel = global.Telemetry;
    if (!tel || typeof tel.fetchNotes !== "function" || !tel.connected()) {
      return { notes: [], missing: false, offline: !tel || !tel.connected() };
    }
    try {
      const rows = await tel.fetchNotes();
      const notes = (Array.isArray(rows) ? rows : []).map((row) => tel.rowToNote ? tel.rowToNote(row) : row).filter((n) => n && n.id);
      return { notes, missing: false, offline: false };
    } catch (err) {
      const missing = !!(err && (err.status === 404 || err.status === 406));
      return { notes: [], missing, offline: false };
    }
  }

  async function syncFamilyNotes(family) {
    const next = normalizeFamily(family);
    const tel = global.Telemetry;
    if (!tel || typeof tel.connected !== "function" || !tel.connected()) {
      return { family: next, pulled: 0, pushed: 0, missing: false, offline: true };
    }
    const pulled = await pullFamilyNotes();
    if (pulled.missing) {
      return { family: next, pulled: 0, pushed: 0, missing: true, offline: false };
    }
    const merged = mergeNotesById(next.notes, pulled.notes);
    const toPush = notesNewerThan(merged, pulled.notes);
    let pushed = 0;
    if (toPush.length && typeof tel.upsertNotes === "function") {
      try {
        await tel.upsertNotes(toPush);
        pushed = toPush.length;
      } catch (err) {
        if (err && (err.status === 404 || err.status === 406)) {
          next.notes = merged;
          saveFamily(next);
          return { family: next, pulled: pulled.notes.length, pushed: 0, missing: true, offline: false };
        }
      }
    }
    next.notes = merged;
    saveFamily(next);
    return { family: next, pulled: pulled.notes.length, pushed, missing: false, offline: false };
  }

  function sendParentReply(family, askId, text) {
    const next = normalizeFamily(family);
    const q = (next.notes || []).find((n) => n && n.id === askId);
    const body = String(text || "").trim();
    if (!q || !body) return next;
    return addNote(next, {
      id: uid("note"),
      targetType: q.targetType,
      targetId: q.targetId,
      from: "parent",
      kind: "reply",
      replyTo: q.id,
      text: body,
      at: nowIso(),
      classId: q.classId,
      termId: q.termId
    });
  }

  function messagesInboxHtml(family, week, opts) {
    const o = opts || {};
    const asks = sortNotesNewest(bennettAsks(family));
    const open = asks.filter((ask) => !askHasParentReply(family, ask));
    const done = asks.filter((ask) => askHasParentReply(family, ask));
    if (!asks.length) {
      const hint = o.missingTable
        ? "Asks still save on this device. The cloud table is not set up yet."
        : (o.offline
          ? "Asks stay on this phone until Admin → Connect. Then Mom, Dad, and this laptop share them."
          : "When he taps Ask on a week card, it shows up here on every connected phone.");
      return `<div class="messages-empty">
        <p class="empty">No asks from Bennett yet.</p>
        <p class="messages-empty-hint">${esc(hint)}</p>
      </div>`;
    }
    const card = (ask, unanswered) => {
      const title = noteTargetLabel(week, ask.targetType, ask.targetId) || "This item";
      const day = noteDayLabel(week, ask);
      const replies = parentRepliesForAsk(family, ask);
      const replyHtml = replies.map((r) => `
        <div class="msg-reply">
          <p class="msg-reply-kicker">Mom/Dad replied</p>
          <p class="msg-reply-text">${esc(r.text)}</p>
          <p class="msg-stamp">${esc(fmtStamp(r.at))}</p>
        </div>`).join("");
      const composer = unanswered ? `
        <label class="msg-reply-label">Reply
          <textarea data-reply="${esc(ask.id)}" maxlength="280" rows="3" placeholder="A short answer he will see on that card"></textarea>
        </label>
        <div class="parent-actions">
          <button type="button" class="btn primary" data-send-reply="${esc(ask.id)}">Send reply</button>
        </div>` : "";
      return `
        <article class="inbox-card msg-card${unanswered ? " msg-card-open" : " msg-card-done"}">
          <p class="msg-kicker">${unanswered ? "Needs a reply" : "Answered"}</p>
          <h3>${ask.test ? '<span class="test-tag">TEST</span> ' : ""}${esc(title)}${day ? " · " + esc(day) : ""}</h3>
          <p class="msg-ask">${esc(ask.text)}</p>
          <p class="msg-stamp">${esc(fmtStamp(ask.at))}</p>
          ${replyHtml}
          ${composer}
        </article>`;
    };
    const openHtml = open.length
      ? `<section class="msg-section"><h2>Needs a reply</h2>${open.map((ask) => card(ask, true)).join("")}</section>`
      : "";
    const doneHtml = done.length
      ? `<section class="msg-section msg-section-done"><h2>Answered</h2>${done.map((ask) => card(ask, false)).join("")}</section>`
      : "";
    return openHtml + doneHtml;
  }

  function bindMessagesInbox(root, opts) {
    const o = opts || {};
    let family = o.family;
    if (!root || !root.querySelectorAll) return family;
    root.querySelectorAll("[data-send-reply]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-send-reply");
        const ta = root.querySelector(`[data-reply="${id}"]`);
        const text = (ta && ta.value || "").trim();
        if (!text) {
          toast("Write a reply first.");
          return;
        }
        family = sendParentReply(family, id, text);
        toast("Reply sent. Bennett will see it on that card.");
        if (typeof o.onChange === "function") o.onChange(family);
      });
    });
    return family;
  }

  function basecampChipHtml(on) {
    return `<a class="basecamp-chip${on ? " on" : ""}" href="basecamp.html"${on ? ' aria-current="page"' : ""} aria-label="Base Camp"><span class="basecamp-chip-full">Base Camp</span><span class="basecamp-chip-short">Camp</span></a>`;
  }

  function mountBaseCampChip() {
    if (!document.querySelectorAll) return null;
    const navs = document.querySelectorAll(".hud-nav");
    if (!navs || !navs.length) return null;
    const on = pageFile() === "basecamp.html" || pageFile() === "ask.html";
    Array.from(navs).forEach((nav) => {
      let chip = nav.querySelector ? nav.querySelector(".basecamp-chip") : null;
      if (!chip && nav.insertAdjacentHTML) {
        const after = nav.querySelector && (nav.querySelector(".crew-chip") || nav.querySelector(".progress-chip"));
        if (after && after.insertAdjacentHTML) after.insertAdjacentHTML("afterend", basecampChipHtml(on));
        else if (nav.insertAdjacentHTML) nav.insertAdjacentHTML("afterbegin", basecampChipHtml(on));
        chip = nav.querySelector && nav.querySelector(".basecamp-chip");
      } else if (!chip && document.createElement) {
        chip = document.createElement("a");
        chip.className = "basecamp-chip" + (on ? " on" : "");
        chip.setAttribute("href", "basecamp.html");
        chip.setAttribute("aria-label", "Base Camp");
        chip.innerHTML = `<span class="basecamp-chip-full">Base Camp</span><span class="basecamp-chip-short">Camp</span>`;
        const after = nav.querySelector && (nav.querySelector(".crew-chip") || nav.querySelector(".progress-chip"));
        if (after && after.parentNode && after.nextSibling) {
          after.parentNode.insertBefore(chip, after.nextSibling);
        } else if (after && after.parentNode && after.parentNode.insertBefore) {
          after.parentNode.insertBefore(chip, after.nextSibling || null);
        } else if (nav.appendChild) {
          nav.appendChild(chip);
        }
      }
      if (chip && on && chip.classList && chip.classList.add) chip.classList.add("on");
    });
    return navs[0];
  }

  function messagesChipHtml(on) {
    return `<a class="messages-chip${on ? " on" : ""}" href="messages.html"${on ? ' aria-current="page"' : ""} aria-label="Messages"><span class="messages-chip-full">Messages</span><span class="messages-chip-short">Msgs</span><span class="messages-badge" hidden></span></a>`;
  }

  function mountMessagesChip() {
    if (!document.querySelectorAll) return null;
    const navs = document.querySelectorAll(".hud-nav");
    if (!navs || !navs.length) return null;
    const on = pageFile() === "messages.html";
    Array.from(navs).forEach((nav) => {
      let chip = nav.querySelector ? nav.querySelector(".messages-chip") : null;
      if (!chip && nav.insertAdjacentHTML) {
        const parent = nav.querySelector && nav.querySelector(".parent-chip");
        if (parent && parent.insertAdjacentHTML) parent.insertAdjacentHTML("beforebegin", messagesChipHtml(on));
        else nav.insertAdjacentHTML("beforeend", messagesChipHtml(on));
        chip = nav.querySelector && nav.querySelector(".messages-chip");
      } else if (!chip && document.createElement) {
        chip = document.createElement("a");
        chip.className = "messages-chip" + (on ? " on" : "");
        chip.setAttribute("href", "messages.html");
        chip.setAttribute("aria-label", "Messages");
        chip.innerHTML = `<span class="messages-chip-full">Messages</span><span class="messages-chip-short">Msgs</span><span class="messages-badge" hidden></span>`;
        const parent = nav.querySelector && nav.querySelector(".parent-chip");
        if (parent && parent.parentNode && parent.parentNode.insertBefore) {
          parent.parentNode.insertBefore(chip, parent);
        } else if (nav.appendChild) {
          nav.appendChild(chip);
        }
      }
      if (chip && on && chip.classList && chip.classList.add) chip.classList.add("on");
    });
    paintMessagesChip();
    return navs[0];
  }

  function paintMessagesChip(family) {
    if (!document.querySelectorAll) return 0;
    const fam = family || getFamilyDraft() || emptyFamily();
    const n = unansweredAskCount(fam);
    Array.from(document.querySelectorAll(".messages-chip") || []).forEach((chip) => {
      if (!chip) return;
      if (chip.classList && chip.classList.toggle) chip.classList.toggle("has-unread", n > 0);
      else if (chip.classList && chip.classList.add && chip.classList.remove) {
        if (n > 0) chip.classList.add("has-unread");
        else chip.classList.remove("has-unread");
      }
      const badge = chip.querySelector ? chip.querySelector(".messages-badge") : null;
      if (badge) {
        badge.textContent = n > 9 ? "9+" : String(n);
        badge.hidden = n === 0;
      }
      if (chip.setAttribute) {
        chip.setAttribute("aria-label", n ? "Messages, " + n + " unanswered" : "Messages");
      }
    });
    return n;
  }

  function hideMessagesChip(view) {
    if (!document.querySelectorAll) return;
    const hide = normalizeSiteView(view || siteView()) === "bennett";
    const nodes = document.querySelectorAll(".messages-chip, a[href='messages.html']");
    Array.from(nodes || []).forEach((el) => {
      if (!el) return;
      if (el.closest && el.closest(".site-view-gate")) return;
      el.hidden = !!hide;
    });
  }

  function shouldBounceMessagesPage(file, view) {
    const name = String(file || pageFile()).toLowerCase();
    return name === "messages.html" && normalizeSiteView(view || siteView()) === "bennett";
  }

  function bounceMessagesIfKid() {
    if (!shouldBounceMessagesPage()) return false;
    try {
      if (global.location && typeof global.location.replace === "function") {
        global.location.replace("index.html");
      }
    } catch (_) {}
    return true;
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
    const camp = await collectBasecampBlobs(next.family);
    next.libraryBlobs = Object.assign({}, collected.blobs, camp.blobs);
    return { pack: next, skipped: collected.skipped.concat(camp.skipped) };
  }

  const PREVIEW_AWARD_IDS = [
    "signin-bennett", "test-bennett-showup",
    "test-ace-closer", "test-riff-reps", "test-scorch-recover", "test-deuce-return", "test-fuzz-unplugged",
    "test-notebook-holding", "test-first-serve", "test-angle-finder", "test-field-kit", "test-unplugged-strap", "test-daily-pick",
    "test-ace-frog", "test-riff-bird", "test-scorch-spider",
    "straight-as-3w", "no-late-4w", "flash-cards-first", "started-week-5", "asked-before-due", "hidden-banana", "wrong-number-eggs"
  ];
  const PREVIEW_CHARACTER_IDS = ["ace", "riff", "scorch", "deuce", "fuzz", "bennett"];
  const PREVIEW_GEAR_IDS = ["notebook-holding", "first-serve", "angle-finder", "field-kit", "unplugged-strap", "daily-pick"];
  const PREVIEW_CONTENT_IDS = ["ace-frog", "riff-bird", "scorch-spider"];

  function kidViewHidesPreview(view) {
    return siteViewHidesAdult(view);
  }

  function bananaValue(id, pack) {
    if (!id) return 0;
    const lists = [];
    if (pack && Array.isArray(pack.achievements)) lists.push(pack.achievements);
    const draft = getMomDraft();
    if (draft && Array.isArray(draft.achievements)) lists.push(draft.achievements);
    lists.push(PREVIEW_FALLBACKS);
    for (let i = 0; i < lists.length; i += 1) {
      const hit = lists[i].find((row) => row && row.id === id);
      if (hit) return bananasOf(hit);
    }
    return 0;
  }

  function kidBananas(pack) {
    const stored = storedBananas();
    const unlocks = getUnlocks();
    let taint = 0;
    Object.keys(unlocks).forEach((id) => {
      if (!unlocks[id]) return;
      if (!achievementIsPreviewOnly(id)) return;
      taint += bananaValue(id, pack);
    });
    return Math.max(0, stored - taint);
  }

  function progressCanMutate() {
    return !siteViewHidesAdult();
  }

  function progressTrophyListHtml(achievements) {
    const trophies = (achievements || []).filter((ach) => alreadyUnlocked(ach.id));
    if (!trophies.length) {
      return `<li class="empty">No trophies yet</li>`;
    }
    return trophies.map((ach) => {
      const play = gameHref(ach) ? `<a class="tiny primary" href="${esc(gameHref(ach))}">Play</a>` : "";
      const mutate = progressCanMutate()
        ? `<button type="button" class="tiny" data-edit="trophy:${esc(ach.id)}">Edit</button><button type="button" class="tiny" data-undo-trophy="${esc(ach.id)}">Undo award</button>`
        : "";
      const tools = (play || mutate) ? ` <span class="entry-tools">${play}${mutate}</span>` : "";
      return `<li class="entry-row">${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${esc(ach.title)}${tools}</li>`;
    }).join("");
  }

  function getPreviewIdList() {
    const stored = read(KEYS.previewIds, []);
    if (Array.isArray(stored)) return stored.map((id) => String(id || "")).filter(Boolean);
    if (stored && typeof stored === "object") return Object.keys(stored);
    return [];
  }

  function savePreviewIdList(ids) {
    const seen = Object.create(null);
    const next = [];
    (ids || []).forEach((id) => {
      const key = String(id || "");
      if (!key || seen[key]) return;
      seen[key] = true;
      next.push(key);
    });
    write(KEYS.previewIds, next);
    return next;
  }

  function addPreviewIds(ids) {
    return savePreviewIdList(getPreviewIdList().concat(ids || []));
  }

  function removePreviewIds(ids) {
    const drop = Object.create(null);
    (ids || []).forEach((id) => {
      if (id) drop[String(id)] = true;
    });
    return savePreviewIdList(getPreviewIdList().filter((id) => !drop[id]));
  }

  function familyStreaks() {
    const family = getFamilyDraft();
    return (family && family.streaks) || {};
  }

  function achievementIsPreviewOnly(id) {
    if (!id) return false;
    const st = familyStreaks()[id];
    if (st && st.preview === false) return false;
    if (st && st.preview === true) return true;
    if (getPreviewIdList().indexOf(id) >= 0) return true;
    if (hasPreviewAllFlag() && PREVIEW_AWARD_IDS.indexOf(id) >= 0) return true;
    return false;
  }

  function previewTargetSet(type) {
    if (type === "character") return PREVIEW_CHARACTER_IDS;
    if (type === "content") return PREVIEW_CONTENT_IDS;
    return PREVIEW_GEAR_IDS;
  }

  function streakUnlockMatches(st, type, targetId) {
    if (!st || !targetId) return false;
    if (type === "character") {
      if (st.grantedCharacter === targetId) return true;
      const unlock = st.grantedUnlock;
      return !!(unlock && unlock.type === "character" && unlock.id === targetId);
    }
    const unlock = st.grantedUnlock;
    if (!unlock || unlock.id !== targetId) return false;
    if (type === "content") return unlock.type === "content";
    return !!(unlock.type && unlock.type !== "character" && unlock.type !== "content");
  }

  function hasEarnedUnlockGrant(type, targetId) {
    const streaks = familyStreaks();
    return Object.keys(streaks).some((achId) => {
      const st = streaks[achId];
      if (!st || !st.awarded) return false;
      if (achievementIsPreviewOnly(achId)) return false;
      return streakUnlockMatches(st, type, targetId);
    });
  }

  function unlockTargetIsPreviewOnly(type, targetId) {
    if (!targetId) return false;
    if (hasEarnedUnlockGrant(type, targetId)) return false;
    const streaks = familyStreaks();
    const previewGrant = Object.keys(streaks).some((achId) => {
      const st = streaks[achId];
      if (!st || !st.awarded) return false;
      if (!achievementIsPreviewOnly(achId)) return false;
      return streakUnlockMatches(st, type, targetId);
    });
    if (previewGrant) return true;
    if (hasPreviewAllFlag() && previewTargetSet(type).indexOf(targetId) >= 0) return true;
    return false;
  }

  const PREVIEW_FALLBACKS = [
    { id: "signin-bennett", title: "Signed in", reward: 10, rewardCharacter: "bennett", rewardUnlock: { type: "character", id: "bennett", label: "Bennett" } },
    { id: "test-bennett-showup", title: "Meet Bennett", reward: 10, rewardCharacter: "bennett", rewardUnlock: { type: "character", id: "bennett", label: "Bennett" } },
    { id: "test-ace-closer", title: "Meet Ace", reward: 10, rewardCharacter: "ace", rewardUnlock: { type: "character", id: "ace", label: "Ace" } },
    { id: "test-riff-reps", title: "Meet Riff", reward: 10, rewardCharacter: "riff", rewardUnlock: { type: "character", id: "riff", label: "Riff" } },
    { id: "test-scorch-recover", title: "Meet Scorch", reward: 10, rewardCharacter: "scorch", rewardUnlock: { type: "character", id: "scorch", label: "Scorch" } },
    { id: "test-deuce-return", title: "Meet Deuce", reward: 10, rewardCharacter: "deuce", rewardUnlock: { type: "character", id: "deuce", label: "Deuce" } },
    { id: "test-fuzz-unplugged", title: "Meet Fuzz", reward: 10, rewardCharacter: "fuzz", rewardUnlock: { type: "character", id: "fuzz", label: "Fuzz" } },
    { id: "test-notebook-holding", title: "Notebook of Holding", bananas: 10, reward: { type: "tool", id: "notebook-holding", label: "Notebook of Holding" } },
    { id: "test-first-serve", title: "First Serve", bananas: 10, reward: { type: "ability", id: "first-serve", label: "First Serve" } },
    { id: "test-angle-finder", title: "Angle Finder", reward: 10, rewardUnlock: { type: "tool", id: "angle-finder", label: "Angle Finder" } },
    { id: "test-field-kit", title: "Field Kit", reward: 10, rewardUnlock: { type: "tool", id: "field-kit", label: "Field Kit" } },
    { id: "test-unplugged-strap", title: "Unplugged Strap", reward: 10, rewardUnlock: { type: "outfit", id: "unplugged-strap", label: "Unplugged Strap" } },
    { id: "test-daily-pick", title: "Daily Pick", reward: 10, rewardUnlock: { type: "tool", id: "daily-pick", label: "Daily Pick" } },
    { id: "test-ace-frog", title: "Frog Serve", reward: 10, rewardUnlock: { type: "content", id: "ace-frog", label: "Frog Serve" } },
    { id: "test-riff-bird", title: "Bird Blast", reward: 10, rewardUnlock: { type: "content", id: "riff-bird", label: "Bird Blast" } },
    { id: "test-scorch-spider", title: "Web Burn", reward: 10, rewardUnlock: { type: "content", id: "scorch-spider", label: "Web Burn" } },
    { id: "straight-as-3w", title: "Straight A's", reward: 20 },
    { id: "no-late-4w", title: "On-time streak", reward: 20 },
    { id: "flash-cards-first", title: "Flash-card first test", reward: 10 },
    { id: "started-week-5", title: "Five-day start", reward: 15 },
    { id: "asked-before-due", title: "Asked before it was due", reward: 10 },
    { id: "hidden-banana", title: "Hidden banana", reward: 25, unlocksGame: "egg" },
    { id: "wrong-number-eggs", title: "Wrong number of eggs", reward: 15, unlocksGame: "egg" }
  ];

  function hasPreviewAllFlag() {
    try {
      const raw = localStorage.getItem(KEYS.previewAll);
      return raw === "1" || raw === "true";
    } catch (_) {
      return false;
    }
  }

  function setPreviewAllFlag() {
    try {
      localStorage.setItem(KEYS.previewAll, "1");
    } catch (_) {}
  }

  function hasPreviewLockedFlag() {
    try {
      const raw = localStorage.getItem(KEYS.previewLocked);
      return raw === "1" || raw === "true";
    } catch (_) {
      return false;
    }
  }

  function setPreviewLockedFlag() {
    try {
      localStorage.setItem(KEYS.previewLocked, "1");
    } catch (_) {}
  }

  function clearPreviewLockedFlag() {
    try {
      localStorage.removeItem(KEYS.previewLocked);
    } catch (_) {}
  }

  function previewAwardPack(pack) {
    const list = ((pack && pack.achievements) || []).slice();
    const have = new Set(list.map((ach) => ach && ach.id));
    PREVIEW_FALLBACKS.forEach((row) => {
      if (!have.has(row.id)) list.push(row);
    });
    return Object.assign({}, pack || {}, { achievements: list });
  }

  function previewAwardIds(pack) {
    const ids = [];
    const seen = Object.create(null);
    ((pack && pack.achievements) || []).forEach((ach) => {
      if (ach && ach.id && !seen[ach.id]) {
        seen[ach.id] = true;
        ids.push(ach.id);
      }
    });
    PREVIEW_AWARD_IDS.forEach((id) => {
      if (!seen[id]) {
        seen[id] = true;
        ids.push(id);
      }
    });
    return ids;
  }

  function awardAllPreview(pack, family) {
    const working = previewAwardPack(pack);
    let next = normalizeFamily(family);
    let awarded = 0;
    previewAwardIds(working).forEach((id) => {
      if (alreadyUnlocked(id)) return;
      const result = awardStreak(working, next, id, { preview: true });
      next = result.family;
      if (result.achievement) awarded += 1;
    });
    setPreviewAllFlag();
    clearPreviewLockedFlag();
    return { family: next, awarded };
  }

  function revokeAllPreview(pack, family) {
    const working = previewAwardPack(pack);
    let next = normalizeFamily(family);
    let revoked = 0;
    previewAwardIds(working).forEach((id) => {
      const result = revokeAchievement(working, next, id);
      next = result.family;
      if (result.revoked) revoked += 1;
    });
    setPreviewAllFlag();
    setPreviewLockedFlag();
    return { family: next, revoked };
  }

  function maybeAutoPreviewAll(pack, family) {
    const next = normalizeFamily(family);
    if (siteViewHidesAdult()) return { family: next, ran: false, awarded: 0 };
    if (hasPreviewLockedFlag()) return { family: next, ran: false, awarded: 0 };
    const firstOffer = !hasPreviewAllFlag();
    const result = awardAllPreview(pack, next);
    return { family: result.family, ran: firstOffer, awarded: result.awarded };
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
    storedBananas,
    kidBananas,
    addBananas,
    progressCanMutate,
    progressTrophyListHtml,
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
    reloadShippedLibrary,
    defaultLibrary,
    normalizeLibrary,
    mergeLibrary,
    shippedLibrary,
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
    isGatedLibraryItem,
    CONTENT_SLOT,
    isSafeHttpUrl,
    youtubeId,
    youtubeEmbedSrc,
    LIBRARY_GROUPS,
    TEAMMATE_IDS,
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
    addProgressItem,
    addWeekItem,
    addAssignment,
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
    maybeAwardSignIn,
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
    isBennettAsk,
    isParentReply,
    parentRepliesForAsk,
    askHasParentReply,
    bennettAsks,
    unansweredBennettAsks,
    unansweredAskCount,
    mergeNotesById,
    syncFamilyNotes,
    pullFamilyNotes,
    pushFamilyNotes,
    sendParentReply,
    messagesInboxHtml,
    bindMessagesInbox,
    messagesChipHtml,
    mountMessagesChip,
    paintMessagesChip,
    hideMessagesChip,
    shouldBounceMessagesPage,
    bounceMessagesIfKid,
    noteTargetLabel,
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
    unlockedTeammates,
    isTeammate,
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
    awardAllPreview,
    revokeAllPreview,
    maybeAutoPreviewAll,
    bananasOf,
    rewardUnlockOf,
    rewardCharacterId,
    getGearUnlocks,
    alreadyUnlockedGear,
    unlockedGear,
    gearLibraryItems,
    gearLibraryItem,
    gearThumbHtml,
    GEAR_SLOTS,
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
    warmupLibraryAudio,
    getSharedAudioContext,
    playRandomLibraryItem,
    audioLibraryItems,
    SOUND_CUES,
    DEFAULT_SOUND_CUES,
    RANDOM_CUE,
    defaultSoundCueId,
    shippedUndoClick,
    shippedTableClick,
    resolveCueItemId,
    resolveCueLibraryItem,
    cueLibraryItem,
    cueSoundLabel,
    setSoundCue,
    resolveCuePlay,
    playSoundCue,
    workActionCueIds,
    playWorkActionCue,
    soundCueRows,
    isUndoControl,
    playUndoSound,
    bindUndoCue,
    bindSoundCues,
    assignedCueRows,
    playSynth,
    playContentReward,
    maybePlayContentCelebration,
    markContentSeen,
    hasUnlock,
    getAskThread,
    saveAskThread,
    addAskMessage,
    emptyBasecamp,
    normalizeBasecamp,
    getBasecamp,
    basecampSessionsForClass,
    basecampPinnedForClass,
    basecampSavedForClass,
    setBasecampPinned,
    basecampSession,
    upsertBasecampSession,
    createBasecampSession,
    addBasecampMessage,
    basecampImageIds,
    collectBasecampBlobs,
    hydrateImageId,
    basecampChipHtml,
    mountBaseCampChip,
    latestReflection,
    latestBennettQuestion,
    classIdForTitle,
    classIdForWork,
    termOf,
    DEFAULT_TERM,
    loadTerms,
    track,
    migrateCleanSlate,
    classNameForId,
    classPeriodLine,
    classShowsPeriodChip,
    classMetaLine,
    classDueCount,
    classDueLabel,
    khanIdsForClass,
    khanLinksByIds,
    khanLinksForClass,
    khanLinksForRoster,
    khanLinksFor,
    khanStripHtml,
    khanStripHtmlForClass,
    khanInlineHtml,
    khanShortLabel,
    KHAN,
    loadStory,
    characterMedia,
    paintStoryChip,
    paintBuild,
    siteView,
    siteViewFromRole,
    telemetryDeviceRole,
    setSiteView,
    audioAllowed,
    applySiteView,
    mountSiteViewControl,
    siteViewControlHtml,
    siteViewHidesAdult,
    shouldGateAdultPage,
    SITE_VIEWS
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

  if (document.body) {
    paintBuild();
    bindUndoCue();
    applySiteView();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      paintBuild();
      bindUndoCue();
      applySiteView();
    });
  }
})(window);
