(function () {
  const ICONS = ["tennis", "guitar", "clarinet", "badge", "banana", "band"];

  let pack = null;
  let family = null;
  let roster = null;
  let library = null;
  let baseWeek = null;
  let week = null;
  let baseSeed = null;
  let editingId = null;
  let editingCharId = null;
  let selectedCharId = null;
  let selectedLibId = null;
  let pickedTrophy = null;
  const PARENT_TABS = ["awards", "crew", "sounds", "notes", "daily", "classes", "story", "pack"];
  let parentTab = "awards";

  function applyParentTab() {
    document.querySelectorAll("[data-parent-panel]").forEach((el) => {
      el.hidden = el.dataset.parentPanel !== parentTab;
    });
    document.querySelectorAll("[data-parent-tab]").forEach((tab) => {
      const on = tab.dataset.parentTab === parentTab;
      tab.classList.toggle("on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function setParentTab(id) {
    parentTab = PARENT_TABS.indexOf(id) >= 0 ? id : "awards";
    try { localStorage.setItem("bw-parent-tab", parentTab); } catch (_) {}
    applyParentTab();
  }

  function bindParentTabs() {
    const nav = document.getElementById("parent-tabs");
    if (!nav || nav.dataset.bound === "1") return;
    nav.dataset.bound = "1";
    try {
      const q = new URLSearchParams(location.search).get("tab") || "";
      if (PARENT_TABS.indexOf(q) >= 0) parentTab = q;
      else {
        const saved = localStorage.getItem("bw-parent-tab") || "";
        if (PARENT_TABS.indexOf(saved) >= 0) parentTab = saved;
      }
    } catch (_) {}
    nav.addEventListener("click", (e) => {
      const tab = e.target && e.target.closest ? e.target.closest("[data-parent-tab]") : null;
      if (!tab) return;
      setParentTab(tab.dataset.parentTab);
    });
    setParentTab(parentTab);
  }

  function hud() {
    const el = document.getElementById("bananas");
    if (!el) return;
    el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas(pack, family)}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) Game.paintEggChip(pack);
    paintParentNeeds();
  }

  function paintParentNeeds() {
    const el = document.getElementById("parent-needs");
    if (!el) return;
    const line = week ? Game.parentNeedsLine(week) : "";
    el.hidden = !line;
    el.innerHTML = line ? `<a href="progress.html#needs-you">${Game.esc(line)}</a>` : "";
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

  function persistAch() {
    Game.saveMomDraft(pack);
    family = Game.stampAchievementsOnFamily(family, pack);
    family = Game.stampAwardsOnFamily(family);
    renderAchievements();
    renderTrophyOrder();
    renderCharacters();
    fillRewardSelect();
    fillRewardContent();
    hud();
    Game.pushFamilyOverlay(family).then((sync) => {
      if (sync && sync.pushed) Game.toast("Live for Bennett. He can earn this on This Week.");
      else Game.toast("Saved here. Couldn't sync. Try again.");
    }).catch(() => {
      Game.toast("Saved here. Couldn't sync. Try again.");
    });
  }

  function upsertAch(next) {
    const idx = pack.achievements.findIndex((a) => a.id === next.id);
    if (idx >= 0) pack.achievements[idx] = next;
    else pack.achievements.push(next);
    editingId = next.id;
  }

  function persistCatalog() {
    Game.saveMomDraft(pack);
    family = Game.stampAchievementsOnFamily(family, pack);
  }

  function testAchievement(id) {
    const ach = (pack.achievements || []).find((row) => row && row.id === id);
    if (!ach) {
      Game.toast("Save the streak first, then Test.");
      return;
    }
    const result = Game.previewTestAward(pack, family, ach.id);
    family = result.family;
    Game.celebrate(ach, pack, library, { roster, family });
    renderAchievements();
    renderTrophyOrder();
    hud();
  }

  function syncIntentIntoForm() {
    const doEl = document.getElementById("award-do");
    const text = doEl ? doEl.value.trim() : "";
    if (!text) return;
    const intent = Game.parseAwardIntent(text);
    const prev = editingId ? pack.achievements.find((a) => a.id === editingId) : null;
    if (prev && prev.unlock && prev.unlock.type === "easter_egg" && intent.type === "parent_award") return;
    applyAwardIntent({ fillEmpty: true });
  }

  function testFromForm() {
    syncIntentIntoForm();
    const next = collect();
    if (!next.title) {
      Game.toast("Add a title first.");
      return;
    }
    upsertAch(next);
    persistCatalog();
    testAchievement(next.id);
    const titleEl = document.getElementById("editor-title");
    if (titleEl) titleEl.textContent = "Edit streak";
  }

  function persistChars() {
    Game.saveMomCharacters(roster);
    renderCharacters();
    fillRewardSelect();
    renderAchievements();
    Game.toast("Saved on this device. Export JSON to share with the other parent.");
  }

  function persistFamily() {
    Game.saveFamily(family);
    week = Game.applyWeekOverlay(baseWeek, family);
    renderInbox();
    renderAskInbox();
    renderPool();
    renderDailyAnswers();
    renderIngredients();
    renderCues();
    renderAchievements();
    renderTrophyOrder();
    renderCharacters();
    renderCharLibrary();
    renderClassRoster();
    fillTargets();
    hud();
    Game.paintMessagesChip(family);
  }

  function progressClasses() {
    return Game.applyProgressOverlay(baseSeed || { classes: [] }, family).classes || [];
  }

  function renderClassRoster() {
    const box = document.getElementById("class-roster");
    if (!box) return;
    const classes = progressClasses();
    if (!classes.length) {
      box.innerHTML = `<p class="empty">No classes yet.</p>`;
      return;
    }
    box.innerHTML = classes.map((cls) => {
      const khan = Game.khanLinksForClass(cls);
      const khanBit = khan.length
        ? khan.map((k) => Game.khanShortLabel(k)).join(" · ")
        : "No Khan course";
      const empty = !(cls.items || []).length;
      return `
        <article class="ach-card">
          <h3>${cls.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(Game.classPeriodLine(cls))}</h3>
          <p>${cls.code ? Game.esc(cls.code) + " · " : ""}${cls.time ? Game.esc(cls.time) + " · " : ""}${Game.esc(empty ? "No assignments yet" : (cls.items.length + (cls.items.length === 1 ? " item" : " items")))} · ${Game.esc(khanBit)}</p>
        </article>`;
    }).join("");
  }

  function fillRewardSelect(selected) {
    const sel = document.getElementById("reward-character");
    if (!sel) return;
    const current = selected != null ? selected : sel.value;
    const opts = [`<option value="">None</option>`].concat(
      (roster.characters || []).map((ch) => {
        const label = Game.characterLabel(ch);
        return `<option value="${Game.esc(ch.id)}">${Game.esc(label)}</option>`;
      })
    );
    sel.innerHTML = opts.join("");
    sel.value = current || "";
  }

  function findChar(id) {
    return (roster.characters || []).find((ch) => ch.id === id) || null;
  }

  function rewardLabel(ach) {
    const unlock = Game.rewardUnlockOf(ach);
    if (!unlock) return "";
    if (unlock.type === "character") {
      return "Character · " + Game.characterLabel(findChar(unlock.id), unlock.id);
    }
    if (unlock.type === "content") {
      return "Content · " + (unlock.label || unlock.id);
    }
    return (unlock.type || "unlock") + " · " + (unlock.label || unlock.id);
  }

  function fillRewardMedia(characterId, selected) {
    const sel = document.getElementById("reward-media");
    if (!sel) return;
    const items = characterId
      ? Game.libraryForAttach(library, characterId)
      : Game.contentLibraryItems(library);
    sel.innerHTML = [`<option value="">None · uses A streak is awarded</option>`].concat(
      items.map((item) => `<option value="${Game.esc(item.id)}">${Game.esc(item.label)} · ${Game.esc(Game.libraryKindLabel(item))}</option>`)
    ).join("");
    sel.value = selected || "";
  }

  function fillRewardContent(selected) {
    const sel = document.getElementById("reward-content");
    if (!sel) return;
    const items = Game.contentLibraryItems(library);
    sel.innerHTML = [`<option value="">None</option>`].concat(
      items.map((item) => `<option value="${Game.esc(item.id)}">${Game.esc(item.label)} · ${Game.esc(Game.libraryKindLabel(item))}</option>`)
    ).join("");
    sel.value = selected || "";
  }

  function fillAttachStreaks() {
    const sel = document.getElementById("attach-streak");
    if (!sel) return;
    sel.innerHTML = [`<option value="">None</option>`].concat(
      (pack.achievements || []).map((ach) => `<option value="${Game.esc(ach.id)}">${Game.esc(ach.title || ach.id)}</option>`)
    ).join("");
    fillAttachWeek();
  }

  function fillAttachWeek() {
    const group = document.getElementById("attach-week-group");
    if (!group || !week) return;
    const rows = []
      .concat((week.work || []).map((w) => ({ id: w.id, label: "Work · " + (w.title || w.id) })))
      .concat((week.events || []).map((e) => ({ id: e.id, label: "Event · " + (e.title || e.id) })));
    group.innerHTML = rows.map((row) => `<option value="${Game.esc(row.id)}">${Game.esc(row.label)}</option>`).join("");
  }

  function syncRewardTypeUi() {
    const type = (document.getElementById("reward-type") || {}).value || "";
    const charSel = document.getElementById("reward-character");
    const gearRow = document.getElementById("reward-gear-row");
    const contentRow = document.getElementById("reward-content-row");
    const mediaSel = document.getElementById("reward-media");
    if (charSel && charSel.closest("label")) charSel.closest("label").hidden = type !== "character";
    if (gearRow) gearRow.hidden = type === "" || type === "character" || type === "content";
    if (contentRow) contentRow.hidden = type !== "content";
    if (mediaSel) mediaSel.closest("label").hidden = type === "content";
    const charId = type === "character" ? (charSel && charSel.value) : "";
    fillRewardMedia(charId, mediaSel ? mediaSel.value : "");
    fillRewardContent(document.getElementById("reward-content") ? document.getElementById("reward-content").value : "");
    renderRewardPicks();
    renderGivePicker();
    renderEarnPicker();
  }

  const EARN_CHIPS = [
    { type: "parent_award", label: "I tap Award", doText: "Parents award this from the desk." },
    { type: "done_count", label: "N assignments Done", doText: "marks 3 assignments done", needsCount: true },
    { type: "open_touched", label: "Every open assignment", doText: "Mark either Done or I started this on every open assignment." },
    { type: "class_tour", label: "Open every class in 24h", doText: "Opened every class in one day." },
    { type: "login_days", label: "Log in N days in a row", doText: "Logs in to the site 5 days in a row", needsCount: true }
  ];

  function earnCountNeeded(type) {
    return type === "done_count" || type === "login_days" || type === "login_total";
  }

  function giveTitle() {
    const type = (document.getElementById("reward-type") || {}).value || "";
    const charId = (document.getElementById("reward-character") || {}).value || "";
    if (type === "character" && charId) {
      const ch = findChar(charId);
      return "Meet " + Game.characterLabel(ch, charId);
    }
    const gearLabel = (document.getElementById("reward-unlock-label") || {}).value || "";
    if (type && type !== "character" && type !== "content" && gearLabel) return gearLabel;
    return "";
  }

  function paintGiveTitle() {
    const titleEl = document.getElementById("title");
    const incentiveEl = document.getElementById("incentive");
    const next = giveTitle();
    if (titleEl && next && (!titleEl.value || /^Meet /.test(titleEl.value) || titleEl.value === "New streak")) {
      titleEl.value = next;
    }
    if (incentiveEl && next && !incentiveEl.value) incentiveEl.value = "Unlocks " + next.replace(/^Meet /, "");
  }

  function renderGivePicker() {
    const host = document.getElementById("give-picker");
    if (!host) return;
    const type = (document.getElementById("reward-type") || {}).value || "";
    const selected = (document.getElementById("reward-character") || {}).value || "";
    const chars = (roster && roster.characters) || [];
    const trophyOn = !type;
    let html = `<button type="button" class="badge-pick${trophyOn ? " on" : ""}" data-give="" aria-pressed="${trophyOn ? "true" : "false"}">
      <span>Trophy only</span>
    </button>`;
    html += chars.map((ch) => {
      const src = ch.poster || ("img/characters/" + ch.id + ".jpg");
      const on = type === "character" && ch.id === selected;
      return `<button type="button" class="badge-pick${on ? " on" : ""}" data-give="character:${Game.esc(ch.id)}" aria-pressed="${on ? "true" : "false"}">
        <img src="${Game.esc(src)}" alt="">
        <span>${Game.esc(ch.name || ch.id)}</span>
      </button>`;
    }).join("");
    host.innerHTML = html;
  }

  function renderEarnPicker() {
    const host = document.getElementById("earn-picker");
    if (!host) return;
    const current = (document.getElementById("unlock-type") || {}).value || "parent_award";
    host.innerHTML = EARN_CHIPS.map((row) => {
      const on = row.type === current;
      return `<button type="button" class="earn-pick${on ? " on" : ""}" data-earn="${Game.esc(row.type)}" aria-pressed="${on ? "true" : "false"}">${Game.esc(row.label)}</button>`;
    }).join("");
    const wrap = document.getElementById("earn-count-wrap");
    if (wrap) wrap.hidden = !earnCountNeeded(current);
  }

  function applyEarnChip(type, opts) {
    const row = EARN_CHIPS.find((item) => item.type === type) || EARN_CHIPS[0];
    const countEl = document.getElementById("unlock-count");
    let doText = row.doText;
    if (row.type === "done_count") {
      const n = Number((countEl && countEl.value) || 3) || 3;
      if (countEl && !(opts && opts.keepCount)) countEl.value = n;
      doText = "marks " + n + " assignments done";
    }
    if (row.type === "login_days") {
      const n = Number((countEl && countEl.value) || 5) || 5;
      if (countEl && !(opts && opts.keepCount)) countEl.value = n;
      doText = "Logs in to the site " + n + " days in a row";
    }
    const doEl = document.getElementById("award-do");
    if (doEl) doEl.value = doText;
    document.getElementById("unlock-type").value = row.type;
    applyAwardIntent({ fillEmpty: true });
    paintGiveTitle();
    renderEarnPicker();
  }

  function applyGivePick(token) {
    const typeEl = document.getElementById("reward-type");
    const charEl = document.getElementById("reward-character");
    if (token && token.indexOf("character:") === 0) {
      if (typeEl) typeEl.value = "character";
      if (charEl) charEl.value = token.slice(10);
    } else {
      if (typeEl) typeEl.value = "";
      if (charEl) charEl.value = "";
    }
    syncRewardTypeUi();
    paintGiveTitle();
    renderGivePicker();
  }

  function paintAwardReadout(intent) {
    const el = document.getElementById("award-do-readout");
    if (!el) return;
    el.textContent = (intent && intent.readout) || "The site will count it when it can. Otherwise you Award it from the desk.";
  }

  function applyAwardIntent(opts) {
    const fillEmpty = !!(opts && opts.fillEmpty);
    const doEl = document.getElementById("award-do");
    const titleEl = document.getElementById("title");
    const descEl = document.getElementById("description");
    const howEl = document.getElementById("how");
    if (!doEl) return;
    const intent = Game.parseAwardIntent(doEl.value);
    paintAwardReadout(intent);
    document.getElementById("unlock-type").value = intent.type || "parent_award";
    document.getElementById("unlock-count").value = intent.count || 1;
    document.getElementById("unlock-hours").value = intent.hours || 24;
    document.getElementById("target").value = intent.target || 1;
    document.getElementById("unit").value = intent.unit || "time";
    if (howEl) howEl.value = intent.how || "";
    if (titleEl && (!fillEmpty || !titleEl.value)) titleEl.value = intent.title || titleEl.value;
    if (descEl && (!fillEmpty || !descEl.value)) descEl.value = intent.description || descEl.value;
  }

  function currentBadgeId() {
    const badge = (document.getElementById("badge") || {}).value || "";
    if (badge) return "lib:" + badge;
    return (document.getElementById("icon") || {}).value || "badge";
  }

  function applyBadgeChoice(id) {
    const key = String(id || "badge");
    if (key.indexOf("lib:") === 0) {
      document.getElementById("icon").value = "badge";
      document.getElementById("badge").value = key.slice(4);
    } else {
      document.getElementById("icon").value = key;
      document.getElementById("badge").value = "";
    }
    renderBadgePicker();
  }

  function renderBadgePicker() {
    const host = document.getElementById("badge-picker");
    if (!host || !Game.badgeChoices) return;
    const current = currentBadgeId();
    host.innerHTML = Game.badgeChoices(library).map((row) => `
      <button type="button" class="badge-pick${row.id === current ? " on" : ""}" data-badge="${Game.esc(row.id)}" aria-pressed="${row.id === current ? "true" : "false"}">
        <img src="${Game.esc(row.src)}" alt="">
        <span>${Game.esc(row.label)}</span>
      </button>`).join("");
  }

  function posterChoices() {
    const shipped = ["bennett", "ace", "riff", "scorch", "deuce", "fuzz"].map((id) => ({
      id,
      src: "img/characters/" + id + ".jpg",
      label: id.charAt(0).toUpperCase() + id.slice(1)
    }));
    const extra = Game.badgeChoices(library).filter((row) => row.kind === "library").map((row) => ({
      id: row.src,
      src: row.src,
      label: row.label
    }));
    return shipped.concat(extra);
  }

  function renderPosterPicker() {
    const host = document.getElementById("char-poster-picker");
    if (!host) return;
    const current = (document.getElementById("char-poster") || {}).value || "";
    host.innerHTML = posterChoices().map((row) => `
      <button type="button" class="badge-pick${row.src === current ? " on" : ""}" data-poster="${Game.esc(row.src)}">
        <img src="${Game.esc(row.src)}" alt="">
        <span>${Game.esc(row.label)}</span>
      </button>`).join("");
  }

  function renderRewardPicks() {
    const type = (document.getElementById("reward-type") || {}).value || "";
    const lead = document.getElementById("reward-pick-lead");
    const charHost = document.getElementById("reward-char-pick");
    const gearHost = document.getElementById("reward-gear-pick");
    if (lead) lead.hidden = type === "" || type === "content";
    if (charHost) {
      charHost.hidden = type !== "character";
      if (type === "character") {
        const selected = (document.getElementById("reward-character") || {}).value || "";
        charHost.innerHTML = ((roster && roster.characters) || []).map((ch) => {
          const src = ch.poster || ("img/characters/" + ch.id + ".jpg");
          return `<button type="button" class="badge-pick${ch.id === selected ? " on" : ""}" data-reward-char="${Game.esc(ch.id)}">
            <img src="${Game.esc(src)}" alt="">
            <span>${Game.esc(ch.name || ch.id)}</span>
          </button>`;
        }).join("");
      }
    }
    if (gearHost) {
      const gear = type && type !== "character" && type !== "content";
      gearHost.hidden = !gear;
      if (gear) {
        const selected = (document.getElementById("reward-unlock-id") || {}).value || "";
        const items = ((library && library.items) || []).filter((item) => item && item.kind === "image");
        gearHost.innerHTML = items.map((item) => {
          const src = Game.librarySrc(item) || Game.libraryThumb(item);
          if (!src) return "";
          return `<button type="button" class="badge-pick${item.id === selected ? " on" : ""}" data-reward-gear="${Game.esc(item.id)}" data-reward-label="${Game.esc(item.label || item.id)}">
            <img src="${Game.esc(src)}" alt="">
            <span>${Game.esc(item.label || item.id)}</span>
          </button>`;
        }).join("");
      }
    }
  }

  function fillTargets() {
    const targetSel = document.getElementById("note-target");
    if (!targetSel) return;
    targetSel.innerHTML = allTargets().map((t) => `<option value="${Game.esc(t.value)}">${Game.esc(t.label)}</option>`).join("");
  }

  function openSheet(title, html) {
    document.getElementById("sheet-title").textContent = title;
    document.getElementById("sheet-body").innerHTML = html;
    document.getElementById("sheet").classList.add("open");
  }

  function closeSheet() {
    document.getElementById("sheet").classList.remove("open");
  }

  function editForm(fields) {
    return fields.map((f) => {
      if (f.type === "textarea") {
        return `<label class="edit-label">${Game.esc(f.label)}<textarea id="ef-${Game.esc(f.name)}" maxlength="${f.max || 280}">${Game.esc(f.value || "")}</textarea></label>`;
      }
      return `<label class="edit-label">${Game.esc(f.label)}<input id="ef-${Game.esc(f.name)}" type="${Game.esc(f.type || "text")}" value="${Game.esc(f.value || "")}"></label>`;
    }).join("") + `<button type="button" class="btn primary" id="edit-save">Save</button>`;
  }

  function fieldValue(name) {
    const el = document.getElementById("ef-" + name);
    return el ? (el.value || "").trim() : "";
  }

  function itemLabel(type, id) {
    if (type === "work") {
      const w = (week.work || []).find((x) => x.id === id);
      return w ? w.title : id;
    }
    const e = (week.events || []).find((x) => x.id === id);
    return e ? e.title : id;
  }

  function allTargets() {
    const rows = [];
    (week.work || []).forEach((w) => rows.push({ value: "work:" + w.id, label: "Work · " + w.title }));
    (week.events || []).forEach((e) => rows.push({ value: "event:" + e.id, label: "Event · " + e.title }));
    return rows;
  }

  function renderInbox() {
    const box = document.getElementById("inbox");
    const questions = (family.notes || []).filter((n) => n.from === "bennett");
    const parentNotes = (family.notes || []).filter((n) => Game.isParentAuthor(n));
    const answers = (family.reflections && family.reflections.answers) || [];
    if (!questions.length && !parentNotes.length && !answers.length) {
      box.innerHTML = `<p class="empty">No questions, notes, or check-ins yet.</p>`;
      return;
    }
    const qHtml = questions.map((n) => `
      <article class="inbox-card">
        <h3>${n.test ? '<span class="test-tag">TEST</span> ' : ""}${n.kind === "plan" ? "Plan" : (n.kind === "note" ? "Bennett note" : "Question")} · ${Game.esc(itemLabel(n.targetType, n.targetId))}</h3>
        <p>${Game.esc(n.text)}</p>
        <p>${Game.esc(Game.fmtStamp(n.at))}</p>
        <label>Reply with a note
          <textarea data-reply="${Game.esc(n.id)}" maxlength="280" placeholder="A short note on this item"></textarea>
        </label>
        <div class="parent-actions">
          <button type="button" class="btn" data-send-reply="${Game.esc(n.id)}">Send note</button>
          <button type="button" class="tiny" data-edit-note="${Game.esc(n.id)}">Edit</button>
          <button type="button" class="tiny danger" data-del-note="${Game.esc(n.id)}">Delete</button>
        </div>
      </article>
    `).join("");
    const pHtml = parentNotes.map((n) => `
      <article class="inbox-card">
        <h3>${n.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(Game.noteAuthorLabel(n))} · ${Game.esc(itemLabel(n.targetType, n.targetId))}</h3>
        <p>${Game.esc(n.text)}</p>
        <p>${Game.esc(Game.fmtStamp(n.at))}</p>
        <div class="parent-actions">
          <button type="button" class="tiny" data-edit-note="${Game.esc(n.id)}">Edit</button>
          <button type="button" class="tiny danger" data-del-note="${Game.esc(n.id)}">Delete</button>
        </div>
      </article>
    `).join("");
    const aHtml = answers.map((a) => `
      <article class="inbox-card">
        <h3>${a.test ? '<span class="test-tag">TEST</span> ' : ""}Check-in</h3>
        <p>${Game.esc(a.prompt || "")}</p>
        <p>${Game.esc(a.text)}</p>
        <p>${Game.esc(Game.fmtStamp(a.at))}</p>
        <div class="parent-actions">
          <button type="button" class="tiny" data-edit-answer="${Game.esc(a.id)}">Edit</button>
          <button type="button" class="tiny danger" data-del-answer="${Game.esc(a.id)}">Delete</button>
        </div>
      </article>
    `).join("");
    box.innerHTML = qHtml + pHtml + aHtml;
    box.querySelectorAll("[data-send-reply]").forEach((b) => {
      b.addEventListener("click", () => {
        const q = family.notes.find((n) => n.id === b.dataset.sendReply);
        const ta = box.querySelector(`[data-reply="${b.dataset.sendReply}"]`);
        const text = (ta && ta.value || "").trim();
        if (!q || !text) {
          Game.toast("Write a note first.");
          return;
        }
        family = Game.sendParentReply(family, q.id, text);
        Game.toast("Note saved. Bennett will see it on that item.");
        renderInbox();
      });
    });
    box.querySelectorAll("[data-edit-note]").forEach((b) => {
      b.addEventListener("click", () => {
        const n = family.notes.find((x) => x.id === b.dataset.editNote);
        if (!n) return;
        openSheet(n.from === "bennett" ? "Edit question" : "Edit parent note", editForm([
          { name: "text", label: "Text", value: n.text || "", type: "textarea", max: 280 }
        ]));
        document.getElementById("edit-save").addEventListener("click", () => {
          const text = fieldValue("text");
          if (!text) {
            Game.toast("Write something first.");
            return;
          }
          family = Game.updateNote(family, n.id, { text });
          closeSheet();
          Game.toast("Saved on this device.");
          persistFamily();
        });
      });
    });
    box.querySelectorAll("[data-del-note]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!Game.confirmDelete("note")) return;
        family = Game.deleteNote(family, b.dataset.delNote);
        persistFamily();
      });
    });
    box.querySelectorAll("[data-edit-answer]").forEach((b) => {
      b.addEventListener("click", () => {
        const a = ((family.reflections && family.reflections.answers) || []).find((x) => x.id === b.dataset.editAnswer);
        if (!a) return;
        openSheet("Edit check-in", editForm([
          { name: "text", label: "Answer", value: a.text || "", type: "textarea", max: 280 }
        ]));
        document.getElementById("edit-save").addEventListener("click", () => {
          const text = fieldValue("text");
          if (!text) {
            Game.toast("Write a sentence or two first.");
            return;
          }
          family = Game.updateAnswer(family, a.id, { text });
          closeSheet();
          persistFamily();
        });
      });
    });
    box.querySelectorAll("[data-del-answer]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!Game.confirmDelete("check-in")) return;
        family = Game.deleteAnswer(family, b.dataset.delAnswer);
        persistFamily();
      });
    });
  }

  function renderPool() {
    const list = document.getElementById("pool");
    if (!list) return;
    const pool = (family.reflections && family.reflections.pool) || [];
    if (!pool.length) {
      list.innerHTML = `<p class="empty">No daily questions yet.</p>`;
      return;
    }
    list.innerHTML = pool.map((p) => `
      <article class="ach-card${p.paused ? " is-hold" : ""}">
        <h3>${p.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(p.text)}</h3>
        ${p.paused ? `<p class="prompt-hold">On hold — not in today's rotation</p>` : ""}
        <div class="parent-actions">
          <button type="button" class="tiny" data-edit-prompt="${Game.esc(p.id)}">Edit</button>
          <button type="button" class="tiny" data-hold-prompt="${Game.esc(p.id)}">${p.paused ? "Resume" : "Hold"}</button>
          <button type="button" class="tiny danger" data-del-prompt="${Game.esc(p.id)}">Delete</button>
        </div>
      </article>
    `).join("");
    list.querySelectorAll("[data-edit-prompt]").forEach((b) => {
      b.addEventListener("click", () => {
        const p = family.reflections.pool.find((x) => x.id === b.dataset.editPrompt);
        if (!p) return;
        openSheet("Edit prompt", editForm([
          { name: "text", label: "Prompt", value: p.text || "", type: "textarea", max: 140 }
        ]));
        document.getElementById("edit-save").addEventListener("click", () => {
          const text = fieldValue("text");
          if (!text) {
            Game.toast("Write a prompt first.");
            return;
          }
          family = Game.updatePrompt(family, p.id, { text });
          closeSheet();
          persistFamily();
        });
      });
    });
    list.querySelectorAll("[data-hold-prompt]").forEach((b) => {
      b.addEventListener("click", () => {
        const p = family.reflections.pool.find((x) => x.id === b.dataset.holdPrompt);
        if (!p) return;
        family = Game.setPromptPaused(family, p.id, !p.paused);
        persistFamily();
      });
    });
    list.querySelectorAll("[data-del-prompt]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!Game.confirmDelete("daily question")) return;
        family = Game.deletePrompt(family, b.dataset.delPrompt);
        persistFamily();
      });
    });
  }

  function renderDailyAnswers() {
    const host = document.getElementById("daily-answers");
    if (!host) return;
    const grouped = Game.groupCheckinsByPrompt(family);
    if (!grouped.filled.length) {
      host.innerHTML = `<p class="empty">Answers from This Week group here by question.</p>`;
      return;
    }
    host.innerHTML = grouped.filled.map((g) => `
      <article class="checkin-group">
        <h3>${Game.esc(g.prompt)}</h3>
        <ul class="checkin-list">${g.answers.map((a) => `
          <li>
            <p class="checkin-text">${Game.esc(a.text)}</p>
            <p class="checkin-stamp">${Game.esc(Game.fmtStamp(a.at))}</p>
          </li>`).join("")}</ul>
      </article>`).join("");
  }

  function streakOf(ach) {
    const st = (family.streaks || {})[ach.id] || { count: 0, awarded: Game.alreadyUnlocked(ach.id) };
    return { count: Number(st.count) || 0, awarded: !!(st.awarded || Game.alreadyUnlocked(ach.id)) };
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
    return Game.badgeSrc(ach, library);
  }

  function orderedTrophies() {
    const earned = (pack.achievements || []).filter((ach) => Game.alreadyUnlocked(ach.id));
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

  function moveTrophy(fromId, toId) {
    const ids = orderedTrophies().map((a) => a.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    Game.saveTrophyOrder(ids);
    renderTrophyOrder();
  }

  function renderTrophyOrder() {
    const host = document.getElementById("trophy-order-list");
    if (!host) return;
    const earned = orderedTrophies();
    host.classList.toggle("is-empty", !earned.length);
    if (!earned.length) {
      host.innerHTML = `<p class="empty">No awarded trophies yet. Award a streak, then drag to set the room order.</p>`;
      return;
    }
    host.innerHTML = earned.map((ach) => `
      <article class="trophy trophy-${trophyKind(ach)}${pickedTrophy === ach.id ? " picked" : ""}" draggable="true" data-id="${Game.esc(ach.id)}">
        <img src="${Game.esc(trophyArt(ach))}" alt="">
        <h3>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title)}</h3>
      </article>`).join("");
    host.querySelectorAll(".trophy").forEach((el) => {
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
          renderTrophyOrder();
        }
      });
    });
  }

  function questCardHtml(ach) {
    const st = streakOf(ach);
    const status = Game.awardLiveStatus(ach, family);
    const unlock = Game.rewardUnlockOf(ach);
    const gets = unlock
      ? (unlock.type === "character" ? Game.characterLabel(findChar(unlock.id), unlock.id) : (unlock.label || unlock.id))
      : "Trophy";
    const does = Game.earnRulePlain(ach);
    const art = trophyArt(ach);
    const media = Game.rewardMediaItem(ach, library);
    const target = (ach.streak && ach.streak.target) || 1;
    const showCount = !ach.unlock && target > 1;
    const preview = status.key === "preview";
    const earned = status.key === "earned";
    const more = [];
    if (showCount) more.push(`<button type="button" class="tiny" data-count="${Game.esc(ach.id)}">Count</button>`);
    more.push(`<button type="button" class="tiny" data-test="${Game.esc(ach.id)}">Test</button>`);
    more.push(`<button type="button" class="tiny danger" data-del="${Game.esc(ach.id)}">Delete</button>`);
    const primary = earned
      ? `<button type="button" class="tiny" data-revoke="${Game.esc(ach.id)}">Undo</button>`
      : (status.key === "parent" || preview
        ? `<button type="button" class="btn primary" data-award="${Game.esc(ach.id)}">${preview ? "Award for real" : "Award now"}</button>`
        : "");
    return `
      <article class="ach-card quest-card">
        <img class="quest-art" src="${Game.esc(art)}" alt="${media ? Game.esc(media.label) : ""}">
        <p class="quest-gets">Gets ${Game.esc(gets)}</p>
        <h3>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title || "Untitled")}</h3>
        <p class="quest-does"><span>Bennett does</span> ${Game.esc(does)}</p>
        <p class="quest-status is-${Game.esc(status.key)}">${Game.esc(status.label)}${st.awarded && !preview ? "" : (st.count && showCount ? " · " + st.count + "/" + target : "")}</p>
        <div class="parent-actions quest-actions">
          ${primary}
          <button type="button" class="btn" data-edit="${Game.esc(ach.id)}">Edit</button>
          ${more.join("")}
        </div>
      </article>`;
  }

  function renderAchievements() {
    const list = document.getElementById("list");
    if (!(pack.achievements || []).length) {
      list.innerHTML = `<p class="empty">No rewards yet. Schedule one: he gets Scorch, he earns it by a rule, Save for Bennett.</p>`;
      return;
    }
    const groups = [
      { key: "live", title: "Live for Bennett" },
      { key: "parent", title: "You award from the desk" },
      { key: "earned", title: "Earned" },
      { key: "preview", title: "Preview only (this device)" }
    ];
    const byKey = { live: [], parent: [], earned: [], preview: [] };
    (pack.achievements || []).forEach((ach) => {
      const status = Game.awardLiveStatus(ach, family);
      (byKey[status.key] || byKey.parent).push(ach);
    });
    list.innerHTML = groups.map((g) => {
      const rows = byKey[g.key];
      if (!rows.length) return "";
      return `<section class="quest-group"><h3>${Game.esc(g.title)}</h3>${rows.map(questCardHtml).join("")}</section>`;
    }).join("") || `<p class="empty">No rewards yet.</p>`;

    list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(b.dataset.edit)));
    list.querySelectorAll("[data-test]").forEach((b) => b.addEventListener("click", () => testAchievement(b.dataset.test)));
    list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Delete this reward?")) return;
      pack.achievements = pack.achievements.filter((a) => a.id !== b.dataset.del);
      persistAch();
      closeForm();
    }));
    list.querySelectorAll("[data-count]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.dataset.count;
        const curSt = streakOf(pack.achievements.find((a) => a.id === id) || { id });
        family.streaks[id] = { count: curSt.count + 1, awarded: curSt.awarded };
        persistFamily();
        Game.toast("Counted. Award when the streak is real.");
      });
    });
    list.querySelectorAll("[data-award]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.award;
      const curSt = streakOf(pack.achievements.find((a) => a.id === id) || { id });
      family.streaks[id] = Object.assign({}, family.streaks[id] || {}, { count: curSt.count });
      const result = Game.awardStreak(pack, family, id);
      family = result.family;
      persistFamily();
      if (result.achievement) {
        if (result.grantedCharacter) Game.unmarkCharacterSeen(result.grantedCharacter);
        if (result.freshCharacter) {
          const ch = findChar(result.grantedCharacter);
          Game.toast((ch ? Game.characterLabel(ch) : "Character") + " unlocked. Switch to Bennett to see the celebration.");
        }
        if (result.freshGear && result.grantedUnlock) {
          Game.toast((result.grantedUnlock.label || result.grantedUnlock.id) + " unlocked for the story.");
        }
        if (result.freshContent && result.grantedUnlock) {
          Game.toast((result.grantedUnlock.label || result.grantedUnlock.id) + " unlocked for Bennett.");
        }
        if (!result.freshCharacter && !result.freshGear && !result.freshContent) {
          Game.toast("Awarded. Switch to Bennett to confirm.");
        }
        Game.pushFamilyOverlay(family).catch(() => {});
      } else {
        Game.toast("Already awarded on this device.");
      }
    }));
    list.querySelectorAll("[data-revoke]").forEach((b) => b.addEventListener("click", () => {
      const result = Game.revokeAchievement(pack, family, b.dataset.revoke);
      family = result.family;
      persistFamily();
      Game.toast("Award undone. Switch to Bennett to confirm it's gone, then Award to test again.");
      Game.pushFamilyOverlay(family).catch(() => {});
    }));
  }

  function renderCharacters() {
    const list = document.getElementById("char-list");
    if (!list) return;
    const chars = roster.characters || [];
    if (!chars.length) {
      list.innerHTML = `<p class="empty">No character slots yet. Add Ace, Riff, Scorch, Deuce, Fuzz, or Bennett.</p>`;
      return;
    }
    list.innerHTML = chars.map((ch) => {
      const label = Game.characterLabel(ch);
      const unlocked = Game.alreadyUnlockedCharacter(ch.id);
      const coming = ch.status !== "ready" || !ch.video;
      const media = ch.video
        ? `<video class="char-preview" src="${Game.esc(ch.video)}" poster="${Game.esc(ch.poster || "")}" controls playsinline preload="metadata"></video>`
        : ch.poster
          ? `<img class="char-preview" src="${Game.esc(ch.poster)}" alt="">`
          : `<div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>${coming ? "Coming — empty slot" : "No clip yet"}</p></div>`;
      return `
        <article class="char-card ${coming ? "coming" : "ready"}${selectedCharId === ch.id ? " selected" : ""}" data-select-char="${Game.esc(ch.id)}">
          <div class="char-media">${media}</div>
          <h3>${ch.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(label)}</h3>
          <p>${ch.talent ? Game.esc(ch.talent) : "Talent TBD"}</p>
          <p>${ch.tagline ? "“" + Game.esc(ch.tagline) + "”" : "Tag line later"}</p>
          <p>${ch.id === "bennett"
            ? (unlocked ? "Unlocked by sign-in" : "Unlocks the first time he opens the site")
            : (unlocked ? "Unlocked for Bennett" : "Locked for Bennett until a streak awards them")}</p>
          <div class="parent-actions">
            <button type="button" class="tiny" data-select-char="${Game.esc(ch.id)}">Library</button>
            <button type="button" class="tiny" data-edit-char="${Game.esc(ch.id)}">Edit</button>
            <button type="button" class="tiny danger" data-del-char="${Game.esc(ch.id)}">Delete</button>
          </div>
        </article>`;
    }).join("");
    list.querySelectorAll("[data-select-char]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedCharId = b.dataset.selectChar;
        selectedLibId = null;
        renderCharacters();
        renderCharLibrary();
      });
    });
    list.querySelectorAll("[data-edit-char]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openCharForm(b.dataset.editChar);
      });
    });
    list.querySelectorAll("[data-del-char]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("Delete this character slot?")) return;
        roster.characters = roster.characters.filter((c) => c.id !== b.dataset.delChar);
        persistChars();
        closeCharForm();
      });
    });
    const comic = document.getElementById("parent-comic-soon");
    const copy = document.getElementById("parent-story-copy");
    if (comic) comic.hidden = false;
    if (copy) {
      copy.textContent = Game.comicUnlocked(roster)
        ? "Bennett earned three teammates. Story is on his HUD now. You can still preview."
        : "Parents can always preview. Bennett’s HUD shows Story after three teammates unlock.";
    }
  }

  function renderCharLibrary() {
    const box = document.getElementById("char-library");
    const grid = document.getElementById("char-lib-grid");
    if (!box || !grid) return;
    if (!selectedCharId) {
      box.hidden = true;
      return;
    }
    const ch = findChar(selectedCharId);
    box.hidden = false;
    const funMode = selectedCharId === "fun";
    document.getElementById("char-lib-title").textContent = funMode
      ? "Fun / Sounds"
      : ((ch ? Game.characterLabel(ch) : selectedCharId) + " library");
    const lead = document.getElementById("char-lib-lead");
    if (lead) {
      lead.textContent = funMode
        ? "Meme-style sounds and links. Attach one to a streak to unlock it for Bennett, or to a story / week beat."
        : "Assets for this teammate, plus Fun sounds. Attach one to a streak reward or a story / week beat.";
    }
    const items = Game.libraryFor(library, selectedCharId, false);
    const fun = funMode ? [] : Game.libraryFor(library, "fun", false);
    const crew = funMode ? [] : Game.libraryFor(library, "crew", false);
    const showFun = fun.length ? `
      <h3 class="lib-sub">Fun / Sounds</h3>
      <div class="lib-grid">${fun.map((item) => libPickCard(item, false)).join("")}</div>
    ` : "";
    const showCrew = crew.length ? `
      <h3 class="lib-sub">Crew (team story beats)</h3>
      <div class="lib-grid">${crew.map((item) => libPickCard(item, true)).join("")}</div>
    ` : "";
    grid.innerHTML = (items.length
      ? items.map((item) => libPickCard(item, false)).join("")
      : `<p class="empty">${funMode ? "No Fun sounds yet. Drop audio on Admin." : "No files tagged to this teammate yet. Add them on Admin."}</p>`) + showFun + showCrew;
    box.querySelectorAll("[data-pick-lib]").forEach((b) => {
      b.addEventListener("click", () => {
        selectedLibId = b.dataset.pickLib;
        renderCharLibrary();
      });
    });
    fillAttachStreaks();
  }

  function libPickCard(item, crew) {
    return `
      <article class="lib-card ${selectedLibId === item.id ? "selected" : ""} ${crew ? "crew" : ""}">
        <button type="button" class="lib-media" data-pick-lib="${Game.esc(item.id)}">
          ${Game.libraryThumbHtml(item)}
        </button>
        <h3>${item.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(item.label)}</h3>
        <p>${Game.esc(Game.libraryKindLabel(item))} · ${Game.esc(item.character)}</p>
      </article>`;
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
    if (!box) return;
    const list = (family.story && family.story.ingredients) || [];
    const note = document.getElementById("story-note");
    if (note && document.activeElement !== note) note.value = (family.story && family.story.includeNote) || "";
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

  function renderAskInbox() {
    const box = document.getElementById("ask-inbox");
    if (!box) return;
    const messages = (Game.getAskThread().messages || []);
    const climbs = (Game.getBasecamp(family).sessions || []).slice().sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));
    if (!messages.length && !climbs.length) {
      box.innerHTML = `<p class="empty">He has not asked Jungle Jam Tutor yet. <a href="basecamp.html">Base Camp</a></p>`;
      return;
    }
    const camp = climbs.map((s) => `
      <article class="inbox-card">
        <h3>Base Camp · ${Game.esc(Game.classNameForId(s.classId) || s.classId || "Class")} · ${Game.esc(s.title || "New climb")}</h3>
        <p>${Game.esc(((s.messages || []).slice(-1)[0] || {}).text || "No messages yet.")}</p>
        <p>${Game.esc(Game.fmtStamp(s.updated))}</p>
      </article>`).join("");
    const old = messages.slice().reverse().map((m) => `
      <article class="inbox-card">
        <h3>${m.test ? '<span class="test-tag">TEST</span> ' : ""}${m.role === "mentor" ? "Jungle Jam Tutor" : "Bennett"} · Ask AI</h3>
        <p>${Game.esc(m.text)}</p>
        <p>${Game.esc(Game.fmtStamp(m.at))}${m.title ? " · " + Game.esc(m.title) : ""}</p>
      </article>
    `).join("");
    box.innerHTML = camp + old;
  }

  function blankChar() {
    return { id: "", name: "", talent: "", tagline: "", status: "coming", video: "", poster: "", test: false };
  }

  function fillCharForm(ch) {
    document.getElementById("char-name").value = ch.name || "";
    document.getElementById("char-talent").value = ch.talent || "";
    document.getElementById("char-tagline").value = ch.tagline || "";
    document.getElementById("char-status").value = ch.status || "coming";
    document.getElementById("char-video").value = ch.video || "";
    document.getElementById("char-poster").value = ch.poster || "";
    document.getElementById("char-test").checked = !!ch.test;
    renderPosterPicker();
  }

  function collectChar() {
    const prev = editingCharId ? findChar(editingCharId) || {} : {};
    const name = document.getElementById("char-name").value.trim();
    return Object.assign({}, prev, {
      id: editingCharId || slug(name || "character") + "-" + Date.now().toString(36),
      name,
      talent: document.getElementById("char-talent").value.trim(),
      tagline: document.getElementById("char-tagline").value.trim(),
      status: document.getElementById("char-status").value || "coming",
      video: document.getElementById("char-video").value.trim(),
      poster: document.getElementById("char-poster").value.trim(),
      test: document.getElementById("char-test").checked
    });
  }

  function openCharForm(id) {
    editingCharId = id || null;
    fillCharForm(id ? (findChar(id) || blankChar()) : blankChar());
    document.getElementById("char-editor").hidden = false;
    document.getElementById("char-editor-title").textContent = id ? "Edit character" : "New character";
    document.getElementById("char-name").focus();
  }

  function closeCharForm() {
    editingCharId = null;
    document.getElementById("char-editor").hidden = true;
  }

  function blank() {
    return {
      id: "",
      title: "",
      description: "",
      how: "",
      incentive: "",
      icon: "badge",
      test: false,
      reward: 10,
      rewardCharacter: "",
      rewardUnlock: null,
      rewardMedia: "",
      streak: { target: 1, unit: "time" }
    };
  }

  function fillForm(ach) {
    document.getElementById("title").value = ach.title || "";
    document.getElementById("description").value = ach.description || "";
    document.getElementById("how").value = ach.how || "";
    document.getElementById("incentive").value = ach.incentive || "";
    document.getElementById("icon").value = ach.icon || "badge";
    document.getElementById("badge").value = ach.badge || "";
    document.getElementById("reward").value = Game.bananasOf(ach) || 10;
    document.getElementById("test").checked = !!ach.test;
    document.getElementById("target").value = (ach.streak && ach.streak.target) || 1;
    document.getElementById("unit").value = (ach.streak && ach.streak.unit) || "week";
    const rule = ach.unlock || {};
    document.getElementById("unlock-type").value = rule.type || "parent_award";
    document.getElementById("unlock-count").value = rule.count || (ach.streak && ach.streak.target) || 1;
    document.getElementById("unlock-hours").value = rule.hours || 24;
    document.getElementById("award-do").value = ach.intent || ach.how || ach.description || "";
    paintAwardReadout(Game.parseAwardIntent(document.getElementById("award-do").value));
    const unlock = Game.rewardUnlockOf(ach);
    document.getElementById("reward-type").value = unlock ? unlock.type : "";
    fillRewardSelect(unlock && unlock.type === "character" ? unlock.id : (ach.rewardCharacter || ""));
    document.getElementById("reward-unlock-id").value = unlock && unlock.type !== "character" && unlock.type !== "content" ? unlock.id : "";
    document.getElementById("reward-unlock-label").value = unlock && unlock.type !== "character" && unlock.type !== "content" ? (unlock.label || "") : "";
    fillRewardContent(unlock && unlock.type === "content" ? unlock.id : "");
    fillRewardMedia(document.getElementById("reward-character").value, ach.rewardMedia || "");
    syncRewardTypeUi();
    const extra = document.getElementById("award-extra-unlock");
    if (extra) extra.open = !!(unlock && unlock.type && unlock.type !== "character");
    renderBadgePicker();
    renderPosterPicker();
    renderGivePicker();
    renderEarnPicker();
  }

  function slug(title) {
    return (title || "achievement")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "achievement";
  }

  function collect() {
    const prev = editingId ? pack.achievements.find((a) => a.id === editingId) || {} : {};
    const rewardType = document.getElementById("reward-type").value || "";
    const rewardCharacter = document.getElementById("reward-character").value || "";
    const bananas = Number(document.getElementById("reward").value) || 0;
    const badge = (document.getElementById("badge") || {}).value || "";
    const next = Object.assign({}, prev, {
      id: editingId || slug(document.getElementById("title").value) + "-" + Date.now().toString(36),
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      how: document.getElementById("how").value.trim(),
      incentive: document.getElementById("incentive").value.trim(),
      icon: document.getElementById("icon").value,
      intent: (document.getElementById("award-do") || {}).value.trim(),
      test: document.getElementById("test").checked,
      reward: bananas,
      streak: {
        target: Number(document.getElementById("target").value) || 1,
        unit: document.getElementById("unit").value.trim() || "week"
      }
    });
    if (badge) next.badge = badge;
    else delete next.badge;
    const unlockType = (document.getElementById("unlock-type") || {}).value || "parent_award";
    const unlockCount = Number((document.getElementById("unlock-count") || {}).value) || 1;
    const unlockHours = Number((document.getElementById("unlock-hours") || {}).value) || 24;
    if (unlockType === "login_days" || unlockType === "login_total" || unlockType === "done_count") {
      next.unlock = { type: unlockType, count: unlockCount };
    } else if (unlockType === "open_touched") {
      next.unlock = { type: "open_touched" };
    } else if (unlockType === "class_tour") {
      next.unlock = { type: "class_tour", hours: unlockHours };
    } else if (unlockType === "easter_egg" && prev.unlock && prev.unlock.type === "easter_egg") {
      next.unlock = prev.unlock;
    } else {
      delete next.unlock;
    }
    delete next.rewardUnlock;
    delete next.rewardCharacter;
    delete next.bananas;
    if (rewardType === "character" && rewardCharacter) {
      next.rewardCharacter = rewardCharacter;
      next.rewardUnlock = { type: "character", id: rewardCharacter, label: Game.characterLabel(findChar(rewardCharacter), rewardCharacter) };
    } else if (rewardType === "content") {
      const item = Game.libraryItem(library, document.getElementById("reward-content").value);
      if (item) {
        next.rewardUnlock = { type: "content", id: item.id, label: item.label };
        next.rewardMedia = item.id;
      }
    } else if (rewardType && rewardType !== "character") {
      const id = document.getElementById("reward-unlock-id").value.trim() || slug(document.getElementById("reward-unlock-label").value || rewardType);
      const label = document.getElementById("reward-unlock-label").value.trim() || id;
      next.rewardUnlock = { type: rewardType, id, label };
    }
    if (rewardType !== "content") {
      const media = document.getElementById("reward-media").value || "";
      if (media) {
        next.rewardMedia = media;
        const item = Game.libraryItem(library, media);
        if (!next.rewardUnlock && item && Game.isGatedLibraryItem(item)) {
          next.rewardUnlock = { type: "content", id: item.id, label: item.label };
        }
      } else delete next.rewardMedia;
    }
    return next;
  }

  function openForm(id) {
    editingId = id || null;
    const ach = id ? pack.achievements.find((a) => a.id === id) : blank();
    fillForm(ach || blank());
    document.getElementById("editor").hidden = false;
    document.getElementById("editor-title").textContent = id ? "Edit reward" : "Schedule a reward";
    const focusEl = document.getElementById("title");
    if (focusEl && id) focusEl.focus();
  }

  function closeForm() {
    editingId = null;
    document.getElementById("editor").hidden = true;
  }

  async function boot() {
    bindParentTabs();
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    family = Game.ensureReflectionPool(family);
    family = Game.maybeAutoPreviewAll(pack, family).family;
    roster = await Game.loadCharacters();
    library = await Game.loadLibrary();
    baseWeek = Game.ensureWeekIds(await Game.loadWeek() || { work: [], events: [], notes: [] });
    baseSeed = await Game.loadProgress();
    week = Game.applyWeekOverlay(baseWeek, family);
    if (!pack.currency) pack.currency = { name: "bananas", singular: "banana", emoji: "🍌" };
    if (!Array.isArray(pack.achievements)) pack.achievements = [];
    family = Game.normalizeFamily(family);
    hud();
    fillRewardSelect("");
    fillRewardContent("");

    document.getElementById("icon").innerHTML = ICONS.map((i) => `<option value="${i}">${i}</option>`).join("");
    fillTargets();
    document.getElementById("close-sheet").addEventListener("click", closeSheet);
    document.getElementById("sheet").addEventListener("click", (e) => {
      if (e.target.id === "sheet") closeSheet();
    });
    const awardDo = document.getElementById("award-do");
    if (awardDo) {
      awardDo.addEventListener("input", () => applyAwardIntent({ fillEmpty: true }));
    }
    const givePicker = document.getElementById("give-picker");
    if (givePicker) {
      givePicker.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-give]") : null;
        if (!btn) return;
        applyGivePick(btn.getAttribute("data-give") || "");
      });
    }
    const earnPicker = document.getElementById("earn-picker");
    if (earnPicker) {
      earnPicker.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-earn]") : null;
        if (!btn) return;
        applyEarnChip(btn.getAttribute("data-earn") || "parent_award");
      });
    }
    const earnCount = document.getElementById("unlock-count");
    if (earnCount) {
      earnCount.addEventListener("input", () => {
        const type = (document.getElementById("unlock-type") || {}).value || "";
        if (earnCountNeeded(type)) applyEarnChip(type, { keepCount: true });
      });
    }
    const badgePicker = document.getElementById("badge-picker");
    if (badgePicker) {
      badgePicker.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-badge]") : null;
        if (!btn) return;
        applyBadgeChoice(btn.getAttribute("data-badge"));
      });
    }
    const posterPicker = document.getElementById("char-poster-picker");
    if (posterPicker) {
      posterPicker.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-poster]") : null;
        if (!btn) return;
        document.getElementById("char-poster").value = btn.getAttribute("data-poster") || "";
        renderPosterPicker();
      });
    }
    const charPick = document.getElementById("reward-char-pick");
    if (charPick) {
      charPick.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-reward-char]") : null;
        if (!btn) return;
        document.getElementById("reward-character").value = btn.getAttribute("data-reward-char") || "";
        syncRewardTypeUi();
      });
    }
    const gearPick = document.getElementById("reward-gear-pick");
    if (gearPick) {
      gearPick.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("[data-reward-gear]") : null;
        if (!btn) return;
        document.getElementById("reward-unlock-id").value = btn.getAttribute("data-reward-gear") || "";
        document.getElementById("reward-unlock-label").value = btn.getAttribute("data-reward-label") || "";
        renderRewardPicks();
      });
    }

    document.getElementById("preview-unlock-all").addEventListener("click", () => {
      if (Game.siteViewHidesAdult()) return;
      const result = Game.awardAllPreview(pack, family);
      family = result.family;
      persistFamily();
      Game.toast("Preview on. Every reward is unlocked on this device. Walk the trophy room, then lock them back.");
    });
    document.getElementById("preview-lock-back").addEventListener("click", () => {
      const result = Game.revokeAllPreview(pack, family);
      family = result.family;
      persistFamily();
      Game.toast("Preview off. Bennett is back to earned-only on this device.");
    });
    document.getElementById("add").addEventListener("click", () => {
      setParentTab("awards");
      openForm(null);
    });
    document.getElementById("cancel").addEventListener("click", closeForm);
    document.getElementById("add-char").addEventListener("click", () => {
      setParentTab("crew");
      openCharForm(null);
    });
    document.getElementById("cancel-char").addEventListener("click", closeCharForm);
    document.getElementById("save-char").addEventListener("click", () => {
      const next = collectChar();
      if (!next.name && next.id !== "slot-3") {
        Game.toast("Add a name, or keep the #3 slot.");
        return;
      }
      const idx = roster.characters.findIndex((c) => c.id === next.id);
      if (idx >= 0) roster.characters[idx] = next;
      else roster.characters.push(next);
      persistChars();
      closeCharForm();
    });
    document.getElementById("download-chars").addEventListener("click", () => {
      Game.downloadJson("characters.json", roster);
      Game.toast("Downloaded the character roster.");
    });
    document.getElementById("save").addEventListener("click", () => {
      syncIntentIntoForm();
      const next = collect();
      if (!next.title) {
        Game.toast("Add a title first.");
        return;
      }
      upsertAch(next);
      persistAch();
      closeForm();
    });
    const testBtn = document.getElementById("award-test");
    if (testBtn) testBtn.addEventListener("click", testFromForm);

    document.getElementById("add-class").addEventListener("click", () => {
      const input = document.getElementById("new-class-name");
      const name = (input.value || "").trim();
      if (!name) {
        Game.toast("Add a class name first.");
        return;
      }
      const before = progressClasses();
      if (before.some((cls) => String(cls.name || "").toLowerCase() === name.toLowerCase())) {
        Game.toast("That class is already on the list.");
        return;
      }
      family = Game.addProgressClass(family, name, baseSeed);
      input.value = "";
      Game.toast("Class saved on this device. Export the family pack to share.");
      renderClassRoster();
    });

    document.getElementById("add-prompt").addEventListener("click", () => {
      const text = (document.getElementById("new-prompt").value || "").trim();
      if (!text) {
        Game.toast("Write a prompt first.");
        return;
      }
      family.reflections.pool.push({ id: Game.uid("r"), text, test: document.getElementById("prompt-test").checked });
      document.getElementById("new-prompt").value = "";
      family = Game.stampReflectionsOnFamily(family);
      persistFamily();
    });

    document.getElementById("add-note").addEventListener("click", () => {
      const token = document.getElementById("note-target").value;
      const text = (document.getElementById("parent-note").value || "").trim();
      if (!token || !text) {
        Game.toast("Pick an item and write a note.");
        return;
      }
      const [targetType, targetId] = token.split(":");
      family = Game.addNote(family, {
        id: Game.uid("note"),
        targetType,
        targetId,
        from: Game.parentNoteFrom(),
        kind: "note",
        text,
        at: Game.nowIso()
      });
      document.getElementById("parent-note").value = "";
      Game.toast("Note saved on that item.");
      renderInbox();
    });

    document.getElementById("download-ach").addEventListener("click", () => {
      Game.downloadJson("achievements.json", pack);
      Game.toast("Downloaded the streak catalog.");
    });

    document.getElementById("reward-type").addEventListener("change", syncRewardTypeUi);
    document.getElementById("reward-character").addEventListener("change", syncRewardTypeUi);
    const pickFun = document.getElementById("pick-fun");
    if (pickFun) {
      pickFun.addEventListener("click", () => {
        setParentTab("crew");
        selectedCharId = "fun";
        selectedLibId = null;
        renderCharacters();
        renderCharLibrary();
      });
    }
    document.getElementById("add-ingredient").addEventListener("click", () => {
      const text = (document.getElementById("new-ingredient").value || "").trim();
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
      family.story.includeNote = (document.getElementById("story-note").value || "").trim();
      persistFamily();
      Game.toast(family.story.includeNote ? "Story will include that parent note." : "No parent note — story will skip it.");
    });
    document.getElementById("attach-media").addEventListener("click", () => {
      if (!selectedLibId) {
        Game.toast("Pick a file from this character’s library first.");
        return;
      }
      const streakId = document.getElementById("attach-streak").value;
      const beatId = document.getElementById("attach-beat").value;
      if (!streakId && !beatId) {
        Game.toast("Pick a streak or a story beat.");
        return;
      }
      if (streakId) {
        const ach = pack.achievements.find((a) => a.id === streakId);
        const item = Game.libraryItem(library, selectedLibId);
        if (ach) {
          ach.rewardMedia = selectedLibId;
          if (item && (item.kind === "audio" || item.kind === "link" || item.character === "fun")) {
            ach.rewardUnlock = { type: "content", id: item.id, label: item.label };
          }
          Game.saveMomDraft(pack);
        }
      }
      if (beatId) {
        family.story.attachments[beatId] = selectedLibId;
        Game.saveFamily(family);
      }
      persistFamily();
      renderAchievements();
      Game.toast("Attached on this device. Export the family pack to share.");
    });

    document.getElementById("export").addEventListener("click", async () => {
      const result = await Game.exportFamilyPack(pack, family, roster, library);
      Game.downloadJson("bennett-week-export.json", result.pack);
      if (result.skipped.length) {
        Game.toast("Pack saved. Skipped huge files (over 2 MB): " + result.skipped.join(", "));
      } else {
        Game.toast("Downloaded the family pack. The other parent can import it.");
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
          week = Game.applyWeekOverlay(baseWeek, family);
          fillRewardSelect("");
          fillRewardContent("");
          renderAchievements();
          renderCharacters();
          renderCharLibrary();
          renderInbox();
          renderAskInbox();
          renderPool();
          renderDailyAnswers();
          renderIngredients();
          renderCues();
          renderClassRoster();
          fillTargets();
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

    const pick = new URLSearchParams(location.search).get("char");
    if (pick && findChar(pick)) selectedCharId = pick;

    document.getElementById("reset").addEventListener("click", async () => {
      if (!confirm("Clear this device's parent-desk draft and reload the repo files?")) return;
      Game.clearMomDraft();
      Game.clearFamilyDraft();
      Game.clearMomCharacters();
      Game.clearMomLibrary();
      pack = await Game.loadAchievements();
      family = await Game.loadFamily();
      roster = await Game.loadCharacters();
      library = await Game.loadLibrary();
      week = Game.applyWeekOverlay(baseWeek, family);
      selectedCharId = null;
      fillRewardSelect("");
      fillRewardContent("");
      renderAchievements();
      renderCharacters();
      renderCharLibrary();
      renderInbox();
      renderAskInbox();
      renderPool();
      renderDailyAnswers();
      renderIngredients();
      renderCues();
      renderClassRoster();
      fillTargets();
      closeForm();
      closeCharForm();
      document.getElementById("draft-flag").hidden = true;
      Game.toast("Back to the repo files.");
    });

    renderAchievements();
    renderTrophyOrder();
    renderCharacters();
    renderCharLibrary();
    renderInbox();
    renderAskInbox();
    renderPool();
    renderDailyAnswers();
    renderIngredients();
    renderCues();
    renderClassRoster();
    document.getElementById("draft-flag").hidden = !(Game.usingMomDraft() || Game.usingFamilyDraft() || Game.usingMomCharacters() || Game.usingMomLibrary());
    (async () => {
      try {
        const synced = await Game.syncFamilyBoard(family);
        family = synced.family;
        paintBoardSync(synced);
        week = Game.applyWeekOverlay(baseWeek, family);
        const livePack = Game.getMomDraft();
        if (livePack && Array.isArray(livePack.achievements) && livePack.achievements.length) pack = livePack;
        renderAchievements();
        renderInbox();
        renderAskInbox();
        renderPool();
        renderDailyAnswers();
        renderCues();
      } catch (_) {}
      if (Game.pushLocalLibraryToCloud) {
        try { library = await Game.pushLocalLibraryToCloud(library); } catch (_) {}
      }
    })();
  }

  boot();
})();
