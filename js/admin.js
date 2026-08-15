(function () {
  const GROUPS = [
    { id: "ace", title: "Ace" },
    { id: "riff", title: "Riff" },
    { id: "scorch", title: "Scorch" },
    { id: "crew", title: "Crew" },
    { id: "fun", title: "Fun / Sounds" }
  ];

  const GROUP_BLURB = {
    ace: "Locker clip and stills for this teammate.",
    riff: "Locker clip and stills for this teammate.",
    scorch: "Locker clip and stills for this teammate.",
    crew: "Ace + Riff + Scorch together. Comic stills and the adventure clip.",
    fun: "Meme-style unlocks and sounds. Award a streak so Bennett can play them later."
  };

  let pack = null;
  let family = null;
  let roster = null;
  let library = null;

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
    const badge = item.kind === "video" || item.kind === "audio"
      ? '<span class="lib-play-badge">Play</span>'
      : item.kind === "link" ? '<span class="lib-play-badge">Open</span>' : "";
    return `
      <article class="lib-card">
        <button type="button" class="lib-media" data-preview="${Game.esc(item.id)}" aria-label="Preview ${Game.esc(item.label)}">
          ${Game.libraryThumbHtml(item)}
          ${badge}
        </button>
        <h3>${item.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(item.label)}</h3>
        <p>${Game.esc(Game.libraryKindLabel(item))} · ${Game.esc(detail)}</p>
        <label>Tag
          <select data-tag="${Game.esc(item.id)}">${tagSelect(item)}</select>
        </label>
        <div class="parent-actions">
          <button type="button" class="tiny" data-preview="${Game.esc(item.id)}">Preview</button>
          <button type="button" class="tiny danger" data-del-lib="${Game.esc(item.id)}">Delete</button>
        </div>
      </article>`;
  }

  function renderLibrary() {
    const host = document.getElementById("library-groups");
    host.innerHTML = GROUPS.map((g) => {
      const items = Game.libraryFor(library, g.id, false);
      const body = items.length
        ? `<div class="lib-grid">${items.map(cardHtml).join("")}</div>`
        : `<p class="empty">No files tagged ${Game.esc(g.title)} yet.</p>`;
      return `
        <section class="lib-group">
          <h2>${Game.esc(g.title)}</h2>
          <p>${Game.esc(GROUP_BLURB[g.id] || "")}</p>
          ${body}
        </section>`;
    }).join("");

    host.querySelectorAll("[data-preview]").forEach((b) => {
      b.addEventListener("click", () => {
        const item = Game.libraryItem(library, b.dataset.preview);
        if (item) previewItem(item);
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
      let last = null;
      let added = 0;
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const result = await Game.addDeviceLibraryFile(library, file);
        if (!result.ok) {
          Game.toast("Skip " + (file.name || "that file") + " — use mp3, wav, ogg, m4a, or an image/video.");
          continue;
        }
        library = result.library;
        last = result.item;
        added += 1;
      }
      document.getElementById("lib-files").value = "";
      if (!added) return;
      persistLib();
      if (last) previewItem(last);
    }

    const drop = document.getElementById("lib-drop");
    const picker = document.getElementById("lib-files");
    const pickBtn = document.getElementById("lib-pick");
    function openPicker() {
      picker.click();
    }
    pickBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPicker();
    });
    drop.addEventListener("click", (e) => {
      if (e.target === pickBtn || pickBtn.contains(e.target)) return;
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
