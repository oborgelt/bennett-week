#!/usr/bin/env python3
"""Serve Bennett Week and proxy Anthropic tutor calls.

GitHub Pages cannot hide a key. Keep ANTHROPIC_API_KEY in the environment
on a laptop — never in frontend JS or this repo.

Usage:
  export ANTHROPIC_API_KEY=sk-ant-...
  python3 serve.py
  open http://127.0.0.1:8765/
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("PORT", "8765"))
MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-0")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"

SYSTEM = """You are a short, kid-appropriate study tutor for Bennett, a high-school sophomore.
You help him start and understand the work in front of him.
You are not a ghostwriter: do not write the assignment, the video script, the comic, or a finished draft.
Keep help additive — a nudge, a few notecards, a concept check — tied to the subject at hand.
Prefer flavor from known past assignments when they match (English 10 names video, comic strips, spiral notebook / index cards).
Do not invent a semester of homework.
Return ONLY compact JSON matching the requested shape. No markdown fences.
"""


def tutor_payload(body: dict) -> dict:
    mode = (body.get("mode") or "notecards").strip()
    title = (body.get("title") or "this assignment").strip()
    note = (body.get("note") or "").strip()
    draft = (body.get("draft") or "").strip()
    if mode == "explain":
        shape = '{"explain":"3-6 short sentences"}'
        ask = f"Give a short tutor explanation of the concept / task. Shape: {shape}"
    elif mode == "quiz":
        shape = '{"quiz":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}'
        ask = f"Ask 3 short check-for-understanding questions (not the homework itself). Shape: {shape}"
    elif mode == "proofread":
        shape = '{"feedback":["one nudge","another nudge"]}'
        ask = (
            "Proofread the student's draft. Do not rewrite it. "
            f"Give 2-4 short, kind notes. Shape: {shape}\n\nDraft:\n{draft or '(empty)'}"
        )
    else:
        shape = '{"cards":[{"front":"...","back":"..."},{"front":"...","back":"..."},{"front":"...","back":"..."}]}'
        ask = f"Make 3 or 4 flip notecards on the topic. Shape: {shape}"
    user = (
        f"Assignment title: {title}\n"
        f"Teacher note: {note or '(none)'}\n"
        f"{ask}"
    )
    return {
        "model": MODEL,
        "max_tokens": 800,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": user}],
    }


def call_anthropic(body: dict) -> tuple[int, dict]:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        return 503, {"error": "ANTHROPIC_API_KEY is not set on the server."}
    req = urllib.request.Request(
        ANTHROPIC_URL,
        data=json.dumps(tutor_payload(body)).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as res:
            raw = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:400]
        return exc.code, {"error": "Anthropic request failed.", "detail": detail}
    except Exception as exc:  # noqa: BLE001 — surface any proxy failure to the UI
        return 502, {"error": "Could not reach Anthropic.", "detail": str(exc)}

    text = ""
    for block in raw.get("content") or []:
        if block.get("type") == "text":
            text += block.get("text") or ""
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"explain": text}
    parsed["live"] = True
    parsed["model"] = raw.get("model") or MODEL
    return 200, parsed


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path != "/api/tutor":
            self.send_error(404, "Not found")
            return
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(max(0, min(length, 200_000)))
        try:
            body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            body = {}
        if not isinstance(body, dict):
            body = {}
        status, payload = call_anthropic(body)
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        if args and str(args[0]).startswith("POST /api/tutor"):
            print(f"tutor {args[0]}")
            return
        super().log_message(fmt, *args)


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Bennett Week at http://127.0.0.1:{PORT}/")
    if os.environ.get("ANTHROPIC_API_KEY", "").strip():
        print(f"Live tutor on POST /api/tutor ({MODEL})")
    else:
        print("No ANTHROPIC_API_KEY — the page will use labeled TEST notecards.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nbye")


if __name__ == "__main__":
    main()
