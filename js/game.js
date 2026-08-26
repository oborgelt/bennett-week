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
    loginDays: "bw-login-days",
    previewAll: "bw-preview-all",
    previewIds: "bw-preview-ids",
    previewLocked: "bw-preview-locked",
    signinSeen: "bw-signin-seen",
    siteView: "bw-site-view",
    session: "bw-session",
    basecampIntro: "bw-basecamp-intro",
    selectedClass: "bw-selected-class",
    workDisputes: "bw-work-disputes",
    classVisits: "bw-class-visits",
    needsYouCollapsed: "bw-needs-you-collapsed",
    needsYouCollapsedProgress: "bw-needs-you-collapsed-progress",
    followupCollapsed: "bw-followup-collapsed"
  };

  const SITE_VIEWS = ["me", "bennett", "mom"];
  const LOGIN_USERS = {
    bennett: { view: "bennett", label: "Bennett", hash: "5530d3d973e15ca3003aa41cc9b2c9396b38d3ac7bf8a2653a1dd328fc01d49a" },
    mom: { view: "mom", label: "Mom", hash: "e65ccf65df25d3febdca240545e8682bb967ee59b7b522e6cefa071918a4291a" },
    orin: { view: "me", label: "Dad", hash: "b3bed27696166a7679d16a8308b42e0dd33ed1bd6d29ea76bb14b525058ffca0" }
  };

  const LIBRARY_GROUPS = ["ace", "riff", "scorch", "deuce", "fuzz", "bennett", "crew", "fun"];
  const TEAMMATE_IDS = ["ace", "riff", "scorch", "deuce", "fuzz"];
  const CLASS_IDS = ["band", "sociology", "web-design", "academic-intervention", "chemistry", "strength", "english-10", "geometry"];
  const WORK_ACTION_BANANAS = 1;
  const ACE_DONE_COUNT = 3;
  const ACE_DONE_ACHIEVEMENT = "ace-three-done";
  const SIGNIN_ACHIEVEMENT = "signin-bennett";
  const SCORCH_LIVE_ACHIEVEMENT = "all-assignments-updated";
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
    tables: "tablesloud",
    "work-start": "tablesloud",
    "work-done": "tablesloud",
    "streak-award": "tablesloud"
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

  const BADGE_ICON_KEYS = ["tennis", "guitar", "clarinet", "badge", "banana", "band"];

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

  function isRoomPlateSrc(src) {
    return /trophy-(room|pedestal|cubbies|pegboard|lockers|window)|basecamp-bg/i.test(String(src || ""));
  }

  function badgeSrc(ach, lib) {
    if (!ach) return ICONS.badge;
    if (ach.badge) {
      const item = libraryItem(lib, ach.badge);
      const src = item ? (librarySrc(item) || libraryThumb(item)) : "";
      if (src) return src;
    }
    const custom = String(ach.badgeSrc || "").trim();
    if (custom && isLocalLibraryPath(custom)) return custom;
    return iconFor(ach.icon);
  }

  function badgeChoices(lib) {
    const shipped = BADGE_ICON_KEYS.map((key) => ({
      id: key,
      key,
      src: ICONS[key],
      label: key.charAt(0).toUpperCase() + key.slice(1),
      kind: "icon"
    }));
    const seen = {};
    const extra = [];
    ((lib && lib.items) || []).forEach((item) => {
      if (!item || item.kind !== "image") return;
      const src = librarySrc(item) || libraryThumb(item);
      if (!src || seen[src] || isRoomPlateSrc(src)) return;
      seen[src] = true;
      extra.push({
        id: "lib:" + item.id,
        key: item.id,
        src,
        label: item.label || item.id,
        kind: "library"
      });
    });
    return shipped.concat(extra);
  }

  function parseAwardIntent(text) {
    const raw = String(text || "").trim();
    const t = raw.toLowerCase().replace(/[’]/g, "'");
    const nMatch = t.match(/\b(\d+)\b/);
    const n = nMatch ? Math.max(1, Number(nMatch[1])) : 0;
    const loginish = /log(?:s|ged|ging)?\s*-?\s*in|logins?\b|sign(?:s|ed|ing)?\s+in|opens? the (site|app|lobby)|show(?:s)? up/.test(t);
    const dayish = /\bday/.test(t);
    const rowish = /\bin a row\b|\bstraight\b|\bconsecutive\b|\bstreak\b/.test(t);
    if (loginish && (dayish || rowish || n >= 2)) {
      const count = n || 5;
      return {
        type: "login_days",
        count,
        title: count + "-day login",
        description: "Logged in " + count + " days in a row.",
        how: "Auto. Bennett logs into Jungle Jam " + count + " Chicago days in a row.",
        target: count,
        unit: "day",
        readout: "The site counts Bennett logins. Award at " + count + " days in a row."
      };
    }
    if ((/every open assignment|all open assignments|every assignment/.test(t) || /started this/.test(t))
      && /\b(done|finish|complete)\b/.test(t)) {
      return {
        type: "open_touched",
        count: 1,
        title: "All open assignments updated",
        description: "Marked Done or I started this on every open assignment.",
        how: "Auto. Bennett taps Done or I started this on every open assignment this week.",
        target: 1,
        unit: "time",
        readout: "The site watches This Week. Award when every open assignment is Started or Done."
      };
    }
    if (/\b(done|finish|complete|mark)\b/.test(t) && /\b(assignment|homework|work|task)/.test(t)) {
      const count = n || 3;
      return {
        type: "done_count",
        count,
        title: count + " assignments done",
        description: "Marked " + count + " assignments done.",
        how: "Auto. Bennett taps Done " + count + " times.",
        target: count,
        unit: "time",
        readout: "The site counts Done taps. Award at " + count + "."
      };
    }
    if (/every class|all (8 )?class|class tour|open every class/.test(t)) {
      const hours = n && n <= 72 ? n : 24;
      return {
        type: "class_tour",
        hours,
        count: 1,
        title: "Class tour",
        description: "Opened every class in one day.",
        how: "Auto. Open every class within " + hours + " hours.",
        target: 1,
        unit: "time",
        readout: "The site counts class visits. Award when every class is opened within " + hours + " hours."
      };
    }
    const count = n || 1;
    return {
      type: "parent_award",
      count,
      title: raw ? raw.slice(0, 40) : "New streak",
      description: raw,
      how: "Parents award this from the desk. Count, then Award.",
      target: count,
      unit: "time",
      readout: "You award this from the desk. Count, then Award. The site will not auto-unlock it."
    };
  }

  function earnRulePlain(ach) {
    const rule = (ach && ach.unlock) || {};
    if (rule.type === "done_count") {
      const n = Number(rule.count) || 3;
      return "Marks " + n + " assignment" + (n === 1 ? "" : "s") + " Done";
    }
    if (rule.type === "open_touched") {
      return "Taps Done or I started this on every open assignment";
    }
    if (rule.type === "class_tour") {
      const h = Number(rule.hours) || 24;
      return "Opens every class within " + h + " hours";
    }
    if (rule.type === "login_days") {
      const n = Number(rule.count) || 5;
      return "Logs in " + n + " days in a row";
    }
    if (rule.type === "login_total") {
      const n = Number(rule.count) || 5;
      return "Logs in " + n + " days total";
    }
    if (rule.type === "easter_egg") return "Finds a secret in the jungle";
    const intent = String((ach && (ach.intent || ach.how)) || "").trim();
    if (intent && !/^parents award/i.test(intent) && !/^award this/i.test(intent) && !/^loading the site/i.test(intent)) {
      return intent.replace(/\.$/, "");
    }
    return "You tap Award";
  }

  function awardLiveStatus(ach, family) {
    const id = ach && ach.id;
    const st = (family && family.streaks && id && family.streaks[id]) || {};
    if (st.awarded && st.preview) return { key: "preview", label: "Preview only" };
    if (st.awarded || (id && alreadyUnlocked(id) && !achievementIsPreviewOnly(id))) {
      return { key: "earned", label: "Earned" };
    }
    if (ach && ach.unlock && ach.unlock.type && ach.unlock.type !== "parent_award") {
      return { key: "live", label: "Live for Bennett" };
    }
    return { key: "parent", label: "You award it" };
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

  function asYmdList(value) {
    if (!Array.isArray(value)) return [];
    const out = [];
    const seen = {};
    value.forEach((row) => {
      const ymd = String(row || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || seen[ymd]) return;
      seen[ymd] = true;
      out.push(ymd);
    });
    out.sort();
    return out;
  }

  function shiftChicagoYmd(ymd, days) {
    const raw = String(ymd || chicagoYmd());
    const parts = raw.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return chicagoYmd();
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + (Number(days) || 0));
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return yy + "-" + mm + "-" + dd;
  }

  function consecutiveLoginStreak(days, asOf) {
    const set = {};
    asYmdList(days).forEach((d) => { set[d] = true; });
    let ymd = asOf || chicagoYmd();
    let n = 0;
    while (set[ymd]) {
      n += 1;
      ymd = shiftChicagoYmd(ymd, -1);
      if (n > 4000) break;
    }
    return n;
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

  function bennettEarnedBananas(family) {
    let n = 0;
    const all = getProgress();
    Object.keys(all).forEach((id) => {
      const rec = all[id];
      if (!rec || typeof rec !== "object") return;
      if (rec.startedAwarded || workState(id).started) n += WORK_ACTION_BANANAS;
      if (rec.doneAwarded || workState(id).done) n += WORK_ACTION_BANANAS;
    });
    const notes = ((family && family.notes) || (getFamilyDraft() && getFamilyDraft().notes) || []);
    notes.forEach((note) => {
      if (note && note.from === "bennett" && String(note.text || "").trim()) n += WORK_ACTION_BANANAS;
    });
    return n;
  }

  function getBananas(pack, family) {
    return bennettEarnedBananas(family || getFamilyDraft());
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
        deletedAt: { events: {}, work: {}, notes: {} },
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
      },
      updatedAt: "",
      soundCues: {},
      library: { items: [] },
      ask: { messages: [] },
      achievements: { currency: null, achievements: [], updatedAt: "" },
      awards: { streaks: {}, characterUnlocks: {}, gearUnlocks: {}, contentUnlocks: {}, unlocks: {}, loginDays: [], updatedAt: "" },
      reflections: { pool: [], answers: [], updatedAt: "" },
      deletedNotes: { ids: [], texts: [] }
    };
  }

  const DEFAULT_REFLECTION_POOL = [
    { id: "r-easiest", text: "Which class felt easiest today?" },
    { id: "r-teacher", text: "Name one thing a teacher did that helped" },
    { id: "r-weird", text: "Anything feel weird or too fast?" },
    { id: "r-fav-teacher", text: "Favorite teacher right now?" },
    { id: "r-fav-class", text: "Favorite class right now?" },
    { id: "r-excited", text: "Which class are you excited to get back to?" },
    { id: "r-worried", text: "Which class are you more worried about?" },
    { id: "r-dislike", text: "Which class do you really not enjoy right now?" },
    { id: "r-who-helped", text: "Who made today easier?" },
    { id: "r-tell-parent", text: "What is one thing you want Mom or Dad to know about school?" },
    { id: "r-unfair", text: "Did anything feel unfair today?" },
    { id: "r-win", text: "What is one win from today, even a small one?" },
    { id: "r-hanging", text: "Which homework is hanging over you?" },
    { id: "r-people", text: "Who did you sit with or talk to today?" },
    { id: "r-comic", text: "If Jungle Jam put you in a comic tomorrow, what should it be about?" }
  ];

  function asStringList(value) {
    return Array.isArray(value) ? value.filter((id) => id != null && id !== "").map(String) : [];
  }

  function asStringMap(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out = {};
    Object.keys(value).forEach((id) => {
      if (value[id] != null && value[id] !== "") out[id] = String(value[id]);
    });
    return out;
  }

  function noteTextKey(text) {
    return String(text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function normalizeDeletedNotes(raw) {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const ids = asStringList(o.ids);
    const texts = asStringList(o.texts).map(noteTextKey).filter(Boolean);
    const idMap = Object.create(null);
    const textMap = Object.create(null);
    ids.forEach((id) => { if (id) idMap[id] = true; });
    texts.forEach((t) => { if (t) textMap[t] = true; });
    return { ids: Object.keys(idMap), texts: Object.keys(textMap) };
  }

  function mergeDeletedNotes(a, b) {
    const A = normalizeDeletedNotes(a);
    const B = normalizeDeletedNotes(b);
    return normalizeDeletedNotes({
      ids: A.ids.concat(B.ids),
      texts: A.texts.concat(B.texts)
    });
  }

  function noteIsDeleted(note, deleted) {
    if (!note) return true;
    const d = normalizeDeletedNotes(deleted);
    if (note.id && d.ids.indexOf(String(note.id)) >= 0) return true;
    const fp = noteTextKey(note.text);
    return !!(fp && d.texts.indexOf(fp) >= 0);
  }

  function noteTextIsDeleted(family, text) {
    const fp = noteTextKey(text);
    if (!fp) return false;
    const d = normalizeDeletedNotes(family && family.deletedNotes);
    return d.texts.indexOf(fp) >= 0;
  }

  function applyDeletedNotes(notes, deleted) {
    return (notes || []).filter((n) => n && n.id && !noteIsDeleted(n, deleted));
  }

  function pruneAskMessages(messages, deleted) {
    const d = normalizeDeletedNotes(deleted);
    if (!d.texts.length) return (messages || []).slice();
    return (messages || []).filter((m) => {
      const fp = noteTextKey(m && m.text);
      return !(fp && d.texts.indexOf(fp) >= 0);
    });
  }

  function pruneStoredAskThread(deleted) {
    const d = normalizeDeletedNotes(deleted);
    if (!d.texts.length) return;
    const thread = getAskThread();
    const messages = pruneAskMessages(thread.messages, d);
    if (messages.length !== ((thread && thread.messages) || []).length) saveAskThread({ messages });
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
    const deletedAt = week.deletedAt && typeof week.deletedAt === "object" ? week.deletedAt : {};
    return {
      week: {
        deleted: {
          events: asStringList(deleted.events),
          work: asStringList(deleted.work),
          notes: asStringList(deleted.notes)
        },
        deletedAt: {
          events: asStringMap(deletedAt.events),
          work: asStringMap(deletedAt.work),
          notes: asStringMap(deletedAt.notes)
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
      },
      soundCues: asCueMap(o.soundCues || week._jjSoundCues),
      library: (o.library && typeof o.library === "object")
        ? o.library
        : ((week._jjLibrary && typeof week._jjLibrary === "object") ? week._jjLibrary : { items: [] }),
      ask: (o.ask && typeof o.ask === "object")
        ? o.ask
        : ((week._jjAsk && typeof week._jjAsk === "object") ? week._jjAsk : { messages: [] }),
      achievements: normalizeAchievementsPack(o.achievements || week._jjAchievements),
      awards: normalizeAwardsPack(o.awards || week._jjAwards),
      reflections: normalizeReflections(o.reflections || week._jjReflections),
      deletedNotes: normalizeDeletedNotes(o.deletedNotes || week._jjDeletedNotes),
      updatedAt: o.updatedAt || o.updated_at || week.updatedAt || ""
    };
  }

  function normalizeReflectionRow(raw, kind) {
    if (!raw || typeof raw !== "object" || !raw.id) return null;
    const row = {
      id: String(raw.id),
      text: String(raw.text || "").trim()
    };
    if (!row.text && kind === "answer") return null;
    if (raw.promptId) row.promptId = String(raw.promptId);
    if (raw.prompt) row.prompt = String(raw.prompt);
    if (raw.at) row.at = String(raw.at);
    if (raw.updatedAt) row.updatedAt = String(raw.updatedAt);
    if (raw.test) row.test = true;
    if (raw.paused === true) row.paused = true;
    if (raw.paused === false) row.paused = false;
    return row;
  }

  function normalizeReflections(raw) {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const pool = Array.isArray(o.pool)
      ? o.pool.map((row) => normalizeReflectionRow(row, "prompt")).filter(Boolean)
      : [];
    const answers = Array.isArray(o.answers)
      ? o.answers.map((row) => normalizeReflectionRow(row, "answer")).filter(Boolean)
      : [];
    return {
      pool,
      answers,
      deletedAnswerIds: Array.isArray(o.deletedAnswerIds) ? o.deletedAnswerIds.map(String).filter(Boolean) : [],
      updatedAt: o.updatedAt || o.updated_at || ""
    };
  }

  function mergeReflectionList(a, b) {
    const byId = Object.create(null);
    (a || []).concat(b || []).forEach((row) => {
      if (!row || !row.id) return;
      const prev = byId[row.id];
      if (!prev) {
        byId[row.id] = row;
        return;
      }
      const nextStamp = String(row.updatedAt || row.at || "");
      const prevStamp = String(prev.updatedAt || prev.at || "");
      byId[row.id] = nextStamp >= prevStamp ? Object.assign({}, prev, row) : Object.assign({}, row, prev);
    });
    return Object.keys(byId).map((id) => byId[id]);
  }

  function mergeReflections(localRaw, remoteRaw) {
    const local = normalizeReflections(localRaw);
    const remote = normalizeReflections(remoteRaw);
    const deleted = Object.create(null);
    (local.deletedAnswerIds || []).concat(remote.deletedAnswerIds || []).forEach((id) => {
      if (id) deleted[id] = true;
    });
    return {
      pool: mergeReflectionList(local.pool, remote.pool),
      answers: mergeReflectionList(local.answers, remote.answers)
        .filter((a) => a && !deleted[a.id])
        .sort((a, b) => String(a.at || "").localeCompare(String(b.at || ""))),
      deletedAnswerIds: Object.keys(deleted),
      updatedAt: String(local.updatedAt || "") >= String(remote.updatedAt || "") ? local.updatedAt : remote.updatedAt
    };
  }

  function ensureReflectionPool(family) {
    const next = normalizeFamily(family);
    const have = Object.create(null);
    (next.reflections.pool || []).forEach((p) => {
      if (p && p.id) have[p.id] = true;
    });
    const missing = DEFAULT_REFLECTION_POOL.filter((row) => row && row.id && !have[row.id]);
    if (!next.reflections.pool.length) {
      next.reflections.pool = DEFAULT_REFLECTION_POOL.map((row) => Object.assign({}, row));
      return stampReflectionsOnFamily(next);
    }
    if (!missing.length) return next;
    next.reflections.pool = next.reflections.pool.concat(missing.map((row) => Object.assign({}, row)));
    return stampReflectionsOnFamily(next);
  }

  function stampChicagoYmd(iso) {
    const d = parseStamp(iso);
    return d ? chicagoYmd(d) : String(iso || "").slice(0, 10);
  }

  function todaysReflectionPrompt(family) {
    const raw = ((family && family.reflections && family.reflections.pool) || []);
    const pool = raw.filter((row) => row && row.id && row.text && !row.paused);
    const source = pool.length
      ? pool
      : DEFAULT_REFLECTION_POOL.filter((row) => {
        const held = raw.find((p) => p && p.id === row.id);
        return !(held && held.paused);
      });
    if (!source.length) return null;
    const key = chicagoYmd();
    let h = 0;
    for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return source[h % source.length];
  }

  function normalizeAchievementsPack(raw) {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const list = Array.isArray(o.achievements) ? o.achievements.filter((ach) => ach && ach.id) : [];
    return {
      currency: o.currency && typeof o.currency === "object" ? o.currency : null,
      achievements: list,
      updatedAt: o.updatedAt || o.updated_at || ""
    };
  }

  function mergeAchievementsPack(localRaw, remoteRaw) {
    const local = normalizeAchievementsPack(localRaw);
    const remote = normalizeAchievementsPack(remoteRaw);
    if (!local.achievements.length) return remote;
    if (!remote.achievements.length) return local;
    const localNewer = String(local.updatedAt || "") >= String(remote.updatedAt || "");
    const a = localNewer ? local : remote;
    const b = localNewer ? remote : local;
    const byId = {};
    (b.achievements || []).forEach((ach) => {
      if (ach && ach.id) byId[ach.id] = ach;
    });
    (a.achievements || []).forEach((ach) => {
      if (!ach || !ach.id) return;
      byId[ach.id] = Object.assign({}, byId[ach.id] || {}, ach);
    });
    return {
      currency: a.currency || b.currency,
      achievements: Object.keys(byId).map((id) => byId[id]),
      updatedAt: localNewer ? local.updatedAt : remote.updatedAt
    };
  }

  function normalizeAwardsPack(raw) {
    const o = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      streaks: o.streaks && typeof o.streaks === "object" && !Array.isArray(o.streaks) ? o.streaks : {},
      characterUnlocks: asUnlockMap(o.characterUnlocks),
      gearUnlocks: asUnlockMap(o.gearUnlocks),
      contentUnlocks: asUnlockMap(o.contentUnlocks),
      unlocks: o.unlocks && typeof o.unlocks === "object" && !Array.isArray(o.unlocks) ? o.unlocks : {},
      loginDays: asYmdList(o.loginDays),
      updatedAt: o.updatedAt || o.updated_at || ""
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
      if (Number(localStorage.getItem(SEED_GEN_KEY) || 0) < SEED_GEN) {
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
      }
    } catch (_) {}
  }

  function emptyFamily() {
    return {
      notes: [],
      deletedNotes: { ids: [], texts: [] },
      reflections: { pool: [], answers: [] },
      streaks: {},
      characterUnlocks: {},
      gearUnlocks: {},
      contentUnlocks: {},
      soundCues: {},
      story: emptyStory(),
      overlay: emptyOverlay(),
      basecamp: emptyBasecamp(),
      basecampQueries: [],
      loginDays: []
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
    const overlay = normalizeOverlay(f.overlay);
    const deletedNotes = mergeDeletedNotes(f.deletedNotes, overlay.deletedNotes);
    overlay.deletedNotes = deletedNotes;
    overlay.ask = normalizeAskThread(overlay.ask);
    overlay.ask.messages = pruneAskMessages(overlay.ask.messages, deletedNotes);
    return {
      notes: applyDeletedNotes(Array.isArray(f.notes) ? f.notes : [], deletedNotes),
      deletedNotes,
      reflections: mergeReflections(f.reflections, overlay.reflections),
      streaks: f.streaks && typeof f.streaks === "object" && !Array.isArray(f.streaks) ? f.streaks : {},
      characterUnlocks: asUnlockMap(f.characterUnlocks),
      gearUnlocks: asUnlockMap(f.gearUnlocks),
      contentUnlocks: asUnlockMap(f.contentUnlocks),
      soundCues: asCueMap(f.soundCues),
      story: normalizeStory(f.story),
      overlay: overlay,
      basecamp: normalizeBasecamp(f.basecamp),
      basecampQueries: normalizeBasecampQueries(f.basecampQueries),
      loginDays: asYmdList([].concat(f.loginDays || [], (overlay.awards && overlay.awards.loginDays) || []))
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
    const parked = [];
    function paintItems(clsId, items) {
      return (items || [])
        .filter((item) => item && item.id && overlay.deletedItems.indexOf(item.id) < 0)
        .map((item) => {
          const ip = overlay.itemEdits[item.id];
          return ip ? Object.assign({}, item, ip, { id: item.id }) : item;
        })
        .filter((item) => {
          const dest = String(item.classId || clsId);
          if (dest && dest !== clsId) {
            parked.push(item);
            return false;
          }
          return true;
        });
    }
    const classes = (base.classes || [])
      .filter((cls) => cls && cls.id && overlay.deletedClasses.indexOf(cls.id) < 0)
      .map((cls) => {
        const patch = overlay.classEdits[cls.id] || {};
        return Object.assign({}, cls, patch, { id: cls.id, items: paintItems(cls.id, cls.items) });
      });
    const seen = new Set(classes.map((cls) => cls.id));
    (overlay.addedClasses || []).forEach((row) => {
      const added = normalizeAddedClass(row);
      if (!added || seen.has(added.id) || overlay.deletedClasses.indexOf(added.id) >= 0) return;
      const patch = overlay.classEdits[added.id] || {};
      classes.push(Object.assign({}, added, patch, { id: added.id, items: paintItems(added.id, added.items) }));
      seen.add(added.id);
    });
    const byClass = new Map(classes.map((cls) => [cls.id, cls]));
    (overlay.addedItems || []).forEach((row) => {
      if (!row || !row.id || overlay.deletedItems.indexOf(row.id) >= 0) return;
      const ip = overlay.itemEdits[row.id];
      const item = ip ? Object.assign({}, row, ip, { id: row.id }) : Object.assign({}, row);
      const destId = String(item.classId || row.classId || "");
      const cls = byClass.get(destId);
      if (!cls) return;
      if (cls.items.some((cur) => cur.id === row.id)) return;
      cls.items.push(item);
    });
    parked.forEach((item) => {
      const cls = byClass.get(String(item.classId || ""));
      if (!cls || cls.items.some((cur) => cur.id === item.id)) return;
      cls.items.push(item);
    });
    return Object.assign({}, base, { classes });
  }

  function pushUnique(list, id) {
    const next = list.slice();
    if (next.indexOf(id) < 0) next.push(id);
    return next;
  }

  function stampOverlay(next, at) {
    next.overlay.updatedAt = at || nowIso();
    return next;
  }

  function editWeekOverlay(family, kind, id, patch, stamp) {
    const next = normalizeFamily(family);
    if (!next.overlay.week.edits[kind]) next.overlay.week.edits[kind] = {};
    const at = stamp || (patch && patch.updatedAt) || nowIso();
    next.overlay.week.edits[kind][id] = Object.assign({}, next.overlay.week.edits[kind][id] || {}, patch, { id, updatedAt: at });
    stampOverlay(next, at);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
  }

  function deleteWeekOverlay(family, kind, id, stamp) {
    const next = normalizeFamily(family);
    next.overlay.week.deleted[kind] = pushUnique(next.overlay.week.deleted[kind] || [], id);
    if (!next.overlay.week.deletedAt) next.overlay.week.deletedAt = { events: {}, work: {}, notes: {} };
    if (!next.overlay.week.deletedAt[kind]) next.overlay.week.deletedAt[kind] = {};
    const at = stamp || nowIso();
    next.overlay.week.deletedAt[kind][id] = at;
    stampOverlay(next, at);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
  }

  function addWeekItem(family, kind, item) {
    const next = normalizeFamily(family);
    if (!item || !item.id || !next.overlay.week.added[kind]) return next;
    const list = next.overlay.week.added[kind];
    if (list.some((row) => row && row.id === item.id)) return next;
    const at = item.updatedAt || nowIso();
    next.overlay.week.added[kind] = list.concat([Object.assign({}, item, { updatedAt: at })]);
    stampOverlay(next, at);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
  }

  function addProgressItem(family, classId, item) {
    const next = normalizeFamily(family);
    const cid = String(classId || "").trim();
    if (!cid || !item || !item.id) return next;
    const list = next.overlay.progress.addedItems || [];
    if (list.some((row) => row && row.id === item.id)) return next;
    next.overlay.progress.addedItems = list.concat([Object.assign({}, item, { classId: cid })]);
    stampOverlay(next);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
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
    const dueYmd = ymdFromLocal(src.due);
    const today = chicagoYmd();
    let suggest = src.suggest_from || undefined;
    if (!suggest && dueYmd && today) {
      const dueD = localDateFromYmd(dueYmd);
      const todayD = localDateFromYmd(today);
      if (dueD && todayD && (dueD.getTime() - todayD.getTime()) / 86400000 > 7) {
        suggest = today;
      }
    }
    const work = {
      id,
      title: assignmentTitle(classId, title),
      due: src.due,
      suggest_from: suggest,
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
        from: src.addedBy === "parent" ? parentNoteFrom() : "bennett",
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

  function updateAssignment(family, seed, id, fields) {
    const src = fields && typeof fields === "object" ? fields : {};
    const workId = String(id || "").trim();
    if (!workId) return normalizeFamily(family);
    const title = String(src.title || "").trim();
    if (!title) return normalizeFamily(family);
    const classId = String(src.classId || "").trim();
    const patch = {
      title: classId ? assignmentTitle(classId, wTitleStrip(title) || title) : title,
      due: src.due,
      suggest_from: src.suggest_from || undefined,
      note: src.note ? String(src.note).trim() : undefined
    };
    if (classId) patch.classId = classId;
    let next = normalizeFamily(family);
    const inAdded = (next.overlay.week.added.work || []).some((w) => w && w.id === workId);
    if (!inAdded) {
      next = addWeekItem(next, "work", Object.assign({ id: workId }, patch));
    }
    next = editWeekOverlay(next, "work", workId, patch);
    next = editProgressItem(next, workId, {
      title: wTitleStrip(title) || title,
      due: src.due,
      note: patch.note,
      classId: classId || undefined
    });
    if (classId) {
      next.overlay.progress.addedItems = (next.overlay.progress.addedItems || []).map((row) => {
        return row && row.id === workId ? Object.assign({}, row, { classId: classId }) : row;
      });
    }
    return next;
  }

  function editProgressClass(family, id, patch) {
    const next = normalizeFamily(family);
    const at = (patch && patch.updatedAt) || nowIso();
    next.overlay.progress.classEdits[id] = Object.assign({}, next.overlay.progress.classEdits[id] || {}, patch, { id, updatedAt: at });
    stampOverlay(next, at);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
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
    const at = (patch && patch.updatedAt) || nowIso();
    next.overlay.progress.itemEdits[id] = Object.assign({}, next.overlay.progress.itemEdits[id] || {}, patch, { id, updatedAt: at });
    stampOverlay(next, at);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
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

  function markNotesDeleted(family, notes) {
    const next = normalizeFamily(family);
    const gone = (notes || []).filter((n) => n && (n.id || n.text));
    if (!gone.length) return next;
    const ids = gone.map((n) => String(n.id || "")).filter(Boolean);
    const texts = gone.map((n) => noteTextKey(n.text)).filter(Boolean);
    next.deletedNotes = mergeDeletedNotes(next.deletedNotes, { ids, texts });
    next.overlay.deletedNotes = next.deletedNotes;
    next.notes = applyDeletedNotes(next.notes.concat(gone), next.deletedNotes);
    next.overlay.ask = normalizeAskThread(next.overlay.ask);
    next.overlay.ask.messages = pruneAskMessages(next.overlay.ask.messages, next.deletedNotes);
    stampOverlay(next);
    saveFamily(next);
    queueNotePush(next);
    if (!overlaySyncing) queueOverlayPush(next);
    const tel = global.Telemetry;
    if (tel && typeof tel.deleteNote === "function" && tel.connected && tel.connected()) {
      ids.forEach((noteId) => tel.deleteNote(noteId).catch(() => {}));
    }
    return next;
  }

  function deleteNote(family, id) {
    const want = String(id || "");
    if (!want) return normalizeFamily(family);
    const next = normalizeFamily(family);
    const hit = (next.notes || []).find((n) => n && n.id === want);
    const fp = noteTextKey(hit && hit.text);
    const same = (next.notes || []).filter((n) => {
      if (!n) return false;
      if (n.id === want) return true;
      return !!(fp && n.from === (hit && hit.from) && noteTextKey(n.text) === fp);
    });
    return markNotesDeleted(next, same.length ? same : [{ id: want, text: hit && hit.text, from: hit && hit.from }]);
  }

  function updatePrompt(family, id, patch) {
    const next = normalizeFamily(family);
    next.reflections.pool = updateById(next.reflections.pool, id, patch);
    return stampReflectionsOnFamily(next);
  }

  function deletePrompt(family, id) {
    const next = normalizeFamily(family);
    next.reflections.pool = next.reflections.pool.filter((p) => p.id !== id);
    return stampReflectionsOnFamily(next);
  }

  function setPromptPaused(family, id, paused) {
    return updatePrompt(family, id, { paused: !!paused, updatedAt: nowIso() });
  }

  function updateAnswer(family, id, patch) {
    const next = normalizeFamily(family);
    next.reflections.answers = updateById(next.reflections.answers, id, Object.assign({}, patch, { updatedAt: nowIso() }));
    return stampReflectionsOnFamily(next);
  }

  function deleteAnswer(family, id) {
    const want = String(id || "");
    if (!want) return normalizeFamily(family);
    const next = normalizeFamily(family);
    next.reflections.answers = (next.reflections.answers || []).filter((a) => a && a.id !== want);
    const gone = Array.isArray(next.reflections.deletedAnswerIds) ? next.reflections.deletedAnswerIds.slice() : [];
    if (gone.indexOf(want) < 0) gone.push(want);
    next.reflections.deletedAnswerIds = gone;
    if (next.overlay && next.overlay.reflections) {
      next.overlay.reflections.answers = (next.overlay.reflections.answers || []).filter((a) => a && a.id !== want);
      next.overlay.reflections.deletedAnswerIds = gone.slice();
    }
    return stampReflectionsOnFamily(next);
  }

  function stampReflectionsOnFamily(family) {
    const pack = normalizeReflections(family && family.reflections);
    pack.updatedAt = nowIso();
    const next = normalizeFamily(family);
    next.reflections = pack;
    next.overlay.reflections = pack;
    stampOverlay(next, pack.updatedAt);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
  }

  function addReflectionAnswer(family, fields) {
    const src = fields && typeof fields === "object" ? fields : {};
    const text = String(src.text || "").trim();
    if (!text) return normalizeFamily(family);
    const next = normalizeFamily(family);
    next.reflections.answers = next.reflections.answers.concat([{
      id: src.id || uid("ra"),
      promptId: String(src.promptId || ""),
      prompt: String(src.prompt || ""),
      text,
      at: src.at || nowIso(),
      test: !!src.test
    }]);
    return stampReflectionsOnFamily(next);
  }

  function confirmDelete(label) {
    return window.confirm("Delete this " + (label || "entry") + "? It disappears on this device. Export the family pack so Mom and Orin stay in sync.");
  }

  function entryButtons(editToken, delToken, opts) {
    const kid = siteViewHidesAdult();
    const kidEdit = opts && opts.kidEdit;
    if (kid && !kidEdit) return "";
    const raw = String(editToken || "");
    const workId = raw.indexOf("work:") === 0 ? raw.slice(5) : raw;
    const edit = kidEdit
      ? `<button type="button" class="mini" data-edit-work="${esc(workId)}">Edit</button>`
      : `<button type="button" class="tiny" data-edit="${esc(editToken)}">Edit</button>`;
    const del = kid ? "" : `<button type="button" class="tiny danger" data-del="${esc(delToken)}">Delete</button>`;
    return `
      ${edit}
      ${del}`;
  }

  function hasEggGame(pack) {
    return (pack && pack.achievements || []).some((ach) => ach.unlocksGame === "egg" && alreadyUnlocked(ach.id));
  }

  function gameHref(ach) {
    return ach && ach.unlocksGame === "egg" ? "egg.html" : "";
  }

  function toLocalInput(iso) {
    if (!iso) return "";
    const s = String(iso).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T23:59";
    if (s.length >= 16) return s.slice(0, 16);
    return s;
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
    const next = normalizeFamily(family);
    pruneStoredAskThread(next.deletedNotes);
    write(KEYS.family, next);
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
      const raw = String(path || "");
      const sep = raw.indexOf("?") >= 0 ? "&" : "?";
      const res = await fetch(raw + sep + "t=" + Date.now(), { cache: "no-store" });
      if (res.ok) return await res.json();
    } catch (_) {}
    return fallback;
  }

  async function loadWeek() {
    migrateCleanSlate();
    const seed = parseSeed("week-seed") || parseSeed("seed");
    return fetchJson("week.json", seed);
  }

  let shippedAchievements = null;

  function mergeAchievementUnlocks(pack, shipped) {
    const base = pack && Array.isArray(pack.achievements) ? pack : { currency: currency(pack), achievements: [] };
    const shippedList = (shipped && shipped.achievements) || [];
    const byId = {};
    shippedList.forEach((ach) => {
      if (ach && ach.id) byId[ach.id] = ach;
    });
    const seen = {};
    const achievements = (base.achievements || []).map((ach) => {
      if (ach && ach.id) seen[ach.id] = true;
      const live = byId[ach && ach.id];
      if (!live) return ach;
      const next = Object.assign({}, ach);
      if (live.unlock && !next.unlock) next.unlock = live.unlock;
      if (live.rewardCharacter && !next.rewardCharacter) next.rewardCharacter = live.rewardCharacter;
      if (live.rewardUnlock && !next.rewardUnlock) next.rewardUnlock = live.rewardUnlock;
      if (live.rewardMedia && !next.rewardMedia) next.rewardMedia = live.rewardMedia;
      if (live.description && !next.description) next.description = live.description;
      if (live.how && !next.how) next.how = live.how;
      return next;
    });
    shippedList.forEach((ach) => {
      if (!ach || !ach.id || seen[ach.id] || !ach.unlock) return;
      achievements.push(ach);
      seen[ach.id] = true;
    });
    return Object.assign({}, base, { achievements });
  }

  async function loadAchievements() {
    migrateCleanSlate();
    const seed = parseSeed("ach-seed");
    const file = await fetchJson("achievements.json", seed);
    shippedAchievements = file;
    const draft = getMomDraft();
    return mergeAchievementUnlocks(draft || file || { currency: currency({}), achievements: [] }, file);
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

  function unmarkCharacterSeen(id) {
    if (!id) return;
    const seen = getCharacterSeen();
    if (!seen[id]) return;
    delete seen[id];
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

  async function uploadLibraryFile(item, blob) {
    const tel = global.Telemetry;
    if (!item || !blob || !tel || typeof tel.uploadAudio !== "function" || !familySyncReady()) return null;
    if ((blob.size || 0) > PACK_BLOB_MAX) return null;
    try {
      const data = await blobToBase64(blob);
      const res = await tel.uploadAudio({
        id: item.id,
        filename: item.filename || item.label || item.id,
        mime: item.mime || blob.type || "application/octet-stream",
        data
      });
      const audio = res && res.audio ? res.audio : res;
      if (!audio || !isSafeHttpUrl(audio.url)) return null;
      return { url: audio.url, path: audio.path || "" };
    } catch (_) {
      return null;
    }
  }

  function stampLibraryOnFamily(lib) {
    const family = getFamilyDraft();
    if (!family) return null;
    family.overlay = normalizeOverlay(family.overlay);
    family.overlay.library = libraryCatalog(lib);
    family.overlay.updatedAt = nowIso();
    saveFamily(family);
    if (!overlaySyncing) queueOverlayPush(family);
    return family;
  }

  function stampAchievementsOnFamily(family, pack) {
    const next = normalizeFamily(family);
    next.overlay.achievements = {
      currency: pack && pack.currency ? pack.currency : currency(pack),
      achievements: (pack && pack.achievements) || [],
      updatedAt: nowIso()
    };
    stampOverlay(next);
    saveFamily(next);
    if (pack) saveMomDraft(pack);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
  }

  function stampAwardsOnFamily(family) {
    const next = normalizeFamily(family);
    next.overlay.awards = {
      streaks: next.streaks || {},
      characterUnlocks: asUnlockMap(next.characterUnlocks),
      gearUnlocks: asUnlockMap(next.gearUnlocks),
      contentUnlocks: asUnlockMap(next.contentUnlocks),
      unlocks: getUnlocks(),
      loginDays: asYmdList(next.loginDays),
      updatedAt: nowIso()
    };
    stampOverlay(next);
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
  }

  function applyOverlayAchievements(cloud) {
    const pack = normalizeAchievementsPack(cloud);
    if (!pack.achievements.length) return getMomDraft();
    const next = {
      currency: pack.currency || currency({}),
      achievements: pack.achievements,
      updatedAt: pack.updatedAt
    };
    saveMomDraft(mergeAchievementUnlocks(next, shippedAchievements));
    return getMomDraft();
  }

  function applyOverlayAwards(family, cloud) {
    const awards = normalizeAwardsPack(cloud);
    if (!awards.updatedAt && !Object.keys(awards.streaks).length && !Object.keys(awards.characterUnlocks).length && !(awards.loginDays && awards.loginDays.length)) {
      return normalizeFamily(family);
    }
    const next = normalizeFamily(family);
    next.streaks = Object.assign({}, next.streaks, awards.streaks);
    if (awards.updatedAt) {
      next.characterUnlocks = mergeCharacterUnlockMaps(asUnlockMap(awards.characterUnlocks), next.characterUnlocks, awards.streaks);
      next.gearUnlocks = Object.assign({}, asUnlockMap(next.gearUnlocks), asUnlockMap(awards.gearUnlocks));
      next.contentUnlocks = Object.assign({}, asUnlockMap(next.contentUnlocks), asUnlockMap(awards.contentUnlocks));
      saveCharacterUnlocks(next.characterUnlocks);
      saveGearUnlocks(next.gearUnlocks);
      saveContentUnlocks(next.contentUnlocks);
      if (awards.unlocks && typeof awards.unlocks === "object") write(KEYS.unlocks, awards.unlocks);
    } else {
      next.characterUnlocks = Object.assign({}, next.characterUnlocks, awards.characterUnlocks);
      next.gearUnlocks = Object.assign({}, next.gearUnlocks, awards.gearUnlocks);
      next.contentUnlocks = Object.assign({}, next.contentUnlocks, awards.contentUnlocks);
      saveCharacterUnlocks(Object.assign({}, getCharacterUnlocks(), awards.characterUnlocks));
      saveGearUnlocks(Object.assign({}, getGearUnlocks(), awards.gearUnlocks));
      saveContentUnlocks(Object.assign({}, getContentUnlocks(), awards.contentUnlocks));
      if (awards.unlocks && typeof awards.unlocks === "object") {
        write(KEYS.unlocks, Object.assign({}, getUnlocks(), awards.unlocks));
      }
    }
    next.loginDays = asYmdList([].concat(next.loginDays || [], awards.loginDays || []));
    write(KEYS.loginDays, asYmdList([].concat(read(KEYS.loginDays, []) || [], next.loginDays)));
    next.overlay.awards.loginDays = next.loginDays;
    saveFamily(next);
    return next;
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
    const uploaded = await uploadLibraryFile(item, file);
    if (uploaded) {
      item.url = uploaded.url;
      item.storagePath = uploaded.path;
    }
    next.items.push(item);
    saveMomLibrary(next);
    if (lib && Array.isArray(lib.items)) lib.items = next.items;
    stampLibraryOnFamily(next);
    return { ok: true, item, library: next, cloud: !!item.url };
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
    const url = String(item.url || "").trim();
    const path = String(item.path || "").trim();
    if (url === "#") return "#";
    if (url && isSafeHttpUrl(url)) return url;
    if (item.device) {
      const blobUrl = libraryBlobUrl(item.id);
      if (blobUrl) return blobUrl;
    }
    if (path && (isLocalLibraryPath(path) || isSafeHttpUrl(path))) return path;
    return "";
  }

  function libraryOnBoard(item) {
    return !!(item && isSafeHttpUrl(item.url));
  }

  function libraryBoardLabel(item) {
    if (!item) return "";
    if (item.synth) return "Generated beep";
    if (libraryOnBoard(item)) return "On the family board";
    if (item.device) return "This device only" + (item.filename ? " · " + item.filename : "");
    return item.path || item.url || "—";
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
    const storagePath = String(src.storagePath || "").trim();
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
      storagePath,
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

  function pickLibraryUrl(a, b) {
    if (isSafeHttpUrl(a)) return String(a || "").trim();
    if (isSafeHttpUrl(b)) return String(b || "").trim();
    return String(a || b || "").trim();
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
      const shippedFile = !!(ship.path && isLocalLibraryPath(ship.path));
      items.push(normalizeLibraryItem({
        id: ship.id,
        label: mom.label || ship.label,
        path: ship.path || mom.path,
        url: shippedFile ? ship.url : pickLibraryUrl(mom.url, ship.url),
        poster: ship.poster || mom.poster,
        kind: ship.kind || mom.kind,
        character: keepDraftCharacter(ship, mom),
        slot: ship.slot || mom.slot,
        synth: ship.synth || mom.synth,
        device: shippedFile ? false : !!(ship.device || mom.device),
        filename: mom.filename || ship.filename,
        mime: mom.mime || ship.mime,
        storagePath: mom.storagePath || ship.storagePath,
        test: !!(ship.test || mom.test)
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

  function libraryCatalog(lib) {
    return {
      items: normalizeLibrary(lib || { items: [] }).items.map((item) => ({
        id: item.id,
        label: item.label,
        path: item.path,
        url: item.url,
        poster: item.poster,
        kind: item.kind,
        character: item.character,
        slot: item.slot,
        synth: item.synth,
        device: item.device,
        filename: item.filename,
        mime: item.mime,
        storagePath: item.storagePath || "",
        test: !!item.test
      }))
    };
  }

  function applyOverlayLibrary(cloud) {
    const cloudLib = normalizeLibrary(cloud || { items: [] });
    if (!cloudLib.items.length) return getMomLibrary();
    const mom = getMomLibrary() || { items: [] };
    const next = mergeLibrary(mom, cloudLib);
    saveMomLibrary(next);
    return next;
  }

  async function pushLocalLibraryToCloud(lib) {
    const next = normalizeLibrary(lib || getMomLibrary() || { items: [] });
    let changed = false;
    for (let i = 0; i < next.items.length; i += 1) {
      const item = next.items[i];
      if (!item || !item.device || libraryOnBoard(item)) continue;
      const rec = await getLibraryBlob(item.id);
      if (!rec || !rec.blob) continue;
      const uploaded = await uploadLibraryFile(item, rec.blob);
      if (!uploaded) continue;
      item.url = uploaded.url;
      item.storagePath = uploaded.path;
      changed = true;
    }
    if (changed) {
      saveMomLibrary(next);
      stampLibraryOnFamily(next);
    }
    return next;
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
    const family = getFamilyDraft();
    const cloud = family && family.overlay ? family.overlay.library : null;
    const lib = mergeLibrary(shipped, mergeLibrary(draft || { items: [] }, cloud || { items: [] }));
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
        ? `<div class="lib-preview"><video class="lib-play" src="${esc(src)}" poster="${esc(item.poster || "")}" controls playsinline></video><button type="button" class="btn primary" data-play-preview>Play</button></div>`
        : `<p class="empty">${item.device ? "On this device — file is still loading." : "No video path."}</p>`;
    }
    if (item.kind === "image") {
      return src
        ? `<div class="lib-preview"><img class="lib-play" src="${esc(src)}" alt=""></div>`
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

  function bindLibraryPreviewPlay() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    if (document.documentElement && document.documentElement.dataset.libPreviewPlayBound === "1") return;
    if (document.documentElement) document.documentElement.dataset.libPreviewPlayBound = "1";
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest && e.target.closest("[data-play-preview]");
      if (!btn) return;
      e.preventDefault();
      const wrap = (btn.closest && btn.closest(".lib-preview")) || btn.parentNode;
      const media = wrap && wrap.querySelector ? wrap.querySelector("video, audio") : null;
      if (!media) return;
      if (media.paused) {
        Promise.resolve(media.play()).catch(function () {});
        btn.textContent = "Pause";
      } else {
        media.pause();
        btn.textContent = "Play";
      }
    });
  }

  function bananasOf(ach) {
    if (!ach) return 0;
    if (typeof ach.bananas === "number") return Number(ach.bananas) || 0;
    if (typeof ach.reward === "number") return Number(ach.reward) || 0;
    return 0;
  }

  function rewardMediaId(ach) {
    if (ach && ach.rewardMedia) return String(ach.rewardMedia);
    const unlock = rewardUnlockOf(ach);
    if (unlock && unlock.type === "content") return String(unlock.id || "");
    return "";
  }

  function libraryItemNamed(lib, name) {
    const want = String(name || "").replace(/\.[^.]+$/, "").trim().toLowerCase();
    if (!want) return null;
    const items = ((lib && lib.items) || []).filter((item) => item && (item.kind === "audio" || item.synth));
    const exact = items.find((item) => {
      const label = String(item.label || "").replace(/\.[^.]+$/, "").trim().toLowerCase();
      const file = String(item.filename || "").replace(/\.[^.]+$/, "").trim().toLowerCase();
      const id = String(item.id || "").toLowerCase();
      return label === want || file === want || id === want;
    });
    if (exact) return exact;
    return items.find((item) => {
      const blob = (String(item.label || "") + " " + String(item.filename || "") + " " + String(item.id || "")).toLowerCase();
      return blob.indexOf(want) >= 0;
    }) || null;
  }

  function rewardMediaItem(ach, lib) {
    const id = rewardMediaId(ach);
    if (!id) {
      if (ach && ach.id === "test-riff-reps") return libraryItemNamed(lib, "chunky");
      return null;
    }
    return libraryItem(lib, id) || libraryItemNamed(lib, id);
  }

  function playAwardMedia(ach, lib) {
    const item = rewardMediaItem(ach, lib);
    if (!item) return false;
    if (item.kind === "audio" || item.synth) {
      if (playLibraryItem(item)) return true;
      void playLibraryItemNow(item);
      return true;
    }
    if (item.kind === "link") return playContentReward(item);
    return false;
  }

  function playAwardSound(ach, family, lib) {
    if (playAwardMedia(ach, lib)) return true;
    if (ach && ach.id === "test-riff-reps") {
      const chunky = libraryItemNamed(lib, "chunky");
      if (chunky) {
        if (playLibraryItem(chunky)) return true;
        void playLibraryItemNow(chunky);
        return true;
      }
    }
    return playSoundCue(family, lib, "streak-award");
  }

  function unlockCopy(ach) {
    if (!ach) return "";
    return String(ach.description || ach.how || ach.incentive || "").trim();
  }

  function achievementGrantingCharacter(pack, characterId) {
    if (!characterId) return null;
    const rows = ((pack && pack.achievements) || []).filter((ach) => {
      if (!ach || rewardCharacterId(ach) !== characterId) return false;
      return alreadyUnlocked(ach.id) && !achievementIsPreviewOnly(ach.id);
    });
    if (characterId === "scorch") {
      const live = rows.find((ach) => ach && ach.id === SCORCH_LIVE_ACHIEVEMENT);
      if (live) return live;
    }
    return rows[0] || null;
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
    getSharedAudioContext();
    if (item.synth) {
      stopLibraryAudio();
      return playSynth(item.synth);
    }
    if (item.kind !== "audio") return false;
    const src = librarySrc(item);
    if (src && playHtmlAudio(src)) {
      void decodeLibraryItem(item).catch(function () {});
      return true;
    }
    return false;
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
    next.overlay = normalizeOverlay(next.overlay);
    next.overlay.soundCues = asCueMap(next.soundCues);
    next.overlay.updatedAt = nowIso();
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
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
    if (playSoundCue(family, lib, ids.fallback)) return true;
    return playSoundCue(family, lib, "tables");
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

  function bindAudioUnlock() {
    if (!global.document || !document.addEventListener) return;
    if (document.documentElement && document.documentElement.getAttribute("data-audio-unlock") === "on") return;
    if (document.documentElement && document.documentElement.setAttribute) {
      document.documentElement.setAttribute("data-audio-unlock", "on");
    }
    const unlock = () => {
      try { primeLibraryAudio(); } catch (_) {}
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
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
          persist(setSoundCue(family, momentId, soundId), "Saved. Bennett hears this on This Week.");
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

  function mergeAskThreads(localRaw, remoteRaw) {
    const local = normalizeAskThread(localRaw);
    const remote = normalizeAskThread(remoteRaw);
    const byId = Object.create(null);
    local.messages.forEach((m) => { if (m && m.id) byId[m.id] = m; });
    remote.messages.forEach((m) => {
      if (!m || !m.id) return;
      if (!byId[m.id]) byId[m.id] = m;
    });
    const messages = Object.keys(byId).map((id) => byId[id])
      .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
    return { messages };
  }

  function applyOverlayAsk(cloud) {
    const remote = normalizeAskThread(cloud);
    if (!remote.messages.length) return getAskThread();
    const next = mergeAskThreads(getAskThread(), remote);
    const family = getFamilyDraft();
    next.messages = pruneAskMessages(next.messages, family && family.deletedNotes);
    saveAskThread(next);
    return next;
  }

  function stampAskOnFamily(thread) {
    const family = getFamilyDraft();
    if (!family) return null;
    family.overlay = normalizeOverlay(family.overlay);
    family.overlay.ask = normalizeAskThread(thread || getAskThread());
    family.overlay.updatedAt = nowIso();
    saveFamily(family);
    if (!overlaySyncing) queueOverlayPush(family);
    return family;
  }

  function addAskMessage(thread, msg) {
    const next = normalizeAskThread(thread);
    next.messages = next.messages.concat([Object.assign({ id: uid("ask"), at: nowIso() }, msg)]);
    saveAskThread(next);
    stampAskOnFamily(next);
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

  function normalizeBasecampQuery(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = String(raw.text || "");
    const hasImage = !!raw.hasImage;
    if (!text && !hasImage && !raw.sessionId && !raw.classId) return null;
    return {
      id: String(raw.id || uid("bq")),
      at: raw.at || nowIso(),
      classId: String(raw.classId || "").trim(),
      className: String(raw.className || "").trim(),
      sessionId: String(raw.sessionId || "").trim(),
      sessionTitle: String(raw.sessionTitle || "").trim(),
      text: text,
      hasImage: hasImage,
      view: String(raw.view || "").trim()
    };
  }

  function normalizeBasecampQueries(raw) {
    return Array.isArray(raw) ? raw.map(normalizeBasecampQuery).filter(Boolean) : [];
  }

  function listBasecampQueries(family) {
    return normalizeFamily(family).basecampQueries.slice();
  }

  function recordBasecampQuery(family, query) {
    const next = normalizeFamily(family);
    const row = normalizeBasecampQuery(Object.assign({
      id: uid("bq"),
      at: nowIso()
    }, query || {}));
    if (!row) return { family: next, query: null };
    next.basecampQueries = next.basecampQueries.concat([row]);
    saveFamily(next);
    return { family: next, query: row };
  }

  function deleteBasecampSession(family, sessionId) {
    const id = String(sessionId || "");
    const next = normalizeFamily(family);
    const removed = next.basecamp.sessions.find((s) => s && s.id === id) || null;
    if (!removed) return { family: next, session: null };
    const sessions = next.basecamp.sessions.filter((s) => s && s.id !== id);
    const saved = persistBasecamp(next, { sessions: sessions });
    const keep = new Set(basecampImageIds(saved));
    (removed.messages || []).forEach((m) => {
      const imageId = m && m.imageId;
      if (!imageId || keep.has(imageId)) return;
      Promise.resolve(deleteLibraryBlob(imageId)).catch(() => {});
    });
    return { family: saved, session: removed };
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

  function checkinGroupKey(row) {
    if (row && row.promptId) return String(row.promptId);
    const prompt = String((row && row.prompt) || "").trim().toLowerCase();
    return prompt || "checkin";
  }

  function groupCheckinsByPrompt(family) {
    const pool = ((family && family.reflections && family.reflections.pool) || []).filter((p) => p && p.id && p.text);
    const answers = ((family && family.reflections && family.reflections.answers) || []).slice()
      .filter((a) => a && String(a.text || "").trim())
      .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    const groups = Object.create(null);
    pool.forEach((p) => {
      groups[p.id] = { id: p.id, prompt: p.text, answers: [], latest: "" };
    });
    answers.forEach((a) => {
      const key = checkinGroupKey(a);
      if (!groups[key]) groups[key] = { id: key, prompt: a.prompt || "Quick check-in", answers: [], latest: "" };
      if (a.prompt) groups[key].prompt = a.prompt;
      groups[key].answers.push(a);
      const at = String(a.at || "");
      if (at > groups[key].latest) groups[key].latest = at;
    });
    const filled = [];
    const idle = [];
    Object.keys(groups).forEach((key) => {
      const g = groups[key];
      if (g.answers.length) filled.push(g);
      else idle.push(g);
    });
    filled.sort((a, b) => String(b.latest || "").localeCompare(String(a.latest || "")));
    return { filled, idle };
  }

  function checkinsListHtml(family) {
    const prompt = todaysReflectionPrompt(family);
    const today = prompt
      ? `<p class="checkin-today">Today: ${esc(prompt.text)}</p>`
      : "";
    const grouped = groupCheckinsByPrompt(family);
    if (!grouped.filled.length) {
      return `${today}<p class="empty">Bennett’s answers from This Week show up here. Mom and Dad both see this log.</p>`;
    }
    const groups = grouped.filled.map((g) => `
      <article class="checkin-group">
        <h3>${esc(g.prompt)}</h3>
        <ul class="checkin-list">${g.answers.map((a) => `
          <li>
            <p class="checkin-text">${esc(a.text)}</p>
            <p class="checkin-stamp">${esc(fmtStamp(a.at))}</p>
          </li>`).join("")}</ul>
      </article>`).join("");
    return `${today}${groups}`;
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

  function gradesFromWeek(week) {
    return Array.isArray(week && week.grades) ? week.grades.slice() : [];
  }

  function gradeClassId(classId) {
    if (classId && typeof classId === "object") return String(classId.id || "");
    return String(classId || "");
  }

  function gradeForClass(week, classId) {
    const key = gradeClassId(classId);
    if (!key) return null;
    return gradesFromWeek(week).find((row) => row && String(row.classId) === key) || null;
  }

  function gradeAsOfLabel(asOf) {
    const raw = String(asOf || "").trim();
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    return Number(m[2]) + "/" + Number(m[3]);
  }

  function gradeHasMark(row) {
    const letter = String((row && row.letter) || "").trim();
    const hasLetter = !!(letter && !/^n\/?a$/i.test(letter) && letter !== "—" && letter !== "-");
    const hasPercent = row && row.percent != null && row.percent !== "" && !Number.isNaN(Number(row.percent));
    return { letter: hasLetter ? letter : "", hasPercent: !!hasPercent };
  }

  function gradePillModel(row) {
    if (!row) return null;
    const mark = gradeHasMark(row);
    if (!mark.letter && !mark.hasPercent) return null;
    const display = [mark.letter, mark.hasPercent ? (String(row.percent) + "%") : ""].filter(Boolean).join(" ");
    const sourceBits = [row.source ? String(row.source).trim() : "", gradeAsOfLabel(row.as_of)].filter(Boolean);
    const detailBits = [row.detail ? String(row.detail).trim() : "", sourceBits.join(" ")].filter(Boolean);
    return {
      display,
      detail: detailBits.join(" · ")
    };
  }

  function gradeHtml(grade, extraTest) {
    if (!grade || (!grade.display && !grade.detail)) return "";
    const test = !!(grade.test || extraTest);
    return `<span class="grade-pill${test ? " is-test" : ""}">${test ? '<span class="test-tag">TEST</span> ' : ""}${esc(grade.display || "—")}${grade.detail && grade.detail !== grade.display ? `<span class="grade-detail">${esc(grade.detail)}</span>` : ""}</span>`;
  }

  function gradePillHtml(week, classId) {
    return gradeHtml(gradePillModel(gradeForClass(week, classId)));
  }

  const CLASS_SHORT_LABELS = {
    band: "Band",
    sociology: "Soc",
    "web-design": "Web",
    "academic-intervention": "Seminar",
    chemistry: "Chem",
    strength: "Lift",
    "english-10": "Eng",
    geometry: "Geo"
  };

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

  function classShortLabel(id) {
    const key = String(id || "").toLowerCase();
    return CLASS_SHORT_LABELS[key] || classNameForId(key) || key;
  }

  function ymdFromLocal(value) {
    if (!value && value !== 0) return "";
    if (typeof value === "object" && typeof value.getFullYear === "function") {
      if (Number.isNaN(value.getTime())) return "";
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    }
    const s = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    return "";
  }

  function localDateFromYmd(ymd) {
    const [y, m, d] = String(ymd || "").split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  const WORK_STATUSES = ["open", "submitted", "graded", "missing", "late", "excused"];

  function parseWorkNoteHints(note) {
    const text = String(note || "");
    const scoreHit = text.match(/\b(\d+)\s*\/\s*(\d+)\b/);
    return {
      missed: /\bMISSED\b/i.test(text),
      notSubmitted: /not submitted/i.test(text),
      score: scoreHit ? scoreHit[1] + "/" + scoreHit[2] : ""
    };
  }

  function normalizeWorkStatus(raw) {
    const s = String(raw || "").toLowerCase().trim();
    return WORK_STATUSES.indexOf(s) >= 0 ? s : "";
  }

  function scoreLooksZero(score) {
    const s = String(score || "").trim();
    if (!s) return false;
    if (/^0+(?:\.0+)?\s*\/\s*\d+/.test(s)) return true;
    if (/^0+(?:\.0+)?%$/.test(s)) return true;
    return s === "0" || s === "0.0";
  }

  function dueMinutesFromIso(iso) {
    const m = String(iso || "").match(/T(\d{2}):(\d{2})/);
    if (!m) return 23 * 60 + 59;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function chicagoHm(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date || new Date());
    const get = (t) => (parts.find((p) => p.type === t) || {}).value || "00";
    return Number(get("hour")) * 60 + Number(get("minute"));
  }

  function loadWorkDisputes() {
    const raw = read(KEYS.workDisputes, {});
    return raw && typeof raw === "object" ? raw : {};
  }

  function workDisputeOf(work) {
    const id = work && work.id;
    const local = id ? loadWorkDisputes()[id] : null;
    const feed = work && work.dispute && typeof work.dispute === "object" ? work.dispute : null;
    if (local && local.want_contact) return local;
    if (feed && feed.want_contact) return feed;
    return local || feed || null;
  }

  function setWorkDispute(id, dispute) {
    const key = String(id || "");
    if (!key) return null;
    const all = loadWorkDisputes();
    if (!dispute) delete all[key];
    else all[key] = dispute;
    write(KEYS.workDisputes, all);
    return all[key] || null;
  }

  function markWorkLooksWrong(work, reason) {
    const id = work && work.id;
    if (!id) return null;
    return setWorkDispute(id, {
      reason: String(reason || "we think this was turned in").trim() || "we think this was turned in",
      want_contact: true,
      at: nowIso()
    });
  }

  function normalizeStudentStatus(raw) {
    const s = String(raw || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
    if (s === "done" || s === "complete" || s === "completed" || s === "yes" || s === "true" || s === "submitted") return "done";
    if (s === "not_done" || s === "open" || s === "no" || s === "false" || s === "todo" || s === "notdone") return "not_done";
    return "";
  }

  function studentStatusRecord(raw) {
    if (raw == null || raw === "") return null;
    if (typeof raw === "object") {
      const said = raw.said != null ? String(raw.said).trim() : "";
      const status = normalizeStudentStatus(raw.status || raw.said);
      return {
        said,
        source: raw.source != null ? String(raw.source) : "",
        as_of: raw.as_of || "",
        done: status === "done",
        notDone: status === "not_done"
      };
    }
    const status = normalizeStudentStatus(raw);
    return {
      said: String(raw).trim(),
      source: "",
      as_of: "",
      done: status === "done",
      notDone: status === "not_done"
    };
  }

  function studentHasClaim(work) {
    const rec = studentStatusRecord(work && work.student_status);
    if (!rec) return false;
    if (rec.said) return true;
    return !!(rec.done || rec.notDone);
  }

  function studentSaysDone(work) {
    const rec = studentStatusRecord(work && work.student_status);
    if (rec && rec.notDone) return false;
    if (rec && rec.done) return true;
    if (rec && rec.said) return true;
    try {
      const st = work && work.id ? workState(work.id) : null;
      if (st && st.done) return true;
    } catch (_) {}
    return false;
  }

  function schoolLooksUnloggedFromBits(bits) {
    const school = (bits && (bits.schoolStatus || bits.status)) || "";
    if (school === "missing" || school === "open") return true;
    if (bits && bits.zero) return true;
    if (school === "late" && bits && !bits.submitted) return true;
    return false;
  }

  function parseFollowupSnoozeYmd(raw) {
    const s = String(raw || "").trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }

  function followupSnoozeUntil(work) {
    const id = work && work.id;
    const fromWork = parseFollowupSnoozeYmd(work && (work.followupSnoozeUntil || (work.followup && work.followup.snooze_until)));
    let fromEdit = "";
    try {
      const fam = getFamilyDraft();
      const edit = id && fam && fam.overlay && fam.overlay.progress && fam.overlay.progress.itemEdits
        ? fam.overlay.progress.itemEdits[id]
        : null;
      fromEdit = parseFollowupSnoozeYmd(edit && edit.followupSnoozeUntil);
    } catch (_) {}
    return fromEdit || fromWork;
  }

  function followupIsSnoozed(work, now) {
    const until = followupSnoozeUntil(work);
    if (!until) return false;
    const today = chicagoYmd(now || new Date());
    return !!today && until > today;
  }

  function workFollowupClosedFromBits(bits) {
    if (!bits) return false;
    if (bits.excused) return true;
    if (bits.graded && !bits.zero) return true;
    return false;
  }

  function setFollowupSnooze(workId, ymd, family) {
    const id = String(workId || "").trim();
    if (!id) return family || getFamilyDraft();
    const next = family || getFamilyDraft() || emptyFamily();
    return editProgressItem(next, id, { followupSnoozeUntil: parseFollowupSnoozeYmd(ymd) });
  }

  function emitFollowupChanged() {
    try {
      if (typeof document !== "undefined" && document.dispatchEvent) {
        document.dispatchEvent(new CustomEvent("bw-followup-changed"));
      }
    } catch (_) {}
  }

  function discrepancyFromBits(work, bits, now) {
    if (!work || String(work.kind || "") === "event") return false;
    if (workFollowupClosedFromBits(bits)) return false;
    if (followupIsSnoozed(work, now)) return false;
    if (work.discrepancy === false || work.discrepancy === "false") return false;
    if (work.discrepancy === true || work.discrepancy === "true") return true;
    if (!studentSaysDone(work)) return false;
    return schoolLooksUnloggedFromBits(bits);
  }

  function workIsDiscrepancy(work, now) {
    if (!work || String(work.kind || "") === "event") return false;
    return !!(workFeedStatus(work, now) || {}).discrepancy;
  }

  function addChicagoDaysYmd(ymd, days) {
    const [y, m, d] = String(ymd || "").split("-").map(Number);
    if (!y || !m || !d) return "";
    const x = new Date(y, m - 1, d);
    x.setDate(x.getDate() + Number(days || 0));
    const yy = x.getFullYear();
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    const dd = String(x.getDate()).padStart(2, "0");
    return yy + "-" + mm + "-" + dd;
  }

  function defaultFollowupDueBy(submittedAt) {
    if (!submittedAt) return "";
    const ymd = ymdFromLocal(submittedAt) || chicagoYmd(new Date(submittedAt));
    if (!ymd || ymd.indexOf("NaN") >= 0) return "";
    const next = addChicagoDaysYmd(ymd, 2);
    return next ? next + "T17:00:00" : "";
  }

  function fmtChicagoLongDay(iso) {
    if (!iso) return "";
    const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        month: "long",
        day: "numeric"
      }).formatToParts(d);
      const get = (t) => (parts.find((p) => p.type === t) || {}).value || "";
      const month = get("month");
      const day = get("day");
      return month && day ? month + " " + day : "";
    }
    const ymd = ymdFromLocal(iso);
    if (!ymd) return "";
    const [y, m, day] = ymd.split("-").map(Number);
    if (!y || !m || !day) return "";
    return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }

  function schoolSourceLabel(work) {
    const s = String((work && work.source) || "").toLowerCase();
    if (s === "canvas") return "Canvas";
    if (s === "parentvue" || s === "parent vue" || s === "parent_vue") return "ParentVUE";
    return "Canvas/ParentVUE";
  }

  function teacherFromNote(note) {
    const text = String(note || "").trim();
    const two = text.match(/^([A-Z][A-Za-z'`-]+)\s+([A-Z][A-Za-z'`-]+)(?=[.,])/);
    if (two) return (two[1] + " " + two[2]).trim();
    const one = text.match(/^([A-Z][A-Za-z'`-]+)(?=\.\s|[.])/);
    if (one && !/^(Dad|Mom|Today|Still|Official|In)$/i.test(one[1])) return one[1];
    const named = text.match(/\b(?:Mr\.?\/Ms\.?|Mr\.?|Ms\.?|Mrs\.?)\s+([A-Z][A-Za-z'`-]+)/);
    if (named) return named[1];
    return "";
  }

  function teacherForWork(work, classes) {
    const fromNote = teacherFromNote(work && work.note);
    if (fromNote) return fromNote;
    const cid = classIdForWork(work);
    const cls = (classes || []).find((c) => c && c.id === cid);
    if (cls && cls.teacher) return String(cls.teacher).trim();
    return "";
  }

  function teacherHonorific(name) {
    const raw = String(name || "").trim();
    if (!raw) return "Mr./Ms. Teacher";
    if (/^mr\.?\/ms\.?/i.test(raw) || /^mr\.?\s/i.test(raw) || /^ms\.?\s/i.test(raw) || /^mrs\.?\s/i.test(raw)) return raw;
    return "Mr./Ms. " + raw;
  }

  function defaultTeacherEmailDraft(work, classes, now) {
    const st = workFeedStatus(work, now);
    const teacher = teacherHonorific(teacherForWork(work, classes));
    const assignment = wTitleStrip(work && work.title) || "this";
    const when = fmtChicagoLongDay(st.submittedAt || (work && work.submitted_at));
    const source = schoolSourceLabel(work);
    const school = st.schoolStatus || st.status || "";
    const turned = when ? ("I turned " + assignment + " in on " + when) : ("I turned " + assignment + " in");
    const notice = school && school !== "submitted" && school !== "graded"
      ? ("I notice it's still " + school + " in " + source + ".")
      : ("I notice it's not updated in " + source + ".");
    return "Hey " + teacher + ", " + turned + ". Please let me know if there is an issue. " + notice;
  }

  function followupEmailSent(raw) {
    if (!raw || typeof raw !== "object") return false;
    if (raw.email_sent === true || raw.email_sent === "true") return true;
    if (raw.email_sent === false || raw.email_sent === "false") return false;
    return !!(raw.sent_at);
  }

  function workFollowup(work, classes, now) {
    const raw = (work && work.followup && typeof work.followup === "object") ? work.followup : {};
    const email = String(raw.email_draft || "").trim() || defaultTeacherEmailDraft(work, classes, now);
    return {
      due_by: raw.due_by || "",
      email_draft: email,
      email_sent: followupEmailSent(raw),
      sent_at: raw.sent_at || ""
    };
  }

  function discrepancyWork(week, now) {
    const clock = now || new Date();
    return ((week && week.work) || []).filter((w) => workIsDiscrepancy(w, clock)).slice().sort((a, b) => {
      const af = workFollowup(a, null, clock);
      const bf = workFollowup(b, null, clock);
      return String(af.due_by || a.due || "").localeCompare(String(bf.due_by || b.due || ""));
    });
  }

  function checkinModeFromSearch(search) {
    try {
      const q = new URLSearchParams(search || (typeof location !== "undefined" ? location.search : ""));
      const raw = String(q.get("checkin") || "").toLowerCase();
      if (raw === "after-school" || raw === "afterschool" || raw === "after_school" || raw === "home") return "after-school";
      if (raw === "bedtime" || raw === "bed" || raw === "night") return "bedtime";
    } catch (_) {}
    return "";
  }

  function defaultCheckinMode(now) {
    const mins = chicagoHm(now || new Date());
    if (mins >= 20 * 60) return "bedtime";
    return "after-school";
  }

  function resolvedCheckinMode(search, now) {
    return checkinModeFromSearch(search) || defaultCheckinMode(now);
  }

  function checkinModeLabel(mode) {
    if (mode === "bedtime") return "Bedtime check";
    return "After-school check";
  }

  function schoolVsStudentLine(work, now) {
    const st = workFeedStatus(work, now);
    const rec = studentStatusRecord(work && work.student_status);
    const schoolBits = [];
    if (st.schoolStatus) schoolBits.push(st.schoolStatus.charAt(0).toUpperCase() + st.schoolStatus.slice(1));
    if (st.score) schoolBits.push(st.score);
    if (st.submittedAt) schoolBits.push("submitted " + fmtStamp(st.submittedAt));
    schoolBits.push(schoolSourceLabel(work));
    const studentBits = [];
    if (rec && rec.said && !rec.done && !rec.notDone) studentBits.push(rec.said);
    else if (rec && rec.done) studentBits.push(rec.said && rec.said.toLowerCase() !== "done" ? rec.said : "Marked done");
    else if (rec && rec.notDone) studentBits.push("Not done here");
    else if (studentSaysDone(work)) studentBits.push("Marked done");
    else studentBits.push("No student claim");
    return {
      school: schoolBits.filter(Boolean).join(" · "),
      student: studentBits.filter(Boolean).join(" · ")
    };
  }

  function mailtoHref(subject, body) {
    return "mailto:?subject=" + encodeURIComponent(subject || "") + "&body=" + encodeURIComponent(body || "");
  }

  function emailsToSend(week, now) {
    return discrepancyWork(week, now).filter((w) => !workFollowup(w, null, now).email_sent);
  }

  function followupCardHtml(work, classes, now) {
    const clock = now || new Date();
    const st = workFeedStatus(work, clock);
    const follow = workFollowup(work, classes, clock);
    const vs = schoolVsStudentLine(work, clock);
    const cid = st.classId;
    const deadline = follow.due_by
      ? (follow.email_sent ? "Already sent" : "Send by " + (fmtStamp(follow.due_by) || follow.due_by) + " if still unlogged")
      : (follow.email_sent ? "Already sent" : "Ready to send if school still has not logged it");
    const subject = wTitleStrip(work && work.title) || "Assignment update";
    const reason = work && work.discrepancy_reason
      ? `<p class="followup-reason">${esc(work.discrepancy_reason)}</p>`
      : "";
    const sent = follow.email_sent
      ? `<p class="followup-sent">Parenting recorded email_sent.</p>`
      : "";
    return `
      <article class="followup-card" id="followup-${esc(work.id)}" data-followup-work="${esc(work.id)}">
        <div class="followup-head">
          <span class="followup-class">${esc(classShortLabel(cid) || classNameForId(cid) || cid)}</span>
          <span class="followup-copy">
            <span class="followup-title">${esc(wTitleStrip(work.title))}</span>
            ${workStatusChipsHtml(work, clock)}
          </span>
        </div>
        <div class="followup-vs">
          <div class="followup-vs-row"><span>School</span> ${esc(vs.school)}</div>
          <div class="followup-vs-row"><span>Bennett</span> ${esc(vs.student)}</div>
        </div>
        <p class="followup-deadline">${esc(deadline)}</p>
        ${reason}
        ${sent}
        <div class="followup-snooze">
          <label class="followup-snooze-label">Snooze until
            <input type="date" class="followup-snooze-date" data-followup-snooze="${esc(work.id)}" value="${esc(followupSnoozeUntil(work))}" min="${esc(chicagoYmd(clock))}">
          </label>
        </div>
        <p class="followup-snooze-hint">Hides until that day. If school grades it first, it leaves this list on its own.</p>
        <label class="followup-email-label">Teacher email
          <textarea class="followup-email" readonly rows="4">${esc(follow.email_draft)}</textarea>
        </label>
        <div class="followup-tools">
          <button type="button" class="btn primary" data-copy-email>Copy email</button>
          <a class="btn ghost" href="${esc(mailtoHref(subject, follow.email_draft))}">Open mail</a>
        </div>
      </article>`;
  }

  function followupSectionHtml(week, classes, now, opts) {
    const clock = now || new Date();
    const mode = (opts && opts.mode) || resolvedCheckinMode((opts && opts.search) || "", clock);
    const rows = discrepancyWork(week, clock);
    const pending = emailsToSend(week, clock);
    const checkinAsk = mode === "bedtime"
      ? "Before bed — do I need to send any emails?"
      : "Home from school — do I need to send any emails?";
    const answer = pending.length
      ? ("Yes — send " + pending.length + " teacher email" + (pending.length === 1 ? "" : "s"))
      : "No teacher emails to send";
    const afterHref = (opts && opts.page) || "progress.html";
    const sep = afterHref.indexOf("?") >= 0 ? "&" : "?";
    const cards = rows.length
      ? rows.map((w) => followupCardHtml(w, classes, clock)).join("")
      : `<p class="empty">No school-vs-Bennett discrepancies in week.json.</p>`;
    const collapsed = followupCollapsed();
    const count = pending.length || rows.length;
    const hint = collapsed ? (count ? "Show " + count : "Show") : "Hide";
    return `
      <button type="button" class="needs-you-toggle followup-toggle" data-followup-toggle aria-expanded="${collapsed ? "false" : "true"}">
        <span class="followup-toggle-title">Needs follow-up</span>
        <span class="needs-you-toggle-hint followup-toggle-hint">${esc(hint)}</span>
      </button>
      <div class="followup-fold"${collapsed ? " hidden" : ""}>
        <div class="followup-switch" role="tablist" aria-label="Check-in">
          <a class="followup-tab${mode === "after-school" ? " on" : ""}" href="${esc(afterHref + sep + "checkin=after-school")}#followup-pane" role="tab" aria-selected="${mode === "after-school" ? "true" : "false"}">After school</a>
          <a class="followup-tab${mode === "bedtime" ? " on" : ""}" href="${esc(afterHref + sep + "checkin=bedtime")}#followup-pane" role="tab" aria-selected="${mode === "bedtime" ? "true" : "false"}">Bedtime</a>
        </div>
        <div class="followup-answer${pending.length ? " yes" : " no"}">
          <p class="followup-kicker">${esc(checkinModeLabel(mode))} · ${esc(checkinAsk)}</p>
          <p class="followup-lead">${esc(answer)}</p>
        </div>
        <div class="followup-body">${cards}</div>
      </div>`;
  }

  function followupStripHtml(week, now, opts) {
    const clock = now || new Date();
    const pending = emailsToSend(week, clock);
    if (!pending.length) return "";
    const first = pending[0];
    const more = pending.length > 1 ? " + " + (pending.length - 1) + " more" : "";
    const collapsed = followupCollapsed();
    const hint = collapsed ? "Show " + pending.length : "Hide";
    const classes = (opts && opts.classes) || [];
    const cards = pending.map((w) => followupCardHtml(w, classes, clock)).join("");
    return `
      <button type="button" class="needs-you-toggle followup-toggle" data-followup-toggle aria-expanded="${collapsed ? "false" : "true"}">
        <span class="followup-toggle-title">Needs follow-up</span>
        <span class="needs-you-toggle-hint followup-toggle-hint">${esc(hint)}</span>
      </button>
      <div class="followup-fold"${collapsed ? " hidden" : ""}>
        <p class="followup-strip-copy">${esc(pending.length + " teacher email" + (pending.length === 1 ? "" : "s") + " · " + wTitleStrip(first.title) + more)}</p>
        ${cards}
      </div>`;
  }

  function followupCollapsed() {
    try {
      return read(KEYS.followupCollapsed, false) === true || read(KEYS.followupCollapsed, "") === "1";
    } catch (_) {
      return false;
    }
  }

  function setFollowupCollapsed(on) {
    write(KEYS.followupCollapsed, !!on);
    return !!on;
  }

  function bindFollowupToggle() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    if (document.documentElement && document.documentElement.dataset.followupToggleBound === "1") return;
    if (document.documentElement) document.documentElement.dataset.followupToggleBound = "1";
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest && e.target.closest("[data-followup-toggle]");
      if (!btn) return;
      e.preventDefault();
      const collapsed = setFollowupCollapsed(!followupCollapsed());
      const host = (btn.closest && (btn.closest("#followup-pane") || btn.closest("#followup-strip") || btn.closest(".followup-pane") || btn.closest(".followup-strip"))) || btn.parentNode;
      if (host && host.classList) host.classList.toggle("collapsed", collapsed);
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      const hint = btn.querySelector(".followup-toggle-hint");
      const fold = host && host.querySelector ? host.querySelector(".followup-fold") : null;
      const n = fold ? fold.querySelectorAll(".followup-card").length : 0;
      if (hint) hint.textContent = collapsed ? (n ? "Show " + n : "Show") : "Hide";
      if (fold) fold.hidden = collapsed;
    });
  }

  function bindFollowupCopy() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    if (document.documentElement && document.documentElement.dataset.followupCopyBound === "1") return;
    if (document.documentElement) document.documentElement.dataset.followupCopyBound = "1";
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest && e.target.closest("[data-copy-email]");
      if (!btn) return;
      e.preventDefault();
      const card = btn.closest ? btn.closest(".followup-card") : null;
      const ta = card && card.querySelector ? card.querySelector(".followup-email") : null;
      const text = ta ? String(ta.value || "") : "";
      const done = () => toast("Copied. Paste into a message to the teacher.");
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(done);
          return;
        }
      } catch (_) {}
      if (ta) {
        ta.focus();
        ta.select();
        try { document.execCommand("copy"); } catch (_) {}
      }
      done();
    });
  }

  function bindFollowupSnooze() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    if (document.documentElement && document.documentElement.dataset.followupSnoozeBound === "1") return;
    if (document.documentElement) document.documentElement.dataset.followupSnoozeBound = "1";
    document.addEventListener("change", (e) => {
      const input = e.target && e.target.closest && e.target.closest("[data-followup-snooze]");
      if (!input) return;
      const id = input.getAttribute("data-followup-snooze") || "";
      if (!id) return;
      const until = parseFollowupSnoozeYmd(input.value);
      setFollowupSnooze(id, until);
      if (until) toast("Snoozed until " + until + ".");
      else toast("Follow-up is back on the list.");
      emitFollowupChanged();
    });
  }

  const BENNETT_HELP_SECTIONS = [
    {
      id: "sign-in",
      title: "Sign in",
      body: "Use your Bennett login on this phone. If the bar says Not you, tap it and sign in again. Dad can Preview as Bennett or Mom. Your work stays yours."
    },
    {
      id: "this-week",
      title: "This week",
      body: "Seven day cards starting today. Class chips jump to a class. Week rally counts Started and Done for the week. Swipe, tap the dots, or use Prev / Next. Later sits under the week if something is not on these seven days."
    },
    {
      id: "assignments",
      title: "Assignments",
      body: "I started this stamps a time. Done marks it finished here. Undo is the small button next to the stamp. You can Edit an assignment. Add one if it is missing from the board. Delete is gone on purpose."
    },
    {
      id: "little-help",
      title: "A little help",
      body: "On due or start-this work, A little help is one first move. It will not finish the assignment. Talk it through opens Base Camp. Khan opens in a new tab when the class has a real course."
    },
    {
      id: "needs-you",
      title: "Needs you",
      body: "Open, late, or missing work that still needs you. Plan tells Mom and Dad what you are going to do. That list is on This Week and on Progress."
    },
    {
      id: "follow-up",
      title: "Needs follow-up",
      body: "School has not logged something you already finished. Copy the teacher email or open mail. Snooze until a date if it is a packet waiting to be turned in, then add a few days for grading. When school marks it submitted or graded, it leaves this list on its own."
    },
    {
      id: "trophy-room",
      title: "Trophy Room",
      body: "Tap Trophies to walk the treehouse. Look around and tap a glowing spot. Trophies you earned sit in the room. You cannot undo or edit awards here."
    },
    {
      id: "progress",
      title: "Progress",
      body: "Dash on a phone. Same Needs follow-up and Needs you, plus By class, grades the school posted, and check-ins. No made-up course grades. You can edit assignments. You cannot delete a class or undo a trophy."
    },
    {
      id: "crew",
      title: "Crew",
      body: "Characters you have earned. Locked teammates stay a silhouette. You unlock as you earn them, not by browsing a catalog."
    },
    {
      id: "basecamp",
      title: "Base Camp",
      body: "Jungle Jam Tutor. Type in the box. Paste a screenshot. Upload a photo or a PDF (first pages). He will walk the problem with you and will not fill in the packet. Pick the class, start a new climb when you need a fresh thread. Chem can open the periodic table full size."
    },
    {
      id: "story",
      title: "Story",
      body: "Shows on the bar after three teammates (not counting you). Short comic choices. Locked gear stays a silhouette."
    },
    {
      id: "messages",
      title: "Messages",
      body: "Daily questions, class asks, and replies. Newest day first. Delete removes that message everywhere."
    },
    {
      id: "khan",
      title: "Khan Academy",
      body: "Opens on Khan. No extra login. Real public courses only: ELA, grammar, HS Chemistry, Geometry. Band, Sociology, Web Design, Seminar, and Strength have no Khan link."
    },
    {
      id: "play",
      title: "Play",
      body: "If you unlock the egg game, Play appears on the bar. It is extra, not homework."
    }
  ];

  function helpNeedle(q) {
    return String(q || "").trim().toLowerCase();
  }

  function filterBennettHelp(q) {
    const needle = helpNeedle(q);
    if (!needle) return BENNETT_HELP_SECTIONS.slice();
    return BENNETT_HELP_SECTIONS.filter((row) => {
      const hay = ((row && row.title) || "") + " " + ((row && row.body) || "");
      return hay.toLowerCase().indexOf(needle) >= 0;
    });
  }

  function markHelpMatch(text, q) {
    const raw = String(text || "");
    const needle = helpNeedle(q);
    if (!needle) return esc(raw);
    const lower = raw.toLowerCase();
    let out = "";
    let i = 0;
    while (i < raw.length) {
      const hit = lower.indexOf(needle, i);
      if (hit < 0) {
        out += esc(raw.slice(i));
        break;
      }
      out += esc(raw.slice(i, hit)) + "<mark>" + esc(raw.slice(hit, hit + needle.length)) + "</mark>";
      i = hit + needle.length;
    }
    return out;
  }

  function bennettHelpCardHtml(row, q) {
    const item = row || {};
    return `<article class="help-article" id="help-${esc(item.id)}" data-help-id="${esc(item.id)}">
        <h2>${markHelpMatch(item.title, q)}</h2>
        <p>${markHelpMatch(item.body, q)}</p>
      </article>`;
  }

  function bennettHelpBodyHtml(q) {
    const rows = filterBennettHelp(q);
    if (!rows.length) {
      const shown = esc(String(q || "").trim());
      return `<p class="help-empty">Nothing in Help matches "${shown}".</p>`;
    }
    return rows.map((row) => bennettHelpCardHtml(row, q)).join("");
  }

  function bennettHelpTocHtml(q) {
    const rows = filterBennettHelp(q);
    if (!rows.length) return "";
    const items = rows.map((row) => {
      return `<li><a class="help-toc-link" href="#help-${esc(row.id)}">${markHelpMatch(row.title, q)}</a></li>`;
    }).join("");
    return `<ol class="help-toc-list">${items}</ol>`;
  }

  function helpLaunchHtml(file) {
    const name = String(file || pageFile() || "").toLowerCase();
    const onHelp = name === "help.html";
    const extra = onHelp
      ? ' aria-current="page"'
      : ' target="_blank" rel="noopener noreferrer"';
    const label = onHelp ? "Help" : "Open Help in a new tab";
    return `<a class="help-launch${onHelp ? " on" : ""}" href="help.html"${extra} aria-label="${esc(label)}"><span class="help-launch-mark" aria-hidden="true">?</span><span class="help-launch-label">Help</span></a>`;
  }

  function mountHelpLaunch() {
    if (typeof document === "undefined" || !document.querySelectorAll) return null;
    const html = helpLaunchHtml();
    const hosts = [];
    Array.from(document.querySelectorAll(".hud-bar, .pt-head") || []).forEach((bar) => {
      if (bar) hosts.push(bar);
    });
    hosts.forEach((bar) => {
      const existing = bar.querySelector ? bar.querySelector(".help-launch") : null;
      if (!existing) {
        if (bar.insertAdjacentHTML) bar.insertAdjacentHTML("beforeend", html);
        return;
      }
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      const next = wrap.firstElementChild;
      if (next && existing.parentNode && existing.parentNode.replaceChild) {
        existing.parentNode.replaceChild(next, existing);
      }
    });
    return document.querySelector ? document.querySelector(".help-launch") : null;
  }

  function bennettHelpPageHtml(q) {
    const needle = String(q || "");
    const rows = filterBennettHelp(needle);
    const n = BENNETT_HELP_SECTIONS.length;
    const status = helpNeedle(needle)
      ? (rows.length ? rows.length + " match" + (rows.length === 1 ? "" : "es") : "No matches")
      : n + " topics";
    return `
      <header class="help-desk-head">
        <p class="help-desk-kicker">Bennett's screens</p>
        <h2 class="help-desk-title">How Jungle Jam works</h2>
        <p class="help-desk-lead">Your screens, in one place. This is not Mom or Dad's desk. Tap a topic or search.</p>
        <label class="help-search">
          <span class="sr-only">Search Help</span>
          <input type="search" id="help-search" name="q" value="${esc(needle)}" placeholder="Search Help" autocomplete="off" spellcheck="false">
        </label>
        <p class="help-search-status" id="help-search-status" role="status">${esc(status)}</p>
      </header>
      <div class="help-desk-layout">
        <nav class="help-toc" id="help-toc" aria-label="On this page">
          <h2 class="help-toc-title">On this page</h2>
          ${bennettHelpTocHtml(needle)}
        </nav>
        <div class="help-desk-body" id="help-desk-body">${bennettHelpBodyHtml(needle)}</div>
      </div>`;
  }

  function paintBennettHelpResults(host, q) {
    if (!host || !host.querySelector) return;
    const needle = String(q || "");
    const rows = filterBennettHelp(needle);
    const n = BENNETT_HELP_SECTIONS.length;
    const status = helpNeedle(needle)
      ? (rows.length ? rows.length + " match" + (rows.length === 1 ? "" : "es") : "No matches")
      : n + " topics";
    const toc = host.querySelector("#help-toc");
    const body = host.querySelector("#help-desk-body");
    const note = host.querySelector("#help-search-status");
    if (toc) toc.innerHTML = `<h2 class="help-toc-title">On this page</h2>${bennettHelpTocHtml(needle)}`;
    if (body) body.innerHTML = bennettHelpBodyHtml(needle);
    if (note) note.textContent = status;
  }

  function helpTypingTarget(el) {
    if (!el) return false;
    const tag = String(el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    return !!(el.isContentEditable);
  }

  function bindBennettHelpPage(host) {
    const root = host || (typeof document !== "undefined" && document.getElementById ? document.getElementById("bennett-help-page") : null);
    if (!root || !root.querySelector) return;
    const input = root.querySelector("#help-search");
    if (input && !input.dataset.helpSearchBound) {
      input.dataset.helpSearchBound = "1";
      const apply = () => paintBennettHelpResults(root, input.value);
      input.addEventListener("input", apply);
      input.addEventListener("search", apply);
    }
    if (typeof document !== "undefined" && document.addEventListener && document.documentElement && document.documentElement.dataset.bennettHelpKeysBound !== "1") {
      document.documentElement.dataset.bennettHelpKeysBound = "1";
      document.addEventListener("keydown", (e) => {
        if (!e) return;
        const field = root.querySelector("#help-search");
        if (!field) return;
        if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !helpTypingTarget(e.target)) {
          e.preventDefault();
          try { field.focus(); } catch (_) {}
        }
        if (e.key === "Escape" && e.target === field) {
          field.value = "";
          paintBennettHelpResults(root, "");
          try { field.blur(); } catch (_) {}
        }
      });
    }
    if (typeof document !== "undefined" && document.addEventListener && root.dataset.helpTocBound !== "1") {
      root.dataset.helpTocBound = "1";
      root.addEventListener("click", (e) => {
        const link = e.target && e.target.closest && e.target.closest("a.help-toc-link");
        if (!link) return;
        const href = String(link.getAttribute("href") || "");
        if (href.charAt(0) !== "#") return;
        const target = root.querySelector(href);
        if (!target) return;
        e.preventDefault();
        try { target.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (_) {
          try { target.scrollIntoView(true); } catch (__) {}
        }
        try {
          if (global.history && typeof global.history.replaceState === "function") {
            global.history.replaceState(null, "", href);
          } else if (global.location) {
            global.location.hash = href;
          }
        } catch (_) {}
        Array.from(root.querySelectorAll(".help-toc-link") || []).forEach((a) => {
          const on = a === link;
          if (a.classList && a.classList.toggle) a.classList.toggle("on", on);
        });
      });
    }
    try {
      const hash = String(((global.location || {}).hash || "")).replace(/^#/, "");
      if (hash) {
        const jump = root.querySelector("#" + hash.replace(/[^\w-]/g, ""));
        if (jump && jump.scrollIntoView) jump.scrollIntoView(true);
      }
    } catch (_) {}
  }

  function mountBennettHelpPage() {
    const host = typeof document !== "undefined" && document.getElementById ? document.getElementById("bennett-help-page") : null;
    if (!host) return;
    host.innerHTML = bennettHelpPageHtml();
    bindBennettHelpPage(host);
  }

  function workFeedStatus(work, now) {
    const clock = now || new Date();
    const w = work || {};
    if (String(w.kind || "") === "event") {
      return {
        status: "event",
        score: "",
        points: null,
        submittedAt: "",
        gradedAt: "",
        dispute: null,
        wantContact: false,
        dueYmd: "",
        dueToday: false,
        pastDue: false,
        missing: false,
        late: false,
        notDone: false,
        submitted: false,
        graded: false,
        excused: false,
        unknown: false,
        zero: false,
        needsYou: false,
        doneHere: false,
        classId: classIdForWork(w)
      };
    }
    const canvas = (w.canvas && typeof w.canvas === "object") ? w.canvas : {};
    const hints = parseWorkNoteHints(w.note);
    let status = normalizeWorkStatus(w.school_status) || normalizeWorkStatus(w.status) || normalizeWorkStatus(canvas.status);
    if (!status && hints.missed) status = "missing";
    if (!status && w.due) status = "open";
    if (!status) status = "unknown";

    let score = "";
    if (w.score != null && w.score !== "") score = w.score;
    else if (canvas.score != null && canvas.score !== "") score = canvas.score;
    else if (canvas.grade != null && canvas.grade !== "") score = canvas.grade;
    else if (hints.missed && hints.score) score = hints.score;
    if (typeof score === "number") {
      const pts = w.points != null ? w.points : canvas.points;
      score = pts != null ? score + "/" + pts : String(score);
    } else {
      score = score ? String(score) : "";
    }
    const points = w.points != null ? w.points : canvas.points;
    const submittedAt = w.submitted_at || canvas.submitted_at || "";
    const gradedAt = w.graded_at || canvas.graded_at || "";
    const dispute = workDisputeOf(w);
    const wantContact = !!(dispute && dispute.want_contact);

    const dueYmd = ymdFromLocal(w.due);
    const todayYmd = chicagoYmd(clock);
    const dueToday = !!(dueYmd && todayYmd && dueYmd === todayYmd);
    let pastDue = false;
    if (dueYmd && todayYmd) {
      if (dueYmd < todayYmd) pastDue = true;
      else if (dueYmd === todayYmd) pastDue = chicagoHm(clock) > dueMinutesFromIso(w.due);
    }

    const missing = status === "missing";
    const excused = status === "excused";
    const submitted = status === "submitted" || status === "graded" || (!!submittedAt && !missing && !excused);
    const graded = status === "graded" || (!!gradedAt && !missing && !!score);
    const lateFlag = w.late === true || w.late === "true" || status === "late" || (pastDue && (status === "open" || status === "missing" || status === "late"));
    const late = lateFlag && !missing;
    const notDone = !missing && !excused && !submitted && !graded && (status === "open" || status === "late");
    const zero = scoreLooksZero(score);
    const studentRec = studentStatusRecord(w.student_status);
    const studentStatus = studentRec
      ? (studentRec.done ? "done" : (studentRec.notDone ? "not_done" : (studentRec.said ? "claimed" : "")))
      : "";
    const studentDone = studentSaysDone(w);
    let doneHere = false;
    try {
      const local = w && w.id ? workState(w.id) : null;
      doneHere = !!(local && local.done);
    } catch (_) {}
    const schoolStatus = normalizeWorkStatus(w.school_status) || status;
    const discrepancy = discrepancyFromBits(w, {
      status,
      schoolStatus,
      submitted,
      zero,
      excused,
      graded
    }, clock);
    const needsYou = !!(
      wantContact
      || missing
      || discrepancy
      || (graded && zero)
      || (dueToday && !submitted && !excused && status !== "graded")
      || (pastDue && (status === "open" || status === "late" || status === "unknown"))
    );

    return {
      status,
      schoolStatus,
      studentStatus,
      studentSaid: studentRec && studentRec.said ? studentRec.said : "",
      studentDone,
      doneHere,
      score: score ? String(score) : "",
      points,
      submittedAt,
      gradedAt,
      dispute,
      wantContact,
      dueYmd,
      dueToday,
      pastDue,
      missing,
      late,
      notDone,
      submitted,
      graded,
      excused,
      unknown: status === "unknown",
      zero,
      discrepancy,
      needsYou,
      classId: classIdForWork(w)
    };
  }

  function workStatusChips(work, now) {
    const st = workFeedStatus(work, now);
    const chips = [];
    if (st.doneHere) chips.push({ key: "done-here", label: "Done" });
    if (st.discrepancy) chips.push({ key: "discrepancy", label: "Follow-up" });
    if (st.wantContact) chips.push({ key: "wrong", label: "Looks wrong" });
    if (st.missing) chips.push({ key: "missing", label: "Missing" });
    else if (st.late) chips.push({ key: "late", label: "Late" });
    if (st.dueToday && !st.submitted && !st.excused) chips.push({ key: "due-today", label: "Due today" });
    if (st.notDone && !st.doneHere) chips.push({ key: "not-done", label: "Not done" });
    if (st.submitted && !st.missing && !st.graded) chips.push({ key: "submitted", label: "Submitted" });
    if (st.graded && !st.missing) chips.push({ key: "graded", label: st.score ? "Graded " + st.score : "Graded" });
    if (st.excused) chips.push({ key: "excuse", label: "Excuse" });
    if (st.unknown && !st.notDone && !st.dueToday && !st.late) chips.push({ key: "unknown", label: "Unknown" });
    return chips;
  }

  function workStatusChipsHtml(work, now) {
    const st = workFeedStatus(work, now);
    const chips = workStatusChips(work, now).map((c) => {
      return `<span class="status-chip chip-${esc(c.key)}">${esc(c.label)}</span>`;
    }).join("");
    const score = st.score && (st.missing || (!st.graded && st.score))
      ? `<span class="status-score">${esc(st.score)}</span>`
      : "";
    if (!chips && !score) return "";
    return `<span class="status-chips">${chips}${score}</span>`;
  }

  function needsYouWork(week, now) {
    const clock = now || new Date();
    return ((week && week.work) || []).filter((w) => workFeedStatus(w, clock).needsYou).slice().sort((a, b) => {
      const as = workFeedStatus(a, clock);
      const bs = workFeedStatus(b, clock);
      const rank = (s) => {
        if (s.missing && !s.doneHere) return 0;
        if (s.late && !s.doneHere) return 1;
        if (s.dueToday && !s.doneHere) return 2;
        if (s.wantContact && !s.doneHere) return 3;
        if (s.doneHere && (s.late || s.missing || s.discrepancy)) return 4;
        if (s.doneHere) return 5;
        return 6;
      };
      return rank(as) - rank(bs) || String(a.due || "").localeCompare(String(b.due || ""));
    });
  }

  function needsYouCounts(week, now) {
    const clock = now || new Date();
    const items = needsYouWork(week, clock);
    let missing = 0;
    let late = 0;
    let dueToday = 0;
    let contact = 0;
    items.forEach((w) => {
      const st = workFeedStatus(w, clock);
      if (st.missing) missing += 1;
      else if (st.late) late += 1;
      if (st.dueToday && !st.submitted && !st.excused) dueToday += 1;
      if (st.wantContact) contact += 1;
    });
    return { missing, late, dueToday, contact, items };
  }

  function parentNeedsLine(week, now) {
    const counts = needsYouCounts(week, now);
    if (!counts.items.length) return "";
    return counts.missing + " missing, " + counts.late + " late, " + counts.dueToday + " due today";
  }

  function workDueLabel(work) {
    if (!work || !work.due) return "";
    return fmtStamp(work.due) || String(work.due);
  }

  function workContactLine(work, classes, now) {
    const st = workFeedStatus(work, now);
    const cid = classIdForWork(work);
    const cls = (classes || []).find((c) => c && c.id === cid) || {};
    const canvasSays = st.missing
      ? ("Missing" + (st.score ? " " + st.score : ""))
      : (st.graded && st.score
        ? ("Graded " + st.score)
        : (st.submitted ? "Submitted" : (st.late ? "Late / not submitted" : "Not submitted")));
    const think = (st.dispute && st.dispute.reason) || "we think this was turned in";
    return [
      classNameForId(cid) || cls.name || cid,
      cls.teacher || "",
      wTitleStrip(work && work.title),
      work.due ? "due " + workDueLabel(work) : "",
      "Canvas: " + canvasSays,
      "What we think: " + think
    ].filter(Boolean).join(" · ");
  }

  function wTitleStrip(title) {
    return String(title || "")
      .replace(/^TEST:\s*/i, "")
      .replace(/^English 10:\s*/i, "")
      .replace(/^Marching Band:\s*/i, "")
      .replace(/^Band:\s*/i, "")
      .replace(/^Sociology:\s*/i, "")
      .replace(/^Web Design I:\s*/i, "")
      .replace(/^Web Design:\s*/i, "")
      .replace(/^Academic Intervention:\s*/i, "")
      .replace(/^Chemistry:\s*/i, "")
      .replace(/^Strength & Conditioning I:\s*/i, "")
      .replace(/^Geometry:\s*/i, "")
      .trim();
  }

  function needsYouListHtml(week, now, opts) {
    const clock = now || new Date();
    const rows = needsYouWork(week, clock);
    const empty = opts && opts.empty;
    if (!rows.length) {
      return empty ? `<p class="empty">Nothing needs you right now.</p>` : "";
    }
    const link = opts && opts.link;
    return `<ul class="needs-you-list">${rows.map((w) => {
      const st = workFeedStatus(w, clock);
      const cid = st.classId;
      const href = link ? (link + (link.indexOf("?") >= 0 ? "&" : "?") + "class=" + encodeURIComponent(cid) + "&work=" + encodeURIComponent(w.id) + "#needs-you") : "";
      const plan = workPlanFor(opts && opts.family, w.id);
      const planLine = plan ? `<span class="needs-you-plan-text">${esc(plan.text)}</span>` : "";
      const tools = `<span class="needs-you-tools"><button type="button" class="tiny needs-you-plan" data-plan-work="${esc(w.id)}">Plan</button><button type="button" class="tiny needs-you-edit" data-edit-work="${esc(w.id)}">Edit</button></span>`;
      const inner = `
        <span class="needs-you-class">${esc(classShortLabel(cid) || classNameForId(cid) || cid)}</span>
        <span class="needs-you-copy">
          <span class="needs-you-title">${esc(wTitleStrip(w.title))}</span>
          <span class="needs-you-due">${esc(workDueLabel(w))}</span>
          ${planLine}
        </span>
        ${workStatusChipsHtml(w, clock)}`;
      const row = href
        ? `<a class="needs-you-row" href="${esc(href)}">${inner}</a>`
        : `<div class="needs-you-row" role="button" tabindex="0" data-needs-work="${esc(w.id)}" data-needs-class="${esc(cid)}">${inner}</div>`;
      return `<li class="needs-you-item${st.doneHere ? " is-done" : ""}${st.late && !st.doneHere ? " is-late" : ""}${st.notDone && !st.doneHere ? " is-open" : ""}">${row}${tools}</li>`;
    }).join("")}</ul>`;
  }

  function needsYouCollapsedKey() {
    return pageFile() === "progress.html" ? KEYS.needsYouCollapsedProgress : KEYS.needsYouCollapsed;
  }

  function needsYouCollapsed() {
    try {
      const key = needsYouCollapsedKey();
      return read(key, false) === true || read(key, "") === "1";
    } catch (_) {
      return false;
    }
  }

  function setNeedsYouCollapsed(on) {
    write(needsYouCollapsedKey(), !!on);
    return !!on;
  }

  function needsYouSectionHtml(week, now, opts) {
    const clock = now || new Date();
    const rows = needsYouWork(week, clock);
    const list = needsYouListHtml(week, clock, opts);
    if (!list && !(opts && opts.empty)) return "";
    const collapsed = needsYouCollapsed();
    const count = rows.length;
    const hint = collapsed ? (count ? "Show " + count : "Show") : "Hide";
    return `
      <button type="button" class="needs-you-toggle" data-needs-you-toggle aria-expanded="${collapsed ? "false" : "true"}">
        <span class="needs-you-toggle-title">Needs you</span>
        <span class="needs-you-toggle-hint">${esc(hint)}</span>
      </button>
      <div class="needs-you-body"${collapsed ? " hidden" : ""}>${list}</div>`;
  }

  function bindNeedsYouToggle() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    if (document.documentElement && document.documentElement.dataset.needsYouToggleBound === "1") return;
    if (document.documentElement) document.documentElement.dataset.needsYouToggleBound = "1";
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest && e.target.closest("[data-needs-you-toggle]");
      if (!btn) return;
      e.preventDefault();
      const collapsed = setNeedsYouCollapsed(!needsYouCollapsed());
      const host = (btn.closest && (btn.closest("#needs-you") || btn.closest(".needs-you") || btn.closest(".needs-you-pane"))) || btn.parentNode;
      if (host && host.classList) host.classList.toggle("collapsed", collapsed);
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      const hint = btn.querySelector(".needs-you-toggle-hint");
      const body = host && host.querySelector ? host.querySelector(".needs-you-body") : null;
      const n = body ? body.querySelectorAll(".needs-you-item").length : 0;
      if (hint) hint.textContent = collapsed ? (n ? "Show " + n : "Show") : "Hide";
      if (body) body.hidden = collapsed;
    });
  }

  function nextNChicagoDays(n) {
    const [y, m, d] = chicagoYmd().split("-").map(Number);
    const start = new Date(y, m - 1, d);
    return Array.from({ length: n || 7 }, (_, i) => {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      return x;
    });
  }

  function workDueOnDay(work, day) {
    const due = ymdFromLocal(work && work.due);
    const key = ymdFromLocal(day);
    return !!(due && key && due === key);
  }

  function workStartThisOnDay(work, day) {
    if (!work || !work.due || workDueOnDay(work, day)) return false;
    const dueD = localDateFromYmd(ymdFromLocal(work.due));
    const dayD = localDateFromYmd(ymdFromLocal(day));
    if (!dueD || !dayD) return false;
    const todayD = localDateFromYmd(chicagoYmd());
    const farDue = !!(todayD && dueD.getTime() - todayD.getTime() > 6 * 86400000);
    if (farDue) {
      const from = ymdFromLocal(work.suggest_from);
      return !!(from && from === ymdFromLocal(day));
    }
    const from = work.suggest_from
      ? localDateFromYmd(ymdFromLocal(work.suggest_from))
      : new Date(dueD.getTime() - 3 * 86400000);
    if (!from) return false;
    return dayD >= from && dayD < dueD;
  }

  function workOnBoard(work, days) {
    return (days || []).some((d) => workDueOnDay(work, d) || workStartThisOnDay(work, d));
  }

  function lastBoardYmd(days) {
    if (!days || !days.length) return "";
    return ymdFromLocal(days[days.length - 1]);
  }

  function workIsLater(work, days) {
    if (!work) return false;
    const last = lastBoardYmd(days);
    const due = ymdFromLocal(work.due);
    if (due && last && due > last) return true;
    const from = ymdFromLocal(work.suggest_from);
    if (from && last && from > last && !workOnBoard(work, days)) return true;
    return false;
  }

  function laterWorkForClass(week, days, classId) {
    const want = String(classId || "");
    return ((week && week.work) || []).filter((w) => {
      if (!w || !w.id) return false;
      if (want && !belongsToClass(w, want)) return false;
      if (workState(w.id).done) return false;
      return workIsLater(w, days);
    }).sort((a, b) => String(ymdFromLocal(a.due)).localeCompare(String(ymdFromLocal(b.due))));
  }

  function eventOnBoard(event, days) {
    const key = ymdFromLocal(event && event.start);
    return !!(key && (days || []).some((d) => ymdFromLocal(d) === key));
  }

  function belongsToClass(item, classId) {
    return classIdForWork(item) === String(classId || "");
  }

  function itemsForClassOnDay(week, classId, day) {
    const want = String(classId || "");
    return {
      due: sortWorkOpenFirst(((week && week.work) || []).filter((w) => belongsToClass(w, want) && workDueOnDay(w, day))),
      startThis: sortWorkOpenFirst(((week && week.work) || []).filter((w) => belongsToClass(w, want) && workStartThisOnDay(w, day))),
      events: ((week && week.events) || []).filter((e) => belongsToClass(e, want) && eventOnBoard(e, [day]))
    };
  }

  function sortWorkOpenFirst(list) {
    return (list || []).slice().sort((a, b) => {
      const ad = workState(a && a.id).done ? 1 : 0;
      const bd = workState(b && b.id).done ? 1 : 0;
      return ad - bd;
    });
  }

  function looseEventsOnDay(week, day) {
    return ((week && week.events) || []).filter((e) => {
      return eventOnBoard(e, [day]) && !classIdForWork(e);
    });
  }

  function classAttentionCount(cls, week, days, now) {
    const classId = cls && cls.id;
    if (!classId) return 0;
    const clock = now || new Date();
    let n = 0;
    ((week && week.work) || []).forEach((w) => {
      if (!belongsToClass(w, classId)) return;
      if (workState(w.id).done) return;
      if (workFeedStatus(w, clock).needsYou) n += 1;
    });
    return n;
  }

  function rememberedClassId() {
    try {
      return String(localStorage.getItem(KEYS.selectedClass) || "");
    } catch (_) {
      return "";
    }
  }

  function rememberClassId(id) {
    const next = String(id || "").trim();
    try {
      if (next) localStorage.setItem(KEYS.selectedClass, next);
    } catch (_) {}
    return next;
  }

  function pickClassId(classes, week, days, stored, now) {
    const list = (classes || []).filter((c) => c && c.id);
    const keep = String(stored || "");
    if (keep && list.some((c) => c.id === keep)) return keep;
    const badged = list.find((c) => classAttentionCount(c, week, days, now) > 0);
    if (badged) return badged.id;
    if (list.some((c) => c.id === "english-10")) return "english-10";
    if (list.some((c) => c.id === "geometry")) return "geometry";
    return list[0] ? list[0].id : "";
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
    layer.classList.remove("char-celebrate-full");
  }

  function celebrateLayer() {
    let layer = document.getElementById("char-celebrate");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "char-celebrate";
      layer.className = "char-celebrate";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function bindCelebrateClose(layer, onClose) {
    const close = () => {
      if (onClose) onClose();
      closeCharacterCelebrate();
    };
    const closeBtn = document.getElementById("char-celebrate-close");
    if (closeBtn && closeBtn.addEventListener) closeBtn.addEventListener("click", close);
    layer.onclick = (e) => {
      if (e.target === layer) close();
    };
  }

  function awardWhenIso(ach, family) {
    const id = ach && ach.id;
    if (!id) return "";
    const st = family && family.streaks && family.streaks[id];
    if (st && st.awardedAt) return String(st.awardedAt);
    const raw = getUnlocks()[id];
    if (typeof raw === "number" && Number.isFinite(raw)) return new Date(raw).toISOString();
    if (raw && typeof raw === "object") return String(raw.at || raw.date || "");
    return "";
  }

  function awardWhenLine(ach, family) {
    const line = fmtStamp(awardWhenIso(ach, family));
    return line ? "Earned " + line : "";
  }

  function trophyRoomHref(id) {
    return "index.html?room=1&trophy=" + encodeURIComponent(String(id || ""));
  }

  function openTrophyForAward(id) {
    closeCharacterCelebrate();
    const key = String(id || "");
    if (!key) return;
    try { sessionStorage.setItem("bw-open-trophy", key); } catch (_) {}
    const onWeek = !!(document.body && document.body.classList && document.body.classList.contains("week-page"));
    if (onWeek && document.dispatchEvent) {
      try {
        document.dispatchEvent(new CustomEvent("bw-open-trophy-room", { detail: { id: key } }));
      } catch (_) {}
      return;
    }
    try {
      if (global.location) global.location.href = trophyRoomHref(key);
    } catch (_) {}
  }

  function showAwardUnlock(ach, pack, lib, opts) {
    const family = (opts && opts.family) || getFamilyDraft();
    const why = unlockCopy(ach) || "You unlocked this.";
    const title = (ach && ach.title) || "Achievement";
    const when = awardWhenLine(ach, family);
    const src = badgeSrc(ach, lib);
    const layer = celebrateLayer();
    layer.classList.add("char-celebrate-full");
    layer.innerHTML = `
      <div class="char-celebrate-panel char-celebrate-why-panel award-unlock-panel" role="dialog" aria-labelledby="char-celebrate-title">
        <p class="char-celebrate-kicker">You unlocked this</p>
        ${src ? `<img class="award-unlock-badge" src="${esc(src)}" alt="">` : ""}
        <h2 id="char-celebrate-title">${esc(title)}</h2>
        <p class="char-celebrate-why">${esc(why)}</p>
        ${when ? `<p class="award-unlock-when">${esc(when)}</p>` : ""}
        <button type="button" class="btn primary" id="char-celebrate-see">See it in the Trophy room</button>
      </div>`;
    layer.classList.add("open");
    const play = () => playAwardSound(ach, family, lib);
    const started = play();
    confetti({ burst: true });
    if (!started && layer.addEventListener) {
      layer.addEventListener("pointerdown", play, { once: true });
    }
    const see = document.getElementById("char-celebrate-see");
    if (see && see.addEventListener) {
      see.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopLibraryAudio();
        openTrophyForAward(ach && ach.id);
      });
    }
  }

  function showUnlockWhy(roster, unlockedChar, opts) {
    const ach = opts && opts.achievement;
    const why = unlockCopy(ach) || "You unlocked this.";
    const title = (ach && ach.title) || "Achievement";
    const layer = celebrateLayer();
    layer.classList.add("char-celebrate-full");
    layer.innerHTML = `
      <div class="char-celebrate-panel char-celebrate-why-panel" role="dialog" aria-labelledby="char-celebrate-title">
        <p class="char-celebrate-kicker">You unlocked this</p>
        <h2 id="char-celebrate-title">${esc(title)}</h2>
        <p class="char-celebrate-why">${esc(why)}</p>
        <button type="button" class="btn primary" id="char-celebrate-see">See Achievement</button>
      </div>`;
    layer.classList.add("open");
    const family = (opts && opts.family) || getFamilyDraft();
    const lib = opts && opts.library;
    const play = () => playAwardSound(ach, family, lib);
    const started = play();
    confetti({ burst: true });
    if (!started && layer.addEventListener) {
      layer.addEventListener("pointerdown", play, { once: true });
    }
    const see = document.getElementById("char-celebrate-see");
    if (see && see.addEventListener) {
      see.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stopLibraryAudio();
        showUnlockCharacter(roster, unlockedChar, Object.assign({}, opts || {}, { skipSound: true }));
      });
    }
  }

  function showUnlockCharacter(roster, unlockedChar, opts) {
    const media = characterMedia(roster, unlockedChar);
    const name = characterLabel(unlockedChar, unlockedChar && unlockedChar.id === "bennett" ? "Bennett" : "New teammate");
    const kicker = unlockedChar && unlockedChar.id === "bennett" ? "You're in" : "New teammate";
    const rewatch = !!(opts && opts.rewatch);
    const layer = celebrateLayer();
    layer.classList.add("char-celebrate-full");
    layer.innerHTML = `
      <div class="char-celebrate-panel" role="dialog" aria-labelledby="char-celebrate-title">
        <p class="char-celebrate-kicker">${kicker}</p>
        <h2 id="char-celebrate-title">${esc(name)} unlocked!</h2>
        <video src="${esc(media.video)}" poster="${esc(media.poster)}" playsinline controls ${prefersReducedMotion() ? "" : "autoplay"}></video>
        <button type="button" class="btn primary" id="char-celebrate-close">Nice</button>
      </div>`;
    layer.classList.add("open");
    stopLibraryAudio();
    const video = layer.querySelector("video");
    playCharacterVideo(video);
    bindCelebrateClose(layer);
    if (unlockedChar && unlockedChar.id) markCharacterSeen(unlockedChar.id);
    if (unlockedChar && unlockedChar.id === "bennett") markSignInSeen();
    if (!rewatch) confetti({ burst: true });
    if (opts && opts.achievement && !rewatch && !opts.skipSound) {
      const family = opts.family || getFamilyDraft();
      const play = () => playAwardSound(opts.achievement, family, opts.library);
      if (typeof setTimeout === "function") setTimeout(play, 0);
      else play();
    }
  }

  function playUnlockClip(roster, unlockedChar, opts) {
    const rewatch = !!(opts && opts.rewatch);
    const ach = opts && opts.achievement;
    const whyFirst = !rewatch && !!(ach && unlockedChar && unlockedChar.id !== "bennett");
    if (whyFirst) {
      showUnlockWhy(roster, unlockedChar, opts);
      return;
    }
    showUnlockCharacter(roster, unlockedChar, opts);
  }

  function maybePlayUnlockCelebration(roster, pack, family, lib) {
    const open = document.getElementById("char-celebrate");
    if (open && open.classList && open.classList.contains("open")) return true;
    const pending = pendingCharacterCelebrations(roster);
    if (!pending.length) return false;
    const ch = pending[0];
    const ach = achievementGrantingCharacter(pack, ch.id);
    playUnlockClip(roster, ch, { achievement: ach, family, library: lib });
    pending.slice(1).forEach((row) => markCharacterSeen(row.id));
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
      return !!(family.streaks[ach.id] && family.streaks[ach.id].awarded);
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
          addBananas(WORK_ACTION_BANANAS);
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
          addBananas(WORK_ACTION_BANANAS);
        }
      }
    }
    all[id] = Object.assign({}, cur, { updatedAt: nowIso(), updated: nowIso() });
    write(KEYS.progress, all);
    const synced = syncFamilyProgress();
    if (kind === "started" && !before.started) track("work_start", { assignmentId: id });
    if (kind === "done" && !before.done) track("work_done", { assignmentId: id });
    return { first, state: workState(id), synced };
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
    if (rule.type === "easter_egg") return !!(ctx && ctx.eggs && ctx.eggs[rule.egg]);
    if (rule.type === "done_count") return doneAssignmentCount() >= (Number(rule.count) || 0);
    if (rule.type === "login_days") {
      const days = getLoginDays(ctx && ctx.family);
      const asOf = (ctx && ctx.ymd) || chicagoYmd();
      return consecutiveLoginStreak(days, asOf) >= (Number(rule.count) || 0);
    }
    if (rule.type === "login_total") {
      return getLoginDays(ctx && ctx.family).length >= (Number(rule.count) || 0);
    }
    if (rule.type === "class_tour") {
      const ids = Array.isArray(rule.classIds) && rule.classIds.length
        ? rule.classIds.map(String)
        : (ctx && Array.isArray(ctx.classIds) && ctx.classIds.length ? ctx.classIds.map(String) : CLASS_IDS);
      return classTourComplete(rule.hours, ids, ctx && ctx.family, ach.id);
    }
    if (rule.type === "open_touched") {
      return openWorkTouched(ctx && ctx.week, ctx && ctx.days);
    }
    return false;
  }

  function boardDaysForUnlock(days) {
    return (days && days.length) ? days : nextNChicagoDays(7);
  }

  function openAssignments(week, days) {
    const boardDays = boardDaysForUnlock(days);
    return ((week && week.work) || []).filter((w) => {
      if (!w || !w.id) return false;
      if (String(w.kind || "") === "event") return false;
      const st = workFeedStatus(w);
      if (st.excused || st.submitted || st.graded) return false;
      if (!workOnBoard(w, boardDays) && !st.missing) return false;
      return true;
    });
  }

  function openWorkTouched(week, days) {
    const items = openAssignments(week, days);
    if (items.length) {
      return items.every((w) => {
        const rec = workState(w.id);
        const st = workFeedStatus(w);
        return !!(st.doneHere || rec.started || rec.done);
      });
    }
    const boardDays = boardDaysForUnlock(days);
    const board = ((week && week.work) || []).filter((w) => {
      if (!w || !w.id) return false;
      if (String(w.kind || "") === "event") return false;
      const st = workFeedStatus(w);
      if (!workOnBoard(w, boardDays) && !st.missing) return false;
      return true;
    });
    if (!board.length) return false;
    return board.every((w) => {
      const rec = workState(w.id);
      const st = workFeedStatus(w);
      return !!(st.doneHere || st.submitted || st.graded || st.excused || rec.started || rec.done);
    });
  }

  function doneAssignmentCount() {
    const all = getProgress();
    return Object.keys(all).filter((id) => !!(all[id] && workState(id).done)).length;
  }

  function markClassVisit(classId) {
    const id = String(classId || "").trim();
    if (!id) return read(KEYS.classVisits, {});
    const all = read(KEYS.classVisits, {}) || {};
    all[id] = nowIso();
    write(KEYS.classVisits, all);
    return all;
  }

  function classTourComplete(hours, classIds, family, achievementId) {
    const ids = Array.isArray(classIds) && classIds.length
      ? classIds.map(String)
      : CLASS_IDS;
    const windowMs = Math.max(1, Number(hours) || 24) * 3600 * 1000;
    const now = Date.now();
    const visits = read(KEYS.classVisits, {}) || {};
    let resetMs = 0;
    const st = family && achievementId && family.streaks && family.streaks[achievementId];
    if (st && st.tourResetAt) {
      const resetAt = parseStamp(st.tourResetAt);
      if (resetAt) resetMs = resetAt.getTime();
    }
    return ids.every((id) => {
      const t = parseStamp(visits[id]);
      return !!(t && t.getTime() > resetMs && (now - t.getTime()) <= windowMs);
    });
  }

  function applyLiveUnlocks(pack, family, ctx) {
    let next = normalizeFamily(family);
    const fresh = [];
    const grantedCharacters = [];
    const livePack = mergeAchievementUnlocks(pack, shippedAchievements);
    (livePack.achievements || []).forEach((ach) => {
      if (!ach || !ach.id) return;
      const previewOnly = achievementIsPreviewOnly(ach.id);
      if (alreadyUnlocked(ach.id) && !previewOnly) return;
      if (!evaluate(ach, Object.assign({}, ctx || {}, { family: next }))) return;
      const result = awardStreak(livePack, next, ach.id, {
        force: previewOnly || !!getUnlocks()[ach.id]
      });
      next = result.family;
      if (result.achievement) fresh.push(result.achievement);
      if (result.grantedCharacter && (result.freshCharacter || previewOnly)) {
        if (previewOnly) unmarkCharacterSeen(result.grantedCharacter);
        grantedCharacters.push(result.grantedCharacter);
      }
    });
    return { family: next, fresh, grantedCharacters };
  }

  function checkUnlocks(pack, ctx) {
    const family = ctx && ctx.family;
    if (family) return applyLiveUnlocks(pack, family, ctx).fresh;
    const fresh = [];
    (pack.achievements || []).forEach((ach) => {
      if (alreadyUnlocked(ach.id)) return;
      if (!evaluate(ach, ctx || {})) return;
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
    let unlock = rewardUnlockOf(ach) || (st.grantedUnlock && typeof st.grantedUnlock === "object" ? st.grantedUnlock : null);
    if (!unlock && ach.rewardMedia) {
      unlock = { type: "content", id: String(ach.rewardMedia), label: String(ach.rewardMedia) };
    }
    const granted = (unlock && unlock.type === "character" && unlock.id) || st.grantedCharacter || "";
    next.streaks[id] = Object.assign({}, st, {
      awarded: true,
      awardedAt: nowIso(),
      grantedCharacter: granted || undefined,
      grantedUnlock: unlock || undefined,
      rewardMedia: (ach && ach.rewardMedia) || st.rewardMedia || undefined,
      preview: !!preview,
      revokedAt: undefined,
      tourResetAt: undefined
    });
    delete next.streaks[id].revokedAt;
    delete next.streaks[id].tourResetAt;
    if (preview) addPreviewIds([id]);
    else removePreviewIds([id]);
    let freshCharacter = false;
    let freshGear = false;
    let freshContent = false;
    if (granted) {
      const grant = grantCharacter(next, granted);
      freshCharacter = grant.fresh;
      Object.assign(next, grant.family);
      if (freshCharacter || force) unmarkCharacterSeen(granted);
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
    if (!overlaySyncing) stampAwardsOnFamily(next);
    return {
      family: getFamilyDraft() || next,
      achievement: ach,
      grantedCharacter: granted || "",
      grantedUnlock: unlock,
      freshCharacter,
      freshGear,
      freshContent
    };
  }

  function previewTestAward(pack, family, id) {
    const ach = ((pack && pack.achievements) || []).find((row) => row && row.id === id) || null;
    if (!ach) {
      return { family: normalizeFamily(family), achievement: null };
    }
    markUnlocked(id);
    addPreviewIds([id]);
    const next = normalizeFamily(family);
    const st = next.streaks[id] || { count: 0 };
    next.streaks[id] = Object.assign({}, st, {
      awarded: true,
      awardedAt: nowIso(),
      preview: true
    });
    saveFamily(next);
    return { family: next, achievement: ach };
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
    const granted = st.grantedCharacter || (unlock && unlock.type === "character" && unlock.id) || rewardCharacterId(ach) || "";
    const resetAt = nowIso();
    const tourReset = !!(ach && ach.unlock && ach.unlock.type === "class_tour");
    next.streaks[id] = Object.assign({}, st, {
      awarded: false,
      revokedAt: resetAt,
      preview: false
    });
    if (tourReset) next.streaks[id].tourResetAt = resetAt;
    removePreviewIds([id]);
    let revokedCharacter = false;
    let revokedGear = false;
    let revokedContent = false;
    if (granted && !otherAwardGrantsCharacter(pack, next, granted, id)) {
      revokedCharacter = revokeCharacterUnlock(granted) || !!next.characterUnlocks[granted];
      if (next.characterUnlocks[granted]) {
        delete next.characterUnlocks[granted];
      }
      unmarkCharacterSeen(granted);
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
    if (!overlaySyncing) stampAwardsOnFamily(next);
    return { family: getFamilyDraft() || next, revoked: was, achievement: ach || null, revokedCharacter, revokedGear, revokedContent };
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

  function familyAudienceLabel() {
    const role = String(telemetryDeviceRole() || "").trim().toLowerCase();
    const view = normalizeSiteView(siteView());
    if (role === "bennett" || view === "bennett") return "Mom and Dad";
    if (role === "parent" || view === "mom") return "Bennett and Dad";
    return "Bennett and Mom";
  }

  function familyProgressLive() {
    try {
      return !!(global.Telemetry && typeof global.Telemetry.progressSyncAvailable === "function" && global.Telemetry.progressSyncAvailable());
    } catch (_) {
      return false;
    }
  }

  function familyConnected() {
    try {
      if (familyProgressLive()) return true;
      return !!(global.Telemetry && typeof global.Telemetry.connected === "function" && global.Telemetry.connected());
    } catch (_) {
      return false;
    }
  }

  function familySavedToast(action) {
    const verb = action || "Saved";
    if (familyConnected()) {
      const who = familyAudienceLabel();
      toast(who === "Mom and Dad" ? verb + ". Mom and Dad will see this." : verb + ". " + who + " will see this.");
    } else toast(verb + " on this device until Connect is on.");
  }

  function familyDeletedToast() {
    if (familyConnected()) toast("Deleted. " + familyAudienceLabel() + " will see this.");
    else toast("Deleted on this device until Connect is on.");
  }

  function playCharacterVideo(video) {
    if (!video) return;
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute && video.removeAttribute("muted");
    try { video.volume = 1; } catch (_) {}
    const kick = () => {
      const p = video.play && video.play();
      if (p && p.catch) {
        p.catch(() => {
          video.muted = false;
          video.defaultMuted = false;
          try { video.volume = 1; } catch (_) {}
          const again = video.play && video.play();
          if (again && again.catch) again.catch(function () {});
        });
      }
    };
    kick();
  }

  function confetti(opts) {
    if (prefersReducedMotion()) return;
    let layer = document.getElementById("confetti");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "confetti";
      layer.className = "confetti";
      document.body.appendChild(layer);
    }
    const colors = ["#c6e03a", "#f4d35e", "#f4a261", "#2a9d8f", "#8ec5ff", "#f0a8b8", "#76c759", "#ffffff"];
    const count = (opts && opts.burst) ? 140 : 28;
    for (let i = 0; i < count; i += 1) {
      const bit = document.createElement("i");
      const burst = !!(opts && opts.burst) && (i % 2 === 0);
      bit.style.background = colors[i % colors.length];
      bit.style.width = (6 + Math.random() * 10) + "px";
      bit.style.height = (8 + Math.random() * 16) + "px";
      bit.style.animationDelay = (Math.random() * 0.35) + "s";
      bit.style.animationDuration = (1.4 + Math.random() * 1.6) + "s";
      if (burst) {
        bit.className = "burst";
        bit.style.left = "50%";
        bit.style.top = "38%";
        bit.style.setProperty("--dx", (Math.random() * 160 - 80) + "vw");
        bit.style.setProperty("--dy", (40 + Math.random() * 90) + "vh");
      } else {
        bit.style.left = Math.random() * 100 + "%";
        bit.style.transform = "translateY(0) rotate(" + (Math.random() * 80) + "deg)";
      }
      layer.appendChild(bit);
      if (typeof setTimeout === "function") {
        setTimeout(() => bit.remove(), 3200);
      }
    }
  }

  function sha256hex(message) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const bytes = [];
    const str = String(message || "");
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 0xff);
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    bytes.push(0, 0, 0, 0, (bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    for (let i = 0; i < bytes.length; i += 64) {
      const w = [];
      for (let t = 0; t < 16; t++) {
        w[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3);
        const s1 = rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[t] + w[t]) | 0;
        const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => ("00000000" + (x >>> 0).toString(16)).slice(-8)).join("");
  }

  function normalizeLoginUser(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "dad" || raw === "me") return "orin";
    if (raw === "parent") return "mom";
    return LOGIN_USERS[raw] ? raw : "";
  }

  function sessionUser() {
    try {
      const raw = localStorage.getItem(KEYS.session);
      if (!raw) return "";
      const obj = JSON.parse(raw);
      return normalizeLoginUser(obj && obj.user);
    } catch (_) {
      return "";
    }
  }

  function canUsePreviewSwitch(user) {
    return (user || sessionUser()) === "orin";
  }

  function defaultViewForUser(user) {
    const rec = LOGIN_USERS[normalizeLoginUser(user)];
    return rec ? rec.view : "me";
  }

  function clampSiteView(view, user) {
    const who = user || sessionUser();
    const v = normalizeSiteView(view);
    if (who === "bennett") return "bennett";
    if (who === "mom") return "mom";
    return v;
  }

  function setSessionUser(user) {
    const next = normalizeLoginUser(user);
    if (!next) {
      try { localStorage.removeItem(KEYS.session); } catch (_) {}
      applySiteView();
      return "";
    }
    try { localStorage.setItem(KEYS.session, JSON.stringify({ user: next, at: nowIso() })); } catch (_) {}
    try { localStorage.setItem(KEYS.siteView, defaultViewForUser(next)); } catch (_) {}
    applySiteView();
    return next;
  }

  function logout() {
    return setSessionUser("");
  }

  function tryLogin(who, password) {
    const user = normalizeLoginUser(who);
    const rec = LOGIN_USERS[user];
    if (!rec) return null;
    const pass = String(password || "").trim();
    if (sha256hex(pass) !== rec.hash) return null;
    setSessionUser(user);
    if (user === "bennett") recordLoginDay();
    if (global.Telemetry && typeof global.Telemetry.trackLogin === "function") {
      global.Telemetry.trackLogin();
    }
    return user;
  }

  function loginGateHtml() {
    const whoBtn = (id, label) => `<button type="button" class="login-who-btn" data-login-who="${id}">${esc(label)}</button>`;
    return `<form id="login-form" class="login-card" autocomplete="on">
      <h1>Jungle Jam</h1>
      <p class="login-lead">Who's this?</p>
      <div class="login-who" role="group" aria-label="Who's this">
        ${whoBtn("bennett", "Bennett")}${whoBtn("mom", "Mom")}${whoBtn("orin", "Dad")}
      </div>
      <label class="login-pass-label" for="login-pass">Password</label>
      <input id="login-pass" name="password" type="password" autocomplete="current-password">
      <p id="login-err" class="login-err" hidden></p>
      <button type="submit" class="btn primary login-go">Enter</button>
    </form>`;
  }

  function bindLoginGate(gate) {
    if (!gate || gate.dataset && gate.dataset.bound === "1") return;
    if (gate.dataset) gate.dataset.bound = "1";
    if (!gate.addEventListener) return;
    gate.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-login-who]") : null;
      if (!btn) return;
      const who = btn.getAttribute("data-login-who");
      if (gate.dataset) gate.dataset.who = who;
      const buttons = gate.querySelectorAll ? gate.querySelectorAll("[data-login-who]") : [];
      Array.from(buttons || []).forEach((el) => {
        if (!el || !el.classList) return;
        if (el.classList.toggle) el.classList.toggle("on", el === btn);
      });
      const pass = gate.querySelector ? gate.querySelector("#login-pass") : null;
      if (pass && pass.focus) pass.focus();
    });
    const form = gate.querySelector ? gate.querySelector("#login-form") : null;
    if (form && form.addEventListener) {
      form.addEventListener("submit", (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const who = (gate.dataset && gate.dataset.who) || "";
        const passEl = gate.querySelector ? gate.querySelector("#login-pass") : null;
        const err = gate.querySelector ? gate.querySelector("#login-err") : null;
        const showErr = (msg) => {
          if (!err) return;
          err.hidden = false;
          err.textContent = msg;
        };
        if (!who) {
          showErr("Pick Bennett, Mom, or Dad first.");
          return;
        }
        if (!tryLogin(who, passEl && passEl.value)) {
          showErr("That password does not match.");
          if (passEl) {
            passEl.value = "";
            if (passEl.focus) passEl.focus();
          }
          return;
        }
        primeLibraryAudio();
      });
    }
  }

  function gateLogin() {
    const user = sessionUser();
    if (!document.body) return !user;
    let gate = document.getElementById ? document.getElementById("login-gate") : null;
    if (user) {
      if (gate) gate.hidden = true;
      if (document.body.classList && document.body.classList.remove) {
        document.body.classList.remove("login-gated");
      }
      return false;
    }
    if (document.body.classList && document.body.classList.add) {
      document.body.classList.add("login-gated");
    }
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "login-gate";
      gate.className = "login-gate";
      if (document.body.appendChild) document.body.appendChild(gate);
      gate.innerHTML = loginGateHtml();
      bindLoginGate(gate);
    }
    gate.hidden = false;
    return true;
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
        return clampSiteView(normalizeSiteView(stored));
      }
    } catch (_) {}
    return clampSiteView(siteViewFromRole(telemetryDeviceRole()));
  }

  function audioAllowed() {
    if (sessionUser() === "mom") return false;
    return siteView() !== "mom";
  }

  function funPlayAllowed() {
    return audioAllowed();
  }

  function paintEggChip(pack) {
    const egg = document.getElementById("egg-chip");
    if (!egg) return;
    egg.hidden = !(hasEggGame(pack) && funPlayAllowed());
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

  function wantsTrophyRoom() {
    try {
      const loc = global.location || {};
      const search = String(loc.search || "");
      const hash = String(loc.hash || "");
      if (/(?:^|[?&])room=1(?:&|$)/.test(search)) return true;
      if (hash === "#trophy" || hash === "#trophies") return true;
    } catch (_) {}
    return false;
  }

  function hudCurrent() {
    const file = String(pageFile() || "").toLowerCase();
    if (file === "progress.html") return "progress";
    if (file === "characters.html") return "crew";
    if (file === "basecamp.html" || file === "ask.html") return "basecamp";
    if (file === "messages.html") return "messages";
    if (file === "help.html") return "help";
    if (file === "parent.html") return "parent";
    if (file === "admin.html") return "admin";
    if (file === "story.html") return "story";
    if (file === "egg.html") return "egg";
    if (document.body && document.body.classList && document.body.classList.contains("in-treehouse")) return "trophy";
    if (wantsTrophyRoom()) return "trophy";
    return "week";
  }

  function hudChip(current, id, cls, href, extraAttrs, inner) {
    const on = current === id;
    return `<a class="${cls}${on ? " on" : ""}" href="${href}"${on ? ' aria-current="page"' : ""}${extraAttrs || ""}>${inner}</a>`;
  }

  function hudNavHtml(current) {
    const cur = current || hudCurrent();
    return [
      hudChip(cur, "week", "week-chip", "index.html", "", `<span class="week-chip-full">This week</span><span class="week-chip-short">Week</span>`),
      hudChip(cur, "trophy", "trophy-chip", "index.html?room=1", ' aria-label="Trophy Room"', `<span class="trophy-chip-full">Trophy Room</span><span class="trophy-chip-short">Trophies</span>`),
      hudChip(cur, "progress", "progress-chip", "progress.html", ' aria-label="Progress"', `<span class="progress-chip-full">Progress</span><span class="progress-chip-short">Dash</span>`),
      hudChip(cur, "crew", "crew-chip", "characters.html", ' aria-label="Characters"', `<span class="crew-chip-full">Characters</span><span class="crew-chip-short">Crew</span>`),
      hudChip(cur, "basecamp", "basecamp-chip", "basecamp.html", ' aria-label="Base Camp"', `<span class="basecamp-chip-full">Base Camp</span><span class="basecamp-chip-short">Camp</span>`),
      `<a class="story-chip${cur === "story" ? " on" : ""}" id="story-chip" href="story.html"${cur === "story" ? ' aria-current="page"' : ""} hidden>Story</a>`,
      hudChip(cur, "messages", "messages-chip", "messages.html", ' aria-label="Messages"', `<span class="messages-chip-full">Messages</span><span class="messages-chip-short">Msgs</span><span class="messages-badge" hidden></span>`),
      hudChip(cur, "parent", "parent-chip", "parent.html", ' aria-label="Parent desk"', `<span class="parent-chip-full">Parent desk</span><span class="parent-chip-short">Desk</span>`),
      hudChip(cur, "admin", "admin-chip", "admin.html", "", "Admin"),
      `<a class="egg-chip${cur === "egg" ? " on" : ""}" id="egg-chip" href="egg.html"${cur === "egg" ? ' aria-current="page"' : ""} hidden>🥚 Play</a>`
    ].join("");
  }

  function mountHudNav(current) {
    if (!document.querySelectorAll) return null;
    const navs = document.querySelectorAll(".hud-nav");
    if (!navs || !navs.length) return null;
    const cur = current || hudCurrent();
    const storyEl = document.getElementById ? document.getElementById("story-chip") : null;
    const eggEl = document.getElementById ? document.getElementById("egg-chip") : null;
    const storyOpen = !!(storyEl && !storyEl.hidden) || cur === "story";
    const eggOpen = !!(eggEl && !eggEl.hidden) || cur === "egg";
    const html = hudNavHtml(cur);
    Array.from(navs).forEach((nav) => {
      if (!nav) return;
      try { nav.innerHTML = html; } catch (_) {}
    });
    const story = document.getElementById ? document.getElementById("story-chip") : null;
    const egg = document.getElementById ? document.getElementById("egg-chip") : null;
    if (story) story.hidden = !storyOpen;
    if (egg) egg.hidden = !funPlayAllowed() || !eggOpen;
    return navs[0];
  }

  function paintHudCurrent(current) {
    if (!document.querySelectorAll) return current || hudCurrent();
    const cur = current || hudCurrent();
    const map = {
      week: ".week-chip",
      trophy: ".trophy-chip",
      progress: ".progress-chip",
      crew: ".crew-chip",
      basecamp: ".basecamp-chip",
      messages: ".messages-chip",
      parent: ".parent-chip",
      admin: ".admin-chip",
      story: ".story-chip",
      egg: ".egg-chip"
    };
    Object.keys(map).forEach((id) => {
      Array.from(document.querySelectorAll(map[id]) || []).forEach((el) => {
        if (!el) return;
        const on = id === cur;
        if (el.classList && el.classList.toggle) el.classList.toggle("on", on);
        else if (el.classList && el.classList.add && el.classList.remove) {
          if (on) el.classList.add("on");
          else el.classList.remove("on");
        }
        if (el.setAttribute && el.removeAttribute) {
          if (on) el.setAttribute("aria-current", "page");
          else el.removeAttribute("aria-current");
        }
      });
    });
    return cur;
  }

  function bindHudNavClicks() {
    if (!document.addEventListener) return;
    document.addEventListener("click", (e) => {
      if (!e || !e.target || !e.target.closest) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const trophy = e.target.closest("a.trophy-chip");
      if (trophy) {
        const file = pageFile();
        if (file === "index.html" || file === "" || file === "/") {
          e.preventDefault();
          try {
            document.dispatchEvent(new CustomEvent("bw-open-trophy-room"));
          } catch (_) {}
        }
        return;
      }
      const week = e.target.closest("a.week-chip");
      if (week && document.body && document.body.classList && document.body.classList.contains("in-treehouse")) {
        e.preventDefault();
        try {
          document.dispatchEvent(new CustomEvent("bw-close-trophy-room"));
        } catch (_) {}
      }
    });
  }

  function isAdultDeskPage(file) {
    const name = String(file || pageFile()).toLowerCase();
    return name === "admin.html" || name === "parent.html" || name === "refs.html" || name === "mom.html";
  }

  function shouldGateAdultPage(file, view) {
    const v = normalizeSiteView(view || siteView());
    if (v === "me") return false;
    return siteViewHidesAdult(v) && isAdultDeskPage(file);
  }

  function siteViewControlHtml(view) {
    const v = normalizeSiteView(view || siteView());
    const btn = (id, label) => {
      const on = v === id;
      return `<button type="button" class="site-view-btn${on ? " on" : ""}" data-site-view="${id}" aria-pressed="${on ? "true" : "false"}">${label}</button>`;
    };
    return `<span class="site-view-kicker">Preview</span><div class="site-view-seg">${btn("me", "Me")}${btn("bennett", "Bennett")}${btn("mom", "Mom")}</div>`;
  }

  function sessionChromeHtml(view) {
    const user = sessionUser();
    if (!user) return "";
    if (canUsePreviewSwitch(user)) {
      return siteViewControlHtml(view) + `<button type="button" class="login-out" data-login-out>Log out</button>`;
    }
    return `<button type="button" class="login-out" data-login-out>Not you?</button>`;
  }

  function onSiteViewClick(e) {
    const out = e.target && e.target.closest ? e.target.closest("[data-login-out]") : null;
    if (out) {
      logout();
      return;
    }
    const btn = e.target && e.target.closest ? e.target.closest("[data-site-view]") : null;
    if (!btn) return;
    const next = btn.getAttribute("data-site-view");
    if (!next || next === siteView()) return;
    if (!canUsePreviewSwitch()) return;
    setSiteView(next);
  }

  function mountSiteViewControl() {
    if (!document.querySelectorAll) return null;
    const navs = document.querySelectorAll(".hud-nav");
    if (!navs || !navs.length) return null;
    const user = sessionUser();
    const hideSwitch = !canUsePreviewSwitch(user);
    let last = null;
    Array.from(navs).forEach((nav) => {
      let box = nav.querySelector ? nav.querySelector(".site-view") : null;
      if (!user) {
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
        if (nav.appendChild) nav.appendChild(box);
        if (box.addEventListener) box.addEventListener("click", onSiteViewClick);
      }
      box.setAttribute("aria-label", hideSwitch ? "Account" : "Preview as");
      box.innerHTML = sessionChromeHtml();
      last = box;
    });
    return last;
  }

  function hideAdultShortcuts(hide) {
    if (!document.querySelectorAll) return;
    const me = normalizeSiteView(siteView()) === "me";
    const on = !!hide && !me;
    const nodes = document.querySelectorAll(".admin-chip, .parent-chip, .refs-chip, a[href='admin.html'], a[href='parent.html'], a[href='refs.html'], a[href='mom.html']");
    Array.from(nodes || []).forEach((el) => {
      if (!el) return;
      if (el.closest && el.closest(".site-view-gate")) return;
      el.hidden = on;
      if (!on && el.removeAttribute) el.removeAttribute("hidden");
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
    try {
      if (global.location && pageFile() !== "index.html" && typeof global.location.replace === "function") {
        global.location.replace("index.html");
      }
    } catch (_) {}
    return true;
  }

  function applySiteView() {
    gateLogin();
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
    mountHudNav();
    mountSiteViewControl();
    mountHelpLaunch();
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
    const view = clampSiteView(next);
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

  function celebrate(ach, pack, lib, opts) {
    const family = (opts && opts.family) || getFamilyDraft();
    const roster = opts && opts.roster;
    const unlock = rewardUnlockOf(ach);
    const bennettWelcome = !!(ach && (
      ach.id === SIGNIN_ACHIEVEMENT
      || ach.rewardCharacter === "bennett"
      || (unlock && unlock.type === "character" && unlock.id === "bennett")
    ));
    if (siteViewHidesAdult() && bennettWelcome && !hasSignInSeen()) {
      playUnlockClip(roster || null, {
        id: "bennett",
        name: "Bennett",
        video: "img/characters/bennett.mp4",
        poster: "img/characters/bennett.jpg"
      }, { achievement: ach, family, library: lib });
      return;
    }
    const charId = rewardCharacterId(ach);
    if (charId && charId !== "bennett") {
      const ch = ((roster && roster.characters) || []).find((row) => row && row.id === charId)
        || { id: charId, name: charId };
      playUnlockClip(roster || null, ch, { achievement: ach, family, library: lib });
      return;
    }
    showAwardUnlock(ach, pack, lib, opts);
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
    recordLoginDay();
    return opens;
  }

  function getLoginDays(family) {
    const fam = family && typeof family === "object" ? family : getFamilyDraft();
    return asYmdList([].concat(
      read(KEYS.loginDays, []) || [],
      (fam && fam.loginDays) || [],
      (fam && fam.overlay && fam.overlay.awards && fam.overlay.awards.loginDays) || []
    ));
  }

  function shouldRecordBennettLogin() {
    if (sessionUser() === "bennett") return true;
    return telemetryDeviceRole() === "bennett" && siteView() === "bennett";
  }

  function recordLoginDay(family) {
    if (!shouldRecordBennettLogin()) return family;
    const ymd = chicagoYmd();
    const days = asYmdList(getLoginDays(family).concat([ymd]));
    write(KEYS.loginDays, days);
    const src = family != null ? family : getFamilyDraft();
    if (!src) return family;
    const next = normalizeFamily(src);
    const same = asYmdList(next.loginDays).join(",") === days.join(",")
      && asYmdList(next.overlay.awards.loginDays).join(",") === days.join(",");
    next.loginDays = days;
    next.overlay.awards.loginDays = days;
    if (same) return next;
    next.overlay.updatedAt = nowIso();
    saveFamily(next);
    if (!overlaySyncing) queueOverlayPush(next);
    return next;
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

  function basecampIntroMap() {
    try {
      const raw = localStorage.getItem(KEYS.basecampIntro);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function hasPlayedBasecampIntroToday(view) {
    const v = normalizeSiteView(view || siteView());
    return String(basecampIntroMap()[v] || "") === chicagoYmd();
  }

  function markBasecampIntroPlayed(view) {
    const v = normalizeSiteView(view || siteView());
    const next = Object.assign({}, basecampIntroMap());
    next[v] = chicagoYmd();
    try {
      localStorage.setItem(KEYS.basecampIntro, JSON.stringify(next));
    } catch (_) {}
    return next;
  }

  function shouldPlayBasecampIntro(view) {
    return !hasPlayedBasecampIntroToday(view);
  }

  function scorchLiveAchievement(pack) {
    const found = ((pack && pack.achievements) || []).find((ach) => ach && ach.id === SCORCH_LIVE_ACHIEVEMENT);
    if (found) return found;
    const shipped = ((shippedAchievements && shippedAchievements.achievements) || []).find((ach) => ach && ach.id === SCORCH_LIVE_ACHIEVEMENT);
    if (shipped) return shipped;
    return {
      id: SCORCH_LIVE_ACHIEVEMENT,
      title: "Meet Scorch",
      description: "You marked Done or I started this on every open assignment.",
      how: "Auto. Bennett taps Done or I started this on every assignment on This Week.",
      incentive: "Unlocks Scorch",
      reward: 0,
      rewardCharacter: "scorch",
      rewardUnlock: { type: "character", id: "scorch", label: "Scorch" },
      unlock: { type: "open_touched" }
    };
  }

  function maybeAwardScorch(pack, family) {
    const next = normalizeFamily(family);
    const st = next.streaks[SCORCH_LIVE_ACHIEVEMENT];
    if (st && st.awarded === false && st.awardedAt) {
      return { family: next, awarded: false, celebrate: false, achievement: null };
    }
    if (sessionUser() !== "bennett") {
      return { family: next, awarded: false, celebrate: false, achievement: null };
    }
    const livePack = mergeAchievementUnlocks(pack, shippedAchievements);
    const ach = scorchLiveAchievement(livePack);
    const earned = alreadyUnlocked(SCORCH_LIVE_ACHIEVEMENT) && !achievementIsPreviewOnly(SCORCH_LIVE_ACHIEVEMENT);
    const charEarned = alreadyUnlockedCharacter("scorch") && !unlockTargetIsPreviewOnly("character", "scorch");
    const seen = !!(getCharacterSeen().scorch);
    if (earned && charEarned && seen) {
      return { family: next, awarded: false, celebrate: false, achievement: ach };
    }
    if (earned && charEarned && !seen) {
      return { family: next, awarded: false, celebrate: true, achievement: ach };
    }
    const result = awardStreak(livePack, next, SCORCH_LIVE_ACHIEVEMENT, { preview: false, force: true });
    return {
      family: result.family,
      awarded: !!result.achievement,
      celebrate: true,
      achievement: result.achievement || ach
    };
  }

  function playBennettLoginAwards(pack, family, lib, opts) {
    const roster = opts && opts.roster;
    const signin = maybeAwardSignIn(pack, family);
    const scorch = maybeAwardScorch(pack, signin.family);
    const next = scorch.family;
    if (scorch.celebrate && scorch.achievement) {
      celebrate(scorch.achievement, pack, lib, { roster, family: next });
    } else if (signin.awarded && signin.achievement) {
      celebrate(signin.achievement, pack, lib, { roster, family: next });
    }
    return { family: next, signin, scorch };
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
    if (noteTextIsDeleted(next, row.text) || (row.id && (next.deletedNotes.ids || []).indexOf(String(row.id)) >= 0)) {
      return next;
    }
    next.notes = next.notes.concat([row]);
    saveFamily(next);
    if (row.from === "bennett" && row.kind !== "plan" && String(row.text || "").trim()) {
      addBananas(WORK_ACTION_BANANAS);
    }
    track(row.kind === "question" ? "ask_parent" : "work_note", {
      assignmentId: row.targetId || "",
      classId: row.classId || "",
      termId: row.termId || ""
    });
    queueNotePush(next);
    return next;
  }

  function helpAskAlreadyNoted(family, workId, text) {
    const line = String(text || "").trim();
    if (!line) return true;
    if (noteTextIsDeleted(family, line)) return true;
    return ((family && family.notes) || []).some((n) => {
      return !!(n && n.from === "bennett" && String(n.text || "").trim() === line);
    });
  }

  function promoteHelpAskToInbox(family, work, text) {
    const line = String(text || "").trim();
    const targetId = work && work.id ? String(work.id) : "";
    if (!line || !targetId) return normalizeFamily(family);
    if (noteTextIsDeleted(family, line)) return normalizeFamily(family);
    if (helpAskAlreadyNoted(family, targetId, line)) return normalizeFamily(family);
    return addNote(family, {
      id: uid("q"),
      targetType: "work",
      targetId,
      from: "bennett",
      kind: "question",
      text: line,
      at: nowIso(),
      classId: classIdForWork(work) || undefined,
      termId: work.termId || undefined,
      source: "help"
    });
  }

  function looseAskTitle(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/^test:\s*/i, "")
      .replace(/^english 10:\s*/i, "")
      .replace(/^marching band:\s*/i, "")
      .replace(/^band:\s*/i, "")
      .replace(/^sociology:\s*/i, "")
      .replace(/^web design i:\s*/i, "")
      .replace(/^academic intervention:\s*/i, "")
      .replace(/^chemistry:\s*/i, "")
      .replace(/^strength & conditioning i:\s*/i, "")
      .replace(/^geometry:\s*/i, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function workForAskTitle(workList, title) {
    const want = String(title || "").trim();
    if (!want) return null;
    const list = (workList || []).filter((w) => w && (w.id || w.title));
    const exact = list.find((w) => w.title === want || w.id === want);
    if (exact) return exact;
    const a = looseAskTitle(want);
    if (!a) return null;
    let best = null;
    let bestN = 0;
    list.forEach((w) => {
      const b = looseAskTitle(w.title);
      let n = 0;
      if (a === b) n = 100;
      else if (b && (a.indexOf(b) >= 0 || b.indexOf(a) >= 0)) n = 80;
      else if (/\bcomic\b/.test(a) && /\bcomic\b/.test(b)) n = 75;
      if (n > bestN) {
        bestN = n;
        best = w;
      }
    });
    return bestN >= 75 ? best : null;
  }

  function promoteAskThreadToInbox(family, week) {
    let next = normalizeFamily(family);
    pruneStoredAskThread(next.deletedNotes);
    const work = ((week && week.work) || [])
      .concat(((next.overlay && next.overlay.week && next.overlay.week.added && next.overlay.week.added.work) || []));
    const thread = mergeAskThreads(getAskThread(), next.overlay && next.overlay.ask);
    thread.messages = pruneAskMessages(thread.messages, next.deletedNotes);
    thread.messages.forEach((m) => {
      if (!m || m.role !== "bennett" || !String(m.text || "").trim()) return;
      if (noteTextIsDeleted(next, m.text)) return;
      const title = String(m.title || "").trim();
      const match = workForAskTitle(work, title);
      if (!match || !match.id) return;
      next = promoteHelpAskToInbox(next, match, m.text);
    });
    return next;
  }

  function noteTargetKey(n) {
    return String((n && n.targetType) || "") + ":" + String((n && n.targetId) || "");
  }

  function isBennettAsk(n) {
    return !!(n && n.from === "bennett" && n.kind !== "note" && n.kind !== "plan" && String(n.text || "").trim());
  }

  function isBennettPlan(n) {
    return !!(n && n.from === "bennett" && n.kind === "plan" && String(n.text || "").trim());
  }

  function workPlanFor(family, workId) {
    const id = String(workId || "");
    if (!id) return null;
    const rows = ((family && family.notes) || []).filter((n) => isBennettPlan(n) && String(n.targetId || "") === id);
    rows.sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    return rows[0] || null;
  }

  function saveWorkPlan(family, work, text) {
    const line = String(text || "").trim().slice(0, 2000);
    const next = normalizeFamily(family);
    const targetId = work && work.id ? String(work.id) : "";
    if (!targetId) return next;
    const existing = workPlanFor(next, targetId);
    if (!line) {
      if (existing) return deleteNote(next, existing.id);
      return next;
    }
    if (existing) return updateNote(next, existing.id, { text: line, at: nowIso() });
    return addNote(next, {
      id: uid("plan"),
      targetType: "work",
      targetId,
      from: "bennett",
      kind: "plan",
      text: line,
      at: nowIso(),
      classId: classIdForWork(work) || undefined,
      termId: work.termId || undefined
    });
  }

  function isParentAuthor(n) {
    const from = n && typeof n === "object" ? n.from : n;
    return from === "parent" || from === "mom" || from === "orin";
  }

  function isParentReply(n) {
    return !!(n && isParentAuthor(n) && (n.kind === "reply" || n.replyTo) && String(n.text || "").trim());
  }

  function parentNoteFrom() {
    const role = String(telemetryDeviceRole() || "").trim().toLowerCase();
    if (role === "parent") return "mom";
    if (role === "orin") return "orin";
    if (!role) return siteView() === "mom" ? "mom" : "orin";
    return "orin";
  }

  function noteAuthorLabel(note, view) {
    const v = normalizeSiteView(view || siteView());
    const from = note && note.from;
    const reply = isParentReply(note);
    const noted = !!(note && note.kind === "note" && !reply);
    const own = (from === "bennett" && v === "bennett")
      || (from === "mom" && v === "mom")
      || (from === "orin" && v === "me");
    if (own) {
      if (reply) return "You replied";
      if (noted) return "You noted";
      if (note && note.kind === "plan") return "You planned";
      return "You asked";
    }
    if (from === "bennett") {
      if (note && note.kind === "plan") return "Bennett planned";
      return noted ? "Bennett noted" : "Bennett asked";
    }
    if (from === "mom") return reply ? "Mom replied" : "Mom noted";
    if (from === "orin") return reply ? "Dad replied" : "Dad noted";
    if (from === "parent") return reply ? "Mom/Dad replied" : "Parent note";
    if (reply) return "Mom/Dad replied";
    if (noted) return "Parent note";
    return "Note";
  }

  function inboxSeenStorageKey(view) {
    return "bw-messages-seen-" + normalizeSiteView(view || siteView());
  }

  function getInboxSeen(view) {
    try {
      return String(localStorage.getItem(inboxSeenStorageKey(view)) || "");
    } catch (_) {
      return "";
    }
  }

  function setInboxSeen(view, iso) {
    try {
      localStorage.setItem(inboxSeenStorageKey(view), String(iso || nowIso()));
    } catch (_) {}
    return getInboxSeen(view);
  }

  function ensureInboxSeen(view) {
    const cur = getInboxSeen(view);
    if (cur) return cur;
    return setInboxSeen(view, nowIso());
  }

  function markInboxSeen(view) {
    return setInboxSeen(view, nowIso());
  }

  function noteIsNewer(note, seen) {
    return !!(note && note.at && String(note.at) > String(seen || ""));
  }

  function inboxUnreadCount(family, view) {
    const v = normalizeSiteView(view || siteView());
    if (!getInboxSeen(v)) {
      setInboxSeen(v, nowIso());
      return 0;
    }
    const seen = getInboxSeen(v);
    const notes = (family && family.notes) || [];
    let n = 0;
    notes.forEach((note) => {
      if (!note || !String(note.text || "").trim()) return;
      if (!noteIsNewer(note, seen)) return;
      if (v === "bennett") {
        if (isParentReply(note)) n += 1;
        return;
      }
      if (v === "mom") {
        if (isBennettAsk(note) || isBennettPlan(note) || (isParentReply(note) && note.from === "orin")) n += 1;
        return;
      }
      if (isBennettAsk(note) || isBennettPlan(note) || (isParentReply(note) && note.from === "mom")) n += 1;
    });
    if (v !== "bennett") {
      (((family && family.reflections && family.reflections.answers) || [])).forEach((row) => {
        if (row && String(row.text || "").trim() && noteIsNewer(row, seen)) n += 1;
      });
    }
    return n;
  }

  function parentRepliesForAsk(family, ask) {
    const notes = (family && family.notes) || [];
    if (!ask) return [];
    const seen = Object.create(null);
    const out = [];
    notes.forEach((n) => {
      if (!isParentReply(n) || seen[n.id]) return;
      const linked = n.replyTo === ask.id || (!n.replyTo && noteTargetKey(n) === noteTargetKey(ask));
      if (!linked) return;
      seen[n.id] = true;
      out.push(n);
    });
    return out.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  }

  function askHasParentReply(family, ask) {
    return parentRepliesForAsk(family, ask).length > 0;
  }

  function inboxAsks(family) {
    return ((family && family.notes) || []).filter((n) => isBennettAsk(n));
  }

  function isInboxThreadNote(n) {
    if (!n || !String(n.text || "").trim()) return false;
    if (isBennettAsk(n) || isBennettPlan(n) || isParentReply(n)) return true;
    return n.kind === "note";
  }

  function inboxConversations(family) {
    const groups = Object.create(null);
    ((family && family.notes) || []).forEach((n) => {
      if (!isInboxThreadNote(n)) return;
      const key = noteTargetKey(n) || ("lone:" + n.id);
      if (!groups[key]) groups[key] = { key, notes: [], at: String(n.at || "") };
      groups[key].notes.push(n);
      const at = String(n.at || "");
      if (at > groups[key].at) groups[key].at = at;
    });
    return Object.keys(groups).map((k) => {
      const g = groups[k];
      g.notes.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
      return g;
    }).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  }

  function threadNeedsReply(notes) {
    let lastAsk = "";
    let lastReply = "";
    (notes || []).forEach((n) => {
      if (isBennettAsk(n)) lastAsk = String(n.at || "");
      if (isParentReply(n)) lastReply = String(n.at || "");
    });
    return !!(lastAsk && lastAsk > lastReply);
  }

  function latestAskInThread(notes) {
    const asks = (notes || []).filter(isBennettAsk);
    return asks.length ? asks[asks.length - 1] : null;
  }

  function bennettAsks(family) {
    return inboxAsks(family).filter((n) => !n.test);
  }

  function threadStamp(family, ask) {
    let latest = String((ask && ask.at) || "");
    parentRepliesForAsk(family, ask).forEach((r) => {
      const at = String((r && r.at) || "");
      if (at > latest) latest = at;
    });
    return latest;
  }

  function deleteAskThread(family, askId) {
    const next = normalizeFamily(family);
    const ask = (next.notes || []).find((n) => n && n.id === askId);
    const ids = [askId].concat(parentRepliesForAsk(next, ask).map((r) => r.id));
    let out = next;
    ids.forEach((id) => {
      out = deleteNote(out, id);
    });
    return out;
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

  function familySyncReady() {
    const tel = global.Telemetry;
    if (!tel) return false;
    if (typeof tel.progressSyncAvailable === "function" && tel.progressSyncAvailable()) return true;
    return typeof tel.connected === "function" && tel.connected();
  }

  function queueNotePush(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.upsertNotes !== "function" || !familySyncReady()) return;
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
    if (!tel || typeof tel.upsertNotes !== "function" || !familySyncReady()) return { pushed: 0, missing: false, failed: false };
    const notes = ((family && family.notes) || []).filter((n) => n && n.id);
    if (!notes.length) return { pushed: 0, missing: false };
    try {
      await tel.upsertNotes(notes);
      return { pushed: notes.length, missing: false };
    } catch (err) {
      const missing = !!(err && (err.status === 404 || err.status === 406));
      return { pushed: 0, missing, failed: true };
    }
  }

  async function flushFamilyNotes(family) {
    const next = normalizeFamily(family || getFamilyDraft() || emptyFamily());
    await pushFamilyNotes(next);
    const synced = await syncFamilyNotes(getFamilyDraft() || next);
    return synced.family;
  }

  async function pullFamilyNotes() {
    const tel = global.Telemetry;
    if (!tel || typeof tel.fetchNotes !== "function" || !familySyncReady()) {
      return { notes: [], missing: false, offline: !familySyncReady() };
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
    if (!familySyncReady()) {
      return { family: next, pulled: 0, pushed: 0, missing: false, offline: true };
    }
    const pulled = await pullFamilyNotes();
    if (pulled.missing) {
      return { family: next, pulled: 0, pushed: 0, missing: true, offline: false };
    }
    const merged = mergeNotesById(next.notes, pulled.notes);
    const kept = applyDeletedNotes(merged, next.deletedNotes);
    const swept = merged.filter((n) => n && n.id && noteIsDeleted(n, next.deletedNotes));
    if (swept.length && tel && typeof tel.deleteNote === "function") {
      swept.forEach((n) => tel.deleteNote(n.id).catch(() => {}));
    }
    const toPush = notesNewerThan(kept, pulled.notes);
    let pushed = 0;
    if (toPush.length && typeof tel.upsertNotes === "function") {
      try {
        await tel.upsertNotes(toPush);
        pushed = toPush.length;
      } catch (err) {
        if (err && (err.status === 404 || err.status === 406)) {
          next.notes = kept;
          saveFamily(next);
          return { family: next, pulled: pulled.notes.length, pushed: 0, missing: true, offline: false };
        }
      }
    }
    next.notes = kept;
    saveFamily(next);
    return { family: next, pulled: pulled.notes.length, pushed, missing: false, offline: false };
  }

  function missingSync(err) {
    const tel = global.Telemetry;
    if (tel && typeof tel.isMissingTable === "function") return tel.isMissingTable(err);
    return !!(err && (err.status === 404 || err.status === 406));
  }

  function progressRecordFromRemote(row) {
    const src = row && typeof row === "object" ? row : {};
    const tel = global.Telemetry;
    const mapped = (src.updated_at || src.started_at != null || src.started_history)
      ? (tel && typeof tel.rowToProgress === "function" ? tel.rowToProgress(src) : src)
      : src;
    const done = mapped.done == null ? src.done : mapped.done;
    return {
      started: mapped.started === false ? false : !!mapped.started,
      startedAt: mapped.startedAt || mapped.started_at || src.startedAt || null,
      done: done == null || done === false || done === "" ? null : done,
      startedHistory: Array.isArray(mapped.startedHistory) ? mapped.startedHistory : (Array.isArray(src.startedHistory) ? src.startedHistory : []),
      startedAwarded: !!(mapped.startedAwarded || src.startedAwarded),
      doneAwarded: !!(mapped.doneAwarded || src.doneAwarded),
      updatedAt: mapped.updatedAt || mapped.updated_at || src.updatedAt || src.updated_at || ""
    };
  }

  function mergeProgressByUpdatedAt(local, remoteRows) {
    const all = Object.assign({}, local && typeof local === "object" ? local : {});
    (remoteRows || []).forEach((row) => {
      const rec = progressRecordFromRemote(row);
      const id = String((row && (row.assignment_id || row.id)) || rec.assignment_id || rec.id || "");
      if (!id) return;
      const cur = all[id] || {};
      if (String(rec.updatedAt || "") >= String(cur.updatedAt || "")) all[id] = rec;
    });
    return all;
  }

  function progressRowsToPush(local, remoteRows) {
    const remoteMap = Object.create(null);
    (remoteRows || []).forEach((row) => {
      const rec = progressRecordFromRemote(row);
      const id = String((row && (row.assignment_id || row.id)) || rec.assignment_id || rec.id || "");
      if (id) remoteMap[id] = rec;
    });
    const tel = global.Telemetry;
    const cfg = tel && tel.getConfig ? tel.getConfig() : {};
    const device = tel && tel.deviceId ? tel.deviceId() : "";
    return Object.keys(local || {}).map((id) => {
      const rec = local[id];
      if (!rec || typeof rec !== "object") return null;
      if (!rec.updatedAt && !rec.started && !rec.done && rec.started !== false) return null;
      const other = remoteMap[id];
      if (other && String(rec.updatedAt || "") <= String(other.updatedAt || "")) return null;
      return tel && tel.progressToRow ? tel.progressToRow(id, rec, cfg.familyToken, device) : Object.assign({ id }, rec);
    }).filter(Boolean);
  }

  function stampLegacyProgress() {
    const all = getProgress();
    let changed = false;
    Object.keys(all).forEach((id) => {
      const rec = all[id];
      if (!rec || typeof rec !== "object" || rec.updatedAt) return;
      if (!(rec.done || rec.startedAwarded || rec.doneAwarded || rec.started || rec.started === false)) return;
      rec.updatedAt = nowIso();
      changed = true;
    });
    if (changed) write(KEYS.progress, all);
    return all;
  }

  let progressPushTimer = null;

  function progressSyncReady() {
    const tel = global.Telemetry;
    if (!tel || typeof tel.fetchProgress !== "function" || typeof tel.upsertProgress !== "function") return false;
    return familySyncReady();
  }

  function queueProgressPush() {
    if (!progressSyncReady()) return;
    if (typeof setTimeout !== "function") {
      pushFamilyProgress();
      return;
    }
    if (progressPushTimer) clearTimeout(progressPushTimer);
    progressPushTimer = setTimeout(() => {
      progressPushTimer = null;
      pushFamilyProgress();
    }, 400);
  }

  async function pushFamilyProgress() {
    const tel = global.Telemetry;
    if (!progressSyncReady() || typeof tel.upsertProgress !== "function") return { pushed: 0, missing: false, failed: false };
    stampLegacyProgress();
    const rows = progressRowsToPush(getProgress(), []);
    if (!rows.length) return { pushed: 0, missing: false, failed: false };
    try {
      await tel.upsertProgress(rows);
      return { pushed: rows.length, missing: false, failed: false };
    } catch (err) {
      return { pushed: 0, missing: missingSync(err), failed: true };
    }
  }

  async function syncFamilyProgress() {
    const tel = global.Telemetry;
    if (!progressSyncReady()) {
      return { pulled: 0, pushed: 0, missing: false, offline: true, changed: false, failed: false };
    }
    stampLegacyProgress();
    const before = JSON.stringify(getProgress());
    let remote = [];
    try {
      const rows = await tel.fetchProgress();
      remote = (Array.isArray(rows) ? rows : []).map((row) => tel.rowToProgress ? tel.rowToProgress(row) : row).filter((r) => r && r.id);
    } catch (err) {
      return { pulled: 0, pushed: 0, missing: missingSync(err), offline: false, changed: false, failed: true };
    }
    const merged = mergeProgressByUpdatedAt(getProgress(), remote);
    write(KEYS.progress, merged);
    const toPush = progressRowsToPush(merged, remote);
    let pushed = 0;
    if (toPush.length) {
      try {
        await tel.upsertProgress(toPush);
        pushed = toPush.length;
      } catch (err) {
        return {
          pulled: remote.length,
          pushed: 0,
          missing: missingSync(err),
          offline: false,
          changed: JSON.stringify(merged) !== before,
          failed: true
        };
      }
    }
    return {
      pulled: remote.length,
      pushed,
      missing: false,
      offline: false,
      changed: JSON.stringify(merged) !== before || pushed > 0,
      failed: false
    };
  }

  function localWorkSyncRows(family) {
    const o = normalizeFamily(family).overlay.week;
    const byId = Object.create(null);
    const bump = (id, row) => {
      const cur = byId[id];
      if (!cur || String(row.updatedAt || "") >= String(cur.updatedAt || "")) byId[id] = row;
    };
    (o.added.work || []).forEach((w) => {
      if (w && w.id) bump(w.id, { id: w.id, payload: w, deleted: false, updatedAt: w.updatedAt || "" });
    });
    Object.keys(o.edits.work || {}).forEach((id) => {
      const patch = o.edits.work[id];
      if (!patch) return;
      bump(id, { id, payload: Object.assign({ id }, patch), deleted: false, updatedAt: patch.updatedAt || "" });
    });
    (o.deleted.work || []).forEach((id) => {
      bump(id, {
        id,
        payload: { id },
        deleted: true,
        updatedAt: (o.deletedAt && o.deletedAt.work && o.deletedAt.work[id]) || ""
      });
    });
    return Object.keys(byId).map((id) => byId[id]);
  }

  function applyRemoteWorkRow(family, row) {
    const rec = row && typeof row === "object" ? row : {};
    const id = String(rec.id || "");
    if (!id) return normalizeFamily(family);
    const at = rec.updatedAt || nowIso();
    if (rec.deleted) return deleteWeekOverlay(family, "work", id, at);
    const payload = Object.assign({}, rec.payload || {}, { id, updatedAt: at });
    let next = addWeekItem(family, "work", payload);
    next = editWeekOverlay(next, "work", id, payload, at);
    if (payload.classId) {
      next = addProgressItem(next, payload.classId, {
        id,
        title: String(payload.title || "").replace(/^[^:]+:\s*/, "") || payload.title,
        kind: "assignment",
        classId: payload.classId,
        termId: payload.termId,
        due: payload.due
      });
    }
    return next;
  }

  function mergeWorkByUpdatedAt(family, remoteRows) {
    overlaySyncing = true;
    try {
      let next = normalizeFamily(family);
      const local = localWorkSyncRows(next);
      const localMap = Object.create(null);
      local.forEach((row) => { localMap[row.id] = row; });
      (remoteRows || []).forEach((row) => {
        if (!row || !row.id) return;
        const cur = localMap[row.id];
        if (cur && String(cur.updatedAt || "") > String(row.updatedAt || "")) return;
        next = applyRemoteWorkRow(next, row);
      });
      return next;
    } finally {
      overlaySyncing = false;
    }
  }

  let workPushTimer = null;
  let overlaySyncing = false;

  function queueWorkPush(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.upsertWork !== "function" || !familySyncReady()) return;
    if (typeof setTimeout !== "function") {
      pushFamilyWork(family);
      return;
    }
    if (workPushTimer) clearTimeout(workPushTimer);
    workPushTimer = setTimeout(() => {
      workPushTimer = null;
      pushFamilyWork(family);
    }, 400);
  }

  async function pushFamilyWork(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.upsertWork !== "function" || !familySyncReady()) return { pushed: 0, missing: false };
    const rows = localWorkSyncRows(family);
    if (!rows.length) return { pushed: 0, missing: false };
    try {
      await tel.upsertWork(rows);
      return { pushed: rows.length, missing: false };
    } catch (err) {
      return { pushed: 0, missing: missingSync(err) };
    }
  }

  async function syncFamilyWork(family) {
    const next = normalizeFamily(family);
    const tel = global.Telemetry;
    if (!familySyncReady()) {
      return { family: next, pulled: 0, pushed: 0, missing: false, offline: true };
    }
    let remote = [];
    try {
      const rows = await tel.fetchWork();
      remote = (Array.isArray(rows) ? rows : []).map((row) => tel.rowToWork ? tel.rowToWork(row) : row).filter((r) => r && r.id);
    } catch (err) {
      return { family: next, pulled: 0, pushed: 0, missing: missingSync(err), offline: false };
    }
    const merged = mergeWorkByUpdatedAt(next, remote);
    const local = localWorkSyncRows(merged);
    const remoteMap = Object.create(null);
    remote.forEach((row) => { remoteMap[row.id] = row; });
    const toPush = local.filter((row) => {
      const other = remoteMap[row.id];
      if (!other) return true;
      return String(row.updatedAt || "") > String(other.updatedAt || "");
    });
    let pushed = 0;
    if (toPush.length) {
      try {
        await tel.upsertWork(toPush);
        pushed = toPush.length;
      } catch (err) {
        return { family: merged, pulled: remote.length, pushed: 0, missing: missingSync(err), offline: false };
      }
    }
    return { family: merged, pulled: remote.length, pushed, missing: false, offline: false };
  }

  function mergeAddedById(localList, remoteList) {
    const map = Object.create(null);
    const put = (row) => {
      if (!row || !row.id) return;
      const cur = map[row.id];
      if (!cur || String(row.updatedAt || "") >= String(cur.updatedAt || "")) map[row.id] = row;
    };
    (localList || []).forEach(put);
    (remoteList || []).forEach(put);
    return Object.keys(map).map((id) => map[id]);
  }

  function mergeEditsById(localMap, remoteMap) {
    const out = Object.assign({}, localMap || {});
    Object.keys(remoteMap || {}).forEach((id) => {
      const remote = remoteMap[id];
      const local = out[id];
      if (!local || String((remote && remote.updatedAt) || "") > String((local && local.updatedAt) || "")) {
        out[id] = remote;
      }
    });
    return out;
  }

  function unionIds(a, b) {
    return Array.from(new Set([].concat(a || [], b || []).filter((id) => id != null && id !== "")));
  }

  function mergeWeekOverlay(local, remote) {
    const L = normalizeOverlay({ week: local }).week;
    const R = normalizeOverlay({ week: remote }).week;
    const deletedAt = {
      events: Object.assign({}, L.deletedAt.events, R.deletedAt.events),
      work: Object.assign({}, L.deletedAt.work, R.deletedAt.work),
      notes: Object.assign({}, L.deletedAt.notes, R.deletedAt.notes)
    };
    Object.keys(R.deletedAt.events || {}).forEach((id) => {
      if (String(R.deletedAt.events[id] || "") >= String(L.deletedAt.events[id] || "")) deletedAt.events[id] = R.deletedAt.events[id];
    });
    Object.keys(R.deletedAt.work || {}).forEach((id) => {
      if (String(R.deletedAt.work[id] || "") >= String(L.deletedAt.work[id] || "")) deletedAt.work[id] = R.deletedAt.work[id];
    });
    Object.keys(R.deletedAt.notes || {}).forEach((id) => {
      if (String(R.deletedAt.notes[id] || "") >= String(L.deletedAt.notes[id] || "")) deletedAt.notes[id] = R.deletedAt.notes[id];
    });
    return {
      deleted: {
        events: unionIds(L.deleted.events, R.deleted.events),
        work: unionIds(L.deleted.work, R.deleted.work),
        notes: unionIds(L.deleted.notes, R.deleted.notes)
      },
      deletedAt,
      edits: {
        events: mergeEditsById(L.edits.events, R.edits.events),
        work: mergeEditsById(L.edits.work, R.edits.work),
        notes: mergeEditsById(L.edits.notes, R.edits.notes)
      },
      added: {
        events: mergeAddedById(L.added.events, R.added.events),
        work: mergeAddedById(L.added.work, R.added.work),
        notes: mergeAddedById(L.added.notes, R.added.notes)
      }
    };
  }

  function mergeProgressOverlay(local, remote) {
    const L = normalizeOverlay({ progress: local }).progress;
    const R = normalizeOverlay({ progress: remote }).progress;
    return {
      deletedClasses: unionIds(L.deletedClasses, R.deletedClasses),
      deletedItems: unionIds(L.deletedItems, R.deletedItems),
      classEdits: mergeEditsById(L.classEdits, R.classEdits),
      itemEdits: mergeEditsById(L.itemEdits, R.itemEdits),
      addedClasses: mergeAddedById(L.addedClasses, R.addedClasses),
      addedItems: mergeAddedById(L.addedItems, R.addedItems)
    };
  }

  function mergeFamilyOverlay(localOverlay, remoteOverlay) {
    const local = normalizeOverlay(localOverlay);
    const remote = normalizeOverlay(remoteOverlay);
    const merged = {
      week: mergeWeekOverlay(local.week, remote.week),
      progress: mergeProgressOverlay(local.progress, remote.progress),
      soundCues: String(local.updatedAt || "") >= String(remote.updatedAt || "")
        ? Object.assign({}, remote.soundCues, local.soundCues)
        : Object.assign({}, local.soundCues, remote.soundCues),
      library: mergeLibrary(local.library, remote.library),
      ask: mergeAskThreads(local.ask, remote.ask),
      reflections: mergeReflections(local.reflections, remote.reflections),
      deletedNotes: mergeDeletedNotes(local.deletedNotes, remote.deletedNotes),
      achievements: mergeAchievementsPack(local.achievements, remote.achievements),
      awards: mergeAwardsPack(local.awards, remote.awards),
      updatedAt: String(local.updatedAt || "") >= String(remote.updatedAt || "") ? local.updatedAt : remote.updatedAt
    };
    merged.ask.messages = pruneAskMessages(merged.ask.messages, merged.deletedNotes);
    return merged;
  }

  function mergeCharacterUnlockMaps(newerMap, olderMap, newerStreaks) {
    const a = asUnlockMap(newerMap);
    const b = asUnlockMap(olderMap);
    const merged = Object.assign({}, b, a);
    Object.keys(merged).forEach((id) => {
      if (a[id]) return;
      const stillGranted = Object.keys(newerStreaks || {}).some((achId) => {
        const st = newerStreaks[achId];
        return !!(st && st.awarded && streakUnlockMatches(st, "character", id));
      });
      if (stillGranted) return;
      const revoked = Object.keys(newerStreaks || {}).some((achId) => {
        const st = newerStreaks[achId];
        return !!(st && !st.awarded && st.revokedAt && streakUnlockMatches(st, "character", id));
      });
      if (revoked) delete merged[id];
    });
    return merged;
  }

  function mergeAwardsPack(localAwards, remoteAwards) {
    const local = normalizeAwardsPack(localAwards);
    const remote = normalizeAwardsPack(remoteAwards);
    const newerFirst = String(local.updatedAt || "") >= String(remote.updatedAt || "");
    const a = newerFirst ? local : remote;
    const b = newerFirst ? remote : local;
    return {
      streaks: Object.assign({}, b.streaks, a.streaks),
      characterUnlocks: mergeCharacterUnlockMaps(a.characterUnlocks, b.characterUnlocks, a.streaks),
      gearUnlocks: Object.assign({}, b.gearUnlocks, a.gearUnlocks),
      contentUnlocks: Object.assign({}, b.contentUnlocks, a.contentUnlocks),
      unlocks: a.updatedAt ? Object.assign({}, a.unlocks) : Object.assign({}, b.unlocks, a.unlocks),
      loginDays: asYmdList([].concat(a.loginDays || [], b.loginDays || [])),
      updatedAt: a.updatedAt || b.updatedAt
    };
  }

  function overlayFingerprint(overlay) {
    const o = normalizeOverlay(overlay);
    return JSON.stringify({
      week: o.week,
      progress: o.progress,
      soundCues: o.soundCues,
      library: ((o.library && o.library.items) || []).map((item) => [item.id, item.url || "", item.path || ""]),
      ask: ((o.ask && o.ask.messages) || []).map((m) => m.id),
      reflections: ((o.reflections && o.reflections.answers) || []).map((a) => a.id),
      deletedNotes: o.deletedNotes,
      achievements: ((o.achievements && o.achievements.achievements) || []).map((ach) => ach.id),
      awards: {
        characters: Object.keys((o.awards && o.awards.characterUnlocks) || {}),
        loginDays: (o.awards && o.awards.loginDays) || []
      }
    });
  }

  let overlayPushTimer = null;

  function queueOverlayPush(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.upsertOverlay !== "function" || !familySyncReady()) return;
    if (typeof setTimeout !== "function") {
      pushFamilyOverlay(family);
      queueWorkPush(family);
      return;
    }
    if (overlayPushTimer) clearTimeout(overlayPushTimer);
    overlayPushTimer = setTimeout(() => {
      overlayPushTimer = null;
      pushFamilyOverlay(family);
      queueWorkPush(family);
    }, 400);
  }

  function packOverlayBoard(family) {
    const next = normalizeFamily(family);
    const packed = normalizeOverlay(next.overlay);
    packed.soundCues = asCueMap(next.soundCues);
    packed.library = libraryCatalog(getMomLibrary() || packed.library || { items: [] });
    packed.ask = normalizeAskThread(getAskThread());
    packed.ask.messages = pruneAskMessages(packed.ask.messages, next.deletedNotes);
    packed.deletedNotes = next.deletedNotes;
    packed.reflections = mergeReflections(next.reflections, packed.reflections);
    const draft = getMomDraft();
    if (draft && Array.isArray(draft.achievements) && draft.achievements.length) {
      packed.achievements = {
        currency: draft.currency || packed.achievements.currency,
        achievements: draft.achievements,
        updatedAt: packed.achievements.updatedAt || draft.updatedAt || nowIso()
      };
    }
    packed.awards = packed.awards && packed.awards.updatedAt
      ? packed.awards
      : {
        streaks: next.streaks || {},
        characterUnlocks: Object.assign({}, getCharacterUnlocks(), next.characterUnlocks || {}),
        gearUnlocks: Object.assign({}, getGearUnlocks(), next.gearUnlocks || {}),
        contentUnlocks: Object.assign({}, getContentUnlocks(), next.contentUnlocks || {}),
        unlocks: getUnlocks(),
        updatedAt: packed.awards && packed.awards.updatedAt || ""
      };
    return packed;
  }

  async function pushFamilyOverlay(family) {
    const tel = global.Telemetry;
    if (!tel || typeof tel.upsertOverlay !== "function" || !familySyncReady()) return { pushed: 0, missing: false };
    const packed = packOverlayBoard(family);
    try {
      await tel.upsertOverlay(packed);
      return { pushed: 1, missing: false };
    } catch (err) {
      return { pushed: 0, missing: missingSync(err) };
    }
  }

  async function syncFamilyOverlay(family) {
    const next = normalizeFamily(family);
    const tel = global.Telemetry;
    if (!familySyncReady()) {
      return { family: next, pulled: 0, pushed: 0, missing: false, offline: true, changed: false };
    }
    let remote = null;
    try {
      const row = await tel.fetchOverlay();
      remote = row ? (tel.rowToOverlay ? tel.rowToOverlay(row) : row) : null;
    } catch (err) {
      return { family: next, pulled: 0, pushed: 0, missing: missingSync(err), offline: false, changed: false };
    }
    const before = overlayFingerprint(next.overlay);
    overlaySyncing = true;
    try {
      if (remote) {
        next.overlay = mergeFamilyOverlay(next.overlay, remote);
        next.soundCues = asCueMap(next.overlay.soundCues);
        applyOverlayLibrary(next.overlay.library);
        applyOverlayAsk(next.overlay.ask);
        applyOverlayAchievements(next.overlay.achievements);
        Object.assign(next, applyOverlayAwards(next, next.overlay.awards));
        next.reflections = mergeReflections(next.reflections, next.overlay.reflections);
        saveFamily(next);
      }
    } finally {
      overlaySyncing = false;
    }
    const after = overlayFingerprint(next.overlay);
    const localNewer = !remote || String(next.overlay.updatedAt || "") > String(remote.updatedAt || "");
    let pushed = 0;
    if (localNewer && (next.overlay.updatedAt || after !== overlayFingerprint(emptyOverlay()))) {
      try {
        await tel.upsertOverlay(packOverlayBoard(next));
        pushed = 1;
      } catch (err) {
        return { family: next, pulled: remote ? 1 : 0, pushed: 0, missing: missingSync(err), offline: false, changed: before !== after };
      }
    }
    return {
      family: next,
      pulled: remote ? 1 : 0,
      pushed,
      missing: false,
      offline: false,
      changed: before !== after
    };
  }

  function boardSyncNotice(sync) {
    return "";
  }

  function familySnapshot(family) {
    const next = normalizeFamily(family);
    return JSON.stringify({
      notes: next.notes,
      reflections: next.reflections,
      overlay: overlayFingerprint(next.overlay),
      progress: getProgress()
    });
  }

  async function syncFamilyLive(family) {
    const notes = await syncFamilyNotes(family);
    let next = notes.family;
    const progress = await syncFamilyProgress();
    const overlay = await syncFamilyOverlay(next);
    next = overlay.family;
    const work = await syncFamilyWork(next);
    next = work.family;
    const beforeAskNotes = (next.notes || []).length;
    next = promoteAskThreadToInbox(next, {
      work: ((next.overlay && next.overlay.week && next.overlay.week.added && next.overlay.week.added.work) || [])
    });
    if ((next.notes || []).length > beforeAskNotes) {
      await pushFamilyNotes(next);
    }
    const missing = !!(notes.missing || progress.missing || overlay.missing || work.missing);
    const offline = !!(notes.offline && progress.offline && overlay.offline && work.offline);
    return {
      family: next,
      pulled: (notes.pulled || 0) + (progress.pulled || 0) + (overlay.pulled || 0) + (work.pulled || 0),
      pushed: (notes.pushed || 0) + (progress.pushed || 0) + (overlay.pushed || 0) + (work.pushed || 0),
      missing,
      offline,
      changed: !!(overlay.changed || notes.pulled || progress.pulled || progress.changed || work.pulled)
    };
  }

  async function syncFamilyBoard(family) {
    return syncFamilyLive(family);
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
      from: parentNoteFrom(),
      kind: "reply",
      replyTo: q.id,
      text: body,
      at: nowIso(),
      classId: q.classId,
      termId: q.termId
    });
  }

  function inboxDayHeading(ymd) {
    const key = String(ymd || "");
    if (!key || key === "undated") return "Undated";
    const today = chicagoYmd();
    if (key === today) return "Today";
    const [y, m, d] = today.split("-").map(Number);
    const yest = new Date(y, m - 1, d);
    yest.setDate(yest.getDate() - 1);
    if (key === chicagoYmd(yest)) return "Yesterday";
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "numeric",
        day: "numeric",
        timeZone: "America/Chicago"
      }).format(parseStamp(key + "T12:00:00") || new Date(key + "T12:00:00"));
    } catch (_) {
      return key;
    }
  }

  function uniqueThreadNotes(notes) {
    const seen = Object.create(null);
    return (notes || []).filter((n) => {
      if (!n || !String(n.text || "").trim()) return false;
      const k = String(n.from || "") + "|" + noteTextKey(n.text);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function messagesInboxHtml(family, week, opts) {
    const o = opts || {};
    const view = normalizeSiteView(o.view || siteView());
    const canEdit = o.canEdit !== false && view !== "bennett";
    const canDelete = o.canDelete !== false && view === "me";
    const filter = o.filter === "daily" || o.filter === "class" ? o.filter : "both";
    const threads = filter === "daily"
      ? []
      : inboxConversations(family).map((thread) => {
        const notes = uniqueThreadNotes(thread.notes);
        const at = notes.length ? String(notes[notes.length - 1].at || thread.at || "") : String(thread.at || "");
        return Object.assign({}, thread, { notes, at });
      }).filter((thread) => thread.notes && thread.notes.length);
    const answers = filter === "class"
      ? []
      : (((family && family.reflections && family.reflections.answers) || [])).slice()
        .filter((a) => a && String(a.text || "").trim());
    const kid = view === "bennett";
    const emptyCopy = () => {
      if (filter === "daily") {
        return {
          title: kid ? "No daily questions answered yet." : "No daily questions yet.",
          hint: kid
            ? "Answer the check-in on This Week. Mom and Dad see it here."
            : "When Bennett answers the check-in on This Week, it shows up here."
        };
      }
      if (filter === "class") {
        return {
          title: kid ? "No class messages yet." : "No class messages yet.",
          hint: kid
            ? "Ask on a week card or write a Needs you plan. Mom and Dad reply here."
            : "When he taps Ask or writes a plan, the thread shows up here with your replies."
        };
      }
      return {
        title: kid ? "No messages yet." : "No asks or check-ins yet.",
        hint: kid
          ? "Ask on a week card, write a Needs you plan, or answer the check-in on This Week. Mom and Dad see all of it."
          : "When he taps Ask, writes a plan, or answers the check-in on This Week, it shows up here. Newest day first."
      };
    };
    const lineHtml = (n) => `
      <div class="msg-line${isParentReply(n) ? " msg-line-reply" : ""}">
        <p class="msg-line-who">${esc(noteAuthorLabel(n, view))}</p>
        <p class="msg-line-text">${esc(n.text)}</p>
        <p class="msg-stamp">${esc(fmtStamp(n.at))}</p>
        ${canDelete ? `<button type="button" class="tiny danger" data-del-msg="${esc(n.id)}">Delete</button>` : ""}
      </div>`;
    const threadCard = (thread) => {
      const notes = thread.notes || [];
      const head = notes[0] || {};
      const latestAsk = latestAskInThread(notes);
      const unanswered = threadNeedsReply(notes);
      const title = noteTargetLabel(week, head.targetType, head.targetId) || "This item";
      const composer = canEdit && latestAsk ? `
        <label class="msg-reply-label">Reply
          <textarea data-reply="${esc(latestAsk.id)}" maxlength="280" rows="3" placeholder="A short answer he will see on that card"></textarea>
        </label>
        <div class="parent-actions">
          <button type="button" class="btn primary" data-send-reply="${esc(latestAsk.id)}">Send reply</button>
        </div>` : "";
      const onlyPlan = notes.length && notes.every(isBennettPlan);
      const kicker = onlyPlan
        ? "Plan"
        : (canEdit ? (unanswered ? "Needs a reply" : "Answered") : "Thread");
      return `
        <article class="inbox-card msg-card${unanswered ? " msg-card-open" : " msg-card-done"}">
          <p class="msg-kicker">${esc(kicker)}</p>
          <h3>${head.test ? '<span class="test-tag">TEST</span> ' : ""}${esc(title)}</h3>
          ${notes.map(lineHtml).join("")}
          ${composer}
        </article>`;
    };
    const checkCard = (a) => `
      <article class="inbox-card msg-card msg-card-done">
        <p class="msg-kicker">Daily question</p>
        <h3>${a.test ? '<span class="test-tag">TEST</span> ' : ""}${esc(a.prompt || "Quick check-in")}</h3>
        <p class="msg-ask-from">Bennett</p>
        <p class="msg-ask">${esc(a.text)}</p>
        <p class="msg-stamp">${esc(fmtStamp(a.at))}</p>
        ${canDelete ? `<div class="parent-actions"><button type="button" class="tiny danger" data-del-checkin="${esc(a.id)}">Delete</button></div>` : ""}
      </article>`;
    if (filter === "daily") {
      const grouped = groupCheckinsByPrompt(family);
      if (!grouped.filled.length) {
        const empty = emptyCopy();
        return `<div class="messages-empty">
          <p class="empty">${esc(empty.title)}</p>
          <p class="messages-empty-hint">${esc(empty.hint)}</p>
        </div>`;
      }
      return `<div class="msg-board">${grouped.filled.map((g) => `
        <section class="msg-day">
          <h2>${esc(g.prompt)}</h2>
          ${g.answers.map(checkCard).join("")}
        </section>`).join("")}</div>`;
    }
    const feed = threads.map((thread) => ({ kind: "thread", thread, at: thread.at }))
      .concat(answers.map((a) => ({ kind: "checkin", answer: a, at: a.at || "" })))
      .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
    if (!feed.length) {
      const empty = emptyCopy();
      return `<div class="messages-empty">
        <p class="empty">${esc(empty.title)}</p>
        <p class="messages-empty-hint">${esc(empty.hint)}</p>
      </div>`;
    }
    return `<div class="msg-board">${(() => {
      const days = Object.create(null);
      const order = [];
      feed.forEach((row) => {
        const key = stampChicagoYmd(row.at) || "undated";
        if (!days[key]) {
          days[key] = [];
          order.push(key);
        }
        days[key].push(row);
      });
      order.sort((a, b) => String(b).localeCompare(String(a)));
      return order.map((key) => {
        const cards = days[key].map((row) => {
          if (row.kind === "thread") return threadCard(row.thread);
          return checkCard(row.answer);
        }).join("");
        return `<section class="msg-day"><h2>${esc(inboxDayHeading(key))}</h2>${cards}</section>`;
      }).join("");
    })()}</div>`;
  }

  function bindMessagesInbox(root, opts) {
    const o = opts || {};
    let family = o.family;
    if (!root || !root.querySelectorAll) return family;
    const view = siteView();
    const canEdit = o.canEdit !== false && view !== "bennett";
    const canDelete = o.canDelete !== false && view === "me";
    if (canEdit) {
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
          flushFamilyNotes(family).then((next) => {
            family = next;
            if (typeof o.onChange === "function") o.onChange(family);
          }).catch(() => {});
        });
      });
    }
    if (canDelete) {
      root.querySelectorAll("[data-del-msg]").forEach((b) => {
        b.addEventListener("click", () => {
          if (!confirmDelete("message")) return;
          family = deleteNote(family, b.getAttribute("data-del-msg"));
          toast("Deleted everywhere.");
          if (typeof o.onChange === "function") o.onChange(family);
        });
      });
      root.querySelectorAll("[data-del-checkin]").forEach((b) => {
        b.addEventListener("click", () => {
          if (!confirmDelete("check-in")) return;
          family = deleteAnswer(family, b.getAttribute("data-del-checkin"));
          toast("Deleted everywhere.");
          if (typeof o.onChange === "function") o.onChange(family);
        });
      });
    }
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
    const n = inboxUnreadCount(fam);
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
        chip.setAttribute("aria-label", n ? "Messages, " + n + " new" : "Messages");
      }
    });
    return n;
  }

  function hideMessagesChip() {
    if (!document.querySelectorAll) return;
    const nodes = document.querySelectorAll(".messages-chip, a[href='messages.html']");
    Array.from(nodes || []).forEach((el) => {
      if (!el) return;
      if (el.closest && el.closest(".site-view-gate")) return;
      el.hidden = false;
    });
  }

  function shouldBounceMessagesPage() {
    return false;
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
      const play = (funPlayAllowed() && gameHref(ach)) ? `<a class="tiny primary" href="${esc(gameHref(ach))}">Play</a>` : "";
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
    { id: "test-riff-reps", title: "Meet Riff", reward: 10, rewardCharacter: "riff", rewardUnlock: { type: "character", id: "riff", label: "Riff" }, unlock: { type: "class_tour", hours: 24 } },
    { id: "all-assignments-updated", title: "Meet Scorch", reward: 0, rewardCharacter: "scorch", rewardUnlock: { type: "character", id: "scorch", label: "Scorch" }, unlock: { type: "open_touched" } },
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
      if (!ach || !ach.id || seen[ach.id]) return;
      if (ach.unlock && ach.unlock.type) return;
      seen[ach.id] = true;
      ids.push(ach.id);
    });
    PREVIEW_AWARD_IDS.forEach((id) => {
      if (!seen[id]) {
        seen[id] = true;
        ids.push(id);
      }
    });
    return ids;
  }

  function awardAllPreview(pack, family, opts) {
    const working = previewAwardPack(pack);
    let next = normalizeFamily(family);
    let awarded = 0;
    previewAwardIds(working).forEach((id) => {
      if (alreadyUnlocked(id)) return;
      const st = next.streaks[id];
      if (opts && opts.skipRevoked && st && st.revokedAt && !st.awarded) return;
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
      const st = next.streaks[id];
      if (st && st.awarded && st.preview === false) return;
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
    const result = awardAllPreview(pack, next, { skipRevoked: true });
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
    badgeSrc,
    badgeChoices,
    parseAwardIntent,
    earnRulePlain,
    awardLiveStatus,
    consecutiveLoginStreak,
    shiftChicagoYmd,
    getLoginDays,
    recordLoginDay,
    ICONS,
    BADGE_ICON_KEYS,
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
    stampLibraryOnFamily,
    stampAchievementsOnFamily,
    stampAwardsOnFamily,
    applyOverlayAchievements,
    applyOverlayAwards,
    mergeAchievementUnlocks,
    markClassVisit,
    classTourComplete,
    openWorkTouched,
    CLASS_IDS,
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
    pushLocalLibraryToCloud,
    libraryCatalog,
    libraryOnBoard,
    libraryBoardLabel,
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
    updateAssignment,
    stampReflectionsOnFamily,
    addReflectionAnswer,
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
    setPromptPaused,
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
    applyLiveUnlocks,
    evaluate,
    doneAssignmentCount,
    WORK_ACTION_BANANAS,
    ACE_DONE_COUNT,
    ACE_DONE_ACHIEVEMENT,
    awardAchievement,
    awardStreak,
    previewTestAward,
    revokeUnlock,
    revokeAchievement,
    recordEgg,
    bumpEggCount,
    toast,
    confetti,
    honk,
    celebrate,
    showAwardUnlock,
    awardWhenLine,
    openTrophyForAward,
    downloadJson,
    markOpened,
    maybeAwardSignIn,
    maybeAwardScorch,
    playBennettLoginAwards,
    SCORCH_LIVE_ACHIEVEMENT,
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
    flushFamilyNotes,
    promoteHelpAskToInbox,
    promoteAskThreadToInbox,
    workForAskTitle,
    isBennettAsk,
    isParentAuthor,
    isParentReply,
    parentNoteFrom,
    noteAuthorLabel,
    markInboxSeen,
    getInboxSeen,
    inboxUnreadCount,
    parentRepliesForAsk,
    askHasParentReply,
    bennettAsks,
    unansweredBennettAsks,
    unansweredAskCount,
    inboxAsks,
    deleteAskThread,
    mergeNotesById,
    syncFamilyNotes,
    syncFamilyProgress,
    syncFamilyWork,
    syncFamilyOverlay,
    pushFamilyOverlay,
    syncFamilyLive,
    syncFamilyBoard,
    mergeWeekOverlay,
    mergeFamilyOverlay,
    familySavedToast,
    familyDeletedToast,
    familyConnected,
    familySnapshot,
    boardSyncNotice,
    stampLegacyProgress,
    mergeProgressByUpdatedAt,
    localWorkSyncRows,
    workIsLater,
    laterWorkForClass,
    pullFamilyNotes,
    pushFamilyNotes,
    sendParentReply,
    messagesInboxHtml,
    bindMessagesInbox,
    messagesChipHtml,
    mountMessagesChip,
    paintMessagesChip,
    hudNavHtml,
    mountHudNav,
    paintHudCurrent,
    hudCurrent,
    wantsTrophyRoom,
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
    unmarkCharacterSeen,
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
    rewardMediaId,
    rewardMediaItem,
    playAwardMedia,
    playAwardSound,
    unlockCopy,
    achievementGrantingCharacter,
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
    deleteBasecampSession,
    recordBasecampQuery,
    basecampQueries: listBasecampQueries,
    normalizeBasecampQueries,
    basecampImageIds,
    collectBasecampBlobs,
    hydrateImageId,
    basecampChipHtml,
    mountBaseCampChip,
    latestReflection,
    checkinsListHtml,
    groupCheckinsByPrompt,
    ensureReflectionPool,
    todaysReflectionPrompt,
    stampChicagoYmd,
    DEFAULT_REFLECTION_POOL,
    latestBennettQuestion,
    classIdForTitle,
    classIdForWork,
    gradesFromWeek,
    gradeForClass,
    gradePillModel,
    gradePillHtml,
    belongsToClass,
    itemsForClassOnDay,
    sortWorkOpenFirst,
    looseEventsOnDay,
    classAttentionCount,
    classShortLabel,
    parseWorkNoteHints,
    workFeedStatus,
    workStatusChips,
    workStatusChipsHtml,
    normalizeStudentStatus,
    studentStatusRecord,
    studentHasClaim,
    studentSaysDone,
    teacherFromNote,
    followupEmailSent,
    workIsDiscrepancy,
    followupSnoozeUntil,
    followupIsSnoozed,
    setFollowupSnooze,
    workFollowup,
    discrepancyWork,
    emailsToSend,
    schoolVsStudentLine,
    defaultFollowupDueBy,
    defaultTeacherEmailDraft,
    checkinModeFromSearch,
    defaultCheckinMode,
    resolvedCheckinMode,
    checkinModeLabel,
    followupCardHtml,
    followupSectionHtml,
    followupStripHtml,
    followupCollapsed,
    setFollowupCollapsed,
    bindFollowupToggle,
    bindFollowupCopy,
    bindFollowupSnooze,
    BENNETT_HELP_SECTIONS,
    filterBennettHelp,
    markHelpMatch,
    helpLaunchHtml,
    mountHelpLaunch,
    bennettHelpBodyHtml,
    bennettHelpTocHtml,
    bennettHelpPageHtml,
    bindBennettHelpPage,
    mountBennettHelpPage,
    mailtoHref,
    needsYouWork,
    needsYouCounts,
    parentNeedsLine,
    workContactLine,
    workDisputeOf,
    setWorkDispute,
    markWorkLooksWrong,
    needsYouListHtml,
    needsYouSectionHtml,
    needsYouCollapsed,
    workPlanFor,
    saveWorkPlan,
    isBennettPlan,
    setNeedsYouCollapsed,
    bindNeedsYouToggle,
    pickClassId,
    rememberedClassId,
    rememberClassId,
    workDueOnDay,
    workStartThisOnDay,
    workOnBoard,
    eventOnBoard,
    nextNChicagoDays,
    CLASS_SHORT_LABELS,
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
    sessionUser,
    setSessionUser,
    tryLogin,
    logout,
    canUsePreviewSwitch,
    setSiteView,
    audioAllowed,
    funPlayAllowed,
    paintEggChip,
    applySiteView,
    mountSiteViewControl,
    siteViewControlHtml,
    siteViewHidesAdult,
    shouldGateAdultPage,
    SITE_VIEWS,
    hasPlayedBasecampIntroToday,
    markBasecampIntroPlayed,
    shouldPlayBasecampIntro
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
    bindAudioUnlock();
    bindNeedsYouToggle();
    bindFollowupToggle();
    bindFollowupCopy();
    bindFollowupSnooze();
    mountHelpLaunch();
    mountBennettHelpPage();
    bindLibraryPreviewPlay();
    applySiteView();
    bindHudNavClicks();
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      paintBuild();
      bindUndoCue();
      bindAudioUnlock();
      bindNeedsYouToggle();
      bindFollowupToggle();
      bindFollowupCopy();
      bindFollowupSnooze();
      mountHelpLaunch();
      mountBennettHelpPage();
      bindLibraryPreviewPlay();
      applySiteView();
      bindHudNavClicks();
    });
  }
})(window);
