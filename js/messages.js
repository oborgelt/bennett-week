(function () {
  let family = null;
  let week = null;
  let pack = null;

  function viewerCanEdit() {
    return Game.siteView() !== "bennett";
  }

  function paintLead() {
    const el = document.querySelector(".messages-lead");
    if (!el) return;
    if (Game.siteView() === "bennett") {
      el.innerHTML = "When Mom or Dad writes back, you can read <strong>who replied</strong> here.";
      return;
    }
    el.innerHTML = "When Bennett taps <strong>Ask</strong> on a week card, it shows up here. A reply is stamped <strong>Mom</strong> or <strong>Dad</strong> on that same card.";
  }

  function hud() {
    const el = document.getElementById("bananas");
    if (el && pack) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas(pack, family)}`;
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
    const canEdit = viewerCanEdit();
    box.innerHTML = Game.messagesInboxHtml(family, week, {
      missingTable: !!(sync && sync.missing),
      offline: !!(sync && sync.offline),
      canEdit,
      view: Game.siteView()
    });
    Game.bindMessagesInbox(box, {
      family,
      week,
      canEdit,
      onChange(next) {
        family = next;
        hud();
        Game.syncFamilyBoard(family).catch(() => {});
        render();
      }
    });
    paintSync(sync);
  }

  function markThisViewerSeen() {
    Game.markInboxSeen();
    Game.paintMessagesChip(family);
  }

  async function boot() {
    if (Game.shouldBounceMessagesPage()) {
      Game.bounceMessagesIfKid();
      return;
    }
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    const baseWeek = Game.ensureWeekIds(await Game.loadWeek() || { work: [], events: [], notes: [] });
    const sync = await Game.syncFamilyBoard(family);
    family = sync.family;
    week = Game.applyWeekOverlay(baseWeek, family);
    markThisViewerSeen();
    paintLead();
    hud();
    render(sync);
  }

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("focus", () => {
      if (family) markThisViewerSeen();
    });
  }

  boot();
})();
