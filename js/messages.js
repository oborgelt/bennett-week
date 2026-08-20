(function () {
  let family = null;
  let week = null;
  let pack = null;
  let msgFilter = "both";

  function viewerCanEdit() {
    return Game.siteView() !== "bennett";
  }

  function viewerCanDelete() {
    return Game.siteView() === "me";
  }

  function readMsgFilter() {
    try {
      const q = String(new URLSearchParams(location.search).get("tab") || "").toLowerCase();
      if (q === "daily" || q === "class" || q === "both") return q;
    } catch (_) {}
    try {
      const saved = String(localStorage.getItem("bw-msg-filter") || "");
      if (saved === "daily" || saved === "class" || saved === "both") return saved;
    } catch (_) {}
    return "both";
  }

  function setMsgFilter(next) {
    msgFilter = next === "daily" || next === "class" ? next : "both";
    try { localStorage.setItem("bw-msg-filter", msgFilter); } catch (_) {}
    paintTabs();
    paintLead();
    render();
  }

  function paintTabs() {
    document.querySelectorAll("[data-msg-filter]").forEach((tab) => {
      const on = tab.dataset.msgFilter === msgFilter;
      tab.classList.toggle("on", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function bindTabs() {
    const nav = document.getElementById("msg-tabs");
    if (!nav || nav.dataset.bound === "1") return;
    nav.dataset.bound = "1";
    nav.addEventListener("click", (e) => {
      const tab = e.target && e.target.closest ? e.target.closest("[data-msg-filter]") : null;
      if (!tab) return;
      setMsgFilter(tab.dataset.msgFilter);
    });
  }

  function paintLead() {
    const el = document.querySelector(".messages-lead");
    if (!el) return;
    const kid = Game.siteView() === "bennett";
    if (msgFilter === "daily") {
      el.innerHTML = kid
        ? "Daily questions you answered on This Week. Newest answers sit under each question."
        : "Bennett’s completed daily questions, grouped by prompt. Delete on Me removes them everywhere.";
      return;
    }
    if (msgFilter === "class") {
      el.innerHTML = kid
        ? "Asks you started on a week card, plus Mom and Dad replies."
        : "Class threads Bennett started, with Mom and Dad replies. Newest day first.";
      return;
    }
    if (kid) {
      el.innerHTML = "Ask on a week card, or answer the check-in on This Week. You see every message and every reply. Use the tabs to split daily questions from class messages.";
      return;
    }
    if (Game.siteView() === "mom") {
      el.innerHTML = "Use the tabs for daily questions or class threads. You see the full thread: Bennett, Dad, you, Bennett again.";
      return;
    }
    el.innerHTML = "Newest day first. Use the tabs to split daily questions from class messages. Delete a message or check-in with <strong>Delete</strong> and it leaves the rest of the site too.";
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
      view: Game.siteView(),
      filter: msgFilter
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
    msgFilter = readMsgFilter();
    bindTabs();
    paintTabs();
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
