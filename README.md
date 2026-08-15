# Bennett Week

Rolling 7-day lobby for Bennett (sophomore, Olathe East). Seven cards: today plus the next 6 days in America/Chicago.

Theme: monkeys playing tennis and goofing around with guitars, bass clarinet, and a court-side garage band. Currency is **bananas**. Streaks matter more than assignment checkoffs. No login, no accounts, no chat, no OurFamilyWizard.

Orin’s DNA: **high learning + high silliness**. Story, unlocks, and school work are the same game — not punishment.

## Open it (Orin / Bennett)

1. Download this repo (Code → Download ZIP) or clone it.
2. Open `index.html` in a browser. Works on a phone or laptop, including `file://`.
3. Swipe the cards, tap the dots, or use **Prev / Next** (arrow keys work on a laptop).
4. Tap **I started this** / **Done** on work items. **Undo**, **Edit**, and **Delete** are the small buttons. Done stays the big lime control. No confirm on undo. Scroll a day card if notes sit below the fold.
5. Open **Trophy room** for earned trophies only. Drag or tap to rearrange. Empty room: “No trophies yet — keep the streak going.” Open **Characters** (HUD **Crew** on a phone) for teammates. Locked slots are silhouettes — no talent spoilers. When Ace / Riff / Scorch is awarded, play that locker clip. After 3 unlocks, **Story** appears on the HUD (not just a toast).
6. **Ask** on any task or event sends a question to the parent desk. Parent notes show on that item.
7. One reflection prompt at a time on Today. A sentence or two lands in the parent inbox.
8. **A little help** on due / start-this work: notecards, a short explanation, optional quiz, optional proofread, **Ask AI**, and Khan Academy links. Additive help — not a finished assignment.
9. Open **Progress** (HUD **Dash** on a phone) for Bennett’s activity and class grades. Same page is fine for parents — it is not a secret desk.

**Undo / edit / share:** On a crossed-out card, tap the small **Undo**. Same **This week / Progress / Characters / Parent desk** chips on every screen. Parents **Export family pack** / **Import JSON** so Mom and Orin stay in sync.

If GitHub Pages is on: https://oborgelt.github.io/bennett-week/

Laptop layout fills one screen (about 880–1100px wide). iPhone stays full-bleed and thumb-friendly. Day cards scroll vertically when a day has more than fits.

## Parent desk (Mom and Orin)

1. Open `parent.html` (or tap **Parent desk** in the HUD — same **This week / Progress / Characters / Parent desk** chips as the other screens). Old `mom.html` links redirect here. Quiet **Admin** is on the parent desk only — not on Bennett’s main HUD.
2. Add / edit / delete **streak** achievements: title, how to count, incentive, bananas, target (e.g. 3 weeks), and a **Reward unlock** (character, tool, weapon, or ability).
3. **Count this week** bumps progress. **Award** unlocks the trophy on this device. If that streak grants a character or gear, Bennett unlocks it. Award **Meet Ace / Meet Riff / Meet Scorch** (TEST) to unlock the crew. Award **Notebook of Holding** or **First Serve** (TEST) for story tools / abilities. Award **Wrong number of eggs** (or let him find the banner-band secret) to unlock the office egg game. Bennett never sees the catalog or locked tile names.
4. Inbox: Bennett’s questions and check-ins. Reply with a note on that item. **Ask AI mentor** shows what he asked the Socratic mentor.
5. Add reflection prompts (how class / teachers felt — celebrate and catch early warnings, not a psych eval).
6. Saves on that device only. **Export family pack** and **Import JSON** so Mom and Orin can pass a file (asks, notes, reflections, streaks, awarded trophies, character unlocks, gear unlocks, library tags, story ingredients, Ask AI thread, which streak grants which unlock, Done/Started, and week/progress overlays). Week.json is not rewritten in the browser — edits and deletes live in that overlay. **Download achievements.json** / **Download characters.json** to drop catalogs into the repo. **Undo award** on a streak takes the trophy out of Bennett’s room and locks that reward again if nothing else granted it.
7. **Progress** is the same dashboard Bennett sees (activity + class grades). It does not show the locked trophy catalog.
8. **Characters** on the parent desk: tap Ace / Riff / Scorch to see **that** character’s library (not the whole dump). Attach a still or clip to a streak reward or a future story beat. Crew comic art is available when you build a team beat. After Bennett earns 3 characters, Story is a real page.

## Admin library

Open `admin.html` from the parent desk **Admin** chip.

- Library of every still and clip, grouped **Ace / Riff / Scorch / Crew**.
- Preview stills and play videos. Tag a file to a character or Crew.
- Seed: locker clips stay on their character. The four new comic files (`img/library/crew-hero.jpg`, `crew-run.jpg`, `crew-burst.jpg`, `crew-adventure.mp4`) start as **Crew**.
- Add an item by **path + label + character** (path-based for `file://` / Pages). No upload server.
- **Story ingredients** box: topics to fold into the comic (TEST: “finish what you start”, “ask before you’re sunk”) plus an optional parent “include in story” note.
- Export / import rides the same family pack.

### How to attach media to a character

1. Admin: set the file’s **Tag** to Ace, Riff, Scorch, or Crew.
2. Parent desk: tap that character → that locker library appears.
3. Select a file → **Attach** to a streak or a story beat (start, English 10 board, Scorch recover, Ace serve, notebook, finale).
4. Export the family pack so the other parent gets tags and attachments.

Do not re-encode `img/characters/ace.mp4`, `riff.mp4`, or `scorch.mp4`.

## Story (CYOA that learns)

`story.html` — first-slice engine, not a novel. `story.json` has about six nodes.

- Bennett’s HUD shows **Story** after three character unlocks. Parents always **Preview story** (`story.html?preview=1`).
- Each node: a library image (crew-hero / crew-run / crew-burst), short silly-serious narration, 2–3 choices.
- Choices can require an unlock (character / tool / ability). Locked gear is a silhouette line — no catalog name.
- One school check on the English 10 comic board: “What does a comic panel need besides pictures?” Wrong answer: Scorch recover, try again, not shame.
- Read-only pulls if present: Bennett’s latest reflection or question, and the parent include-in-story note. If none, skip — do not invent Bennett’s voice.
- Parent story ingredients print as a crew brief on the page.

Invincible is a *style* (comic energy, bananas in the hat). The character is a later unlock — not in this ship.

## Khan Academy

On **A little help**, Ask AI, and the Story resources strip:

- Label: **Khan Academy — opens in a new tab**
- `target="_blank"` `rel="noopener"`
- Real URLs only:
  - https://www.khanacademy.org/ela
  - https://www.khanacademy.org/humanities/grammar
  - https://www.khanacademy.org/science
- English 10 work (names, comic strips, notebook) maps to ELA + grammar. Do not invent Khan URLs.

## Ask AI — Socratic mentor

`ask.html` (also from week **A little help**).

- Chat UI: Bennett asks; the mentor replies with questions and small hints. Not the finished assignment. Kid-safe. Silly allowed, never mean.
- Live path: `python3 serve.py` with `ANTHROPIC_API_KEY` in the environment — `POST /api/ask`. The key never goes in frontend JS.
- `file://`, Pages, or no key: labeled **TEST** fallback that still asks a Socratic question from the assignment title.
- Thread persists in `localStorage` (`bw-ask-thread`). Parents see it on the parent desk inbox. Export includes it in the family pack.

## Live tutor + Ask AI (`serve.py`)

GitHub Pages cannot hide a key. The Anthropic key stays in the environment on a laptop — never in frontend JS or this repo.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python3 serve.py
```

Then open http://127.0.0.1:8765/

- `POST /api/tutor` — notecards / explain / quiz / proofread. Tutor, not ghostwriter.
- `POST /api/ask` — Socratic mentor. Questions and hints only.

If the API is missing (plain Pages, `file://`, or no key), the hub still works tonight with clearly labeled **TEST** notecards and a **TEST** mentor.

Optional: `PORT`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-0`).

## TEST data

Anything labeled **TEST** is look-and-feel filler, not a real family rule or a real assignment.

- Seed streaks in `achievements.json` are `"test": true` (straight A’s, no-late, flash cards, five-day start, asked before due, **Meet Ace / Riff / Scorch**, **Notebook of Holding**, **First Serve**). Incentives are examples only. Characters and gear do not unlock until a parent taps Award.
- `reward` may be bananas (a number) or `{ "type": "character"|"tool"|"weapon"|"ability", "id", "label" }`. Banana count can also live in `bananas` when `reward` is an object. `rewardCharacter` still works.
- Seed notes / questions / reflections in `family.json` are TEST so the inbox and cards are not empty. Story ingredients TEST: “finish what you start”, “ask before you’re sunk”.
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

**Egg game:** FEED EGGS — drag or tap eggs into the mouth. The voice keeps saying six eggs. Then the 80-pack, then 40, then 41 — you win. Nude egg, the company says it’s not allowed, game shuts down. Unlocks when parents award **Wrong number of eggs**, or when Bennett finds the banner-band secret. Then **🥚 Play** shows in the HUD and on that trophy. Locked players only see a “keep going” screen — not the catalog.

## Files

- `index.html` — week lobby (embeds JSON fallbacks so `file://` still works)
- `characters.html` — Bennett’s teammate room + loadout (locked silhouettes until awarded)
- `story.html` — CYOA first slice (gated until 3 unlocks; parents use `?preview=1`)
- `ask.html` — Socratic Ask AI
- `admin.html` — parent-only media library
- `egg.html` — FEED EGGS (locked until the trophy)
- `progress.html` — activity + class dashboard
- `parent.html` — parent desk
- `mom.html` — redirect to `parent.html`
- `week.json` — calendar, work, parenting time
- `progress.json` — class list + TEST grade seed + sample opens
- `achievements.json` — streak catalog + incentives + `reward` / `rewardUnlock`
- `characters.json` — Ace / Riff / Scorch roster + `comicStartsAfter: 3`
- `library.json` — stills and clips tagged by character or Crew
- `story.json` — CYOA nodes
- `family.json` — seed notes, questions, reflection pool, story ingredients
- `serve.py` — static server + `/api/tutor` + `/api/ask`
- `img/` — banner, day art, badge, jungle wallpaper
- `img/characters/` — Ace / Riff / Scorch locker clips and posters (already on main; do not re-encode)
- `img/library/` — crew comic stills + adventure clip (already on main; do not re-encode)
- `css/theme.css`, `js/build.js`, `js/game.js`, `js/week.js`, `js/parent.js`, `js/characters.js`, `js/tutor.js`, `js/progress.js`, `js/egg.js`, `js/admin.js`, `js/story.js`, `js/ask.js`

## Characters (Ace, Riff, Scorch)

Parents assign a teammate (or a tool / ability) on a streak, then award that streak. Bennett only sees unlocked teammates and unlocked gear.

1. Parent desk → **Characters**: Ace, Riff, and Scorch are ready (play each clip). Tap one to see that library.
2. Edit a streak → **Reward unlock** → character / tool / weapon / ability. TEST streaks **Meet Ace**, **Meet Riff**, **Meet Scorch**, **Notebook of Holding**, **First Serve** are already wired.
3. **Award** that streak. Nobody auto-unlocks on load. Export the family pack so the other parent gets unlocks.
4. Bennett opens **Characters**. Locked slots are silhouettes. After the award he can play the clip and see the talent / tag line. A new unlock plays that teammate’s clip once as the celebration. Loadout shows earned tools / abilities only.
5. After 3 character unlocks, **Story** is available — a choose-your-own-adventure, not a toast.

Every page shows **Build N** and the last-modified time (America/Chicago) on the banner, top right. Bump `build` by 1 and update `modified` in `js/build.js` (and the HTML stamp) on each ship. This ship is **29**.
