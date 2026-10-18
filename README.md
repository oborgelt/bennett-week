# Jungle Jam

Rolling 7-day lobby for Bennett (sophomore, Olathe East). Seven cards: today plus the next 6 days in America/Chicago.

Theme: monkeys playing tennis and goofing around with guitars, bass clarinet, and a court-side garage band. Currency is **bananas**. Streaks matter more than assignment checkoffs. No login, no accounts, no chat, no OurFamilyWizard.

Orin’s DNA: **high learning + high silliness**. Story, unlocks, and school work are the same game — not punishment.

## Open it (Orin / Bennett)

1. Download this repo (Code → Download ZIP) or clone it.
2. Open `index.html` in a browser. Works on a phone or laptop, including `file://`.
3. Swipe the cards, tap the dots, or use **Prev / Next** (arrow keys work on a laptop).
4. Tap **I started this** / **Done** on work items. **Undo**, **Edit**, and **Delete** are the small buttons. Done stays the big lime control. No confirm on undo. Scroll a day card if notes sit below the fold. The **Classes** strip is Bennett’s S1 ParentVUE roster (period + name + time) — all 8 classes, even with nothing due, plus Khan links where we have a real public course. Done / Started sync through `POST https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/family-sync` — same public function pattern as Ask AI, no Admin Connect on Bennett’s phone. Keys stay out of the repo.
5. Tap **🏆** to walk into the treehouse. The still is the room — look around, tap a glowing spot to walk up. Earned trophies sit in the scene; tap one for a small plaque. Empty room is still the treehouse. Edit / Undo / drag-reorder live on the **Parent desk**, not in Bennett’s room. Open **Characters** (HUD **Crew** on a phone) for teammates. Locked slots are silhouettes — no talent spoilers. Bennett (his own avatar) unlocks the first time he opens the lobby or Characters. When Ace / Riff / Scorch / Deuce / Fuzz is awarded, play that locker clip. After 3 teammate unlocks, **Story** appears on the HUD (not just a toast). Bennett does not count toward that 3.
6. **Ask** on any task or event sends a question to the parent desk. Parent notes show on that item.
7. One reflection prompt at a time on Today. A sentence or two lands in the parent inbox.
8. **A little help** on due / start-this work: what the assignment is, one first move, **Talk it through** (Base Camp), Khan if it maps, and **Check a draft** only on writing-ish work. Additive help — not a finished assignment. The full chat is **Base Camp** (HUD chip). The coach is **Jungle Jam Tutor**.
9. Open **Progress** (HUD **Dash** on a phone) for Bennett’s activity and class grades. Same page is fine for parents — it is not a secret desk.

**Undo / edit / share:** On a crossed-out card, tap the small **Undo**. Same **This week / Progress / Characters / Parent desk** chips on every screen. Parents **Export family pack** / **Import JSON** so Mom and Orin stay in sync.

If GitHub Pages is on: https://oborgelt.github.io/bennett-week/

Laptop layout fills one screen (about 880–1100px wide). iPhone stays full-bleed and thumb-friendly. Day cards scroll vertically when a day has more than fits.

## Parent desk (Mom and Orin)

1. Open `parent.html` (or tap **Parent desk** in the HUD — same **This week / Progress / Characters / Parent desk** chips as the other screens). Old `mom.html` links redirect here. Quiet **Admin** is on the parent desk only — not on Bennett’s main HUD.
2. Add / edit / delete **streak** achievements: title, how to count, incentive, bananas, target (e.g. 3 weeks), and a **Reward unlock** (character, tool, weapon, ability, outfit, or **content** — a library sound or link).
3. **Count this week** bumps progress. **Award** unlocks the trophy on this device. If that streak grants a character, gear, or a library item, Bennett unlocks it. **Signed in** unlocks Bennett the first time he opens the site — no parent Award click. Award **Meet Ace / Meet Riff / Meet Scorch / Meet Deuce / Meet Fuzz** (TEST) to unlock a teammate. **Meet Bennett** (TEST) can re-award him from the desk. Award **Angle Finder**, **Field Kit**, **Unplugged Strap**, or **Daily Pick** (TEST) for teammate gear. Award **Notebook of Holding** or **First Serve** (TEST) for story tools / abilities. Award **Wrong number of eggs** (or let him find the banner-band secret) to unlock the office egg game. Bennett never sees the catalog or locked tile names.
4. Inbox: Bennett’s questions and check-ins. Reply with a note on that item. **Jungle Jam Tutor** shows Base Camp climbs plus the old Ask sheet. Coaching only — no packet key.
5. Add reflection prompts (how class / teachers felt — celebrate and catch early warnings, not a psych eval).
6. Saves on that device only. **Export family pack** and **Import JSON** so Mom and Orin can pass a file (asks, notes, reflections, streaks, awarded trophies, character unlocks, gear unlocks, **content unlocks**, library tags including audio/links, **device-dropped files** under 2 MB each, story ingredients, Ask AI thread, which streak grants which unlock, Done/Started, week/progress overlays, and parent-added classes). Week.json is not rewritten in the browser — edits and deletes live in that overlay. **Download achievements.json** / **Download characters.json** to drop catalogs into the repo. **Undo award** on a streak takes the trophy out of Bennett’s room and locks that reward again if nothing else granted it.
7. **Add a class** is a name field only. It saves on this device (progress overlay) with no fake assignments or grades. The S1 ParentVUE roster already ships in `progress.json` — use this if a later term changes.
8. **Progress** is the same dashboard Bennett sees (activity + class grades). It does not show the locked trophy catalog.
9. **Characters** on the parent desk: tap Ace / Riff / Scorch / Deuce / Fuzz / Bennett to see **that** character’s library (not the whole dump), or **Fun / Sounds**. Attach a still, clip, audio, or link to a streak reward or a future story / week beat. Crew comic art is available when you build a team beat. After Bennett earns 3 teammates, Story is a real page.

## Admin library

Open `admin.html` from the parent desk **Admin** chip. Sections: **Connect**, **Site usage**, **API spend**, **Library**, **Sounds**, **Story**, **Locker refs**. **Locker refs** opens the six locker stills for Imagine. **API spend** reads the family token from this device and links the [xAI console](https://console.x.ai/team/default/usage).

- Library kinds: **image**, **video**, **audio**, **link** (YouTube / any https URL).
- Grouped **Ace / Riff / Scorch / Deuce / Fuzz / Bennett / Gear / Crew / Fun / Sounds**. Gear stills also sit on the matching teammate shelf.
- Preview stills, play videos, play audio (`<audio controls>`), and open links (YouTube can embed).
- Seed: locker clips stay on their character. Comic files stay **Crew**. Gear stills (`angle-finder`, `field-kit`, `unplugged-strap`, `daily-pick`, `notebook-holding`, `first-serve`) stay on the teammate plus the Gear group. Do not re-upload those PNGs.
- **Drop or choose files** on Admin (mp3 / wav / ogg / m4a, plus image / video). Label and kind come from the filename. Default tag is Fun / Sounds. The file stays on this device (IndexedDB) — nothing is written into `img/library` or git.
- Path / URL add is still there as an advanced row for `file://` / Pages links. No upload server.
- **Story ingredients** box: topics to fold into the comic plus an optional parent “include in story” note.
- Export / import rides the same family pack. Device files ride along as base64 under a 2 MB-per-file cap; bigger files are skipped with a toast.

### How to attach media to a character

1. Admin: drop the file (or retag it) to Ace, Riff, Scorch, Deuce, Fuzz, Bennett, Crew, or Fun.
2. Parent desk: tap that character (or **Fun / Sounds**) → that locker library appears.
3. Select a file → **Attach** to a streak or a story / week beat (start, English 10 board, Scorch recover, Ace serve, notebook, finale, or a work/event on this week).
4. Audio / link / Fun items attached to a streak become a **content** unlock. Award that streak so Bennett can play them.
5. Export the family pack so the other parent gets tags, attachments, and content unlocks.

Do not re-encode `img/characters/ace.mp4`, `riff.mp4`, `scorch.mp4`, `deuce.mp4`, `fuzz.mp4`, or `bennett.mp4`.

### How to add ITYSL-style sounds later

Orin can grow a meme soundboard the same way — **without putting copyrighted I Think You Should Leave clips in this public repo**.

- Best: files he already owns on this phone or laptop, or links he is allowed to use.
- Admin → drop the file (or **Choose files**). No path typing. It lands under Fun / Sounds and plays from this device.
- Kind **link** (advanced row) stores a YouTube / https URL (open in a new tab; YouTube can embed).
- Attach that item to a streak as a content reward, then Award. Bennett sees the name only after it unlocks. Locked sounds stay **???** — not a catalog dump.
- Export the family pack so Mom gets the sound. Files over 2 MB are skipped with a toast.
- Do **not** download, scrape, or commit the ITYSL soundboard rips. This GitHub repo is public.
- No TEST ITYSL quotes in the seed.

## Story

`story.html` — Horned Frog daily strip. `story.json` has eight pages.

- Bennett’s HUD shows **Story** after three character unlocks (Bennett does not count). Parents always **Preview story** (`story.html?preview=1`) and see the full strip.
- One new page each Chicago day he opens Jungle Jam. Yesterday’s pages stay. A new page pops up like other rewards.
- Page 7 is Ace versus the horned frog (`img/library/ace-frog.mp4`). Page 8 is the win still.
- Parent story ingredients still print as a crew brief when present.

Invincible is a *style* (comic energy, bananas in the hat). The character is a later unlock — not in this ship.

## Khan Academy

On the lobby **Classes** strip, Progress empty-class rows, **A little help**, Ask AI, and the Story resources strip:

- Label: **Opens on Khan. No login needed.**
- `target="_blank"` `rel="noopener"`
- Real public URLs only (no login, no embed, no API keys):
  - https://www.khanacademy.org/ela
  - https://www.khanacademy.org/humanities/grammar
  - https://www.khanacademy.org/science/hs-chemistry
  - https://www.khanacademy.org/math/geometry-home
  - https://www.khanacademy.org/science
- English 10 (class + names / comic strips / notebook work) maps to ELA + grammar.
- Chemistry class maps to HS Chemistry. Chemistry / chem homework titles still map to HS Chemistry plus the Science hub.
- Geometry class maps to the public Geometry course.
- Marching Band, Sociology, Web Design I, Academic Intervention, and Strength & Conditioning I have no Khan course — omit the link. Do not invent one.
- Generic science / bio stays on the Science hub.
- Ask AI / Base Camp with `?class=chemistry` or `?title=Chemistry` shows HS Chemistry even with no work item.
- Jungle Jam Tutor Geometry handoff starts at https://www.khanacademy.org/math/geometry
- Do not invent Khan URLs.

## Base Camp — Jungle Jam Tutor

`basecamp.html` (HUD **Base Camp**; old `ask.html?class=&title=` redirects here). Coach identity is **Jungle Jam Tutor**. Not an answer engine.

- Class picker from the ParentVUE roster. Sessions save per class in the family pack (`family.basecamp`). Newest first. **New session** starts a fresh climb.
- Big chat + composer. Take photo (`capture="environment"`) or upload. Images compress on the phone (max edge ~1200px JPEG) and go to the tutor. PDF shows a name chip only.
- Photo is OK; he still has to name the givens. Geometry packet first (Foster): points/lines/planes, angles, vertical/adjacent, complementary/supplementary, triangle sum.
- Live: `POST https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/ask` with `className`, `messages`, optional `images: [{ mime, data }]`. Token header only if Connect is present. Then `/api/ask`. Keys never go in frontend JS or this repo.
- Done / Started: `POST https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/family-sync` (`{ pull: true }` or assignment rows). No anon key, service role, or family token in the browser. Admin Connect remains a REST fallback.
- Offline fallback is the same coach: attempt first, no packet answers, no fake “I can see your photo.”
- Kid view: no Admin / Edit / Delete / Parent desk chrome. He can start a new session.
- Export / import includes Base Camp sessions; image blobs are best-effort IndexedDB, not localStorage JPEGs.
- **A little help** on week cards stays a small sheet.

Tutor personality, hard rules, the attempt/hint loop, and the math-can-be-wrong warning live in `js/tutor.js`. Do not fork a second copy here.

## Live tutor + Ask AI (`serve.py`)

GitHub Pages cannot hide a key. The Anthropic key stays in the environment on a laptop — never in frontend JS or this repo.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python3 serve.py
```

Then open http://127.0.0.1:8765/

- `POST /api/tutor` — nudge (explain + first move) / optional proofread. Tutor, not ghostwriter.
- `POST /api/ask` — Socratic mentor. Questions and hints only.

If the API is missing (plain Pages, `file://`, or no key), the hub still works tonight from the assignment card and a fallback mentor.

Optional: `PORT`, `ANTHROPIC_MODEL` (default `claude-sonnet-4-0`).

## TEST data

Anything labeled **TEST** is look-and-feel filler, not a real family rule or a real assignment.

- Seed streaks in `achievements.json` are TEST look-and-feel (straight A’s, no-late, flash cards, five-day start, asked before due, **Meet Ace / Riff / Scorch / Deuce / Fuzz**, **Angle Finder**, **Field Kit**, **Unplugged Strap**, **Daily Pick**, **Notebook of Holding**, **First Serve**). Incentives are examples only. Characters, gear, and sounds do not unlock until a parent taps Award.
- `reward` may be bananas (a number) or `{ "type": "character"|"tool"|"weapon"|"ability"|"outfit"|"content", "id", "label" }`. Content `id` is a library item. Banana count can also live in `bananas` when `reward` is an object. `rewardCharacter` still works. Gear stills use `slot` on the library item (`tool` / `outfit` / `ability`).
- `family.json` ships an empty inbox (`notes` / questions) and empty story ingredients. The reflection pool is real prompts, not TEST filler.
- Course grades live in `week.grades` (ParentVUE / Canvas). `progress.json` is the S1 roster + assignment ids, not a TEST gradebook. Do not invent homework or extra class names (no PE / Algebra / History / Spanish).
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
- Real S1 ParentVUE classes, in clock order: Marching Band, Sociology, Web Design I, Academic Intervention / Seminar, Chemistry, Strength & Conditioning I, English 10, Geometry. Always list the class, even when `items` is empty. P8/P9 Seminar is the same 10:10–10:50 Academic Intervention slot — one row, not a ninth class. Course codes stay in `progress.json` metadata (and the parent desk). Do not dump them on the lobby.
- Collapsed row = class name + overall grade (only if one exists) + actions (started / done / asked / help). Empty class: name + “No assignments yet” + Khan links. No fake grade.
- Expand a class to see assignments and tests with a grade and status (not started / started timestamp / done). Grades stay hidden until expand.
- `progress.html?class=chemistry` expands that class.
- Help-opened timestamps are stored on the existing `bw-progress` object (`helpOpened`), not a new store.

**Needs follow-up (school vs Bennett)**
- Canvas / ParentVUE is what the teacher logged. Jungle Jam is what Bennett marked done. Those two disagree when work is finished but still missing, unlogged, or 0.
- Progress opens with a yellow **Needs follow-up** strip — after-school and bedtime check-ins that answer “do I need to send any emails?” This Week shows the same count and links here. Do not bury this under Trophy Room.
- Each discrepancy shows school vs Bennett, the follow-up deadline, and a copy-ready teacher email (`Copy email` or `mailto:`). The app does not send mail.
- `progress.html?checkin=after-school` and `?checkin=bedtime` are the two parent check-ins they asked for. Do not change Grok Bot cron in this repo.
- `followup.email_sent` is only true when Parenting wrote it. A student claim that they emailed is not a send. If `email_draft` is null, Progress generates a copy-ready note from title, teacher in the note, `submitted_at`, and `school_status`.

Bennett can see his activity and class progress. Parents can open the same page. Nobody sees the parent achievement catalog or locked trophies here.

## week.json (Parenting agent)

Parenting writes `week.json`. The lobby only reads it. Keep old work rows working if the new fields are missing.

On each `work[]` item, in addition to `id`, `title`, `due`, `status`, `score`, `points`, `late`, `submitted_at`, `source`, `canvas`, and `note`:

| Field | Who | Values |
| --- | --- | --- |
| `school_status` | Canvas / ParentVUE | string: `open` · `missing` · `late` · `submitted` · `graded` (or null) |
| `student_status` | Bennett / Parenting | `null` **or** `{ "said", "source", "as_of" }` — not always a `"done"` string |
| `submitted_at` | Student or Canvas | Chicago-local ISO, or `null` |
| `discrepancy` | Compare the two | boolean. `true` only when Parenting marked a school-vs-Bennett gap |
| `discrepancy_reason` | Parenting | string or `null` |
| `followup` | Plan for that gap | `{ "due_by", "email_draft", "email_sent" }` |

`email_draft` is often `null` even when `discrepancy` is true. The lobby generates a copy-ready teacher email from `title`, the teacher name in `note`, `submitted_at`, and `school_status`. `email_sent: false` means do not show it as sent. Do not invent grades, due dates, or that an email went out.

Parenting owns `week.json`.

## Easter eggs

Wholesome only. Try tapping the banner band, the little clarinet, and a shy tennis ball. Eggs never show an unearned trophy.

**Egg game:** FEED EGGS — drag or tap eggs into the mouth. The voice keeps saying six eggs. Then the 80-pack, then 40, then 41 — you win. Nude egg, the company says it’s not allowed, game shuts down. Unlocks when parents award **Wrong number of eggs**, or when Bennett finds the banner-band secret. Then **🥚 Play** shows in the HUD and on that trophy. Locked players only see a “keep going” screen — not the catalog.

## Files

- `index.html` — week lobby (embeds JSON fallbacks so `file://` still works)
- `characters.html` — Bennett’s teammate room + loadout (locked silhouettes until awarded)
- `story.html` — daily strip (gated until 3 unlocks; parents use `?preview=1`)
- `ask.html` — redirects to Base Camp (keeps `?class=` / `?title=`)
- `basecamp.html` — Jungle Jam Tutor chat, sessions by class
- `admin.html` — parent-only media library
- `refs.html` — **Locker refs**: Ace / Riff / Scorch / Deuce / Fuzz stills to drag into Imagine
- `egg.html` — FEED EGGS (locked until the trophy)
- `progress.html` — activity + class dashboard
- `parent.html` — parent desk
- `mom.html` — redirect to `parent.html`
- `week.json` — calendar, work, parenting time, school-vs-Bennett status, follow-up drafts
- `progress.json` — class roster + assignment ids + sample opens
- `achievements.json` — streak catalog + incentives + `reward` / `rewardUnlock`
- `characters.json` — Ace / Riff / Scorch / Deuce / Fuzz roster + `comicStartsAfter: 3`
- `library.json` — stills, clips, audio, and links tagged by character, Crew, or Fun
- `story.json` — 8 daily pages
- `family.json` — reflection pool, story ingredients, empty inbox seed
- `serve.py` — static server + `/api/tutor` + `/api/ask`
- `img/` — banner, day art, badge, jungle wallpaper
- `img/characters/` — Ace / Riff / Scorch / Deuce / Fuzz locker clips and posters (already on main; do not re-encode)
- `img/library/` — crew comic stills + adventure clip + gear icons (already on main; do not re-encode or re-upload)
- `css/theme.css`, `js/build.js`, `js/game.js`, `js/week.js`, `js/parent.js`, `js/characters.js`, `js/tutor.js`, `js/progress.js`, `js/egg.js`, `js/admin.js`, `js/story.js`, `js/ask.js`, `js/basecamp.js`

## Characters (Ace, Riff, Scorch, Deuce, Fuzz)

Parents assign a teammate (or a tool / ability) on a streak, then award that streak. Bennett only sees unlocked teammates and unlocked gear.

1. Parent desk → **Characters**: Ace, Riff, Scorch, Deuce, and Fuzz are ready (play each clip). Tap one to see that library, or **Fun / Sounds**.
2. Edit a streak → **Reward unlock** → character / tool / weapon / ability / outfit / content. TEST streaks **Meet Ace**, **Meet Riff**, **Meet Scorch**, **Meet Deuce**, **Meet Fuzz**, **Angle Finder**, **Field Kit**, **Unplugged Strap**, **Daily Pick**, **Notebook of Holding**, and **First Serve** are already wired.
3. **Award** that streak. Nobody auto-unlocks on load. A content unlock shows **Play reward** (user gesture — audio does not autoplay). Export the family pack so the other parent gets unlocks.
4. Bennett opens **Characters**. Locked slots are silhouettes. After the award he can play the clip and see the talent / tag line. A new unlock plays that teammate’s clip once as the celebration. Loadout shows earned tools / outfits / abilities with the gear PNG. Locked gear stays **???**. **Sounds** shows earned audio / links; locked names stay **???**.
5. After 3 character unlocks, **Story** is available — the daily strip, not a toast. An attached unlocked sound can play on a story or week beat.

Every page shows **Build N** and the last-modified time (America/Chicago) on the banner, top right. Bump `build` by 1 and update `modified` in `js/build.js` (and the HTML stamp) on each ship.

## Locker refs (Orin)

Open `refs.html` (HUD **Locker refs** on Admin and Characters, or https://oborgelt.github.io/bennett-week/refs.html). Six large locker stills already on the site — 1 Ace, 2 Riff, 3 Scorch, 4 Deuce, 5 Fuzz, 6 Bennett. Drag them into Imagine (Quality / Image). Do not redesign. No new media files.
