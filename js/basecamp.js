(function () {
  const MAX_EDGE = 1200;
  const JPEG_QUALITY = 0.82;
  const EXAMPLES = {
    geometry: [
      "I took a picture of #4. I think those are vertical angles.",
      "Is my next step 180 minus the given angle?",
      "I finished this page. Can you check my steps?"
    ],
    chemistry: [
      "Here’s a photo of tonight’s chem page. Where do I start?",
      "I think this is the element I need. Can you check how I’m using it?",
      "I finished the About Me slides list. Ask me if I missed a box."
    ],
    "english-10": [
      "Here’s a photo of the comic rubric. What’s still missing?",
      "I wrote 5 sentences on the back. Ask me if I hit the rubric."
    ],
    sociology: [
      "Here’s a photo of tonight’s sociology page. Where do I start?",
      "I wrote what I think it is asking. Can you check my try?"
    ],
    "web-design": [
      "Here’s a photo of the Web Design prompt. What’s the first step?",
      "I tried a layout. Ask me what I still need."
    ],
    band: [
      "Here’s a photo of the Band paper. What should I do first?",
      "I marked what I already practiced. Ask me what’s left."
    ],
    strength: [
      "Here’s a photo of the lift sheet. Where do I start?",
      "I wrote the set I think I did. Can you check my notes?"
    ],
    "academic-intervention": [
      "Here’s a photo of seminar work. Where do I start?",
      "I wrote what I already tried. Ask me the next step."
    ]
  };
  const TUTOR_LINE = "Upload a picture or file, or just chat with me. I can't give you answers but I can help you get to the answer.";
  const COACH = {
    geometry: TUTOR_LINE,
    chemistry: TUTOR_LINE,
    "english-10": TUTOR_LINE,
    sociology: TUTOR_LINE,
    "web-design": TUTOR_LINE,
    band: TUTOR_LINE,
    strength: TUTOR_LINE,
    "academic-intervention": TUTOR_LINE
  };
  const PTABLE = window.BW_PTABLE || [];
  const RAIL_KEY = "bw-bc-rail";
  const PDF_MAX_PAGES = 4;
  const PDF_TEXT_CAP = 9000;
  const PDFJS_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  let pdfJsLoading = null;
  let pack = null;
  let family = null;
  let roster = [];
  let classId = "geometry";
  let sessionId = "";
  let cardTitle = "";
  let pending = [];
  let sending = false;
  let imageUrls = Object.create(null);
  let ptableBuilt = false;
  let calcExpr = "";
  let calcResult = "";
  let calcFresh = false;

  function params() {
    try {
      return new URLSearchParams(location.search);
    } catch (_) {
      return new URLSearchParams();
    }
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

  function pinnedSessions() {
    return Game.basecampPinnedForClass(family, classId);
  }

  function savedSessions() {
    return Game.basecampSavedForClass(family, classId);
  }

  function current() {
    return Game.basecampSession(family, sessionId);
  }

  function toolsMode() {
    if (classId === "geometry") return "calc";
    if (classId === "chemistry") return "ptable";
    return "";
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

  function isPdfFile(file) {
    const type = String((file && file.type) || "").toLowerCase();
    const name = String((file && file.name) || "").toLowerCase();
    return type === "application/pdf" || type === "application/x-pdf" || /\.pdf$/.test(name);
  }

  function isImageFile(file, fromCamera) {
    if (fromCamera) return true;
    const type = String((file && file.type) || "").toLowerCase();
    const name = String((file && file.name) || "").toLowerCase();
    if (type.indexOf("image/") === 0) return true;
    return /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/.test(name);
  }

  function filesFromDataTransfer(dt) {
    if (!dt) return [];
    const seen = {};
    const out = [];
    const add = (file) => {
      if (!file) return;
      const key = String(file.name || "file") + ":" + String(file.size || 0) + ":" + String(file.type || "");
      if (seen[key]) return;
      seen[key] = true;
      out.push(file);
    };
    Array.from(dt.files || []).forEach(add);
    Array.from(dt.items || []).forEach((item) => {
      if (item && item.kind === "file" && typeof item.getAsFile === "function") add(item.getAsFile());
    });
    return out;
  }

  function compressImage(file) {
    return new Promise((resolve) => {
      if (!file || !isImageFile(file, false)) {
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
      return `<button type="button" class="bc-class${on ? " on" : ""}" data-class="${Game.esc(cls.id)}" role="listitem" aria-pressed="${on ? "true" : "false"}" title="${Game.esc(cls.name)}"><span class="bc-class-mark">${Game.esc(shortClass(cls).slice(0, 2))}</span><span class="bc-class-full">${Game.esc(cls.name)}</span><span class="bc-class-short">${Game.esc(shortClass(cls))}</span></button>`;
    }).join("");
    host.querySelectorAll("[data-class]").forEach((btn) => {
      btn.addEventListener("click", () => selectClass(btn.getAttribute("data-class")));
    });
  }

  function sessionRowHtml(s) {
    const on = s.id === sessionId;
    const when = Game.fmtStamp(s.updated) || "";
    const pinned = !!s.pinned;
    return `<div class="bc-session-row${on ? " on" : ""}" role="listitem">
      <button type="button" class="bc-session${on ? " on" : ""}" data-session="${Game.esc(s.id)}">
        <span class="bc-session-title">${Game.esc(s.title || "New climb")}</span>
        <span class="bc-session-at">${Game.esc(when)}</span>
      </button>
      <div class="bc-session-actions">
        <button type="button" class="bc-pin${pinned ? " on" : ""}" data-pin="${Game.esc(s.id)}" aria-pressed="${pinned ? "true" : "false"}" aria-label="${pinned ? "Unpin" : "Pin"}">${pinned ? "★" : "☆"}</button>
        <button type="button" class="bc-delete" data-delete="${Game.esc(s.id)}" aria-label="Delete this climb">✕</button>
      </div>
    </div>`;
  }

  function bindSessionHost(host) {
    host.querySelectorAll("[data-session]").forEach((btn) => {
      btn.addEventListener("click", () => openSession(btn.getAttribute("data-session")));
    });
    host.querySelectorAll("[data-pin]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePin(btn.getAttribute("data-pin"));
      });
    });
    host.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteClimb(btn.getAttribute("data-delete"));
      });
    });
  }

  function paintSessions() {
    const pinnedHost = document.getElementById("bc-pinned");
    const savedHost = document.getElementById("bc-sessions");
    const pinned = pinnedSessions();
    const saved = savedSessions();
    pinnedHost.innerHTML = pinned.length
      ? pinned.map(sessionRowHtml).join("")
      : `<p class="empty">None pinned.</p>`;
    savedHost.innerHTML = saved.length
      ? saved.map(sessionRowHtml).join("")
      : `<p class="empty">No climbs yet.</p>`;
    bindSessionHost(pinnedHost);
    bindSessionHost(savedHost);
  }

  function examplesForClass() {
    return EXAMPLES[classId] || [
      "Here’s a photo of tonight’s work. Where do I start?",
      "I wrote what I already tried. Ask me the next step."
    ];
  }

  function emptyLogHtml() {
    const chips = examplesForClass().map((q) => {
      return `<button type="button" class="bc-ex" data-example="${Game.esc(q)}">${Game.esc(q)}</button>`;
    }).join("");
    const line = COACH[classId] || TUTOR_LINE;
    return `
      <div class="bc-welcome">
        <p class="ask-who">${Game.esc(Tutor.IDENTITY)}</p>
        <p class="bc-coach">${Game.esc(line)}</p>
        <div class="bc-ex-list">${chips}</div>
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

  function scrollLog() {
    const log = document.getElementById("bc-log");
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }

  function shouldWheelScrollChat(el) {
    if (!el || !el.closest) return true;
    if (el.closest("#bc-log")) return false;
    if (el.closest("#bc-input")) return false;
    if (el.closest(".bc-rail")) return false;
    if (el.closest("#bc-calc, #bc-ptable, .bc-tools-drawer, .bc-tools-rail")) return false;
    return true;
  }

  function onBasecampWheel(e) {
    if (e.ctrlKey) return;
    if (document.body.classList.contains("bc-intro-on")) return;
    if (document.documentElement.classList.contains("bc-intro-pending")) return;
    if (!window.matchMedia || !window.matchMedia("(min-width: 840px)").matches) return;
    if (!shouldWheelScrollChat(e.target)) return;
    const log = document.getElementById("bc-log");
    if (!log) return;
    log.scrollTop += e.deltaY;
    if (e.cancelable) e.preventDefault();
  }

  function onComposerKeydown(e) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    if (e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    send();
  }

  async function paintLog() {
    const log = document.getElementById("bc-log");
    const session = current();
    const messages = (session && session.messages) || [];
    await hydrateSessionImages(session);
    if (!messages.length) {
      log.innerHTML = emptyLogHtml();
      log.querySelectorAll("[data-example]").forEach((btn) => {
        btn.addEventListener("click", () => useExample(btn.getAttribute("data-example")));
      });
      scrollLog();
      return;
    }
    log.innerHTML = messages.map(bubbleHtml).join("");
    scrollLog();
  }

  function useExample(text) {
    const input = document.getElementById("bc-input");
    if (!input) return;
    input.value = text || "";
    input.focus();
    try {
      input.setSelectionRange(input.value.length, input.value.length);
    } catch (_) {}
  }

  function paintResources() {
    const host = document.getElementById("bc-resources");
    if (!host) return;
    const cls = selectedClass() || { id: classId, name: className() };
    const html = Game.khanStripHtmlForClass(cls);
    host.innerHTML = html;
    host.hidden = !html;
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
        dropPending(el.getAttribute("data-drop"));
      });
    });
  }

  function revokePreview(url) {
    if (url && String(url).indexOf("blob:") === 0) {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }
  }

  function dropPending(id) {
    pending = pending.filter((p) => {
      if (p.id !== id) return true;
      revokePreview(p.preview);
      (p.pages || []).forEach((page) => revokePreview(page && page.preview));
      return false;
    });
    paintPending();
  }

  function pendingImages() {
    const out = [];
    pending.forEach((p) => {
      if (p.kind === "image" && p.data) out.push(p);
      if (p.kind === "pdf") {
        (p.pages || []).forEach((page) => {
          if (page && page.data) {
            out.push({
              id: page.id || p.id,
              name: p.name,
              mime: page.mime || "image/jpeg",
              data: page.data,
              blob: page.blob,
              preview: page.preview
            });
          }
        });
      }
    });
    return out;
  }

  function pendingPdfText() {
    const parts = pending
      .filter((p) => p.kind === "pdf" && p.text)
      .map((p) => String(p.text || "").trim())
      .filter(Boolean);
    if (!parts.length) return "";
    let block = "From the PDF (first pages):\n" + parts.join("\n");
    if (block.length > 10000) block = block.slice(0, 10000);
    return block;
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfJsLoading) return pdfJsLoading;
    pdfJsLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PDFJS_SRC;
      script.async = true;
      script.onload = () => {
        if (!window.pdfjsLib) {
          pdfJsLoading = null;
          reject(new Error("pdf.js missing"));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      };
      script.onerror = () => {
        pdfJsLoading = null;
        reject(new Error("pdf.js failed to load"));
      };
      document.head.appendChild(script);
    });
    return pdfJsLoading;
  }

  function canvasToJpegFile(canvas, name) {
    return new Promise((resolve) => {
      if (!canvas || !canvas.toBlob) {
        resolve(null);
        return;
      }
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        try {
          resolve(new File([blob], name || "page.jpg", { type: "image/jpeg" }));
        } catch (_) {
          resolve(blob);
        }
      }, "image/jpeg", JPEG_QUALITY);
    });
  }

  async function openPdfDocument(pdfjs, buf) {
    try {
      return await pdfjs.getDocument({ data: buf }).promise;
    } catch (err) {
      const msg = String((err && (err.name || err.message)) || err || "");
      if (/password/i.test(msg)) {
        const locked = new Error("locked");
        locked.code = "locked";
        throw locked;
      }
      return await pdfjs.getDocument({ data: buf, disableWorker: true }).promise;
    }
  }

  async function addPdf(file) {
    Game.toast("Reading PDF…");
    try {
      const pdfjs = await loadPdfJs();
      const buf = new Uint8Array(await file.arrayBuffer());
      const doc = await openPdfDocument(pdfjs, buf);
      const max = Math.min(PDF_MAX_PAGES, doc.numPages || 0);
      const pages = [];
      const textParts = [];
      for (let n = 1; n <= max; n += 1) {
        const page = await doc.getPage(n);
        const unscaled = page.getViewport({ scale: 1 });
        const scale = MAX_EDGE / Math.max(unscaled.width, 1);
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const ctx = canvas.getContext("2d");
        if (ctx) await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        const raw = await canvasToJpegFile(canvas, (file.name || "page") + "-p" + n + ".jpg");
        const compressed = raw ? await compressImage(raw) : null;
        if (compressed) {
          const data = await blobToBase64(compressed);
          pages.push({
            id: Game.uid("att"),
            mime: "image/jpeg",
            data: data,
            blob: compressed,
            preview: URL.createObjectURL(compressed)
          });
        }
        const content = await page.getTextContent();
        const pageText = ((content && content.items) || [])
          .map((it) => (it && it.str) || "")
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (pageText) textParts.push(pageText);
      }
      if (!pages.length && !textParts.length) {
        Game.toast("Could not read that PDF.");
        return;
      }
      let text = textParts.join("\n");
      if (text.length > PDF_TEXT_CAP) text = text.slice(0, PDF_TEXT_CAP);
      pending.push({
        id: Game.uid("att"),
        kind: "pdf",
        name: file.name || "PDF",
        mime: file.type || "application/pdf",
        pages: pages,
        text: text
      });
      paintPending();
      Game.toast(pages.length ? "PDF ready. Type what you noticed, then Send." : "Got the PDF text. Type what you noticed, then Send.");
    } catch (err) {
      const code = String((err && (err.code || err.message)) || "");
      if (code === "locked" || /password/i.test(code)) {
        Game.toast("That PDF is password locked.");
        return;
      }
      if (/pdf\.js failed to load|pdf\.js missing/i.test(code)) {
        Game.toast("Could not load the PDF reader. Check the connection and try again.");
        return;
      }
      Game.toast("Could not read that PDF.");
    }
  }

  function paintHud() {
    const bananas = document.getElementById("bananas");
    if (bananas) bananas.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
    const eggChip = document.getElementById("egg-chip");
    if (eggChip) Game.paintEggChip(pack);
  }

  function buildPeriodicTable() {
    if (ptableBuilt) return;
    const grid = document.getElementById("bc-ptable-grid");
    if (!grid) return;
    const cells = [];
    for (let r = 1; r <= 9; r += 1) {
      for (let c = 1; c <= 18; c += 1) {
        if (r >= 8 && c <= 2) {
          cells.push(`<span class="bc-el empty" aria-hidden="true"></span>`);
          continue;
        }
        if ((r === 6 || r === 7) && c === 3) {
          const mark = r === 6 ? "57–71" : "89–103";
          cells.push(`<span class="bc-el marker" aria-hidden="true">${mark}</span>`);
          continue;
        }
        const hit = PTABLE.find((el) => el[4] === r && el[5] === c);
        if (!hit) {
          cells.push(`<span class="bc-el empty" aria-hidden="true"></span>`);
          continue;
        }
        cells.push(`<button type="button" class="bc-el" data-el="${Game.esc(hit[0])}" title="${Game.esc(hit[1])}"><span class="bc-el-z">${hit[2]}</span><span class="bc-el-s">${Game.esc(hit[0])}</span></button>`);
      }
    }
    grid.innerHTML = cells.join("");
    grid.querySelectorAll("[data-el]").forEach((btn) => {
      btn.addEventListener("click", () => showElement(btn.getAttribute("data-el")));
    });
    ptableBuilt = true;
  }

  function showElement(symbol) {
    const hit = PTABLE.find((el) => el[0] === symbol);
    const host = document.getElementById("bc-ptable-detail");
    if (!hit || !host) return;
    host.innerHTML = `<strong>${Game.esc(hit[0])}</strong> · ${Game.esc(hit[1])}<span>#${hit[2]} · ${Game.esc(hit[3])}</span>`;
  }

  function railCollapsed() {
    try {
      return localStorage.getItem(RAIL_KEY) === "collapsed";
    } catch (_) {
      return false;
    }
  }

  function applyRailState() {
    const collapsed = railCollapsed();
    const shell = document.getElementById("bc-shell");
    const btn = document.getElementById("bc-rail-toggle");
    if (shell) shell.classList.toggle("rail-collapsed", collapsed);
    if (btn) {
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      btn.setAttribute("aria-label", collapsed ? "Expand classes" : "Collapse classes");
      btn.title = collapsed ? "Expand classes" : "Collapse classes";
    }
  }

  function toggleRail() {
    const next = railCollapsed() ? "open" : "collapsed";
    try {
      localStorage.setItem(RAIL_KEY, next);
    } catch (_) {}
    applyRailState();
  }

  function openPtableWindow(e) {
    const w = Math.max(1100, Math.min((screen && screen.availWidth) || 1400, 1600));
    const h = Math.max(720, Math.min((screen && screen.availHeight) || 900, 960));
    const win = window.open("ptable.html", "bw-ptable", "width=" + w + ",height=" + h + ",menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes");
    if (win && e) e.preventDefault();
  }

  function keepToolsDrawerOpen() {
    const drawer = document.getElementById("bc-tools-drawer");
    if (!drawer || !toolsMode()) return;
    drawer.open = true;
  }

  function paintTools() {
    const mode = toolsMode();
    const shell = document.getElementById("bc-shell");
    const rail = document.getElementById("bc-tools-rail");
    const drawer = document.getElementById("bc-tools-drawer");
    const calc = document.getElementById("bc-calc");
    const table = document.getElementById("bc-ptable");
    const summary = document.getElementById("bc-tools-summary");
    const show = !!mode;
    if (shell) shell.classList.toggle("has-tools", show);
    if (!rail || !calc || !table) return;
    if (!show) {
      rail.hidden = true;
      calc.hidden = true;
      table.hidden = true;
      return;
    }
    rail.hidden = false;
    calc.hidden = mode !== "calc";
    table.hidden = mode !== "ptable";
    if (drawer) drawer.open = true;
    if (summary) summary.textContent = mode === "calc" ? "Calculator" : "Periodic table";
    if (mode === "ptable") buildPeriodicTable();
    paintCalc();
  }

  function fmtCalcNum(n) {
    if (!isFinite(n)) return "Error";
    const rounded = Math.round(n * 1e10) / 1e10;
    return String(rounded);
  }

  function tokenizeCalc(src) {
    const s = String(src || "").replace(/\s+/g, "");
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (ch === "π") {
        tokens.push({ t: "num", v: Math.PI });
        i += 1;
        continue;
      }
      if (ch === "√") {
        tokens.push({ t: "fn", v: "sqrt" });
        i += 1;
        continue;
      }
      if (ch === "×") {
        tokens.push({ t: "op", v: "*" });
        i += 1;
        continue;
      }
      if (ch === "÷") {
        tokens.push({ t: "op", v: "/" });
        i += 1;
        continue;
      }
      if (ch === "−") {
        tokens.push({ t: "op", v: "-" });
        i += 1;
        continue;
      }
      if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
        tokens.push({ t: "op", v: ch });
        i += 1;
        continue;
      }
      if (ch === "(" || ch === ")") {
        tokens.push({ t: ch });
        i += 1;
        continue;
      }
      if (/[0-9.]/.test(ch)) {
        let j = i + 1;
        while (j < s.length && /[0-9.]/.test(s[j])) j += 1;
        const raw = s.slice(i, j);
        if (!raw || raw === "." || (raw.match(/\./g) || []).length > 1) throw new Error("bad number");
        tokens.push({ t: "num", v: Number(raw) });
        i = j;
        continue;
      }
      throw new Error("bad token");
    }
    return tokens;
  }

  function toRpn(tokens) {
    const out = [];
    const ops = [];
    const prec = { u: 4, sqrt: 4, "*": 3, "/": 3, "+": 2, "-": 2 };
    const right = { u: true, sqrt: true };
    let expectVal = true;
    tokens.forEach((tok) => {
      if (tok.t === "num") {
        out.push(tok);
        expectVal = false;
        return;
      }
      if (tok.t === "fn") {
        ops.push(tok);
        expectVal = true;
        return;
      }
      if (tok.t === "op") {
        let v = tok.v;
        if (expectVal && (v === "+" || v === "-")) {
          if (v === "+") return;
          v = "u";
        }
        const item = { t: "op", v: v };
        while (ops.length) {
          const top = ops[ops.length - 1];
          const topv = top.t === "fn" ? "sqrt" : top.v;
          if (top.t === "(") break;
          const pTop = prec[topv] || 0;
          const pCur = prec[v] || 0;
          if (pTop > pCur || (pTop === pCur && !right[v])) {
            out.push(ops.pop());
            continue;
          }
          break;
        }
        ops.push(item);
        expectVal = true;
        return;
      }
      if (tok.t === "(") {
        ops.push(tok);
        expectVal = true;
        return;
      }
      if (tok.t === ")") {
        while (ops.length && ops[ops.length - 1].t !== "(") out.push(ops.pop());
        if (!ops.length) throw new Error("paren");
        ops.pop();
        if (ops.length && ops[ops.length - 1].t === "fn") out.push(ops.pop());
        expectVal = false;
      }
    });
    while (ops.length) {
      const top = ops.pop();
      if (top.t === "(" || top.t === ")") throw new Error("paren");
      out.push(top);
    }
    return out;
  }

  function evalRpn(rpn) {
    const st = [];
    rpn.forEach((tok) => {
      if (tok.t === "num") {
        st.push(tok.v);
        return;
      }
      if (tok.t === "fn" || (tok.t === "op" && (tok.v === "u" || tok.v === "sqrt"))) {
        if (!st.length) throw new Error("arity");
        const a = st.pop();
        st.push(tok.v === "u" ? -a : Math.sqrt(a));
        return;
      }
      if (st.length < 2) throw new Error("arity");
      const b = st.pop();
      const a = st.pop();
      if (tok.v === "+") st.push(a + b);
      else if (tok.v === "-") st.push(a - b);
      else if (tok.v === "*") st.push(a * b);
      else if (tok.v === "/") st.push(a / b);
      else throw new Error("op");
    });
    if (st.length !== 1) throw new Error("expr");
    return st[0];
  }

  function evalCalc(expr) {
    const tokens = tokenizeCalc(expr);
    if (!tokens.length) return 0;
    return evalRpn(toRpn(tokens));
  }

  function paintCalc() {
    const exprEl = document.getElementById("bc-calc-expr");
    const outEl = document.getElementById("bc-calc-out");
    if (exprEl) exprEl.textContent = calcExpr || "";
    if (outEl) outEl.textContent = calcResult === "" ? (calcExpr || "0") : calcResult;
  }

  function applyCalc(key) {
    if (key === "C") {
      calcExpr = "";
      calcResult = "";
      calcFresh = false;
      paintCalc();
      return;
    }
    if (key === "bs") {
      calcExpr = calcExpr.slice(0, -1);
      calcFresh = false;
      paintCalc();
      return;
    }
    if (key === "=") {
      try {
        calcResult = fmtCalcNum(evalCalc(calcExpr || "0"));
        calcFresh = true;
      } catch (_) {
        calcResult = "Error";
        calcFresh = true;
      }
      paintCalc();
      return;
    }
    if (key === "√") {
      if (calcFresh) {
        calcExpr = "√(";
        calcFresh = false;
      } else {
        calcExpr += "√(";
      }
      paintCalc();
      return;
    }
    const startsNum = /[0-9.]/.test(key) || key === "π" || key === "180" || key === "180−";
    if (calcFresh && startsNum) {
      calcExpr = "";
      calcFresh = false;
    } else if (calcFresh && (key === "+" || key === "−" || key === "×" || key === "÷")) {
      calcExpr = calcResult && calcResult !== "Error" ? calcResult : calcExpr;
      calcFresh = false;
    } else {
      calcFresh = false;
    }
    calcExpr += key;
    paintCalc();
  }

  function useCalcResult() {
    const input = document.getElementById("bc-input");
    if (!input) return;
    const val = calcResult && calcResult !== "Error" ? calcResult : "";
    if (!val) {
      Game.toast("Solve it on the pad first, then tap Use this.");
      return;
    }
    input.value = input.value ? `${input.value.trim()} ${val}` : val;
    input.focus();
  }

  function paintAll() {
    paintHud();
    paintClasses();
    paintSessions();
    paintResources();
    paintPending();
    paintTools();
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

  function togglePin(id) {
    const row = Game.basecampSession(family, id);
    if (!row) return;
    const next = Game.setBasecampPinned(family, id, !row.pinned);
    family = next.family;
    paintSessions();
  }

  function deleteClimb(id) {
    const key = String(id || "");
    if (!key) return;
    if (typeof window.confirm === "function" && !window.confirm("Delete this climb?")) return;
    const y = window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
    const gone = Game.basecampSession(family, key);
    const wasOpen = key === sessionId;
    const next = Game.deleteBasecampSession(family, key);
    family = next.family;
    if (gone && gone.messages) {
      gone.messages.forEach((m) => {
        if (m && m.imageId) delete imageUrls[m.imageId];
      });
    }
    if (wasOpen) {
      const list = sessions();
      sessionId = list[0] ? list[0].id : "";
    }
    Promise.resolve(paintAll()).then(() => {
      try { window.scrollTo(0, y); } catch (_) {}
      scrollLog();
    });
  }

  function newSession() {
    const made = Game.createBasecampSession(family, classId, "New climb");
    family = made.family;
    sessionId = made.session.id;
    paintAll();
  }

  async function addFile(file, fromCamera) {
    if (!file) return;
    if (isPdfFile(file) && !fromCamera) {
      await addPdf(file);
      return;
    }
    if (!isImageFile(file, fromCamera)) {
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
      mime: compressed.type || file.type || "image/jpeg",
      data: data,
      blob: compressed,
      preview: preview
    });
    paintPending();
  }

  async function addFiles(list) {
    const files = Array.from(list || []).filter(Boolean);
    for (let i = 0; i < files.length; i += 1) {
      await addFile(files[i], false);
    }
  }

  function onComposerPaste(e) {
    const files = filesFromDataTransfer(e.clipboardData);
    const usable = files.filter((file) => isPdfFile(file) || isImageFile(file, false));
    if (!usable.length) return;
    if (e.preventDefault) e.preventDefault();
    addFiles(usable);
  }

  function onComposerDragOver(e) {
    if (!e.dataTransfer) return;
    if (e.preventDefault) e.preventDefault();
    const form = document.getElementById("bc-form");
    if (form) form.classList.add("is-drop");
  }

  function onComposerDragLeave(e) {
    const form = document.getElementById("bc-form");
    if (!form) return;
    if (e && e.relatedTarget && form.contains(e.relatedTarget)) return;
    form.classList.remove("is-drop");
  }

  function onComposerDrop(e) {
    const form = document.getElementById("bc-form");
    if (form) form.classList.remove("is-drop");
    const files = filesFromDataTransfer(e.dataTransfer);
    const usable = files.filter((file) => isPdfFile(file) || isImageFile(file, false));
    if (!usable.length) return;
    if (e.preventDefault) e.preventDefault();
    addFiles(usable);
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
    scrollLog();
    return el;
  }

  async function send() {
    if (sending) return;
    const input = document.getElementById("bc-input");
    const typed = (input.value || "").trim();
    const pdfBlock = pendingPdfText();
    const text = pdfBlock ? (typed ? (pdfBlock + "\n\n" + typed) : pdfBlock) : typed;
    const photos = pendingImages();
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
    if (typeof Game.recordBasecampQuery === "function") {
      const logged = Game.recordBasecampQuery(family, {
        classId: classId,
        className: className(),
        sessionId: added.session.id,
        sessionTitle: added.session.title || "",
        text: text,
        hasImage: !!firstPhoto,
        view: typeof Game.siteView === "function" ? Game.siteView() : "me"
      });
      family = logged.family;
    }
    if (typeof Game.track === "function") {
      Game.track("ask_ai", { classId: classId, message: text });
    }
    input.value = "";
    const sentImages = photos.map((p) => ({ mime: p.mime, data: p.data }));
    pending.forEach((p) => {
      const keep = firstPhoto && (p.id === firstPhoto.id || (p.pages || []).some((page) => page && page.id === firstPhoto.id));
      if (!keep) revokePreview(p.preview);
      (p.pages || []).forEach((page) => {
        if (!firstPhoto || !page || page.id !== firstPhoto.id) revokePreview(page && page.preview);
      });
    });
    pending = [];
    paintPending();
    paintSessions();
    await paintLog();
    const sendBtn = document.getElementById("bc-send");
    if (sendBtn) sendBtn.disabled = true;
    sending = true;
    const thinking = thinkingBubble();
    try {
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
      const reply = Game.addBasecampMessage(family, sessionId, {
        role: "mentor",
        text: data.reply || "I can walk it with you. I will not fill it in. What did you already try?",
        test: !data.live
      });
      family = reply.family;
      paintSessions();
      await paintLog();
      if (!data.live) {
        Game.toast("Offline Jungle Jam Tutor — honest fallback, not a photo read.");
      }
    } catch (_) {
      Game.toast("Tutor hit a snag. Try Send again.");
    } finally {
      if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);
      if (sendBtn) sendBtn.disabled = false;
      sending = false;
    }
  }

  const INTRO_SRC = "img/library/basecamp-intro.mp4";
  const INTRO_MS = 10000;
  let introView = "";
  let introDone = false;
  let introBound = false;
  let introTimer = 0;

  function introEls() {
    return {
      layer: document.getElementById("bc-intro"),
      video: document.getElementById("bc-intro-video"),
      skip: document.getElementById("bc-intro-skip"),
      play: document.getElementById("bc-intro-play"),
      shell: document.getElementById("bc-shell")
    };
  }

  function clearIntroTimer() {
    if (!introTimer) return;
    window.clearTimeout(introTimer);
    introTimer = 0;
  }

  function armIntroTimer() {
    clearIntroTimer();
    introTimer = window.setTimeout(finishBasecampIntro, INTRO_MS + 500);
  }

  function revealBasecampUi() {
    const { layer, video, play, shell } = introEls();
    document.documentElement.classList.remove("bc-intro-pending");
    document.body.classList.add("bc-ready");
    if (shell) shell.removeAttribute("aria-hidden");
    if (play) play.hidden = true;
    if (layer) layer.classList.add("fade-out");
    window.setTimeout(() => {
      document.body.classList.remove("bc-intro-on");
      if (layer) {
        layer.hidden = true;
        layer.classList.remove("open", "fade-out", "needs-tap");
      }
      if (video) {
        try { video.pause(); } catch (_) {}
        try { video.removeAttribute("src"); video.load(); } catch (_) {}
      }
    }, 560);
  }

  function finishBasecampIntro() {
    if (introDone) return;
    introDone = true;
    clearIntroTimer();
    if (typeof Game.markBasecampIntroPlayed === "function") {
      Game.markBasecampIntroPlayed(introView);
    }
    revealBasecampUi();
  }

  function showTapToPlay() {
    const { layer, play } = introEls();
    if (layer) layer.classList.add("needs-tap");
    if (play) play.hidden = false;
  }

  function playBasecampIntro() {
    const { video, play } = introEls();
    if (!video) {
      finishBasecampIntro();
      return;
    }
    if (play) play.hidden = true;
    video.muted = false;
    video.loop = false;
    const attempt = video.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(() => {
        const { layer } = introEls();
        if (layer) layer.classList.remove("needs-tap");
        armIntroTimer();
      }).catch(() => {
        showTapToPlay();
      });
    } else {
      armIntroTimer();
    }
  }

  function startBasecampIntro() {
    const { layer, video, skip, play, shell } = introEls();
    introView = typeof Game.siteView === "function" ? Game.siteView() : "me";
    document.documentElement.classList.add("bc-intro-pending");
    document.body.classList.add("bc-intro-on");
    if (shell) shell.setAttribute("aria-hidden", "true");
    if (!layer || !video) {
      finishBasecampIntro();
      return;
    }
    layer.hidden = false;
    layer.classList.add("open");
    video.setAttribute("src", INTRO_SRC);
    video.setAttribute("poster", "img/library/basecamp-bg.jpg");
    video.preload = "auto";
    if (!introBound) {
      introBound = true;
      video.addEventListener("ended", finishBasecampIntro);
      video.addEventListener("error", finishBasecampIntro);
      if (skip) skip.addEventListener("click", finishBasecampIntro);
      if (play) {
        play.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          playBasecampIntro();
        });
      }
      layer.addEventListener("click", (e) => {
        if (!layer.classList.contains("needs-tap")) return;
        if (e.target && e.target.closest && e.target.closest("#bc-intro-skip")) return;
        playBasecampIntro();
      });
    }
    playBasecampIntro();
    window.setTimeout(() => {
      if (!introDone) finishBasecampIntro();
    }, 20000);
  }

  function maybeStartBasecampIntro() {
    const shouldPlay = typeof Game.shouldPlayBasecampIntro === "function"
      ? Game.shouldPlayBasecampIntro()
      : true;
    if (!shouldPlay) {
      introDone = true;
      document.documentElement.classList.remove("bc-intro-pending");
      document.body.classList.remove("bc-intro-on");
      document.body.classList.add("bc-ready");
      const { layer } = introEls();
      if (layer) layer.hidden = true;
      return;
    }
    startBasecampIntro();
  }

  async function boot() {
    const q = params();
    const fromQuery = (q.get("class") || "").trim();
    cardTitle = (q.get("title") || "").trim();
    if (fromQuery) classId = fromQuery;
    paintTools();
    maybeStartBasecampIntro();
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    const progress = await Game.loadProgress();
    roster = (progress && progress.classes) || [];
    if (fromQuery && classes().some((c) => c.id === fromQuery)) classId = fromQuery;
    else if (!classes().some((c) => c.id === classId) && classes()[0]) classId = classes()[0].id;
    const list = sessions();
    if (list[0]) sessionId = list[0].id;
    document.getElementById("bc-form").addEventListener("submit", (e) => {
      e.preventDefault();
      send();
    });
    document.getElementById("bc-input").addEventListener("keydown", onComposerKeydown);
    document.getElementById("bc-input").addEventListener("paste", onComposerPaste);
    document.getElementById("bc-form").addEventListener("paste", onComposerPaste);
    document.getElementById("bc-form").addEventListener("dragover", onComposerDragOver);
    document.getElementById("bc-form").addEventListener("dragleave", onComposerDragLeave);
    document.getElementById("bc-form").addEventListener("drop", onComposerDrop);
    document.addEventListener("wheel", onBasecampWheel, { passive: false });
    document.getElementById("bc-new").addEventListener("click", newSession);
    const railToggle = document.getElementById("bc-rail-toggle");
    if (railToggle) railToggle.addEventListener("click", toggleRail);
    applyRailState();
    const ptableOpen = document.getElementById("bc-ptable-open");
    if (ptableOpen) ptableOpen.addEventListener("click", openPtableWindow);
    document.getElementById("bc-camera").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      addFile(file, true);
    });
    document.getElementById("bc-upload").addEventListener("change", (e) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = "";
      addFiles(files);
    });
    document.getElementById("bc-calc-pad").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-calc]");
      if (!btn || classId !== "geometry") return;
      applyCalc(btn.getAttribute("data-calc"));
    });
    document.getElementById("bc-calc-use").addEventListener("click", () => {
      if (classId !== "geometry") return;
      useCalcResult();
    });
    const drawer = document.getElementById("bc-tools-drawer");
    if (drawer) {
      drawer.open = true;
      drawer.addEventListener("toggle", () => {
        if (!window.matchMedia || !window.matchMedia("(min-width: 840px)").matches) return;
        keepToolsDrawerOpen();
      });
    }
    document.addEventListener("bw-site-view", () => paintAll());
    await paintAll();
  }

  boot();
})();
