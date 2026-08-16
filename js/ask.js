(function () {
  let pack = null;
  let thread = null;
  let title = "";

  function params() {
    try {
      return new URLSearchParams(location.search);
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function renderLog() {
    const log = document.getElementById("ask-log");
    const messages = (thread && thread.messages) || [];
    if (!messages.length) {
      log.innerHTML = `<p class="empty">No questions yet. Ask one small thing about the assignment.</p>`;
      return;
    }
    log.innerHTML = messages.map((m) => `
      <article class="ask-bubble ${m.role === "mentor" ? "mentor" : "kid"}">
        <p class="ask-who">${m.role === "mentor" ? (m.test ? '<span class="test-tag">TEST</span> Mentor' : "Mentor") : "You"}</p>
        <p>${Game.esc(m.text)}</p>
        <p class="ask-at">${Game.esc(Game.fmtStamp(m.at))}${m.title ? " · " + Game.esc(m.title) : ""}</p>
      </article>
    `).join("");
    log.scrollTop = log.scrollHeight;
  }

  async function send() {
    const input = document.getElementById("ask-input");
    const text = (input.value || "").trim();
    if (!text) {
      Game.toast("Type a question first.");
      return;
    }
    title = document.getElementById("ask-title").value.trim() || title;
    thread = Game.addAskMessage(thread, { role: "bennett", text, title });
    Game.track("ask_ai", { classId: params().get("class") || Game.classIdForTitle(title), message: title });
    input.value = "";
    renderLog();
    document.getElementById("ask-send").disabled = true;
    const data = await Tutor.ask({
      title,
      messages: thread.messages
    });
    thread = Game.addAskMessage(thread, {
      role: "mentor",
      text: data.reply || "What's the smallest first move?",
      title,
      test: !data.live
    });
    document.getElementById("ask-send").disabled = false;
    renderLog();
    if (!data.live) {
      Game.toast("TEST mentor — run serve.py with ANTHROPIC_API_KEY for live Ask AI.");
    }
  }

  async function boot() {
    pack = await Game.loadAchievements();
    await Game.loadFamily();
    thread = Game.getAskThread();
    const q = params();
    const classId = (q.get("class") || "").trim();
    title = (q.get("title") || "").trim() || Game.classNameForId(classId) || "English 10: Finish summer comic strips";
    document.getElementById("ask-title").value = title;
    const bananas = document.getElementById("bananas");
    if (bananas) bananas.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
    function paintResources(nextTitle) {
      document.getElementById("ask-resources").innerHTML = Game.khanStripHtml(nextTitle, { classId });
    }
    paintResources(title);
    document.getElementById("ask-form").addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });
    document.getElementById("ask-title").addEventListener("change", () => {
      title = document.getElementById("ask-title").value.trim();
      paintResources(title);
    });
    renderLog();
  }

  boot();
})();
