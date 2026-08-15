# Bennett Week

Phone-first rolling 7-day lobby for Bennett (sophomore, Olathe East). Seven cards: today plus the next 6 days in America/Chicago.

Theme: monkeys playing tennis and goofing around with guitars, bass clarinet, and a court-side garage band. Currency is **bananas**. No login, no accounts, no chat, no AI tutor.

## Open it (Orin / Bennett)

1. Download this repo (Code → Download ZIP) or clone it.
2. Open `index.html` in a browser. Works on a phone or laptop, including `file://`.
3. Swipe the cards, or use Prev / Next, or tap the dots.
4. Tap **I started this** / **Done** on work items. Progress stays on that device (`localStorage`).
5. Open **Trophies** for the achievement shelf.

If GitHub Pages is on: https://oborgelt.github.io/bennett-week/

## Mom desk (add or edit an achievement)

1. Open `mom.html` (or tap **Mom desk** at the bottom of the week).
2. Add / edit / delete: title, description, how to unlock, incentive, icon, bananas.
3. Saves on that device only.
4. Tap **Download achievements.json** and drop the file into this repo so everyone else sees it.

`achievements.json` is the source of truth Mom (or Orin) edits in the repo. The week page uses a Mom-desk draft on the same device if one exists.

## TEST data

Anything labeled **TEST** is look-and-feel filler, not a real family rule or a real assignment.

- Seed achievements in `achievements.json` are `"test": true` (First serve, Name game, Comic warm-up, Notebook scout, Band monkey, Hidden banana). Incentives are examples only.
- `week.json` may include one fake calendar row titled `TEST: …` to check card density. Real seed items from v1 stay (parenting time, Mon band, English names, comic strips, Forms & Fees, spiral notebook, chemistry absence note on 8/14).
- Do not treat this as a full semester of homework. English often lives in a Google sheet; Canvas is not the full due list.

## Easter eggs

Wholesome only. Try tapping the banner band, the little clarinet, and a shy tennis ball.

## Files

- `index.html` — week lobby (embeds JSON fallbacks so `file://` still works)
- `mom.html` — Mom desk
- `week.json` — calendar, work, parenting time
- `achievements.json` — achievements + incentives
- `img/` — banner, day art, badge, jungle wallpaper
- `css/theme.css`, `js/game.js`, `js/week.js`, `js/mom.js`
