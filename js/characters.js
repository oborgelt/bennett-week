(function () {
  let pack = null;
  let roster = null;

  function hud() {
    const el = document.getElementById("bananas");
    if (el) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
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
  }

  function renderLoadout() {
    const grid = document.getElementById("loadout-grid");
    if (!grid) return;
    const gear = Game.unlockedGear();
    const cards = gear.map((g) => `
      <article class="loadout-card ready">
        <p class="loadout-type">${Game.esc(g.type)}</p>
        <h3>${Game.esc(g.label || g.id)}</h3>
      </article>
    `);
    const lockedSlots = Math.max(0, 2 - gear.length);
    for (let i = 0; i < lockedSlots; i += 1) {
      cards.push(`
        <article class="loadout-card locked">
          <div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>Locked</p></div>
        </article>
      `);
    }
    grid.innerHTML = cards.join("");
  }

  async function boot() {
    pack = await Game.loadAchievements();
    roster = await Game.loadCharacters();
    await Game.loadFamily();
    hud();
    render();
    Game.maybePlayUnlockCelebration(roster);
  }

  boot();
})();
