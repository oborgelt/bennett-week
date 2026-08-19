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
    text: String(input.text || "").slice(0, 280),
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
  const week = input.week && typeof input.week === "object" ? input.week : {};
  const progress = input.progress && typeof input.progress === "object" ? input.progress : {};
  return {
    family_token: family,
    week,
    progress,
    updated_at: stampOrNull(input.updatedAt ?? input.updated_at) || new Date().toISOString(),
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

    const deleteIds = Array.isArray(body.deleteNoteIds)
      ? (body.deleteNoteIds as unknown[]).map((id) => String(id || "")).filter(Boolean)
      : [];
    if (deleteIds.length) n += await deleteNotes(family, deleteIds);

    if (!n) return json(400, { error: "nothing to write" });
    return json(200, { ok: true, n });
  } catch {
    return json(502, { error: wantsPull ? "pull failed" : "write failed" });
  }
});
