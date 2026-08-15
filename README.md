# Bennett Week

Rolling 7-day lobby for Bennett (sophomore, Olathe East). Seven cards: today plus the next 6 days in America/Chicago.

Theme: monkeys playing tennis and goofing around with guitars, bass clarinet, and a court-side garage band. Currency is **bananas**. Streaks matter more than assignment checkoffs. No login, no accounts, no chat, no OurFamilyWizard.

## Open it (Orin / Bennett)

1. Download this repo (Code → Download ZIP) or clone it.
2. Open `index.html` in a browser. Works on a phone or laptop, including `file://`.
3. Swipe the cards, tap the dots, or use **Prev / Next** (arrow keys work on a laptop).
4. Tap **I started this** / **Done** on work items. **Done** is a toggle — tap again to undo (strikethrough clears; the start stamp stays). **I started this** can be undone the same way, or with the small **Undo** next to the stamp. Edit / Delete sit on every row (calendar, work, notes, questions, parent notes, check-ins). Delete asks first; undo Done does not.
5. Open **Trophy room** for earned trophies only. Drag or tap to rearrange. Empty room: “No trophies yet — keep the streak going.”
6. **Ask** on any task or event sends a question to the parent desk. Parent notes show on that item.
7. One reflection prompt at a time on Today. A sentence or two lands in the parent inbox.
8. **A little help** on due / start-this work: notecards, a short explanation, optional quiz, optional proofread. Additive help — not a finished assignment.
9. Open **Progress** (HUD **Dash** on a phone) for Bennett’s activity and class grades. Same page is fine for parents — it is not a secret desk.

**Undo / edit / share:** Tap **Done** again to un-done a card (no confirm). Tap **Started** or **Undo** to clear “I started this.” Every visible row has **Edit** and **Delete** (delete confirms). Changes stay on that device; parents **Export family pack** / **Import JSON** on the parent desk so Mom and Orin stay in sync — including week-item overlays, asks, notes, reflections, and streaks.

If GitHub Pages is on: https://oborgelt.github.io/bennett-week/

Laptop layout fills one screen (about 880–1100px wide). iPhone stays full-bleed and thumb-friendly. A normal day should not need a page or card scrollbar; rare overflow fades/clips.

## Parent desk (Mom and Orin)

1. Open `parent.html` (or tap **Parent desk** in the HUD). Old `mom.html` links redirect here.
2. Add / edit / delete **streak** achievements: title, how to count, incentive, bananas, target (e.g. 3 weeks).
3. **Count this week** bumps progress. **Award** unlocks the trophy on this device. Bennett never sees the catalog or locked tiles.
4. Inbox: Bennett’s questions and check-ins. Reply with a note on that item.
5. Add reflection prompts (how class / teachers felt — celebrate and catch early warnings, not a psych eval).
6. Saves on that device only. **Export family pack** and **Import JSON** so Mom and Orin can pass a file (asks, notes, reflections, streaks, awarded trophies, Done/Started, and week/progress overlays). Week.json is not rewritten in the browser — edits and deletes live in that overlay. **Download achievements.json** to drop the catalog into the repo. **Undo award** on a streak takes the trophy out of Bennett’s room.
7. **Progress** is the same dashboard Bennett sees (activity + class grades). It does not show the locked trophy catalog.

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

- Seed streaks in `achievements.json` are `"test": true` (straight A’s, no-late, flash cards, five-day start, asked before due). Incentives are examples only.
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

## Files

- `index.html` — week lobby (embeds JSON fallbacks so `file://` still works)
- `progress.html` — activity + class dashboard
- `parent.html` — parent desk
- `mom.html` — redirect to `parent.html`
- `week.json` — calendar, work, parenting time
- `progress.json` — class list + TEST grade seed + sample opens
- `achievements.json` — streak catalog + incentives
- `family.json` — seed notes, questions, reflection pool
- `serve.py` — static server + `/api/tutor`
- `img/` — banner, day art, badge, jungle wallpaper
- `css/theme.css`, `js/game.js`, `js/week.js`, `js/parent.js`, `js/tutor.js`, `js/progress.js`
