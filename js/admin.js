(function () {
  const GROUPS = [
    { id: "ace", title: "Ace" },
    { id: "riff", title: "Riff" },
    { id: "scorch", title: "Scorch" },
    { id: "deuce", title: "Deuce" },
    { id: "fuzz", title: "Fuzz" },
    { id: "crew", title: "Crew" },
    { id: "fun", title: "Fun / Sounds" }
  ];

  const GROUP_BLURB = {
    ace: "Locker clip and stills for this teammate.",
    riff: "Locker clip and stills for this teammate.",
    scorch: "Locker clip and stills for this teammate.",
    deuce: "Locker clip and stills for this teammate.",
    fuzz: "Locker clip and stills for this teammate.",
    crew: "Ace + Riff + Scorch together. Comic stills and the adventure clip.",
    fun: "Meme-style unlocks and sounds. Award a streak so Bennett can play them later."
  };

  let pack = null;
  let family = null;
  let roster = null;
  let library = null;
  let week = { work: [], events: [] };

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
    return id !== "fun" || count <= 8;
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

  function renderLibrary() {
    const host = document.getElementById("library-groups");
    const funItems = Game.libraryFor(library, "fun", false);
    const funOpen = groupOpen("fun", funItems.length);
    const others = GROUPS.filter((g) => g.id !== "fun").map((g) => {
      const items = Game.libraryFor(library, g.id, false);
      const open = groupOpen(g.id, items.length) ? " open" : "";
      const count = items.length === 1 ? "1 file" : items.length + " files";
      const body = items.length
        ? `<div class="lib-grid">${items.map(cardHtml).join("")}</div>`
        : `<p class="empty">No files tagged ${Game.esc(g.title)} yet.</p>`;
      return `
        <details class="lib-group" data-fold="${Game.esc(g.id)}"${open}>
          <summary>
            <span>${Game.esc(g.title)}</span>
            <span class="fold-count">${Game.esc(count)}</span>
          </summary>
          <p>${Game.esc(GROUP_BLURB[g.id] || "")}</p>
          ${body}
        </details>`;
    }).join("");
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
      ${others}`;

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

  function audioOptions(selected) {
    const items = ((library && library.items) || []).filter((item) => item.kind === "audio" || item.synth);
    items.sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), undefined, { sensitivity: "base" }));
    const opts = ['<option value="">None</option>'].concat(items.map((item) => {
      const on = item.id === selected ? " selected" : "";
      return `<option value="${Game.esc(item.id)}"${on}>${Game.esc(item.label)}</option>`;
    }));
    return opts.join("");
  }

  function cueRows() {
    const rows = Game.SOUND_CUES.slice();
    (week.work || []).forEach((w) => {
      if (w && w.id) rows.push({ id: "work:" + w.id, label: "Start · " + w.title });
    });
    (week.events || []).forEach((e) => {
      if (e && e.id) rows.push({ id: "event:" + e.id, label: "Event · " + e.title });
    });
    return rows;
  }

  function renderCues() {
    const host = document.getElementById("sound-cues");
    if (!host) return;
    const cues = family.soundCues || {};
    const rows = cueRows();
    host.innerHTML = `
      <div class="form-grid cue-assign">
        <label>Moment
          <select id="cue-event">${rows.map((row) => `<option value="${Game.esc(row.id)}">${Game.esc(row.label)}</option>`).join("")}</select>
        </label>
        <label>Sound
          <select id="cue-sound">${audioOptions("")}</select>
        </label>
      </div>
      <div class="parent-actions">
        <button type="button" class="btn primary" id="cue-save">Assign sound</button>
        <button type="button" class="tiny" id="cue-play">Play</button>
      </div>
      <div class="cue-list">${rows.filter((row) => cues[row.id]).map((row) => {
        const item = Game.cueLibraryItem(family, library, row.id);
        return `
          <article class="ach-card">
            <h3>${Game.esc(row.label)}</h3>
            <p>${Game.esc(item ? item.label : "Missing file")}</p>
            <div class="parent-actions">
              <button type="button" class="tiny primary" data-cue-play="${Game.esc(row.id)}">Play</button>
              <button type="button" class="tiny danger" data-cue-clear="${Game.esc(row.id)}">Clear</button>
            </div>
          </article>`;
      }).join("") || `<p class="empty">No sounds assigned yet. Pick a moment, pick a clip, Assign sound.</p>`}</div>`;
    const eventSel = document.getElementById("cue-event");
    const soundSel = document.getElementById("cue-sound");
    function syncSoundSelect() {
      const current = (family.soundCues || {})[eventSel.value] || "";
      soundSel.innerHTML = audioOptions(current);
    }
    eventSel.addEventListener("change", syncSoundSelect);
    syncSoundSelect();
    document.getElementById("cue-save").addEventListener("click", () => {
      family = Game.setSoundCue(family, eventSel.value, soundSel.value);
      document.getElementById("draft-flag").hidden = false;
      renderCues();
      Game.toast(soundSel.value ? "Assigned on this device. Export the family pack to share." : "Cleared that moment.");
    });
    document.getElementById("cue-play").addEventListener("click", () => {
      const id = soundSel.value || (family.soundCues || {})[eventSel.value];
      const item = Game.libraryItem(library, id);
      if (!item) {
        Game.toast("Pick a sound first.");
        return;
      }
      Game.playLibraryItem(item);
    });
    host.querySelectorAll("[data-cue-play]").forEach((b) => {
      b.addEventListener("click", () => {
        if (!Game.playSoundCue(family, library, b.dataset.cuePlay)) Game.toast("That clip is missing.");
      });
    });
    host.querySelectorAll("[data-cue-clear]").forEach((b) => {
      b.addEventListener("click", () => {
        family = Game.setSoundCue(family, b.dataset.cueClear, "");
        document.getElementById("draft-flag").hidden = false;
        renderCues();
        Game.toast("Cleared.");
      });
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

  async function boot() {
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    roster = await Game.loadCharacters();
    library = await Game.loadLibrary();
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
