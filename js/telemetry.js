(function (global) {
  const CFG_KEY = "bw-telemetry";
  const DEVICE_KEY = "bw-device-id";
  const SESSION_KEY = "bw-session-at";
  const DB_NAME = "jungle-jam-telemetry";
  const STORE = "queue";
  const SESSION_MS = 30 * 60 * 1000;
  const SLOW_MS = 2000;
  const FLUSH_MS = 8000;
  const ROLES = ["bennett", "parent", "orin"];
  const FAMILY_SYNC_URL = "https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/family-sync";

  const memoryQueue = [];
  let dbReady = null;
  let flushTimer = null;
  let booted = false;
  const pageStarted = Date.now();

  function uid() {
    return "ev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function getConfig() {
    const raw = readJson(CFG_KEY, null);
    if (!raw || typeof raw !== "object") {
      return { url: "", anonKey: "", familyToken: "", role: "bennett" };
    }
    const role = ROLES.indexOf(raw.role) >= 0 ? raw.role : "bennett";
    return {
      url: String(raw.url || "").replace(/\/+$/, ""),
      anonKey: String(raw.anonKey || "").trim(),
      familyToken: String(raw.familyToken || "").trim(),
      role
    };
  }

  function setConfig(next) {
    const cfg = {
      url: String((next && next.url) || "").replace(/\/+$/, ""),
      anonKey: String((next && next.anonKey) || "").trim(),
      familyToken: String((next && next.familyToken) || "").trim(),
      role: ROLES.indexOf(next && next.role) >= 0 ? next.role : "bennett"
    };
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    try {
      if (global.Game && typeof global.Game.setSiteView === "function") {
        const view = typeof global.Game.siteViewFromRole === "function"
          ? global.Game.siteViewFromRole(cfg.role)
          : (cfg.role === "parent" ? "mom" : (cfg.role === "bennett" ? "bennett" : "me"));
        global.Game.setSiteView(view);
      }
    } catch (_) {}
    return cfg;
  }

  function connected() {
    const cfg = getConfig();
    return !!(cfg.url && cfg.anonKey && cfg.familyToken);
  }

  function eventRole() {
    try {
      if (global.Game && typeof global.Game.sessionUser === "function") {
        const who = String(global.Game.sessionUser() || "").trim().toLowerCase();
        if (who === "bennett") return "bennett";
        if (who === "mom") return "parent";
        if (who === "orin") return "orin";
      }
    } catch (_) {}
    return getConfig().role || "bennett";
  }

  function progressSyncAvailable() {
    return !!FAMILY_SYNC_URL;
  }

  let inflightPull = null;

  async function familySyncPull() {
    if (inflightPull) return inflightPull;
    inflightPull = familySyncRequest("POST", { pull: true }).finally(() => {
      const clear = () => { inflightPull = null; };
      if (typeof setTimeout === "function") setTimeout(clear, 80);
      else clear();
    });
    return inflightPull;
  }

  async function familySyncRequest(method, body) {
    const ac = typeof AbortController === "function" ? new AbortController() : null;
    const ms = body && body.audio ? 25000 : 8000;
    const timer = ac && typeof setTimeout === "function" ? setTimeout(() => {
      try { ac.abort(); } catch (_) {}
    }, ms) : null;
    try {
      const init = {
        method: method || "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store"
      };
      if (ac) init.signal = ac.signal;
      if (body !== undefined) init.body = JSON.stringify(body);
      const res = await fetch(FAMILY_SYNC_URL, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.error)) {
        const err = new Error((data && data.error) || ("family-sync " + res.status));
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      if (err && (err.name === "AbortError" || err.status === 20)) {
        const timeout = new Error("timeout");
        timeout.status = 408;
        throw timeout;
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function deviceId() {
    let id = "";
    try { id = localStorage.getItem(DEVICE_KEY) || ""; } catch (_) {}
    if (!id) {
      id = "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(DEVICE_KEY, id); } catch (_) {}
    }
    return id;
  }

  function pageName() {
    try {
      const path = String((location.pathname || "").split("/").pop() || "index.html");
      if (!path || path === "index.html") return "week";
      return path.replace(/\.html$/i, "");
    } catch (_) {
      return "week";
    }
  }

  function termId() {
    try {
      if (global.Game && typeof Game.termOf === "function") return Game.termOf().id;
    } catch (_) {}
    return "2025-26-s1";
  }

  function openDb() {
    if (dbReady) return dbReady;
    dbReady = new Promise((resolve) => {
      if (typeof indexedDB === "undefined" || !indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbReady;
  }

  async function enqueue(row) {
    memoryQueue.push(row);
    const db = await openDb();
    if (!db) return;
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(row);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (_) {
        resolve();
      }
    });
    const idx = memoryQueue.findIndex((item) => item.id === row.id);
    if (idx >= 0) memoryQueue.splice(idx, 1);
  }

  async function pending() {
    const db = await openDb();
    if (!db) return memoryQueue.slice();
    const fromDb = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => resolve([]);
      } catch (_) {
        resolve([]);
      }
    });
    const seen = new Set(fromDb.map((row) => row && row.id));
    memoryQueue.forEach((row) => {
      if (row && row.id && !seen.has(row.id)) fromDb.push(row);
    });
    return fromDb;
  }

  async function dropIds(ids) {
    const gone = new Set(ids || []);
    for (let i = memoryQueue.length - 1; i >= 0; i -= 1) {
      if (gone.has(memoryQueue[i].id)) memoryQueue.splice(i, 1);
    }
    const db = await openDb();
    if (!db || !gone.size) return;
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        gone.forEach((id) => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (_) {
        resolve();
      }
    });
  }

  function headers(cfg, extra) {
    const h = {
      apikey: cfg.anonKey,
      Authorization: "Bearer " + cfg.anonKey,
      "Content-Type": "application/json",
      "x-family-token": cfg.familyToken
    };
    return Object.assign(h, extra || {});
  }

  async function rest(path, opts) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey || !cfg.familyToken) throw new Error("not-connected");
    const method = (opts && opts.method) || "GET";
    const extra = Object.assign({}, (opts && opts.headers) || {});
    if (method === "POST" && !extra.Prefer) extra.Prefer = "return=minimal";
    const init = Object.assign({}, opts, { headers: headers(cfg, extra) });
    const res = await fetch(cfg.url + path, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error("supabase " + res.status);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.indexOf("json") >= 0) return res.json();
    return null;
  }

  async function flush() {
    if (!connected()) return { sent: 0, queued: (await pending()).length };
    const rows = await pending();
    if (!rows.length) return { sent: 0, queued: 0 };
    const cfg = getConfig();
    const payload = rows.map((row) => Object.assign({}, row, { family_token: cfg.familyToken }));
    try {
      await rest("/rest/v1/events?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(payload)
      });
      await dropIds(rows.map((row) => row.id));
      await rest("/rest/v1/devices?on_conflict=device_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{
          device_id: deviceId(),
          role: cfg.role,
          family_token: cfg.familyToken,
          last_seen: new Date().toISOString(),
          user_agent: (typeof navigator !== "undefined" && navigator.userAgent) ? String(navigator.userAgent).slice(0, 180) : ""
        }])
      });
      return { sent: rows.length, queued: 0 };
    } catch (_) {
      return { sent: 0, queued: rows.length };
    }
  }

  function track(type, extra) {
    const kind = String(type || "").trim();
    if (!kind) return;
    const src = extra && typeof extra === "object" ? extra : {};
    const row = {
      id: uid(),
      ts: new Date().toISOString(),
      term_id: String(src.termId || src.term_id || termId()),
      device_id: deviceId(),
      role: eventRole(),
      type: kind,
      page: String(src.page || pageName()),
      class_id: String(src.classId || src.class_id || ""),
      assignment_id: String(src.assignmentId || src.assignment_id || ""),
      ms: src.ms == null ? null : Number(src.ms) || 0,
      message: src.message ? String(src.message).slice(0, kind === "ask_ai" ? 500 : 280) : "",
      href: src.href ? String(src.href).slice(0, 280) : ""
    };
    enqueue(row);
    if (connected() && typeof setTimeout === "function") {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => { flush(); }, 400);
    }
  }

  function sessionStart() {
    const now = Date.now();
    let last = 0;
    try { last = Number(localStorage.getItem(SESSION_KEY) || 0) || 0; } catch (_) {}
    if (!last || now - last >= SESSION_MS) {
      track("session_start");
      try { localStorage.setItem(SESSION_KEY, String(now)); } catch (_) {}
    }
  }

  function trackLogin() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    sessionStart();
  }

  function trackPageView() {
    track("page_view");
    const nav = (typeof performance !== "undefined" && performance.getEntriesByType)
      ? performance.getEntriesByType("navigation")[0]
      : null;
    const ms = nav && typeof nav.duration === "number" ? Math.round(nav.duration) : (Date.now() - pageStarted);
    if (ms >= SLOW_MS) track("slow_page", { ms, message: pageName() + " loaded in " + ms + "ms" });
  }

  function clickLabel(el) {
    if (!el) return "";
    const aria = el.getAttribute && el.getAttribute("aria-label");
    if (aria) return aria.slice(0, 80);
    const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (text) return text.slice(0, 80);
    return (el.id || el.className || el.tagName || "").toString().slice(0, 80);
  }

  function bindClicks() {
    if (!global.document || !document.addEventListener) return;
    document.addEventListener("click", (e) => {
      const t = e.target && e.target.closest ? e.target.closest("a, button, [data-act], .week-chip, .admin-chip") : null;
      if (!t) return;
      if (t.closest && t.closest("input, textarea, select, .usage-connect")) return;
      const href = t.getAttribute && t.getAttribute("href");
      track("click", { href: href || "", message: clickLabel(t) });
    }, true);
  }

  function bindErrors() {
    if (!global.addEventListener) return;
    global.addEventListener("error", (ev) => {
      const msg = (ev && ev.message) || (ev && ev.error && ev.error.message) || "error";
      track("error", { message: String(msg).slice(0, 280) });
    });
    global.addEventListener("unhandledrejection", (ev) => {
      const msg = (ev && ev.reason && ev.reason.message) || (ev && ev.reason) || "rejection";
      track("error", { message: String(msg).slice(0, 280) });
    });
  }

  function bindFlush() {
    if (global.document && document.addEventListener) {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    }
    if (global.addEventListener) {
      global.addEventListener("online", () => flush());
      global.addEventListener("pagehide", () => flush());
    }
    if (typeof setInterval === "function") {
      setInterval(() => { flush(); }, FLUSH_MS);
    }
  }

  function boot() {
    if (booted) return;
    booted = true;
    sessionStart();
    trackPageView();
    bindClicks();
    bindErrors();
    bindFlush();
    flush();
  }

  function query(path) {
    return rest(path, { method: "GET" });
  }

  async function fetchEvents(opts) {
    const o = opts || {};
    const cap = Math.max(1, Number(o.limit) || 5000);
    const pageSize = 1000;
    const out = [];
    let offset = 0;
    while (out.length < cap) {
      const take = Math.min(pageSize, cap - out.length);
      const bits = ["select=*", "order=ts.desc"];
      if (o.termId) bits.push("term_id=eq." + encodeURIComponent(o.termId));
      if (o.classId) bits.push("class_id=eq." + encodeURIComponent(o.classId));
      if (o.assignmentId) bits.push("assignment_id=eq." + encodeURIComponent(o.assignmentId));
      if (o.since) bits.push("ts=gte." + encodeURIComponent(o.since));
      let chunk = [];
      try {
        chunk = await rest("/rest/v1/events?" + bits.join("&"), {
          method: "GET",
          headers: { Range: offset + "-" + (offset + take - 1), Prefer: "count=exact" }
        });
      } catch (err) {
        if (err && err.status === 416) break;
        throw err;
      }
      const rows = Array.isArray(chunk) ? chunk : [];
      if (!rows.length) break;
      out.push.apply(out, rows);
      if (rows.length < take) break;
      offset += rows.length;
    }
    return out;
  }

  async function fetchDevices() {
    return query("/rest/v1/devices?select=*&order=last_seen.desc");
  }

  function noteToRow(note, familyToken) {
    const n = note && typeof note === "object" ? note : {};
    return {
      id: String(n.id || ""),
      family_token: familyToken,
      target_type: String(n.targetType || ""),
      target_id: String(n.targetId || ""),
      from_role: String(n.from || ""),
      kind: String(n.kind || ""),
      reply_to: String(n.replyTo || ""),
      text: String(n.text || "").slice(0, 2000),
      at: n.at || new Date().toISOString(),
      class_id: String(n.classId || ""),
      term_id: String(n.termId || ""),
      test: !!n.test
    };
  }

  function rowToNote(row) {
    const r = row && typeof row === "object" ? row : {};
    const note = {
      id: String(r.id || ""),
      targetType: String(r.target_type || ""),
      targetId: String(r.target_id || ""),
      from: String(r.from_role || ""),
      kind: String(r.kind || ""),
      text: String(r.text || ""),
      at: r.at || ""
    };
    if (r.reply_to) note.replyTo = String(r.reply_to);
    if (r.class_id) note.classId = String(r.class_id);
    if (r.term_id) note.termId = String(r.term_id);
    if (r.test) note.test = true;
    return note;
  }

  async function fetchNotes() {
    try {
      const data = await familySyncPull();
      if (data && Array.isArray(data.notes)) return data.notes;
    } catch (err) {
      if (!connected()) throw err;
    }
    if (connected()) {
      const rows = await query("/rest/v1/family_notes?select=*&order=at.asc");
      return Array.isArray(rows) ? rows : [];
    }
    return [];
  }

  function notesForFunction(notes) {
    return (notes || []).map((n) => {
      const row = noteToRow(n, "");
      delete row.family_token;
      return row;
    }).filter((row) => row && row.id);
  }

  async function upsertNotes(notes) {
    const payload = notesForFunction(notes);
    if (!payload.length) return { ok: true, n: 0 };
    try {
      return await familySyncRequest("POST", { notes: payload });
    } catch (err) {
      if (!connected()) throw err;
      const cfg = getConfig();
      const restPayload = (notes || []).map((n) => noteToRow(n, cfg.familyToken)).filter((row) => row.id);
      if (!restPayload.length) return [];
      return rest("/rest/v1/family_notes?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(restPayload)
      });
    }
  }

  async function deleteRemoteNote(id) {
    const key = String(id || "");
    if (!key) return null;
    try {
      return await familySyncRequest("POST", { deleteNoteIds: [key] });
    } catch (err) {
      if (!connected()) throw err;
      return rest("/rest/v1/family_notes?id=eq." + encodeURIComponent(key), { method: "DELETE" });
    }
  }

  function isMissingTable(err) {
    if (!err) return false;
    if (err.status === 404 || err.status === 406) return true;
    return /PGRST205|schema cache|does not exist/i.test(String(err.body || err.message || ""));
  }

  function progressToRow(id, rec, familyToken, device) {
    const r = rec && typeof rec === "object" ? rec : {};
    const key = String(id || r.assignment_id || r.assignmentId || r.id || "");
    const done = r.done == null || r.done === false || r.done === "" ? null : Number(r.done);
    return {
      id: key,
      assignment_id: key,
      family_token: familyToken,
      started: r.started === false ? false : !!r.started,
      started_at: r.startedAt || r.started_at || null,
      done: Number.isFinite(done) ? done : null,
      started_history: Array.isArray(r.startedHistory) ? r.startedHistory : (Array.isArray(r.started_history) ? r.started_history : []),
      started_awarded: !!(r.startedAwarded || r.started_awarded),
      done_awarded: !!(r.doneAwarded || r.done_awarded),
      updated_at: r.updatedAt || r.updated_at || r.updated || new Date().toISOString(),
      device_id: device || ""
    };
  }

  function rowToProgress(row) {
    const r = row && typeof row === "object" ? row : {};
    const done = r.done == null || r.done === "" ? null : Number(r.done);
    return {
      id: String(r.assignment_id || r.id || ""),
      assignment_id: String(r.assignment_id || r.id || ""),
      started: r.started === false ? false : !!r.started,
      startedAt: r.started_at || null,
      done: Number.isFinite(done) ? done : null,
      startedHistory: Array.isArray(r.started_history) ? r.started_history : [],
      startedAwarded: !!r.started_awarded,
      doneAwarded: !!r.done_awarded,
      updatedAt: r.updated_at || r.updated || ""
    };
  }

  function progressRowsForSync(rows, familyToken) {
    return (rows || []).map((row) => {
      const rec = row && row.rec ? row.rec : row;
      const id = (row && (row.assignment_id || row.id)) || (rec && (rec.assignment_id || rec.id));
      const mapped = progressToRow(id, rec, familyToken || "", deviceId());
      if (row && row.family_token) mapped.family_token = row.family_token;
      return mapped;
    }).filter((row) => row && (row.assignment_id || row.id));
  }

  function progressRowsForFunction(rows) {
    return progressRowsForSync(rows, "").map((row) => {
      const next = Object.assign({}, row);
      delete next.family_token;
      return next;
    });
  }

  async function fetchProgress() {
    try {
      const data = await familySyncPull();
      return Array.isArray(data && data.progress) ? data.progress : [];
    } catch (err) {
      if (connected()) {
        const rows = await query("/rest/v1/family_progress?select=*&order=updated_at.asc");
        return Array.isArray(rows) ? rows : [];
      }
      throw err;
    }
  }

  async function upsertProgress(rows) {
    const payload = progressRowsForFunction(rows);
    if (!payload.length) return { ok: true, n: 0 };
    try {
      return await familySyncRequest("POST", { rows: payload });
    } catch (err) {
      if (!connected()) throw err;
      const cfg = getConfig();
      const restPayload = progressRowsForSync(rows, cfg.familyToken);
      if (!restPayload.length) return [];
      try {
        return await rest("/rest/v1/family_progress?on_conflict=family_token,assignment_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(restPayload)
        });
      } catch (restErr) {
        if (!isMissingTable(restErr) && restErr && restErr.status >= 400) {
          return rest("/rest/v1/family_progress?on_conflict=id", {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
            body: JSON.stringify(restPayload)
          });
        }
        throw restErr;
      }
    }
  }

  function parsePayload(raw) {
    if (raw && typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch (_) { return {}; }
    }
    return {};
  }

  function workToRow(row, familyToken) {
    const r = row && typeof row === "object" ? row : {};
    const payload = parsePayload(r.payload);
    if (!payload.id && r.id) payload.id = r.id;
    return {
      id: String(r.id || payload.id || ""),
      family_token: familyToken,
      payload,
      deleted: !!r.deleted,
      updated_at: r.updatedAt || r.updated_at || new Date().toISOString(),
      class_id: String(r.classId || (payload && payload.classId) || ""),
      term_id: String((payload && payload.termId) || "")
    };
  }

  function rowToWork(row) {
    const r = row && typeof row === "object" ? row : {};
    const payload = parsePayload(r.payload);
    if (!payload.id && r.id) payload.id = String(r.id);
    return {
      id: String(r.id || payload.id || ""),
      payload,
      deleted: !!r.deleted,
      updatedAt: r.updated_at || r.updatedAt || "",
      classId: String(r.class_id || payload.classId || "")
    };
  }

  async function fetchWork() {
    try {
      const data = await familySyncPull();
      if (data && Array.isArray(data.work)) return data.work;
    } catch (err) {
      if (!connected()) throw err;
    }
    if (connected()) {
      const rows = await query("/rest/v1/family_work?select=*&order=updated_at.asc");
      return Array.isArray(rows) ? rows : [];
    }
    return [];
  }

  function workForFunction(rows) {
    return (rows || []).map((row) => {
      const mapped = workToRow(row, "");
      delete mapped.family_token;
      return mapped;
    }).filter((row) => row && row.id);
  }

  async function upsertWork(rows) {
    const payload = workForFunction(rows);
    if (!payload.length) return { ok: true, n: 0 };
    try {
      return await familySyncRequest("POST", { work: payload });
    } catch (err) {
      if (!connected()) throw err;
      const cfg = getConfig();
      const restPayload = (rows || []).map((row) => workToRow(row, cfg.familyToken)).filter((row) => row.id);
      if (!restPayload.length) return [];
      return rest("/rest/v1/family_work?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(restPayload)
      });
    }
  }

  function overlayToRow(overlay, familyToken) {
    const src = overlay && typeof overlay === "object" ? overlay : {};
    const week = src.week && typeof src.week === "object" ? Object.assign({}, src.week) : {};
    const cues = src.soundCues && typeof src.soundCues === "object" ? src.soundCues : {};
    if (Object.keys(cues).length) week._jjSoundCues = cues;
    else delete week._jjSoundCues;
    if (src.library && typeof src.library === "object") week._jjLibrary = src.library;
    else delete week._jjLibrary;
    if (src.ask && typeof src.ask === "object") week._jjAsk = src.ask;
    else delete week._jjAsk;
    if (src.reflections && typeof src.reflections === "object") week._jjReflections = src.reflections;
    else delete week._jjReflections;
    if (src.achievements && typeof src.achievements === "object" && Array.isArray(src.achievements.achievements) && src.achievements.achievements.length) {
      week._jjAchievements = src.achievements;
    } else delete week._jjAchievements;
    if (src.awards && typeof src.awards === "object") week._jjAwards = src.awards;
    else delete week._jjAwards;
    if (src.deletedNotes && typeof src.deletedNotes === "object") week._jjDeletedNotes = src.deletedNotes;
    else delete week._jjDeletedNotes;
    return {
      family_token: familyToken,
      week,
      progress: src.progress && typeof src.progress === "object" ? src.progress : {},
      library: src.library && typeof src.library === "object" ? src.library : { items: [] },
      ask: src.ask && typeof src.ask === "object" ? src.ask : { messages: [] },
      reflections: src.reflections && typeof src.reflections === "object" ? src.reflections : { pool: [], answers: [] },
      achievements: src.achievements && typeof src.achievements === "object" ? src.achievements : { achievements: [] },
      awards: src.awards && typeof src.awards === "object" ? src.awards : {},
      updated_at: src.updatedAt || src.updated_at || new Date().toISOString()
    };
  }

  function rowToOverlay(row) {
    const r = row && typeof row === "object" ? row : {};
    const week = r.week && typeof r.week === "object" ? Object.assign({}, r.week) : {};
    const soundCues = (week._jjSoundCues && typeof week._jjSoundCues === "object") ? week._jjSoundCues : (r.soundCues || {});
    const library = (week._jjLibrary && typeof week._jjLibrary === "object") ? week._jjLibrary : (r.library || { items: [] });
    const ask = (week._jjAsk && typeof week._jjAsk === "object") ? week._jjAsk : (r.ask || { messages: [] });
    const reflections = (week._jjReflections && typeof week._jjReflections === "object") ? week._jjReflections : (r.reflections || { pool: [], answers: [] });
    const achievements = (week._jjAchievements && typeof week._jjAchievements === "object") ? week._jjAchievements : (r.achievements || { achievements: [] });
    const awards = (week._jjAwards && typeof week._jjAwards === "object") ? week._jjAwards : (r.awards || {});
    const deletedNotes = (week._jjDeletedNotes && typeof week._jjDeletedNotes === "object") ? week._jjDeletedNotes : (r.deletedNotes || { ids: [], texts: [] });
    delete week._jjSoundCues;
    delete week._jjLibrary;
    delete week._jjAsk;
    delete week._jjReflections;
    delete week._jjAchievements;
    delete week._jjAwards;
    delete week._jjDeletedNotes;
    return {
      family_token: String(r.family_token || ""),
      week,
      progress: r.progress && typeof r.progress === "object" ? r.progress : {},
      soundCues,
      library,
      ask,
      reflections,
      achievements,
      awards,
      deletedNotes,
      updatedAt: r.updated_at || r.updatedAt || ""
    };
  }

  async function uploadAudio(input) {
    const payload = {
      id: String((input && input.id) || "").trim(),
      filename: String((input && input.filename) || "").trim(),
      mime: String((input && input.mime) || "application/octet-stream").trim(),
      data: String((input && input.data) || "")
    };
    if (!payload.id || !payload.data) return null;
    return familySyncRequest("POST", { audio: payload });
  }

  async function fetchOverlay() {
    try {
      const data = await familySyncPull();
      if (data && Object.prototype.hasOwnProperty.call(data, "overlay")) return data.overlay || null;
    } catch (err) {
      if (!connected()) throw err;
    }
    if (connected()) {
      const rows = await query("/rest/v1/family_overlay?select=*&limit=1");
      const list = Array.isArray(rows) ? rows : [];
      return list.length ? list[0] : null;
    }
    return null;
  }

  async function upsertOverlay(overlay) {
    const mapped = overlayToRow(overlay, "");
    delete mapped.family_token;
    try {
      return await familySyncRequest("POST", { overlay: mapped });
    } catch (err) {
      if (!connected()) throw err;
      const cfg = getConfig();
      const payload = overlayToRow(overlay, cfg.familyToken);
      return rest("/rest/v1/family_overlay?on_conflict=family_token", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([payload])
      });
    }
  }

  async function probeFamilyTables() {
    const names = ["family_notes", "family_progress", "family_overlay"];
    const missing = [];
    for (let i = 0; i < names.length; i += 1) {
      const name = names[i];
      try {
        await query("/rest/v1/" + name + "?select=*&limit=1");
      } catch (err) {
        if (isMissingTable(err)) missing.push(name);
      }
    }
    return missing;
  }

  async function queuedCount() {
    return (await pending()).length;
  }

  global.Telemetry = {
    CFG_KEY,
    DEVICE_KEY,
    SESSION_KEY,
    ROLES,
    getConfig,
    setConfig,
    connected,
    progressSyncAvailable,
    FAMILY_SYNC_URL,
    deviceId,
    track,
    trackLogin,
    eventRole,
    flush,
    fetchEvents,
    fetchDevices,
    fetchNotes,
    upsertNotes,
    deleteNote: deleteRemoteNote,
    noteToRow,
    rowToNote,
    isMissingTable,
    progressToRow,
    rowToProgress,
    fetchProgress,
    upsertProgress,
    workToRow,
    rowToWork,
    fetchWork,
    upsertWork,
    overlayToRow,
    rowToOverlay,
    fetchOverlay,
    upsertOverlay,
    uploadAudio,
    probeFamilyTables,
    queuedCount,
    boot
  };

  if (global.document) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }
})(typeof window !== "undefined" ? window : this);
