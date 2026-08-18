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
  const COACH = {
    geometry: "Foster packet first — name the givens, then we’ll walk the next step.",
    chemistry: "Show the page or a try. I will not fill the slides.",
    "english-10": "Show the comic or your sentences. I will not write it.",
    sociology: "Show what you tried or a photo. I will not draft it.",
    "web-design": "Show what you tried or a photo. I will not draft it.",
    band: "Show what you tried or a photo. I will not draft it.",
    strength: "Show what you tried or a photo. I will not draft it.",
    "academic-intervention": "Show what you tried or a photo. I will not draft it."
  };
  const PTABLE = [
    ["H", "Hydrogen", 1, "1.008", 1, 1],
    ["He", "Helium", 2, "4.003", 1, 18],
    ["Li", "Lithium", 3, "6.94", 2, 1],
    ["Be", "Beryllium", 4, "9.012", 2, 2],
    ["B", "Boron", 5, "10.81", 2, 13],
    ["C", "Carbon", 6, "12.01", 2, 14],
    ["N", "Nitrogen", 7, "14.01", 2, 15],
    ["O", "Oxygen", 8, "16.00", 2, 16],
    ["F", "Fluorine", 9, "19.00", 2, 17],
    ["Ne", "Neon", 10, "20.18", 2, 18],
    ["Na", "Sodium", 11, "22.99", 3, 1],
    ["Mg", "Magnesium", 12, "24.31", 3, 2],
    ["Al", "Aluminum", 13, "26.98", 3, 13],
    ["Si", "Silicon", 14, "28.09", 3, 14],
    ["P", "Phosphorus", 15, "30.97", 3, 15],
    ["S", "Sulfur", 16, "32.06", 3, 16],
    ["Cl", "Chlorine", 17, "35.45", 3, 17],
    ["Ar", "Argon", 18, "39.95", 3, 18],
    ["K", "Potassium", 19, "39.10", 4, 1],
    ["Ca", "Calcium", 20, "40.08", 4, 2],
    ["Sc", "Scandium", 21, "44.96", 4, 3],
    ["Ti", "Titanium", 22, "47.87", 4, 4],
    ["V", "Vanadium", 23, "50.94", 4, 5],
    ["Cr", "Chromium", 24, "52.00", 4, 6],
    ["Mn", "Manganese", 25, "54.94", 4, 7],
    ["Fe", "Iron", 26, "55.85", 4, 8],
    ["Co", "Cobalt", 27, "58.93", 4, 9],
    ["Ni", "Nickel", 28, "58.69", 4, 10],
    ["Cu", "Copper", 29, "63.55", 4, 11],
    ["Zn", "Zinc", 30, "65.38", 4, 12],
    ["Ga", "Gallium", 31, "69.72", 4, 13],
    ["Ge", "Germanium", 32, "72.63", 4, 14],
    ["As", "Arsenic", 33, "74.92", 4, 15],
    ["Se", "Selenium", 34, "78.97", 4, 16],
    ["Br", "Bromine", 35, "79.90", 4, 17],
    ["Kr", "Krypton", 36, "83.80", 4, 18],
    ["Rb", "Rubidium", 37, "85.47", 5, 1],
    ["Sr", "Strontium", 38, "87.62", 5, 2],
    ["Y", "Yttrium", 39, "88.91", 5, 3],
    ["Zr", "Zirconium", 40, "91.22", 5, 4],
    ["Nb", "Niobium", 41, "92.91", 5, 5],
    ["Mo", "Molybdenum", 42, "95.95", 5, 6],
    ["Tc", "Technetium", 43, "98", 5, 7],
    ["Ru", "Ruthenium", 44, "101.1", 5, 8],
    ["Rh", "Rhodium", 45, "102.9", 5, 9],
    ["Pd", "Palladium", 46, "106.4", 5, 10],
    ["Ag", "Silver", 47, "107.9", 5, 11],
    ["Cd", "Cadmium", 48, "112.4", 5, 12],
    ["In", "Indium", 49, "114.8", 5, 13],
    ["Sn", "Tin", 50, "118.7", 5, 14],
    ["Sb", "Antimony", 51, "121.8", 5, 15],
    ["Te", "Tellurium", 52, "127.6", 5, 16],
    ["I", "Iodine", 53, "126.9", 5, 17],
    ["Xe", "Xenon", 54, "131.3", 5, 18],
    ["Cs", "Cesium", 55, "132.9", 6, 1],
    ["Ba", "Barium", 56, "137.3", 6, 2],
    ["La", "Lanthanum", 57, "138.9", 8, 3],
    ["Hf", "Hafnium", 72, "178.5", 6, 4],
    ["Ta", "Tantalum", 73, "180.9", 6, 5],
    ["W", "Tungsten", 74, "183.8", 6, 6],
    ["Re", "Rhenium", 75, "186.2", 6, 7],
    ["Os", "Osmium", 76, "190.2", 6, 8],
    ["Ir", "Iridium", 77, "192.2", 6, 9],
    ["Pt", "Platinum", 78, "195.1", 6, 10],
    ["Au", "Gold", 79, "197.0", 6, 11],
    ["Hg", "Mercury", 80, "200.6", 6, 12],
    ["Tl", "Thallium", 81, "204.4", 6, 13],
    ["Pb", "Lead", 82, "207.2", 6, 14],
    ["Bi", "Bismuth", 83, "209.0", 6, 15],
    ["Po", "Polonium", 84, "209", 6, 16],
    ["At", "Astatine", 85, "210", 6, 17],
    ["Rn", "Radon", 86, "222", 6, 18],
    ["Fr", "Francium", 87, "223", 7, 1],
    ["Ra", "Radium", 88, "226", 7, 2],
    ["Ac", "Actinium", 89, "227", 9, 3],
    ["Rf", "Rutherfordium", 104, "267", 7, 4],
    ["Db", "Dubnium", 105, "268", 7, 5],
    ["Sg", "Seaborgium", 106, "269", 7, 6],
    ["Bh", "Bohrium", 107, "270", 7, 7],
    ["Hs", "Hassium", 108, "277", 7, 8],
    ["Mt", "Meitnerium", 109, "278", 7, 9],
    ["Ds", "Darmstadtium", 110, "281", 7, 10],
    ["Rg", "Roentgenium", 111, "282", 7, 11],
    ["Cn", "Copernicium", 112, "285", 7, 12],
    ["Nh", "Nihonium", 113, "286", 7, 13],
    ["Fl", "Flerovium", 114, "289", 7, 14],
    ["Mc", "Moscovium", 115, "290", 7, 15],
    ["Lv", "Livermorium", 116, "293", 7, 16],
    ["Ts", "Tennessine", 117, "294", 7, 17],
    ["Og", "Oganesson", 118, "294", 7, 18],
    ["Ce", "Cerium", 58, "140.1", 8, 4],
    ["Pr", "Praseodymium", 59, "140.9", 8, 5],
    ["Nd", "Neodymium", 60, "144.2", 8, 6],
    ["Pm", "Promethium", 61, "145", 8, 7],
    ["Sm", "Samarium", 62, "150.4", 8, 8],
    ["Eu", "Europium", 63, "152.0", 8, 9],
    ["Gd", "Gadolinium", 64, "157.3", 8, 10],
    ["Tb", "Terbium", 65, "158.9", 8, 11],
    ["Dy", "Dysprosium", 66, "162.5", 8, 12],
    ["Ho", "Holmium", 67, "164.9", 8, 13],
    ["Er", "Erbium", 68, "167.3", 8, 14],
    ["Tm", "Thulium", 69, "168.9", 8, 15],
    ["Yb", "Ytterbium", 70, "173.0", 8, 16],
    ["Lu", "Lutetium", 71, "175.0", 8, 17],
    ["Th", "Thorium", 90, "232.0", 9, 4],
    ["Pa", "Protactinium", 91, "231.0", 9, 5],
    ["U", "Uranium", 92, "238.0", 9, 6],
    ["Np", "Neptunium", 93, "237", 9, 7],
    ["Pu", "Plutonium", 94, "244", 9, 8],
    ["Am", "Americium", 95, "243", 9, 9],
    ["Cm", "Curium", 96, "247", 9, 10],
    ["Bk", "Berkelium", 97, "247", 9, 11],
    ["Cf", "Californium", 98, "251", 9, 12],
    ["Es", "Einsteinium", 99, "252", 9, 13],
    ["Fm", "Fermium", 100, "257", 9, 14],
    ["Md", "Mendelevium", 101, "258", 9, 15],
    ["No", "Nobelium", 102, "259", 9, 16],
    ["Lr", "Lawrencium", 103, "266", 9, 17]
  ];
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

  function sessionRowHtml(s) {
    const on = s.id === sessionId;
    const when = Game.fmtStamp(s.updated) || "";
    const pinned = !!s.pinned;
    return `<div class="bc-session-row${on ? " on" : ""}" role="listitem">
      <button type="button" class="bc-session${on ? " on" : ""}" data-session="${Game.esc(s.id)}">
        <span class="bc-session-title">${Game.esc(s.title || "New climb")}</span>
        <span class="bc-session-at">${Game.esc(when)}</span>
      </button>
      <button type="button" class="bc-pin${pinned ? " on" : ""}" data-pin="${Game.esc(s.id)}" aria-pressed="${pinned ? "true" : "false"}" aria-label="${pinned ? "Unpin" : "Pin"}">${pinned ? "★" : "☆"}</button>
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
  }

  function paintSessions() {
    const pinnedHost = document.getElementById("bc-pinned");
    const savedHost = document.getElementById("bc-sessions");
    const pinned = pinnedSessions();
    const saved = savedSessions();
    pinnedHost.innerHTML = pinned.length
      ? pinned.map(sessionRowHtml).join("")
      : `<p class="empty">Pin a climb to keep it up here.</p>`;
    savedHost.innerHTML = saved.length
      ? saved.map(sessionRowHtml).join("")
      : `<p class="empty">No climbs yet. New session starts a fresh thread.</p>`;
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
    const line = COACH[classId] || "Show what you tried or a photo. I will not draft it.";
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

  function paintTools() {
    const mode = toolsMode();
    const shell = document.getElementById("bc-shell");
    const rail = document.getElementById("bc-tools-rail");
    const calc = document.getElementById("bc-calc");
    const table = document.getElementById("bc-ptable");
    const summary = document.getElementById("bc-tools-summary");
    if (shell) shell.classList.toggle("has-tools", !!mode);
    if (!rail || !calc || !table) return;
    if (!mode) {
      rail.hidden = true;
      calc.hidden = true;
      table.hidden = true;
      return;
    }
    rail.hidden = false;
    calc.hidden = mode !== "calc";
    table.hidden = mode !== "ptable";
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
    scrollLog();
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
    maybeStartBasecampIntro();
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
    document.getElementById("bc-calc-pad").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-calc]");
      if (!btn || classId !== "geometry") return;
      applyCalc(btn.getAttribute("data-calc"));
    });
    document.getElementById("bc-calc-use").addEventListener("click", () => {
      if (classId !== "geometry") return;
      useCalcResult();
    });
    document.addEventListener("bw-site-view", () => paintAll());
    await paintAll();
  }

  boot();
})();
