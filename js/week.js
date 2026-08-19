(function () {
  const TZ = "America/Chicago";
  const DAY_COUNT = 7;
  let dayIndex = 0;
  let baseWeek = null;
  let week = null;
  let pack = null;
  let roster = null;
  let family = null;
  let library = null;
  let baseSeed = null;
  let seed = null;
  let viewedEvents = {};
  let trophyZone = "";
  let trophyStillsReady = false;
  let trophyHintTimer = 0;
  let trophyLanternHintSeen = false;
  let trophyLanternHintTimer = 0;
  let trophyLookWide = { panX: 0, panY: 0, mouseX: 0, mouseY: 0 };
  let trophyLookClose = { panX: 0, panY: 0, mouseX: 0, mouseY: 0 };
  let trophyDrag = null;
  let skipTrophyClick = false;
  let trackBound = false;
  let selectedClassId = "";

  const TROPHY_ZONES = {
    pedestal: {
      id: "pedestal",
      label: "the pedestal",
      hint: "Newest unlock",
      still: "img/library/trophy-pedestal.jpg",
      origin: "50% 58%",
      hot: { l: "32%", t: "32%", w: "36%", h: "52%" }
    },
    window: {
      id: "window",
      label: "the window wall",
      hint: "Crew",
      still: "img/library/trophy-window.jpg",
      origin: "16% 46%",
      hot: { l: "0%", t: "18%", w: "32%", h: "64%" }
    },
    cubbies: {
      id: "cubbies",
      label: "the cubbies",
      hint: "Awards",
      still: "img/library/trophy-cubbies.jpg",
      origin: "24% 30%",
      hot: { l: "0%", t: "0%", w: "38%", h: "32%" }
    },
    pegboard: {
      id: "pegboard",
      label: "the peg wall",
      hint: "Tools",
      still: "img/library/trophy-pegboard.jpg",
      origin: "70% 48%",
      hot: { l: "54%", t: "12%", w: "28%", h: "64%" }
    },
    lockers: {
      id: "lockers",
      label: "the lockers",
      hint: "Gear",
      still: "img/library/trophy-lockers.jpg",
      origin: "88% 50%",
      hot: { l: "74%", t: "6%", w: "26%", h: "76%" }
    }
  };
  const TROPHY_ZONE_ORDER = ["window", "cubbies", "pedestal", "pegboard", "lockers"];
  const PEGBOARD_IDS = ["angle-finder", "field-kit", "daily-pick", "notebook-holding"];
  const LOCKER_IDS = ["unplugged-strap", "first-serve"];
  const CREW_ORDER = ["ace", "riff", "scorch", "deuce", "fuzz", "bennett"];
  const PEGBOARD_SLOTS = {
    "angle-finder": { l: "14%", t: "8%", w: "18%", h: "26%" },
    "field-kit": { l: "38%", t: "34%", w: "20%", h: "28%" },
    "daily-pick": { l: "12%", t: "58%", w: "20%", h: "28%" },
    "notebook-holding": { l: "56%", t: "58%", w: "20%", h: "28%" }
  };
  const LOCKER_SLOTS = {
    "unplugged-strap": { l: "22%", t: "34%", w: "20%", h: "28%" },
    "first-serve": { l: "46%", t: "8%", w: "20%", h: "24%" }
  };
  const CUBBY_SLOTS = [
    { l: "4%", t: "6%", w: "16%", h: "24%" },
    { l: "22%", t: "6%", w: "16%", h: "24%" },
    { l: "40%", t: "6%", w: "16%", h: "24%" },
    { l: "58%", t: "6%", w: "16%", h: "24%" },
    { l: "4%", t: "36%", w: "16%", h: "26%" },
    { l: "24%", t: "34%", w: "18%", h: "28%" },
    { l: "46%", t: "36%", w: "20%", h: "26%" },
    { l: "4%", t: "68%", w: "14%", h: "26%" },
    { l: "22%", t: "68%", w: "16%", h: "26%" },
    { l: "40%", t: "68%", w: "16%", h: "26%" },
    { l: "58%", t: "68%", w: "16%", h: "26%" },
    { l: "74%", t: "68%", w: "16%", h: "26%" }
  ];
  const PEDESTAL_SLOT = { l: "36%", t: "38%", w: "28%", h: "42%" };

  function parseLocal(iso) {
    const [d, t] = iso.split("T");
    const [y, m, day] = d.split("-").map(Number);
    const [hh, mm] = (t || "00:00:00").split(":").map(Number);
    return new Date(y, m - 1, day, hh || 0, mm || 0, 0);
  }
  function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function todayInChicago() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return new Date(Number(get("year")), Number(get("month")) - 1, Number(get("day")));
  }
  function fmtTime(iso) {
    if (!iso || !iso.includes("T")) return "";
    return parseLocal(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  function fmtRange(start, end) {
    const a = fmtTime(start);
    const b = end ? fmtTime(end) : "";
    if (a && b) return `${a} – ${b}`;
    return a || "All day";
  }
  function dayLabel(d) {
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  function dateLabel(d) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function whoOn(data, d) {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    const hits = (data.parenting || []).filter((p) => {
      const a = parseLocal(p.start);
      const b = parseLocal(p.end);
      return a < end && b > start;
    });
    if (!hits.length) return { label: "Who: not set", cls: "Split" };
    if (hits.length === 1 && parseLocal(hits[0].start) <= start && parseLocal(hits[0].end) >= end) {
      return { label: "With " + hits[0].who, cls: hits[0].who };
    }
    const bits = hits.map((p) => {
      const a = parseLocal(p.start);
      const b = parseLocal(p.end);
      const from = a > start ? fmtTime(p.start) : "";
      const to = b < end ? fmtTime(p.end) : "";
      if (from && to) return `${p.who} ${from}–${to}`;
      if (to) return `${p.who} until ${to}`;
      if (from) return `${p.who} from ${from}`;
      return p.who;
    });
    return { label: bits.join(" · "), cls: "Split" };
  }
  function sameDay(iso, d) {
    return (iso || "").slice(0, 10) === ymd(d);
  }
  function isTestTitle(title) {
    return /^TEST:/i.test(title || "");
  }
  function titleHtml(title) {
    if (isTestTitle(title)) {
      return `<span class="test-tag">TEST</span> ${Game.esc(title.replace(/^TEST:\s*/i, ""))}`;
    }
    return Game.esc(title);
  }
  function overlayOpen() {
    return document.getElementById("shelf").classList.contains("open")
      || document.getElementById("sheet").classList.contains("open");
  }
  function typing() {
    const t = document.activeElement;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  function weekWorkIds(days) {
    const ids = new Set();
    days.forEach((d) => {
      (week.work || []).forEach((w) => {
        if (sameDay(w.due, d)) ids.add(w.id);
        const dueD = parseLocal(w.due);
        const from = w.suggest_from
          ? parseLocal(w.suggest_from + "T00:00:00")
          : new Date(dueD.getTime() - 3 * 86400000);
        if (!sameDay(w.due, d) && d >= from && d < new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate())) {
          ids.add(w.id);
        }
      });
    });
    return [...ids];
  }

  function daysFromToday() {
    const start = todayInChicago();
    return Array.from({ length: DAY_COUNT }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  function hud() {
    const cur = Game.currency(pack);
    document.getElementById("bananas").textContent = `${cur.emoji} ${Game.getBananas(pack, family)}`;
    const days = daysFromToday();
    const ids = weekWorkIds(days);
    const progress = Game.getProgress();
    const touched = ids.filter((id) => progress[id] && (progress[id].started || progress[id].startedAt || progress[id].done)).length;
    document.getElementById("rally-fill").style.width = (ids.length ? (touched / ids.length) * 100 : 0) + "%";
    document.getElementById("rally-count").textContent = `${touched}/${ids.length}`;
    document.getElementById("trophy-count").textContent = Object.keys(Game.getUnlocks()).filter((id) => Game.alreadyUnlocked(id)).length;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    Game.paintStoryChip(roster);
    Game.paintMessagesChip(family);
  }

  function runUnlocks(extra) {
    const result = Game.applyLiveUnlocks(pack, family, {
      week,
      eggs: Game.getEggs(),
      viewedEvents,
      ...(extra || {})
    });
    family = result.family;
    result.fresh.forEach((ach) => Game.celebrate(ach, pack, library));
    if (roster) Game.maybePlayUnlockCelebration(roster);
    hud();
    if (document.getElementById("shelf").classList.contains("open")) renderShelf();
  }

  function syncWeek() {
    week = Game.applyWeekOverlay(baseWeek, family);
    if (baseSeed) seed = Game.applyProgressOverlay(baseSeed, family);
    return week;
  }

  function paintBoardSync(sync) {
    let el = document.getElementById("board-sync");
    if (!el) {
      const flag = document.getElementById("draft-flag");
      if (!flag || !flag.parentNode) return;
      el = document.createElement("p");
      el.id = "board-sync";
      el.className = "draft-flag";
      flag.parentNode.insertBefore(el, flag.nextSibling);
    }
    const text = Game.boardSyncNotice(sync);
    el.hidden = !text;
    el.textContent = text;
  }

  function standingClasses() {
    return ((seed && seed.classes) || []).filter((cls) => cls && cls.id);
  }

  function selectedClass() {
    const classes = standingClasses();
    return classes.find((cls) => cls.id === selectedClassId) || classes[0] || null;
  }

  function initSelectedClass() {
    const days = daysFromToday();
    selectedClassId = Game.pickClassId(standingClasses(), week, days, Game.rememberedClassId());
    if (selectedClassId) Game.rememberClassId(selectedClassId);
  }

  function selectClass(id) {
    const next = String(id || "");
    if (!next || !standingClasses().some((cls) => cls.id === next)) return;
    selectedClassId = next;
    Game.rememberClassId(next);
    renderClassSwitcher();
    refreshCardsInPlace();
  }

  function renderClassSwitcher() {
    const host = document.getElementById("class-switcher-list");
    if (!host) return;
    const classes = standingClasses();
    const days = daysFromToday();
    if (!classes.length) {
      host.innerHTML = "";
      return;
    }
    if (!selectedClassId || !classes.some((cls) => cls.id === selectedClassId)) {
      selectedClassId = Game.pickClassId(classes, week, days, selectedClassId);
    }
    host.innerHTML = classes.map((cls) => {
      const count = Game.classAttentionCount(cls, week, days);
      const on = cls.id === selectedClassId;
      const badge = count > 0
        ? `<span class="class-chip-badge" aria-label="${count} need attention">${count}</span>`
        : "";
      return `
        <button type="button" class="class-chip${on ? " on" : ""}" data-class-id="${Game.esc(cls.id)}" aria-pressed="${on ? "true" : "false"}">
          <span class="class-chip-full">${Game.esc(cls.name)}</span>
          <span class="class-chip-short">${Game.esc(Game.classShortLabel(cls.id))}</span>
          ${badge}
        </button>`;
    }).join("");
    host.querySelectorAll("[data-class-id]").forEach((btn) => {
      btn.addEventListener("click", () => selectClass(btn.dataset.classId));
    });
  }

  function workButtons(w) {
    const st = Game.workState(w.id);
    const stamp = st.started && st.startedAt ? `Started ${Game.fmtStamp(st.startedAt)}` : "";
    return `
      <div class="actions">
        <button type="button" class="act ${st.started ? "started" : ""}" data-act="started" data-id="${Game.esc(w.id)}">
          ${st.started ? "Started" : "I started this"}
        </button>
        <button type="button" class="act ${st.done ? "done-on" : ""}" data-act="done" data-id="${Game.esc(w.id)}">
          Done
        </button>
      </div>
      ${stamp ? `<p class="started-row"><span class="started-at">${Game.esc(stamp)}</span><button type="button" class="tiny undo-mini" data-act="started" data-id="${Game.esc(w.id)}">Undo</button></p>` : ""}
      ${st.done ? `<p class="started-row"><span class="started-at">Marked done</span><button type="button" class="tiny undo-mini" data-act="done" data-id="${Game.esc(w.id)}">Undo</button></p>` : ""}`;
  }

  function noteBubble(n) {
    const kid = n.from === "bennett";
    const reply = !kid && Game.isParentReply(n);
    const label = Game.noteAuthorLabel(n, Game.siteView());
    const cls = kid ? "kid" : (reply ? "parent reply" : "parent");
    return `
      <div class="bubble ${cls}">
        ${n.test ? '<span class="test-tag">TEST</span> ' : ""}<strong class="bubble-who">${Game.esc(label)}:</strong> ${Game.esc(n.text)}
        <div class="entry-tools">${Game.entryButtons("note:" + n.id, "note:" + n.id)}</div>
      </div>`;
  }

  function itemNotes(targetType, targetId) {
    const notes = Game.notesFor(family, targetType, targetId);
    const used = new Set();
    const parts = [];
    notes.filter((n) => n.from === "bennett").forEach((ask) => {
      used.add(ask.id);
      parts.push(noteBubble(ask));
      const replies = Game.parentRepliesForAsk(family, ask).filter((r) => {
        return r.targetType === targetType && r.targetId === targetId;
      });
      replies.forEach((r) => {
        used.add(r.id);
        parts.push(noteBubble(r));
      });
    });
    notes.forEach((n) => {
      if (used.has(n.id)) return;
      parts.push(noteBubble(n));
    });
    return parts.join("");
  }

  function itemSound(targetId) {
    const item = Game.attachedLibraryItem(family, library, targetId);
    if (!item || !Game.canPlayLibraryItem(item)) return "";
    if (item.kind === "link") {
      const src = Game.librarySrc(item);
      return src && src !== "#"
        ? `<button type="button" class="mini" data-open-lib="${Game.esc(item.id)}">Open</button>`
        : "";
    }
    if (item.kind === "audio" || item.character === "fun") {
      if (!Game.audioAllowed()) return "";
      return `<button type="button" class="mini" data-play-lib="${Game.esc(item.id)}">Play sound</button>`;
    }
    return "";
  }

  function itemTools(targetType, targetId, help) {
    const kind = targetType === "event" ? "event" : "work";
    return `
      <div class="item-tools">
        <button type="button" class="mini" data-note="${targetType}:${Game.esc(targetId)}">Note</button>
        <button type="button" class="mini" data-ask="${targetType}:${Game.esc(targetId)}">Ask</button>
        ${help ? `<button type="button" class="mini" data-help="${Game.esc(targetId)}">A little help</button>` : ""}
        ${itemSound(targetId)}
        ${Game.entryButtons(kind + ":" + targetId, kind + ":" + targetId)}
      </div>
      ${itemNotes(targetType, targetId)}`;
  }

  function itemClass(id) {
    const st = Game.workState(id);
    return "item" + (st.done ? " done" : st.started ? " started" : "");
  }

  function canvasOf(w) {
    return (w && w.canvas && typeof w.canvas === "object") ? w.canvas : null;
  }

  function canvasStatusLabel(c) {
    if (!c || !c.status) return "";
    if (c.status === "submitted") return "Submitted";
    if (c.status === "open") return "Open";
    return "";
  }

  function nightWhen(iso) {
    if (!iso) return "";
    const d = parseLocal(iso);
    const today = todayInChicago();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((dueDay - start) / 86400000);
    if (diff === 0) return "tonight";
    if (diff === 1) return "tomorrow night";
    return dateLabel(d) + " night";
  }

  function canvasBadgeHtml(w) {
    const c = canvasOf(w);
    const label = canvasStatusLabel(c);
    if (!label) return "";
    return `<span class="canvas-tag ${Game.esc(c.status)}">${Game.esc(label)}</span>`;
  }

  function canvasCalloutHtml(w) {
    const c = canvasOf(w);
    if (!c || c.status !== "submitted") return "";
    if (Game.workState(w.id).done) return "";
    return `<p class="canvas-callout">Canvas already has this — tap Done if you are finished.</p>`;
  }

  function canvasDueBits(w) {
    const c = canvasOf(w);
    const bits = [];
    if (c && c.class_due && (c.due || w.due) && String(c.class_due).slice(0, 10) !== String(c.due || w.due).slice(0, 10)) {
      bits.push("Class time Tuesday");
      bits.push("Canvas due Thursday 11:59pm");
    }
    return bits;
  }

  function canvasRubricHtml(c) {
    const rows = (c && Array.isArray(c.rubric)) ? c.rubric : [];
    if (!rows.length) return "";
    return rows.map((row) => `
      <div class="canvas-rubric">
        <strong>${Game.esc(row.name || "Rubric")}${row.points ? " (" + Game.esc(String(row.points)) + " pts)" : ""}</strong>
        ${row.text ? `<p>${Game.esc(row.text)}</p>` : ""}
        ${row.ratings ? `<p class="canvas-ratings">${Game.esc(row.ratings)}</p>` : ""}
      </div>`).join("");
  }

  function canvasFactsHtml(w) {
    const c = canvasOf(w);
    if (!c) return "";
    const bits = [];
    const status = canvasStatusLabel(c);
    if (status) bits.push(status);
    if (c.points != null) bits.push(c.points + " pt" + (Number(c.points) === 1 ? "" : "s"));
    if (c.submitted_at) {
      const submitted = parseLocal(c.submitted_at);
      bits.push("submitted " + dateLabel(submitted) + " " + fmtTime(c.submitted_at));
    }
    if (c.status === "submitted" && c.score == null && c.grade == null) bits.push("ungraded");
    if (c.submit === "paper") bits.push("submitting on paper");
    const dueBits = canvasDueBits(w);
    return `
      <div class="canvas-facts">
        ${bits.length ? `<p class="canvas-facts-line">${Game.esc(bits.join(" · "))}</p>` : ""}
        ${dueBits.length ? `<p class="canvas-facts-line">${Game.esc(dueBits.join(" · "))}</p>` : ""}
        ${c.absent ? `<p class="canvas-absent">${Game.esc(c.absent)}</p>` : ""}
        ${canvasRubricHtml(c)}
      </div>`;
  }

  function workMetaHtml(w, startThis) {
    const c = canvasOf(w);
    const bits = [];
    if (startThis) bits.push("Due " + dateLabel(parseLocal(w.due)));
    else if (w.due) bits.push(fmtTime(w.due));
    canvasDueBits(w).forEach((bit) => bits.push(bit));
    if (w.note && !c) bits.push(w.note);
    else if (w.note && c && !c.rubric && !c.absent) bits.push(w.note);
    return bits.length ? `<div class="meta">${Game.esc(bits.join(" · "))}</div>` : "";
  }

  function workTitleHtml(w, dueTag) {
    const c = canvasOf(w);
    const done = Game.workState(w.id).done;
    const title = (dueTag ? `<span class="tag">Due</span> ` : "") + (done ? `<span class="done-tag">Done</span> ` : "") + titleHtml(w.title) + " " + canvasBadgeHtml(w);
    if (!c) return `<div class="title">${title}</div>`;
    return `<button type="button" class="work-title-btn" data-work-detail="${Game.esc(w.id)}">${title}</button>`;
  }

  function workCardHtml(w, startThis) {
    return `
      <div class="${itemClass(w.id)}">
        ${workTitleHtml(w, !startThis)}
        ${workMetaHtml(w, startThis)}
        ${canvasCalloutHtml(w)}
        ${canvasFactsHtml(w)}
        ${workButtons(w)}
        ${itemTools("work", w.id, true)}
      </div>`;
  }

  function canvasCheckHtml(isToday, classId) {
    if (!isToday) return "";
    const work = week.work || [];
    const want = String(classId || "");
    const lines = [];
    const chem = work.find((w) => w.id === "chem-about-me" && canvasOf(w));
    const chemDisc = work.find((w) => w.id === "chem-aboutme-disc" && canvasOf(w));
    const web11 = work.find((w) => w.id === "web-11" && canvasOf(w));
    const comics = work.find((w) => w.id === "eng-comics" && canvasOf(w));
    const names = work.find((w) => w.id === "eng-names" && canvasOf(w) && w.canvas.status === "submitted");
    if (chem && Game.classIdForWork(chem) === want) {
      lines.push("Chemistry About Me Slides assignment is due " + nightWhen(chem.due) + " (was missing here).");
    }
    if (chemDisc && Game.classIdForWork(chemDisc) === want) {
      lines.push("Chemistry About Me Slides discussion is due " + nightWhen(chemDisc.due) + ".");
    }
    if (web11 && Game.classIdForWork(web11) === want) {
      lines.push("Web Design 1.1 What is the Web is open, 20 points, due Wednesday 9:20 a.m.");
    }
    if (comics && Game.classIdForWork(comics) === want) {
      lines.push("Comic official due is Thursday night, paper, plus a paragraph on the back.");
    }
    if (names && Game.classIdForWork(names) === want) {
      lines.push("Name video: Canvas says submitted 8/17 1:14pm, ungraded.");
    }
    if (!lines.length) return "";
    return `
      <section class="canvas-check">
        <h3>Canvas check</h3>
        <ul>${lines.map((line) => `<li>${Game.esc(line)}</li>`).join("")}</ul>
      </section>`;
  }

  function openWorkDetail(id) {
    const work = findWork(id);
    if (!work || !canvasOf(work)) return;
    openSheet(work.title || "Canvas", `
      <div class="help-nudge">
        <p class="help-work">${Game.esc(work.title || "")}</p>
        ${canvasFactsHtml(work)}
        ${canvasCalloutHtml(work)}
        ${work.note && canvasOf(work).rubric ? "" : (work.note ? `<p class="canvas-absent">${Game.esc(work.note)}</p>` : "")}
      </div>`);
  }

  function items(arr, html) {
    if (!arr.length) return `<p class="empty">None</p>`;
    return arr.map(html).join("");
  }

  function decoFor(events) {
    const band = events.some((e) => /band|clarinet|jam/i.test(e.title || ""));
    return band ? "img/monkey-guitar-clarinet.png" : "img/monkey-tennis.png";
  }

  function hashDay(key) {
    let h = 0;
    for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h;
  }

  function todaysPrompt() {
    const pool = (family.reflections && family.reflections.pool) || [];
    if (!pool.length) return null;
    const key = ymd(todayInChicago());
    return pool[hashDay(key) % pool.length];
  }

  function todaysAnswer(prompt) {
    const key = ymd(todayInChicago());
    return ((family.reflections && family.reflections.answers) || []).find((a) => {
      return a.promptId === prompt.id && (a.at || "").slice(0, 10) === key;
    }) || null;
  }

  function reflectBlock(isToday) {
    if (!isToday) return "";
    const prompt = todaysPrompt();
    if (!prompt) return "";
    const answer = todaysAnswer(prompt);
    if (answer) {
      return `
        <section class="reflect span-all">
          <h3>Quick check-in</h3>
          <div class="item">
            <div class="title">${prompt.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(prompt.text)}</div>
            <div class="entry-tools">${Game.entryButtons("prompt:" + prompt.id, "prompt:" + prompt.id)}</div>
          </div>
          <div class="item">
            <div class="meta">${answer.test ? '<span class="test-tag">TEST</span> ' : ""}You said: ${Game.esc(answer.text)}</div>
            <div class="entry-tools">${Game.entryButtons("answer:" + answer.id, "answer:" + answer.id)}</div>
          </div>
        </section>`;
    }
    return `
      <section class="reflect span-all">
        <h3>Quick check-in</h3>
        <p>${prompt.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(prompt.text)}</p>
        <div class="entry-tools">${Game.entryButtons("prompt:" + prompt.id, "prompt:" + prompt.id)}</div>
        <div class="reflect-row">
          <input id="reflect-text" maxlength="280" placeholder="A sentence or two" autocomplete="off">
          <button type="button" class="act" id="reflect-send" data-prompt="${Game.esc(prompt.id)}">Send</button>
        </div>
      </section>`;
  }

  function renderCards() {
    const days = daysFromToday();
    const track = document.getElementById("track");
    const dots = document.getElementById("dots");
    track.innerHTML = "";
    dots.innerHTML = "";

    days.forEach((d, i) => {
      const cls = selectedClass();
      const classId = (cls && cls.id) || selectedClassId || "";
      const grouped = Game.itemsForClassOnDay(week, classId, d);
      const events = grouped.events;
      const due = grouped.due;
      const startThis = grouped.startThis;
      const loose = Game.looseEventsOnDay(week, d);
      const notes = (week.notes || []).filter((n) => n.date === ymd(d));
      const who = whoOn(week, d);
      const khan = cls ? Game.khanStripHtmlForClass(cls) : "";
      const className = (cls && cls.name) || Game.classNameForId(classId) || "Class";
      const hasClassItems = !!(events.length || due.length || startThis.length);
      const emptyLine = hasClassItems ? "" : `<p class="empty">Nothing for ${Game.esc(className)} ${i === 0 ? "today" : "on " + dayLabel(d)}.</p>`;
      const addRow = `<p class="add-work-row"><button type="button" class="mini" data-add-work="${ymd(d)}">Add assignment</button></p>`;
      const eventHtml = (e) => `
        <div class="item">
          <div class="title">${titleHtml(e.title)}</div>
          <div class="meta">${Game.esc(fmtRange(e.start, e.end))}${e.place ? " · " + Game.esc(e.place) : ""}${e.note ? " · " + Game.esc(e.note) : ""}</div>
          ${itemTools("event", e.id, false)}
        </div>`;

      const card = document.createElement("article");
      card.className = "day";
      card.dataset.dayIndex = String(i);
      card.dataset.classId = classId;
      card.dataset.events = events.concat(loose).map((e) => e.id).filter(Boolean).join(",");
      card.innerHTML = `
        <div class="card">
          <img class="card-deco" src="${decoFor(events.concat(loose))}" alt="">
          <div class="card-scroll">
            <div class="when">
              <h2>${i === 0 ? "Today" : dayLabel(d)}</h2>
              <div class="date">${dateLabel(d)}</div>
            </div>
            <div class="who ${who.cls}">${Game.esc(who.label)}</div>
            ${reflectBlock(i === 0)}
            <section class="class-pane" data-class-id="${Game.esc(classId)}">
              <header class="class-pane-head">
                <h3 class="class-pane-name">${Game.esc(className)}</h3>
                ${khan}
              </header>
              ${canvasCheckHtml(i === 0, classId)}
              <div class="class-pane-stack">
                ${due.length ? `<section>
                  <h3>Due</h3>
                  ${items(due, (w) => workCardHtml(w, false))}
                </section>` : ""}
                ${startThis.length ? `<section class="start">
                  <h3>Start this</h3>
                  ${items(startThis, (w) => workCardHtml(w, true))}
                </section>` : ""}
                ${events.length ? `<section>
                  <h3>On the calendar</h3>
                  ${items(events, eventHtml)}
                </section>` : ""}
                ${emptyLine}
              </div>
            </section>
            ${loose.length ? `<section class="also-cal">
              <h3>Also on the calendar</h3>
              ${items(loose, eventHtml)}
            </section>` : ""}
            ${notes.length ? `
            <section class="note">
              <h3>Note</h3>
              ${items(notes, (n) => `
                <div class="item">
                  <div class="title">${titleHtml(n.title)}</div>
                  <div class="meta">${Game.esc(n.text || "")}</div>
                  <div class="item-tools">${Game.entryButtons("weeknote:" + n.id, "weeknote:" + n.id)}</div>
                </div>`)}
            </section>` : ""}
            ${addRow}
          </div>
        </div>`;
      track.appendChild(card);

      const b = document.createElement("button");
      b.className = "dot" + (i === dayIndex ? " on" : "");
      b.type = "button";
      b.setAttribute("aria-label", dayLabel(d));
      b.addEventListener("click", () => goTo(i));
      dots.appendChild(b);
    });

    bindBoardRoot(track);
    renderLaterBoard();
    const send = document.getElementById("reflect-send");
    if (send) {
      send.addEventListener("click", () => {
        const prompt = todaysPrompt();
        const text = (document.getElementById("reflect-text").value || "").trim();
        if (!prompt || !text) {
          Game.toast("Write a sentence or two first.");
          return;
        }
        family.reflections.answers.push({
          id: Game.uid("ra"),
          promptId: prompt.id,
          prompt: prompt.text,
          text,
          at: Game.nowIso()
        });
        Game.saveFamily(family);
        Game.toast("Sent to the parent desk.");
        refreshCardsInPlace();
      });
    }
  }

  function laterWeekStart(ymdStr) {
    const d = parseLocal(String(ymdStr || "").slice(0, 10) + "T00:00:00");
    if (!d || Number.isNaN(d.getTime())) return "";
    const dow = d.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + offset);
    return ymd(d);
  }

  function laterGroups(list) {
    const groups = [];
    const map = Object.create(null);
    (list || []).forEach((w) => {
      const key = laterWeekStart(w && w.due) || "later";
      if (!map[key]) {
        const d = parseLocal(key + "T00:00:00");
        const label = key === "later"
          ? "Later"
          : "Week of " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        map[key] = { key, label, items: [] };
        groups.push(map[key]);
      }
      map[key].items.push(w);
    });
    return groups;
  }

  function renderLaterBoard() {
    const host = document.getElementById("later-board");
    if (!host) return;
    const days = daysFromToday();
    const classId = (selectedClass() && selectedClass().id) || selectedClassId || "";
    const later = Game.laterWorkForClass(week, days, classId);
    if (!later.length) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    const groups = laterGroups(later);
    host.hidden = false;
    host.innerHTML = `
      <h3>Later</h3>
      ${groups.map((g) => `
        <section class="later-group">
          <h4 class="later-week">${Game.esc(g.label)}</h4>
          ${items(g.items, (w) => workCardHtml(w, true))}
        </section>`).join("")}
      <p class="add-work-row"><button type="button" class="mini" data-add-work="${ymd(days[days.length - 1])}">Add assignment</button></p>`;
    bindBoardRoot(host);
  }

  function bindBoardRoot(root) {
    if (!root) return;
    root.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        const before = Game.workState(id);
        const undo = btn.classList.contains("undo-mini");
        const touched = Game.touchWork(id, act);
        if (!undo && (act === "started" || act === "done")) Game.primeLibraryAudio();
        if (!undo && act === "started" && !before.started) {
          Game.playWorkActionCue(family, library, id, "started");
        }
        if (!undo && act === "done" && !before.done) {
          Game.playWorkActionCue(family, library, id, "done");
        }
        refreshCardsInPlace();
        runUnlocks();
        try {
          const sync = touched && touched.synced ? await touched.synced : await Game.syncFamilyProgress();
          if (sync && sync.failed) Game.toast("Couldn't sync. Try again.");
          else Game.familySavedToast(undo ? "Undone" : (act === "done" ? "Done" : "Started"));
        } catch (_) {
          Game.toast("Couldn't sync. Try again.");
        }
      });
    });
    root.querySelectorAll("[data-ask]").forEach((btn) => {
      btn.addEventListener("click", () => openAsk(btn.dataset.ask));
    });
    root.querySelectorAll("[data-note]").forEach((btn) => {
      btn.addEventListener("click", () => openItemNote(btn.dataset.note));
    });
    root.querySelectorAll("[data-add-work]").forEach((btn) => {
      btn.addEventListener("click", () => openAddWork(btn.dataset.addWork));
    });
    root.querySelectorAll("[data-help]").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.disabled = true;
        openHelp(btn.dataset.help);
      });
    });
    root.querySelectorAll("[data-work-detail]").forEach((btn) => {
      btn.addEventListener("click", () => openWorkDetail(btn.dataset.workDetail));
    });
    root.querySelectorAll("[data-play-lib]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = Game.libraryItem(library, btn.dataset.playLib);
        if (item && Game.canPlayLibraryItem(item)) Game.playLibraryItem(item);
      });
    });
    root.querySelectorAll("[data-open-lib]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = Game.libraryItem(library, btn.dataset.openLib);
        const src = item && Game.librarySrc(item);
        if (src && src !== "#") window.open(src, "_blank", "noopener");
      });
    });
    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openEdit(btn.dataset.edit));
    });
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => deleteEntry(btn.dataset.del));
    });
  }

  function clampDay(i) {
    return Math.max(0, Math.min(DAY_COUNT - 1, i));
  }

  function pageScrollY() {
    return window.scrollY || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop) || 0;
  }

  function captureBoardScroll() {
    const track = document.getElementById("track");
    const scroller = track ? track.querySelectorAll(".card-scroll")[dayIndex] : null;
    return {
      dayIndex,
      pageY: pageScrollY(),
      trackLeft: track ? track.scrollLeft : 0,
      cardTop: scroller ? scroller.scrollTop : 0
    };
  }

  function restoreBoardScroll(saved) {
    if (!saved) return;
    dayIndex = clampDay(saved.dayIndex);
    const track = document.getElementById("track");
    if (track) track.scrollLeft = saved.trackLeft;
    const scroller = track ? track.querySelectorAll(".card-scroll")[dayIndex] : null;
    if (scroller) scroller.scrollTop = saved.cardTop;
    const y = saved.pageY || 0;
    if (window.scrollTo) window.scrollTo(0, y);
    if (document.documentElement) document.documentElement.scrollTop = y;
    if (document.body) document.body.scrollTop = y;
    syncChrome();
  }

  function refreshCardsInPlace() {
    const saved = captureBoardScroll();
    renderClassSwitcher();
    renderCards();
    restoreBoardScroll(saved);
  }

  function syncChrome() {
    const dots = document.getElementById("dots");
    const prev = document.getElementById("prev");
    const next = document.getElementById("next");
    dots.querySelectorAll(".dot").forEach((el, n) => el.classList.toggle("on", n === dayIndex));
    prev.disabled = dayIndex <= 0;
    next.disabled = dayIndex >= DAY_COUNT - 1;
    const day = document.querySelectorAll(".day")[dayIndex];
    if (!day) return;
    (day.dataset.events || "").split(",").filter(Boolean).forEach((id) => {
      viewedEvents[id] = true;
    });
    runUnlocks();
  }

  function goTo(i, instant) {
    dayIndex = clampDay(i);
    const track = document.getElementById("track");
    const reduce = Game.prefersReducedMotion() || instant;
    const left = dayIndex * track.clientWidth;
    track.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    const card = track.querySelectorAll(".card")[dayIndex];
    if (card && !reduce) {
      card.classList.remove("snap");
      void card.offsetWidth;
      card.classList.add("snap");
    }
    syncChrome();
  }

  function bindTrack() {
    if (trackBound) return;
    trackBound = true;
    const track = document.getElementById("track");
    document.getElementById("prev").addEventListener("click", () => goTo(dayIndex - 1));
    document.getElementById("next").addEventListener("click", () => goTo(dayIndex + 1));
    track.addEventListener("scroll", () => {
      const i = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
      if (i !== dayIndex && i >= 0 && i < DAY_COUNT) {
        dayIndex = i;
        syncChrome();
      }
    }, { passive: true });
    window.addEventListener("resize", () => {
      track.scrollLeft = dayIndex * track.clientWidth;
    });
    document.addEventListener("keydown", (e) => {
      if (overlayOpen() || typing()) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(dayIndex - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(dayIndex + 1);
      }
    });
  }

  function earnedAchievements() {
    return (pack.achievements || []).filter((ach) => Game.alreadyUnlocked(ach.id));
  }

  function orderedTrophies() {
    const earned = earnedAchievements();
    const map = new Map(earned.map((a) => [a.id, a]));
    const out = [];
    Game.getTrophyOrder().forEach((id) => {
      if (map.has(id)) {
        out.push(map.get(id));
        map.delete(id);
      }
    });
    map.forEach((a) => out.push(a));
    return out;
  }

  function contentPlay(ach) {
    const item = Game.rewardMediaItem ? Game.rewardMediaItem(ach, library) : null;
    if (!item || !Game.canPlayLibraryItem(item)) return "";
    if (!(item.kind === "audio" || item.synth || item.kind === "link")) return "";
    return `<a class="trophy-plaque-go" href="#" data-play-content="${Game.esc(item.id)}">Play</a>`;
  }

  function crewIdOf(ach) {
    if (ach && ach.crewId) return ach.crewId;
    const unlock = Game.rewardUnlockOf(ach);
    return unlock && unlock.type === "character" ? unlock.id : "";
  }

  function trophyKind(ach) {
    if (crewIdOf(ach)) return "character";
    const unlock = Game.rewardUnlockOf(ach);
    if (unlock && unlock.type && unlock.type !== "content") return "gear";
    return "badge";
  }

  function trophyArt(ach) {
    const media = Game.rewardMediaItem ? Game.rewardMediaItem(ach, library) : null;
    if (media && media.kind === "image") {
      const src = Game.librarySrc(media) || Game.libraryThumb(media);
      if (src) return src;
    }
    const unlock = Game.rewardUnlockOf(ach);
    if (unlock && unlock.type && unlock.type !== "content" && unlock.type !== "character") {
      const item = Game.libraryItem(library, unlock.id) || Game.gearLibraryItem(library, unlock.id);
      const src = item ? (Game.librarySrc(item) || Game.libraryThumb(item)) : "";
      if (src) return src;
    }
    return Game.iconFor(ach.icon);
  }

  function crewPortraitSrc(id) {
    const ch = ((roster && roster.characters) || []).find((row) => row.id === id);
    return (ch && ch.poster) || ("img/characters/" + id + ".jpg");
  }

  function unlockAt(id) {
    const raw = Game.getUnlocks()[id];
    if (typeof raw === "number") return raw;
    if (raw && typeof raw === "object") {
      const at = Date.parse(raw.at || raw.date || "");
      if (!Number.isNaN(at)) return at;
    }
    return 0;
  }

  function homeZoneOf(ach) {
    const unlock = Game.rewardUnlockOf(ach);
    if (unlock && unlock.type === "character") return "window";
    if (unlock && PEGBOARD_IDS.indexOf(unlock.id) >= 0) return "pegboard";
    if (unlock && (unlock.type === "outfit" || unlock.type === "ability" || LOCKER_IDS.indexOf(unlock.id) >= 0)) {
      return "lockers";
    }
    return "cubbies";
  }

  function featuredTrophy(earned) {
    const items = earned.filter((ach) => !crewIdOf(ach));
    if (!items.length) return null;
    return [...items].sort((a, b) => unlockAt(b.id) - unlockAt(a.id))[0];
  }

  function crewSlotItem(id) {
    const ch = ((roster && roster.characters) || []).find((row) => row.id === id);
    return {
      id: "crew:" + id,
      crewId: id,
      title: ch ? ch.name : id,
      description: ch ? (ch.tagline || ch.talent || "") : ""
    };
  }

  function trophiesForZone(zoneId, earned) {
    if (zoneId === "pedestal") {
      const featured = featuredTrophy(earned);
      return featured ? [featured] : [];
    }
    if (zoneId === "window") {
      return CREW_ORDER.filter((id) => Game.alreadyUnlockedCharacter(id)).map(crewSlotItem);
    }
    return earned.filter((ach) => homeZoneOf(ach) === zoneId && !crewIdOf(ach));
  }

  function slotBox(zoneId, ach, index) {
    const id = crewIdOf(ach) || (Game.rewardUnlockOf(ach) || {}).id || "";
    if (zoneId === "pedestal") return PEDESTAL_SLOT;
    if (zoneId === "pegboard") return PEGBOARD_SLOTS[id] || CUBBY_SLOTS[index % CUBBY_SLOTS.length];
    if (zoneId === "lockers") return LOCKER_SLOTS[id] || CUBBY_SLOTS[(index + 4) % CUBBY_SLOTS.length];
    return CUBBY_SLOTS[index % CUBBY_SLOTS.length];
  }

  function preloadTrophyStills() {
    if (trophyStillsReady) return;
    trophyStillsReady = true;
    Object.keys(TROPHY_ZONES).forEach((id) => {
      const img = new Image();
      img.src = TROPHY_ZONES[id].still;
    });
  }

  function boxStyle(box) {
    return `left:${box.l};top:${box.t};width:${box.w};height:${box.h}`;
  }

  function plaqueLine(ach) {
    const text = (ach.description || ach.incentive || ach.how || "").trim();
    if (!text) return "";
    const stop = text.search(/[.!?](\s|$)/);
    const cut = stop >= 0 ? text.slice(0, stop + 1) : text;
    return cut.length > 90 ? cut.slice(0, 87) + "…" : cut;
  }

  function plaqueHtml(ach) {
    const crewId = crewIdOf(ach);
    const ch = crewId && ((roster && roster.characters) || []).find((row) => row.id === crewId);
    const watch = ch && ch.video
      ? `<button type="button" class="trophy-plaque-go" data-watch-crew="${Game.esc(ch.id)}">Watch</button>`
      : "";
    const play = watch || (Game.gameHref(ach)
      ? `<a class="trophy-plaque-go" href="${Game.esc(Game.gameHref(ach))}">Play</a>`
      : contentPlay(ach));
    return `<aside class="trophy-plaque">
      <strong>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title)}</strong>
      ${plaqueLine(ach) ? `<span>${Game.esc(plaqueLine(ach))}</span>` : ""}
      ${play}
    </aside>`;
  }

  function bindPlaque(root) {
    root.querySelectorAll("[data-play-content]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const item = Game.libraryItem(library, btn.dataset.playContent);
        if (item && Game.canPlayLibraryItem(item)) Game.playLibraryItem(item);
      });
    });
    root.querySelectorAll("[data-watch-crew]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ch = ((roster && roster.characters) || []).find((row) => row.id === btn.dataset.watchCrew);
        if (ch) Game.playUnlockClip(roster, ch);
      });
    });
  }

  function clearTrophyPlaques() {
    document.querySelectorAll(".trophy-object.is-open, .trophy-portrait.is-open").forEach((el) => {
      el.classList.remove("is-open");
    });
    document.querySelectorAll(".trophy-plaque").forEach((p) => p.remove());
  }

  function currentTrophyLook() {
    return trophyZone ? trophyLookClose : trophyLookWide;
  }

  function lookMetrics() {
    const stage = document.getElementById("trophy-stage");
    if (!stage) return { w: 0, h: 0, maxX: 0, maxY: 0 };
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const pad = Game.prefersReducedMotion() ? 1.04 : 1.18;
    const u = Math.max(sw / 16, sh / 9) * pad;
    const w = 16 * u;
    const h = 9 * u;
    return {
      w,
      h,
      maxX: Math.max(0, (w - sw) / 2),
      maxY: Math.max(0, (h - sh) / 2)
    };
  }

  function placeLookLayer(el, look, extraScale) {
    if (!el) return;
    const m = lookMetrics();
    const gain = Game.prefersReducedMotion() ? 0 : 0.32;
    let x = look.panX + look.mouseX * m.maxX * gain;
    let y = look.panY + look.mouseY * m.maxY * gain;
    x = Math.max(-m.maxX, Math.min(m.maxX, x));
    y = Math.max(-m.maxY, Math.min(m.maxY, y));
    look.panX = Math.max(-m.maxX, Math.min(m.maxX, look.panX));
    look.panY = Math.max(-m.maxY, Math.min(m.maxY, look.panY));
    el.style.width = m.w + "px";
    el.style.height = m.h + "px";
    el.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${extraScale})`;
  }

  function applyTrophyLook() {
    const room = document.getElementById("trophy-room");
    const zoom = !!(room && room.classList.contains("is-zoomed"));
    const reduced = Game.prefersReducedMotion();
    placeLookLayer(document.getElementById("trophy-look-wide"), trophyLookWide, zoom && !reduced ? 1.72 : 1);
    placeLookLayer(document.getElementById("trophy-look-close"), trophyLookClose, 1);
  }

  function renderTrophyChrome() {
    const room = document.getElementById("trophy-room");
    const close = document.getElementById("trophy-close");
    const zone = trophyZone ? TROPHY_ZONES[trophyZone] : null;
    if (room) {
      room.dataset.view = trophyZone || "wide";
      room.classList.toggle("is-zoomed", !!trophyZone);
      if (zone) room.style.setProperty("--zoom-origin", zone.origin);
      else room.style.removeProperty("--zoom-origin");
    }
    if (close) close.setAttribute("aria-hidden", trophyZone ? "false" : "true");
    const leave = document.getElementById("trophy-leave");
    if (leave) leave.setAttribute("aria-label", trophyZone ? "Back to the treehouse" : "Leave the treehouse");
    const walkup = document.getElementById("trophy-walkup");
    if (walkup) {
      walkup.hidden = !!trophyZone;
      walkup.setAttribute("aria-hidden", trophyZone ? "true" : "false");
    }
    const backRow = document.getElementById("trophy-back-row");
    if (backRow) {
      backRow.hidden = !trophyZone;
      backRow.setAttribute("aria-hidden", trophyZone ? "false" : "true");
    }
    const hint = document.getElementById("trophy-lantern-hint");
    if (hint) hint.hidden = !!trophyZone || trophyLanternHintSeen;
    applyTrophyLook();
  }

  function renderTrophyHotspots(earned) {
    const host = document.getElementById("trophy-hotspots");
    if (!host) return;
    host.innerHTML = TROPHY_ZONE_ORDER.map((id) => {
      const zone = TROPHY_ZONES[id];
      const loot = trophiesForZone(id, earned).length > 0;
      return `<span class="trophy-hotspot${loot ? " has-loot" : ""}" data-zone="${id}" style="${boxStyle(zone.hot)}" aria-hidden="true">
        <span class="trophy-whisper">${Game.esc(zone.label)}</span>
      </span>`;
    }).join("");
  }

  function renderPortraitRail() {
    const rail = document.getElementById("trophy-portrait-rail");
    if (!rail) return;
    if (trophyZone !== "window") {
      rail.hidden = true;
      rail.innerHTML = "";
      return;
    }
    rail.hidden = false;
    const chars = (roster && roster.characters) || [];
    const byId = new Map(chars.map((ch) => [ch.id, ch]));
    const ids = CREW_ORDER.slice();
    chars.forEach((ch) => {
      if (ch && ch.id && ids.indexOf(ch.id) < 0) ids.push(ch.id);
    });
    rail.innerHTML = `<div class="trophy-portrait-shelf">${ids.map((id) => {
      const ch = byId.get(id);
      const unlocked = Game.alreadyUnlockedCharacter(id);
      const name = ch ? ch.name : id;
      if (!unlocked) {
        return `<span class="trophy-portrait is-locked" aria-label="Empty frame">
          <span class="trophy-portrait-frame"><span class="trophy-portrait-empty"></span></span>
        </span>`;
      }
      return `<button type="button" class="trophy-portrait is-ready" data-crew="${Game.esc(id)}" data-id="crew:${Game.esc(id)}" aria-label="${Game.esc(name)}">
        <span class="trophy-portrait-frame"><img src="${Game.esc(crewPortraitSrc(id))}" alt=""></span>
        <span class="trophy-portrait-name">${Game.esc(name)}</span>
      </button>`;
    }).join("")}</div>`;
    rail.querySelectorAll(".trophy-portrait.is-ready").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (skipTrophyClick) return;
        if (e.target.closest(".trophy-plaque")) return;
        e.stopPropagation();
        const open = el.classList.contains("is-open");
        clearTrophyPlaques();
        if (open) return;
        const ach = crewSlotItem(el.dataset.crew);
        el.insertAdjacentHTML("beforeend", plaqueHtml(ach));
        el.classList.add("is-open");
        bindPlaque(el);
      });
    });
  }

  function renderTrophySlots(earned) {
    const slots = document.getElementById("trophy-slots");
    const still = document.getElementById("trophy-close-still");
    if (!slots || !still) return;
    const zone = trophyZone ? TROPHY_ZONES[trophyZone] : null;
    if (!zone) {
      slots.innerHTML = "";
      renderPortraitRail();
      return;
    }
    still.src = zone.still;
    still.alt = zone.label;
    if (trophyZone === "window") {
      slots.innerHTML = "";
      renderPortraitRail();
      return;
    }
    const items = trophiesForZone(trophyZone, earned).filter((ach) => trophyKind(ach) !== "character");
    slots.innerHTML = items.map((ach, i) => {
      const box = slotBox(trophyZone, ach, i);
      const kind = trophyKind(ach);
      const extra = trophyZone === "pedestal" ? " trophy-pedestal" : "";
      return `<article class="trophy-object trophy-${kind}${extra}" data-id="${Game.esc(ach.id)}" style="${boxStyle(box)}">
        <img src="${Game.esc(trophyArt(ach))}" alt="">
      </article>`;
    }).join("");
    slots.querySelectorAll(".trophy-object").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (skipTrophyClick) return;
        if (e.target.closest(".trophy-plaque")) return;
        e.stopPropagation();
        const open = el.classList.contains("is-open");
        clearTrophyPlaques();
        if (open) return;
        const ach = items.find((row) => row.id === el.dataset.id);
        if (!ach) return;
        el.insertAdjacentHTML("beforeend", plaqueHtml(ach));
        el.classList.add("is-open");
        bindPlaque(el);
      });
    });
    renderPortraitRail();
  }

  function renderTrophyRoom() {
    renderTrophyChrome();
    renderTrophyHotspots(orderedTrophies());
    renderTrophySlots(orderedTrophies());
  }

  function zoneFromStagePoint(clientX, clientY) {
    const stage = document.getElementById("trophy-stage");
    if (!stage) return "";
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return "";
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return "";
    if (x < 0.28) return "window";
    if (x >= 0.78) return "lockers";
    if (x < 0.55 && y < 0.5) return "cubbies";
    if (x >= 0.28 && x < 0.62 && y >= 0.42) return "pedestal";
    if (x >= 0.55 && x < 0.78) return "pegboard";
    if (x >= 0.28 && x < 0.62) return "pedestal";
    return "";
  }

  function playTableCue() {
    if (typeof Game.soundsMuted === "function" && Game.soundsMuted()) return;
    Game.playSoundCue(family, library, "tables");
  }

  function dismissLanternHint() {
    const hint = document.getElementById("trophy-lantern-hint");
    if (hint) hint.hidden = true;
    trophyLanternHintSeen = true;
    if (trophyLanternHintTimer) {
      window.clearTimeout(trophyLanternHintTimer);
      trophyLanternHintTimer = 0;
    }
  }

  function revealLanternHint() {
    const hint = document.getElementById("trophy-lantern-hint");
    if (!hint || trophyLanternHintSeen) return;
    hint.hidden = false;
    if (trophyLanternHintTimer) window.clearTimeout(trophyLanternHintTimer);
    trophyLanternHintTimer = window.setTimeout(dismissLanternHint, 4200);
  }

  function enterTrophyZone(id) {
    if (!TROPHY_ZONES[id] || trophyZone === id) return;
    dismissLanternHint();
    if (id === "pedestal") playTableCue();
    trophyZone = id;
    trophyLookClose = { panX: 0, panY: 0, mouseX: 0, mouseY: 0 };
    renderTrophyRoom();
  }

  function leaveTrophyZone() {
    if (!trophyZone) return;
    trophyZone = "";
    trophyLookClose = { panX: 0, panY: 0, mouseX: 0, mouseY: 0 };
    renderTrophyRoom();
  }

  function resetTrophyView() {
    trophyZone = "";
    trophyLookWide = { panX: 0, panY: 0, mouseX: 0, mouseY: 0 };
    trophyLookClose = { panX: 0, panY: 0, mouseX: 0, mouseY: 0 };
    trophyDrag = null;
    const room = document.getElementById("trophy-room");
    if (room) room.classList.remove("is-settled", "is-quiet", "is-zoomed");
    if (trophyHintTimer) {
      window.clearTimeout(trophyHintTimer);
      trophyHintTimer = 0;
    }
    if (trophyLanternHintTimer) {
      window.clearTimeout(trophyLanternHintTimer);
      trophyLanternHintTimer = 0;
    }
  }

  function renderShelf() {
    renderTrophyRoom();
  }

  function openSheet(title, html) {
    document.getElementById("sheet-title").textContent = title;
    document.getElementById("sheet-body").innerHTML = html;
    document.getElementById("sheet").classList.add("open");
  }

  function closeSheet() {
    document.getElementById("sheet").classList.remove("open");
  }

  function findWork(id) {
    return (week.work || []).find((w) => w.id === id);
  }

  function refreshBoard() {
    syncWeek();
    renderClassSwitcher();
    refreshCardsInPlace();
    hud();
  }

  function editForm(fields, saveId) {
    const rows = fields.map((f) => {
      if (f.type === "textarea") {
        return `<label class="edit-label">${Game.esc(f.label)}<textarea id="ef-${Game.esc(f.name)}" maxlength="${f.max || 280}">${Game.esc(f.value || "")}</textarea></label>`;
      }
      if (f.type === "checkbox") {
        return `<label class="check"><input id="ef-${Game.esc(f.name)}" type="checkbox"${f.value ? " checked" : ""}> ${Game.esc(f.label)}</label>`;
      }
      return `<label class="edit-label">${Game.esc(f.label)}<input id="ef-${Game.esc(f.name)}" type="${Game.esc(f.type || "text")}" value="${Game.esc(f.value || "")}" maxlength="${f.max || 120}"></label>`;
    }).join("");
    return `${rows}<button type="button" class="btn primary" id="${saveId}">Save</button>`;
  }

  function fieldValue(name, type) {
    const el = document.getElementById("ef-" + name);
    if (!el) return "";
    if (type === "checkbox") return el.checked;
    return (el.value || "").trim();
  }

  function splitToken(token) {
    const i = (token || "").indexOf(":");
    if (i < 0) return { kind: token || "", id: "" };
    return { kind: token.slice(0, i), id: token.slice(i + 1) };
  }

  function openEdit(token) {
    const { kind, id } = splitToken(token);
    if (kind === "event") {
      const e = (week.events || []).find((x) => x.id === id);
      if (!e) return;
      openSheet("Edit event", editForm([
        { name: "title", label: "Title", value: e.title || "" },
        { name: "start", label: "Start", value: Game.toLocalInput(e.start), type: "datetime-local" },
        { name: "end", label: "End", value: Game.toLocalInput(e.end), type: "datetime-local" },
        { name: "place", label: "Place", value: e.place || "" },
        { name: "note", label: "Note", value: e.note || "", type: "textarea" }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        family = Game.editWeekOverlay(family, "events", id, {
          title: fieldValue("title"),
          start: Game.fromLocalInput(fieldValue("start")),
          end: Game.fromLocalInput(fieldValue("end")) || undefined,
          place: fieldValue("place"),
          note: fieldValue("note")
        });
        closeSheet();
        Game.familySavedToast("Saved");
        refreshBoard();
      });
      return;
    }
    if (kind === "work") {
      const w = (week.work || []).find((x) => x.id === id);
      if (!w) return;
      openSheet("Edit work", editForm([
        { name: "title", label: "Title", value: w.title || "" },
        { name: "due", label: "Due", value: Game.toLocalInput(w.due), type: "datetime-local" },
        { name: "suggest", label: "Start this from", value: w.suggest_from || "", type: "date" },
        { name: "note", label: "Note", value: w.note || "", type: "textarea" }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        family = Game.editWeekOverlay(family, "work", id, {
          title: fieldValue("title"),
          due: Game.fromLocalInput(fieldValue("due")),
          suggest_from: Game.fromLocalInput(fieldValue("suggest"), true) || undefined,
          note: fieldValue("note")
        });
        closeSheet();
        Game.familySavedToast("Saved");
        refreshBoard();
      });
      return;
    }
    if (kind === "weeknote") {
      const n = (week.notes || []).find((x) => x.id === id);
      if (!n) return;
      openSheet("Edit note", editForm([
        { name: "title", label: "Title", value: n.title || "" },
        { name: "date", label: "Date", value: n.date || "", type: "date" },
        { name: "text", label: "Text", value: n.text || "", type: "textarea" }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        family = Game.editWeekOverlay(family, "notes", id, {
          title: fieldValue("title"),
          date: Game.fromLocalInput(fieldValue("date"), true),
          text: fieldValue("text")
        });
        closeSheet();
        Game.toast("Saved on this device. Export the family pack to share.");
        refreshBoard();
      });
      return;
    }
    if (kind === "note") {
      const n = (family.notes || []).find((x) => x.id === id);
      if (!n) return;
      openSheet(n.from === "bennett" ? "Edit question" : "Edit parent note", editForm([
        { name: "text", label: "Text", value: n.text || "", type: "textarea", max: 280 }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        const text = fieldValue("text");
        if (!text) {
          Game.toast("Write something first.");
          return;
        }
        family = Game.updateNote(family, id, { text });
        closeSheet();
        Game.familySavedToast("Saved");
        refreshBoard();
      });
      return;
    }
    if (kind === "prompt") {
      const p = ((family.reflections && family.reflections.pool) || []).find((x) => x.id === id);
      if (!p) return;
      openSheet("Edit check-in prompt", editForm([
        { name: "text", label: "Prompt", value: p.text || "", type: "textarea", max: 140 }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        const text = fieldValue("text");
        if (!text) {
          Game.toast("Write a prompt first.");
          return;
        }
        family = Game.updatePrompt(family, id, { text });
        closeSheet();
        Game.toast("Saved on this device.");
        refreshBoard();
      });
      return;
    }
    if (kind === "answer") {
      const a = ((family.reflections && family.reflections.answers) || []).find((x) => x.id === id);
      if (!a) return;
      openSheet("Edit check-in", editForm([
        { name: "text", label: "Answer", value: a.text || "", type: "textarea", max: 280 }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        const text = fieldValue("text");
        if (!text) {
          Game.toast("Write a sentence or two first.");
          return;
        }
        family = Game.updateAnswer(family, id, { text });
        closeSheet();
        Game.toast("Saved on this device.");
        refreshBoard();
      });
      return;
    }
    if (kind === "trophy") {
      const ach = (pack.achievements || []).find((x) => x.id === id);
      if (!ach) return;
      openSheet("Edit trophy", editForm([
        { name: "title", label: "Title", value: ach.title || "" },
        { name: "description", label: "Description", value: ach.description || "", type: "textarea" },
        { name: "incentive", label: "Incentive", value: ach.incentive || "" }
      ], "edit-save"));
      document.getElementById("edit-save").addEventListener("click", () => {
        const title = fieldValue("title");
        if (!title) {
          Game.toast("Add a title first.");
          return;
        }
        const idx = pack.achievements.findIndex((x) => x.id === id);
        if (idx >= 0) {
          pack.achievements[idx] = Object.assign({}, pack.achievements[idx], {
            title,
            description: fieldValue("description"),
            incentive: fieldValue("incentive")
          });
          Game.saveMomDraft(pack);
        }
        closeSheet();
        Game.toast("Saved on this device. Export the family pack to share.");
        renderShelf();
      });
    }
  }

  function deleteEntry(token) {
    const { kind, id } = splitToken(token);
    const labels = {
      event: "calendar event",
      work: "work item",
      weeknote: "note",
      note: "note",
      prompt: "check-in prompt",
      answer: "check-in"
    };
    if (!Game.confirmDelete(labels[kind] || "entry")) return;
    if (kind === "event") family = Game.deleteWeekOverlay(family, "events", id);
    else if (kind === "work") family = Game.deleteWeekOverlay(family, "work", id);
    else if (kind === "weeknote") family = Game.deleteWeekOverlay(family, "notes", id);
    else if (kind === "note") family = Game.deleteNote(family, id);
    else if (kind === "prompt") family = Game.deletePrompt(family, id);
    else if (kind === "answer") family = Game.deleteAnswer(family, id);
    else return;
    if (kind === "work" || kind === "note" || kind === "weeknote") Game.familyDeletedToast();
    else Game.toast("Deleted on this device. Export the family pack to share.");
    refreshBoard();
  }

  function classSelectHtml(selected) {
    const classes = standingClasses();
    const opts = [`<option value="">Class</option>`].concat(classes.map((cls) => {
      const on = cls.id === selected ? " selected" : "";
      return `<option value="${Game.esc(cls.id)}"${on}>${Game.esc(Game.classPeriodLine(cls))}</option>`;
    }));
    return `<label class="edit-label">Class<select id="ef-classId">${opts.join("")}</select></label>`;
  }

  function workClassId(work) {
    return Game.classIdForWork(work) || "";
  }

  function openAddWork(day) {
    const dueDefault = day ? day + "T23:59" : "";
    const today = ymd(todayInChicago());
    openSheet("Add assignment", `
      ${editForm([
        { name: "title", label: "Title", value: "" },
        { name: "due", label: "Due", value: dueDefault, type: "datetime-local" },
        { name: "suggest", label: "Start this from (optional)", value: "", type: "date" },
        { name: "note", label: "Note (optional)", value: "", type: "textarea" }
      ], "add-work-save").replace('<button type="button" class="btn primary" id="add-work-save">Save</button>', classSelectHtml(selectedClassId) + '<button type="button" class="btn primary" id="add-work-save">Add</button>')}
    `);
    const dueEl = document.getElementById("ef-due");
    const suggestEl = document.getElementById("ef-suggest");
    const fillSuggest = () => {
      if (!dueEl || !suggestEl || suggestEl.value) return;
      const due = Game.fromLocalInput(dueEl.value);
      if (!due) return;
      const dueDay = parseLocal(String(due).slice(0, 10) + "T00:00:00");
      const start = todayInChicago();
      if (dueDay && (dueDay.getTime() - start.getTime()) / 86400000 > 7 && !suggestEl.value) {
        suggestEl.value = today;
      }
    };
    if (dueEl) dueEl.addEventListener("change", fillSuggest);
    fillSuggest();
    document.getElementById("add-work-save").addEventListener("click", () => {
      const title = fieldValue("title");
      if (!title) {
        Game.toast("Add a title first.");
        return;
      }
      const due = Game.fromLocalInput(fieldValue("due"));
      if (!due) {
        Game.toast("Pick a due date.");
        return;
      }
      const result = Game.addAssignment(family, seed || baseSeed, {
        title,
        classId: fieldValue("classId"),
        due,
        suggest_from: Game.fromLocalInput(fieldValue("suggest"), true) || undefined,
        note: fieldValue("note"),
        addedBy: Game.siteViewHidesAdult() ? "bennett" : (Game.siteView() === "mom" ? "parent" : "bennett")
      });
      family = result.family;
      closeSheet();
      Game.familySavedToast("Added");
      refreshBoard();
      const days = daysFromToday();
      const added = (week.work || []).find((w) => w.id === result.id);
      if (added && Game.workIsLater(added, days)) {
        const later = document.getElementById("later-board");
        if (later) {
          const top = later.getBoundingClientRect().top + pageScrollY() - 16;
          if (window.scrollTo) window.scrollTo(0, Math.max(0, top));
        }
      }
    });
    document.getElementById("ef-title").focus();
  }

  function openItemNote(token) {
    const [targetType, targetId] = (token || "").split(":");
    const work = (week.work || []).find((w) => w.id === targetId);
    const classId = workClassId(work) || Game.classIdForTitle(work && work.title);
    const termId = (work && work.termId) || Game.termOf(seed || baseSeed).id;
    openSheet("Add a note", `
      <p class="empty">A reminder or fact on this item — not a question for parents.</p>
      <textarea id="note-text" maxlength="280" placeholder="What should stay on this assignment?"></textarea>
      <button type="button" class="btn primary" id="note-send">Save note</button>
    `);
    document.getElementById("note-send").addEventListener("click", () => {
      const text = (document.getElementById("note-text").value || "").trim();
      if (!text) {
        Game.toast("Write a note first.");
        return;
      }
      family = Game.addNote(family, {
        id: Game.uid("n"),
        targetType,
        targetId,
        from: "bennett",
        kind: "note",
        text,
        at: Game.nowIso(),
        classId: classId || undefined,
        termId
      });
      closeSheet();
      Game.familySavedToast("Saved");
      refreshCardsInPlace();
      hud();
    });
    document.getElementById("note-text").focus();
  }

  function openAsk(token) {
    const [targetType, targetId] = (token || "").split(":");
    const work = (week.work || []).find((w) => w.id === targetId) || (week.events || []).find((e) => e.id === targetId);
    const classId = workClassId(work) || Game.classIdForTitle(work && work.title);
    const termId = (work && work.termId) || Game.termOf(seed || baseSeed).id;
    openSheet("Ask a parent", `
      <p class="empty">One question about this item. It lands in Messages — Mom and Dad see it when Connect is on.</p>
      <textarea id="ask-text" maxlength="280" placeholder="What do you need to know?"></textarea>
      <button type="button" class="btn primary" id="ask-send">Send</button>
    `);
    document.getElementById("ask-send").addEventListener("click", () => {
      const text = (document.getElementById("ask-text").value || "").trim();
      if (!text) {
        Game.toast("Type a question first.");
        return;
      }
      family = Game.addNote(family, {
        id: Game.uid("q"),
        targetType,
        targetId,
        from: "bennett",
        kind: "question",
        text,
        at: Game.nowIso(),
        classId: classId || undefined,
        termId
      });
      closeSheet();
      Game.toast("Sent to Messages.");
      refreshCardsInPlace();
      hud();
    });
    document.getElementById("ask-text").focus();
  }

  function looksLikeWriting(work) {
    const blob = String((work && work.title) || "") + " " + String((work && work.note) || "");
    return /essay|paragraph|draft|write|paper|proof|story|comic/i.test(blob);
  }

  function helpAskHref(work) {
    const title = (work && work.title) || "";
    const classId = Game.classIdForWork(work);
    let href = "basecamp.html?title=" + encodeURIComponent(title);
    if (classId) href += "&class=" + encodeURIComponent(classId);
    return href;
  }

  function helpTitle(work) {
    return (work && work.title) || "This assignment";
  }

  function helpThreadMessages(work) {
    const title = helpTitle(work);
    return ((Game.getAskThread().messages) || []).filter((m) => m && m.title === title);
  }

  function cardHasAskThread(work) {
    return helpThreadMessages(work).some((m) => m.role === "mentor");
  }

  function helpResumeData(work) {
    const title = helpTitle(work);
    const msgs = helpThreadMessages(work);
    const live = msgs.some((m) => m.role === "mentor" && !m.test);
    const fallback = Tutor.testHelp({ mode: "nudge", title, note: (work && work.note) || "" });
    const first = msgs.find((m) => m.role === "mentor");
    return Object.assign({}, fallback, { live, start: (first && first.text) || fallback.start });
  }

  function rememberMentorLine(work, text, live) {
    const line = String(text || "").trim();
    if (!line || cardHasAskThread(work)) return;
    Game.addAskMessage(Game.getAskThread(), {
      role: "mentor",
      text: line,
      title: helpTitle(work),
      test: !live
    });
  }

  function rememberDraftExchange(work, draft, data) {
    const title = helpTitle(work);
    const draftText = String(draft || "").trim();
    let thread = Game.getAskThread();
    if (draftText) {
      thread = Game.addAskMessage(thread, { role: "bennett", text: draftText, title });
    }
    const feedback = ((data && data.feedback) || []).filter(Boolean).join("\n\n")
      || "Read it out loud. Fix one thing you would not say.";
    Game.addAskMessage(thread, {
      role: "mentor",
      text: feedback,
      title,
      test: !(data && data.live)
    });
  }

  const HELP_THINK_MS = 700;
  const HELP_THINK_LINES = [
    "Ace is bouncing the ball…",
    "Riff is counting the beat…",
    "The crew is huddling up…",
    "Fuzz is sniffing this one out…"
  ];

  function helpThinkLine() {
    return HELP_THINK_LINES[Math.floor(Math.random() * HELP_THINK_LINES.length)];
  }

  function helpThinkingHtml(status, line) {
    return `
      <div class="help-thinking" role="status" aria-live="polite">
        <p class="help-thinking-status">${Game.esc(status)}</p>
        <div class="help-thinking-crew">
          <span class="help-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <p class="help-thinking-line">${Game.esc(line || helpThinkLine())}</p>
        </div>
      </div>`;
  }

  function helpBubbleHtml(m) {
    return `
      <article class="ask-bubble ${m.role === "mentor" ? "mentor" : "kid"}">
        <p class="ask-who">${m.role === "mentor" ? (m.test ? '<span class="test-tag">TEST</span> Mentor' : "Mentor") : "You"}</p>
        <p>${Game.esc(m.text)}</p>
      </article>`;
  }

  function helpLogHtml(messages, start, live) {
    if (messages && messages.length) return messages.map(helpBubbleHtml).join("");
    return helpBubbleHtml({ role: "mentor", text: start, test: !live });
  }

  function helpComposerHtml() {
    return `
      <form class="ask-form help-composer" id="help-ask-form">
        <label class="sr-only" for="ask-input">Answer the mentor</label>
        <textarea id="ask-input" maxlength="400" rows="3" placeholder="Answer the mentor…"></textarea>
        <button type="submit" class="btn primary" id="help-send">Send</button>
      </form>`;
  }

  function helpThinkingBubbleHtml() {
    return `
      <article class="ask-bubble mentor thinking" id="help-ask-thinking" role="status">
        <p class="ask-who">Mentor</p>
        <p class="ask-thinking-row">
          <span class="help-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>Thinking…</span>
        </p>
      </article>`;
  }

  function setHelpBusy(workId, busy) {
    document.querySelectorAll("[data-help]").forEach((btn) => {
      if (!workId || btn.dataset.help === String(workId)) btn.disabled = !!busy;
    });
    ["proof-go", "help-draft", "help-back", "help-send"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = !!busy;
    });
    const input = document.getElementById("ask-input");
    if (input) input.disabled = !!busy;
  }

  function paintHelpThinking(status, line) {
    const body = document.getElementById("sheet-body");
    if (body) body.innerHTML = helpThinkingHtml(status, line);
  }

  function bindHelpActions(work, mode) {
    const back = document.getElementById("help-back");
    if (back) back.addEventListener("click", () => loadHelp(work, "nudge"));
    const draftBtn = document.getElementById("help-draft");
    if (draftBtn) {
      draftBtn.addEventListener("click", () => loadHelp(work, "proofread", ""));
    }
    const proof = document.getElementById("proof-go");
    if (proof) {
      proof.addEventListener("click", async () => {
        const box = document.getElementById("proof-draft");
        await loadHelp(work, "proofread", box ? box.value : "");
      });
    }
    const form = document.getElementById("help-ask-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        sendHelpAsk(work, mode);
      });
    }
    const input = document.getElementById("ask-input");
    if (input && !input.disabled) input.focus();
  }

  function renderHelpBody(work, data, mode, draft) {
    const title = helpTitle(work);
    const start = data.start || ((data.cards || [])[2] && data.cards[2].back) || "Do one small first step tonight.";
    const classId = Game.classIdForWork(work);
    const khan = Game.khanStripHtml(work.title || "", classId ? { classId } : undefined);
    const askHref = helpAskHref(work);
    const banner = data.live
      ? ""
      : `<p class="help-banner">Couldn’t reach the mentor — here’s an offline hint</p>`;
    const feedback = (data && data.feedback) || [];
    const showDraftForm = mode === "proofread" && !feedback.length;
    const messages = helpThreadMessages(work);
    let main = "";
    if (showDraftForm) {
      main = `
        <section class="help-block">
          <h3>Check a draft</h3>
          <p class="help-hint">A nudge, not a rewrite.</p>
          <textarea class="proof-box" id="proof-draft" maxlength="2000" placeholder="Paste what you have.">${Game.esc(draft || "")}</textarea>
          <button type="button" class="btn primary" id="proof-go">Look at this</button>
          <div id="proof-out"></div>
        </section>
        <button type="button" class="mini" id="help-back">Back to the first move</button>`;
    } else {
      const deal = `
        <section class="help-block">
          <h3>Here's the deal</h3>
          <p>${Game.esc(data.explain || "Read the title and do one small start.")}</p>
        </section>`;
      main = `
        ${mode === "proofread" ? "" : deal}
        <section class="help-block help-start">
          <h3>Start here</h3>
          <div class="ask-log" id="help-ask-log">${helpLogHtml(messages, start, data.live)}</div>
        </section>
        ${helpComposerHtml()}
        ${mode === "proofread" ? `<button type="button" class="mini" id="help-back">Back to the first move</button>` : ""}`;
    }
    const extras = showDraftForm
      ? ""
      : `
        <div class="help-next">
          ${looksLikeWriting(work) && mode !== "proofread" ? `<button type="button" class="btn" id="help-draft">Check a draft</button>` : ""}
          <a class="btn" href="${Game.esc(askHref)}">Talk it through</a>
        </div>`;
    document.getElementById("sheet-body").innerHTML = `
      <div class="help-nudge">
        <p class="help-work">${Game.esc(title)}</p>
        ${canvasFactsHtml(work)}
        ${banner}
        ${main}
        ${extras}
        ${khan}
      </div>`;
    bindHelpActions(work, mode || "nudge");
  }

  async function sendHelpAsk(work) {
    const input = document.getElementById("ask-input");
    const sendBtn = document.getElementById("help-send");
    const text = ((input && input.value) || "").trim();
    if (!text) {
      Game.toast("Type a question first.");
      return;
    }
    const title = helpTitle(work);
    let thread = Game.addAskMessage(Game.getAskThread(), { role: "bennett", text, title });
    family = Game.promoteHelpAskToInbox(family, work, text);
    const board = Game.flushFamilyNotes ? Game.flushFamilyNotes(family) : Promise.resolve(family);
    if (typeof Game.track === "function") {
      Game.track("ask_ai", { classId: Game.classIdForWork(work), message: title });
    }
    if (input) input.value = "";
    const log = document.getElementById("help-ask-log");
    if (log) {
      log.insertAdjacentHTML("beforeend", helpBubbleHtml({ role: "bennett", text, title }));
      log.insertAdjacentHTML("beforeend", helpThinkingBubbleHtml());
      log.scrollTop = log.scrollHeight;
    } else {
      paintHelpThinking("Mentor is thinking…", helpThinkLine());
    }
    if (sendBtn) sendBtn.disabled = true;
    setHelpBusy(work && work.id, true);
    const started = Date.now();
    const data = await Tutor.ask({
      title,
      messages: thread.messages
    });
    try { await board; } catch (_) {}
    const wait = HELP_THINK_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
    Game.addAskMessage(thread, {
      role: "mentor",
      text: data.reply || "What's the smallest first move?",
      title,
      test: !data.live
    });
    renderHelpBody(work, Object.assign(helpResumeData(work), { live: !!data.live }), "nudge", "");
    setHelpBusy(work && work.id, false);
  }

  async function loadHelp(work, mode, draft) {
    const nextMode = mode || "nudge";
    const draftText = String(draft || "");
    if (nextMode !== "proofread" && cardHasAskThread(work)) {
      renderHelpBody(work, helpResumeData(work), "nudge", "");
      setHelpBusy(work && work.id, false);
      return;
    }
    if (nextMode === "proofread" && !draftText.trim()) {
      renderHelpBody(work, { live: true, feedback: [] }, "proofread", "");
      setHelpBusy(work && work.id, false);
      return;
    }
    const started = Date.now();
    const line = helpThinkLine();
    setHelpBusy(work && work.id, true);
    paintHelpThinking("Looking at the assignment…", line);
    const statusTimer = window.setTimeout(() => {
      const status = document.querySelector(".help-thinking-status");
      if (!status) return;
      status.textContent = nextMode === "proofread" ? "Mentor is thinking…" : "Pulling a hint…";
    }, 280);
    let data;
    try {
      data = await Tutor.request({
        mode: nextMode,
        title: work.title,
        note: work.note || "",
        draft: draftText
      });
    } catch (_) {
      data = Object.assign(Tutor.testHelp({
        mode: nextMode,
        title: work.title,
        note: work.note || "",
        draft: draftText
      }), { fallback: true });
    }
    const wait = HELP_THINK_MS - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
    window.clearTimeout(statusTimer);
    if (nextMode === "proofread") rememberDraftExchange(work, draftText, data);
    else rememberMentorLine(work, data.start || ((data.cards || [])[2] && data.cards[2].back), data.live);
    renderHelpBody(work, data, nextMode, draftText);
    setHelpBusy(work && work.id, false);
  }

  function openHelp(workId) {
    const work = findWork(workId);
    if (!work) {
      setHelpBusy(workId, false);
      return;
    }
    Game.recordHelp(workId);
    if (cardHasAskThread(work)) {
      openSheet("A little help", "<div class=\"help-nudge\"></div>");
      renderHelpBody(work, helpResumeData(work), "nudge", "");
      return;
    }
    setHelpBusy(workId, true);
    openSheet("A little help", helpThinkingHtml("Looking at the assignment…", helpThinkLine()));
    loadHelp(work, "nudge");
  }

  function driftNotes() {
    if (Game.prefersReducedMotion()) return;
    const field = document.getElementById("notes");
    const glyphs = ["♪", "♫", "♩"];
    for (let i = 0; i < 5; i += 1) {
      const n = document.createElement("span");
      n.className = "note";
      n.textContent = glyphs[i % glyphs.length];
      n.style.left = (8 + i * 18) + "%";
      n.style.animationDuration = (12 + i * 1.4) + "s";
      n.style.animationDelay = (i * 1.6) + "s";
      field.appendChild(n);
    }
  }

  function bindEggs() {
    document.getElementById("banner-monkey").addEventListener("click", () => {
      const n = Game.bumpEggCount("banner-monkey");
      if (n >= 5 && Game.recordEgg("banner-monkey")) {
        runUnlocks();
      } else if (n < 5) {
        Game.toast("The band grins. " + (5 - n) + " more tap" + (5 - n === 1 ? "" : "s") + "…");
      }
    });

    document.getElementById("hidden-ball").addEventListener("click", () => {
      if (Game.recordEgg("hidden-ball")) {
        document.getElementById("hidden-ball").classList.add("found");
        Game.toast("A stray tennis ball!");
        hud();
      } else {
        Game.toast("That ball already bounced your way.");
      }
    });

    document.getElementById("clarinet").addEventListener("click", () => {
      Game.honk();
      Game.toast("HONK. The bass clarinet has opinions.");
      Game.recordEgg("clarinet-honk");
    });

    if (Game.getEggs()["hidden-ball"]) {
      document.getElementById("hidden-ball").classList.add("found");
    }
  }

  function bindShelf() {
    const shelf = document.getElementById("shelf");
    const stage = document.getElementById("trophy-stage");
    const door = document.getElementById("trophies");
    function syncTrophyHud(on) {
      if (Game.paintHudCurrent) Game.paintHudCurrent(on ? "trophy" : "week");
    }
    function clearTrophyRoomUrl() {
      try {
        if (!window.history || !history.replaceState) return;
        const url = new URL(location.href);
        let dirty = false;
        if (url.searchParams.get("room") === "1") {
          url.searchParams.delete("room");
          dirty = true;
        }
        if (url.hash === "#trophy" || url.hash === "#trophies") {
          url.hash = "";
          dirty = true;
        }
        if (dirty) history.replaceState({}, "", url.pathname + url.search + url.hash);
      } catch (_) {}
    }
    function closeShelf() {
      resetTrophyView();
      renderTrophyChrome();
      shelf.classList.remove("open");
      document.body.classList.remove("in-treehouse");
      clearTrophyRoomUrl();
      syncTrophyHud(false);
      if (door) door.focus();
    }
    function openShelf() {
      resetTrophyView();
      preloadTrophyStills();
      hud();
      renderShelf();
      document.body.classList.add("in-treehouse");
      shelf.classList.add("open");
      syncTrophyHud(true);
      applyTrophyLook();
      const leave = document.getElementById("trophy-leave");
      if (leave) leave.focus();
      revealLanternHint();
      trophyHintTimer = window.setTimeout(() => {
        const room = document.getElementById("trophy-room");
        if (!room || !shelf.classList.contains("open")) return;
        room.classList.add("is-settled");
        if (Game.prefersReducedMotion()) {
          room.classList.add("is-quiet");
          return;
        }
        window.setTimeout(() => {
          if (shelf.classList.contains("open")) room.classList.add("is-quiet");
        }, 2600);
      }, Game.prefersReducedMotion() ? 0 : 1200);
    }
    door.addEventListener("click", openShelf);
    document.addEventListener("bw-open-trophy-room", openShelf);
    document.addEventListener("bw-close-trophy-room", closeShelf);
    if ((Game.wantsTrophyRoom && Game.wantsTrophyRoom()) || location.hash === "#trophies" || /(?:^|[?&])room=1(?:&|$)/.test(location.search || "")) {
      openShelf();
    }
    document.getElementById("trophy-leave").addEventListener("click", (e) => {
      e.stopPropagation();
      if (trophyZone) leaveTrophyZone();
      else closeShelf();
    });
    const back = document.getElementById("trophy-back");
    if (back) {
      back.addEventListener("click", (e) => {
        e.stopPropagation();
        leaveTrophyZone();
      });
    }
    const walkup = document.getElementById("trophy-walkup");
    function walkUpFromControl(e) {
      const btn = e.target.closest("[data-zone]");
      if (!btn || !walkup || !walkup.contains(btn)) return;
      if (trophyDrag && trophyDrag.moved) return;
      e.preventDefault();
      e.stopPropagation();
      enterTrophyZone(btn.dataset.zone);
    }
    if (walkup) {
      walkup.addEventListener("pointerup", walkUpFromControl);
      walkup.addEventListener("click", walkUpFromControl);
    }
    stage.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".trophy-leave") || e.target.closest(".trophy-plaque") || e.target.closest(".trophy-walkup") || e.target.closest(".trophy-back-row") || e.target.closest(".trophy-lantern-hint") || e.target.closest(".trophy-portrait-rail")) {
        skipTrophyClick = false;
        return;
      }
      skipTrophyClick = false;
      trophyDrag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        panX: currentTrophyLook().panX,
        panY: currentTrophyLook().panY,
        moved: false,
        zoneAtStart: trophyZone
      };
    });
    const onStageMove = (e) => {
      if (!trophyDrag || trophyDrag.id !== e.pointerId) return;
      const dx = e.clientX - trophyDrag.x;
      const dy = e.clientY - trophyDrag.y;
      if (Math.hypot(dx, dy) < 12 && !trophyDrag.moved) return;
      trophyDrag.moved = true;
      skipTrophyClick = true;
      stage.classList.add("is-dragging");
      const look = currentTrophyLook();
      look.panX = trophyDrag.panX + dx;
      look.panY = trophyDrag.panY + dy;
      look.mouseX = 0;
      look.mouseY = 0;
      applyTrophyLook();
    };
    const endStageDrag = (e) => {
      if (!trophyDrag || (e && trophyDrag.id !== e.pointerId)) return;
      const drag = trophyDrag;
      trophyDrag = null;
      stage.classList.remove("is-dragging");
      if (drag.moved) return;
      const hit = e && e.target && e.target.closest ? e.target : null;
      if (hit && (hit.closest(".trophy-object") || hit.closest(".trophy-plaque") || hit.closest(".trophy-leave") || hit.closest(".trophy-walkup") || hit.closest(".trophy-back-row") || hit.closest(".trophy-portrait-rail"))) {
        return;
      }
      if (drag.zoneAtStart) {
        if (document.querySelector(".trophy-plaque")) {
          clearTrophyPlaques();
          return;
        }
        if (drag.zoneAtStart === "pedestal") playTableCue();
        return;
      }
      const zone = zoneFromStagePoint(e.clientX, e.clientY);
      if (zone) enterTrophyZone(zone);
    };
    window.addEventListener("pointermove", onStageMove);
    window.addEventListener("pointerup", endStageDrag);
    window.addEventListener("pointercancel", endStageDrag);
    window.addEventListener("resize", () => {
      if (shelf.classList.contains("open")) applyTrophyLook();
    });
    document.addEventListener("keydown", (e) => {
      if (!shelf.classList.contains("open") || typing()) return;
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (document.querySelector(".trophy-plaque")) clearTrophyPlaques();
      else if (trophyZone) leaveTrophyZone();
      else closeShelf();
    });
    document.getElementById("close-sheet").addEventListener("click", closeSheet);
    document.getElementById("sheet").addEventListener("click", (e) => {
      if (e.target.id === "sheet") closeSheet();
    });
  }

  async function boot() {
    Game.markOpened();
    baseWeek = Game.ensureWeekIds(await Game.loadWeek());
    pack = await Game.loadAchievements();
    roster = await Game.loadCharacters();
    family = await Game.loadFamily();
    const signin = Game.maybeAwardSignIn(pack, family);
    family = signin.family;
    if (signin.awarded && signin.achievement) {
      Game.celebrate(signin.achievement, pack);
    }
    library = await Game.loadLibrary();
    await Game.hydrateLibraryBlobs(library);
    if (Game.warmupLibraryAudio) Game.warmupLibraryAudio(library, family);
    baseSeed = await Game.loadProgress();
    syncWeek();
    family = Game.promoteAskThreadToInbox(family, week);
    initSelectedClass();
    renderClassSwitcher();
    if (Game.usingMomDraft() || Game.usingFamilyDraft()) {
      document.getElementById("draft-flag").hidden = false;
    }
    renderCards();
    bindTrack();
    bindEggs();
    bindShelf();
    driftNotes();
    hud();
    goTo(0, true);
    runUnlocks();
    if (roster && !Game.maybePlayUnlockCelebration(roster)) {
      Game.maybePlayContentCelebration(library);
    } else if (!roster) {
      Game.maybePlayContentCelebration(library);
    }
    document.addEventListener("bw-site-view", () => {
      if (!pack) return;
      const next = Game.maybeAwardSignIn(pack, family);
      family = next.family;
      if (next.awarded && next.achievement) Game.celebrate(next.achievement, pack);
      hud();
      refreshCardsInPlace();
      const shelf = document.getElementById("shelf");
      if (shelf && shelf.classList.contains("open")) renderShelf();
    });
    async function pullFamilyLive() {
      if (!family) return;
      try {
        const before = Game.familySnapshot ? Game.familySnapshot(family) : "";
        const beforeProgress = JSON.stringify(Game.getProgress ? Game.getProgress() : {});
        const synced = await Game.syncFamilyLive(family);
        family = synced.family;
        family = Game.promoteAskThreadToInbox(family, week);
        if (Game.flushFamilyNotes) family = await Game.flushFamilyNotes(family);
        paintBoardSync(synced);
        const after = Game.familySnapshot ? Game.familySnapshot(family) : "";
        const afterProgress = JSON.stringify(Game.getProgress ? Game.getProgress() : {});
        if (synced.changed || (before && after && before !== after) || beforeProgress !== afterProgress) {
          syncWeek();
          renderClassSwitcher();
          refreshCardsInPlace();
          hud();
        }
      } catch (_) {}
    }
    window.addEventListener("focus", () => { pullFamilyLive(); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") pullFamilyLive();
    });
    if (typeof setInterval === "function") {
      setInterval(() => {
        if (document.visibilityState && document.visibilityState !== "visible") return;
        pullFamilyLive();
      }, 25000);
    }
    pullFamilyLive();
  }

  boot();
})();
