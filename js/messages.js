(function () {
  let family = null;
  let week = null;
  let pack = null;

  function hud() {
    const el = document.getElementById("bananas");
    if (el && pack) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    Game.paintMessagesChip(family);
  }

  function paintSync(sync) {
    const el = document.getElementById("messages-sync");
    if (!el) return;
    if (sync && sync.missing) {
      el.hidden = false;
      el.textContent = "Cloud notes table is not set up yet. Asks still save on this device.";
      return;
    }
    if (sync && sync.offline) {
      el.hidden = false;
      el.textContent = "Connect is off on this phone. Asks stay here until Admin → Connect, then they sync.";
      return;
    }
    el.hidden = true;
    el.textContent = "";
  }

  function render(sync) {
    const box = document.getElementById("messages-inbox");
    if (!box) return;
    box.innerHTML = Game.messagesInboxHtml(family, week, {
      missingTable: !!(sync && sync.missing),
      offline: !!(sync && sync.offline)
    });
    Game.bindMessagesInbox(box, {
      family,
      week,
      canEdit: false,
      onChange(next) {
        family = next;
        hud();
        Game.syncFamilyNotes(family).catch(() => {});
        render();
      }
    });
    paintSync(sync);
  }

  async function boot() {
    if (Game.shouldBounceMessagesPage()) {
      Game.bounceMessagesIfKid();
      return;
    }
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    const baseWeek = Game.ensureWeekIds(await Game.loadWeek() || { work: [], events: [], notes: [] });
    const sync = await Game.syncFamilyNotes(family);
    family = sync.family;
    week = Game.applyWeekOverlay(baseWeek, family);
    hud();
    render(sync);
  }

  boot();
})();
