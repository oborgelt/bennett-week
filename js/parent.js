(function () {
  const ICONS = ["tennis", "guitar", "clarinet", "badge", "banana", "band"];

  let pack = null;
  let family = null;
  let week = null;
  let editingId = null;

  function persistAch() {
    Game.saveMomDraft(pack);
    renderAchievements();
    Game.toast("Saved on this device. Export JSON to share with the other parent.");
  }

  function persistFamily() {
    Game.saveFamily(family);
    renderInbox();
    renderPool();
    renderAchievements();
  }

  function itemLabel(type, id) {
    if (type === "work") {
      const w = (week.work || []).find((x) => x.id === id);
      return w ? w.title : id;
    }
    const e = (week.events || []).find((x) => x.id === id);
    return e ? e.title : id;
  }

  function allTargets() {
    const rows = [];
    (week.work || []).forEach((w) => rows.push({ value: "work:" + w.id, label: "Work · " + w.title }));
    (week.events || []).forEach((e) => rows.push({ value: "event:" + e.id, label: "Event · " + e.title }));
    return rows;
  }

  function renderInbox() {
    const box = document.getElementById("inbox");
    const questions = (family.notes || []).filter((n) => n.from === "bennett");
    const answers = (family.reflections && family.reflections.answers) || [];
    if (!questions.length && !answers.length) {
      box.innerHTML = `<p class="empty">No questions or check-ins yet.</p>`;
      return;
    }
    const qHtml = questions.map((n) => `
      <article class="inbox-card">
        <h3>${n.test ? '<span class="test-tag">TEST</span> ' : ""}Question · ${Game.esc(itemLabel(n.targetType, n.targetId))}</h3>
        <p>${Game.esc(n.text)}</p>
        <p>${Game.esc(Game.fmtStamp(n.at))}</p>
        <label>Reply with a note
          <textarea data-reply="${Game.esc(n.id)}" maxlength="280" placeholder="A short note on this item"></textarea>
        </label>
        <button type="button" class="btn" data-send-reply="${Game.esc(n.id)}">Send note</button>
      </article>
    `).join("");
    const aHtml = answers.map((a) => `
      <article class="inbox-card">
        <h3>${a.test ? '<span class="test-tag">TEST</span> ' : ""}Check-in</h3>
        <p>${Game.esc(a.prompt || "")}</p>
        <p>${Game.esc(a.text)}</p>
        <p>${Game.esc(Game.fmtStamp(a.at))}</p>
      </article>
    `).join("");
    box.innerHTML = qHtml + aHtml;
    box.querySelectorAll("[data-send-reply]").forEach((b) => {
      b.addEventListener("click", () => {
        const q = family.notes.find((n) => n.id === b.dataset.sendReply);
        const ta = box.querySelector(`[data-reply="${b.dataset.sendReply}"]`);
        const text = (ta && ta.value || "").trim();
        if (!q || !text) {
          Game.toast("Write a note first.");
          return;
        }
        family = Game.addNote(family, {
          id: Game.uid("note"),
          targetType: q.targetType,
          targetId: q.targetId,
          from: "parent",
          kind: "reply",
          replyTo: q.id,
          text,
          at: Game.nowIso()
        });
        Game.toast("Note saved. Bennett will see it on that item.");
        renderInbox();
      });
    });
  }

  function renderPool() {
    const list = document.getElementById("pool");
    const pool = (family.reflections && family.reflections.pool) || [];
    if (!pool.length) {
      list.innerHTML = `<p class="empty">No reflection prompts yet.</p>`;
      return;
    }
    list.innerHTML = pool.map((p) => `
      <article class="ach-card">
        <h3>${p.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(p.text)}</h3>
        <div class="parent-actions">
          <button type="button" class="btn danger" data-del-prompt="${Game.esc(p.id)}">Delete</button>
        </div>
      </article>
    `).join("");
    list.querySelectorAll("[data-del-prompt]").forEach((b) => {
      b.addEventListener("click", () => {
        family.reflections.pool = family.reflections.pool.filter((p) => p.id !== b.dataset.delPrompt);
        persistFamily();
      });
    });
  }

  function streakOf(ach) {
    const st = (family.streaks || {})[ach.id] || { count: 0, awarded: Game.alreadyUnlocked(ach.id) };
    return { count: Number(st.count) || 0, awarded: !!(st.awarded || Game.alreadyUnlocked(ach.id)) };
  }

  function renderAchievements() {
    const list = document.getElementById("list");
    const cur = Game.currency(pack);
    if (!(pack.achievements || []).length) {
      list.innerHTML = `<p class="empty">No streak achievements yet. Add one.</p>`;
      return;
    }
    list.innerHTML = pack.achievements.map((ach) => {
      const st = streakOf(ach);
      const target = (ach.streak && ach.streak.target) || 1;
      const unit = (ach.streak && ach.streak.unit) || "week";
      return `
        <article class="ach-card">
          <h3>${ach.test ? '<span class="test-tag">TEST</span> ' : ""}${Game.esc(ach.title || "Untitled")}</h3>
          <p>${Game.esc(ach.description || "")}</p>
          <p>Incentive: ${Game.esc(ach.incentive || "—")} · ${ach.reward || 0} ${cur.name}</p>
          <p>Streak: ${st.count} / ${target} ${Game.esc(unit)}${st.awarded ? " · awarded" : ""}</p>
          <div class="parent-actions">
            <button type="button" class="btn" data-count="${Game.esc(ach.id)}">Count this week</button>
            <button type="button" class="btn primary" data-award="${Game.esc(ach.id)}">Award</button>
            <button type="button" class="btn" data-edit="${Game.esc(ach.id)}">Edit</button>
            <button type="button" class="btn danger" data-del="${Game.esc(ach.id)}">Delete</button>
          </div>
        </article>`;
    }).join("");

    list.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openForm(b.dataset.edit)));
    list.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      if (!confirm("Delete this achievement?")) return;
      pack.achievements = pack.achievements.filter((a) => a.id !== b.dataset.del);
      persistAch();
      closeForm();
    }));
    list.querySelectorAll("[data-count]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.count;
      const curSt = streakOf(pack.achievements.find((a) => a.id === id) || { id });
      family.streaks[id] = { count: curSt.count + 1, awarded: curSt.awarded };
      persistFamily();
      Game.toast("Counted. Award when the streak is real.");
    }));
    list.querySelectorAll("[data-award]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.award;
      const ach = Game.awardAchievement(pack, id);
      const curSt = streakOf(pack.achievements.find((a) => a.id === id) || { id });
      family.streaks[id] = { count: curSt.count, awarded: true, awardedAt: Game.nowIso() };
      persistFamily();
      if (ach) Game.celebrate(ach, pack);
      else Game.toast("Already awarded on this device.");
    }));
  }

  function blank() {
    return {
      id: "",
      title: "",
      description: "",
      how: "",
      incentive: "",
      icon: "badge",
      test: true,
      reward: 10,
      streak: { target: 3, unit: "week" }
    };
  }

  function fillForm(ach) {
    document.getElementById("title").value = ach.title || "";
    document.getElementById("description").value = ach.description || "";
    document.getElementById("how").value = ach.how || "";
    document.getElementById("incentive").value = ach.incentive || "";
    document.getElementById("icon").value = ach.icon || "badge";
    document.getElementById("reward").value = ach.reward ?? 10;
    document.getElementById("test").checked = !!ach.test;
    document.getElementById("target").value = (ach.streak && ach.streak.target) || 1;
    document.getElementById("unit").value = (ach.streak && ach.streak.unit) || "week";
  }

  function slug(title) {
    return (title || "achievement")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "achievement";
  }

  function collect() {
    return {
      id: editingId || slug(document.getElementById("title").value) + "-" + Date.now().toString(36),
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      how: document.getElementById("how").value.trim(),
      incentive: document.getElementById("incentive").value.trim(),
      icon: document.getElementById("icon").value,
      test: document.getElementById("test").checked,
      reward: Number(document.getElementById("reward").value) || 0,
      streak: {
        target: Number(document.getElementById("target").value) || 1,
        unit: document.getElementById("unit").value.trim() || "week"
      }
    };
  }

  function openForm(id) {
    editingId = id || null;
    const ach = id ? pack.achievements.find((a) => a.id === id) : blank();
    fillForm(ach || blank());
    document.getElementById("editor").hidden = false;
    document.getElementById("editor-title").textContent = id ? "Edit streak" : "New streak";
    document.getElementById("title").focus();
  }

  function closeForm() {
    editingId = null;
    document.getElementById("editor").hidden = true;
  }

  async function boot() {
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    week = await Game.loadWeek() || { work: [], events: [] };
    if (!pack.currency) pack.currency = { name: "bananas", singular: "banana", emoji: "🍌" };
    if (!Array.isArray(pack.achievements)) pack.achievements = [];
    family = Game.normalizeFamily(family);

    document.getElementById("icon").innerHTML = ICONS.map((i) => `<option value="${i}">${i}</option>`).join("");
    const targetSel = document.getElementById("note-target");
    targetSel.innerHTML = allTargets().map((t) => `<option value="${Game.esc(t.value)}">${Game.esc(t.label)}</option>`).join("");

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
      persistAch();
      closeForm();
    });

    document.getElementById("add-prompt").addEventListener("click", () => {
      const text = (document.getElementById("new-prompt").value || "").trim();
      if (!text) {
        Game.toast("Write a prompt first.");
        return;
      }
      family.reflections.pool.push({ id: Game.uid("r"), text, test: document.getElementById("prompt-test").checked });
      document.getElementById("new-prompt").value = "";
      persistFamily();
    });

    document.getElementById("add-note").addEventListener("click", () => {
      const token = document.getElementById("note-target").value;
      const text = (document.getElementById("parent-note").value || "").trim();
      if (!token || !text) {
        Game.toast("Pick an item and write a note.");
        return;
      }
      const [targetType, targetId] = token.split(":");
      family = Game.addNote(family, {
        id: Game.uid("note"),
        targetType,
        targetId,
        from: "parent",
        kind: "note",
        text,
        at: Game.nowIso()
      });
      document.getElementById("parent-note").value = "";
      Game.toast("Note saved on that item.");
      renderInbox();
    });

    document.getElementById("download-ach").addEventListener("click", () => {
      Game.downloadJson("achievements.json", pack);
      Game.toast("Downloaded the streak catalog.");
    });

    document.getElementById("export").addEventListener("click", () => {
      Game.downloadJson("bennett-week-export.json", Game.exportPack(pack, family));
      Game.toast("Downloaded the family pack. The other parent can import it.");
    });

    document.getElementById("import").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          const next = Game.importPack(obj);
          if (!next) throw new Error("bad pack");
          pack = next;
          family = Game.getFamilyDraft() || family;
          renderAchievements();
          renderInbox();
          renderPool();
          document.getElementById("draft-flag").hidden = false;
          Game.toast("Imported on this device.");
        } catch (_) {
          Game.toast("Could not read that JSON file.");
        }
      };
      reader.readAsText(file);
    });

    document.getElementById("reset").addEventListener("click", async () => {
      if (!confirm("Clear this device's parent-desk draft and reload the repo files?")) return;
      Game.clearMomDraft();
      Game.clearFamilyDraft();
      pack = await Game.loadAchievements();
      family = await Game.loadFamily();
      renderAchievements();
      renderInbox();
      renderPool();
      closeForm();
      document.getElementById("draft-flag").hidden = true;
      Game.toast("Back to the repo files.");
    });

    renderAchievements();
    renderInbox();
    renderPool();
    if (Game.usingMomDraft() || Game.usingFamilyDraft()) {
      document.getElementById("draft-flag").hidden = !Game.usingMomDraft();
    }
  }

  boot();
})();
