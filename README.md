# Bennett Week

Rolling 7-day lobby for Bennett (sophomore, Olathe East). Seven cards: today plus the next 6 days in America/Chicago.

Theme: monkeys playing tennis and goofing around with guitars, bass clarinet, and a court-side garage band. Currency is **bananas**. Streaks matter more than assignment checkoffs. No login, no accounts, no chat, no OurFamilyWizard.

## Open it (Orin / Bennett)

1. Download this repo (Code → Download ZIP) or clone it.
2. Open `index.html` in a browser. Works on a phone or laptop, including `file://`.
3. Swipe the cards, tap the dots, or use **Prev / Next** (arrow keys work on a laptop).
4. Tap **I started this** / **Done** on work items. **Undo**, **Edit**, and **Delete** are the small buttons. Done stays the big lime control. No confirm on undo. Scroll a day card if notes sit below the fold.
5. Open **Trophy room** for earned trophies only. Drag or tap to rearrange. Empty room: “No trophies yet — keep the streak going.” Open **Characters** (HUD **Crew** on a phone) for teammates. Locked slots are silhouettes — no talent spoilers. When Ace is awarded, play his clip and read “The Closer” / “Last point counts.” After 3 unlocks: “Story unlocked — comic coming.”
6. **Ask** on any task or event sends a question to the parent desk. Parent notes show on that item.
7. One reflection prompt at a time on Today. A sentence or two lands in the parent inbox.
8. **A little help** on due / start-this work: notecards, a short explanation, optional quiz, optional proofread. Additive help — not a finished assignment.
9. Open **Progress** (HUD **Dash** on a phone) for Bennett’s activity and class grades. Same page is fine for parents — it is not a secret desk.

**Undo / edit / share:** On a crossed-out card, tap the small **Undo**. Same **This week / Progress / Characters / Parent desk** chips on every screen. Parents **Export family pack** / **Import JSON** so Mom and Orin stay in sync.

If GitHub Pages is on: https://oborgelt.github.io/bennett-week/

Laptop layout fills one screen (about 880–1100px wide). iPhone stays full-bleed and thumb-friendly. Day cards scroll vertically when a day has more than fits.

## Parent desk (Mom and Orin)

1. Open `parent.html` (or tap **Parent desk** in the HUD — same **This week / Progress / Characters / Parent desk** chips as the other screens). Old `mom.html` links redirect here.
2. Add / edit / delete **streak** achievements: title, how to count, incentive, bananas, target (e.g. 3 weeks), and an optional **Reward character**.
3. **Count this week** bumps progress. **Award** unlocks the trophy on this device. If that streak has a reward character, Bennett unlocks that teammate. Award **Meet Ace** (TEST) to unlock Ace — he is not auto-unlocked on load. Award **Wrong number of eggs** (or let him find the banner-band secret) to unlock the office egg game. Bennett never sees the catalog or locked tiles.
4. Inbox: Bennett’s questions and check-ins. Reply with a note on that item.
5. Add reflection prompts (how class / teachers felt — celebrate and catch early warnings, not a psych eval).
6. Saves on that device only. **Export family pack** and **Import JSON** so Mom and Orin can pass a file (asks, notes, reflections, streaks, awarded trophies, character unlocks, which streak grants which character, Done/Started, and week/progress overlays). Week.json is not rewritten in the browser — edits and deletes live in that overlay. **Download achievements.json** / **Download characters.json** to drop catalogs into the repo. **Undo award** on a streak takes the trophy out of Bennett’s room and locks that reward character again if nothing else granted it.
7. **Progress** is the same dashboard Bennett sees (activity + class grades). It does not show the locked trophy catalog.
8. **Characters** on the parent desk: see Ace (play his clip), Riff and #3 as coming slots, and add/edit name, talent, tag line, optional video/poster path. Assign Ace / Riff / #3 / none on each streak. After Bennett earns 3 characters, a “Story unlocked — comic coming” panel appears. Do not invent comic pages yet.

## Live tutor help (`serve.py`)

GitHub Pages cannot hide a key. The Anthropic key stays in the environment on a laptop — never in frontend JS or this repo.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python3 serve.py
```

Then open http://127.0.0.1:8765/

`POST /api/tutor` calls the Anthropic Messages API. The system prompt is tutor, not ghostwriter: short, additive, tied to the assignment on the card.

If the API is missing (plain Pages, `file://`, or no key), the hub still works tonight with clearly labeled **TEST** notecards built from the assignment title and note.

Optional: `PORT`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-0`).

## TEST data

Anything labeled **TEST** is look-and-feel filler, not a real family rule or a real assignment.

- Seed streaks in `achievements.json` are `"test": true` (straight A’s, no-late, flash cards, five-day start, asked before due, **Meet Ace**). Incentives are examples only. Meet Ace can award Ace; it does not unlock him until a parent taps Award.
- Seed notes / questions / reflections in `family.json` are TEST so the inbox and cards are not empty.
- `week.json` may include one fake calendar row titled `TEST: …`. Real seed items from v1 stay (parenting time, Mon band, English names, comic strips, Forms & Fees, spiral notebook, chemistry absence note on 8/14).
- Progress grades in `progress.json` are TEST seed (English overall + the three real English items + one TEST quiz). Band’s overall grade is TEST. Not a gradebook.
- Sample lobby-open times on Progress are TEST and only show when this device has no real open log yet.
- Do not treat this as a full semester of homework. English often lives in a Google sheet; Canvas is not the full due list.

## Progress page

`progress.html` is a laptop-first dashboard (still fine on iPhone).

**Site activity (top / left)**
- Lobby opens: last open, count this rolling week (America/Chicago), a 7-day spark, recent times. Opening the week lobby appends to `localStorage` key `bw-opens` (ISO timestamps). The old `bw-opened` first-open flag still works; a new open is ignored if the last one was within 15 minutes.
- Actions: I started this (with timestamps), Done, questions asked, parent notes received, reflections answered, “A little help” opened, trophies awarded (earned only).
- Easter eggs found: count + wholesome names for eggs he already found. Unfound eggs are not listed.
- Bananas from the same device store.

**By class**
- Real classes: English 10, Band. Collapsed row = class name + overall grade + actions (started / done / asked / help).
- Expand a class to see assignments and tests with a grade and status (not started / started timestamp / done). Grades stay hidden until expand.
- Help-opened timestamps are stored on the existing `bw-progress` object (`helpOpened`), not a new store.

Bennett can see his activity and class progress. Parents can open the same page. Nobody sees the parent achievement catalog or locked trophies here.

Grades stay seed/TEST until a real feed exists.

## Easter eggs

Wholesome only. Try tapping the banner band, the little clarinet, and a shy tennis ball. Eggs never show an unearned trophy.

**Egg game:** FEED EGGS — drag or tap eggs into the mouth. The voice keeps saying six eggs. Then the 80-pack, then 40, then 41 — you win. Then egg butt. Unlocks when parents award **Wrong number of eggs**, or when Bennett finds the banner-band secret. Then **🥚 Play** shows in the HUD and on that trophy. Locked players only see a “keep going” screen — not the catalog.

## Files

- `index.html` — week lobby (embeds JSON fallbacks so `file://` still works)
- `characters.html` — Bennett’s teammate room (locked silhouettes until awarded)
- `egg.html` — FEED EGGS (locked until the trophy)
- `progress.html` — activity + class dashboard
- `parent.html` — parent desk
- `mom.html` — redirect to `parent.html`
- `week.json` — calendar, work, parenting time
- `progress.json` — class list + TEST grade seed + sample opens
- `achievements.json` — streak catalog + incentives + optional `rewardCharacter`
- `characters.json` — Ace / Riff / #3 roster + `comicStartsAfter: 3`
- `family.json` — seed notes, questions, reflection pool
- `serve.py` — static server + `/api/tutor`
- `img/` — banner, day art, badge, jungle wallpaper
- `img/characters/ace.mp4` + `ace.jpg` — Ace celebration clip and poster (already on main; do not re-encode)
- `css/theme.css`, `js/build.js`, `js/game.js`, `js/week.js`, `js/parent.js`, `js/characters.js`, `js/tutor.js`, `js/progress.js`, `js/egg.js`

## Characters (Ace, Riff, #3)

Parents assign a teammate on a streak, then award that streak. Bennett only sees unlocked teammates.

1. Parent desk → **Characters**: Ace is ready (play the clip). Riff is a labeled empty slot (Daily Reps / “Again. Louder.”). #3 is unnamed for later.
2. Edit a streak → **Reward character** → Ace, Riff, #3, or none. The TEST streak **Meet Ace** is already wired to Ace.
3. **Award** that streak. Ace stays locked until you award it. Export the family pack so the other parent gets unlocks + which streak grants which character.
4. Bennett opens **Characters**. Locked Ace is a silhouette. After the award he can play the clip and see the talent / tag line. A new unlock plays Ace’s clip once as the celebration.
5. After 3 character unlocks, both sides see **Story unlocked — comic coming**. No comic pages yet — Orin is generating those in Imagine.

Every page shows **Build N** and the last-modified time (America/Chicago) on the banner, top right. Bump `build` by 1 and update `modified` in `js/build.js` (and the HTML stamp) on each ship. This ship is **26**.
