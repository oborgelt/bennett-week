(function () {
  let pack = null;
  let roster = null;
  let library = null;

  function hud() {
    const el = document.getElementById("bananas");
    if (el) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) Game.paintEggChip(pack);
  }

  function lockedCard(ch, index) {
    const coming = ch.status !== "ready" || !ch.video;
    if (coming) {
      return `
        <article class="char-card locked coming">
          <div class="char-media">
            <div class="char-empty-slot">
              <span class="char-ghost" aria-hidden="true"></span>
              <p>Coming</p>
            </div>
          </div>
          <h3>Slot ${index + 1}</h3>
          <p>Empty slot — still generating.</p>
        </article>`;
    }
    return `
      <article class="char-card locked">
        <div class="char-media">
          <img class="char-sil" src="${Game.esc(ch.poster || "img/monkey-tennis.png")}" alt="">
        </div>
        <h3>Locked</h3>
        <p>Keep the streak going.</p>
      </article>`;
  }

  function unlockedCard(ch) {
    const label = Game.characterLabel(ch);
    const media = ch.video
      ? `<video class="char-preview" src="${Game.esc(ch.video)}" poster="${Game.esc(ch.poster || "")}" controls playsinline preload="metadata"></video>`
      : ch.poster
        ? `<img class="char-preview" src="${Game.esc(ch.poster)}" alt="">`
        : `<div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>Clip coming</p></div>`;
    return `
      <article class="char-card ready unlocked">
        <div class="char-media">${media}</div>
        <h3>${ch.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(label)}</h3>
        <p class="char-talent">${ch.talent ? Game.esc(ch.talent) : ""}</p>
        <p class="char-tag">${ch.tagline ? "“" + Game.esc(ch.tagline) + "”" : ""}</p>
      </article>`;
  }

  function render() {
    const grid = document.getElementById("crew-grid");
    const chars = roster.characters || [];
    grid.innerHTML = chars.map((ch, i) => {
      return Game.alreadyUnlockedCharacter(ch.id) ? unlockedCard(ch) : lockedCard(ch, i);
    }).join("") || `<p class="empty">No teammates on the roster yet.</p>`;
    const comic = document.getElementById("comic-soon");
    if (comic) comic.hidden = !Game.comicUnlocked(roster);
    Game.paintStoryChip(roster);
    renderLoadout();
    renderSounds();
  }

  function renderLoadout() {
    const grid = document.getElementById("loadout-grid");
    if (!grid) return;
    const catalog = Game.gearLibraryItems(library);
    const seen = new Set(catalog.map((item) => item.id));
    const extras = Game.unlockedGear().filter((g) => !seen.has(g.id));
    const cards = catalog.map((item) => {
      if (!Game.alreadyUnlockedGear(item.id)) {
        return `
        <article class="loadout-card locked">
          <div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>???</p></div>
        </article>`;
      }
      const art = Game.gearThumbHtml(library, item.id, "lib-thumb")
        || `<img class="lib-thumb" src="${Game.esc(item.path || item.poster || "")}" alt="">`;
      return `
      <article class="loadout-card ready">
        <div class="loadout-media">${art}</div>
        <p class="loadout-type">${Game.esc(item.slot || "gear")}</p>
        <h3>${Game.esc(item.label || item.id)}</h3>
      </article>`;
    });
    extras.forEach((g) => {
      const item = Game.libraryItem(library, g.id);
      const art = item
        ? `<div class="loadout-media">${Game.libraryThumbHtml(item)}</div>`
        : `<div class="loadout-media"><img class="lib-thumb" src="${Game.esc("img/library/" + g.id + ".png")}" alt=""></div>`;
      cards.push(`
      <article class="loadout-card ready">
        ${art}
        <p class="loadout-type">${Game.esc(g.type || "gear")}</p>
        <h3>${Game.esc(g.label || g.id)}</h3>
      </article>`);
    });
    if (!cards.length) {
      cards.push(`
        <article class="loadout-card locked">
          <div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>???</p></div>
        </article>`);
    }
    grid.innerHTML = cards.join("");
  }

  function renderSounds() {
    const grid = document.getElementById("sound-grid");
    if (!grid) return;
    const earned = Game.unlockedContent(library).filter((row) => row.item);
    const locked = Game.lockedContentCount(library);
    const cards = earned.map((row) => {
      const item = row.item;
      const play = !Game.funPlayAllowed()
        ? ""
        : (item.kind === "link"
          ? `<button type="button" class="tiny primary" data-open-lib="${Game.esc(item.id)}">Open</button>`
          : `<button type="button" class="tiny primary" data-play-lib="${Game.esc(item.id)}">Play</button>`);
      return `
        <article class="sound-card ready">
          <div class="sound-thumb">${Game.libraryThumbHtml(item)}</div>
          <p class="loadout-type">${Game.esc(Game.libraryKindLabel(item))}</p>
          <h3>${item.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(item.label)}</h3>
          <div class="parent-actions">${play}</div>
        </article>`;
    });
    const mystery = Math.min(locked, 2);
    for (let i = 0; i < mystery; i += 1) {
      cards.push(`
        <article class="sound-card locked">
          <div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>???</p></div>
        </article>
      `);
    }
    if (!cards.length) {
      grid.innerHTML = `<p class="empty">No sounds yet — keep the streak going.</p>`;
      return;
    }
    grid.innerHTML = cards.join("");
    grid.querySelectorAll("[data-play-lib]").forEach((b) => {
      b.addEventListener("click", () => {
        const item = Game.libraryItem(library, b.dataset.playLib);
        if (item && Game.canPlayLibraryItem(item)) Game.playLibraryItem(item);
      });
    });
    grid.querySelectorAll("[data-open-lib]").forEach((b) => {
      b.addEventListener("click", () => {
        const item = Game.libraryItem(library, b.dataset.openLib);
        const src = item && Game.librarySrc(item);
        if (src && src !== "#") window.open(src, "_blank", "noopener");
        else if (item) Game.playLibraryItem(item);
      });
    });
  }

  async function boot() {
    Game.markOpened();
    pack = await Game.loadAchievements();
    roster = await Game.loadCharacters();
    let family = await Game.loadFamily();
    family = Game.recordLoginDay(family) || family;
    library = await Game.loadLibrary();
    const loginAwards = Game.playBennettLoginAwards(pack, family, library, { roster });
    family = loginAwards.family;
    hud();
    render();
    const live = Game.applyLiveUnlocks(pack, family, {});
    family = live.family;
    if (!(loginAwards.scorch && loginAwards.scorch.celebrate)) {
      live.fresh.forEach((ach) => Game.celebrate(ach, pack, library, { roster, family }));
    }
    if (!Game.maybePlayUnlockCelebration(roster, pack, family, library)) {
      Game.maybePlayContentCelebration(library);
    }
    document.addEventListener("bw-site-view", () => {
      if (!pack) return;
      const next = Game.playBennettLoginAwards(pack, family, library, { roster });
      family = next.family;
      hud();
      render();
      if (roster) Game.maybePlayUnlockCelebration(roster, pack, family, library);
    });
  }

  boot();
})();
