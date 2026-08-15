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
        quiz: [
          { q: "How many times do you say your full name?", a: "Twice." },
          { q: "What else belongs in the video?", a: "One thing you are awesome at." },
          { q: "Is this a long essay?", a: "No — keep it short and clear." }
        ]
      };
    }
    if (/comic/.test(blob)) {
      return {
        explain: "Finish the summer comic strips you already started in class. The job is to complete the pages you have, not invent a new graphic novel. Check panels, speech, and that the story lands.",
        cards: [
          { front: "What is due?", back: "The summer comic strips from the Daily Agendas sheet." },
          { front: "Where did this start?", back: "In class on 8/17 — pick up from that work." },
          { front: "A first move tonight", back: "Find the pages, count unfinished panels, finish one strip." }
        ],
        quiz: [
          { q: "Is this a brand-new comic?", a: "No — finish the summer strips you started." },
          { q: "What should you check in each panel?", a: "Drawing, words, and that the joke or story is clear." },
          { q: "What is a tiny start?", a: "Open the pages and finish one unfinished strip." }
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
        quiz: [
          { q: "Notebook type?", a: "Spiral or composition." },
          { q: "About how many index cards?", a: "100." },
          { q: "What else?", a: "A highlighter." }
        ]
      };
    }
    return {
      explain: "Read the title and the teacher note. Do one small start — not the whole thing. This TEST help is built from the card, not a finished assignment.",
      cards: [
        { front: "What's the assignment?", back: t },
        { front: "What does the note say?", back: n || "Check the week card for the teacher note." },
        { front: "How to start?", back: "Do one small first step tonight. Do not finish it all in one sitting unless it is tiny." }
      ],
      quiz: [
        { q: "What is this asking for?", a: t },
        { q: "What extra detail is on the card?", a: n || "No extra note — use the title." },
        { q: "What is a fair first step?", a: "Start a piece of it, then stop and check the due time." }
      ]
    };
  }

  function testHelp(payload) {
    const base = cardsFrom(payload.title, payload.note);
    const mode = payload.mode || "notecards";
    const out = { live: false, source: "TEST", mode };
    if (mode === "explain") out.explain = base.explain;
    else if (mode === "quiz") out.quiz = base.quiz;
    else if (mode === "proofread") {
      out.feedback = [
        "TEST fallback — run serve.py with ANTHROPIC_API_KEY for live notes.",
        "Read the draft out loud. Fix names, dates, and anything you would not say.",
        "Do not let a helper write the assignment for you."
      ];
    } else {
      out.cards = base.cards;
    }
    return out;
  }

  async function request(payload) {
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
      return testHelp(payload);
    }
  }

  function testAsk(title, lastUser) {
    const t = (title || "this assignment").trim();
    const blob = (t + " " + (lastUser || "")).toLowerCase();
    let reply = "";
    if (/comic|panel/.test(blob)) {
      reply = "Before the next box — what does that panel need besides pictures? A word, a beat, something the reader can hear? What's the one thing this strip has to say?";
    } else if (/names/.test(blob)) {
      reply = "What's the one true thing you're awesome at — and can you say it in one breath right after your name, twice?";
    } else if (/notebook|index card/.test(blob)) {
      reply = "Where will the notebook live tonight so Friday-you isn't hunting lockers? What's the smallest pack-it-now move?";
    } else {
      reply = "What's the smallest first serve on \"" + t + "\" — not the whole thing, just the first real move?";
    }
    return {
      reply: "TEST mentor: " + reply,
      live: false,
      source: "TEST",
      test: true
    };
  }

  async function ask(payload) {
    const title = (payload && payload.title) || "";
    const messages = (payload && payload.messages) || [];
    const lastUser = [...messages].reverse().find((m) => m && m.role === "bennett") || {};
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("ask unavailable");
      const data = await res.json();
      if (!data || data.error || !data.reply) throw new Error((data && data.error) || "ask error");
      return Object.assign({ live: true, source: "live" }, data);
    } catch (_) {
      return testAsk(title, lastUser.text || "");
    }
  }

  global.Tutor = { request, testHelp, cardsFrom, ask, testAsk };
})(window);
