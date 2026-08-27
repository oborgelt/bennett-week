import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function cors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, x-family-token, authorization, apikey",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
  };
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: cors() });
}

function env(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

function stampOrNull(value: unknown): string | null {
  if (value == null || value === false || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value).toISOString();
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function mapProgress(input: Record<string, unknown>, family: string) {
  const id = String(input.assignmentId || input.assignment_id || input.id || "").trim();
  if (!id) return null;
  const doneRaw = input.done;
  const done = doneRaw == null || doneRaw === false || doneRaw === "" ? null : Number(doneRaw);
  const history = Array.isArray(input.startedHistory)
    ? input.startedHistory
    : (Array.isArray(input.started_history) ? input.started_history : []);
  return {
    id,
    assignment_id: id,
    family_token: family,
    started: input.started === false ? false : !!input.started,
    started_at: stampOrNull(input.startedAt ?? input.started_at),
    done: Number.isFinite(done) ? done : null,
    started_history: history,
    started_awarded: !!(input.startedAwarded || input.started_awarded),
    done_awarded: !!(input.doneAwarded || input.done_awarded),
    updated_at: stampOrNull(input.updatedAt ?? input.updated_at ?? input.updated) || new Date().toISOString(),
    device_id: String(input.deviceId || input.device_id || ""),
  };
}

function mapNote(input: Record<string, unknown>, family: string) {
  const id = String(input.id || "").trim();
  if (!id) return null;
  return {
    id,
    family_token: family,
    target_type: String(input.targetType || input.target_type || ""),
    target_id: String(input.targetId || input.target_id || ""),
    from_role: String(input.from || input.from_role || ""),
    kind: String(input.kind || ""),
    reply_to: String(input.replyTo || input.reply_to || ""),
    text: String(input.text || "").slice(0, 2000),
    at: stampOrNull(input.at) || new Date().toISOString(),
    class_id: String(input.classId || input.class_id || ""),
    term_id: String(input.termId || input.term_id || ""),
    test: !!(input.test),
  };
}

function parsePayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function mapEvent(input: Record<string, unknown>, family: string) {
  const id = String(input.id || "").trim();
  const type = String(input.type || "").trim();
  if (!id || !type) return null;
  const roleRaw = String(input.role || "").trim().toLowerCase();
  const role = roleRaw === "parent" || roleRaw === "mom"
    ? "parent"
    : (roleRaw === "orin" || roleRaw === "dad" || roleRaw === "me" ? "orin" : "bennett");
  const msRaw = input.ms;
  const ms = msRaw == null || msRaw === "" ? null : Number(msRaw);
  return {
    id,
    ts: stampOrNull(input.ts) || new Date().toISOString(),
    term_id: String(input.term_id || input.termId || ""),
    device_id: String(input.device_id || input.deviceId || ""),
    role,
    type,
    page: String(input.page || "").slice(0, 80),
    class_id: String(input.class_id || input.classId || ""),
    assignment_id: String(input.assignment_id || input.assignmentId || ""),
    ms: Number.isFinite(ms) ? ms : null,
    message: String(input.message || "").slice(0, 500),
    href: String(input.href || "").slice(0, 280),
    family_token: family,
  };
}

function mapWork(input: Record<string, unknown>, family: string) {
  const payload = parsePayload(input.payload);
  const id = String(input.id || payload.id || "").trim();
  if (!id) return null;
  if (!payload.id) payload.id = id;
  return {
    id,
    family_token: family,
    payload,
    deleted: !!input.deleted,
    updated_at: stampOrNull(input.updatedAt ?? input.updated_at) || new Date().toISOString(),
    class_id: String(input.classId || input.class_id || payload.classId || ""),
    term_id: String(input.termId || input.term_id || payload.termId || ""),
  };
}

function mapOverlay(input: Record<string, unknown>, family: string) {
  const week = input.week && typeof input.week === "object" ? input.week as Record<string, unknown> : {};
  const progress = input.progress && typeof input.progress === "object" ? input.progress : {};
  if (input.library && typeof input.library === "object") week._jjLibrary = input.library;
  if (input.ask && typeof input.ask === "object") week._jjAsk = input.ask;
  if (input.reflections && typeof input.reflections === "object") week._jjReflections = input.reflections;
  if (input.achievements && typeof input.achievements === "object") week._jjAchievements = input.achievements;
  if (input.awards && typeof input.awards === "object") week._jjAwards = input.awards;
  return {
    family_token: family,
    week,
    progress,
    updated_at: stampOrNull(input.updatedAt ?? input.updated_at) || new Date().toISOString(),
  };
}

function extOf(name: string, mime: string): string {
  const fromName = String(name || "").split(".").pop() || "";
  const clean = fromName.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  if (clean) return clean;
  if (/wav/.test(mime)) return "wav";
  if (/ogg/.test(mime)) return "ogg";
  if (/mp4|m4a/.test(mime)) return "m4a";
  if (/png/.test(mime)) return "png";
  if (/jpe?g/.test(mime)) return "jpg";
  if (/webm/.test(mime)) return "webm";
  return "mp3";
}

function decodeB64(raw: string): Uint8Array {
  const s = String(raw || "").replace(/^data:[^;]+;base64,/, "");
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function uploadLibraryFile(input: Record<string, unknown>) {
  const id = String(input.id || "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 64);
  const data = String(input.data || "");
  if (!id || !data) return null;
  const bytes = decodeB64(data);
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) {
    const err = new Error("file too large");
    (err as { status?: number }).status = 413;
    throw err;
  }
  const mime = String(input.mime || "application/octet-stream");
  const filename = String(input.filename || id);
  const path = "clips/" + id + "." + extOf(filename, mime);
  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    const err = new Error("not configured");
    (err as { status?: number }).status = 503;
    throw err;
  }
  const res = await fetch(url + "/storage/v1/object/family-library/" + path, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": mime || "application/octet-stream",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!res.ok) {
    const err = new Error("storage");
    (err as { status?: number }).status = res.status;
    throw err;
  }
  return {
    id,
    path,
    url: url + "/storage/v1/object/public/family-library/" + path,
  };
}

function collectProgress(body: Record<string, unknown>, family: string) {
  const raw = Array.isArray(body.rows)
    ? body.rows
    : (Array.isArray(body.progress) ? body.progress : []);
  const out: Record<string, unknown>[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const mapped = mapProgress(row as Record<string, unknown>, family);
    if (mapped) out.push(mapped);
  }
  return out;
}

async function rest(path: string, init: RequestInit) {
  const url = env("SUPABASE_URL").replace(/\/+$/, "");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    const err = new Error("not configured");
    (err as { status?: number }).status = 503;
    throw err;
  }
  const headers = Object.assign({
    apikey: key,
    Authorization: "Bearer " + key,
    "Content-Type": "application/json",
  }, init.headers || {});
  const res = await fetch(url + path, Object.assign({}, init, { headers }));
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const err = new Error("unavailable");
    (err as { status?: number }).status = res.status;
    throw err;
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function pullProgress(family: string) {
  const rows = await rest(
    "/rest/v1/family_progress?family_token=eq." + encodeURIComponent(family) +
      "&select=*&order=updated_at.asc",
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

async function pullNotes(family: string) {
  const rows = await rest(
    "/rest/v1/family_notes?family_token=eq." + encodeURIComponent(family) +
      "&select=*&order=at.asc",
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

async function pullWork(family: string) {
  const rows = await rest(
    "/rest/v1/family_work?family_token=eq." + encodeURIComponent(family) +
      "&select=*&order=updated_at.asc",
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
}

async function pullOverlay(family: string) {
  const rows = await rest(
    "/rest/v1/family_overlay?family_token=eq." + encodeURIComponent(family) +
      "&select=*&limit=1",
    { method: "GET" }
  );
  const list = Array.isArray(rows) ? rows : [];
  return list.length ? list[0] : null;
}

async function writeProgress(family: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return 0;
  await rest("/rest/v1/family_progress?on_conflict=family_token,assignment_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return rows.length;
}

async function writeNotes(family: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return 0;
  await rest("/rest/v1/family_notes?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return rows.length;
}

async function writeWork(family: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return 0;
  await rest("/rest/v1/family_work?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return rows.length;
}

async function writeEvents(family: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return 0;
  await rest("/rest/v1/events?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  return rows.length;
}

async function writeOverlay(family: string, row: Record<string, unknown>) {
  await rest("/rest/v1/family_overlay?on_conflict=family_token", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([row]),
  });
  return 1;
}

async function deleteNotes(family: string, ids: string[]) {
  let n = 0;
  for (const id of ids) {
    const key = String(id || "").trim();
    if (!key) continue;
    await rest(
      "/rest/v1/family_notes?id=eq." + encodeURIComponent(key) +
        "&family_token=eq." + encodeURIComponent(family),
      { method: "DELETE" }
    );
    n += 1;
  }
  return n;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

  const family = env("FAMILY_TOKEN");
  if (!family) return json(503, { error: "not configured" });

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      return json(400, { error: "bad json" });
    }
  } else if (req.method !== "GET") {
    return json(405, { error: "GET or POST" });
  }

  const wantsPull = req.method === "GET" || body.pull === true;
  try {
    if (wantsPull) {
      const progress = await safe(() => pullProgress(family), []);
      const notes = await safe(() => pullNotes(family), []);
      const work = await safe(() => pullWork(family), []);
      const overlay = await safe(() => pullOverlay(family), null);
      return json(200, { progress, notes, work, overlay });
    }

    let n = 0;
    const eventRows = Array.isArray(body.events)
      ? (body.events as unknown[]).map((row) => {
        if (!row || typeof row !== "object") return null;
        return mapEvent(row as Record<string, unknown>, family);
      }).filter(Boolean) as Record<string, unknown>[]
      : [];
    if (eventRows.length) n += await writeEvents(family, eventRows);

    const progressRows = collectProgress(body, family);
    if (progressRows.length) n += await writeProgress(family, progressRows);

    const noteRows = Array.isArray(body.notes)
      ? (body.notes as unknown[]).map((row) => {
        if (!row || typeof row !== "object") return null;
        return mapNote(row as Record<string, unknown>, family);
      }).filter(Boolean) as Record<string, unknown>[]
      : [];
    if (noteRows.length) n += await writeNotes(family, noteRows);

    const workRows = Array.isArray(body.work)
      ? (body.work as unknown[]).map((row) => {
        if (!row || typeof row !== "object") return null;
        return mapWork(row as Record<string, unknown>, family);
      }).filter(Boolean) as Record<string, unknown>[]
      : [];
    if (workRows.length) n += await writeWork(family, workRows);

    if (body.overlay && typeof body.overlay === "object") {
      n += await writeOverlay(family, mapOverlay(body.overlay as Record<string, unknown>, family));
    }

    let audio = null;
    if (body.audio && typeof body.audio === "object") {
      audio = await uploadLibraryFile(body.audio as Record<string, unknown>);
      if (audio) n += 1;
    }

    const deleteIds = Array.isArray(body.deleteNoteIds)
      ? (body.deleteNoteIds as unknown[]).map((id) => String(id || "")).filter(Boolean)
      : [];
    if (deleteIds.length) n += await deleteNotes(family, deleteIds);

    if (!n) return json(400, { error: "nothing to write" });
    return json(200, Object.assign({ ok: true, n }, audio ? { audio } : {}));
  } catch {
    return json(502, { error: wantsPull ? "pull failed" : "write failed" });
  }
});
