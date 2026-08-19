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
      el.innerHTML = "Ask on a week card, or answer the check-in on This Week. When Mom or Dad writes back, you can read <strong>who replied</strong> here.";
      return;
    }
    el.innerHTML = "When Bennett taps <strong>Ask</strong> on a week card or answers the <strong>check-in</strong> on This Week, it shows up here. A reply is stamped <strong>Mom</strong> or <strong>Dad</strong> on that same card.";
  }

  function hud() {
    const el = document.getElementById("bananas");
    if (el && pack) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas(pack, family)}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    Game.paintMessagesChip(family);
  }

  function paintSync() {
    const el = document.getElementById("messages-sync");
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
  }

  function render(sync) {
    const box = document.getElementById("messages-inbox");
    if (!box) return;
    const canEdit = viewerCanEdit();
    box.innerHTML = Game.messagesInboxHtml(family, week, {
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
    week = Game.applyWeekOverlay(baseWeek, family);
    family = Game.promoteAskThreadToInbox(family, week);
    markThisViewerSeen();
    paintLead();
    hud();
    render();
    try {
      const sync = await Game.syncFamilyBoard(family);
      family = sync.family;
      family = Game.promoteAskThreadToInbox(family, week);
      if (Game.flushFamilyNotes) family = await Game.flushFamilyNotes(family);
      week = Game.applyWeekOverlay(baseWeek, family);
      markThisViewerSeen();
      hud();
      render(sync);
    } catch (_) {}
  }

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("focus", () => {
      if (family) markThisViewerSeen();
    });
  }

  boot();
})();
