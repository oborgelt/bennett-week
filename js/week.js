(function () {
  const TZ = "America/Chicago";

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

  let week = null;
  let pack = null;
  let viewedEvents = {};

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
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  function hud() {
    const cur = Game.currency(pack);
    const bananas = document.getElementById("bananas");
    bananas.textContent = `${cur.emoji} ${Game.getBananas()}`;
    const days = daysFromToday();
    const ids = weekWorkIds(days);
    const progress = Game.getProgress();
    const touched = ids.filter((id) => progress[id] && (progress[id].started || progress[id].done)).length;
    const fill = document.getElementById("rally-fill");
    const count = document.getElementById("rally-count");
    fill.style.width = (ids.length ? (touched / ids.length) * 100 : 0) + "%";
    count.textContent = `${touched}/${ids.length}`;
    const unlocked = Object.keys(Game.getUnlocks()).length;
    document.getElementById("trophy-count").textContent = unlocked;
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
    return `
      <div class="actions">
        <button type="button" class="act ${st.started ? "started" : ""}" data-act="started" data-id="${Game.esc(w.id)}">
          ${st.started ? "Started" : "I started this"}
        </button>
        <button type="button" class="act ${st.done ? "done-on" : ""}" data-act="done" data-id="${Game.esc(w.id)}">
          ${st.done ? "Done" : "Done"}
        </button>
      </div>`;
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

  function renderCards() {
    const days = daysFromToday();
    const track = document.getElementById("track");
    const dots = document.getElementById("dots");
    const keep = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
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
      card.dataset.events = events.map((e) => e.id).filter(Boolean).join(",");
      card.innerHTML = `
        <div class="card">
          <img class="card-deco" src="${decoFor(events)}" alt="">
          <div class="when">
            <h2>${i === 0 ? "Today" : dayLabel(d)}</h2>
            <div class="date">${dateLabel(d)}</div>
          </div>
          <div class="who ${who.cls}">${Game.esc(who.label)}</div>
          <section>
            <h3>On the calendar</h3>
            ${items(events, (e) => `
              <div class="item">
                <div class="title">${titleHtml(e.title)}</div>
                <div class="meta">${Game.esc(fmtRange(e.start, e.end))}${e.place ? " · " + Game.esc(e.place) : ""}${e.note ? " · " + Game.esc(e.note) : ""}</div>
              </div>`)}
          </section>
          <section>
            <h3>Due today</h3>
            ${items(due, (w) => `
              <div class="${itemClass(w.id)}">
                <div class="title"><span class="tag">Due</span> ${titleHtml(w.title)}</div>
                <div class="meta">${Game.esc(fmtTime(w.due))}${w.note ? " · " + Game.esc(w.note) : ""}</div>
                ${workButtons(w)}
              </div>`)}
          </section>
          <section class="start">
            <h3>Start this</h3>
            ${items(startThis, (w) => `
              <div class="${itemClass(w.id)}">
                <div class="title">${titleHtml(w.title)}</div>
                <div class="meta">Due ${dateLabel(parseLocal(w.due))} · ${Game.esc(w.note || "Get ahead")}</div>
                ${workButtons(w)}
              </div>`)}
          </section>
          ${notes.length ? `
          <section class="note">
            <h3>Note</h3>
            ${items(notes, (n) => `
              <div class="item">
                <div class="title">${titleHtml(n.title)}</div>
                <div class="meta">${Game.esc(n.text || "")}</div>
              </div>`)}
          </section>` : ""}
        </div>`;
      track.appendChild(card);

      const b = document.createElement("button");
      b.className = "dot" + (i === 0 ? " on" : "");
      b.type = "button";
      b.setAttribute("aria-label", dayLabel(d));
      b.addEventListener("click", () => track.scrollTo({ left: card.offsetLeft, behavior: "smooth" }));
      dots.appendChild(b);
    });

    track.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Game.touchWork(btn.dataset.id, btn.dataset.act);
        renderCards();
        bindTrack();
        runUnlocks();
      });
    });
    const stay = track.querySelectorAll(".day")[keep];
    if (stay) track.scrollLeft = stay.offsetLeft;
  }

  function bindTrack() {
    const track = document.getElementById("track");
    const prev = document.getElementById("prev");
    const next = document.getElementById("next");
    const dots = document.getElementById("dots");
    function index() {
      return Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    }
    function go(i) {
      const cards = track.querySelectorAll(".day");
      const t = cards[Math.max(0, Math.min(cards.length - 1, i))];
      if (t) track.scrollTo({ left: t.offsetLeft, behavior: "smooth" });
    }
    function bounce(i) {
      const card = track.querySelectorAll(".card")[i];
      if (!card || Game.prefersReducedMotion()) return;
      card.classList.remove("snap");
      void card.offsetWidth;
      card.classList.add("snap");
    }
    function markViewed(i) {
      const day = track.querySelectorAll(".day")[i];
      if (!day) return;
      (day.dataset.events || "").split(",").filter(Boolean).forEach((id) => {
        viewedEvents[id] = true;
      });
      runUnlocks();
    }
    function sync() {
      const i = index();
      dots.querySelectorAll(".dot").forEach((el, n) => el.classList.toggle("on", n === i));
      prev.disabled = i <= 0;
      next.disabled = i >= 6;
      markViewed(i);
    }
    prev.onclick = () => go(index() - 1);
    next.onclick = () => go(index() + 1);
    track.onscroll = () => requestAnimationFrame(sync);
    if (!track._snapBound) {
      track._snapBound = true;
      let last = 0;
      track.addEventListener("scroll", () => {
        clearTimeout(track._snapT);
        track._snapT = setTimeout(() => bounce(index()), 90);
        last = index();
      }, { passive: true });
      void last;
    }
    sync();
  }

  function renderShelf() {
    const grid = document.getElementById("trophy-grid");
    const cur = Game.currency(pack);
    grid.innerHTML = (pack.achievements || []).map((ach) => {
      const unlocked = Game.alreadyUnlocked(ach.id);
      const hidden = ach.secret && !unlocked;
      const title = hidden ? "???" : ach.title;
      const how = hidden ? "A wholesome secret. Keep tapping around." : ach.how;
      const prize = unlocked ? (ach.incentive || "") : (hidden ? "" : "Incentive waits until you unlock it.");
      return `
        <article class="trophy ${unlocked ? "unlocked" : "locked"}">
          <img src="${Game.iconFor(ach.icon)}" alt="">
          <h3>${ach.test && !hidden ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(title)}</h3>
          <p class="how">${Game.esc(how || "")}</p>
          <p class="prize">${Game.esc(prize)}${unlocked && ach.reward ? " · +" + ach.reward + " " + cur.name : ""}</p>
        </article>`;
    }).join("");
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
    const banner = document.getElementById("banner-monkey");
    banner.addEventListener("click", () => {
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
    document.getElementById("trophies").addEventListener("click", () => {
      renderShelf();
      shelf.classList.add("open");
    });
    document.getElementById("close-shelf").addEventListener("click", () => shelf.classList.remove("open"));
    shelf.addEventListener("click", (e) => {
      if (e.target === shelf) shelf.classList.remove("open");
    });
  }

  async function boot() {
    Game.markOpened();
    week = await Game.loadWeek();
    pack = await Game.loadAchievements();
    if (Game.usingMomDraft()) {
      document.getElementById("draft-flag").hidden = false;
    }
    renderCards();
    bindTrack();
    bindEggs();
    bindShelf();
    driftNotes();
    hud();
    runUnlocks();
  }

  boot();
})();
