(function () {
  const TZ = "America/Chicago";
  const DAY_COUNT = 7;
  let dayIndex = 0;
  let week = null;
  let pack = null;
  let family = null;
  let viewedEvents = {};
  let pickedTrophy = null;
  let trackBound = false;

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

  function workButtons(w) {
    const st = Game.workState(w.id);
    const stamp = st.startedAt ? `Started ${Game.fmtStamp(st.startedAt)}` : "";
    return `
      <div class="actions">
        <button type="button" class="act ${st.started ? "started" : ""}" data-act="started" data-id="${Game.esc(w.id)}">
          ${st.started ? "Started" : "I started this"}
        </button>
        <button type="button" class="act ${st.done ? "done-on" : ""}" data-act="done" data-id="${Game.esc(w.id)}">
          Done
        </button>
      </div>
      ${stamp ? `<p class="started-at">${Game.esc(stamp)}</p>` : ""}`;
  }

  function itemNotes(targetType, targetId) {
    const notes = Game.notesFor(family, targetType, targetId);
    const parent = notes.filter((n) => n.from === "parent");
    const kid = notes.filter((n) => n.from === "bennett");
    return `
      ${parent.map((n) => `
        <div class="bubble parent">${n.test ? '<span class="test-tag">TEST</span> ' : ""}Parent note: ${Game.esc(n.text)}</div>
      `).join("")}
      ${kid.map((n) => `
        <div class="bubble kid">${n.test ? '<span class="test-tag">TEST</span> ' : ""}You asked: ${Game.esc(n.text)}</div>
      `).join("")}`;
  }

  function itemTools(targetType, targetId, help) {
    return `
      <div class="item-tools">
        <button type="button" class="mini" data-ask="${targetType}:${Game.esc(targetId)}">Ask</button>
        ${help ? `<button type="button" class="mini" data-help="${Game.esc(targetId)}">A little help</button>` : ""}
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

  function answeredToday(prompt) {
    const key = ymd(todayInChicago());
    return ((family.reflections && family.reflections.answers) || []).some((a) => {
      return a.promptId === prompt.id && (a.at || "").slice(0, 10) === key;
    });
  }

  function reflectBlock(isToday) {
    if (!isToday) return "";
    const prompt = todaysPrompt();
    if (!prompt) return "";
    if (answeredToday(prompt)) {
      return `
        <section class="reflect span-all">
          <h3>Quick check-in</h3>
          <p class="empty">Thanks — sent to the parent desk.</p>
        </section>`;
    }
    return `
      <section class="reflect span-all">
        <h3>Quick check-in</h3>
        <p>${prompt.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(prompt.text)}</p>
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

  function renderShelf() {
    const grid = document.getElementById("trophy-grid");
    const cur = Game.currency(pack);
    const earned = orderedTrophies();
    if (!earned.length) {
      grid.innerHTML = `<p class="trophy-empty">No trophies yet — keep the streak going</p>`;
      return;
    }
    grid.innerHTML = earned.map((ach) => `
      <article class="trophy${pickedTrophy === ach.id ? " picked" : ""}" draggable="true" data-id="${Game.esc(ach.id)}">
        <img src="${Game.iconFor(ach.icon)}" alt="">
        <h3>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title)}</h3>
        <p class="how">${Game.esc(ach.description || ach.how || "")}</p>
        <p class="prize">${Game.esc(ach.incentive || "")}${ach.reward ? " · +" + ach.reward + " " + cur.name : ""}</p>
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
      el.addEventListener("click", () => {
        if (pickedTrophy && pickedTrophy !== el.dataset.id) {
          moveTrophy(pickedTrophy, el.dataset.id);
          pickedTrophy = null;
        } else {
          pickedTrophy = pickedTrophy === el.dataset.id ? null : el.dataset.id;
          renderShelf();
        }
      });
    });
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
      : `<p class="help-banner"><span class="test-tag">TEST</span> Offline help from the assignment title and note. Run serve.py with ANTHROPIC_API_KEY for live help.</p>`;
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
    document.getElementById("sheet-body").innerHTML = banner + tabs + main;
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
    function openShelf() {
      pickedTrophy = null;
      renderShelf();
      shelf.classList.add("open");
    }
    document.getElementById("trophies").addEventListener("click", openShelf);
    if (location.hash === "#trophies") openShelf();
    document.getElementById("close-shelf").addEventListener("click", () => shelf.classList.remove("open"));
    shelf.addEventListener("click", (e) => {
      if (e.target === shelf) shelf.classList.remove("open");
    });
    document.getElementById("close-sheet").addEventListener("click", closeSheet);
    document.getElementById("sheet").addEventListener("click", (e) => {
      if (e.target.id === "sheet") closeSheet();
    });
  }

  async function boot() {
    Game.markOpened();
    week = await Game.loadWeek();
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    if (Game.usingMomDraft()) {
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
  }

  boot();
})();
