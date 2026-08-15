(function () {
  const START_EGGS = 6;
  const PACK = 80;
  const LIES = [6, 6, 40, 41, 6, 25, 40, 80, 41, 7];
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
  let left = START_EGGS;
  let fed = 0;
  let dragging = null;
  let dragOffset = { x: 0, y: 0 };
  let busy = false;
  let bought = false;
  let won = false;

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

  function speakCount(n) {
    try {
      if (!window.speechSynthesis) return;
      const words = {
        6: "Six eggs.",
        7: "Seven eggs.",
        25: "Twenty five eggs.",
        40: "Forty eggs.",
        41: "Forty one eggs.",
        80: "Eighty eggs."
      };
      const u = new SpeechSynthesisUtterance(words[n] || (n + " eggs."));
      u.rate = 0.82;
      u.pitch = 0.55;
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
          <ellipse cx="62" cy="124" rx="18" ry="20" />
          <ellipse cx="98" cy="124" rx="18" ry="20" />
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
    left = START_EGGS;
    fed = 0;
    bought = false;
    busy = false;
    won = false;
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
          <p class="butt-line">egg butt.</p>
          <button type="button" class="feed-again" id="play-again">Play again</button>
        </div>
      </div>`;
    fillPile();
    bindPlay();
    showCount(START_EGGS, false);
  }

  function fillPile() {
    const pile = document.getElementById("pile");
    if (!pile) return;
    pile.innerHTML = "";
    const show = Math.min(Math.max(left, 0), SPOTS.length);
    for (let i = 0; i < show; i += 1) {
      pile.insertAdjacentHTML("beforeend", smallEgg("e" + i));
      const el = pile.lastElementChild;
      el.style.left = SPOTS[i].left;
      el.style.top = SPOTS[i].top;
    }
  }

  function hidePops() {
    ["count-pop", "warn-pop", "buy-pop", "win-pop"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function liedCount() {
    if (fed <= 0) return START_EGGS;
    return LIES[Math.min(fed - 1, LIES.length - 1)];
  }

  function showCount(n, talk) {
    const pop = document.getElementById("count-pop");
    if (!pop || won) return;
    hidePops();
    document.getElementById("count-text").textContent = n + " EGGS";
    pop.hidden = false;
    if (talk) speakCount(n);
    clearTimeout(showCount._t);
    showCount._t = setTimeout(() => {
      if (!won && document.getElementById("buy-pop") && document.getElementById("buy-pop").hidden) {
        pop.hidden = true;
      }
    }, 1200);
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

  function eat() {
    busy = true;
    setFace("chew");
    left = Math.max(0, left - 1);
    fed += 1;
    fillPile();
    const n = liedCount();
    showCount(n, true);
    beep("eat");
    setTimeout(() => {
      setFace("");
      busy = false;
      if (won) return;
      if (left <= 0 && !bought) {
        hidePops();
        document.getElementById("buy-pop").hidden = false;
        const input = document.getElementById("buy-input");
        input.value = "";
        input.focus();
      } else if (bought && fed >= START_EGGS + 2) {
        revealButt();
      }
    }, 420);
  }

  function revealButt() {
    won = true;
    busy = true;
    setFace("butt");
    hidePops();
    document.getElementById("win-pop").hidden = false;
    Game.confetti();
    Game.addBananas(2);
    hud();
    beep("ok");
    Game.toast("egg butt. +2 bananas");
  }

  function buyPack() {
    bought = true;
    left = PACK;
    hidePops();
    fillPile();
    showCount(PACK, true);
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

  function releaseEgg(e) {
    if (!dragging) return;
    const egg = dragging;
    const mouth = document.getElementById("mouth-hit");
    const hit = pointIn(mouth, e.clientX, e.clientY);
    egg.classList.remove("flying", "near");
    egg.style.position = "";
    egg.style.left = "";
    egg.style.top = "";
    egg.style.zIndex = "";
    dragging = null;
    if (hit && !busy && !won) eat();
    else {
      fillPile();
      if (fed > 0 && !won) showWarn();
    }
  }

  function bindPlay() {
    const feed = document.getElementById("feed");

    feed.addEventListener("pointerdown", (e) => {
      const egg = e.target.closest("[data-egg]");
      if (!egg || busy || won) return;
      if (!document.getElementById("buy-pop").hidden) return;
      e.preventDefault();
      dragging = egg;
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
      if (!dragging) return;
      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;
      dragging.style.left = x + "px";
      dragging.style.top = y + "px";
      dragging.classList.toggle("near", pointIn(document.getElementById("mouth-hit"), e.clientX, e.clientY));
      if (e.movementX || e.movementY) trailAt(e.clientX, e.clientY);
    });

    feed.addEventListener("pointerup", releaseEgg);
    feed.addEventListener("pointercancel", releaseEgg);

    document.getElementById("buy-form").addEventListener("submit", (e) => {
      e.preventDefault();
      buyPack();
    });

    document.getElementById("play-again").addEventListener("click", renderPlay);
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
    hud();
    if (!Game.hasEggGame(pack)) {
      renderLocked();
      return;
    }
    renderPlay();
  }

  boot();
})();
