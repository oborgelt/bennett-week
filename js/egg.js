(function () {
  const PACK = 80;
  const RUN_OUT_AT = 8;
  const SPOTS = [
    { left: "10%", top: "40%" },
    { left: "36%", top: "48%" },
    { left: "58%", top: "38%" },
    { left: "20%", top: "16%" },
    { left: "46%", top: "14%" },
    { left: "32%", top: "-4%" },
    { left: "6%", top: "18%" },
    { left: "62%", top: "8%" }
  ];

  let pack = null;
  let family = null;
  let library = null;
  let fed = 0;
  let afterBuy = 0;
  let dragging = null;
  let dragOffset = { x: 0, y: 0 };
  let dragStart = { x: 0, y: 0 };
  let busy = false;
  let bought = false;
  let won = false;
  let emptyBowl = false;

  function hud() {
    const el = document.getElementById("bananas");
    if (el) el.textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
  }

  function beep(kind) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = beep._ctx || new Ctx();
      beep._ctx = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = kind === "warn" ? "square" : "triangle";
      const f = kind === "eat" ? 180 : kind === "ok" ? 520 : 140;
      o.frequency.setValueAtTime(f, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(kind === "ok" ? 720 : 90, ctx.currentTime + 0.16);
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.24);
    } catch (_) {}
  }

  function slinky() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = slinky._ctx || new Ctx();
      slinky._ctx = ctx;
      const notes = [196, 220, 247, 262, 247, 220, 196, 165];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.14);
        g.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.14);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.14 + 0.16);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.14);
        o.stop(ctx.currentTime + i * 0.14 + 0.18);
      });
    } catch (_) {}
  }

  function speak(text) {
    try {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.84;
      u.pitch = 0.52;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  function titlebar(thin) {
    return `<div class="feed-titlebar${thin ? " thin" : ""}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>`;
  }

  function eaterSvg() {
    return `
      <svg class="eater-svg" viewBox="0 0 160 210" aria-hidden="true">
        <ellipse class="eater-body" cx="80" cy="86" rx="58" ry="76" />
        <g class="eater-face-open">
          <circle class="eater-eye" cx="56" cy="64" r="8" />
          <circle class="eater-eye" cx="104" cy="64" r="8" />
          <circle class="eater-pupil" cx="58" cy="66" r="2.6" />
          <circle class="eater-pupil" cx="106" cy="66" r="2.6" />
          <circle class="eater-mouth" cx="80" cy="118" r="30" />
        </g>
        <g class="eater-face-chew">
          <path class="eater-squint" d="M46 58 L64 70 L46 82" />
          <path class="eater-squint" d="M114 58 L96 70 L114 82" />
          <path class="eater-line" d="M64 118 h32" />
        </g>
        <g class="eater-butt">
          <circle class="eater-eye" cx="58" cy="128" r="16" />
          <circle class="eater-eye" cx="102" cy="128" r="16" />
        </g>
        <path class="eater-foot" d="M52 176 v20 h-22" />
        <path class="eater-foot" d="M108 176 v20 h22" />
      </svg>
      <button type="button" class="mouth-hit" id="mouth-hit" aria-label="Feed mouth"></button>`;
  }

  function bowlSvg() {
    return `
      <svg class="bowl-svg" viewBox="0 0 180 118" aria-hidden="true">
        <defs>
          <clipPath id="bowl-clip">
            <path d="M14 24 h152 l-18 82 h-116 z" />
          </clipPath>
        </defs>
        <path class="bowl-body" d="M14 24 h152 l-18 82 h-116 z" />
        <g clip-path="url(#bowl-clip)">
          <path class="bowl-stripe" d="M8 42 h164" />
          <path class="bowl-stripe" d="M12 60 h156" />
          <path class="bowl-stripe" d="M18 78 h144" />
          <path class="bowl-stripe" d="M26 96 h128" />
        </g>
      </svg>`;
  }

  function smallEgg(id) {
    return `<button type="button" class="nugget" data-egg="${id}" aria-label="Egg">
      <svg viewBox="0 0 36 46" aria-hidden="true">
        <ellipse cx="18" cy="23" rx="14" ry="18" />
      </svg>
    </button>`;
  }

  function renderPlay() {
    fed = 0;
    afterBuy = 0;
    bought = false;
    busy = false;
    won = false;
    emptyBowl = false;
    dragging = null;
    document.getElementById("office").innerHTML = `
      <div class="feed-window" id="feed" aria-label="FEED EGGS">
        ${titlebar(false)}
        <h1 class="feed-title">FEED EGGS</h1>
        <div class="feed-stage" id="stage">
          <div class="eater" id="eater">${eaterSvg()}</div>
          <div class="bowl-wrap">
            <div class="bowl" id="bowl">${bowlSvg()}<div class="nugget-pile" id="pile"></div></div>
          </div>
        </div>
        <div class="feed-popup count" id="count-pop" hidden>
          ${titlebar(true)}
          <p id="count-text">6 EGGS</p>
        </div>
        <div class="feed-popup warn" id="warn-pop" hidden>
          ${titlebar(true)}
          <div class="warn-tri" aria-label="Warning">!</div>
        </div>
        <div class="feed-popup buy" id="buy-pop" hidden>
          ${titlebar(true)}
          <form id="buy-form">
            <p>Dude, you ran out of eggs.</p>
            <p>Would you like to buy</p>
            <p>an 80 pack of eggs?</p>
            <input id="buy-input" maxlength="24" autocomplete="off" enterkeyhint="go" aria-label="Answer">
          </form>
        </div>
        <div class="feed-popup win" id="win-pop" hidden>
          ${titlebar(true)}
          <p id="win-text">41 EGGS</p>
          <p class="butt-line" id="win-sub">egg butt.</p>
        </div>
        <div class="company-warn" id="company-warn" hidden>
          <p class="company-who">THE COMPANY</p>
          <p>This content is not allowed.</p>
          <p>Closing FEED EGGS.</p>
        </div>
      </div>`;
    fillPile();
    bindPlay();
  }

  function fillPile() {
    const pile = document.getElementById("pile");
    if (!pile) return;
    pile.innerHTML = "";
    if (emptyBowl) return;
    SPOTS.forEach((spot, i) => {
      pile.insertAdjacentHTML("beforeend", smallEgg("e" + i));
      const el = pile.lastElementChild;
      el.style.left = spot.left;
      el.style.top = spot.top;
    });
  }

  function hidePops() {
    ["count-pop", "warn-pop", "buy-pop", "win-pop", "company-warn"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function speakThen(text, done) {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done();
    };
    try {
      if (!window.speechSynthesis) {
        setTimeout(finish, 1800);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.82;
      u.pitch = 0.5;
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setTimeout(finish, 3200);
    } catch (_) {
      setTimeout(finish, 1800);
    }
  }

  function alarm() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = alarm._ctx || new Ctx();
      alarm._ctx = ctx;
      for (let i = 0; i < 6; i += 1) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(i % 2 ? 880 : 620, ctx.currentTime + i * 0.12);
        g.gain.setValueAtTime(0.055, ctx.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.1);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.12);
        o.stop(ctx.currentTime + i * 0.12 + 0.11);
      }
    } catch (_) {}
  }

  function showCount(label, line) {
    const pop = document.getElementById("count-pop");
    if (!pop || won) return;
    hidePops();
    document.getElementById("count-text").textContent = label;
    pop.hidden = false;
    if (line) speak(line);
    clearTimeout(showCount._t);
    showCount._t = setTimeout(() => {
      if (!won && document.getElementById("buy-pop") && document.getElementById("buy-pop").hidden) {
        pop.hidden = true;
      }
    }, 1400);
  }

  function showWarn() {
    if (won) return;
    hidePops();
    const pop = document.getElementById("warn-pop");
    pop.hidden = false;
    beep("warn");
    setTimeout(() => { if (pop) pop.hidden = true; }, 900);
  }

  function setFace(mode) {
    const eater = document.getElementById("eater");
    if (!eater) return;
    eater.classList.remove("chew", "butt");
    if (mode) eater.classList.add(mode);
  }

  function pointIn(el, x, y) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 22;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  function nextBeat() {
    if (!bought) {
      if (fed === 1 || fed === 4 || fed === 7) {
        showCount("6 EGGS", "Six eggs.");
      }
      if (fed >= RUN_OUT_AT) {
        emptyBowl = true;
        fillPile();
        hidePops();
        document.getElementById("buy-pop").hidden = false;
        const input = document.getElementById("buy-input");
        input.value = "";
        input.focus();
        speak("Dude, you ran out of eggs. Would you like to buy an 80 pack of eggs?");
        return;
      }
      return;
    }
    if (afterBuy === 1) {
      showCount("40 EGGS", "You now have 40 eggs.");
      return;
    }
    if (afterBuy >= 2) {
      revealWin();
    }
  }

  function chewALittle(done) {
    const beats = ["chew", "", "chew", ""];
    let i = 0;
    function step() {
      setFace(beats[i] || "");
      i += 1;
      if (i < beats.length) setTimeout(step, 120);
      else done();
    }
    step();
  }

  function eat() {
    busy = true;
    fed += 1;
    if (bought) afterBuy += 1;
    if (!emptyBowl) fillPile();
    beep("eat");
    chewALittle(() => {
      busy = false;
      if (!won) nextBeat();
    });
  }

  function revealWin() {
    won = true;
    busy = true;
    hidePops();
    setFace("butt");
    const pop = document.getElementById("win-pop");
    document.getElementById("win-text").textContent = "41 EGGS";
    document.getElementById("win-sub").textContent = "egg butt.";
    pop.hidden = false;
    Game.addBananas(2);
    hud();
    runWinSounds();
  }

  async function runWinSounds() {
    Game.primeLibraryAudio();
    const usedEnd = Game.playSoundCue(family, library, "egg-end");
    if (!usedEnd) slinky();
    await Game.waitForLibraryAudio(usedEnd ? 20000 : 1400);
    speakThen("you are looking at a nude egg", () => {
      companyShutdown();
    });
  }

  function companyShutdown() {
    const warn = document.getElementById("company-warn");
    const win = document.getElementById("win-pop");
    if (win) win.hidden = true;
    if (warn) warn.hidden = false;
    const usedClosed = Game.playSoundCue(family, library, "egg-closed");
    if (!usedClosed) alarm();
    const wait = usedClosed ? Game.waitForLibraryAudio(8000) : new Promise((resolve) => setTimeout(resolve, 1100));
    wait.then(() => {
      killGame();
      Game.playRandomLibraryItem(library);
    });
  }

  function killGame() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {}
    const office = document.getElementById("office");
    office.innerHTML = `
      <div class="feed-dead" role="alert">
        <p>FEED EGGS was closed by the company.</p>
        <a class="btn primary" href="index.html">Back to this week</a>
      </div>`;
  }

  function buyPack() {
    bought = true;
    emptyBowl = false;
    hidePops();
    fillPile();
    beep("ok");
  }

  function trailAt(x, y) {
    const t = document.createElement("span");
    t.className = "egg-trail";
    t.style.left = (x - 12) + "px";
    t.style.top = (y - 16) + "px";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 160);
  }

  function flyToMouth(egg, done) {
    const mouth = document.getElementById("mouth-hit");
    const er = egg.getBoundingClientRect();
    const mr = mouth.getBoundingClientRect();
    egg.classList.add("flying", "toss");
    egg.style.position = "fixed";
    egg.style.left = er.left + "px";
    egg.style.top = er.top + "px";
    egg.style.zIndex = "50";
    requestAnimationFrame(() => {
      egg.style.left = (mr.left + mr.width / 2 - er.width / 2) + "px";
      egg.style.top = (mr.top + mr.height / 2 - er.height / 2) + "px";
    });
    setTimeout(done, 220);
  }

  function clearDrag(egg) {
    egg.classList.remove("flying", "near", "toss");
    egg.style.position = "";
    egg.style.left = "";
    egg.style.top = "";
    egg.style.zIndex = "";
    egg.style.transition = "";
  }

  function releaseEgg(e) {
    if (!dragging) return;
    const egg = dragging;
    const mouth = document.getElementById("mouth-hit");
    const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
    const hit = pointIn(mouth, e.clientX, e.clientY);
    dragging = null;
    if (won || busy) {
      clearDrag(egg);
      fillPile();
      return;
    }
    if (hit || moved < 14) {
      flyToMouth(egg, () => {
        clearDrag(egg);
        eat();
      });
      return;
    }
    clearDrag(egg);
    fillPile();
    if (fed > 0) showWarn();
  }

  function bindPlay() {
    const feed = document.getElementById("feed");

    feed.addEventListener("pointerdown", (e) => {
      const egg = e.target.closest("[data-egg]");
      if (!egg || busy || won) return;
      if (!document.getElementById("buy-pop").hidden) return;
      e.preventDefault();
      Game.primeLibraryAudio();
      dragging = egg;
      dragStart.x = e.clientX;
      dragStart.y = e.clientY;
      egg.classList.add("flying");
      try { egg.setPointerCapture(e.pointerId); } catch (_) {}
      const r = egg.getBoundingClientRect();
      dragOffset.x = e.clientX - r.left;
      dragOffset.y = e.clientY - r.top;
      egg.style.position = "fixed";
      egg.style.left = r.left + "px";
      egg.style.top = r.top + "px";
      egg.style.zIndex = "50";
    });

    feed.addEventListener("pointermove", (e) => {
      if (!dragging || dragging.classList.contains("toss")) return;
      dragging.style.left = (e.clientX - dragOffset.x) + "px";
      dragging.style.top = (e.clientY - dragOffset.y) + "px";
      dragging.classList.toggle("near", pointIn(document.getElementById("mouth-hit"), e.clientX, e.clientY));
      if (e.movementX || e.movementY) trailAt(e.clientX, e.clientY);
    });

    feed.addEventListener("pointerup", releaseEgg);
    feed.addEventListener("pointercancel", releaseEgg);

    document.getElementById("buy-form").addEventListener("submit", (e) => {
      e.preventDefault();
      buyPack();
    });
  }

  function renderLocked() {
    document.getElementById("office").innerHTML = `
      <div class="egg-locked">
        <p class="feed-title">FEED EGGS</p>
        <h2>Still locked</h2>
        <p>This dumb game unlocks as a reward. A parent can award it from the desk, or keep poking secrets in the lobby.</p>
        <a class="btn primary" href="index.html">Back to this week</a>
      </div>`;
  }

  async function boot() {
    pack = await Game.loadAchievements();
    family = await Game.loadFamily();
    library = await Game.loadLibrary();
    await Game.hydrateLibraryBlobs(library);
    hud();
    if (!Game.hasEggGame(pack)) {
      renderLocked();
      return;
    }
    renderPlay();
  }

  boot();
})();
