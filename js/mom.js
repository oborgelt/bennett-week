(function () {
  const UNLOCK_TYPES = [
    { value: "open_week", label: "Open the week" },
    { value: "start_work", label: "Start a work item" },
    { value: "done_work", label: "Mark a work item done" },
    { value: "touch_work", label: "Start or done on a work item" },
    { value: "view_event", label: "View a calendar event" },
    { value: "easter_egg", label: "Easter egg" }
  ];

  const ICONS = ["tennis", "guitar", "clarinet", "badge", "banana", "band"];

  let pack = null;
  let editingId = null;

  function blank() {
    return {
      id: "",
      title: "",
      description: "",
      how: "",
      incentive: "",
      icon: "badge",
      test: true,
      secret: false,
      reward: 5,
      unlock: { type: "open_week" }
    };
  }

  function persist() {
    Game.saveMomDraft(pack);
    renderList();
    Game.toast("Saved on this device. Download JSON to put it in the repo.");
  }

  function renderList() {
    const list = document.getElementById("list");
    const cur = Game.currency(pack);
    if (!(pack.achievements || []).length) {
      list.innerHTML = `<p class="empty">No achievements yet. Add one.</p>`;
      return;
    }
    list.innerHTML = pack.achievements.map((ach) => `
      <article class="ach-card">
        <h3>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title || "Untitled")}</h3>
        <p>${Game.esc(ach.description || "")}</p>
        <p>How: ${Game.esc(ach.how || "—")}</p>
        <p>Incentive: ${Game.esc(ach.incentive || "—")} · ${ach.reward || 0} ${cur.name}</p>
        <div class="mom-actions">
          <button type="button" class="btn" data-edit="${Game.esc(ach.id)}">Edit</button>
          <button type="button" class="btn danger" data-del="${Game.esc(ach.id)}">Delete</button>
        </div>
      </article>
    `).join("");

    list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(b.dataset.edit)));
    list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Delete this achievement?")) return;
      pack.achievements = pack.achievements.filter((a) => a.id !== b.dataset.del);
      persist();
      closeForm();
    }));
  }

  function fillForm(ach) {
    document.getElementById("title").value = ach.title || "";
    document.getElementById("description").value = ach.description || "";
    document.getElementById("how").value = ach.how || "";
    document.getElementById("incentive").value = ach.incentive || "";
    document.getElementById("icon").value = ach.icon || "badge";
    document.getElementById("reward").value = ach.reward ?? 5;
    document.getElementById("test").checked = !!ach.test;
    document.getElementById("secret").checked = !!ach.secret;
    document.getElementById("unlockType").value = (ach.unlock && ach.unlock.type) || "open_week";
    document.getElementById("unlockTarget").value =
      (ach.unlock && (ach.unlock.workId || ach.unlock.eventId || ach.unlock.egg)) || "";
    document.getElementById("beforeDue").checked = !!(ach.unlock && ach.unlock.beforeDue);
    syncTargetHint();
  }

  function slug(title) {
    return (title || "achievement")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "achievement";
  }

  function collect() {
    const type = document.getElementById("unlockType").value;
    const target = document.getElementById("unlockTarget").value.trim();
    const unlock = { type };
    if (type === "start_work" || type === "done_work" || type === "touch_work") {
      unlock.workId = target;
      if (document.getElementById("beforeDue").checked) unlock.beforeDue = true;
    } else if (type === "view_event") {
      unlock.eventId = target;
    } else if (type === "easter_egg") {
      unlock.egg = target || "custom-egg";
    }
    return {
      id: editingId || slug(document.getElementById("title").value) + "-" + Date.now().toString(36),
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      how: document.getElementById("how").value.trim(),
      incentive: document.getElementById("incentive").value.trim(),
      icon: document.getElementById("icon").value,
      test: document.getElementById("test").checked,
      secret: document.getElementById("secret").checked,
      reward: Number(document.getElementById("reward").value) || 0,
      unlock
    };
  }

  function syncTargetHint() {
    const type = document.getElementById("unlockType").value;
    const wrap = document.getElementById("target-wrap");
    const dueWrap = document.getElementById("due-wrap");
    const hint = document.getElementById("target-hint");
    const needsTarget = type !== "open_week";
    wrap.hidden = !needsTarget;
    dueWrap.hidden = !(type === "start_work" || type === "done_work" || type === "touch_work");
    hint.textContent = {
      start_work: "Work id from week.json, e.g. eng-names",
      done_work: "Work id from week.json, e.g. eng-comics",
      touch_work: "Work id from week.json, e.g. eng-notebook",
      view_event: "Event id from week.json, e.g. band-am-0817",
      easter_egg: "Egg id, e.g. banner-monkey"
    }[type] || "";
  }

  function openForm(id) {
    editingId = id || null;
    const ach = id ? pack.achievements.find((a) => a.id === id) : blank();
    fillForm(ach || blank());
    document.getElementById("editor").hidden = false;
    document.getElementById("editor-title").textContent = id ? "Edit achievement" : "New achievement";
    document.getElementById("title").focus();
  }

  function closeForm() {
    editingId = null;
    document.getElementById("editor").hidden = true;
  }

  async function boot() {
    pack = await Game.loadAchievements();
    if (!pack.currency) pack.currency = { name: "bananas", singular: "banana", emoji: "🍌" };
    if (!Array.isArray(pack.achievements)) pack.achievements = [];

    const iconSel = document.getElementById("icon");
    iconSel.innerHTML = ICONS.map((i) => `<option value="${i}">${i}</option>`).join("");
    const typeSel = document.getElementById("unlockType");
    typeSel.innerHTML = UNLOCK_TYPES.map((t) => `<option value="${t.value}">${t.label}</option>`).join("");
    typeSel.addEventListener("change", syncTargetHint);

    document.getElementById("add").addEventListener("click", () => openForm(null));
    document.getElementById("cancel").addEventListener("click", closeForm);
    document.getElementById("save").addEventListener("click", () => {
      const next = collect();
      if (!next.title) {
        Game.toast("Add a title first.");
        return;
      }
      const idx = pack.achievements.findIndex((a) => a.id === next.id);
      if (idx >= 0) pack.achievements[idx] = next;
      else pack.achievements.push(next);
      persist();
      closeForm();
    });

    document.getElementById("download").addEventListener("click", () => {
      Game.downloadJson("achievements.json", pack);
      Game.toast("Downloaded. Drop this file into the repo to share it.");
    });

    document.getElementById("reset").addEventListener("click", async () => {
      if (!confirm("Clear this device's Mom desk draft and reload the repo file?")) return;
      Game.clearMomDraft();
      pack = await Game.loadAchievements();
      renderList();
      closeForm();
      Game.toast("Back to the repo achievements.json.");
    });

    renderList();
    if (Game.usingMomDraft()) {
      document.getElementById("draft-flag").hidden = false;
    }
  }

  boot();
})();
