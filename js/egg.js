(function () {
  const BOSS = [
    "So if we take the Q3 piece and just… slide it.",
    "I need you looking at me for this part.",
    "The Henderson thing is really the whole meeting.",
    "Are you writing this down?",
    "Tim. Tim. The eggs can wait.",
    "We are not putting eggs in the deck.",
    "I’m going to keep talking until you look up.",
    "This is a two-minute conversation if you stop."
  ];
  const TIM = [
    "Yep. Totally.",
    "One second I almost have it.",
    "I’m listening. I’m listening.",
    "That’s not the right number…",
    "I know. I KNOW."
  ];

  let pack = null;
  let need = 3;
  let fails = 0;
  let won = false;
  let dragging = null;
  let dragOffset = { x: 0, y: 0 };

  function hud() {
    document.getElementById("bananas").textContent = `${Game.currency(pack).emoji} ${Game.getBananas()}`;
  }

  function talk(id, lines) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = lines[Math.floor(Math.random() * lines.length)];
  }

  function beep(bad) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = beep._ctx || new Ctx();
      beep._ctx = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = bad ? "square" : "triangle";
      o.frequency.setValueAtTime(bad ? 140 : 520, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(bad ? 80 : 720, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }

  function eggHtml(id, butt) {
    return `
      <button type="button" class="egg${butt ? " is-butt" : ""}" data-egg="${id}" aria-label="${butt ? "Egg butt" : "Egg"}">
        <span class="egg-shell">
          <span class="egg-face" aria-hidden="true">
            <i></i><i></i>
            <b></b>
          </span>
          <span class="egg-butt" aria-hidden="true">
            <em></em><em></em>
          </span>
        </span>
      </button>`;
  }

  function countBasket() {
    return document.getElementById("egg-basket").querySelectorAll("[data-egg]").length;
  }

  function renderPlay() {
    const office = document.getElementById("office");
    office.innerHTML = `
      <aside class="boss-col">
        <div class="boss" aria-hidden="true">
          <div class="boss-head"></div>
          <div class="boss-body"></div>
        </div>
        <div class="speech" id="boss-talk">${Game.esc(BOSS[0])}</div>
        <p class="tim-line" id="tim-talk">${Game.esc(TIM[0])}</p>
      </aside>
      <section class="crt" aria-label="Office computer">
        <div class="crt-bezel">
          <div class="win95">
            <div class="win95-bar">
              <span>eggbasket.exe</span>
              <span class="win95-x">×</span>
            </div>
            <div class="win95-body">
              <p class="egg-goal">Put <strong id="egg-need">${need}</strong> eggs in the basket.</p>
              <div class="egg-stage">
                <div class="egg-table" id="egg-table"></div>
                <div class="egg-basket" id="egg-basket">
                  <span class="basket-label">basket</span>
                </div>
              </div>
              <div class="egg-actions">
                <button type="button" class="act" id="egg-ok">That’s the eggs</button>
                <span class="egg-count" id="egg-count">Eggs: 0</span>
              </div>
              <p class="egg-msg" id="egg-msg" role="status"></p>
            </div>
          </div>
        </div>
      </section>`;
    spawnEggs(6);
    bindDrag();
    document.getElementById("egg-ok").addEventListener("click", submitEggs);
    setInterval(() => talk("boss-talk", BOSS), 4200);
  }

  function spawnEggs(n) {
    const table = document.getElementById("egg-table");
    table.innerHTML = "";
    for (let i = 0; i < n; i += 1) {
      table.insertAdjacentHTML("beforeend", eggHtml("e" + i, false));
    }
    updateCount();
  }

  function updateCount() {
    const n = countBasket();
    const el = document.getElementById("egg-count");
    if (el) el.textContent = "Eggs: " + n;
  }

  function pointIn(el, x, y) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function bindDrag() {
    const office = document.getElementById("office");
    office.addEventListener("pointerdown", (e) => {
      const egg = e.target.closest("[data-egg]");
      if (!egg || won) return;
      e.preventDefault();
      dragging = egg;
      egg.classList.add("dragging");
      egg.setPointerCapture(e.pointerId);
      const r = egg.getBoundingClientRect();
      dragOffset.x = e.clientX - r.left;
      dragOffset.y = e.clientY - r.top;
      egg.style.position = "fixed";
      egg.style.left = r.left + "px";
      egg.style.top = r.top + "px";
      egg.style.zIndex = "40";
    });
    office.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dragging.style.left = (e.clientX - dragOffset.x) + "px";
      dragging.style.top = (e.clientY - dragOffset.y) + "px";
    });
    office.addEventListener("pointerup", (e) => {
      if (!dragging) return;
      const egg = dragging;
      const basket = document.getElementById("egg-basket");
      const table = document.getElementById("egg-table");
      egg.classList.remove("dragging");
      egg.style.position = "";
      egg.style.left = "";
      egg.style.top = "";
      egg.style.zIndex = "";
      if (pointIn(basket, e.clientX, e.clientY)) basket.appendChild(egg);
      else table.appendChild(egg);
      dragging = null;
      updateCount();
    });
  }

  function yell(text) {
    const msg = document.getElementById("egg-msg");
    msg.textContent = text;
    msg.classList.add("yell");
    document.querySelector(".crt-bezel").classList.add("shake");
    setTimeout(() => document.querySelector(".crt-bezel").classList.remove("shake"), 400);
    talk("tim-talk", ["That’s not the right number of eggs.", "I KNOW that’s not the right number of eggs.", "Why is it never the right number."]);
    beep(true);
  }

  function revealButt() {
    won = true;
    const basket = document.getElementById("egg-basket");
    let egg = basket.querySelector("[data-egg]");
    if (!egg) {
      egg = document.querySelector("[data-egg]");
      if (egg) basket.appendChild(egg);
    }
    if (egg) egg.classList.add("is-butt");
    document.getElementById("egg-msg").textContent = "egg butt.";
    document.getElementById("egg-msg").classList.remove("yell");
    document.getElementById("egg-msg").classList.add("butt-line");
    document.getElementById("boss-talk").textContent = "I… I’m going to come back.";
    document.getElementById("tim-talk").textContent = "That’s an egg butt.";
    document.getElementById("egg-ok").textContent = "Play again";
    Game.confetti();
    Game.addBananas(2);
    hud();
    beep(false);
    Game.toast("egg butt. +2 bananas");
  }

  function submitEggs() {
    if (won) {
      won = false;
      fails = 0;
      need = 3;
      renderPlay();
      return;
    }
    const n = countBasket();
    if (n === need && fails >= 1) {
      revealButt();
      return;
    }
    if (n === need && fails === 0) {
      fails += 1;
      need = n === 3 ? 4 : 3;
      document.getElementById("egg-need").textContent = String(need);
      yell("THAT’S NOT THE RIGHT NUMBER OF EGGS");
      Game.toast("The goal just changed. Of course it did.");
      return;
    }
    fails += 1;
    yell("THAT’S NOT THE RIGHT NUMBER OF EGGS");
    if (fails >= 3) {
      setTimeout(revealButt, 900);
    } else {
      talk("boss-talk", ["I can wait. I cannot wait.", "Are those eggs.", "We are so behind."]);
    }
  }

  function renderLocked() {
    document.getElementById("office").innerHTML = `
      <div class="egg-locked">
        <div class="egg preview" aria-hidden="true"><span class="egg-shell"><span class="egg-face"><i></i><i></i><b></b></span></span></div>
        <h2>Still locked</h2>
        <p>This dumb office game unlocks as a reward. A parent can award it from the desk, or keep poking secrets in the lobby.</p>
        <p class="empty">Bennett never sees the locked catalog — only the game, once it’s earned.</p>
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
