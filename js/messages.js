(function () {
  let family = null;
  let week = null;
  let pack = null;

  function viewerCanEdit() {
    return Game.siteView() !== "bennett";
  }

  function viewerCanDelete() {
    return Game.siteView() === "me";
  }

  function paintLead() {
    const el = document.querySelector(".messages-lead");
    if (!el) return;
    if (Game.siteView() === "bennett") {
      el.innerHTML = "Ask on a week card, or answer the check-in on This Week. You see every message and every reply. Newest first.";
      return;
    }
    if (Game.siteView() === "mom") {
      el.innerHTML = "Newest first. You see the full thread: Bennett, Dad, you, Bennett again.";
      return;
    }
    el.innerHTML = "Newest day first. Compact threads. Delete a message or check-in with <strong>Delete</strong> and it leaves the rest of the site too.";
  }

  function hud() {
    const el = document.getElementById("bananas");
    if (el && pack) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas(pack, family)}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) Game.paintEggChip(pack);
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
    const canDelete = viewerCanDelete();
    box.innerHTML = Game.messagesInboxHtml(family, week, {
      canEdit,
      canDelete,
      view: Game.siteView()
    });
    Game.bindMessagesInbox(box, {
      family,
      week,
      canEdit,
      canDelete,
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
