(function () {
  const MAX_EDGE = 1200;
  const JPEG_QUALITY = 0.82;
  let pack = null;
  let family = null;
  let roster = [];
  let classId = "geometry";
  let sessionId = "";
  let cardTitle = "";
  let pending = [];
  let sending = false;
  let imageUrls = Object.create(null);

  function params() {
    try {
      return new URLSearchParams(location.search);
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function kidView() {
    return typeof Game.siteViewHidesAdult === "function" && Game.siteViewHidesAdult();
  }

  function classes() {
    return (roster || []).filter((c) => c && c.id);
  }

  function selectedClass() {
    return classes().find((c) => c.id === classId) || null;
  }

  function className() {
    const cls = selectedClass();
    return (cls && cls.name) || Game.classNameForId(classId) || classId;
  }

  function sessions() {
    return Game.basecampSessionsForClass(family, classId);
  }

  function current() {
    return Game.basecampSession(family, sessionId);
  }

  function shortClass(cls) {
    const id = String((cls && cls.id) || "");
    if (id === "academic-intervention") return "Seminar";
    if (id === "web-design") return "Web";
    if (id === "english-10") return "Eng";
    if (id === "chemistry") return "Chem";
    if (id === "geometry") return "Geo";
    if (id === "sociology") return "Soc";
    if (id === "strength") return "Lift";
    if (id === "band") return "Band";
    return String((cls && cls.name) || id).slice(0, 8);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const s = String(reader.result || "");
        const comma = s.indexOf(",");
        resolve(comma >= 0 ? s.slice(comma + 1) : s);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function compressImage(file) {
    return new Promise((resolve) => {
      if (!file || !/^image\//.test(file.type || "")) {
        resolve(null);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        const scale = Math.min(1, MAX_EDGE / Math.max(w, h, 1));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        if (!canvas.toBlob) {
          resolve(file);
          return;
        }
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", JPEG_QUALITY);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  function paintClasses() {
    const host = document.getElementById("bc-classes");
    host.innerHTML = classes().map((cls) => {
      const on = cls.id === classId;
      return `<button type="button" class="bc-class${on ? " on" : ""}" data-class="${Game.esc(cls.id)}" role="listitem" aria-pressed="${on ? "true" : "false"}"><span class="bc-class-full">${Game.esc(cls.name)}</span><span class="bc-class-short">${Game.esc(shortClass(cls))}</span></button>`;
    }).join("");
    host.querySelectorAll("[data-class]").forEach((btn) => {
      btn.addEventListener("click", () => selectClass(btn.getAttribute("data-class")));
    });
  }

  function paintSessions() {
    const host = document.getElementById("bc-sessions");
    const list = sessions();
    if (!list.length) {
      host.innerHTML = `<p class="empty">No climbs yet. New session starts a fresh thread.</p>`;
      return;
    }
    host.innerHTML = list.map((s) => {
      const on = s.id === sessionId;
      const when = Game.fmtStamp(s.updated) || "";
      return `<button type="button" class="bc-session${on ? " on" : ""}" data-session="${Game.esc(s.id)}" role="listitem"><span class="bc-session-title">${Game.esc(s.title || "New climb")}</span><span class="bc-session-at">${Game.esc(when)}</span></button>`;
    }).join("");
    host.querySelectorAll("[data-session]").forEach((btn) => {
      btn.addEventListener("click", () => openSession(btn.getAttribute("data-session")));
    });
  }

  function emptyLogHtml() {
    const geo = classId === "geometry";
    const khan = geo
      ? `<p class="bc-welcome-khan">Foster packet first: points/lines/planes, angles, vertical/adjacent, complementary/supplementary, triangle sum. Lesson: <a href="${Game.esc(Tutor.GEOMETRY_KHAN)}" target="_blank" rel="noopener">Khan Academy Geometry</a></p>`
      : "";
    const math = geo ? `<p class="bc-welcome-math">${Game.esc(Tutor.MATH_WARNING)}</p>` : "";
    return `
      <div class="bc-welcome">
        <p class="ask-who">${Game.esc(Tutor.IDENTITY)}</p>
        <p>I can walk it with you. I will not fill it in. What did you already try?</p>
        ${math}
        ${khan}
        <p class="ask-at">Photo is OK — still name the givens. Offline replies stay honest.</p>
      </div>`;
  }

  function bubbleHtml(m) {
    const who = m.role === "mentor"
      ? ((m.test ? '<span class="test-tag">TEST</span> ' : "") + Tutor.IDENTITY)
      : "You";
    const img = m.imageId && imageUrls[m.imageId]
      ? `<img class="bc-msg-img" src="${Game.esc(imageUrls[m.imageId])}" alt="Attached photo">`
      : "";
    return `
      <article class="ask-bubble ${m.role === "mentor" ? "mentor" : "kid"}">
        <p class="ask-who">${who}</p>
        ${img}
        ${m.text ? `<p>${Game.esc(m.text)}</p>` : ""}
        <p class="ask-at">${Game.esc(Game.fmtStamp(m.at))}</p>
      </article>`;
  }

  async function hydrateSessionImages(session) {
    const msgs = (session && session.messages) || [];
    for (let i = 0; i < msgs.length; i += 1) {
      const id = msgs[i] && msgs[i].imageId;
      if (!id || imageUrls[id]) continue;
      const url = await Game.hydrateImageId(id);
      if (url) imageUrls[id] = url;
    }
  }

  async function paintLog() {
    const log = document.getElementById("bc-log");
    const session = current();
    const messages = (session && session.messages) || [];
    await hydrateSessionImages(session);
    if (!messages.length) {
      log.innerHTML = emptyLogHtml();
      return;
    }
    log.innerHTML = messages.map(bubbleHtml).join("");
    log.scrollTop = log.scrollHeight;
  }

  function paintResources() {
    const cls = selectedClass() || { id: classId, name: className() };
    document.getElementById("bc-resources").innerHTML = Game.khanStripHtmlForClass(cls);
  }

  function paintPending() {
    const host = document.getElementById("bc-pending");
    if (!pending.length) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    host.innerHTML = pending.map((p) => {
      if (p.kind === "pdf") {
        return `<span class="bc-chip" data-drop="${Game.esc(p.id)}">${Game.esc(p.name || "PDF")}<button type="button" aria-label="Remove">✕</button></span>`;
      }
      return `<span class="bc-thumb" data-drop="${Game.esc(p.id)}"><img src="${Game.esc(p.preview || "")}" alt=""><button type="button" aria-label="Remove">✕</button></span>`;
    }).join("");
    host.querySelectorAll("[data-drop]").forEach((el) => {
      el.querySelector("button").addEventListener("click", () => {
        const id = el.getAttribute("data-drop");
        pending = pending.filter((p) => p.id !== id);
        paintPending();
      });
    });
  }

  function paintHud() {
    const bananas = document.getElementById("bananas");
    if (bananas) bananas.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) eggChip.hidden = !Game.hasEggGame(pack);
  }

  function paintAll() {
    paintHud();
    paintClasses();
    paintSessions();
    paintResources();
    paintPending();
    return paintLog();
  }

  function selectClass(id) {
    const next = String(id || "").trim();
    if (!next || next === classId) {
      classId = next || classId;
    } else {
      classId = next;
      sessionId = "";
    }
    const list = sessions();
    if (!sessionId && list[0]) sessionId = list[0].id;
    paintAll();
  }

  function openSession(id) {
    sessionId = String(id || "");
    paintAll();
  }

  function newSession() {
    const made = Game.createBasecampSession(family, classId, "New climb");
    family = made.family;
    sessionId = made.session.id;
    paintAll();
  }

  async function addFile(file, fromCamera) {
    if (!file) return;
    const isPdf = /pdf/.test(file.type || "") || /\.pdf$/i.test(file.name || "");
    const isImage = /^image\//.test(file.type || "") || fromCamera;
    if (isPdf) {
      pending.push({
        id: Game.uid("att"),
        kind: "pdf",
        name: file.name || "PDF",
        mime: file.type || "application/pdf"
      });
      paintPending();
      Game.toast("PDF name chip only — Jungle Jam Tutor reads photos, not the file.");
      return;
    }
    if (!isImage) {
      Game.toast("Photo or PDF only.");
      return;
    }
    const compressed = await compressImage(file);
    if (!compressed) {
      Game.toast("Could not read that photo.");
      return;
    }
    const data = await blobToBase64(compressed);
    const preview = URL.createObjectURL(compressed);
    pending.push({
      id: Game.uid("att"),
      kind: "image",
      name: file.name || "Photo",
      mime: "image/jpeg",
      data: data,
      blob: compressed,
      preview: preview
    });
    paintPending();
  }

  function thinkingBubble() {
    const log = document.getElementById("bc-log");
    const el = document.createElement("article");
    el.className = "ask-bubble mentor thinking";
    el.id = "bc-thinking";
    el.setAttribute("role", "status");
    el.innerHTML = `
      <p class="ask-who">${Game.esc(Tutor.IDENTITY)}</p>
      <p class="ask-thinking-row">
        <span class="help-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span>Thinking…</span>
      </p>`;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  async function send() {
    if (sending) return;
    const input = document.getElementById("bc-input");
    const text = (input.value || "").trim();
    const photos = pending.filter((p) => p.kind === "image" && p.data);
    if (!text && !photos.length) {
      Game.toast("Type a try, or attach a photo of the work.");
      return;
    }
    if (!sessionId) newSession();
    let session = current();
    if (!session) newSession();
    session = current();
    const firstPhoto = photos[0];
    if (firstPhoto && firstPhoto.blob) {
      await Game.putLibraryBlob(firstPhoto.id, firstPhoto.blob, { mime: firstPhoto.mime, name: firstPhoto.name });
      imageUrls[firstPhoto.id] = firstPhoto.preview || await Game.hydrateImageId(firstPhoto.id);
    }
    const added = Game.addBasecampMessage(family, session.id, {
      role: "bennett",
      text: text,
      imageId: firstPhoto ? firstPhoto.id : undefined
    });
    family = added.family;
    sessionId = added.session.id;
    if (typeof Game.track === "function") {
      Game.track("ask_ai", { classId: classId, message: className() });
    }
    input.value = "";
    const sentImages = photos.map((p) => ({ mime: p.mime, data: p.data }));
    pending.forEach((p) => {
      if (p.preview && p.preview.indexOf("blob:") === 0 && (!firstPhoto || p.id !== firstPhoto.id)) {
        try { URL.revokeObjectURL(p.preview); } catch (_) {}
      }
    });
    pending = [];
    paintPending();
    paintSessions();
    await paintLog();
    const sendBtn = document.getElementById("bc-send");
    sendBtn.disabled = true;
    sending = true;
    const thinking = thinkingBubble();
    const started = Date.now();
    const title = cardTitle || className();
    const data = await Tutor.ask({
      title: title,
      className: className(),
      classId: classId,
      messages: (current() && current().messages) || [],
      images: sentImages
    });
    const wait = 700 - (Date.now() - started);
    if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
    if (thinking.parentNode) thinking.parentNode.removeChild(thinking);
    const reply = Game.addBasecampMessage(family, sessionId, {
      role: "mentor",
      text: data.reply || "I can walk it with you. I will not fill it in. What did you already try?",
      test: !data.live
    });
    family = reply.family;
    sendBtn.disabled = false;
    sending = false;
    paintSessions();
    await paintLog();
    if (!data.live) {
      Game.toast("Offline Jungle Jam Tutor — honest fallback, not a photo read.");
    }
  }

  async function boot() {
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    const progress = await Game.loadProgress();
    roster = (progress && progress.classes) || [];
    const q = params();
    const fromQuery = (q.get("class") || "").trim();
    cardTitle = (q.get("title") || "").trim();
    if (fromQuery && classes().some((c) => c.id === fromQuery)) classId = fromQuery;
    else if (!classes().some((c) => c.id === classId) && classes()[0]) classId = classes()[0].id;
    const list = sessions();
    if (list[0]) sessionId = list[0].id;
    document.getElementById("bc-form").addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });
    document.getElementById("bc-new").addEventListener("click", newSession);
    document.getElementById("bc-camera").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      addFile(file, true);
    });
    document.getElementById("bc-upload").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      addFile(file, false);
    });
    document.addEventListener("bw-site-view", () => paintAll());
    await paintAll();
  }

  boot();
})();
