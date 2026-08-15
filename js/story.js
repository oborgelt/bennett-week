(function () {
  let pack = null;
  let roster = null;
  let family = null;
  let library = null;
  let story = null;
  let preview = false;
  let nodeId = "";

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

  function attachedImage(node) {
    const attach = family.story && family.story.attachments && node && family.story.attachments[node.id];
    const key = attach || (node && node.image) || "";
    return Game.libraryItem(library, key);
  }

  function choiceReady(choice) {
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

  function renderArt(item) {
    const host = document.getElementById("story-art");
    if (!item) {
      host.innerHTML = `<div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>Art coming</p></div>`;
      return;
    }
    if (item.kind === "video") {
      host.innerHTML = `<video src="${Game.esc(item.path)}" poster="${Game.esc(item.poster || "")}" controls playsinline ${Game.prefersReducedMotion() ? "" : "autoplay"} muted></video>`;
    } else {
      host.innerHTML = `<img src="${Game.esc(item.path)}" alt="${Game.esc(item.label || "")}">`;
    }
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
    renderArt(attachedImage(node));
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
    go(story.start || "start");
  }

  async function boot() {
    preview = /(?:\?|&)preview=1(?:&|$)/.test(location.search) || /(?:\?|&)from=parent(?:&|$)/.test(location.search);
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
