#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

const library = readJson("library.json");
const achievements = readJson("achievements.json");
const refsHtml = fs.readFileSync(path.join(root, "refs.html"), "utf8");
const adminHtml = fs.readFileSync(path.join(root, "admin.html"), "utf8");
const charactersHtml = fs.readFileSync(path.join(root, "characters.html"), "utf8");

assert(/Locker refs/.test(refsHtml), "refs.html should be titled Locker refs");
assert(/Jungle Jam/.test(refsHtml), "refs.html should keep the Jungle Jam product name");
assert(/Imagine \(Quality \/ Image\)/.test(refsHtml), "refs.html should say to drag into Imagine (Quality / Image)");
assert(/Do not redesign/.test(refsHtml), "refs.html should say do not redesign");
["ace", "riff", "scorch", "deuce", "fuzz", "bennett"].forEach((id) => {
  assert(refsHtml.includes("img/characters/" + id + ".jpg"), id + " locker still should be on refs.html");
});
assert(/1 Ace/.test(refsHtml) && /2 Riff/.test(refsHtml) && /3 Scorch/.test(refsHtml) && /4 Deuce/.test(refsHtml) && /5 Fuzz/.test(refsHtml) && /6 Bennett/.test(refsHtml), "refs.html should label 1 Ace through 6 Bennett");
assert(adminHtml.includes("refs.html") && /Locker refs/.test(adminHtml), "Admin should link Locker refs");
assert(/<h2>Connect<\/h2>/.test(adminHtml), "Admin should have a Connect section");
assert(/<h2>Site usage<\/h2>/.test(adminHtml), "Admin should have a Site usage section");
assert(/<h2>API spend<\/h2>/.test(adminHtml), "Admin should have an API spend section");
assert(/<h2>Library<\/h2>/.test(adminHtml), "Admin should have a Library section");
assert(/<h2>Sounds<\/h2>/.test(adminHtml), "Admin should have a Sounds section");
assert(/<h2>Story<\/h2>/.test(adminHtml), "Admin should have a Story section");
assert(/xAI console/.test(adminHtml) && adminHtml.includes("https://console.x.ai/team/default/usage"), "Admin should link xAI console");
assert(adminHtml.includes('id="usage-connect"') && adminHtml.includes('id="tel-token"') && adminHtml.includes('id="tel-refresh"'), "Admin should keep connect IDs");
assert(adminHtml.includes('id="usage-stats"') && adminHtml.includes('id="sound-cues"') && adminHtml.includes('id="library-groups"'), "Admin should keep usage, sound, and library IDs");
assert(/class="admin-tabs"/.test(adminHtml) && /id="admin-tabs"/.test(adminHtml), "Admin needs a sticky top category bar");
assert(!/class="admin-jump"/.test(adminHtml), "Admin should not use jump-link anchors");
["connect", "usage", "spend", "library", "sounds", "story", "refs"].forEach((id) => {
  assert(adminHtml.includes('data-admin-tab="' + id + '"'), "Admin top tabs include " + id);
  assert(adminHtml.includes('data-admin-panel="' + id + '"'), "Admin panels include " + id);
});
assert(!/href="#connect-panel"/.test(adminHtml) && !/href="#library-panel"/.test(adminHtml), "Admin should not jump to section anchors");
assert(/id="library-cats"/.test(adminHtml) && /class="library-cats"/.test(adminHtml), "Admin library needs a category tab bar");
assert(/data-lib-cat="all"/.test(adminHtml) && />All</.test(adminHtml), "Library category tabs include All");
assert(/data-lib-cat="ace"/.test(adminHtml) && />Ace</.test(adminHtml), "Library category tabs include Ace");
["riff", "scorch", "deuce", "fuzz", "bennett", "gear", "crew"].forEach((id) => {
  assert(adminHtml.includes('data-lib-cat="' + id + '"'), "Library category tabs include " + id);
});
assert(!/data-lib-cat="fun"/.test(adminHtml), "Sounds is a top tab, not a buried library category");
assert(/>Sounds</.test(adminHtml) && /data-admin-tab="sounds"/.test(adminHtml), "Sounds is a top-level admin tab");
assert(/id="fun-library"/.test(adminHtml), "Sounds should keep the Fun / audio library");
const soundsBlock = adminHtml.slice(adminHtml.indexOf('id="sounds-panel"'));
assert(/Treehouse table/.test(soundsBlock) && /Banana-peel table \/ Pedestal/.test(soundsBlock), "Sounds should pin a Treehouse table card");
assert(soundsBlock.indexOf("Treehouse table") < soundsBlock.indexOf('id="sound-cues"'), "Treehouse table card should sit at the top of Sounds");
assert(/id="table-cue"/.test(adminHtml), "Treehouse table card needs the assign/save/clear host");
const adminJs = fs.readFileSync(path.join(root, "js/admin.js"), "utf8");
assert(/data-lib-shelf/.test(adminJs) && /setLibCat/.test(adminJs) && /applyLibCat/.test(adminJs), "Admin should filter library shelves from the category tabs");
assert(/setAdminTab/.test(adminJs) && /applyAdminTab/.test(adminJs) && /data-admin-panel/.test(adminJs), "Admin should show only the selected top panel");
assert(/setSiteView/.test(adminJs) && /siteViewFromRole/.test(adminJs), "Connect save should set site view from the device role");
assert(!/scrollIntoView/.test(adminJs), "Admin category changes must not scrollIntoView");
assert(/bw-admin-tab/.test(adminJs) && /bw-lib-cat/.test(adminJs), "Admin should persist the top tab and library sub-tab");
const tutorJs = fs.readFileSync(path.join(root, "js/tutor.js"), "utf8");
const askHtml = fs.readFileSync(path.join(root, "ask.html"), "utf8");
assert(adminJs.includes("https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/spend"), "Admin should GET the spend function");
assert(/x-family-token/.test(adminJs) && /loadSpend/.test(adminJs) && /await loadSpend/.test(adminJs), "Refresh usage should also refresh spend");
assert(/spend today/.test(adminJs) && /calls today/.test(adminJs) && /spend 7d/.test(adminJs) && /all-time/.test(adminJs) && /last call/.test(adminJs), "spend tiles should cover today, 7d, all-time, and last call");
assert(adminJs.includes('only: ["tables"]') && adminJs.includes('except: ["tables"]'), "Admin should pin tables at the top and keep the other cues below");
assert(fs.readFileSync(path.join(root, "js/game.js"), "utf8").includes("function filterCueRows"), "sound cue lists should be able to pin or hide a cue");
assert(tutorJs.includes("https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/ask"), "Ask AI should try the live function first");
assert(/x-family-token/.test(tutorJs) && /\/api\/ask/.test(tutorJs) && /testAsk/.test(tutorJs), "Ask AI should send the family token, then /api/ask, then testAsk");
assert(/tutor\.js\?v=68/.test(askHtml) && /ask\.js\?v=68/.test(askHtml), "Ask AI page should cache-bust tutor/ask");
const secretScan = [adminJs, tutorJs, adminHtml, askHtml, fs.readFileSync(path.join(root, "js/week.js"), "utf8"), fs.readFileSync(path.join(root, "js/game.js"), "utf8")].join("\n");
assert(!/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./.test(secretScan), "do not put JWT/anon keys in the repo");
assert(!/xai-[A-Za-z0-9]{10,}/.test(secretScan), "do not put xAI keys in the repo");
assert(!/FAMILY_TOKEN\s*[:=]\s*["'][^"']+["']/.test(secretScan), "do not put the family token in the repo");
assert(charactersHtml.includes("refs.html") && /Locker refs/.test(charactersHtml), "Characters should link Locker refs");

const kinds = new Set(["image", "video", "audio", "link"]);
const groups = new Set(["ace", "riff", "scorch", "deuce", "fuzz", "bennett", "crew", "fun"]);
const banned = /i think you should leave|itysl|ithinkyoushouldquote|hot dog car|were you trying to sex me/i;

assert(Array.isArray(library.items), "library.json needs items");
library.items.forEach((item) => {
  assert(item.id, "library item needs id");
  assert(kinds.has(item.kind), item.id + " has kind " + item.kind);
  assert(groups.has(item.character), item.id + " has character " + item.character);
  assert(!banned.test(JSON.stringify(item)), item.id + " looks like a third-party quote");
  if (item.kind === "audio" || item.kind === "link") {
    assert(item.path || item.url || item.synth, item.id + " needs path, url, or synth");
  } else {
    assert(item.path, item.id + " needs a path");
  }
});

["deuce", "fuzz", "bennett"].forEach((id) => {
  const clip = library.items.find((item) => item.id === id + "-clip");
  const poster = library.items.find((item) => item.id === id + "-poster");
  assert(clip && clip.kind === "video" && clip.character === id, id + "-clip should be a locker video");
  assert(poster && poster.kind === "image" && poster.character === id, id + "-poster should be a locker still");
  assert(clip.path === "img/characters/" + id + ".mp4", id + " clip path");
  assert(poster.path === "img/characters/" + id + ".jpg", id + " poster path");
});

const meetDeuce = (achievements.achievements || []).find((a) => a.id === "test-deuce-return");
const meetFuzz = (achievements.achievements || []).find((a) => a.id === "test-fuzz-unplugged");
const signedIn = (achievements.achievements || []).find((a) => a.id === "signin-bennett");
const meetBennett = (achievements.achievements || []).find((a) => a.id === "test-bennett-showup");
assert(meetDeuce && meetDeuce.rewardUnlock && meetDeuce.rewardUnlock.id === "deuce", "Meet Deuce should unlock character deuce");
assert(meetFuzz && meetFuzz.rewardUnlock && meetFuzz.rewardUnlock.id === "fuzz", "Meet Fuzz should unlock character fuzz");
assert(meetDeuce.rewardCharacter === "deuce" && meetFuzz.rewardCharacter === "fuzz", "Meet streaks keep rewardCharacter");
assert(signedIn && signedIn.rewardUnlock && signedIn.rewardUnlock.id === "bennett", "Signed in should unlock character bennett");
assert(signedIn.title === "Signed in" && /Opened Jungle Jam/i.test(signedIn.description || ""), "Signed in copy");
assert(signedIn.incentive === "Unlocks Bennett", "Signed in incentive");
assert(meetBennett && meetBennett.rewardUnlock && meetBennett.rewardUnlock.id === "bennett", "Meet Bennett TEST should re-award bennett");
assert(fs.existsSync(path.join(root, "img/characters/bennett.jpg")), "bennett locker still should already be on disk");
assert(fs.existsSync(path.join(root, "img/characters/bennett.mp4")), "bennett locker clip should already be on disk");

const gearSeed = [
  { id: "angle-finder", label: "Angle Finder", character: "deuce", slot: "tool", ach: "test-angle-finder", type: "tool" },
  { id: "field-kit", label: "Field Kit", character: "scorch", slot: "tool", ach: "test-field-kit", type: "tool" },
  { id: "unplugged-strap", label: "Unplugged Strap", character: "fuzz", slot: "outfit", ach: "test-unplugged-strap", type: "outfit" },
  { id: "daily-pick", label: "Daily Pick", character: "riff", slot: "tool", ach: "test-daily-pick", type: "tool" },
  { id: "notebook-holding", label: "Notebook of Holding", character: "ace", slot: "tool", ach: "test-notebook-holding", type: "tool" },
  { id: "first-serve", label: "First Serve", character: "ace", slot: "ability", ach: "test-first-serve", type: "ability" }
];
gearSeed.forEach((row) => {
  const item = library.items.find((it) => it.id === row.id);
  assert(item, row.id + " should be in library.json");
  assert.strictEqual(item.kind, "image", row.id + " should be an image");
  assert.strictEqual(item.character, row.character, row.id + " should sit on " + row.character);
  assert.strictEqual(item.slot, row.slot, row.id + " slot");
  assert.strictEqual(item.path, "img/library/" + row.id + ".png", row.id + " path");
  assert.strictEqual(item.poster, "img/library/" + row.id + ".png", row.id + " poster");
  assert(fs.existsSync(path.join(root, item.path)), row.id + " png should already be on disk");
  const ach = (achievements.achievements || []).find((a) => a.id === row.ach);
  assert(ach, row.ach + " should stay in achievements.json");
  const unlock = ach.rewardUnlock || (ach.reward && typeof ach.reward === "object" ? ach.reward : null);
  assert(unlock && unlock.id === row.id && unlock.type === row.type, row.ach + " should grant " + row.type + " " + row.id);
  assert.strictEqual(ach.title, row.label, row.ach + " title");
});
assert((achievements.achievements || []).some((a) => a.id === "test-notebook-holding"), "keep test-notebook-holding");
assert((achievements.achievements || []).some((a) => a.id === "test-first-serve"), "keep test-first-serve");
const fightSeed = [
  { id: "ace-frog", label: "Frog Serve", character: "ace", ach: "test-ace-frog", poster: "img/library/ace-frog.jpg", icon: "tennis" },
  { id: "riff-bird", label: "Bird Blast", character: "riff", ach: "test-riff-bird", poster: "img/library/riff-bird.jpg", icon: "guitar" },
  { id: "scorch-spider", label: "Web Burn", character: "scorch", ach: "test-scorch-spider", poster: "img/library/scorch-spider.jpg", icon: "clarinet" }
];
fightSeed.forEach((row) => {
  const item = library.items.find((it) => it.id === row.id);
  assert(item, row.id + " should be in library.json");
  assert.strictEqual(item.kind, "video", row.id + " should be a video");
  assert.strictEqual(item.character, row.character, row.id + " should sit on " + row.character);
  assert.strictEqual(item.slot, "content", row.id + " should use the content slot");
  assert.strictEqual(item.path, "img/library/" + row.id + ".mp4", row.id + " clip path");
  assert.strictEqual(item.poster, row.poster, row.id + " poster");
  assert(fs.existsSync(path.join(root, item.path)), row.id + " mp4 should already be on disk");
  assert(fs.existsSync(path.join(root, item.poster)), row.id + " poster should already be on disk");
  const ach = (achievements.achievements || []).find((a) => a.id === row.ach);
  assert(ach, row.ach + " should stay in achievements.json");
  assert(!ach.test, row.ach + " must not ship a test flag");
  const unlock = ach.rewardUnlock || (ach.reward && typeof ach.reward === "object" ? ach.reward : null);
  assert(unlock && unlock.id === row.id && unlock.type === "content", row.ach + " should grant content " + row.id);
  assert.strictEqual(ach.title, row.label, row.ach + " title");
  assert.strictEqual(ach.incentive, "Unlocks a fight clip", row.ach + " incentive");
  assert.strictEqual(ach.icon, row.icon, row.ach + " icon");
  assert.strictEqual(ach.streak && ach.streak.target, 1, row.ach + " streak target");
  assert(/Parents award this from the desk/i.test(ach.how || ""), row.ach + " how");
  assert(/does not auto-unlock/i.test(ach.how || ""), row.ach + " should not auto-unlock on load");
});
const beam = library.items.find((it) => it.id === "scorch-spider-beam");
assert(beam && beam.kind === "image" && beam.character === "scorch", "scorch-spider-beam stays extra Scorch library art");
assert.strictEqual(beam.path, "img/library/scorch-spider-beam.jpg", "beam still path");
assert(fs.existsSync(path.join(root, beam.path)), "scorch-spider-beam.jpg should already be on disk");
assert(beam.slot !== "tool" && beam.slot !== "outfit" && beam.slot !== "ability", "beam is not locker or gear");
const trophyStills = [
  { id: "trophy-room", path: "img/library/trophy-room.jpg" },
  { id: "trophy-pedestal", path: "img/library/trophy-pedestal.jpg" },
  { id: "trophy-window", path: "img/library/trophy-window.jpg" },
  { id: "trophy-cubbies", path: "img/library/trophy-cubbies.jpg" },
  { id: "trophy-pegboard", path: "img/library/trophy-pegboard.jpg" },
  { id: "trophy-lockers", path: "img/library/trophy-lockers.jpg" }
];
trophyStills.forEach((row) => {
  const item = library.items.find((it) => it.id === row.id);
  assert(item, row.id + " should be in library.json");
  assert.strictEqual(item.kind, "image", row.id + " should be a still");
  assert.strictEqual(item.character, "crew", row.id + " sits on Crew — LIBRARY_GROUPS has no Room shelf");
  assert.strictEqual(item.path, row.path, row.id + " path");
  assert(!item.slot, row.id + " is not locker art or gear");
  assert(fs.existsSync(path.join(root, item.path)), row.id + " should already be on disk");
});
["ace", "riff", "scorch", "deuce", "fuzz", "bennett"].forEach((id) => {
  const clip = library.items.find((item) => item.id === id + "-clip");
  const poster = library.items.find((item) => item.id === id + "-poster");
  assert(clip && clip.path === "img/characters/" + id + ".mp4", id + " locker clip path stays put");
  assert(poster && poster.path === "img/characters/" + id + ".jpg", id + " locker still path stays put");
});
const parentHtml = fs.readFileSync(path.join(root, "parent.html"), "utf8");
assert(/test-angle-finder/.test(parentHtml) && /test-field-kit/.test(parentHtml) && /test-unplugged-strap/.test(parentHtml) && /test-daily-pick/.test(parentHtml), "parent desk fallback should list the four gear awards");
assert(/test-ace-frog/.test(parentHtml) && /test-riff-bird/.test(parentHtml) && /test-scorch-spider/.test(parentHtml), "parent desk fallback should list the three fight awards");
assert(/outfit/.test(parentHtml), "parent desk should offer an outfit reward type");
assert(adminHtml.includes("img/library/angle-finder.png") && adminHtml.includes("img/library/daily-pick.png"), "Admin file:// seed should include gear stills");
assert(adminHtml.includes("img/library/ace-frog.mp4") && adminHtml.includes("img/library/riff-bird.mp4") && adminHtml.includes("img/library/scorch-spider.mp4"), "Admin file:// seed should include fight clips");
assert(adminHtml.includes("img/library/trophy-room.jpg") && adminHtml.includes("img/library/trophy-window.jpg"), "Admin file:// seed should include trophy-room stills");
assert(/Reload shipped files/.test(adminHtml), "Admin should offer Reload shipped files");
assert(!/id="clear-audio"|id="wipe-fun"|Clear (all )?Fun|Delete all (audio|sounds)/i.test(adminHtml), "do not add a control that clears Fun/Sounds");
assert(/Jungle Jam/.test(parentHtml), "parent desk should keep the Jungle Jam product name");

const honk = library.items.find((item) => item.id === "banana-honk");
assert(!honk, "Banana honk TEST seed should be gone");

const reward = (achievements.achievements || []).find((a) => a.id === "test-banana-honk");
assert(!reward, "Banana honk TEST achievement should be gone");
assert(!(achievements.achievements || []).some((a) => a.test), "achievements.json should not ship TEST flags");
assert(!(library.items || []).some((item) => item.test), "library.json should not ship TEST flags");

const store = {};
const localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
  setItem(key, value) { store[key] = String(value); },
  removeItem(key) { delete store[key]; }
};
const document = {
  body: null,
  documentElement: { setAttribute() {}, getAttribute() { return ""; } },
  addEventListener() {},
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() {
    return { style: {}, className: "", id: "", hidden: false, innerHTML: "", classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} }, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, setAttribute() {}, getAttribute() { return null; }, addEventListener() {}, closest() { return null; } };
  }
};
const window = {
  localStorage,
  document,
  location: { pathname: "/index.html" },
  matchMedia() { return { matches: true }; },
  AudioContext: undefined,
  webkitAudioContext: undefined,
  BW_BUILD: { build: 34, modified: "2026-08-15T13:45:00-05:00" }
};
window.window = window;
const ctx = vm.createContext({
  window,
  document,
  localStorage,
  console,
  URL,
  Blob,
  File,
  btoa,
  atob,
  encodeURIComponent
});
vm.runInContext(fs.readFileSync(path.join(root, "js/game.js"), "utf8"), ctx);
const Game = ctx.window.Game;
ctx.Game = Game;
assert(Game, "Game failed to load");
vm.runInContext(fs.readFileSync(path.join(root, "js/tutor.js"), "utf8"), ctx);
const Tutor = ctx.window.Tutor;
assert(Tutor, "Tutor failed to load");
const namesHelp = Tutor.testHelp({ title: "English 10: Help me learn your names!", mode: "nudge" });
assert(namesHelp.explain && namesHelp.start, "nudge help should explain and give a first move");
assert(!namesHelp.cards, "nudge help should not dump flip cards");
assert(/awesome thing/i.test(namesHelp.start), "names help should start with the awesome-thing move");
const notebookHelp = Tutor.cardsFrom("English 10: Bring spiral notebook");
assert(notebookHelp.start && /backpack/i.test(notebookHelp.start), "notebook help should be a pack-it move");

const khanChem = Game.khanLinksFor("Chemistry homework");
assert(khanChem.some((k) => k.url === "https://www.khanacademy.org/science/hs-chemistry"), "chem titles should link HS Chemistry");
assert(khanChem.some((k) => /HS Chemistry/i.test(k.label)), "HS Chemistry label should be public-course wording");
assert(khanChem.every((k) => k.url.indexOf("khanacademy.org") >= 0), "Khan links stay on Khan");
const khanEla = Game.khanLinksFor("English 10: Finish summer comic strips");
assert(khanEla.every((k) => k.id === "ela" || k.id === "grammar"), "English titles stay on ELA + grammar");
assert(!khanEla.some((k) => k.id === "hs-chemistry"), "English titles should not get HS Chemistry");
const khanSci = Game.khanLinksFor("Biology lab");
assert.strictEqual(khanSci.length, 1, "generic science/bio stays on the Science hub");
assert.strictEqual(khanSci[0].id, "science", "generic science/bio stays on the Science hub");
const khanHtml = Game.khanStripHtml("Chem quiz");
assert(khanHtml.indexOf("https://www.khanacademy.org/science/hs-chemistry") >= 0, "strip HTML should include HS Chemistry");
assert(khanHtml.indexOf("target=\"_blank\"") >= 0 && khanHtml.indexOf("rel=\"noopener\"") >= 0, "Khan links open in a new tab");
assert(khanHtml.indexOf("No login needed") >= 0, "strip should say no login is needed");
assert(khanHtml.indexOf("iframe") < 0, "do not embed Khan");

const progress = readJson("progress.json");
const week = readJson("week.json");
const classIds = (progress.classes || []).map((cls) => cls.id);
assert.deepStrictEqual(classIds, [
  "band",
  "sociology",
  "web-design",
  "academic-intervention",
  "chemistry",
  "strength",
  "english-10",
  "geometry"
], "S1 ParentVUE roster only — no guessed PE / Algebra list");
assert(!classIds.includes("pe"), "PE is not on the ParentVUE S1 roster");
const byId = Object.fromEntries(progress.classes.map((cls) => [cls.id, cls]));
["sociology", "web-design", "academic-intervention", "chemistry", "strength", "geometry"].forEach((id) => {
  assert(Array.isArray(byId[id].items) && byId[id].items.length === 0, id + " has no assignments");
  assert(!byId[id].grade, id + " must not invent a grade");
});
assert.deepStrictEqual(byId.chemistry.khan, ["hs-chemistry"], "Chemistry maps to HS Chemistry");
assert.deepStrictEqual(byId.geometry.khan, ["geometry-home"], "Geometry maps to public Geometry course");
const english = byId["english-10"];
const band = byId.band;
assert(!english.grade, "do not invent an English grade");
assert(!band.grade, "do not invent a Band grade");
assert((english.items || []).length >= 3, "keep existing English progress items");
assert((band.items || []).length >= 2, "keep existing Band progress items");
assert.deepStrictEqual(english.khan, ["ela", "grammar"], "English maps to ELA + grammar");
assert(!band.khan, "Band has no Khan course");
assert.strictEqual(band.period, "P1");
assert.strictEqual(english.period, "P6");
assert.strictEqual(byId.chemistry.time, "10:55–12:10");
assert.strictEqual(progress.classes.length, 8, "exactly 8 ParentVUE rows — P9 is not a ninth class");
assert.strictEqual(byId["academic-intervention"].time, "10:10–10:50", "Seminar shares the Academic Intervention clock");
assert.deepStrictEqual(byId["academic-intervention"].periods, ["P8", "P9"], "P8/P9 are one HR100F row");
assert.strictEqual(byId["academic-intervention"].code, "HR100F");
assert.strictEqual(byId.band.code, "PA510");
assert.strictEqual(byId.strength.code, "PE510A");
assert.strictEqual(byId.strength.name, "Strength & Conditioning I");
assert.strictEqual(Game.classPeriodLine(byId["academic-intervention"]), "Academic Intervention / Seminar");
assert(!Game.classShowsPeriodChip(byId["academic-intervention"]), "do not print Seminar twice on the lobby");
assert(!(week.work || []).some((w) => /algebra|history|spanish|\bPE\b/i.test(w.title || "")), "do not invent homework in week.json");

const khanClassChem = Game.khanLinksForClass(byId.chemistry);
assert.strictEqual(khanClassChem.length, 1, "Chemistry class strip is HS Chemistry only");
assert.strictEqual(khanClassChem[0].id, "hs-chemistry", "Chemistry class strip is HS Chemistry");
assert.strictEqual(Game.khanLinksForClass(band).length, 0, "Band omits Khan");
assert.strictEqual(Game.khanLinksForClass(byId.sociology).length, 0, "Sociology omits Khan");
assert.strictEqual(Game.khanLinksForClass(byId.strength).length, 0, "Strength omits Khan");
const khanGeo = Game.khanLinksForClass(byId.geometry);
assert.strictEqual(khanGeo.length, 1, "Geometry class strip is Geometry only");
assert.strictEqual(khanGeo[0].url, "https://www.khanacademy.org/math/geometry-home", "Geometry uses the public course URL");
const khanAskChem = Game.khanLinksFor("Chemistry", { classId: "chemistry" });
assert(khanAskChem.some((k) => k.id === "hs-chemistry"), "Ask ?class=chemistry shows HS Chemistry");
assert(!khanAskChem.some((k) => k.id === "ela"), "Ask chemistry should not dump ELA");
assert.strictEqual(Game.classDueLabel(3), "3 due");
assert.strictEqual(Game.classDueLabel(0), "Nothing due yet");
assert.strictEqual(Game.classDueCount(english, week), 3, "English has 3 due from week.json");
assert.strictEqual(Game.classDueCount(byId.chemistry, week), 0, "Chemistry has nothing due");
assert.strictEqual(Game.classPeriodLine(band), "P1 Marching Band");

assert.strictEqual(progress.term.id, "2025-26-s1", "progress.json should name the current term");
assert.strictEqual(Game.termOf(progress).id, "2025-26-s1");
assert.strictEqual(Game.termOf({}).id, Game.DEFAULT_TERM.id);
const termsFile = readJson("data/terms.json");
assert.strictEqual(termsFile.current, "2025-26-s1");
assert(termsFile.terms.some((t) => t.id === "2025-26-s1" && t.grade === "sophomore"));

const overlayShape = Game.emptyFamily().overlay;
assert(Array.isArray(overlayShape.week.added.work), "week overlay can add work");
assert(Array.isArray(overlayShape.progress.addedItems), "progress overlay can add items");

let addedFam = Game.emptyFamily();
const added = Game.addAssignment(addedFam, progress, {
  title: "Read chapter 2",
  classId: "english-10",
  due: "2026-08-20T23:59:00",
  note: "quiz Friday"
});
addedFam = added.family;
assert(added.id, "addAssignment returns an id");
const weekApplied = Game.applyWeekOverlay({ work: [], events: [], notes: [] }, addedFam);
const newWork = weekApplied.work.find((w) => w.id === added.id);
assert(newWork, "added work shows on the week overlay");
assert.strictEqual(Game.classIdForWork(newWork), "english-10");
assert.strictEqual(newWork.termId, "2025-26-s1");
assert(/English 10/.test(newWork.title), "week title keeps the class prefix");
const progApplied = Game.applyProgressOverlay(progress, addedFam);
const eng = progApplied.classes.find((cls) => cls.id === "english-10");
assert(eng.items.some((item) => item.id === added.id && item.title === "Read chapter 2"), "Progress sees the new assignment");
assert(addedFam.notes.some((n) => n.kind === "note" && n.from === "bennett" && n.targetId === added.id && n.termId === "2025-26-s1"));

store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "orin" });
store["bw-device-id"] = "dev-keep";
store["bw-session-at"] = "1";
store["bw-seed-gen"] = "0";
Game.migrateCleanSlate();
assert(localStorage.getItem("bw-telemetry"), "clean-slate must not wipe telemetry config");
assert.strictEqual(localStorage.getItem("bw-device-id"), "dev-keep");
assert(localStorage.getItem("bw-session-at"), "clean-slate must not wipe session stamp");

["index.html", "progress.html", "parent.html", "admin.html", "ask.html", "egg.html", "story.html", "characters.html", "refs.html"].forEach((file) => {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert(/class="banner-title"[^>]*href="index.html"|href="index.html"[^>]*class="banner-title"/.test(html), file + " banner should link home");
  assert(html.indexOf("hud-nav") < 0 || /hud-nav[\s\S]{0,80}week-chip/.test(html), file + " should keep This week first in the HUD");
  if (file !== "index.html") {
    assert(/banner-home/.test(html), file + " banner image should be a home hit target");
  }
  assert(html.includes("js/telemetry.js"), file + " should load telemetry");
});

vm.runInContext(fs.readFileSync(path.join(root, "js/telemetry.js"), "utf8"), ctx);
const Telemetry = ctx.window.Telemetry;
vm.runInContext(fs.readFileSync(path.join(root, "js/progress.js"), "utf8"), ctx);
const Progress = ctx.window.Progress;
assert(Progress && Progress.renderFinds && Progress.activityTotals, "progress.js should expose kid-safe render helpers");
assert(Telemetry, "Telemetry failed to load");
Telemetry.track("work_add", { classId: "english-10", assignmentId: "eng-names", termId: "2025-26-s1" });
assert(typeof Telemetry.queuedCount === "function");
assert(!Telemetry.connected() || store["bw-telemetry"], "telemetry config lives in localStorage");

let classFamily = Game.emptyFamily();
classFamily = Game.addProgressClass(classFamily, "Study hall", progress);
const overlayClasses = Game.applyProgressOverlay(progress, classFamily).classes;
assert(overlayClasses.some((cls) => cls.id === "chemistry" && cls.items.length === 0), "overlay keeps empty Chemistry");
assert(overlayClasses.some((cls) => cls.name === "Study hall" && (!cls.items || !cls.items.length) && !cls.grade), "parent-added class has no fake work or grade");
assert(classFamily.overlay.progress.addedClasses.some((cls) => cls.name === "Study hall"), "added class exports in the family overlay");

const funLib = Game.normalizeLibrary({
  items: [
    { id: "random", label: "Random", kind: "audio", character: "fun", filename: "random.mp3", device: true },
    { id: "honk", label: "Honk", kind: "audio", character: "fun", synth: "honk" }
  ]
});
assert(Game.emptyFamily().soundCues && typeof Game.emptyFamily().soundCues === "object");
assert(Game.SOUND_CUES.some((c) => c.id === "work-start"), "I started this cue should exist");
assert(Game.SOUND_CUES.some((c) => c.id === "work-done"), "Done cue should exist");
assert(Game.SOUND_CUES.some((c) => c.id === "tables" && c.label === "The table is clicked"), "table click cue should exist");
const tableCue = Game.setSoundCue(Game.emptyFamily(), "tables", "honk");
assert(Game.playSoundCue(tableCue, funLib, "tables"), "The table is clicked should play");
assert.strictEqual(Game.workActionCueIds("a1", "started").specific, "work:a1");
assert.strictEqual(Game.workActionCueIds("a1", "started").fallback, "work-start");
assert.strictEqual(Game.workActionCueIds("a1", "done").specific, "work-done:a1");
assert.strictEqual(Game.workActionCueIds("a1", "done").fallback, "work-done");
const startRows = Game.soundCueRows({ work: [{ id: "a1", title: "English 10: Finish summer comic strips" }], events: [] });
assert(startRows.some((row) => row.id === "work:a1" && /I started this/.test(row.label)), "assignment start row should match the week-card button");
assert(startRows.some((row) => row.id === "work-done:a1" && /^Done · /.test(row.label)), "assignment done row should exist");
const doneCue = Game.setSoundCue(Game.emptyFamily(), "work-done", "honk");
assert(Game.playWorkActionCue(doneCue, funLib, "a1", "done"), "Done is clicked should play when marking work complete");
const startCue = Game.setSoundCue(Game.emptyFamily(), "work:a1", "honk");
assert(Game.playWorkActionCue(startCue, funLib, "a1", "started"), "assignment Start clip should play on I started this");
assert(!Game.playWorkActionCue(startCue, funLib, "a1", "done"), "a Start clip must not play on Done");
assert(Game.SOUND_CUES[0].id === "undo", "Undo should be first in the Admin moment list");
assert(Game.isUndoControl({
  classList: { contains(name) { return name === "undo-mini"; } },
  getAttribute() { return ""; },
  textContent: "Undo",
  closest() { return this; }
}), "started/done Undo should count");
assert(Game.isUndoControl({
  classList: { contains() { return false; } },
  getAttribute(name) { return name === "data-revoke" ? "test-ace" : ""; },
  textContent: "Undo award",
  closest() { return this; }
}), "Undo award should count");
assert(!Game.isUndoControl({
  classList: { contains() { return false; } },
  getAttribute() { return null; },
  textContent: "I started this",
  closest() { return this; }
}), "Started should not play the undo cue");
assert(Game.SOUND_CUES.some((c) => c.id === "egg-end"), "egg-end cue should exist");
assert(Game.SOUND_CUES.some((c) => c.id === "egg-win"), "egg-win cue should exist");
assert(Game.SOUND_CUES.some((c) => c.id === "egg-closed"), "egg-closed cue should exist");
assert.strictEqual(Game.RANDOM_CUE, "__random__");
const cued = Game.setSoundCue(Game.emptyFamily(), "egg-end", "honk");
assert.strictEqual(cued.soundCues["egg-end"], "honk");
assert.strictEqual(Game.cueLibraryItem(cued, funLib, "egg-end").id, "honk");
assert.strictEqual(Game.playSoundCue(Game.emptyFamily(), funLib, "missing-cue"), false);
assert(Game.audioLibraryItems(funLib).some((item) => item.id === "honk"));
assert(Game.playRandomLibraryItem(funLib), "random clip should pick an audio item");
const shuffled = Game.setSoundCue(Game.emptyFamily(), "egg-end", Game.RANDOM_CUE);
assert.strictEqual(shuffled.soundCues["egg-end"], Game.RANDOM_CUE);
assert.strictEqual(Game.cueSoundLabel(shuffled, funLib, "egg-end"), "Shuffle — any library clip");
assert(!Game.cueLibraryItem(shuffled, funLib, "egg-end"), "shuffle is not a library file");
assert(Game.playSoundCue(shuffled, funLib, "egg-end"), "shuffle cue should pick a clip");
const libWithRandom = funLib;
const namedRandom = Game.setSoundCue(Game.emptyFamily(), "egg-end", "random");
const resolved = Game.resolveCuePlay(namedRandom, libWithRandom, "egg-end");
assert.strictEqual(resolved.item && resolved.item.id, "random", "a clip named Random is that file, not a shuffle");
assert.strictEqual(Game.cueSoundLabel(namedRandom, libWithRandom, "egg-end"), "Random");
const cleared = Game.setSoundCue(cued, "egg-end", "");
assert(!cleared.soundCues["egg-end"], "clearing a cue should drop it");
const listed = Game.assignedCueRows(Game.setSoundCue(Game.emptyFamily(), "undo", "honk"), { work: [], events: [] });
assert(listed.some((row) => row.id === "undo" && row.soundId === "honk" && /Undo/i.test(row.label)), "saved cue list should include Undo");
assert(!Game.assignedCueRows(Game.emptyFamily(), { work: [], events: [] }).length, "empty family has no saved sounds");
assert.strictEqual(Game.inferKind("img/library/foo.mp3", "", ""), "audio");
assert.strictEqual(Game.labelFromFilename("my-cool_honk.mp3"), "My Cool Honk");
assert.strictEqual(Game.labelFromFilename("TEST-beep.wav"), "TEST Beep");
assert.strictEqual(Game.fileBasename("audio/holdthatdoor.mp3"), "holdthatdoor.mp3");
assert.strictEqual(Game.labelsFromManifest([{ file: "holdthatdoor.mp3", label: "Hold that door" }])["holdthatdoor.mp3"], "Hold that door");
assert(Game.isSkippedDeviceSound("jackoff.mp3"), "school-skip list should catch jackoff");
assert(!Game.isSkippedDeviceSound("holdthatdoor.mp3"), "school-skip list should keep holdthatdoor");
assert.strictEqual(Game.kindFromFile({ name: "clip.MP3", type: "" }), "audio");
assert.strictEqual(Game.kindFromFile({ name: "pic.PNG", type: "image/png" }), "image");
assert.strictEqual(Game.kindFromFile({ name: "movie.webm", type: "" }), "video");
assert.strictEqual(Game.kindFromFile({ name: "notes.txt", type: "text/plain" }), "");
assert.strictEqual(Game.PACK_BLOB_MAX, 2 * 1024 * 1024);
assert.strictEqual(Game.youtubeId("https://www.youtube.com/watch?v=dQw4w9wgGcI"), "dQw4w9wgGcI");
assert.strictEqual(Game.youtubeId("https://youtu.be/dQw4w9wgGcI"), "dQw4w9wgGcI");
assert(Game.youtubeEmbedSrc("https://youtu.be/dQw4w9wgGcI").startsWith("https://www.youtube-nocookie.com/embed/"));
assert.strictEqual(Game.youtubeEmbedSrc("https://evil.example/embed/nope"), "");
assert(Game.isSafeHttpUrl("https://example.com/a.mp3"));
assert(!Game.isSafeHttpUrl("javascript:alert(1)"));

const dropped = Game.normalizeLibrary({
  items: [{
    id: "drop-beep",
    label: "Test Beep",
    kind: "audio",
    character: "fun",
    device: true,
    filename: "TEST-beep.wav",
    test: true
  }]
});
assert(dropped.items.some((item) => item.id === "drop-beep" && item.device && item.character === "fun"));
assert(Game.libraryFor(dropped, "fun", false).some((item) => item.id === "drop-beep"), "Fun shelf should see dropped audio");
assert(Game.contentLibraryItems(dropped).some((item) => item.id === "drop-beep"), "attach picker should see dropped audio");

const dirty = Game.normalizeLibrary({
  items: [{
    id: "blob-url",
    label: "Nope",
    kind: "audio",
    character: "fun",
    device: true,
    url: "blob:http://localhost/1",
    path: "data:audio/wav;base64,AA=="
  }]
});
assert.strictEqual(dirty.items[0].url, "");
assert.strictEqual(dirty.items[0].path, "");
assert(dirty.items[0].device);

const roster = Game.defaultCharacters();
assert.strictEqual(roster.comicStartsAfter, 3, "comicStartsAfter stays 3");
const rosterIds = (roster.characters || []).map((ch) => String(ch.id));
assert.strictEqual(rosterIds.join(","), "ace,riff,scorch,deuce,fuzz,bennett", "roster appends Bennett after the five teammates");
assert(Game.LIBRARY_GROUPS.indexOf("deuce") >= 0 && Game.LIBRARY_GROUPS.indexOf("fuzz") >= 0, "library groups include Deuce and Fuzz shelves");
assert(Game.LIBRARY_GROUPS.indexOf("bennett") > Game.LIBRARY_GROUPS.indexOf("fuzz"), "Bennett shelf sits after the animal teammates");
assert(Game.LIBRARY_GROUPS.indexOf("fun") > Game.LIBRARY_GROUPS.indexOf("fuzz"), "Deuce/Fuzz shelves sit with characters, not Fun");
assert.strictEqual((Game.TEAMMATE_IDS || []).join(","), "ace,riff,scorch,deuce,fuzz", "comic unlock still counts the five teammates");
const bennett = (roster.characters || []).find((ch) => ch.id === "bennett");
assert(bennett && bennett.talent === "The Show-Up" && bennett.tagline === "I'm in.", "Bennett locker copy stays locked");
assert(bennett.video === "img/characters/bennett.mp4" && bennett.poster === "img/characters/bennett.jpg", "Bennett uses the committed locker media");
assert(Game.GEAR_SLOTS && Game.GEAR_SLOTS.indexOf("outfit") >= 0 && Game.GEAR_SLOTS.indexOf("tool") >= 0, "gear slots include outfit");
const seededLib = Game.normalizeLibrary(library);
gearSeed.forEach((row) => {
  const item = Game.libraryItem(seededLib, row.id);
  assert(item && item.slot === row.slot, row.id + " should keep slot after normalize");
  assert(Game.libraryFor(seededLib, row.character, false).some((it) => it.id === row.id), row.id + " should appear on the " + row.character + " shelf");
});
assert.strictEqual(Game.gearLibraryItems(seededLib).length, 6, "Gear group should list the six stills");
assert(Game.gearThumbHtml(seededLib, "angle-finder").indexOf("img/library/angle-finder.png") >= 0, "loadout thumb should use the Angle Finder png");
assert(Game.defaultLibrary().items.some((item) => item.id === "angle-finder" && item.slot === "tool"), "file:// default library includes Angle Finder");
fightSeed.forEach((row) => {
  assert(Game.defaultLibrary().items.some((item) => item.id === row.id && item.slot === "content" && item.kind === "video"), "file:// default library includes " + row.id);
});
assert(Game.defaultLibrary().items.some((item) => item.id === "scorch-spider-beam" && item.kind === "image"), "file:// default library includes the Scorch beam still");
trophyStills.forEach((row) => {
  assert(Game.defaultLibrary().items.some((item) => item.id === row.id && item.character === "crew" && item.kind === "image"), "file:// default library includes " + row.id);
});
assert.strictEqual(Game.LIBRARY_GROUPS.indexOf("room"), -1, "do not add a Room library group — trophy stills sit on Crew");
const aceOnlyDraft = Game.normalizeLibrary({
  items: [
    { id: "ace-clip", label: "Ace locker clip", path: "img/characters/ace.mp4", poster: "img/characters/ace.jpg", kind: "video", character: "ace" },
    { id: "ace-poster", label: "Ace poster", path: "img/characters/ace.jpg", kind: "image", character: "ace" },
    { id: "ace-frog", label: "Old frog", path: "img/wrong/ace-frog.mp4", poster: "", kind: "video", character: "fun", slot: "" },
    { id: "orin-honk", label: "Orin Honk", kind: "audio", character: "fun", device: true, filename: "orin-honk.mp3" }
  ]
});
const mergedDraft = Game.mergeLibrary(library, aceOnlyDraft);
assert(mergedDraft.items.some((item) => item.id === "ace-frog" && item.slot === "content" && item.path === "img/library/ace-frog.mp4" && item.character === "ace"), "merge should restore Frog Serve from the shipped catalog");
assert(mergedDraft.items.some((item) => item.id === "riff-clip" && item.path === "img/characters/riff.mp4"), "merge should restore Riff locker clip");
assert(mergedDraft.items.some((item) => item.id === "field-kit" && item.slot === "tool" && item.path === "img/library/field-kit.png"), "merge should restore Field Kit");
assert(mergedDraft.items.some((item) => item.id === "orin-honk" && item.device && item.character === "fun"), "merge should keep device Fun/Sounds audio");
["ace", "riff", "scorch", "deuce", "fuzz", "bennett"].forEach((id) => {
  const clip = Game.libraryItem(mergedDraft, id + "-clip");
  const poster = Game.libraryItem(mergedDraft, id + "-poster");
  assert(clip && clip.path === "img/characters/" + id + ".mp4", id + " locker clip path stays put after merge");
  assert(poster && poster.path === "img/characters/" + id + ".jpg", id + " locker still path stays put after merge");
});
Game.saveMomLibrary(mergedDraft);
const persisted = Game.getMomLibrary();
assert(persisted.items.some((item) => item.id === "ace-frog"), "merged library should persist for Admin and Characters");
assert(persisted.items.some((item) => item.id === "orin-honk" && item.device), "persisted merge should keep device audio");
assert.strictEqual(Game.CONTENT_SLOT, "content", "content slot constant");
assert(Game.isGatedLibraryItem({ kind: "audio", character: "ace" }), "audio stays gated");
assert(Game.isGatedLibraryItem({ kind: "link", character: "crew" }), "links stay gated");
assert(Game.isGatedLibraryItem({ kind: "video", character: "fun" }), "fun clips stay gated");
assert(!Game.isGatedLibraryItem({ kind: "video", character: "ace" }), "character locker videos stay free");
assert(Game.isGatedLibraryItem({ kind: "video", character: "ace", slot: "content" }), "content-slot videos are gated");
fightSeed.forEach((row) => {
  const item = Game.libraryItem(seededLib, row.id);
  assert(item && item.slot === "content", row.id + " should keep content slot after normalize");
  assert(Game.contentLibraryItems(seededLib).some((it) => it.id === row.id), row.id + " should be gated content");
  assert(!Game.canPlayLibraryItem(item), row.id + " should stay locked until awarded");
  assert(Game.canPlayLibraryItem(item, true), row.id + " should play in parent preview");
});
assert(Game.canPlayLibraryItem(Game.libraryItem(seededLib, "ace-clip")), "Ace locker clip stays playable");
assert(Game.canPlayLibraryItem(Game.libraryItem(seededLib, "scorch-spider-beam")), "beam still is extra library art, not a gated locker replacement");
assert(!Game.contentLibraryItems(seededLib).some((it) => it.id === "ace-clip"), "locker clips are not gated content");
assert(Game.contentLibraryItems(mergedDraft).some((it) => it.id === "ace-frog"), "fight clips stay parent-awardable after merge");
assert(!Game.canPlayLibraryItem(Game.libraryItem(mergedDraft, "ace-frog")), "Frog Serve stays locked until awarded after merge");
assert(Game.canPlayLibraryItem(Game.libraryItem(mergedDraft, "ace-clip")), "Ace locker clip stays playable after merge");
assert(adminJs.includes("reloadShippedLibrary"), "Admin reload should re-run the shipped merge");
assert(!/reload-shipped[\s\S]{0,500}clear(MomLibrary|LibraryBlobs)/.test(adminJs), "Reload shipped files must not wipe Fun/Sounds blobs");
assert(/if \(id === "fun"\) return count <= 8;/.test(adminJs) && /return true;/.test(adminJs), "character / gear / crew shelves default open");
assert(adminJs.includes("GROUPS.filter((g) => g.id !== \"fun\" && g.id !== \"crew\")"), "empty character shelves still render");

const pack = {
  currency: achievements.currency,
  achievements: (achievements.achievements || []).concat([{
    id: "test-fun-honk",
    title: "Honk",
    rewardUnlock: { type: "content", id: "honk", label: "Honk" },
    streak: { target: 1, unit: "time" }
  }])
};
let family = Game.emptyFamily();
const awardedDeuce = Game.awardStreak(pack, family, "test-deuce-return");
assert(awardedDeuce.freshCharacter, "awarding Meet Deuce should unlock Deuce");
assert(Game.alreadyUnlockedCharacter("deuce"), "Deuce unlock should persist");
family = awardedDeuce.family;
const awardedFuzz = Game.awardStreak(pack, family, "test-fuzz-unplugged");
assert(awardedFuzz.freshCharacter, "awarding Meet Fuzz should unlock Fuzz");
assert(Game.alreadyUnlockedCharacter("fuzz"), "Fuzz unlock should persist");
family = awardedFuzz.family;

const awardedAngle = Game.awardStreak(pack, family, "test-angle-finder");
assert(awardedAngle.freshGear, "awarding Angle Finder should unlock gear");
assert(Game.alreadyUnlockedGear("angle-finder"), "Angle Finder unlock should persist");
family = awardedAngle.family;
assert(family.gearUnlocks["angle-finder"], "family pack should carry the Angle Finder unlock");
["test-field-kit", "test-unplugged-strap", "test-daily-pick"].forEach((id) => {
  const next = Game.awardStreak(pack, family, id);
  assert(next.freshGear, "awarding " + id + " should unlock gear");
  family = next.family;
});
assert(Game.alreadyUnlockedGear("field-kit") && Game.alreadyUnlockedGear("unplugged-strap") && Game.alreadyUnlockedGear("daily-pick"), "Parent desk gear awards should persist");
const awardedNotebook = Game.awardStreak(pack, family, "test-notebook-holding");
assert(awardedNotebook.freshGear, "Notebook of Holding should still grant a tool");
family = awardedNotebook.family;

const awarded = Game.awardStreak(pack, family, "test-fun-honk");
assert(awarded.freshContent, "awarding a content streak should unlock content");
assert(Game.alreadyUnlockedContent("honk"), "content unlock should persist");
family = awarded.family;
assert(family.contentUnlocks.honk, "family pack should carry the content unlock");
fightSeed.forEach((row) => {
  const next = Game.awardStreak(pack, family, row.ach);
  assert(next.freshContent, "awarding " + row.ach + " should unlock content");
  assert(Game.alreadyUnlockedContent(row.id), row.id + " unlock should persist");
  assert(Game.canPlayLibraryItem(Game.libraryItem(seededLib, row.id)), row.id + " should play after award");
  family = next.family;
  assert(family.contentUnlocks[row.id], "family pack should carry " + row.id);
});

const norm = Game.normalizeLibrary(library);
const exported = Game.exportPack(pack, family, Game.defaultCharacters(), funLib);
assert.strictEqual(exported.version, 7);
assert(exported.libraryBlobs && typeof exported.libraryBlobs === "object");
assert(exported.contentUnlocks.honk, "export should include content unlocks");
assert(exported.gearUnlocks["angle-finder"], "export should include gear unlocks");
const exportedGear = Game.exportPack(pack, family, Game.defaultCharacters(), seededLib);
assert(exportedGear.library.items.some((item) => item.id === "angle-finder" && item.path === "img/library/angle-finder.png"), "family pack library should keep the gear still");
assert(exported.library.items.some((item) => item.id === "honk" && item.kind === "audio"));
assert(!banned.test(JSON.stringify(exported)), "family pack seed must not invent ITYSL lines");

const revoked = Game.revokeAchievement(pack, family, "test-fun-honk");
assert(revoked.revokedContent, "undo award should lock the sound again");
assert(!Game.alreadyUnlockedContent("honk"), "content should be locked after undo");

assert(/Unlock all rewards \(preview\)/.test(parentHtml), "parent desk should offer Unlock all rewards (preview)");
assert(/Lock them back/.test(parentHtml), "parent desk should offer Lock them back");
assert(/preview-unlock-all/.test(parentHtml) && /preview-lock-back/.test(parentHtml), "preview buttons need ids");
const weekJs = fs.readFileSync(path.join(root, "js/week.js"), "utf8");
assert(/playWorkActionCue/.test(weekJs) && /act === "started"/.test(weekJs) && /act === "done"/.test(weekJs), "week cards should play start and done cues");
assert(!/dataset\.act === "start"/.test(weekJs), "start sound must not listen for data-act=start (the button is started)");
assert(/Here's the deal/.test(weekJs) && /Start here/.test(weekJs), "A little help should be deal + first move");
assert(!/data-mode="notecards"/.test(weekJs), "A little help should not open on notecard tabs");
assert(/Talk it through/.test(weekJs), "A little help should offer Talk it through, not a study-tool menu");
assert(/help-thinking/.test(weekJs) && /Looking at the assignment/.test(weekJs) && /Pulling a hint/.test(weekJs) && /Mentor is thinking/.test(weekJs), "A little help should show a changing thinking status before the reply");
assert(/HELP_THINK_MS = 700/.test(weekJs) && /help-dots/.test(weekJs), "A little help should hold thinking for at least 700ms with dots");
assert(/Couldn’t reach the mentor/.test(weekJs), "A little help should say so when the mentor is offline");
const askJs = fs.readFileSync(path.join(root, "js/ask.js"), "utf8");
assert(/ask-bubble mentor thinking/.test(askJs) && /Thinking…/.test(askJs), "Ask AI should paint a thinking bubble before the reply");
assert(/700/.test(askJs) && /ask-send/.test(askJs) && /disabled = true/.test(askJs), "Ask AI should disable send and hold thinking if the fallback is instant");
assert(/do not do the assignment/i.test(tutorJs), "live A little help should use a Socratic first-move prompt");
const crewJs = fs.readFileSync(path.join(root, "js/characters.js"), "utf8");
const parentJs = fs.readFileSync(path.join(root, "js/parent.js"), "utf8");
assert(weekJs.includes('"bennett"') && weekJs.includes("CREW_ORDER") && weekJs.includes("renderPortraitRail"), "window portrait rail should include bennett");
assert(crewJs.includes("markOpened") && crewJs.includes("maybeAwardSignIn"), "Characters page should sign in and award Bennett");
assert(crewJs.includes("<h3>Locked</h3>") && crewJs.includes("char-sil"), "locked crew are nameless silhouettes");
assert(weekJs.includes("maybeAwardSignIn"), "lobby should award Bennett on first open");
assert(/Unlocked by sign-in/.test(parentJs) && /Unlocks the first time he opens the site/.test(parentJs), "parent desk should label Bennett as unlocked-by-sign-in");
const weekHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const themeCss = fs.readFileSync(path.join(root, "css/theme.css"), "utf8");
assert(/admin-tabs/.test(themeCss) && /admin-tab\.on/.test(themeCss) && /body\.admin-page \.usage-panel h2/.test(themeCss), "Admin cards need selected tabs and distinct headers");
assert(/\.site-view-btn/.test(themeCss) && /\.site-view-seg/.test(themeCss), "theme should style the preview switch");
assert(/\.site-view-btn[\s\S]{0,220}cursor:\s*pointer/.test(themeCss), "preview switch must show a pointer cursor");
assert(/#ffe08a|#f3c34a/.test(themeCss), "selected preview segment is filled gold");
assert(/\.help-thinking/.test(themeCss) && /\.ask-bubble\.thinking/.test(themeCss), "theme should style help and Ask AI thinking states");
assert(/help-dot-bounce/.test(themeCss), "thinking dots need a bounce animation");
["trophy-room.jpg", "trophy-pedestal.jpg", "trophy-cubbies.jpg", "trophy-pegboard.jpg", "trophy-lockers.jpg", "trophy-window.jpg"].forEach((name) => {
  const pathName = "img/library/" + name;
  assert(weekJs.includes(pathName) || weekHtml.includes(pathName) || themeCss.includes(pathName), "trophy room should use " + name);
});
assert(!/id="shelf-title"/.test(weekHtml) && !/id="shelf-manage"/.test(weekHtml), "Bennett's treehouse should not have a Trophy room header or Manage");
assert(!/id="trophy-rail"/.test(weekHtml) && !/id="trophy-manage"/.test(weekHtml), "Bennett's treehouse should not have a labeled rail or card grid");
assert(/id="trophy-leave"/.test(weekHtml) && /id="trophy-look-wide"/.test(weekHtml), "treehouse needs a full-room look layer and a leave control");
assert(/theme\.css\?v=68/.test(weekHtml) && /week\.js\?v=68/.test(weekHtml) && /game\.js\?v=68/.test(weekHtml) && /telemetry\.js\?v=68/.test(weekHtml), "index should cache-bust css/js");
assert(/progress\.js\?v=68/.test(fs.readFileSync(path.join(root, "progress.html"), "utf8")), "progress should cache-bust js");
assert(/Back to the treehouse/.test(weekJs), "zoomed X should say Back to the treehouse");
assert(/id="trophy-back"/.test(weekHtml) && /Back to treehouse/.test(weekHtml), "zoomed room needs a text Back to treehouse control");
assert(/Tap a lantern/.test(weekHtml), "first enter should hint to tap a lantern");
const leaveClick = weekJs.slice(weekJs.indexOf('getElementById("trophy-leave").addEventListener("click"'));
assert(leaveClick.includes("leaveTrophyZone") && leaveClick.includes("closeShelf"), "X should return to the treehouse when zoomed, and leave only from the wide room");
const endStart = weekJs.indexOf("const endStageDrag");
assert(endStart >= 0, "endStageDrag should exist");
const endStage = weekJs.slice(endStart, weekJs.indexOf("window.addEventListener(\"pointermove\"", endStart));
assert(!endStage.includes("leaveTrophyZone"), "a closeup tap or swipe must not leave the zoom");
assert(!endStage.includes("closeShelf"), "a closeup tap must never close the shelf");
assert(weekJs.includes('getElementById("trophy-back")') && weekJs.includes("leaveTrophyZone()"), "Back from a zone should leave the closeup");
const leaveFn = weekJs.slice(weekJs.indexOf("function leaveTrophyZone"), weekJs.indexOf("function resetTrophyView"));
assert(leaveFn.includes('trophyZone = ""') && !leaveFn.includes("closeShelf") && !leaveFn.includes('classList.remove("open")'), "Back from a zone must leave trophyZone and keep the shelf open");
assert(weekJs.includes('playSoundCue(family, library, "tables")'), "pedestal/table clicks should play the tables cue");
assert(/enterTrophyZone[\s\S]{0,180}pedestal[\s\S]{0,80}playTableCue/.test(weekJs) || /if \(id === "pedestal"\) playTableCue/.test(weekJs), "entering the pedestal should play the table cue");
assert(/zoneAtStart === "pedestal"/.test(weekJs) && /playTableCue/.test(weekJs), "pedestal closeup still clicks should play the table cue");
["ace", "riff", "scorch", "deuce", "fuzz", "bennett"].forEach((id) => {
  assert(fs.existsSync(path.join(root, "img/characters/" + id + ".png")), id + " cutout png should stay on disk");
  assert(fs.existsSync(path.join(root, "img/characters/" + id + ".jpg")), id + " locker jpg should stay on disk");
  assert(refsHtml.includes("img/characters/" + id + ".jpg"), id + " locker still should stay on refs.html");
});
assert(!weekJs.includes("WINDOW_SLOTS"), "dead window overlay slots should be gone");
assert(!weekJs.includes("trophy-alcove"), "window closeup should not place an alcove ghost");
assert(!weekJs.includes('return "img/characters/" + crewId + ".png"'), "window wall should not composite png cutouts");
assert(weekJs.includes('img/characters/" + id + ".jpg"'), "crew portraits should use locker jpgs");
assert(/id="trophy-portrait-rail"/.test(weekHtml), "window closeup needs a portrait rail under the still");
function cssRule(css, selector) {
  const start = css.indexOf(selector);
  assert(start >= 0, "css should include " + selector);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open, close + 1);
}
assert(!themeCss.includes(".trophy-object.trophy-character img"), "theme should not style standing character cutouts");
assert(!themeCss.includes(".trophy-object.trophy-alcove img"), "theme should not style an alcove ghost");
[".trophy-portrait-rail", ".trophy-portrait-shelf", ".trophy-portrait-frame", ".trophy-portrait-empty", ".trophy-portrait-name"].forEach((sel) => {
  assert(themeCss.includes(sel), "css should include " + sel);
});
const silRule = cssRule(themeCss, ".char-sil");
assert(/brightness\(\s*0\s*\)/.test(silRule) && /contrast\(/.test(silRule), ".char-sil silhouette CSS exists");
const frameRule = cssRule(themeCss, ".trophy-portrait-frame");
assert(/linear-gradient/.test(frameRule), "portrait frames should use a wood/gold frame");
const posterRule = cssRule(themeCss, ".trophy-portrait-frame img");
assert(/object-fit:\s*cover/.test(posterRule), "framed locker stills should cover the mat");
assert(!/trophyManage/.test(weekJs), "week.js should not keep a manage mode in Bennett's room");
assert(/trophy-plaque/.test(weekJs) && /prefersReducedMotion/.test(weekJs), "walk-up objects should open a plaque and respect reduced motion");
assert(/id="trophy-walkup"/.test(weekHtml) && /data-zone="window"/.test(weekHtml) && /data-zone="lockers"/.test(weekHtml), "wide room needs five walk-up lantern plaques");
const lanternRule = cssRule(themeCss, ".trophy-lantern {");
assert(/cursor:\s*pointer/.test(lanternRule), "lanterns must show a pointer cursor");
const trophiesRule = cssRule(themeCss, ".trophies,");
assert(/cursor:\s*pointer/.test(trophiesRule), "trophy chip must show a pointer cursor");
assert(/#trophies[\s\S]{0,280}cursor:\s*pointer\s*!important/.test(themeCss) || /\.trophies,[\s\S]{0,220}#trophies[\s\S]{0,220}cursor:\s*pointer\s*!important/.test(themeCss), "trophy chip pointer must beat stage grab");
assert(/#ffe08a|#f3c34a|#f4d35e/.test(lanternRule), "lanterns need a stronger gold fill");
assert(themeCss.includes(".trophy-lantern:hover") && themeCss.includes(".trophy-lantern:active"), "lanterns need hover and press states");
assert(weekJs.includes("zoneFromStagePoint") && weekJs.includes("getBoundingClientRect()"), "a tap on the still must walk up from the stage viewport");
assert(weekJs.includes("walkUpFromControl") && /enterTrophyZone\(btn\.dataset\.zone\)/.test(weekJs), "walk-up plaques must call enterTrophyZone");
assert(!/setPointerCapture/.test(weekJs) && !weekJs.includes("hotspotFromEvent") && !weekJs.includes("elementFromPoint"), "trophy room must not capture the pointer or hit-test the look-layer glows");
assert(weekJs.includes("siteViewHidesAdult()") && weekJs.includes("data-add-work"), "week cards hide add-work and undo in kid view");
assert(!weekJs.includes("maybeAutoPreviewAll"), "This Week must not auto-preview into Bennett's locker");
assert(!crewJs.includes("maybeAutoPreviewAll"), "Characters must not auto-preview on boot");
assert(parentJs.includes("awardAllPreview") && parentJs.includes("siteViewHidesAdult"), "parent desk Unlock all stays on Me and ignores kid view");
assert(!/e\.pointerType !== "mouse"/.test(weekJs), "hover mouse-look should not pan the hotspot layer");
assert(/id="trophy-order-list"/.test(parentHtml), "parent desk should keep trophy drag-reorder");
assert(/theme\.css\?v=/.test(parentHtml) && /parent\.js\?v=/.test(parentHtml), "parent desk should cache-bust css/js");
assert(crewJs.includes("gearThumbHtml") && crewJs.includes("alreadyUnlockedGear"), "loadout should use real gear stills when unlocked");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
const previewFamily = Game.emptyFamily();
const auto = Game.maybeAutoPreviewAll(pack, previewFamily);
assert(auto.ran, "first load with no crew/gear should auto-preview once");
assert(Game.alreadyUnlockedCharacter("ace") && Game.alreadyUnlockedCharacter("fuzz"), "preview should unlock the crew");
assert(Game.alreadyUnlockedCharacter("bennett") && Game.alreadyUnlocked("signin-bennett"), "preview / Unlock all should include Signed in → Bennett");
assert(Game.alreadyUnlockedGear("angle-finder") && Game.alreadyUnlockedGear("unplugged-strap") && Game.alreadyUnlockedGear("first-serve"), "preview should unlock gear");
assert(Game.alreadyUnlocked("straight-as-3w") && Game.alreadyUnlocked("hidden-banana"), "preview should award the other streaks");
assert(Game.alreadyUnlockedContent("ace-frog") && Game.alreadyUnlockedContent("riff-bird") && Game.alreadyUnlockedContent("scorch-spider"), "preview / Unlock all should award the fight clips");
assert.strictEqual(localStorage.getItem("bw-preview-all"), "1", "auto-preview should set bw-preview-all");
assert(!localStorage.getItem("bw-preview-locked"), "auto-preview should not lock rewards");
const afterAce = Game.revokeAchievement(pack, auto.family, "test-ace-closer");
assert(!Game.alreadyUnlockedCharacter("ace"), "undoing Meet Ace should lock Ace");
const gap = Game.maybeAutoPreviewAll(pack, afterAce.family);
assert(!gap.ran, "later boots should gap-fill quietly");
assert(Game.alreadyUnlockedCharacter("ace"), "gap-fill should restore missing preview crew");
const locked = Game.revokeAllPreview(pack, gap.family);
assert(!Game.alreadyUnlockedCharacter("ace") && !Game.alreadyUnlockedGear("angle-finder"), "Lock them back should revoke preview awards");
assert(!Game.alreadyUnlockedContent("ace-frog") && !Game.alreadyUnlockedContent("riff-bird") && !Game.alreadyUnlockedContent("scorch-spider"), "Lock them back should revoke fight clips");
assert(!Game.alreadyUnlockedCharacter("bennett") && !Game.alreadyUnlocked("signin-bennett"), "Lock them back should revoke Bennett too");
assert.strictEqual(localStorage.getItem("bw-preview-all"), "1", "lock-back keeps bw-preview-all so preview stays offered");
assert.strictEqual(localStorage.getItem("bw-preview-locked"), "1", "lock-back sets bw-preview-locked");
const again = Game.maybeAutoPreviewAll(pack, locked.family);
assert(!again.ran, "auto-preview must not run again after lock-back");
assert(!Game.alreadyUnlockedCharacter("ace"), "crew stays locked until a parent unlocks preview again");
const manual = Game.awardAllPreview(pack, locked.family);
assert(manual.awarded > 0 && Game.alreadyUnlockedCharacter("deuce") && Game.alreadyUnlockedGear("daily-pick"), "parent Unlock all should award through awardStreak again");
assert(Game.alreadyUnlockedCharacter("bennett"), "Unlock all should re-award Bennett");
assert(!localStorage.getItem("bw-preview-locked"), "Unlock all should clear bw-preview-locked");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
let signFamily = Game.emptyFamily();
const signin = Game.maybeAwardSignIn(pack, signFamily);
assert(signin.awarded && signin.freshCharacter, "first sign-in should award Signed in and unlock Bennett");
assert(Game.alreadyUnlockedCharacter("bennett") && Game.alreadyUnlocked("signin-bennett"), "sign-in unlock should persist");
signFamily = signin.family;
const signinAgain = Game.maybeAwardSignIn(pack, signFamily);
assert(!signinAgain.awarded && !signinAgain.freshCharacter, "later opens should not re-award Bennett");
Game.markCharacterUnlocked("ace");
Game.markCharacterUnlocked("riff");
assert(!Game.comicUnlocked(roster), "Bennett plus two teammates should not open Story");
Game.markCharacterUnlocked("scorch");
assert(Game.comicUnlocked(roster), "three teammates still open Story even with Bennett on the roster");
["ace", "riff", "scorch", "deuce", "fuzz"].forEach((id) => Game.revokeCharacterUnlock(id));
assert(!Game.comicUnlocked(roster), "Bennett alone does not count toward comicStartsAfter");
const undone = Game.revokeAchievement(pack, signFamily, "signin-bennett");
assert(undone.revokedCharacter && !Game.alreadyUnlockedCharacter("bennett"), "parent undo should lock Bennett");
const afterUndo = Game.maybeAwardSignIn(pack, undone.family);
assert(!afterUndo.awarded && !Game.alreadyUnlockedCharacter("bennett"), "sign-in must not re-award after a parent undo");
const reaward = Game.awardStreak(pack, undone.family, "test-bennett-showup");
assert(reaward.freshCharacter && Game.alreadyUnlockedCharacter("bennett"), "Meet Bennett TEST can re-award after undo");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
Game.markCharacterUnlocked("bennett");
const previewAfterBennett = Game.maybeAutoPreviewAll(pack, Game.emptyFamily());
assert(previewAfterBennett.ran, "Bennett-only unlock should not block auto-preview of the crew");
assert(Game.alreadyUnlockedCharacter("ace"), "auto-preview still unlocks teammates after Bennett signed in");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
Game.markCharacterUnlocked("bennett");
localStorage.setItem("bw-preview-all", "1");
const orinGap = Game.maybeAutoPreviewAll(pack, Game.emptyFamily());
assert(!orinGap.ran, "a device that already saw preview should gap-fill without fanfare");
assert(Game.alreadyUnlockedCharacter("ace") && Game.alreadyUnlockedCharacter("riff") && Game.alreadyUnlockedCharacter("scorch"), "Orin-style preview-all + Bennett should still unlock the crew");
assert(Game.alreadyUnlockedCharacter("deuce") && Game.alreadyUnlockedCharacter("fuzz") && Game.alreadyUnlockedCharacter("bennett"), "gap-fill should include Deuce, Fuzz, and Bennett");
assert(Game.alreadyUnlockedGear("angle-finder") && Game.alreadyUnlockedGear("field-kit") && Game.alreadyUnlockedGear("unplugged-strap"), "gap-fill should include Angle Finder, Field Kit, Unplugged Strap");
assert(Game.alreadyUnlockedGear("daily-pick") && Game.alreadyUnlockedGear("notebook-holding") && Game.alreadyUnlockedGear("first-serve"), "gap-fill should include Daily Pick, Notebook of Holding, First Serve");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
Game.setSiteView("bennett");
const kidNoop = Game.maybeAutoPreviewAll(pack, Game.emptyFamily());
assert(!kidNoop.ran && kidNoop.awarded === 0, "maybeAutoPreviewAll is a no-op in kid view");
assert(!Game.alreadyUnlockedCharacter("ace") && !Game.alreadyUnlockedGear("angle-finder") && !Game.alreadyUnlockedContent("ace-frog"), "kid boot must not dump preview awards");

Game.setSiteView("me");
["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
const previewDump = Game.awardAllPreview(pack, Game.emptyFamily());
assert(Game.alreadyUnlockedCharacter("ace") && Game.alreadyUnlockedGear("angle-finder") && Game.alreadyUnlockedContent("ace-frog"), "Me view still sees preview awards");
Game.setSiteView("bennett");
assert(!Game.alreadyUnlockedCharacter("ace"), "kid view + preview-all must not treat Ace as earned");
assert(!Game.hasEggGame(pack), "preview trophies do not unlock the egg game in kid view");
const previewBananaDump = Game.storedBananas();
assert(previewBananaDump > 100, "preview-all stores the parent banana dump");
assert.strictEqual(Game.getBananas(), Game.kidBananas(), "getBananas respects kid view");
assert(Game.kidBananas() < 40 && Game.kidBananas() < previewBananaDump, "kid view bananas are not the preview dump");
Progress.setState({
  pack,
  roster: Game.defaultCharacters(),
  family: previewDump.family,
  seed: { eggNames: Game.EGG_NAMES, classes: [], sampleOpens: [] },
  week: { work: [], events: [] }
});
const kidFinds = Progress.renderFinds(Progress.activityTotals([]));
assert(!/Undo award/.test(kidFinds), "kid view progress markup has no Undo award");
assert(!/>Edit</.test(kidFinds) && !/data-edit=/.test(kidFinds), "kid view progress markup has no Edit");
const kidClass = Progress.renderClass({
  id: "english-10",
  name: "English 10",
  items: [{ id: "eng-names", title: "Help me learn your names!", kind: "assignment" }]
}, false);
assert(!/Add assignment/.test(kidClass) && !/data-edit=/.test(kidClass) && !/data-del=/.test(kidClass), "kid view class cards hide mutate controls");
assert(!Game.alreadyUnlockedGear("angle-finder") && !Game.alreadyUnlockedGear("first-serve"), "kid view + preview-all must not treat gear as earned");
assert(!Game.alreadyUnlockedContent("ace-frog") && !Game.alreadyUnlockedContent("riff-bird") && !Game.alreadyUnlockedContent("scorch-spider"), "kid view + preview-all must not treat fight clips as earned");
assert(!Game.alreadyUnlockedCharacter("bennett") && !Game.alreadyUnlocked("signin-bennett"), "preview Bennett is not earned in kid view");
const kidSign = Game.maybeAwardSignIn(pack, previewDump.family);
assert(kidSign.awarded && kidSign.achievement, "maybeAwardSignIn in kid view awards Bennett even after preview");
assert(Game.alreadyUnlockedCharacter("bennett") && Game.alreadyUnlocked("signin-bennett"), "first Bennett login earns the avatar");
assert(!Game.alreadyUnlockedCharacter("ace") && !Game.alreadyUnlockedGear("angle-finder") && !Game.alreadyUnlockedContent("ace-frog"), "first login still leaves Ace/gear/fight clips locked");
const kidSignAgain = Game.maybeAwardSignIn(pack, kidSign.family);
assert(kidSignAgain.awarded && kidSignAgain.achievement, "welcome can still play until the clip marks it seen");
localStorage.setItem("bw-signin-seen", "1");
const afterWelcome = Game.maybeAwardSignIn(pack, kidSign.family);
assert(!afterWelcome.awarded, "welcome must not replay after the clip has been seen");

Game.setSiteView("me");
const meFinds = Progress.renderFinds({
  bananas: Game.getBananas(),
  trophies: (pack.achievements || []).filter((ach) => Game.alreadyUnlocked(ach.id)).slice(0, 1),
  eggs: [],
  mates: []
});
assert(/Undo award/.test(meFinds) && />Edit</.test(meFinds), "Me view progress still has Edit and Undo award");
["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
const parentAce = Game.awardStreak(pack, Game.emptyFamily(), "test-ace-closer");
Game.setSiteView("bennett");
assert(Game.alreadyUnlockedCharacter("ace"), "parent Award button unlocks should show in Bennett's treehouse");
Game.setSiteView("me");
assert(parentAce.freshCharacter, "Meet Ace Award is a real unlock");
localStorage.removeItem("bw-site-view");

assert.strictEqual(Game.siteView(), "me", "this laptop defaults to Me");
assert.strictEqual(Game.siteViewFromRole("bennett"), "bennett");
assert.strictEqual(Game.siteViewFromRole("parent"), "mom");
assert.strictEqual(Game.siteViewFromRole("orin"), "me");
assert.strictEqual(Game.siteViewFromRole(""), "me");
localStorage.removeItem("bw-site-view");
store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "bennett" });
assert.strictEqual(Game.siteView(), "bennett", "unset view + role bennett → siteView is bennett");
localStorage.removeItem("bw-site-view");
Telemetry.setConfig({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "parent" });
assert.strictEqual(Game.siteView(), "mom", "setConfig/connect save maps parent → mom");
assert.strictEqual(localStorage.getItem("bw-site-view"), "mom");
store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "orin" });
localStorage.removeItem("bw-site-view");
assert.strictEqual(Game.siteView(), "me", "orin role without a saved view stays Me");
assert(Game.audioAllowed(), "Me allows audio");
assert.strictEqual((Game.SITE_VIEWS || []).join(","), "me,bennett,mom");
assert(/data-site-view="me"/.test(Game.siteViewControlHtml()) && /data-site-view="bennett"/.test(Game.siteViewControlHtml()) && /data-site-view="mom"/.test(Game.siteViewControlHtml()), "view control has Me · Bennett · Mom");
assert(/setAttribute\("aria-label", "Preview as"\)/.test(fs.readFileSync(path.join(root, "js/game.js"), "utf8")), "preview switch is labeled Preview as, not a login");
assert(!Game.siteViewHidesAdult("me") && Game.siteViewHidesAdult("bennett") && Game.siteViewHidesAdult("mom"), "Bennett and Mom hide adult chrome");
assert(Game.shouldGateAdultPage("admin.html", "bennett") && Game.shouldGateAdultPage("parent.html", "mom") && Game.shouldGateAdultPage("refs.html", "bennett"), "kid views bounce adult desks");
assert(!Game.shouldGateAdultPage("index.html", "bennett") && !Game.shouldGateAdultPage("admin.html", "me"), "Me keeps Admin; kid views keep This Week");

function fakeEl(tag) {
  const el = {
    tagName: String(tag || "div").toUpperCase(),
    style: {},
    className: "",
    id: "",
    hidden: false,
    innerHTML: "",
    children: [],
    attrs: {},
    classList: {
      add(n) { el.className = (el.className + " " + n).trim(); },
      remove() {},
      contains(n) { return (" " + el.className + " ").indexOf(" " + n + " ") >= 0; },
      toggle(n, on) { if (on) this.add(n); }
    },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    removeChild(child) {
      this.children = this.children.filter((c) => c !== child);
      if (child) child.parentNode = null;
      return child;
    },
    querySelector(sel) {
      if (sel === ".site-view") return this.children.find((c) => c.className === "site-view") || null;
      return null;
    },
    querySelectorAll() { return []; },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
    setAttribute(name, value) {
      this.attrs[name] = String(value);
      if (name === "id") this.id = String(value);
      if (name === "class") this.className = String(value);
    },
    addEventListener() {},
    closest() { return null; }
  };
  return el;
}
const prevCreate = document.createElement;
const prevAll = document.querySelectorAll;
const prevOne = document.querySelector;
const prevGet = document.getElementById;
const prevBody = document.body;
const prevRoot = document.documentElement;
const hud = fakeEl("div");
hud.className = "hud-nav";
const adminChip = fakeEl("a");
adminChip.className = "admin-chip";
const parentChip = fakeEl("a");
parentChip.className = "parent-chip";
const refsChip = fakeEl("a");
refsChip.className = "refs-chip";
document.body = fakeEl("body");
document.documentElement = fakeEl("html");
document.createElement = fakeEl;
document.getElementById = () => null;
document.querySelector = (sel) => (sel === ".hud-nav" ? hud : null);
document.querySelectorAll = (sel) => {
  if (sel === ".hud-nav") return [hud];
  if (String(sel).indexOf("admin-chip") >= 0) return [adminChip, parentChip, refsChip];
  return [];
};
const telBefore = store["bw-telemetry"];
assert.strictEqual(Game.setSiteView("bennett"), "bennett");
assert.strictEqual(Game.siteView(), "bennett");
assert.strictEqual(localStorage.getItem("bw-site-view"), "bennett");
assert.strictEqual(store["bw-telemetry"], telBefore, "preview must not change bw-telemetry");
assert.strictEqual(JSON.parse(store["bw-telemetry"]).role, "orin", "device role stays Orin");
const viewBox = hud.children[0];
assert(viewBox && viewBox.getAttribute("aria-label") === "Preview as", "view control exists");
assert(adminChip.hidden && parentChip.hidden && refsChip.hidden, "bennett hides admin");
assert(Game.audioAllowed(), "Bennett still hears audio");
assert(Game.playSoundCue(Game.setSoundCue(Game.emptyFamily(), "tables", "honk"), funLib, "tables"), "Bennett table cue still plays");

localStorage.removeItem("bw-signin-seen");
const clipChar = { id: "bennett", name: "Bennett", video: "img/characters/bennett.mp4", poster: "img/characters/bennett.jpg" };
Game.playUnlockClip(Game.defaultCharacters(), clipChar);
const clipLayer = document.body.children.find((el) => el.id === "char-celebrate") || document.body.children[document.body.children.length - 1];
assert(clipLayer && /bennett\.mp4/.test(clipLayer.innerHTML) && /bennett\.jpg/.test(clipLayer.innerHTML), "playUnlockClip uses Bennett video + poster");
assert(/You're in/.test(clipLayer.innerHTML), "Bennett welcome kicker is You're in");
localStorage.removeItem("bw-signin-seen");
Game.celebrate({ id: "signin-bennett", title: "Signed in", rewardCharacter: "bennett", rewardUnlock: { type: "character", id: "bennett", label: "Bennett" } }, pack);
const celebrateLayer = document.body.children.find((el) => el.id === "char-celebrate") || document.body.children[document.body.children.length - 1];
assert(celebrateLayer && /bennett\.mp4/.test(celebrateLayer.innerHTML) && /bennett\.jpg/.test(celebrateLayer.innerHTML), "kid celebrate path plays Bennett video + poster, not a toast");
assert.strictEqual(localStorage.getItem("bw-signin-seen"), "1", "welcome clip marks sign-in as seen");

Game.setSiteView("mom");
assert.strictEqual(Game.siteView(), "mom");
assert(!Game.audioAllowed(), "mom mutes audio");
assert.strictEqual(JSON.parse(store["bw-telemetry"]).role, "orin", "Mom preview must not change telemetry role");
assert(adminChip.hidden, "Mom keeps Admin hidden");
assert.strictEqual(Game.playSoundCue(Game.setSoundCue(Game.emptyFamily(), "tables", "honk"), funLib, "tables"), false, "mom table cue is a no-op");
assert.strictEqual(Game.honk(), false, "mom honk is a no-op");
assert.strictEqual(Game.playRandomLibraryItem(funLib), null, "mom library play is a no-op");
assert.strictEqual(Game.playLibraryItem({ id: "honk", kind: "audio", synth: "honk" }), false, "mom library synth is a no-op");

Game.setSiteView("me");
assert.strictEqual(Game.siteView(), "me");
assert(Game.audioAllowed(), "Me allows audio again");
assert(!adminChip.hidden, "Me shows Admin again");
const telOrin = store["bw-telemetry"];
store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "bennett" });
assert.strictEqual(Game.siteView(), "bennett", "device role bennett forces Bennett view");
assert.strictEqual(Game.showSiteViewControl(), false);
assert.strictEqual(Game.siteViewControlHtml(), "", "device role bennett omits preview HTML");
assert.strictEqual(Game.mountSiteViewControl(), null);
assert(!hud.children.some((c) => c.className === "site-view"), "site-view control is omitted when device role is bennett");
store["bw-telemetry"] = telOrin;
document.createElement = prevCreate;
document.querySelectorAll = prevAll;
document.querySelector = prevOne;
document.getElementById = prevGet;
document.body = prevBody;
document.documentElement = prevRoot;

(async () => {
  const askCalls = [];
  ctx.fetch = async (url, init) => {
    askCalls.push({ url: String(url), headers: (init && init.headers) || {} });
    if (String(url).indexOf("/functions/v1/ask") >= 0) {
      return { ok: true, json: async () => ({ reply: "What's the first serve?", live: true, source: "xai" }) };
    }
    throw new Error("no local ask");
  };
  const liveAsk = await Tutor.ask({ title: "English 10", messages: [{ role: "bennett", text: "help" }] });
  assert.strictEqual(liveAsk.reply, "What's the first serve?", "live Ask AI should use the family-token function first");
  assert.strictEqual(askCalls[0] && askCalls[0].headers["x-family-token"], "fam", "live Ask AI should send x-family-token");
  assert(!askCalls.some((row) => row.url === "/api/ask"), "live Ask AI should not fall through when the function replies");

  askCalls.length = 0;
  ctx.fetch = async (url) => {
    askCalls.push({ url: String(url) });
    if (String(url).indexOf("/functions/v1/ask") >= 0) throw new Error("function down");
    if (String(url) === "/api/ask") {
      return { ok: true, json: async () => ({ reply: "Local mentor?", live: true, source: "live" }) };
    }
    throw new Error("offline");
  };
  const localAsk = await Tutor.ask({ title: "English 10", messages: [{ role: "bennett", text: "help" }] });
  assert.strictEqual(localAsk.reply, "Local mentor?", "Ask AI should fall back to /api/ask");

  askCalls.length = 0;
  ctx.fetch = async (url) => {
    askCalls.push({ url: String(url) });
    throw new Error("offline");
  };
  const offlineAsk = await Tutor.ask({ title: "English 10: Finish summer comic strips", messages: [{ role: "bennett", text: "stuck" }] });
  assert(offlineAsk.reply && offlineAsk.live === false, "Ask AI should fall back to testAsk");

  askCalls.length = 0;
  ctx.fetch = async (url, init) => {
    askCalls.push({ url: String(url), headers: (init && init.headers) || {}, body: init && init.body });
    if (String(url).indexOf("/functions/v1/ask") >= 0) {
      return { ok: true, json: async () => ({ reply: "What's the first panel you still owe?", live: true, source: "xai" }) };
    }
    throw new Error("no local tutor");
  };
  const liveHelp = await Tutor.request({ title: "English 10: Finish summer comic strips", note: "from class", mode: "nudge" });
  assert.strictEqual(liveHelp.live, true, "A little help should use the live mentor when a family token is set");
  assert(/panel/i.test(liveHelp.start || ""), "live A little help should put the mentor reply in the first move");
  assert(askCalls.some((row) => String(row.url).indexOf("/functions/v1/ask") >= 0), "A little help should reuse the Ask edge function");
  assert(!askCalls.some((row) => row.url === "/api/tutor"), "live A little help should not need /api/tutor");
  const helpBody = askCalls[0] && askCalls[0].body ? String(askCalls[0].body) : "";
  assert(/do not do the assignment/i.test(helpBody) && /Finish summer comic strips/.test(helpBody), "A little help should send a Socratic first-move prompt for the card");

  askCalls.length = 0;
  ctx.fetch = async (url) => {
    askCalls.push({ url: String(url) });
    throw new Error("offline");
  };
  const offlineHelp = await Tutor.request({ title: "English 10: Finish summer comic strips", mode: "nudge" });
  assert(offlineHelp.live === false && offlineHelp.start, "A little help should fall back to testHelp offline");

  const beep = new File([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0])], "TEST-beep.wav", { type: "audio/wav" });
  const added = await Game.addDeviceLibraryFile({ items: norm.items.slice() }, beep, { test: true });
  assert(added.ok, "drop should accept a wav");
  assert.strictEqual(added.item.character, "fun");
  assert.strictEqual(added.item.kind, "audio");
  assert.strictEqual(added.item.label, "TEST Beep");
  assert(added.item.device);
  assert(Game.librarySrc(added.item), "dropped wav should play from an object URL");
  assert(Game.libraryFor(added.library, "fun", false).some((item) => item.id === added.item.id));

  const packed = await Game.exportFamilyPack(pack, family, Game.defaultCharacters(), added.library);
  assert(packed.pack.libraryBlobs[added.item.id], "family pack should carry the device file");
  assert(packed.pack.libraryBlobs[added.item.id].data);
  assert(!banned.test(JSON.stringify(packed.pack.library.items.map((item) => item.label).join(" "))));

  const huge = new File([new Uint8Array(Game.PACK_BLOB_MAX + 8)], "huge-skip.wav", { type: "audio/wav" });
  const big = await Game.addDeviceLibraryFile({ items: [] }, huge);
  assert(big.ok);
  const packedHuge = await Game.exportFamilyPack(pack, family, Game.defaultCharacters(), big.library);
  assert(packedHuge.skipped.some((name) => /huge/i.test(name)), "huge files should skip instead of filling the pack");
  assert(!packedHuge.pack.libraryBlobs[big.item.id]);

  const imported = await Game.importFamilyPack(packed.pack);
  assert(imported && imported.pack);
  const mom = Game.getMomLibrary();
  assert(mom.items.some((item) => item.id === added.item.id && item.device));
  await Game.hydrateLibraryBlobs(mom);
  const back = Game.libraryItem(mom, added.item.id);
  assert(Game.librarySrc(back), "import should restore the device blob");

  console.log("check-content-library: ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
