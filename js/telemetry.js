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
    const cfg = getConfig();
    const src = extra && typeof extra === "object" ? extra : {};
    const row = {
      id: uid(),
      ts: new Date().toISOString(),
      term_id: String(src.termId || src.term_id || termId()),
      device_id: deviceId(),
      role: cfg.role || "bennett",
      type: kind,
      page: String(src.page || pageName()),
      class_id: String(src.classId || src.class_id || ""),
      assignment_id: String(src.assignmentId || src.assignment_id || ""),
      ms: src.ms == null ? null : Number(src.ms) || 0,
      message: src.message ? String(src.message).slice(0, 280) : "",
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
    const bits = ["select=*", "order=ts.desc", "limit=" + (o.limit || 2000)];
    if (o.termId) bits.push("term_id=eq." + encodeURIComponent(o.termId));
    if (o.classId) bits.push("class_id=eq." + encodeURIComponent(o.classId));
    if (o.assignmentId) bits.push("assignment_id=eq." + encodeURIComponent(o.assignmentId));
    if (o.since) bits.push("ts=gte." + encodeURIComponent(o.since));
    return query("/rest/v1/events?" + bits.join("&"));
  }

  async function fetchDevices() {
    return query("/rest/v1/devices?select=*&order=last_seen.desc");
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
    deviceId,
    track,
    flush,
    fetchEvents,
    fetchDevices,
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
