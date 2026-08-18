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

function mapRow(input: Record<string, unknown>, family: string) {
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

function collectRows(body: Record<string, unknown>, family: string) {
  const raw = Array.isArray(body.rows)
    ? body.rows
    : (Array.isArray(body.progress) ? body.progress : [body]);
  const out: Record<string, unknown>[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const mapped = mapRow(row as Record<string, unknown>, family);
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

async function pullProgress(family: string) {
  const rows = await rest(
    "/rest/v1/family_progress?family_token=eq." + encodeURIComponent(family) +
      "&select=*&order=updated_at.asc",
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows : [];
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
      const progress = await pullProgress(family);
      return json(200, { progress });
    }
    const rows = collectRows(body, family);
    if (!rows.length) return json(400, { error: "nothing to write" });
    const n = await writeProgress(family, rows);
    return json(200, { ok: true, n });
  } catch {
    return json(502, { error: wantsPull ? "pull failed" : "write failed" });
  }
});
