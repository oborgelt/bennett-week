(function () {
  const GROUPS = [
    { id: "ace", title: "Ace" },
    { id: "riff", title: "Riff" },
    { id: "scorch", title: "Scorch" },
    { id: "deuce", title: "Deuce" },
    { id: "fuzz", title: "Fuzz" },
    { id: "bennett", title: "Bennett" },
    { id: "crew", title: "Crew" },
    { id: "fun", title: "Fun / Sounds" }
  ];

  const GROUP_BLURB = {
    ace: "Locker clip and stills for this teammate.",
    riff: "Locker clip and stills for this teammate.",
    scorch: "Locker clip and stills for this teammate.",
    deuce: "Locker clip and stills for this teammate.",
    fuzz: "Locker clip and stills for this teammate.",
    bennett: "Locker clip and stills for Bennett — his own avatar, not another animal teammate.",
    crew: "Ace + Riff + Scorch together. Comic stills, the adventure clip, and the treehouse room.",
    fun: "Meme-style unlocks and sounds. Award a streak so Bennett can play them later.",
    gear: "Awardable tools, outfits, and abilities. Also live on each teammate shelf."
  };

  let pack = null;
  let family = null;
  let roster = null;
  let library = null;
  let week = { work: [], events: [] };
  let progressSeed = null;
  let termsCatalog = { current: "2025-26-s1", terms: [] };
  let usageEvents = [];
  let usageDevices = [];
  let drillClass = "";
  let drillAssignment = "";

  function persistLib() {
    Game.saveMomLibrary(library);
    renderLibrary();
    document.getElementById("draft-flag").hidden = false;
    Game.toast("Library saved on this device. Export the family pack to share.");
  }

  function persistFamily() {
    Game.saveFamily(family);
    renderIngredients();
    document.getElementById("draft-flag").hidden = !(Game.usingMomDraft() || Game.usingFamilyDraft() || Game.usingMomLibrary());
  }

  function openSheet(title, html) {
    document.getElementById("sheet-title").textContent = title;
    document.getElementById("sheet-body").innerHTML = html;
    document.getElementById("sheet").classList.add("open");
  }

  function closeSheet() {
    const sheet = document.getElementById("sheet");
    sheet.querySelectorAll("video, audio").forEach((media) => {
      try { media.pause(); } catch (_) {}
    });
    sheet.classList.remove("open");
  }

  function previewItem(item) {
    const src = Game.librarySrc(item);
    const where = item.synth
      ? "Generated beep (Web Audio) — no file in the repo"
      : item.device
        ? ("On this device" + (item.filename ? " · " + item.filename : ""))
        : (src || item.path || item.url || "No path or URL");
    openSheet(item.label || "Preview", `
      <p class="empty">${Game.esc(where)}</p>
      ${Game.libraryPlayerHtml(item)}
    `);
    const sheet = document.getElementById("sheet-body");
    sheet.querySelectorAll("[data-play-lib]").forEach((b) => {
      b.addEventListener("click", () => {
        Game.playLibraryItem(item);
      });
    });
  }

  function tagSelect(item) {
    return GROUPS.map((g) => {
      const on = item.character === g.id ? " selected" : "";
      return `<option value="${g.id}"${on}>${g.title}</option>`;
    }).join("");
  }

  function cardHtml(item) {
    const src = Game.librarySrc(item);
    const detail = item.synth
      ? "Generated beep"
      : item.device
        ? ("On this device" + (item.filename ? " · " + item.filename : ""))
        : (src || item.path || item.url || "—");
    const audio = item.kind === "audio" || !!item.synth;
    return `
      <article class="lib-card${audio ? " lib-card-play" : ""}" ${audio ? `data-play="${Game.esc(item.id)}"` : ""}>
        <div class="lib-media" aria-hidden="true">
          ${Game.libraryThumbHtml(item)}
          ${audio ? '<span class="lib-play-badge">Play</span>' : ""}
        </div>
        <h3>${item.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(item.label)}</h3>
        <p>${Game.esc(Game.libraryKindLabel(item))} · ${Game.esc(detail)}</p>
        <label>Tag
          <select data-tag="${Game.esc(item.id)}">${tagSelect(item)}</select>
        </label>
        <div class="parent-actions">
          ${audio ? "" : `<button type="button" class="tiny" data-preview="${Game.esc(item.id)}">Preview</button>`}
          <button type="button" class="tiny danger" data-del-lib="${Game.esc(item.id)}">Delete</button>
        </div>
      </article>`;
  }

  function foldState() {
    try {
      return JSON.parse(localStorage.getItem("bw-lib-fold") || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function saveFold(id, open) {
    const map = foldState();
    map[id] = !!open;
    localStorage.setItem("bw-lib-fold", JSON.stringify(map));
  }

  function groupOpen(id, count) {
    const map = foldState();
    if (Object.prototype.hasOwnProperty.call(map, id)) return !!map[id];
    if (id === "fun") return count <= 8;
    return true;
  }

  function bindLibraryClicks(host) {
    host.querySelectorAll("[data-preview]").forEach((b) => {
      b.addEventListener("click", () => {
        const item = Game.libraryItem(library, b.dataset.preview);
        if (item) previewItem(item);
      });
    });
    host.querySelectorAll("[data-play]").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest("select, label, .tiny, button")) return;
        const item = Game.libraryItem(library, card.dataset.play);
        if (item) Game.playLibraryItem(item);
      });
    });
    host.querySelectorAll("[data-tag]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const item = Game.libraryItem(library, sel.dataset.tag);
        if (!item) return;
        item.character = sel.value;
        persistLib();
      });
    });
    host.querySelectorAll("[data-del-lib]").forEach((b) => {
      b.addEventListener("click", async () => {
        if (!Game.confirmDelete("library item")) return;
        const id = b.dataset.delLib;
        library.items = library.items.filter((item) => item.id !== id);
        await Game.deleteLibraryBlob(id);
        persistLib();
      });
    });
  }

  function groupBlock(id, title, items, empty) {
    const open = groupOpen(id, items.length) ? " open" : "";
    const count = items.length === 1 ? "1 file" : items.length + " files";
    const body = items.length
      ? `<div class="lib-grid">${items.map(cardHtml).join("")}</div>`
      : `<p class="empty">${Game.esc(empty || ("No files tagged " + title + " yet."))}</p>`;
    return `
        <details class="lib-group" data-fold="${Game.esc(id)}"${open}>
          <summary>
            <span>${Game.esc(title)}</span>
            <span class="fold-count">${Game.esc(count)}</span>
          </summary>
          <p>${Game.esc(GROUP_BLURB[id] || "")}</p>
          ${body}
        </details>`;
  }

  function renderLibrary() {
    const host = document.getElementById("library-groups");
    const funItems = Game.libraryFor(library, "fun", false);
    const funOpen = groupOpen("fun", funItems.length);
    const charShelves = GROUPS.filter((g) => g.id !== "fun" && g.id !== "crew").map((g) => {
      return groupBlock(g.id, g.title, Game.libraryFor(library, g.id, false));
    }).join("");
    const gear = groupBlock("gear", "Gear", Game.gearLibraryItems(library), "No awardable gear stills yet.");
    const crew = groupBlock("crew", "Crew", Game.libraryFor(library, "crew", false));
    const funCount = funItems.length === 1 ? "1 audio file" : funItems.length + " audio files";
    host.innerHTML = `
      <div class="audio-toolbar">
        <button type="button" class="btn primary" id="toggle-fun-audio" aria-expanded="${funOpen ? "true" : "false"}">
          ${funOpen ? "Hide audio files" : "Show audio files"} · ${Game.esc(funCount)}
        </button>
        <p>Tap a card once to play. Hide parks the whole list.</p>
      </div>
      <div id="fun-audio-panel" class="fun-audio-panel"${funOpen ? "" : " hidden"}>
        <div class="lib-grid">${funItems.map(cardHtml).join("")}</div>
      </div>
      ${charShelves}
      ${gear}
      ${crew}`;

    const toggle = document.getElementById("toggle-fun-audio");
    const panel = document.getElementById("fun-audio-panel");
    if (toggle && panel) {
      toggle.addEventListener("click", () => {
        const open = panel.hasAttribute("hidden");
        panel.toggleAttribute("hidden", !open);
        saveFold("fun", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.textContent = (open ? "Hide audio files" : "Show audio files") + " · " + funCount;
      });
    }
    host.querySelectorAll("details[data-fold]").forEach((el) => {
      el.addEventListener("toggle", () => saveFold(el.dataset.fold, el.open));
    });
    bindLibraryClicks(host);
    renderCues();
  }

  function renderCues() {
    Game.bindSoundCues({
      host: "sound-cues",
      family,
      library,
      week,
      onFamily(next) { family = next; }
    });
  }

  function renderIngredients() {
    const box = document.getElementById("ingredients");
    const list = (family.story && family.story.ingredients) || [];
    document.getElementById("story-note").value = (family.story && family.story.includeNote) || "";
    if (!list.length) {
      box.innerHTML = `<p class="empty">No story ingredients yet.</p>`;
      return;
    }
    box.innerHTML = list.map((row) => `
      <article class="ach-card">
        <h3>${row.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(row.text)}</h3>
        <div class="parent-actions">
          <button type="button" class="tiny danger" data-del-ing="${Game.esc(row.id)}">Delete</button>
        </div>
      </article>
    `).join("");
    box.querySelectorAll("[data-del-ing]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!Game.confirmDelete("story ingredient")) return;
        family.story.ingredients = family.story.ingredients.filter((row) => row.id !== b.dataset.delIng);
        persistFamily();
      });
    });
  }

  function tel() {
    return globalThis.Telemetry || window.Telemetry;
  }

  function fillConnectForm() {
    const T = tel();
    if (!T) return;
    const cfg = T.getConfig();
    document.getElementById("tel-url").value = cfg.url || "";
    document.getElementById("tel-anon").value = cfg.anonKey || "";
    document.getElementById("tel-token").value = cfg.familyToken || "";
    document.getElementById("tel-role").value = cfg.role || "bennett";
  }

  function paintUsageStatus(text) {
    const el = document.getElementById("usage-status");
    if (el) el.textContent = text;
  }

  function countBy(events, type) {
    return events.filter((e) => e.type === type).length;
  }

  function hoursAgoIso(h) {
    return new Date(Date.now() - h * 3600 * 1000).toISOString();
  }

  function classLabel(id) {
    if (!id) return "(no class)";
    const fromSeed = ((progressSeed && progressSeed.classes) || []).find((c) => c.id === id);
    return (fromSeed && fromSeed.name) || Game.classNameForId(id) || id;
  }

  function workTitle(id) {
    if (!id) return "(site)";
    const w = (week.work || []).find((x) => x.id === id);
    if (w) return w.title;
    const classes = (progressSeed && progressSeed.classes) || [];
    for (let i = 0; i < classes.length; i += 1) {
      const hit = (classes[i].items || []).find((item) => item.id === id);
      if (hit) return hit.title;
    }
    return id;
  }

  function renderHealth(events, devices) {
    const T = tel();
    const day = hoursAgoIso(24);
    const weekAgo = hoursAgoIso(24 * 7);
    const recent = events.filter((e) => e.ts >= day);
    const errors = recent.filter((e) => e.type === "error").length;
    const slow = recent.filter((e) => e.type === "slow_page").length;
    const bennett = events.filter((e) => e.role === "bennett");
    const lastBennett = bennett[0];
    const stale = (devices || []).filter((d) => !d.last_seen || d.last_seen < weekAgo);
    const queued = T && T._queued;
    document.getElementById("usage-health").innerHTML = `
      <div class="usage-health">
        <div class="usage-tile"><div class="stat-num">${lastBennett ? Game.esc(Game.fmtStamp(lastBennett.ts)) : "—"}</div><div class="stat-label">last Bennett event</div></div>
        <div class="usage-tile${errors ? " usage-warn" : ""}"><div class="stat-num">${errors}</div><div class="stat-label">errors (24h)</div></div>
        <div class="usage-tile${slow ? " usage-warn" : ""}"><div class="stat-num">${slow}</div><div class="stat-label">slow pages (24h)</div></div>
        <div class="usage-tile${stale.length ? " usage-warn" : ""}"><div class="stat-num">${stale.length}</div><div class="stat-label">devices quiet 7d</div></div>
      </div>`;
  }

  function renderStats(events) {
    const day = hoursAgoIso(24);
    const recent = events.filter((e) => e.ts >= day);
    const sessions = {};
    events.filter((e) => e.type === "session_start").forEach((e) => {
      sessions[e.role || "unknown"] = (sessions[e.role || "unknown"] || 0) + 1;
    });
    document.getElementById("usage-stats").innerHTML = `
      <div class="usage-stats">
        <div class="usage-tile"><div class="stat-num">${sessions.bennett || 0}</div><div class="stat-label">Bennett sessions</div></div>
        <div class="usage-tile"><div class="stat-num">${(sessions.parent || 0) + (sessions.orin || 0)}</div><div class="stat-label">parent / Orin sessions</div></div>
        <div class="usage-tile"><div class="stat-num">${countBy(recent, "click")}</div><div class="stat-label">clicks (24h)</div></div>
        <div class="usage-tile"><div class="stat-num">${countBy(recent, "page_view")}</div><div class="stat-label">page views (24h)</div></div>
        <div class="usage-tile"><div class="stat-num">${countBy(events, "work_add")}</div><div class="stat-label">assignments added</div></div>
        <div class="usage-tile"><div class="stat-num">${countBy(events, "work_note")}</div><div class="stat-label">notes</div></div>
        <div class="usage-tile"><div class="stat-num">${countBy(events, "ask_ai")}</div><div class="stat-label">Ask AI</div></div>
        <div class="usage-tile"><div class="stat-num">${countBy(events, "help_open")}</div><div class="stat-label">a little help</div></div>
      </div>`;
  }

  function selectedTermId() {
    const sel = document.getElementById("usage-term");
    return (sel && sel.value) || (termsCatalog.current || Game.DEFAULT_TERM.id);
  }

  function fillTerms() {
    const sel = document.getElementById("usage-term");
    if (!sel) return;
    const terms = termsCatalog.terms && termsCatalog.terms.length
      ? termsCatalog.terms
      : [Game.DEFAULT_TERM];
    const cur = sel.value || termsCatalog.current || Game.DEFAULT_TERM.id;
    sel.innerHTML = terms.map((t) => {
      const on = t.id === cur ? " selected" : "";
      return `<option value="${Game.esc(t.id)}"${on}>${Game.esc(t.label || t.id)}</option>`;
    }).join("");
  }

  function renderClasses(events) {
    const termId = selectedTermId();
    const scoped = events.filter((e) => !e.term_id || e.term_id === termId);
    const map = {};
    scoped.forEach((e) => {
      const id = e.class_id || "";
      if (!map[id]) map[id] = { id, events: 0, assignments: new Set(), ai: 0, notes: 0, help: 0 };
      map[id].events += 1;
      if (e.assignment_id) map[id].assignments.add(e.assignment_id);
      if (e.type === "ask_ai") map[id].ai += 1;
      if (e.type === "work_note") map[id].notes += 1;
      if (e.type === "help_open") map[id].help += 1;
    });
    const roster = (progressSeed && progressSeed.classes) || [];
    roster.forEach((cls) => {
      if (!map[cls.id]) map[cls.id] = { id: cls.id, events: 0, assignments: new Set((cls.items || []).map((i) => i.id)), ai: 0, notes: 0, help: 0 };
      (cls.items || []).forEach((item) => map[cls.id].assignments.add(item.id));
    });
    const rows = Object.keys(map).filter((id) => id).sort((a, b) => classLabel(a).localeCompare(classLabel(b)));
    document.getElementById("usage-classes").innerHTML = `
      <h3 style="font-size:0.95rem;margin:8px 0">By class</h3>
      <ul class="usage-class-list">
        ${rows.map((id) => {
          const row = map[id];
          return `<li>
            <button type="button" data-usage-class="${Game.esc(id)}">${Game.esc(classLabel(id))}</button>
            <span>${row.assignments.size} items · ${row.ai} AI · ${row.notes} notes · ${row.events} events</span>
          </li>`;
        }).join("") || `<li class="empty">No class activity in this term yet.</li>`}
      </ul>`;
    document.querySelectorAll("[data-usage-class]").forEach((b) => {
      b.addEventListener("click", () => {
        drillClass = b.dataset.usageClass;
        drillAssignment = "";
        renderDrill(events);
      });
    });
    if (drillClass) renderDrill(events);
    else document.getElementById("usage-drill").innerHTML = `<p class="empty">Pick a class to drill into assignments and activity.</p>`;
  }

  function renderDrill(events) {
    const host = document.getElementById("usage-drill");
    if (!drillClass) {
      host.innerHTML = `<p class="empty">Pick a class to drill into assignments and activity.</p>`;
      return;
    }
    const termId = selectedTermId();
    const scoped = events.filter((e) => (!e.term_id || e.term_id === termId) && e.class_id === drillClass);
    const byItem = {};
    scoped.forEach((e) => {
      const id = e.assignment_id || "";
      if (!byItem[id]) byItem[id] = [];
      byItem[id].push(e);
    });
    const cls = ((progressSeed && progressSeed.classes) || []).find((c) => c.id === drillClass);
    (cls && cls.items || []).forEach((item) => {
      if (!byItem[item.id]) byItem[item.id] = [];
    });
    const ids = Object.keys(byItem).filter(Boolean);
    if (drillAssignment) {
      const rows = (byItem[drillAssignment] || []).slice().sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
      host.innerHTML = `
        <h3 style="font-size:0.95rem;margin:8px 0">${Game.esc(classLabel(drillClass))} · ${Game.esc(workTitle(drillAssignment))}</h3>
        <button type="button" class="mini" id="usage-back-class">Back to class</button>
        <ul class="usage-timeline">
          ${rows.map((e) => `<li><span>${Game.esc(e.type)}${e.message ? " · " + Game.esc(e.message) : ""}</span><span>${Game.esc(Game.fmtStamp(e.ts))} · ${Game.esc(e.role || "")}</span></li>`).join("") || `<li class="empty">No events on this item.</li>`}
        </ul>`;
      document.getElementById("usage-back-class").addEventListener("click", () => {
        drillAssignment = "";
        renderDrill(events);
      });
      return;
    }
    host.innerHTML = `
      <h3 style="font-size:0.95rem;margin:8px 0">${Game.esc(classLabel(drillClass))}</h3>
      <ul class="usage-class-list">
        ${ids.map((id) => `<li>
          <button type="button" data-usage-item="${Game.esc(id)}">${Game.esc(workTitle(id))}</button>
          <span>${byItem[id].length} events</span>
        </li>`).join("") || `<li class="empty">No assignment activity yet.</li>`}
      </ul>
      <h4 style="font-size:0.82rem;margin:12px 0 4px">Recent activity</h4>
      <ul class="usage-timeline">
        ${scoped.slice(0, 25).map((e) => `<li><span>${Game.esc(e.type)}${e.assignment_id ? " · " + Game.esc(workTitle(e.assignment_id)) : ""}</span><span>${Game.esc(Game.fmtStamp(e.ts))}</span></li>`).join("") || `<li class="empty">Nothing yet.</li>`}
      </ul>`;
    document.querySelectorAll("[data-usage-item]").forEach((b) => {
      b.addEventListener("click", () => {
        drillAssignment = b.dataset.usageItem;
        renderDrill(events);
      });
    });
  }

  async function loadUsage() {
    const T = tel();
    fillTerms();
    if (!T || !T.connected()) {
      paintUsageStatus("Not connected. Events stay on this device until you paste URL, anon key, and family token.");
      renderHealth([], []);
      renderStats([]);
      renderClasses([]);
      return;
    }
    paintUsageStatus("Loading usage…");
    try {
      await T.flush();
      const termId = selectedTermId();
      usageEvents = await T.fetchEvents({ termId, limit: 2000 }) || [];
      usageDevices = await T.fetchDevices() || [];
      const queued = await T.queuedCount();
      paintUsageStatus("Connected · " + usageEvents.length + " events" + (queued ? " · " + queued + " waiting to send" : "") + " · this device " + T.deviceId());
      renderHealth(usageEvents, usageDevices);
      renderStats(usageEvents);
      renderClasses(usageEvents);
    } catch (err) {
      paintUsageStatus("Could not read usage. Check the URL, anon key, family token, and that telemetry.sql ran.");
      renderHealth([], []);
      renderStats([]);
      renderClasses([]);
    }
  }

  function bindUsage() {
    fillConnectForm();
    const form = document.getElementById("usage-connect");
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const T = tel();
      if (!T) {
        Game.toast("Telemetry script did not load.");
        return;
      }
      T.setConfig({
        url: document.getElementById("tel-url").value.trim(),
        anonKey: document.getElementById("tel-anon").value.trim(),
        familyToken: document.getElementById("tel-token").value.trim(),
        role: document.getElementById("tel-role").value
      });
      Game.toast("Saved on this device. Not in the repo.");
      await loadUsage();
    });
    document.getElementById("tel-refresh").addEventListener("click", () => loadUsage());
    document.getElementById("usage-term").addEventListener("change", () => {
      drillClass = "";
      drillAssignment = "";
      loadUsage();
    });
  }

  async function boot() {
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    roster = await Game.loadCharacters();
    library = await Game.loadLibrary();
    progressSeed = await Game.loadProgress();
    termsCatalog = await Game.loadTerms();
    try {
      const seed = await fetch("week.json", { cache: "no-cache" }).then((r) => r.json());
      week = Game.applyWeekOverlay(seed, family);
    } catch (_) {
      week = { work: [], events: [] };
    }
    const bananas = document.getElementById("bananas");
    if (bananas) bananas.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    document.getElementById("draft-flag").hidden = !(Game.usingMomDraft() || Game.usingFamilyDraft() || Game.usingMomLibrary());
    bindUsage();
    loadUsage();

    document.getElementById("close-sheet").addEventListener("click", closeSheet);
    document.getElementById("sheet").addEventListener("click", (e) => {
      if (e.target.id === "sheet") closeSheet();
    });

    async function ingestFiles(fileList) {
      const files = Array.prototype.slice.call(fileList || []);
      if (!files.length) return;
      const labelMap = {};
      const media = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const base = Game.fileBasename(file.name || file.webkitRelativePath || "");
        if (/^manifest\.json$/i.test(base)) {
          try {
            Object.assign(labelMap, Game.labelsFromManifest(JSON.parse(await file.text())));
          } catch (_) {}
          continue;
        }
        if (/^manifest\.js$/i.test(base) || /\.txt$/i.test(base)) continue;
        media.push(file);
      }
      const have = {};
      ((library && library.items) || []).forEach((item) => {
        const name = String(item.filename || "").toLowerCase();
        if (name) have[name] = true;
      });
      let last = null;
      let added = 0;
      let skippedSchool = 0;
      let skippedDup = 0;
      let skippedKind = 0;
      for (let i = 0; i < media.length; i += 1) {
        const file = media[i];
        const base = Game.fileBasename(file.name || "");
        if (Game.isSkippedDeviceSound(base)) {
          skippedSchool += 1;
          continue;
        }
        if (have[base.toLowerCase()]) {
          skippedDup += 1;
          continue;
        }
        const extras = {};
        const mapped = labelMap[base.toLowerCase()];
        if (mapped) extras.label = mapped;
        const result = await Game.addDeviceLibraryFile(library, file, extras);
        if (!result.ok) {
          skippedKind += 1;
          continue;
        }
        library = result.library;
        last = result.item;
        have[base.toLowerCase()] = true;
        added += 1;
      }
      document.getElementById("lib-files").value = "";
      const folder = document.getElementById("lib-folder");
      if (folder) folder.value = "";
      if (!added && !skippedSchool && !skippedDup) {
        if (skippedKind) Game.toast("Skip those — use mp3, wav, ogg, m4a, or an image/video.");
        return;
      }
      Game.saveMomLibrary(library);
      renderLibrary();
      document.getElementById("draft-flag").hidden = false;
      const bits = [];
      if (added) bits.push(added + " added to Fun / Sounds");
      if (skippedSchool) bits.push(skippedSchool + " left out for school");
      if (skippedDup) bits.push(skippedDup + " already in the library");
      Game.toast(bits.join(". ") + ".");
      if (last && added === 1) {
        if (last.kind === "audio" || last.synth) Game.playLibraryItem(last);
        else previewItem(last);
      }
    }

    const drop = document.getElementById("lib-drop");
    const picker = document.getElementById("lib-files");
    const folderPicker = document.getElementById("lib-folder");
    const pickBtn = document.getElementById("lib-pick");
    const pickFolderBtn = document.getElementById("lib-pick-folder");
    function openPicker() {
      picker.click();
    }
    pickBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    });
    if (pickFolderBtn && folderPicker) {
      pickFolderBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        folderPicker.click();
      });
      folderPicker.addEventListener("change", () => ingestFiles(folderPicker.files));
    }
    drop.addEventListener("click", (e) => {
      if (e.target === pickBtn || pickBtn.contains(e.target)) return;
      if (pickFolderBtn && (e.target === pickFolderBtn || pickFolderBtn.contains(e.target))) return;
      openPicker();
    });
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    });
    ["dragenter", "dragover"].forEach((name) => {
      drop.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        drop.classList.add("drag");
      });
    });
    ["dragleave", "dragend"].forEach((name) => {
      drop.addEventListener(name, (e) => {
        e.preventDefault();
        drop.classList.remove("drag");
      });
    });
    drop.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      drop.classList.remove("drag");
      ingestFiles(e.dataTransfer && e.dataTransfer.files);
    });
    picker.addEventListener("change", () => ingestFiles(picker.files));

    document.getElementById("add-lib").addEventListener("click", () => {
      const label = document.getElementById("lib-label").value.trim();
      const path = document.getElementById("lib-path").value.trim();
      const url = document.getElementById("lib-url").value.trim();
      const kind = document.getElementById("lib-kind").value;
      if (!path && !url) {
        Game.toast("Add a path or a URL first.");
        return;
      }
      if (url && url !== "#" && !Game.isSafeHttpUrl(url)) {
        Game.toast("URL needs to be http or https.");
        return;
      }
      const added = Game.normalizeLibrary({
        items: [{
          id: Game.uid("lib"),
          label: label || (path || url).split("/").pop(),
          path,
          url,
          poster: document.getElementById("lib-poster").value.trim(),
          kind,
          character: document.getElementById("lib-character").value,
          test: true
        }]
      }).items[0];
      if (!added) {
        Game.toast("Could not add that item.");
        return;
      }
      library.items.push(added);
      document.getElementById("lib-label").value = "";
      document.getElementById("lib-path").value = "";
      document.getElementById("lib-url").value = "";
      document.getElementById("lib-poster").value = "";
      persistLib();
    });

    document.getElementById("add-ingredient").addEventListener("click", () => {
      const text = document.getElementById("new-ingredient").value.trim();
      if (!text) {
        Game.toast("Write an ingredient first.");
        return;
      }
      family.story.ingredients.push({
        id: Game.uid("si"),
        text,
        test: document.getElementById("ingredient-test").checked
      });
      document.getElementById("new-ingredient").value = "";
      persistFamily();
    });

    document.getElementById("save-story-note").addEventListener("click", () => {
      family.story.includeNote = document.getElementById("story-note").value.trim();
      persistFamily();
      Game.toast(family.story.includeNote ? "Story will include that parent note." : "No parent note — story will skip it.");
    });

    document.getElementById("reload-shipped").addEventListener("click", async () => {
      library = await Game.reloadShippedLibrary();
      renderLibrary();
      document.getElementById("draft-flag").hidden = false;
      Game.toast("Shipped files reloaded. Fun / Sounds on this device were kept.");
    });

    document.getElementById("export").addEventListener("click", async () => {
      const result = await Game.exportFamilyPack(pack, family, roster, library);
      Game.downloadJson("bennett-week-export.json", result.pack);
      if (result.skipped.length) {
        Game.toast("Pack saved. Skipped huge files (over 2 MB): " + result.skipped.join(", "));
      } else {
        Game.toast("Downloaded the family pack.");
      }
    });

    document.getElementById("import").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const obj = JSON.parse(reader.result);
          const next = await Game.importFamilyPack(obj);
          if (!next || !next.pack) throw new Error("bad pack");
          pack = next.pack;
          family = Game.getFamilyDraft() || family;
          roster = Game.getMomCharacters() || roster;
          library = Game.getMomLibrary() || library;
          await Game.hydrateLibraryBlobs(library);
          renderLibrary();
          renderIngredients();
          document.getElementById("draft-flag").hidden = false;
          if (next.skipped.length) {
            Game.toast("Imported. Some device files were too big or missing.");
          } else {
            Game.toast("Imported on this device.");
          }
        } catch (_) {
          Game.toast("Could not read that JSON file.");
        }
      };
      reader.readAsText(file);
    });

    renderLibrary();
    renderIngredients();
  }

  boot();
})();
