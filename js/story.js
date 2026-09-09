(function () {
  let pack = null;
  let roster = null;
  let family = null;
  let story = null;
  let preview = false;
  let pageId = "";

  function pages() {
    return Game.storyPages(story);
  }

  function findPage(id) {
    return pages().find((page) => page && page.id === id) || null;
  }

  function visible() {
    return Game.visibleStoryPages(story, { preview: preview });
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
    return bits.join("");
  }

  function pageSrc(page) {
    return String((page && (page.src || page.path)) || "").trim();
  }

  function pageCaption(page) {
    return String((page && (page.caption || page.text)) || "").trim();
  }

  function renderArt(page) {
    const host = document.getElementById("story-art");
    if (!host) return;
    const src = pageSrc(page);
    const caption = pageCaption(page);
    const forceVideo = !!(page && page.video);
    let media = "";
    if (forceVideo) {
      const videoSrc = src || "img/library/ace-frog.mp4";
      const poster = String((page && page.poster) || "img/story/page-07.jpg").trim();
      media = `<video src="${Game.esc(videoSrc)}" poster="${Game.esc(poster)}" controls playsinline ${Game.prefersReducedMotion() ? "" : "autoplay"} muted></video>`;
    } else if (src) {
      media = `<img src="${Game.esc(src)}" alt="${Game.esc(caption || page.kicker || "Story page")}">`;
    } else {
      media = `<div class="char-empty-slot"><span class="char-ghost" aria-hidden="true"></span><p>Art coming</p></div>`;
    }
    const balloon = (forceVideo && caption)
      ? `<p class="story-balloon">${Game.esc(caption)}</p>`
      : "";
    host.classList.toggle("has-balloon", !!balloon);
    host.innerHTML = media + balloon;
  }

  function renderPager(page) {
    const host = document.getElementById("story-choices");
    if (!host) return;
    const list = visible();
    const all = pages();
    const idx = list.findIndex((row) => row.id === page.id);
    const prev = idx > 0 ? list[idx - 1] : null;
    const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
    const more = !preview && all.length > list.length;
    const bits = [];
    if (prev) bits.push(`<button type="button" class="btn story-choice" data-to="${Game.esc(prev.id)}">Previous page</button>`);
    if (next) bits.push(`<button type="button" class="btn primary story-choice" data-to="${Game.esc(next.id)}">Next page</button>`);
    if (more) bits.push(`<p class="story-more">More tomorrow. One new page each day you open Jungle Jam.</p>`);
    if (page.end || (!next && !more && idx === list.length - 1 && list.length === all.length)) {
      bits.push(`<a class="btn" href="characters.html">Back to the crew</a>`);
    }
    host.innerHTML = bits.join("");
    host.querySelectorAll("[data-to]").forEach((b) => {
      b.addEventListener("click", () => go(b.dataset.to));
    });
  }

  function go(id) {
    const list = visible();
    const page = list.find((row) => row.id === id) || list[0] || findPage(id);
    if (!page) {
      Game.toast("That page is missing.");
      return;
    }
    if (!preview && list.indexOf(page) < 0) {
      Game.toast("That page unlocks on a later day.");
      return;
    }
    pageId = page.id;
    const kicker = document.getElementById("story-kicker");
    const title = document.getElementById("story-title");
    const text = document.getElementById("story-text");
    const extras = document.getElementById("story-extras");
    if (kicker) kicker.textContent = page.kicker || story.kicker || "Story";
    if (title) {
      title.textContent = "";
      title.hidden = true;
    }
    if (text) {
      text.textContent = "";
      text.hidden = true;
    }
    if (extras) extras.innerHTML = (page.id === (story.start || (list[0] && list[0].id)) || page.video) ? extrasHtml() : "";
    renderArt(page);
    renderPager(page);
  }

  function showGate() {
    document.getElementById("story-gate").hidden = false;
    document.getElementById("story-panel").hidden = true;
  }

  function showStory() {
    document.getElementById("story-gate").hidden = true;
    document.getElementById("story-panel").hidden = false;
    const list = visible();
    const want = pageId && list.some((row) => row.id === pageId) ? pageId : (list[0] && list[0].id);
    go(want);
  }

  async function boot() {
    const params = new URLSearchParams(location.search);
    preview = params.get("preview") === "1" || params.get("from") === "parent";
    pageId = params.get("page") || params.get("node") || "";
    pack = await Game.loadAchievements();
    roster = await Game.loadCharacters();
    family = await Game.loadFamily();
    family = Game.maybeAutoPreviewAll(pack, family).family;
    if (!preview) family = Game.recordLoginDay(family) || family;
    story = await Game.loadStory();
    const bananas = document.getElementById("bananas");
    if (bananas) bananas.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) Game.paintEggChip(pack);
    const flag = document.getElementById("preview-flag");
    if (flag) flag.hidden = !preview;
    if (!preview && !Game.comicUnlocked(roster)) {
      showGate();
      return;
    }
    showStory();
  }

  boot();
})();
