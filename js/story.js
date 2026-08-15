(function () {
  let pack = null;
  let roster = null;
  let family = null;
  let library = null;
  let story = null;
  let preview = false;
  let nodeId = "";
  let startNode = "";

  function nodes() {
    const list = (story && story.nodes) || [];
    const map = {};
    list.forEach((n) => {
      if (n && n.id) map[n.id] = n;
    });
    return map;
  }

  function findNode(id) {
    return nodes()[id] || null;
  }

  function attachedItem(node) {
    return Game.attachedLibraryItem(family, library, node && node.id);
  }

  function nodeArt(node) {
    const attach = attachedItem(node);
    if (attach && (attach.kind === "image" || attach.kind === "video")) return attach;
    return Game.libraryItem(library, (node && node.image) || "");
  }

  function choiceReady(choice) {
    if (preview) return true;
    if (choice.requireAny && choice.requireAny.length) {
      return choice.requireAny.some((req) => Game.hasUnlock(req));
    }
    return Game.hasUnlock(choice.require);
  }

  function extrasHtml() {
    const bits = [];
    const ingredients = ((family.story && family.story.ingredients) || []).filter((row) => row && row.text);
    if (ingredients.length) {
      bits.push(`<p class="story-ingredient">${ingredients.some((r) => r.test) ? '<span class="test-tag">TEST</span> ' : ""}Crew brief: ${Game.esc(ingredients.map((r) => r.text).join(" · "))}</p>`);
    }
    const note = family.story && family.story.includeNote;
    if (note) {
      bits.push(`<p class="story-parent">Parent folded this in: ${Game.esc(note)}</p>`);
    }
    const reflection = Game.latestReflection(family);
    if (reflection && reflection.text) {
      bits.push(`<p class="story-kid">${reflection.test ? '<span class="test-tag">TEST</span> ' : ""}Bennett’s last check-in: ${Game.esc(reflection.text)}</p>`);
    }
    const asked = Game.latestBennettQuestion(family);
    if (asked && asked.text) {
      bits.push(`<p class="story-kid">${asked.test ? '<span class="test-tag">TEST</span> ' : ""}He already asked: ${Game.esc(asked.text)}</p>`);
    }
    return bits.join("");
  }

  function renderArt(node) {
    const host = document.getElementById("story-art");
    const item = nodeArt(node);
    const sound = attachedItem(node);
    const playable = sound && (sound.kind === "audio" || sound.kind === "link") && Game.canPlayLibraryItem(sound, preview);
    let art = "";
    if (!item) {
      art = `<div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>Art coming</p></div>`;
    } else if (item.kind === "video") {
      art = `<video src="${Game.esc(Game.librarySrc(item))}" poster="${Game.esc(item.poster || "")}" controls playsinline ${Game.prefersReducedMotion() ? "" : "autoplay"} muted></video>`;
    } else if (item.kind === "image") {
      art = `<img src="${Game.esc(Game.librarySrc(item))}" alt="${Game.esc(item.label || "")}">`;
    } else {
      art = Game.libraryThumbHtml(item, "lib-play");
    }
    const soundBar = playable
      ? `<div class="story-sound">${sound.kind === "link"
        ? `<a class="btn" href="${Game.esc(Game.librarySrc(sound))}" target="_blank" rel="noopener">Open</a>`
        : `<button type="button" class="btn primary" data-play-story="${Game.esc(sound.id)}">Play sound</button>`}</div>`
      : "";
    host.innerHTML = art + soundBar;
    host.querySelectorAll("[data-play-story]").forEach((b) => {
      b.addEventListener("click", () => {
        const row = Game.libraryItem(library, b.dataset.playStory);
        if (row) Game.playLibraryItem(row);
      });
    });
  }

  function go(id) {
    const node = findNode(id);
    if (!node) {
      Game.toast("That page is missing.");
      return;
    }
    nodeId = node.id;
    document.getElementById("story-kicker").textContent = node.kicker || story.kicker || "Issue 1";
    document.getElementById("story-title").textContent = node.title || "";
    document.getElementById("story-text").textContent = node.text || "";
    document.getElementById("story-extras").innerHTML = (node.id === "start" || node.end) ? extrasHtml() : "";
    renderArt(node);
    renderSchool(node);
    renderChoices(node);
  }

  function renderSchool(node) {
    const box = document.getElementById("story-school");
    const school = node.school;
    if (!school) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    box.hidden = false;
    const opts = (school.options || []).map((opt) => `
      <button type="button" class="btn story-choice" data-school="${Game.esc(opt.id)}">${Game.esc(opt.label)}</button>
    `).join("");
    box.innerHTML = `
      <p class="story-school-prompt">${Game.esc(school.prompt || "Think it through.")}</p>
      <div class="story-choices">${opts}</div>
    `;
    box.querySelectorAll("[data-school]").forEach((b) => {
      b.addEventListener("click", () => {
        const opt = (school.options || []).find((row) => row.id === b.dataset.school);
        if (!opt) return;
        if (opt.ok) {
          Game.toast("Clean panel. Words count.");
          go(school.correct || "finale");
        } else {
          Game.toast("Burned. Not out. Try again.");
          go(school.wrong || "scorch-recover");
        }
      });
    });
  }

  function renderChoices(node) {
    const host = document.getElementById("story-choices");
    if (node.school) {
      host.innerHTML = "";
      return;
    }
    const choices = node.choices || [];
    if (!choices.length) {
      host.innerHTML = node.end ? `<a class="btn primary" href="characters.html">Back to the crew</a>` : "";
      return;
    }
    host.innerHTML = choices.map((choice) => {
      const open = choiceReady(choice);
      if (!open) {
        return `<button type="button" class="btn story-choice locked" disabled>Locked gear — keep the streak going</button>`;
      }
      return `<button type="button" class="btn primary story-choice" data-to="${Game.esc(choice.to)}">${Game.esc(choice.label)}</button>`;
    }).join("");
    host.querySelectorAll("[data-to]").forEach((b) => {
      b.addEventListener("click", () => go(b.dataset.to));
    });
  }

  function showGate() {
    document.getElementById("story-gate").hidden = false;
    document.getElementById("story-panel").hidden = true;
  }

  function showStory() {
    document.getElementById("story-gate").hidden = true;
    document.getElementById("story-panel").hidden = false;
    const want = startNode && findNode(startNode) ? startNode : (story.start || "start");
    go(want);
  }

  async function boot() {
    const params = new URLSearchParams(location.search);
    preview = params.get("preview") === "1" || params.get("from") === "parent";
    startNode = params.get("node") || "";
    pack = await Game.loadAchievements();
    roster = await Game.loadCharacters();
    family = await Game.loadFamily();
    library = await Game.loadLibrary();
    story = await Game.loadStory();
    const bananas = document.getElementById("bananas");
    if (bananas) bananas.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    document.getElementById("preview-flag").hidden = !preview;
    document.getElementById("story-resources").innerHTML = Game.khanStripHtml("English 10 comic strips notebook names");
    if (!preview && !Game.comicUnlocked(roster)) {
      showGate();
      return;
    }
    showStory();
  }

  boot();
})();
