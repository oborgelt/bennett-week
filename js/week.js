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
  let pickedTrophy = null;
  let trophyZone = "";
  let trophyManage = false;
  let trophyStillsReady = false;
  let trackBound = false;

  const TROPHY_ZONES = {
    pedestal: {
      id: "pedestal",
      label: "Pedestal",
      hint: "Newest unlock",
      still: "img/library/trophy-pedestal.jpg",
      origin: "50% 58%",
      hot: { l: "38%", t: "42%", w: "24%", h: "36%" }
    },
    window: {
      id: "window",
      label: "Window",
      hint: "Crew",
      still: "img/library/trophy-window.jpg",
      origin: "16% 46%",
      hot: { l: "2%", t: "28%", w: "22%", h: "48%" }
    },
    cubbies: {
      id: "cubbies",
      label: "Cubbies",
      hint: "Awards",
      still: "img/library/trophy-cubbies.jpg",
      origin: "24% 30%",
      hot: { l: "8%", t: "8%", w: "24%", h: "24%" }
    },
    pegboard: {
      id: "pegboard",
      label: "Pegboard",
      hint: "Tools",
      still: "img/library/trophy-pegboard.jpg",
      origin: "70% 48%",
      hot: { l: "62%", t: "22%", w: "20%", h: "50%" }
    },
    lockers: {
      id: "lockers",
      label: "Lockers",
      hint: "Gear",
      still: "img/library/trophy-lockers.jpg",
      origin: "88% 50%",
      hot: { l: "82%", t: "18%", w: "16%", h: "58%" }
    }
  };
  const TROPHY_ZONE_ORDER = ["window", "cubbies", "pedestal", "pegboard", "lockers"];
  const PEGBOARD_IDS = ["angle-finder", "field-kit", "daily-pick", "notebook-holding"];
  const LOCKER_IDS = ["unplugged-strap", "first-serve"];
  const WINDOW_SLOTS = {
    ace: { l: "7%", t: "10%", w: "16%", h: "30%" },
    riff: { l: "25%", t: "8%", w: "18%", h: "28%" },
    scorch: { l: "46%", t: "10%", w: "20%", h: "30%" },
    deuce: { l: "30%", t: "46%", w: "13%", h: "40%" },
    fuzz: { l: "54%", t: "50%", w: "16%", h: "30%" }
  };
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
    document.getElementById("bananas").textContent = `${cur.emoji} ${Game.getBananas()}`;
    const days = daysFromToday();
    const ids = weekWorkIds(days);
    const progress = Game.getProgress();
    const touched = ids.filter((id) => progress[id] && (progress[id].started || progress[id].startedAt || progress[id].done)).length;
    document.getElementById("rally-fill").style.width = (ids.length ? (touched / ids.length) * 100 : 0) + "%";
    document.getElementById("rally-count").textContent = `${touched}/${ids.length}`;
    document.getElementById("trophy-count").textContent = Object.keys(Game.getUnlocks()).length;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    Game.paintStoryChip(roster);
  }

  function runUnlocks(extra) {
    const fresh = Game.checkUnlocks(pack, {
      week,
      eggs: Game.getEggs(),
      viewedEvents,
      ...(extra || {})
    });
    fresh.forEach((ach) => Game.celebrate(ach, pack));
    hud();
    if (document.getElementById("shelf").classList.contains("open")) renderShelf();
  }

  function syncWeek() {
    week = Game.applyWeekOverlay(baseWeek, family);
    if (baseSeed) seed = Game.applyProgressOverlay(baseSeed, family);
    return week;
  }

  function standingClasses() {
    return ((seed && seed.classes) || []).filter((cls) => cls && cls.id);
  }

  function renderStandingClasses() {
    const host = document.getElementById("standing-class-list");
    if (!host) return;
    const classes = standingClasses();
    if (!classes.length) {
      host.innerHTML = `<p class="empty">No classes on the roster yet.</p>`;
      return;
    }
    host.innerHTML = classes.map((cls) => {
      const due = Game.classDueCount(cls, week);
      const status = Game.classDueLabel(due);
      const links = Game.khanLinksForClass(cls);
      const khan = Game.khanInlineHtml(links);
      const period = Game.classShowsPeriodChip(cls) ? String(cls.period || "").trim() : "";
      return `
        <article class="standing-class" data-class="${Game.esc(cls.id)}">
          ${period ? `<span class="standing-class-period">${Game.esc(period)}</span>` : ""}
          <button type="button" class="standing-class-name" data-open-class="${Game.esc(cls.id)}">${Game.esc(cls.name)}</button>
          ${cls.time ? `<span class="standing-class-time">${Game.esc(cls.time)}</span>` : ""}
          <span class="standing-class-status">${Game.esc(status)}</span>
          ${khan ? `<span class="standing-class-khan">${khan}</span>` : ""}
        </article>`;
    }).join("");
    host.querySelectorAll("[data-open-class]").forEach((btn) => {
      btn.addEventListener("click", () => openClassSheet(btn.dataset.openClass));
    });
  }

  function openClassSheet(id) {
    const cls = standingClasses().find((c) => c.id === id);
    if (!cls) return;
    const due = Game.classDueCount(cls, week);
    const khan = Game.khanStripHtmlForClass(cls);
    const askHref = `ask.html?class=${encodeURIComponent(cls.id)}&title=${encodeURIComponent(cls.name)}`;
    const progressHref = `progress.html?class=${encodeURIComponent(cls.id)}`;
    const meta = Game.classMetaLine(cls);
    openSheet(Game.classPeriodLine(cls), `
      <p class="standing-class-sheet-status">${Game.esc(Game.classDueLabel(due))}${meta ? " · " + Game.esc(meta) : ""}</p>
      ${khan || `<p class="empty">No Khan course for this class.</p>`}
      <p class="ask-help-link"><a href="${Game.esc(askHref)}">Ask AI — Socratic mentor</a></p>
      <p class="ask-help-link"><a href="${Game.esc(progressHref)}">See Progress for ${Game.esc(cls.name)}</a></p>
    `);
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
    const label = kid ? "You asked: " : "Parent note: ";
    return `
      <div class="bubble ${kid ? "kid" : "parent"}">
        ${n.test ? '<span class="test-tag">TEST</span> ' : ""}${label}${Game.esc(n.text)}
        <div class="entry-tools">${Game.entryButtons("note:" + n.id, "note:" + n.id)}</div>
      </div>`;
  }

  function itemNotes(targetType, targetId) {
    const notes = Game.notesFor(family, targetType, targetId);
    const parent = notes.filter((n) => n.from === "parent");
    const kid = notes.filter((n) => n.from === "bennett");
    return parent.map(noteBubble).join("") + kid.map(noteBubble).join("");
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
      return `<button type="button" class="mini" data-play-lib="${Game.esc(item.id)}">Play sound</button>`;
    }
    return "";
  }

  function itemTools(targetType, targetId, help) {
    const kind = targetType === "event" ? "event" : "work";
    return `
      <div class="item-tools">
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
      const events = (week.events || []).filter((e) => sameDay(e.start, d));
      const due = (week.work || []).filter((w) => sameDay(w.due, d));
      const startThis = (week.work || []).filter((w) => {
        if (sameDay(w.due, d)) return false;
        const dueD = parseLocal(w.due);
        const from = w.suggest_from
          ? parseLocal(w.suggest_from + "T00:00:00")
          : new Date(dueD.getTime() - 3 * 86400000);
        return d >= from && d < new Date(dueD.getFullYear(), dueD.getMonth(), dueD.getDate());
      });
      const notes = (week.notes || []).filter((n) => n.date === ymd(d));
      const who = whoOn(week, d);

      const card = document.createElement("article");
      card.className = "day";
      card.dataset.dayIndex = String(i);
      card.dataset.events = events.map((e) => e.id).filter(Boolean).join(",");
      card.innerHTML = `
        <div class="card">
          <img class="card-deco" src="${decoFor(events)}" alt="">
          <div class="card-scroll">
            <div class="when">
              <h2>${i === 0 ? "Today" : dayLabel(d)}</h2>
              <div class="date">${dateLabel(d)}</div>
            </div>
            <div class="who ${who.cls}">${Game.esc(who.label)}</div>
            ${reflectBlock(i === 0)}
            <div class="card-grid">
              ${events.length ? `<section>
                <h3>On the calendar</h3>
                ${items(events, (e) => `
                  <div class="item">
                    <div class="title">${titleHtml(e.title)}</div>
                    <div class="meta">${Game.esc(fmtRange(e.start, e.end))}${e.place ? " · " + Game.esc(e.place) : ""}${e.note ? " · " + Game.esc(e.note) : ""}</div>
                    ${itemTools("event", e.id, false)}
                  </div>`)}
              </section>` : ""}
              ${due.length ? `<section>
                <h3>Due today</h3>
                ${items(due, (w) => `
                  <div class="${itemClass(w.id)}">
                    <div class="title"><span class="tag">Due</span> ${titleHtml(w.title)}</div>
                    <div class="meta">${Game.esc(fmtTime(w.due))}${w.note ? " · " + Game.esc(w.note) : ""}</div>
                    ${workButtons(w)}
                    ${itemTools("work", w.id, true)}
                  </div>`)}
              </section>` : ""}
              ${startThis.length ? `<section class="start span-all">
                <h3>Start this</h3>
                <div class="item-grid">
                ${items(startThis, (w) => `
                  <div class="${itemClass(w.id)}">
                    <div class="title">${titleHtml(w.title)}</div>
                    <div class="meta">Due ${dateLabel(parseLocal(w.due))} · ${Game.esc(w.note || "Get ahead")}</div>
                    ${workButtons(w)}
                    ${itemTools("work", w.id, true)}
                  </div>`)}
                </div>
              </section>` : ""}
              ${!events.length && !due.length && !startThis.length ? `<p class="empty">Open day — nothing on the board.</p>` : ""}
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
            </div>
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

    track.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Game.touchWork(btn.dataset.id, btn.dataset.act);
        if (btn.dataset.act === "start") {
          Game.playSoundCue(family, library, "work:" + btn.dataset.id);
        }
        renderCards();
        goTo(dayIndex, true);
        hud();
      });
    });
    track.querySelectorAll("[data-ask]").forEach((btn) => {
      btn.addEventListener("click", () => openAsk(btn.dataset.ask));
    });
    track.querySelectorAll("[data-help]").forEach((btn) => {
      btn.addEventListener("click", () => openHelp(btn.dataset.help));
    });
    track.querySelectorAll("[data-play-lib]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = Game.libraryItem(library, btn.dataset.playLib);
        if (item && Game.canPlayLibraryItem(item)) Game.playLibraryItem(item);
      });
    });
    track.querySelectorAll("[data-open-lib]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = Game.libraryItem(library, btn.dataset.openLib);
        const src = item && Game.librarySrc(item);
        if (src && src !== "#") window.open(src, "_blank", "noopener");
      });
    });
    track.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => openEdit(btn.dataset.edit));
    });
    track.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => deleteEntry(btn.dataset.del));
    });
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
        renderCards();
        goTo(dayIndex, true);
      });
    }
  }

  function clampDay(i) {
    return Math.max(0, Math.min(DAY_COUNT - 1, i));
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

  function persistTrophyOrder(ids) {
    Game.saveTrophyOrder(ids);
    renderShelf();
  }

  function moveTrophy(fromId, toId) {
    const ids = orderedTrophies().map((a) => a.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    persistTrophyOrder(ids);
  }

  function contentPlay(ach) {
    const unlock = Game.rewardUnlockOf(ach);
    if (!unlock || unlock.type !== "content") return "";
    const item = Game.libraryItem(library, unlock.id);
    if (!item || !Game.canPlayLibraryItem(item)) return "";
    return `<button type="button" class="tiny primary" data-play-content="${Game.esc(item.id)}">Play reward</button>`;
  }

  function trophyKind(ach) {
    const unlock = Game.rewardUnlockOf(ach);
    if (unlock && unlock.type === "character") return "character";
    if (unlock && unlock.type && unlock.type !== "content") return "gear";
    return "badge";
  }

  function trophyArt(ach) {
    const unlock = Game.rewardUnlockOf(ach);
    if (unlock && unlock.type === "character") {
      const ch = ((roster && roster.characters) || []).find((row) => row.id === unlock.id);
      if (ch && ch.poster) return ch.poster;
      return "img/characters/" + unlock.id + ".jpg";
    }
    if (unlock && unlock.type && unlock.type !== "content") {
      const item = Game.libraryItem(library, unlock.id) || Game.gearLibraryItem(library, unlock.id);
      const src = item ? (Game.librarySrc(item) || Game.libraryThumb(item)) : "";
      if (src) return src;
    }
    return Game.iconFor(ach.icon);
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
    if (!earned.length) return null;
    return [...earned].sort((a, b) => unlockAt(b.id) - unlockAt(a.id))[0];
  }

  function trophiesForZone(zoneId, earned) {
    if (zoneId === "pedestal") {
      const featured = featuredTrophy(earned);
      return featured ? [featured] : [];
    }
    return earned.filter((ach) => homeZoneOf(ach) === zoneId);
  }

  function slotBox(zoneId, ach, index) {
    const unlock = Game.rewardUnlockOf(ach);
    const id = unlock && unlock.id ? unlock.id : "";
    if (zoneId === "pedestal") return PEDESTAL_SLOT;
    if (zoneId === "window") return WINDOW_SLOTS[id] || CUBBY_SLOTS[index % CUBBY_SLOTS.length];
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

  function bindTrophyTools(root) {
    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEdit(btn.dataset.edit);
      });
    });
    root.querySelectorAll("[data-play-content]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = Game.libraryItem(library, btn.dataset.playContent);
        if (item && Game.canPlayLibraryItem(item)) Game.playLibraryItem(item);
      });
    });
    root.querySelectorAll("[data-undo-trophy]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const result = Game.revokeAchievement(pack, family, btn.dataset.undoTrophy);
        family = result.family;
        Game.toast("Award undone. That trophy is gone from the room.");
        hud();
        renderShelf();
      });
    });
  }

  function trophyTools(ach) {
    return `
      ${Game.gameHref(ach) ? `<a class="tiny primary" href="${Game.esc(Game.gameHref(ach))}">Play</a>` : ""}
      ${contentPlay(ach)}
      <button type="button" class="tiny" data-edit="trophy:${Game.esc(ach.id)}">Edit</button>
      <button type="button" class="tiny" data-undo-trophy="${Game.esc(ach.id)}">Undo award</button>`;
  }

  function renderTrophyManage() {
    const grid = document.getElementById("trophy-grid");
    if (!grid) return;
    const cur = Game.currency(pack);
    const earned = orderedTrophies();
    grid.classList.toggle("is-empty", !earned.length);
    if (!earned.length) {
      grid.innerHTML = `<p class="trophy-empty">No trophies yet — keep the streak going. <a class="crew-inline" href="characters.html">Characters stay locked until you earn them.</a></p>`;
      return;
    }
    grid.innerHTML = earned.map((ach) => `
      <article class="trophy trophy-${trophyKind(ach)}${pickedTrophy === ach.id ? " picked" : ""}" draggable="true" data-id="${Game.esc(ach.id)}">
        <img src="${Game.esc(trophyArt(ach))}" alt="">
        <h3>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title)}</h3>
        <p class="how">${Game.esc(ach.description || ach.how || "")}</p>
        <p class="prize">${Game.esc(ach.incentive || "")}${typeof ach.reward === "number" ? " · +" + ach.reward + " " + cur.name : ""}</p>
        <div class="trophy-tools">${trophyTools(ach)}</div>
      </article>`).join("");

    grid.querySelectorAll(".trophy").forEach((el) => {
      el.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", el.dataset.id);
        pickedTrophy = el.dataset.id;
      });
      el.addEventListener("dragover", (e) => e.preventDefault());
      el.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = e.dataTransfer.getData("text/plain") || pickedTrophy;
        moveTrophy(from, el.dataset.id);
        pickedTrophy = null;
      });
      el.addEventListener("click", (e) => {
        if (e.target.closest(".trophy-tools")) return;
        if (pickedTrophy && pickedTrophy !== el.dataset.id) {
          moveTrophy(pickedTrophy, el.dataset.id);
          pickedTrophy = null;
        } else {
          pickedTrophy = pickedTrophy === el.dataset.id ? null : el.dataset.id;
          renderShelf();
        }
      });
    });
    bindTrophyTools(grid);
  }

  function renderTrophyChrome() {
    const room = document.getElementById("trophy-room");
    const tag = document.getElementById("shelf-tag");
    const back = document.getElementById("shelf-back");
    const manageBtn = document.getElementById("shelf-manage");
    const manage = document.getElementById("trophy-manage");
    const close = document.getElementById("trophy-close");
    const zone = trophyZone ? TROPHY_ZONES[trophyZone] : null;
    if (room) {
      room.dataset.view = trophyZone || "wide";
      room.classList.toggle("is-zoomed", !!trophyZone);
      if (zone) room.style.setProperty("--zoom-origin", zone.origin);
    }
    if (back) back.hidden = !trophyZone;
    if (manage) manage.hidden = !trophyManage;
    if (manageBtn) manageBtn.setAttribute("aria-pressed", trophyManage ? "true" : "false");
    if (close) close.setAttribute("aria-hidden", trophyZone ? "false" : "true");
    if (tag) {
      if (trophyManage) {
        tag.innerHTML = "Drag to rearrange. Edit or undo an award.";
      } else if (zone) {
        tag.innerHTML = `${Game.esc(zone.label)} · ${Game.esc(zone.hint)}. Tap the room to step back.`;
      } else {
        tag.innerHTML = `Tap a wall to walk up. Only trophies you have earned. <a class="crew-inline" href="characters.html">Meet your teammates →</a>`;
      }
    }
  }

  function renderTrophyHotspots(earned) {
    const host = document.getElementById("trophy-hotspots");
    const rail = document.getElementById("trophy-rail");
    if (!host || !rail) return;
    host.innerHTML = TROPHY_ZONE_ORDER.map((id) => {
      const zone = TROPHY_ZONES[id];
      const loot = trophiesForZone(id, earned).length > 0;
      return `<button type="button" class="trophy-hotspot${loot ? " has-loot" : ""}" data-zone="${id}" style="${boxStyle(zone.hot)}" aria-label="${Game.esc(zone.label)} — ${Game.esc(zone.hint)}"></button>`;
    }).join("");
    rail.innerHTML = TROPHY_ZONE_ORDER.map((id) => {
      const zone = TROPHY_ZONES[id];
      const loot = trophiesForZone(id, earned).length > 0;
      const on = trophyZone === id;
      return `<button type="button" class="${on ? "is-on" : ""}${loot ? " has-loot" : ""}" data-zone="${id}">${Game.esc(zone.label)}</button>`;
    }).join("");
    const go = (e) => {
      const btn = e.target.closest("[data-zone]");
      if (btn) enterTrophyZone(btn.dataset.zone);
    };
    host.onclick = go;
    rail.onclick = go;
  }

  function renderTrophySlots(earned) {
    const slots = document.getElementById("trophy-slots");
    const still = document.getElementById("trophy-close-still");
    const wash = document.getElementById("trophy-close-wash");
    if (!slots || !still) return;
    const zone = trophyZone ? TROPHY_ZONES[trophyZone] : null;
    if (!zone) {
      slots.innerHTML = "";
      return;
    }
    still.src = zone.still;
    still.alt = zone.label;
    if (wash) wash.style.setProperty("--close-still", `url("${zone.still}")`);
    const items = trophiesForZone(trophyZone, earned);
    slots.innerHTML = items.map((ach, i) => {
      const box = slotBox(trophyZone, ach, i);
      const kind = trophyKind(ach);
      const extra = trophyZone === "pedestal" ? " trophy-pedestal" : "";
      return `<article class="trophy-object trophy-${kind}${extra}" data-id="${Game.esc(ach.id)}" style="${boxStyle(box)}">
        <img src="${Game.esc(trophyArt(ach))}" alt="">
        <span class="trophy-name">${Game.esc(ach.title)}</span>
      </article>`;
    }).join("");
    slots.querySelectorAll(".trophy-object").forEach((el) => {
      let hold = 0;
      const openTools = (e) => {
        e.preventDefault();
        e.stopPropagation();
        slots.querySelectorAll(".trophy-pop").forEach((p) => p.remove());
        const ach = earned.find((row) => row.id === el.dataset.id);
        if (!ach) return;
        const pop = document.createElement("div");
        pop.className = "trophy-pop";
        pop.innerHTML = trophyTools(ach);
        el.appendChild(pop);
        el.classList.add("is-open");
        bindTrophyTools(pop);
      };
      el.addEventListener("click", (e) => {
        if (e.target.closest(".trophy-pop")) return;
        const open = el.classList.contains("is-open");
        slots.querySelectorAll(".trophy-object").forEach((other) => {
          other.classList.remove("is-open");
          const pop = other.querySelector(".trophy-pop");
          if (pop) pop.remove();
        });
        if (!open) el.classList.add("is-open");
      });
      el.addEventListener("pointerdown", () => {
        hold = window.setTimeout(() => openTools({ preventDefault() {}, stopPropagation() {} }), 480);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((name) => {
        el.addEventListener(name, () => window.clearTimeout(hold));
      });
      el.addEventListener("contextmenu", openTools);
    });
  }

  function renderTrophyRoom() {
    const earned = orderedTrophies();
    const empty = document.getElementById("trophy-empty");
    if (empty) {
      const show = !earned.length && !trophyZone;
      empty.hidden = !show;
      if (show) {
        empty.innerHTML = `No trophies yet — keep the streak going. <a class="crew-inline" href="characters.html">Characters stay locked until you earn them.</a>`;
      }
    }
    renderTrophyChrome();
    renderTrophyHotspots(earned);
    renderTrophySlots(earned);
  }

  function enterTrophyZone(id) {
    if (!TROPHY_ZONES[id] || trophyZone === id) return;
    trophyZone = id;
    trophyManage = false;
    renderTrophyRoom();
  }

  function leaveTrophyZone() {
    if (!trophyZone) return;
    trophyZone = "";
    renderTrophyRoom();
  }

  function setTrophyManage(on) {
    trophyManage = !!on;
    if (trophyManage) pickedTrophy = null;
    renderShelf();
  }

  function resetTrophyView() {
    trophyZone = "";
    trophyManage = false;
    pickedTrophy = null;
  }

  function renderShelf() {
    renderTrophyManage();
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
    renderStandingClasses();
    renderCards();
    goTo(dayIndex, true);
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
        Game.toast("Saved on this device. Export the family pack to share.");
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
        Game.toast("Saved on this device. Export the family pack to share.");
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
        Game.toast("Saved on this device.");
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
    Game.toast("Deleted on this device. Export the family pack to share.");
    refreshBoard();
  }

  function openAsk(token) {
    const [targetType, targetId] = (token || "").split(":");
    openSheet("Ask a parent", `
      <p class="empty">One question about this item. It lands on the parent desk — no chat thread.</p>
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
        at: Game.nowIso()
      });
      closeSheet();
      Game.toast("Sent to the parent desk.");
      renderCards();
      goTo(dayIndex, true);
    });
    document.getElementById("ask-text").focus();
  }

  function renderHelpBody(work, data, mode) {
    const banner = data.live
      ? `<p class="help-banner live">Live tutor help — a nudge, not a finished assignment.</p>`
      : `<p class="help-banner">Offline help from the assignment title and note. Run serve.py with ANTHROPIC_API_KEY for live help.</p>`;
    const tabs = `
      <div class="help-tabs">
        <button type="button" class="mini" data-mode="notecards">Notecards</button>
        <button type="button" class="mini" data-mode="explain">Explain</button>
        <button type="button" class="mini" data-mode="quiz">Quiz me</button>
        <button type="button" class="mini" data-mode="proofread">Proofread</button>
      </div>`;
    let main = "";
    if (mode === "explain") {
      main = `<div class="explain-block">${Game.esc(data.explain || "No explanation yet.")}</div>`;
    } else if (mode === "quiz") {
      main = (data.quiz || []).map((q, i) => `
        <div class="quiz-item">
          <p><strong>${i + 1}.</strong> ${Game.esc(q.q)}</p>
          <button type="button" class="mini" data-reveal="${i}">Show a hint</button>
          <p class="empty" hidden data-ans="${i}">${Game.esc(q.a)}</p>
        </div>`).join("") || `<p class="empty">No quiz yet.</p>`;
    } else if (mode === "proofread") {
      main = `
        <textarea class="proof-box" id="proof-draft" maxlength="2000" placeholder="Paste a draft. The tutor will nudge, not rewrite."></textarea>
        <button type="button" class="btn primary" id="proof-go">Proofread</button>
        <div id="proof-out">${(data.feedback || []).map((f) => `<div class="quiz-item">${Game.esc(f)}</div>`).join("")}</div>`;
    } else {
      main = `<div class="flip-row">${(data.cards || []).map((c, i) => `
        <button type="button" class="flip" data-flip="${i}" aria-label="Flip notecard">
          <span class="flip-inner">
            <span class="flip-face front">${Game.esc(c.front)}</span>
            <span class="flip-face back">${Game.esc(c.back)}</span>
          </span>
        </button>`).join("")}</div>`;
    }
    const khan = Game.khanStripHtml(work.title || "");
    const askLink = `<p class="ask-help-link"><a href="ask.html?title=${encodeURIComponent(work.title || "")}">Ask AI — Socratic mentor</a></p>`;
    document.getElementById("sheet-body").innerHTML = banner + tabs + main + askLink + khan;
    document.getElementById("sheet-body").querySelectorAll("[data-mode]").forEach((b) => {
      b.addEventListener("click", () => loadHelp(work, b.dataset.mode));
    });
    document.getElementById("sheet-body").querySelectorAll("[data-flip]").forEach((b) => {
      b.addEventListener("click", () => b.classList.toggle("on"));
    });
    document.getElementById("sheet-body").querySelectorAll("[data-reveal]").forEach((b) => {
      b.addEventListener("click", () => {
        const ans = document.getElementById("sheet-body").querySelector(`[data-ans="${b.dataset.reveal}"]`);
        if (ans) ans.hidden = !ans.hidden;
      });
    });
    const proof = document.getElementById("proof-go");
    if (proof) {
      proof.addEventListener("click", async () => {
        const draft = document.getElementById("proof-draft").value;
        await loadHelp(work, "proofread", draft);
      });
    }
  }

  async function loadHelp(work, mode, draft) {
    document.getElementById("sheet-body").innerHTML = `<p class="empty">Thinking…</p>`;
    const data = await Tutor.request({
      mode,
      title: work.title,
      note: work.note || "",
      draft: draft || ""
    });
    renderHelpBody(work, data, mode);
  }

  function openHelp(workId) {
    const work = findWork(workId);
    if (!work) return;
    Game.recordHelp(workId);
    openSheet("A little help", `<p class="empty">Thinking…</p>`);
    document.getElementById("sheet-title").textContent = "A little help";
    loadHelp(work, "notecards");
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
        Game.addBananas(2);
        document.getElementById("hidden-ball").classList.add("found");
        Game.toast("A stray tennis ball! +2 bananas");
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
    function closeShelf() {
      resetTrophyView();
      renderTrophyChrome();
      shelf.classList.remove("open");
    }
    function openShelf() {
      resetTrophyView();
      preloadTrophyStills();
      renderShelf();
      shelf.classList.add("open");
    }
    document.getElementById("trophies").addEventListener("click", openShelf);
    if (location.hash === "#trophies") openShelf();
    document.getElementById("close-shelf").addEventListener("click", closeShelf);
    document.getElementById("shelf-back").addEventListener("click", (e) => {
      e.stopPropagation();
      leaveTrophyZone();
    });
    document.getElementById("shelf-manage").addEventListener("click", (e) => {
      e.stopPropagation();
      setTrophyManage(!trophyManage);
    });
    shelf.addEventListener("click", (e) => {
      if (e.target === shelf) closeShelf();
    });
    stage.addEventListener("click", (e) => {
      if (!trophyZone || trophyManage) return;
      if (e.target.closest(".trophy-object") || e.target.closest(".trophy-hotspot") || e.target.closest(".trophy-rail")) return;
      leaveTrophyZone();
    });
    let swipe = null;
    stage.addEventListener("touchstart", (e) => {
      if (!trophyZone || trophyManage || !e.changedTouches[0]) return;
      swipe = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (!swipe || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - swipe.x;
      const dy = e.changedTouches[0].clientY - swipe.y;
      swipe = null;
      if (dy > 64 && Math.abs(dy) > Math.abs(dx)) leaveTrophyZone();
      else if (dx > 64 && Math.abs(dx) > Math.abs(dy)) leaveTrophyZone();
    }, { passive: true });
    document.addEventListener("keydown", (e) => {
      if (!shelf.classList.contains("open") || typing()) return;
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (trophyManage) setTrophyManage(false);
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
    const preview = Game.maybeAutoPreviewAll(pack, family);
    family = preview.family;
    if (preview.ran) {
      Game.toast("Parent preview: all rewards unlocked on this device.");
    }
    library = await Game.loadLibrary();
    await Game.hydrateLibraryBlobs(library);
    baseSeed = await Game.loadProgress();
    syncWeek();
    renderStandingClasses();
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
  }

  boot();
})();
