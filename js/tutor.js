(function (global) {
  function cardsFrom(title, note) {
    const t = (title || "This assignment").trim();
    const n = (note || "").trim();
    const blob = (t + " " + n).toLowerCase();
    if (/names/.test(blob)) {
      return {
        explain: "This is a hello video so the teacher can learn faces and names. You are not writing an essay. Say your full name clearly twice, then one real thing you are awesome at — tennis, bass clarinet, drawing, whatever is true.",
        cards: [
          { front: "What do you record?", back: "Your full name, twice, plus one thing you are awesome at." },
          { front: "How long should it feel?", back: "Short. This is a 5-point names video, not a movie." },
          { front: "A solid first step", back: "Write the one awesome thing first, then hit record once." }
        ],
        start: "Write the one awesome thing first, then hit record once.",
        quiz: [
          { q: "How many times do you say your full name?", a: "Twice." },
          { q: "What else belongs in the video?", a: "One thing you are awesome at." },
          { q: "Is this a long essay?", a: "No — keep it short and clear." }
        ]
      };
    }
    if (/comic/.test(blob)) {
      return {
        explain: "Summer Narrative Comic Strip — paper, done in class Tuesday. Official Canvas due is Thursday 11:59pm. If you were absent, see the teacher for the directions. Illustration: color in every square, at most 2 word-only boxes. On the back, a short narrative — at least 5 sentences about the events in the comic.",
        cards: [
          { front: "What is due?", back: "The paper comic plus a paragraph on the back. Canvas due Thursday 11:59pm." },
          { front: "Where did this start?", back: "In class Tuesday. If you were absent, see the teacher for the directions." },
          { front: "A first move tonight", back: "Find the paper. Count squares still missing color, then write the 5-sentence paragraph on the back." }
        ],
        start: "Find the paper. Count squares still missing color, then write the 5-sentence paragraph on the back.",
        quiz: [
          { q: "Is this submitted on Canvas?", a: "No — submitting on paper." },
          { q: "What does Illustration need?", a: "A drawing in every square, in color. No more than 2 boxes words-only." },
          { q: "What goes on the back?", a: "A short narrative — at least 5 sentences about the events in the comic." }
        ]
      };
    }
    if (/notebook|index card/.test(blob)) {
      return {
        explain: "This is a bring-it task, not a write-it task. A spiral or composition notebook, a highlighter, and about 100 index cards. Pack them so Friday-you is not hunting lockers.",
        cards: [
          { front: "What do you bring?", back: "Spiral or composition notebook, highlighter, 100 index cards." },
          { front: "Why index cards?", back: "They become flash cards later — good for a first test." },
          { front: "A first move tonight", back: "Put the notebook and a pack of cards by the backpack." }
        ],
        start: "Put the notebook and a pack of cards by the backpack.",
        quiz: [
          { q: "Notebook type?", a: "Spiral or composition." },
          { q: "About how many index cards?", a: "100." },
          { q: "What else?", a: "A highlighter." }
        ]
      };
    }
    return {
      explain: "Read the title and the teacher note. Do one small start — not the whole thing. This offline help is built from the card, not a finished assignment.",
      cards: [
        { front: "What's the assignment?", back: t },
        { front: "What does the note say?", back: n || "Check the week card for the teacher note." },
        { front: "How to start?", back: "Do one small first step tonight. Do not finish it all in one sitting unless it is tiny." }
      ],
      start: "Do one small first step tonight. Do not finish it all in one sitting unless it is tiny.",
      quiz: [
        { q: "What is this asking for?", a: t },
        { q: "What extra detail is on the card?", a: n || "No extra note — use the title." },
        { q: "What is a fair first step?", a: "Start a piece of it, then stop and check the due time." }
      ]
    };
  }

  function testHelp(payload) {
    const base = cardsFrom(payload.title, payload.note);
    const mode = payload.mode || "nudge";
    const out = { live: false, source: "offline", mode };
    if (mode === "explain") out.explain = base.explain;
    else if (mode === "quiz") out.quiz = base.quiz;
    else if (mode === "proofread") {
      out.feedback = [
        "Read the draft out loud. Fix names, dates, and anything you would not say.",
        "Do not let a helper write the assignment for you."
      ];
    } else if (mode === "notecards") {
      out.cards = base.cards;
    } else {
      out.explain = base.explain;
      out.start = base.start;
    }
    return out;
  }

  function helpAskText(payload) {
    const title = String((payload && payload.title) || "This assignment").trim();
    const note = String((payload && payload.note) || "").trim();
    const mode = (payload && payload.mode) || "nudge";
    if (mode === "proofread") {
      const draft = String((payload && payload.draft) || "").trim();
      return "Look at this draft for \"" + title + "\". Teacher note: " + (note || "none") + ". Give one or two short nudges. Do not rewrite it. Do not do the assignment.\n\nDraft:\n" + (draft || "(nothing pasted yet)");
    }
    return "First move only for this card. Title: " + title + ". Teacher note: " + (note || "none") + ". Ask one Socratic question or name one tiny first step. Do not do the assignment.";
  }

  function helpFromLive(payload, data) {
    const mode = (payload && payload.mode) || "nudge";
    const out = { live: true, source: data.source || "live", mode };
    if (mode === "proofread") {
      out.feedback = [data.reply];
    } else if (mode === "quiz") {
      out.quiz = [{ q: data.reply, a: "Your move — say it out loud." }];
    } else if (mode === "notecards") {
      out.cards = [{ front: "A first question", back: data.reply }];
    } else if (mode === "explain") {
      out.explain = data.reply;
    } else {
      out.explain = "The mentor looked at this card. One question — not the finished work.";
      out.start = data.reply;
    }
    return out;
  }

  async function request(payload) {
    try {
      const data = await ask({
        title: (payload && payload.title) || "",
        messages: [{ role: "bennett", text: helpAskText(payload) }]
      });
      if (data && data.live && data.reply) return helpFromLive(payload, data);
    } catch (_) {}
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("tutor unavailable");
      const data = await res.json();
      if (!data || data.error) throw new Error((data && data.error) || "tutor error");
      return Object.assign({ live: true, source: "live" }, data);
    } catch (_) {
      return Object.assign(testHelp(payload), { fallback: true });
    }
  }

  function testAsk(title, lastUser) {
    const t = (title || "this assignment").trim();
    const blob = (t + " " + (lastUser || "")).toLowerCase();
    let reply = "";
    if (/comic|panel/.test(blob)) {
      reply = "Paper comic from class — color in every square, at most two word-only boxes. What's still blank? Then the back: five sentences that tell the same story. Which panel will the first sentence cover?";
    } else if (/names/.test(blob)) {
      reply = "What's the one true thing you're awesome at — and can you say it in one breath right after your name, twice?";
    } else if (/notebook|index card/.test(blob)) {
      reply = "Where will the notebook live tonight so Friday-you isn't hunting lockers? What's the smallest pack-it-now move?";
    } else {
      reply = "What's the smallest first serve on \"" + t + "\" — not the whole thing, just the first real move?";
    }
    return {
      reply: reply,
      live: false,
      source: "offline",
      test: false
    };
  }

  function familyToken() {
    try {
      if (global.Telemetry && typeof global.Telemetry.getConfig === "function") {
        return String(global.Telemetry.getConfig().familyToken || "").trim();
      }
    } catch (_) {}
    try {
      const raw = JSON.parse(localStorage.getItem("bw-telemetry") || "null");
      return String((raw && raw.familyToken) || "").trim();
    } catch (_) {
      return "";
    }
  }

  async function postAsk(url, payload, headers) {
    const res = await fetch(url, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("ask unavailable");
    const data = await res.json();
    if (!data || data.error || !data.reply) throw new Error((data && data.error) || "ask error");
    return Object.assign({ live: true, source: data.source || "live" }, data);
  }

  async function ask(payload) {
    const title = (payload && payload.title) || "";
    const messages = (payload && payload.messages) || [];
    const lastUser = [...messages].reverse().find((m) => m && m.role === "bennett") || {};
    const token = familyToken();
    const headers = {};
    if (token) headers["x-family-token"] = token;
    try {
      return await postAsk("https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/ask", payload, headers);
    } catch (_) {}
    try {
      return await postAsk("/api/ask", payload);
    } catch (_) {
      return testAsk(title, lastUser.text || "");
    }
  }

  global.Tutor = { request, testHelp, cardsFrom, ask, testAsk };
})(window);
