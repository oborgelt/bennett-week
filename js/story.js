(function () {
  let pack = null;
  let roster = null;
  let family = null;

  function showGate() {
    document.getElementById("story-gate").hidden = false;
    document.getElementById("story-panel").hidden = true;
  }

  function showComingSoon() {
    document.getElementById("story-gate").hidden = true;
    const panel = document.getElementById("story-panel");
    panel.hidden = false;
    const title = document.getElementById("story-title");
    const text = document.getElementById("story-text");
    if (title) title.textContent = "Coming soon";
    if (text) text.textContent = "The comic is not ready yet. Check back later.";
  }

  async function boot() {
    const params = new URLSearchParams(location.search);
    const preview = params.get("preview") === "1" || params.get("from") === "parent";
    pack = await Game.loadAchievements();
    roster = await Game.loadCharacters();
    family = await Game.loadFamily();
    family = Game.maybeAutoPreviewAll(pack, family).family;
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
    showComingSoon();
  }

  boot();
})();
