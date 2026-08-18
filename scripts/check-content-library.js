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
const basecampHtml = fs.readFileSync(path.join(root, "basecamp.html"), "utf8");
const basecampJs = fs.readFileSync(path.join(root, "js/basecamp.js"), "utf8");
assert(adminJs.includes("https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/spend"), "Admin should GET the spend function");
assert(/x-family-token/.test(adminJs) && /loadSpend/.test(adminJs) && /await loadSpend/.test(adminJs), "Refresh usage should also refresh spend");
assert(/spend today/.test(adminJs) && /calls today/.test(adminJs) && /spend 7d/.test(adminJs) && /all-time/.test(adminJs) && /last call/.test(adminJs), "spend tiles should cover today, 7d, all-time, and last call");
assert(adminJs.includes('only: ["tables"]') && adminJs.includes('except: ["tables"]'), "Admin should pin tables at the top and keep the other cues below");
assert(fs.readFileSync(path.join(root, "js/game.js"), "utf8").includes("function filterCueRows"), "sound cue lists should be able to pin or hide a cue");
assert(tutorJs.includes("https://uhbpfmbfhyqjvkcymbxf.supabase.co/functions/v1/ask"), "Ask AI should try the live function first");
assert(/x-family-token/.test(tutorJs) && /\/api\/ask/.test(tutorJs) && /testAsk/.test(tutorJs), "Ask AI should send the family token, then /api/ask, then testAsk");
const askFn = tutorJs.slice(tutorJs.indexOf("async function ask"), tutorJs.indexOf("global.Tutor"));
assert(askFn.includes("functions/v1/ask"), "Tutor.ask posts to the live ask function");
assert(!/if\s*\(\s*token\s*\)\s*\{[\s\S]*functions\/v1\/ask/.test(askFn), "Tutor.ask must post to the ask function even when no family token");
const requestFn = tutorJs.slice(tutorJs.indexOf("async function request"), tutorJs.indexOf("function testAsk"));
assert(!/if\s*\(\s*token\s*\)/.test(requestFn), "A little help live path must not require a family token");
assert(/tutor\.js\?v=97/.test(basecampHtml) && /basecamp\.js\?v=97/.test(basecampHtml), "Base Camp should cache-bust tutor/basecamp");
assert(/basecamp\.html/.test(askHtml) && /\?class=/.test(askHtml) && /\?title=/.test(askHtml), "ask.html hands off to Base Camp and keeps class/title query");
assert(fs.existsSync(path.join(root, "basecamp.html")), "Base Camp page exists");
assert(fs.existsSync(path.join(root, "js/basecamp.js")), "Base Camp script exists");
assert(/Jungle Jam · Base Camp/.test(basecampHtml), "Base Camp page title");
assert(/basecamp-chip/.test(basecampHtml) && /Base Camp/.test(basecampHtml), "HUD chip present on Base Camp");
assert(/id="bc-camera"/.test(basecampHtml) && /capture="environment"/.test(basecampHtml), "Take photo input exists");
assert(/id="bc-upload"/.test(basecampHtml) && /image\/\*/.test(basecampHtml), "Upload input exists");
assert(/className/.test(basecampJs) && /images:/.test(basecampJs), "Base Camp posts className and images");
assert(/MAX_EDGE = 1200/.test(basecampJs) && /image\/jpeg/.test(basecampJs), "client compresses images to ~1200px jpeg");
assert(/Jungle Jam Tutor/.test(tutorJs) && /Jungle Jam Tutor/.test(basecampJs) && /Jungle Jam Tutor/.test(basecampHtml), "Base Camp copy/identity is Jungle Jam Tutor");
assert(tutorJs.includes("https://www.khanacademy.org/math/geometry"), "Geometry Khan handoff URL present");
assert(!/here is the answer to #4/i.test(tutorJs) && !/here is the answer to #4/i.test(basecampJs), "no here-is-the-answer-to-#4 style fallback");
["index.html", "progress.html", "characters.html", "ask.html", "messages.html", "admin.html", "parent.html"].forEach((file) => {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert(/basecamp-chip/.test(html) && /basecamp\.html/.test(html), file + " HUD includes Base Camp");
});
const secretScan = [adminJs, tutorJs, adminHtml, askHtml, basecampHtml, basecampJs, fs.readFileSync(path.join(root, "js/week.js"), "utf8"), fs.readFileSync(path.join(root, "js/game.js"), "utf8"), fs.readFileSync(path.join(root, "js/messages.js"), "utf8"), fs.readFileSync(path.join(root, "js/telemetry.js"), "utf8")].join("\n");
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
assert(fs.existsSync(path.join(root, "img/library/basecamp-bg.jpg")), "img/library/basecamp-bg.jpg exists");
assert(fs.existsSync(path.join(root, "img/library/basecamp-intro.mp4")), "img/library/basecamp-intro.mp4 exists");
const basecampBg = library.items.find((item) => item.id === "basecamp-bg");
const basecampIntro = library.items.find((item) => item.id === "basecamp-intro");
assert(basecampBg, "basecamp-bg should be in library.json");
assert.strictEqual(basecampBg.kind, "image", "basecamp-bg is a still");
assert.strictEqual(basecampBg.path, "img/library/basecamp-bg.jpg", "basecamp-bg path");
assert.strictEqual(basecampBg.character, "crew", "basecamp-bg sits on Crew");
assert(!basecampBg.device, "basecamp-bg is shipped");
assert(basecampIntro, "basecamp-intro should be in library.json");
assert.strictEqual(basecampIntro.kind, "video", "basecamp-intro is a clip");
assert.strictEqual(basecampIntro.path, "img/library/basecamp-intro.mp4", "basecamp-intro path");
assert.strictEqual(basecampIntro.poster, "img/library/basecamp-bg.jpg", "basecamp-intro poster is the still");
assert.strictEqual(basecampIntro.character, "crew", "basecamp-intro sits on Crew");
assert(!basecampIntro.device, "basecamp-intro is shipped");
assert(fs.existsSync(path.join(root, "audio/tablesloud.mp3")), "audio/tablesloud.mp3 should already be on disk");
assert(fs.existsSync(path.join(root, "audio/undo.wav")), "audio/undo.wav should already be on disk");
const tableClick = library.items.find((item) => item.id === "tablesloud");
assert(tableClick, "tablesloud should be in library.json");
assert.strictEqual(tableClick.label, "Table click", "tablesloud label");
assert.strictEqual(tableClick.kind, "audio", "tablesloud is audio");
assert.strictEqual(tableClick.path, "audio/tablesloud.mp3", "tablesloud path");
assert.strictEqual(tableClick.character, "fun", "tablesloud sits on Fun / Sounds");
assert(!tableClick.device, "tablesloud is shipped, not a device drop");
assert(!tableClick.synth, "tablesloud is the mp3, not a synth");
const undoClick = library.items.find((item) => item.id === "undo-click");
assert(undoClick, "undo-click should be in library.json");
assert.strictEqual(undoClick.label, "Undo", "undo-click label");
assert.strictEqual(undoClick.kind, "audio", "undo-click is audio");
assert.strictEqual(undoClick.path, "audio/undo.wav", "undo-click path");
assert.strictEqual(undoClick.character, "fun", "undo-click sits on Fun / Sounds");
assert(!undoClick.device, "undo-click is shipped, not a device drop");
assert(!undoClick.synth, "undo-click is the wav, not a synth");
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
assert(adminHtml.includes("img/library/basecamp-bg.jpg") && adminHtml.includes("img/library/basecamp-intro.mp4"), "Admin file:// seed should include Base Camp intro assets");
assert(adminHtml.includes("audio/tablesloud.mp3") && /"id"\s*:\s*"tablesloud"/.test(adminHtml), "Admin file:// seed should include Table click");
assert(adminHtml.includes("audio/undo.wav") && /"id"\s*:\s*"undo-click"/.test(adminHtml), "Admin file:// seed should include Undo");
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
assert(Game, "Game failed to load");
vm.runInContext(fs.readFileSync(path.join(root, "js/tutor.js"), "utf8"), ctx);
const Tutor = ctx.window.Tutor;
assert(Tutor, "Tutor failed to load");
assert.strictEqual(Tutor.IDENTITY, "Jungle Jam Tutor", "coach identity is Jungle Jam Tutor");
assert.strictEqual(Tutor.GEOMETRY_KHAN, "https://www.khanacademy.org/math/geometry", "Geometry Khan handoff URL");
assert(/## 2\. Personality/.test(Tutor.SYSTEM) && /## 6\. Math can be wrong/.test(Tutor.SYSTEM), "local spec keeps sections 2–6");
assert(/I can walk it with you/.test(Tutor.SYSTEM), "Socratic lock stays in the spec");
let campFam = Game.emptyFamily();
const chemA = Game.createBasecampSession(campFam, "chemistry", "Quiz 1");
const geoA = Game.createBasecampSession(chemA.family, "geometry", "Packet p1");
const chemB = Game.createBasecampSession(geoA.family, "chemistry", "Lab");
campFam = chemB.family;
const chemSessions = Game.basecampSessionsForClass(campFam, "chemistry");
const geoSessions = Game.basecampSessionsForClass(campFam, "geometry");
assert.strictEqual(chemSessions.length, 2, "Chemistry sessions group by classId");
assert.strictEqual(geoSessions.length, 1, "Geometry sessions group by classId");
assert(chemSessions.every((s) => s.classId === "chemistry"), "Chemistry list is only Chemistry");
assert(geoSessions.every((s) => s.classId === "geometry"), "Geometry list is only Geometry");
assert.strictEqual(geoA.session.pinned, false, "new sessions are not pinned");
const pinnedGeo = Game.setBasecampPinned(campFam, geoA.session.id, true);
campFam = pinnedGeo.family;
assert(pinnedGeo.session.pinned, "geometry climb can pin");
assert.strictEqual(Game.basecampSessionsForClass(campFam, "chemistry").length, 2, "pin does not drop other classes");
assert.strictEqual(Game.basecampPinnedForClass(campFam, "geometry").length, 1, "pinned list is geometry only");
assert.strictEqual(Game.basecampSavedForClass(campFam, "geometry").length, 0, "pinned climb leaves saved");
assert.strictEqual(Game.basecampPinnedForClass(campFam, "chemistry").length, 0, "other class pinned list stays empty");
const unpinnedGeo = Game.setBasecampPinned(campFam, geoA.session.id, false);
campFam = unpinnedGeo.family;
assert.strictEqual(unpinnedGeo.session.pinned, false, "unpin works");
assert.strictEqual(Game.basecampSessionsForClass(campFam, "chemistry").length, 2, "unpin does not drop other classes");
const pinnedAgain = Game.setBasecampPinned(campFam, geoA.session.id, true);
campFam = pinnedAgain.family;
const packOut = Game.exportPack({ achievements: [] }, campFam);
assert((packOut.family.basecamp.sessions || []).some((s) => s.pinned && s.classId === "geometry"), "export family pack keeps pinned");
const importedCamp = Game.normalizeFamily(packOut.family);
assert(importedCamp.basecamp.sessions.some((s) => s.pinned && s.classId === "geometry"), "import family pack keeps pinned");
assert(Array.isArray(Game.emptyFamily().basecampQueries), "family keeps append-only queries");
let qFam = Game.emptyFamily();
const climbA = Game.createBasecampSession(qFam, "geometry", "Angles");
const climbB = Game.createBasecampSession(climbA.family, "chemistry", "Moles");
qFam = Game.recordBasecampQuery(climbB.family, {
  classId: "geometry",
  className: "Geometry",
  sessionId: climbA.session.id,
  sessionTitle: "Angles",
  text: "are these vertical?",
  hasImage: false,
  view: "bennett"
}).family;
const afterDel = Game.deleteBasecampSession(qFam, climbA.session.id);
assert(!Game.basecampSession(afterDel.family, climbA.session.id), "deleted climb is gone");
assert(Game.basecampSession(afterDel.family, climbB.session.id), "other class climb remains");
assert.strictEqual(Game.basecampSessionsForClass(afterDel.family, "geometry").length, 0, "delete removes one climb");
assert.strictEqual(Game.basecampSessionsForClass(afterDel.family, "chemistry").length, 1, "delete leaves other classes");
assert((afterDel.family.basecampQueries || []).some((q) => q.sessionId === climbA.session.id && /vertical/.test(q.text)), "queries survive session delete");
const packedQ = Game.exportPack({ achievements: [] }, afterDel.family);
assert((packedQ.family.basecampQueries || []).some((q) => /vertical/.test(q.text)), "family pack export keeps queries");
assert(Game.normalizeFamily(packedQ.family).basecampQueries.some((q) => /vertical/.test(q.text)), "family pack import keeps queries");
assert(/data-delete/.test(basecampJs) && /Delete this climb\?/.test(basecampJs), "kid view can delete a climb");
assert(/bc-delete/.test(basecampJs) && !/data-admin/.test(basecampJs), "Base Camp delete has no Admin chrome");
assert(!/usage-queries/.test(basecampHtml) && !/usage-queries/.test(basecampJs) && !/<h3[^>]*>Queries<\/h3>/.test(basecampHtml), "kid view / basecamp has no Admin queries list");
assert(/id="usage-queries"/.test(adminHtml) && /<h2>Site usage<\/h2>/.test(adminHtml), "Admin queries markup exists");
assert(/renderQueries/.test(adminJs) && /usage-queries/.test(adminJs) && /photo yes/.test(adminJs), "Admin Usage paints a Queries block");
assert(/filterUsageQueries/.test(adminJs) && /queryRole/.test(adminJs), "Admin queries use the who-filter");
assert(/recordBasecampQuery/.test(basecampJs) && /hasImage/.test(basecampJs), "Base Camp appends a query row on send");
assert(/ask_ai/.test(fs.readFileSync(path.join(root, "js/telemetry.js"), "utf8")) && /slice\(0,\s*kind === "ask_ai" \? 500 : 280\)/.test(fs.readFileSync(path.join(root, "js/telemetry.js"), "utf8")), "ask_ai telemetry keeps ~500 chars");
assert(!/startBasecampIntro|maybeStartBasecampIntro/.test(basecampJs.slice(basecampJs.indexOf("function deleteClimb"), basecampJs.indexOf("function newSession"))), "deleting a climb does not replay the daily intro");
assert(/scrollTo\(0,\s*y\)/.test(basecampJs), "delete keeps the page from jumping to the top");
const bcThemeCss = fs.readFileSync(path.join(root, "css/theme.css"), "utf8");
assert(/bc-tools-rail/.test(basecampHtml) && /bc-shell/.test(basecampHtml), "tools rail exists in Base Camp markup");
assert(/192px minmax\(0,\s*1fr\) 240px/.test(bcThemeCss), "chat column is the widest grid track when tools are showing");
const deskBc = bcThemeCss.slice(bcThemeCss.indexOf("@media (min-width: 840px)"), bcThemeCss.indexOf("@media (min-width: 1100px)"));
assert(/\.bc-log\s*\{[^}]*flex:\s*1 1 auto/.test(deskBc) && /\.bc-log\s*\{[^}]*overflow:\s*auto/.test(deskBc), ".bc-log is the flex/overflow scroller");
assert(/\.bc-rail\s*\{[^}]*overflow:\s*hidden/.test(deskBc), "left rail does not steal wheel as a page scroller");
assert(!/\.bc-rail,\s*\n\s*\.bc-tools-rail\s*\{[^}]*overflow:\s*auto/.test(deskBc), "desktop does not make the left rail the only scroller");
const phoneBc = bcThemeCss.slice(bcThemeCss.indexOf("@media (max-width: 839px)"), bcThemeCss.indexOf("@media (min-width: 840px)"));
assert(/overflow-y:\s*auto/.test(phoneBc) && /flex-direction:\s*row/.test(phoneBc), "mobile Base Camp page can scroll; saved climbs are a compact strip");
assert(/function onComposerKeydown/.test(basecampJs) && /getElementById\("bc-input"\)\.addEventListener\("keydown", onComposerKeydown\)/.test(basecampJs), "Enter key on #bc-input is bound");
const enterFn = basecampJs.slice(basecampJs.indexOf("function onComposerKeydown"), basecampJs.indexOf("function onComposerKeydown") + 280);
assert(/e\.key !== "Enter"/.test(enterFn) && /e\.shiftKey/.test(enterFn) && /send\(\)/.test(enterFn), "Enter key on #bc-input calls send (and Shift+Enter does not)");
assert(/isComposing/.test(enterFn) || /isComposing/.test(basecampJs), "IME composing does not send");
assert(/onBasecampWheel/.test(basecampJs) && /shouldWheelScrollChat/.test(basecampJs), "wheel over the page/chat moves the chat log");
assert(/has-tools/.test(basecampJs) && /classId === "geometry"/.test(basecampJs) && /classId === "chemistry"/.test(basecampJs), "tools rail shown only for geometry/chemistry");
assert(/bc-ex/.test(basecampJs) && /I took a picture of #4/.test(basecampJs) && /vertical angles/.test(basecampJs), "example-question chips include a Geometry photo / vertical angles starter");
assert(/Show a try or a photo/.test(basecampHtml), "composer keeps the tiny Socratic hint");
assert(/id="bc-calc"/.test(basecampHtml) && /data-calc="180−"/.test(basecampHtml) && /evalCalc/.test(basecampJs), "geometry calculator markup/JS present");
assert(/if \(classId !== "geometry"\) return/.test(basecampJs) && /bc-calc-pad/.test(basecampJs), "calculator used only when classId === geometry");
assert(/id="bc-ptable"/.test(basecampHtml) && /Periodic table/.test(basecampHtml) && /PTABLE/.test(basecampJs), "periodic table present");
assert(/mode !== "ptable"/.test(basecampJs) && /classId === "chemistry"/.test(basecampJs), "periodic table used only when classId === chemistry");
assert(!/Offline replies stay honest/.test(basecampJs) && !/Photo is OK — still name the givens/.test(basecampJs), "manifesto welcome copy is gone");
assert(/body\.basecamp-page/.test(bcThemeCss) && /img\/library\/basecamp-bg\.jpg/.test(bcThemeCss), "Base Camp CSS uses the treehouse still as page background");
const bcBgRule = bcThemeCss.slice(bcThemeCss.indexOf("body.basecamp-page"), bcThemeCss.indexOf("body.basecamp-page") + 420);
assert(/basecamp-bg\.jpg/.test(bcBgRule) && !/monkey-bg\.png/.test(bcBgRule), "Base Camp page background is the treehouse, not monkey-bg");
assert(/bc-intro-pending/.test(basecampHtml) && /bw-basecamp-intro/.test(basecampHtml), "Base Camp head script gates the first-visit hide");
assert(/id="bc-intro"/.test(basecampHtml) && /id="bc-intro-video"/.test(basecampHtml), "intro overlay markup exists");
assert(/id="bc-intro-skip"/.test(basecampHtml) && />Skip</.test(basecampHtml), "Skip control exists");
assert(/id="bc-intro-play"/.test(basecampHtml) && /Tap to enter/.test(basecampHtml), "tap-to-enter exists when autoplay is blocked");
assert(!/Tap to play/.test(basecampHtml), "tap-to-enter, not a play-tutorial label");
assert(!/loop/.test(basecampHtml.match(/id="bc-intro-video"[^>]*>/)[0]), "intro video is not a muted loop");
assert(/INTRO_MS = 10000/.test(basecampJs), "intro clip is 10 seconds");
assert(/object-fit:\s*cover/.test(bcThemeCss) && /object-position:\s*center/.test(bcThemeCss), "intro video uses the same cover/center crop as the still");
assert(/body\.basecamp-page::before/.test(bcThemeCss) && /center \/ cover/.test(bcThemeCss), "page still is a fixed center/cover plane");
assert(!/body\.basecamp-page\s*\{[^}]*linear-gradient/.test(bcThemeCss), "do not tint the still with a page-wide gradient");
assert(/backdrop-filter/.test(bcThemeCss) && /body\.basecamp-page \.bc-welcome/.test(bcThemeCss) && /body\.basecamp-page \.bc-rail/.test(bcThemeCss), "chat/rails use frosted cards");
assert(/body\.basecamp-page \.bc-class\.on/.test(bcThemeCss), "selected class chips sit on a dark card, not raw yellow on leaves");
const revealFn = basecampJs.slice(basecampJs.indexOf("function revealBasecampUi"), basecampJs.indexOf("function finishBasecampIntro"));
assert(/fade-out/.test(revealFn), "video fades out over the still");
assert(revealFn.indexOf("fade-out") < revealFn.indexOf("removeAttribute(\"src\")"), "do not tear down the last frame before the fade");
assert(/maybeStartBasecampIntro/.test(basecampJs) && /shouldPlayBasecampIntro/.test(basecampJs), "Base Camp boots the once-a-day intro");
assert(/markBasecampIntroPlayed/.test(basecampJs) && /chicagoYmd/.test(fs.readFileSync(path.join(root, "js/game.js"), "utf8")), "intro gate uses Chicago date helpers");
assert(/bw-basecamp-intro/.test(fs.readFileSync(path.join(root, "js/game.js"), "utf8")), "last-played date lives in localStorage");
assert(/siteView/.test(fs.readFileSync(path.join(root, "js/game.js"), "utf8").slice(
  fs.readFileSync(path.join(root, "js/game.js"), "utf8").indexOf("function hasPlayedBasecampIntroToday"),
  fs.readFileSync(path.join(root, "js/game.js"), "utf8").indexOf("function shouldPlayBasecampIntro") + 80
)), "once-a-day gate is keyed by site view");
assert(!/hasSignInSeen/.test(basecampJs), "Base Camp intro stays separate from the Bennett welcome clip");
assert(!/welcome to Base Camp|here are the buttons/i.test(basecampJs) && !/welcome to Base Camp|here are the buttons/i.test(basecampHtml), "no tutorial voiceover overlay");
const selectFn = basecampJs.slice(basecampJs.indexOf("function selectClass"), basecampJs.indexOf("function openSession"));
assert(selectFn.length > 20, "selectClass exists");
assert(!/Intro|bc-intro|INTRO_SRC/.test(selectFn), "class switch does not play the intro");
const pinFn = basecampJs.slice(basecampJs.indexOf("function togglePin"), basecampJs.indexOf("function newSession"));
assert(pinFn.length > 20, "togglePin exists");
assert(!/Intro|bc-intro|INTRO_SRC/.test(pinFn), "pinning a climb does not play the intro");
assert(/boot\(\)/.test(basecampJs) && /maybeStartBasecampIntro\(\)/.test(basecampJs), "intro starts only when entering Base Camp");
assert.strictEqual(typeof Game.hasPlayedBasecampIntroToday, "function", "Game exposes the intro gate");
assert.strictEqual(typeof Game.markBasecampIntroPlayed, "function", "Game can mark the intro played");
assert.strictEqual(typeof Game.shouldPlayBasecampIntro, "function", "Game exposes shouldPlayBasecampIntro");
localStorage.removeItem("bw-basecamp-intro");
Game.setSiteView("bennett");
assert.strictEqual(Game.shouldPlayBasecampIntro("bennett"), true, "Bennett has not seen today's intro");
assert.strictEqual(Game.hasPlayedBasecampIntroToday("me"), false, "Me is a separate once-a-day");
Game.markBasecampIntroPlayed("bennett");
assert.strictEqual(Game.hasPlayedBasecampIntroToday("bennett"), true, "Bennett is marked for today's Chicago date");
assert.strictEqual(JSON.parse(localStorage.getItem("bw-basecamp-intro")).bennett, Game.chicagoYmd(), "stored date is America/Chicago");
assert.strictEqual(Game.shouldPlayBasecampIntro("me"), true, "Me still plays after Bennett");
assert.strictEqual(Game.shouldPlayBasecampIntro("mom"), true, "Mom still plays after Bennett");
Game.markBasecampIntroPlayed("me");
Game.markBasecampIntroPlayed("mom");
assert.strictEqual(Game.hasPlayedBasecampIntroToday("me"), true, "Me has its own stamp");
assert.strictEqual(Game.hasPlayedBasecampIntroToday("mom"), true, "Mom has its own stamp");
localStorage.removeItem("bw-basecamp-intro");
Game.setSiteView("me");
const n4 = Tutor.testAsk("Geometry", "What's the answer to number 4", { className: "Geometry", classId: "geometry" });
assert(/Show me what you have/.test(n4.reply) && !/here is the answer/i.test(n4.reply), "What's #4 is not an answer dump");
assert.strictEqual(n4.live, false);
const idk = Tutor.testAsk("Geometry", "idk", { className: "Geometry", classId: "geometry" });
assert(/vertical|adjacent|linear pair/i.test(idk.reply), "idk asks for one concrete try");
assert(!/133/.test(idk.reply), "offline fallback does not announce the arithmetic");
const photoOff = Tutor.testAsk("Geometry", "is this photo right?", { className: "Geometry", classId: "geometry", images: [{ mime: "image/jpeg", data: "xx" }] });
assert(/can't see a photo/i.test(photoOff.reply) && /given/i.test(photoOff.reply), "offline does not fake seeing a photo");
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
assert(khanHtml.indexOf("https://www.khanacademy.org/math/geometry-home") >= 0, "strip HTML should include Geometry");
assert(khanHtml.indexOf("https://www.khanacademy.org/test-prep/mcat/society-and-culture") >= 0, "strip HTML should include Sociology");
assert(khanHtml.indexOf("https://www.khanacademy.org/ela") >= 0, "strip HTML should include ELA");
assert(khanHtml.indexOf("https://www.khanacademy.org/humanities/grammar") >= 0, "strip HTML should include Grammar");
assert(khanHtml.indexOf("target=\"_blank\"") >= 0 && khanHtml.indexOf("rel=\"noopener\"") >= 0, "Khan links open in a new tab");
assert(khanHtml.indexOf("No login needed") >= 0, "strip should say no login is needed");
assert(khanHtml.indexOf("iframe") < 0, "do not embed Khan");
const khanRoster = Game.khanLinksForRoster();
const khanRosterIds = khanRoster.map((k) => k.id);
assert(khanRosterIds.includes("ela") && khanRosterIds.includes("grammar"), "roster strip includes ELA + Grammar");
assert(khanRosterIds.includes("geometry-home"), "roster strip includes Geometry");
assert(khanRosterIds.includes("hs-chemistry"), "roster strip includes HS Chemistry");
assert(khanRosterIds.includes("sociology"), "roster strip includes Sociology");
assert(!khanRosterIds.includes("science"), "roster strip omits the generic Science hub");
assert.strictEqual(khanRoster.find((k) => k.id === "sociology").label, "Khan Academy — Sociology", "Sociology label is public-course wording");
const khanElaStrip = Game.khanStripHtml("English 10: Finish summer comic strips");
assert(khanElaStrip.indexOf("hs-chemistry") >= 0, "English help strip still lists HS Chemistry");
assert(khanElaStrip.indexOf("geometry-home") >= 0, "English help strip still lists Geometry");
assert(khanElaStrip.indexOf("society-and-culture") >= 0, "English help strip still lists Sociology");
const khanClassStrip = Game.khanStripHtmlForClass({ id: "english-10" });
assert(khanClassStrip.indexOf("/ela") >= 0, "English 10 class strip includes ELA");
assert(khanClassStrip.indexOf("humanities/grammar") >= 0, "English 10 class strip includes Grammar");
assert(khanClassStrip.indexOf("geometry-home") < 0, "English 10 class strip omits Geometry");
assert(khanClassStrip.indexOf("society-and-culture") < 0, "English 10 class strip omits Sociology");
assert(khanClassStrip.indexOf("hs-chemistry") < 0, "English 10 class strip omits HS Chemistry");
const khanGeoStrip = Game.khanStripHtmlForClass({ id: "geometry" });
assert(/Geometry/.test(khanGeoStrip), "Geometry class strip contains Geometry");
assert(!/HS Chemistry/.test(khanGeoStrip) && khanGeoStrip.indexOf("hs-chemistry") < 0, "Geometry class strip omits HS Chemistry");
assert(!/Sociology/.test(khanGeoStrip) && khanGeoStrip.indexOf("society-and-culture") < 0, "Geometry class strip omits Sociology");
const khanChemStrip = Game.khanStripHtmlForClass({ id: "chemistry" });
assert(/HS Chemistry/.test(khanChemStrip), "Chem class strip contains HS Chemistry");
assert(!/Geometry/.test(khanChemStrip) && khanChemStrip.indexOf("geometry-home") < 0, "Chem class strip omits Geometry");
assert.strictEqual(Game.khanStripHtmlForClass({ id: "band" }), "", "Band class strip is empty");
assert(/HS Chemistry/.test(khanHtml) && /Geometry/.test(khanHtml) && /Sociology/.test(khanHtml) && /ELA/.test(khanHtml), "khanStripHtml still has the full roster");

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
["sociology", "web-design", "academic-intervention", "strength", "geometry"].forEach((id) => {
  assert(Array.isArray(byId[id].items) && byId[id].items.length === 0, id + " has no assignments");
  assert(!byId[id].grade, id + " must not invent a grade");
});
assert(!byId.chemistry.grade, "chemistry must not invent a grade");
assert.strictEqual((byId.chemistry.items || []).length, 1, "Chemistry has About Me Slides from Canvas");
assert.strictEqual(byId.chemistry.items[0].id, "chem-about-me");
assert.strictEqual(byId.chemistry.items[0].title, "About Me Slides");
assert(!(byId.chemistry.items[0].grade), "do not invent a Chemistry grade");
assert.deepStrictEqual(byId.chemistry.khan, ["hs-chemistry"], "Chemistry maps to HS Chemistry");
assert.deepStrictEqual(byId.geometry.khan, ["geometry-home"], "Geometry maps to public Geometry course");
assert.deepStrictEqual(byId.sociology.khan, ["sociology"], "Sociology maps to the society-and-culture unit");
const english = byId["english-10"];
const band = byId.band;
assert(!english.grade, "do not invent an English grade");
assert(!band.grade, "do not invent a Band grade");
assert.strictEqual((english.items || []).length, 3, "English still has names, comics, notebook");
assert.strictEqual(english.items.find((item) => item.id === "eng-comics").title, "Summer Narrative Comic Strip");
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
const weekById = Object.fromEntries((week.work || []).map((w) => [w.id, w]));
assert(weekById["chem-about-me"], "week.json has chem-about-me");
assert.strictEqual(weekById["chem-about-me"].due, "2026-08-18T23:59:00");
assert.strictEqual(weekById["chem-about-me"].classId, "chemistry");
assert.strictEqual(weekById["chem-about-me"].canvas && weekById["chem-about-me"].canvas.status, "open");
assert.strictEqual(weekById["chem-about-me"].canvas.points, 1);
assert.strictEqual(weekById["eng-comics"].due, "2026-08-20T23:59:00");
assert.strictEqual(weekById["eng-comics"].title, "English 10: Summer Narrative Comic Strip");
assert(weekById["eng-comics"].suggest_from, "comics still suggest_from so they show as Start this");
assert.strictEqual(weekById["eng-names"].canvas && weekById["eng-names"].canvas.status, "submitted");
assert.strictEqual(weekById["eng-names"].canvas.points, 5);
assert(weekById["eng-notebook"], "notebook stays — bring-to-class, not on this Canvas To-Do");
assert.strictEqual((week.work || []).filter((w) => /English 10/.test(w.title || "")).length, 3, "English still 3 items");
assert.strictEqual(week.as_of, "2026-08-17");
const parenting = week.parenting || [];
assert(!parenting.some((p) => p.end === "2026-08-22T00:00:00"), "Mom overnight must not run through Friday midnight");
const momOvernight = parenting.find((p) => p.who === "Mom" && p.start === "2026-08-20T16:30:00");
assert(momOvernight && momOvernight.end === "2026-08-21T16:30:00", "Mom overnight is Thu 4:30p → Fri 4:30p");
const dadWeekend = parenting.find((p) => p.who === "Dad" && p.start === "2026-08-21T16:30:00");
assert(dadWeekend && dadWeekend.end === "2026-08-27T16:30:00", "Dad weekend starts Fri 4:30p");
function parentingOverlapsDay(block, day) {
  return block.start < day + "T23:59:59" && block.end > day + "T00:00:00";
}
assert(parentingOverlapsDay(momOvernight, "2026-08-21") && parentingOverlapsDay(dadWeekend, "2026-08-21"), "Friday 2026-08-21 overlaps Mom overnight and Dad weekend start");

const khanClassChem = Game.khanLinksForClass(byId.chemistry);
assert.strictEqual(khanClassChem.length, 1, "Chemistry class chips are HS Chemistry only");
assert.strictEqual(khanClassChem[0].id, "hs-chemistry", "Chemistry class chips are HS Chemistry");
assert.strictEqual(Game.khanLinksForClass(band).length, 0, "Band omits Khan chips");
assert.strictEqual(Game.khanLinksForClass(byId["web-design"]).length, 0, "Web Design omits Khan chips");
assert.strictEqual(Game.khanLinksForClass(byId.strength).length, 0, "Strength omits Khan chips");
assert.strictEqual(Game.khanLinksForClass(byId["academic-intervention"]).length, 0, "Academic Intervention omits Khan chips");
const khanSoc = Game.khanLinksForClass(byId.sociology);
assert.strictEqual(khanSoc.length, 1, "Sociology class chips are Sociology only");
assert.strictEqual(khanSoc[0].id, "sociology", "Sociology class chips are Sociology");
assert.strictEqual(khanSoc[0].url, "https://www.khanacademy.org/test-prep/mcat/society-and-culture", "Sociology uses the society-and-culture unit");
const khanGeo = Game.khanLinksForClass(byId.geometry);
assert.strictEqual(khanGeo.length, 1, "Geometry class chips are Geometry only");
assert.strictEqual(khanGeo[0].url, "https://www.khanacademy.org/math/geometry-home", "Geometry uses the public course URL");
const khanAskChem = Game.khanLinksFor("Chemistry", { classId: "chemistry" });
assert(khanAskChem.some((k) => k.id === "hs-chemistry"), "Ask ?class=chemistry chips stay on HS Chemistry");
assert(!khanAskChem.some((k) => k.id === "ela"), "Ask chemistry chips should not dump ELA");
assert(Game.khanStripHtml("Chemistry", { classId: "chemistry" }).indexOf("/ela") >= 0, "Ask chemistry strip still lists ELA");
assert.strictEqual(Game.classDueLabel(3), "3 due");
assert.strictEqual(Game.classDueLabel(0), "Nothing due yet");
assert.strictEqual(Game.classDueCount(english, week), 3, "English has 3 due from week.json");
assert.strictEqual(Game.classDueCount(byId.chemistry, week), 1, "Chemistry has About Me Slides due");
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

["index.html", "progress.html", "parent.html", "admin.html", "ask.html", "basecamp.html", "egg.html", "story.html", "characters.html", "refs.html", "messages.html"].forEach((file) => {
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
assert(Telemetry, "Telemetry failed to load");
Telemetry.track("work_add", { classId: "english-10", assignmentId: "eng-names", termId: "2025-26-s1" });
assert(typeof Telemetry.queuedCount === "function");
assert(!Telemetry.connected() || store["bw-telemetry"], "telemetry config lives in localStorage");

let classFamily = Game.emptyFamily();
classFamily = Game.addProgressClass(classFamily, "Study hall", progress);
const overlayClasses = Game.applyProgressOverlay(progress, classFamily).classes;
assert(overlayClasses.some((cls) => cls.id === "chemistry" && cls.items.some((item) => item.id === "chem-about-me")), "overlay keeps Chemistry About Me Slides");
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
assert.strictEqual(Game.DEFAULT_SOUND_CUES.undo, "undo-click", "default undo cue resolves to undo-click");
assert.strictEqual(Game.DEFAULT_SOUND_CUES.tables, "tablesloud", "default table cue stays tablesloud");
assert.notStrictEqual(Game.DEFAULT_SOUND_CUES.undo, Game.DEFAULT_SOUND_CUES.tables, "Undo and Table must be different clips");
assert.strictEqual(Game.defaultSoundCueId("undo"), "undo-click");
assert.strictEqual(Game.defaultSoundCueId("tables"), "tablesloud");
assert.strictEqual(Game.resolveCueItemId(Game.emptyFamily(), funLib, "undo"), "undo-click", "empty family undo uses the shipped undo wav");
assert.notStrictEqual(Game.resolveCueItemId(Game.emptyFamily(), funLib, "undo"), "tablesloud", "empty family undo must not resolve to tablesloud");
assert.strictEqual(Game.resolveCueItemId(null, null, "undo"), "undo-click", "undo fallback does not need a family pack");
assert.strictEqual(Game.resolveCueItemId({ soundCues: { undo: "gone-clip" } }, funLib, "undo"), "undo-click", "broken undo id falls back to undo-click");
assert.notStrictEqual(Game.resolveCueItemId({ soundCues: { undo: "gone-clip" } }, funLib, "undo"), "tablesloud");
assert.strictEqual(Game.resolveCueItemId(Game.setSoundCue(Game.emptyFamily(), "undo", "honk"), funLib, "undo"), "honk", "keep a device undo assignment");
const tableLib = Game.normalizeLibrary({
  items: funLib.items.concat([{ id: "tablesloud", label: "Table click", kind: "audio", character: "fun", path: "audio/tablesloud.mp3" }])
});
assert.strictEqual(Game.resolveCueItemId(Game.setSoundCue(Game.emptyFamily(), "undo", "tablesloud"), tableLib, "undo"), "tablesloud", "keep an explicit tablesloud undo assignment when that clip exists");
assert.strictEqual(Game.cueSoundLabel(Game.emptyFamily(), Game.defaultLibrary(), "undo"), "Undo");
assert.strictEqual(Game.cueSoundLabel(Game.emptyFamily(), Game.defaultLibrary(), "tables"), "Table click");
assert.notStrictEqual(Game.cueSoundLabel(Game.emptyFamily(), Game.defaultLibrary(), "undo"), Game.cueSoundLabel(Game.emptyFamily(), Game.defaultLibrary(), "tables"));
assert.strictEqual(Game.resolveCueLibraryItem(null, { items: [] }, "undo").path, "audio/undo.wav");
assert.notStrictEqual(Game.resolveCueLibraryItem(null, { items: [] }, "undo").path, "audio/tablesloud.mp3");
assert(Game.playSoundCue(null, null, "undo"), "playSoundCue undo plays with no family draft");
assert(Game.playSoundCue(Game.emptyFamily(), { items: [] }, "undo"), "playSoundCue undo plays when the library blob is empty");
assert(Game.playSoundCue({ soundCues: { undo: "gone-clip" } }, { items: [] }, "undo"), "playSoundCue undo plays when the assigned id is missing");
assert(Game.playSoundCue(Game.emptyFamily(), funLib, "tables"), "clean-device table cue plays the shipped click");
assert.strictEqual(Game.shippedUndoClick().id, "undo-click");
assert.strictEqual(Game.shippedUndoClick().path, "audio/undo.wav");
assert.strictEqual(Game.shippedUndoClick().label, "Undo");
assert.strictEqual(Game.shippedTableClick().id, "tablesloud");
assert.strictEqual(Game.shippedTableClick().path, "audio/tablesloud.mp3");
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
const bakedCues = Game.assignedCueRows(Game.emptyFamily(), { work: [], events: [] });
assert(bakedCues.some((row) => row.id === "undo" && row.soundId === "undo-click" && /Undo/i.test(row.label)), "Admin should show Undo as the Undo default");
assert(bakedCues.some((row) => row.id === "tables" && row.soundId === "tablesloud"), "Admin should show Table click as the table default");
assert.notStrictEqual(bakedCues.find((row) => row.id === "undo").soundId, bakedCues.find((row) => row.id === "tables").soundId, "Admin Undo and Table assignments must differ");
assert(!bakedCues.some((row) => row.id === "egg-end"), "empty family does not invent other saved sounds");
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
assert(Game.defaultLibrary().items.some((item) => item.id === "tablesloud" && item.path === "audio/tablesloud.mp3" && item.character === "fun" && !item.device), "file:// default library includes Table click");
assert(Game.defaultLibrary().items.some((item) => item.id === "undo-click" && item.path === "audio/undo.wav" && item.label === "Undo" && item.character === "fun" && !item.device), "file:// default library includes Undo");
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
assert(mergedDraft.items.some((item) => item.id === "tablesloud" && item.path === "audio/tablesloud.mp3" && !item.device), "merge should keep shipped Table click");
assert(mergedDraft.items.some((item) => item.id === "undo-click" && item.path === "audio/undo.wav" && item.label === "Undo" && !item.device), "merge should keep shipped Undo");
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
assert(/id="ask-input"/.test(weekJs) && /id="help-send"/.test(weekJs), "week.js help sheet has a composer (ask-input or help-send)");
assert(/Answer the mentor/.test(weekJs) && /Tutor\.ask/.test(weekJs) && /getAskThread/.test(weekJs) && /addAskMessage/.test(weekJs), "in-sheet Send continues the Ask AI thread");
assert(!/<a class="btn primary"[^>]*>Talk it through/.test(weekJs), "Talk it through is not the only way to continue");
assert(/helpComposerHtml/.test(weekJs) && /mode === "proofread"/.test(weekJs) && /feedback/.test(weekJs), "draft mode still has a reply box after feedback");
const helpBubbleFn = weekJs.slice(weekJs.indexOf("function helpBubbleHtml"), weekJs.indexOf("function helpLogHtml"));
assert(helpBubbleFn.includes("ask-bubble") && !/Edit/.test(helpBubbleFn) && !/Delete/.test(helpBubbleFn), "kid view: no Edit/Delete on help bubbles");
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
assert(/<h3>Locked<\/h3>/.test(crewJs) && /Keep the streak going/.test(crewJs), "locked crew cards stay nameless");
assert(/class="char-sil"/.test(crewJs), "locked cards use char-sil");
const progressJs = fs.readFileSync(path.join(root, "js/progress.js"), "utf8");
assert(progressJs.includes("alreadyUnlocked") && progressJs.includes("progressTrophyListHtml"), "progress trophies use earned unlocks");
assert(progressJs.includes("progressCanMutate"), "progress hides mutate controls in kid view");
assert(weekJs.includes("maybeAwardSignIn"), "lobby should award Bennett on first open");
assert(/Unlocked by sign-in/.test(parentJs) && /Unlocks the first time he opens the site/.test(parentJs), "parent desk should label Bennett as unlocked-by-sign-in");
const weekHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const themeCss = fs.readFileSync(path.join(root, "css/theme.css"), "utf8");
assert(/admin-tabs/.test(themeCss) && /admin-tab\.on/.test(themeCss) && /body\.admin-page \.usage-panel h2/.test(themeCss), "Admin cards need selected tabs and distinct headers");
assert(/\.char-sil[\s\S]{0,220}brightness\(\s*0/.test(themeCss), "char-sil silhouette CSS exists");
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
assert(/theme\.css\?v=97/.test(weekHtml) && /week\.js\?v=97/.test(weekHtml) && /game\.js\?v=97/.test(weekHtml) && /telemetry\.js\?v=97/.test(weekHtml), "index should cache-bust css/js");
const weekMobileStart = themeCss.indexOf("@media (max-width: 719px)");
assert(weekMobileStart >= 0, "phone-width breakpoint exists");
const weekMobileNext = themeCss.indexOf("@media (max-width: 719px)", weekMobileStart + 1);
const weekMobileCss = themeCss.slice(weekMobileStart, weekMobileNext > 0 ? weekMobileNext : weekMobileStart + 1800);
assert(/html:has\(body\.week-page\)/.test(weekMobileCss) && /overflow-y:\s*auto/.test(weekMobileCss), "week-page mobile CSS allows vertical page overflow");
const weekMobileLock = weekMobileCss.match(/html:has\(body\.week-page\),\s*body\.week-page\s*\{[^}]+\}/);
assert(weekMobileLock && /overflow-y:\s*auto/.test(weekMobileLock[0]) && !/overflow:\s*hidden/.test(weekMobileLock[0]), "week-page mobile is not overflow:hidden only");
assert(/standing-classes[\s\S]*max-height:\s*min\(\s*22vh/.test(weekMobileCss), "class lobby shrinks on mobile so assignments fit");
assert(/body\.week-page \.day[\s\S]*overflow:\s*visible/.test(weekMobileCss) && /body\.week-page \.card-scroll[\s\S]*overflow:\s*visible/.test(weekMobileCss), "day/card/card-scroll do not trap vertical scroll on mobile");
assert(/safe-area-inset-bottom/.test(weekMobileCss), "mobile week-page keeps home-indicator padding");
const actBind = weekJs.slice(weekJs.indexOf('track.querySelectorAll("[data-act]")'), weekJs.indexOf('track.querySelectorAll("[data-ask]")'));
assert(/refreshCardsInPlace|restoreBoardScroll/.test(actBind), "Done/Undo restores scroll");
assert(!/goTo\(dayIndex,\s*true\)/.test(actBind), "Done/Undo does not call goTo snap");
assert(/function captureBoardScroll/.test(weekJs) && /window\.scrollY/.test(weekJs) && /scrollLeft/.test(weekJs) && /card-scroll/.test(weekJs), "in-card updates remember page, track, and card-scroll positions");
assert(!/scrollIntoView/.test(weekJs), "week actions must not scrollIntoView");
const restoreFn = weekJs.slice(weekJs.indexOf("function restoreBoardScroll"), weekJs.indexOf("function refreshCardsInPlace"));
assert(!/\.snap/.test(restoreFn) && !/goTo\(/.test(restoreFn), "restore does not snap or goTo");
const reflectSend = weekJs.slice(weekJs.indexOf('getElementById("reflect-send")'), weekJs.indexOf("function clampDay"));
assert(/refreshCardsInPlace/.test(reflectSend) && !/goTo\(dayIndex,\s*true\)/.test(reflectSend), "reflection send does not snap");
assert(/function goTo/.test(weekJs) && /goTo\(dayIndex - 1\)/.test(weekJs) && /goTo\(dayIndex \+ 1\)/.test(weekJs), "Prev/Next day swipe still uses goTo");
assert(/canvas-check/.test(weekJs) && /Canvas check/.test(weekJs), "Canvas check lives in week.js so Bennett sees it");
assert(/Canvas already has this/.test(weekJs), "submitted Canvas callout is on This Week");
assert(/Class time Tuesday/.test(weekJs) && /Canvas due Thursday/.test(weekJs), "comics show class time and Canvas due");
assert(/canvasFactsHtml/.test(weekJs) && /data-work-detail/.test(weekJs), "comic tap and A little help surface Canvas rubric");
assert(!/canvas-check/.test(adminJs), "Canvas check is not Admin-only");
const usageBlock = adminHtml.slice(adminHtml.indexOf('id="usage-panel"'), adminHtml.indexOf('id="spend-panel"'));
assert(/data-usage-who="all"/.test(usageBlock) && />All</.test(usageBlock), "usage who-filter includes All");
assert(/data-usage-who="bennett"/.test(usageBlock) && />Bennett</.test(usageBlock), "usage who-filter includes Bennett");
assert(/data-usage-who="orin"/.test(usageBlock) && />Orin</.test(usageBlock), "usage who-filter includes Orin");
assert(/data-usage-who="parent"/.test(usageBlock) && />Mom</.test(usageBlock), "usage who-filter includes Mom");
assert(/filterUsageEvents/.test(adminJs) && /e\.role === usageWho/.test(adminJs), "usage who-filter scopes events by role");
assert(/id="usage-queries"/.test(usageBlock) && />Queries</.test(usageBlock), "Usage tab hosts the Queries block");
const progressHtml = fs.readFileSync(path.join(root, "progress.html"), "utf8");
assert(/progress\.js\?v=97/.test(progressHtml) && /theme\.css\?v=97/.test(progressHtml), "Progress should cache-bust css/js");
assert(/week-chip/.test(progressHtml) && /crew-chip/.test(progressHtml), "Progress keeps This Week / Characters");
assert(/Ask AI/.test(progressJs), "Progress keeps Ask AI");
assert(/build:\s*95/.test(fs.readFileSync(path.join(root, "js/build.js"), "utf8")), "BW_BUILD should bump two steps");
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
Game.setSiteView("me");
const previewBananas = Game.getBananas(pack);
assert(previewBananas >= 200, "Me still sees the preview banana dump");
Game.setSiteView("bennett");
assert(!Game.alreadyUnlockedCharacter("ace"), "kid view + preview-all must not treat Ace as earned");
assert(!Game.alreadyUnlockedGear("angle-finder") && !Game.alreadyUnlockedGear("first-serve"), "kid view + preview-all must not treat gear as earned");
assert(!Game.alreadyUnlockedContent("ace-frog") && !Game.alreadyUnlockedContent("riff-bird") && !Game.alreadyUnlockedContent("scorch-spider"), "kid view + preview-all must not treat fight clips as earned");
assert(!Game.alreadyUnlockedCharacter("bennett") && !Game.alreadyUnlocked("signin-bennett"), "preview Bennett is not earned in kid view");
assert(Game.getBananas(pack) < 50, "preview-all 298 must not show when Preview → Bennett");
assert.strictEqual(Game.getBananas(pack), Game.kidBananas(pack), "getBananas is kid-safe in kid view");
const kidFinds = Game.progressTrophyListHtml(pack.achievements);
assert(/No trophies yet/.test(kidFinds), "kid empty copy is No trophies yet");
assert(!/Undo award/.test(kidFinds) && !/>Edit</.test(kidFinds), "kid view progress HTML has no Undo award / Edit");
assert(!Game.progressCanMutate(), "kid view cannot mutate progress");
assert.strictEqual(Game.entryButtons("pclass:x", "pclass:x"), "", "kid view hides class edit");
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
["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-content-unlocks", "bw-preview-all", "bw-preview-ids", "bw-preview-locked", "bw-signin-seen", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
const parentAce = Game.awardStreak(pack, Game.emptyFamily(), "test-ace-closer");
Game.setSiteView("bennett");
assert(Game.alreadyUnlockedCharacter("ace"), "parent Award button unlocks should show in Bennett's treehouse");
const earnedFinds = Game.progressTrophyListHtml(pack.achievements);
assert(/Meet Ace/.test(earnedFinds), "earned Ace still lists on Progress");
assert(!/Undo award/.test(earnedFinds) && !/>Edit</.test(earnedFinds), "earned Progress rows still have no Undo award / Edit");
Game.setSiteView("me");
assert(parentAce.freshCharacter, "Meet Ace Award is a real unlock");
const meFinds = Game.progressTrophyListHtml(pack.achievements);
assert(/Undo award/.test(meFinds) && />Edit</.test(meFinds), "Me progress still has Edit / Undo award");
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
const gameSrc = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const undoFn = gameSrc.slice(gameSrc.indexOf("async function playUndoSound"), gameSrc.indexOf("function bindUndoCue"));
assert(!/tablesloud/.test(undoFn) && !/tablesloud\.mp3/.test(undoFn), "playUndoSound must never fall back to tablesloud");
assert(/undo-click|undo\.wav|SHIPPED_UNDO/.test(undoFn), "playUndoSound falls back to the shipped undo wav");
const mountFn = gameSrc.slice(gameSrc.indexOf("function mountSiteViewControl"), gameSrc.indexOf("function hideAdultShortcuts"));
assert(/siteViewFromRole\(\s*telemetryDeviceRole\(\)\s*\)/.test(mountFn), "preview switch hide uses the device telemetry role");
assert(!/siteView\(\)\s*===\s*["']bennett["']/.test(mountFn), "do not hide the switch from the current preview view");
assert(/setAttribute\("aria-label", "Preview as"\)/.test(gameSrc), "preview switch is labeled Preview as, not a login");
assert(!Game.siteViewHidesAdult("me") && Game.siteViewHidesAdult("bennett") && Game.siteViewHidesAdult("mom"), "Bennett and Mom hide adult chrome");
assert(Game.shouldGateAdultPage("admin.html", "bennett") && Game.shouldGateAdultPage("parent.html", "mom") && Game.shouldGateAdultPage("refs.html", "bennett"), "kid views bounce adult desks");
assert(!Game.shouldGateAdultPage("index.html", "bennett") && !Game.shouldGateAdultPage("admin.html", "me"), "Me keeps Admin; kid views keep This Week");
assert(fs.existsSync(path.join(root, "messages.html")), "messages.html exists");
assert(fs.existsSync(path.join(root, "js/messages.js")), "messages.js exists");
assert(!Game.shouldGateAdultPage("messages.html", "mom") && !Game.shouldGateAdultPage("messages.html", "bennett") && !Game.shouldGateAdultPage("messages.html", "me"), "Mom view does not gate Messages");
assert(Game.shouldBounceMessagesPage("messages.html", "bennett") && !Game.shouldBounceMessagesPage("messages.html", "mom") && !Game.shouldBounceMessagesPage("messages.html", "me"), "Bennett hitting Messages bounces to This Week");
assert(/html\[data-site-view="bennett"\][\s\S]*\.messages-chip/.test(themeCss), "Bennett CSS hides the Messages chip");
assert(!/html\[data-site-view="mom"\] a\[href="messages\.html"\]/.test(themeCss), "Mom CSS must not hide messages.html");
assert(/Inbox is now/.test(parentHtml) && parentHtml.includes("messages.html"), "parent desk points Inbox to Messages");
assert(/Mom\/Dad replied:/.test(weekJs), "Bennett cards show Mom/Dad replied bubbles");
assert(/family_notes/.test(fs.readFileSync(path.join(root, "js/telemetry.js"), "utf8")), "notes sync uses family_notes");
assert(/family_notes/.test(fs.readFileSync(path.join(root, "scripts/telemetry.sql"), "utf8")), "telemetry SQL can create family_notes");
const askFam = Game.emptyFamily();
askFam.notes = [{
  id: "q-classes",
  from: "bennett",
  kind: "question",
  text: "do I need to change classes?",
  targetType: "event",
  targetId: "tue-item",
  at: "2026-08-18T14:00:00-05:00"
}];
const askWeek = { work: [], events: [{ id: "tue-item", title: "Tuesday calendar", start: "2026-08-18T09:00:00" }] };
assert.strictEqual(Game.unansweredAskCount(askFam), 1, "unanswered Bennett ask counts for the badge");
const inboxHtml = Game.messagesInboxHtml(askFam, askWeek);
assert(/Send reply/.test(inboxHtml) && /do I need to change classes/.test(inboxHtml), "unanswered asks render a Send reply control");
const repliedFam = Game.sendParentReply(askFam, "q-classes", "Stay in the class unless the counselor says move.");
assert.strictEqual(Game.unansweredAskCount(repliedFam), 0, "a parent reply on that target clears the badge");
assert(!/Send reply/.test(Game.messagesInboxHtml(repliedFam, askWeek)), "answered threads do not keep Send reply");
assert(/Mom\/Dad replied/.test(Game.messagesInboxHtml(repliedFam, askWeek)), "answered thread shows the parent reply");

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
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
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
const messagesChip = fakeEl("a");
messagesChip.className = "messages-chip";
const basecampChip = fakeEl("a");
basecampChip.className = "basecamp-chip";
document.body = fakeEl("body");
document.documentElement = fakeEl("html");
document.createElement = fakeEl;
document.getElementById = () => null;
document.querySelector = (sel) => (sel === ".hud-nav" ? hud : null);
document.querySelectorAll = (sel) => {
  if (sel === ".hud-nav") return [hud];
  if (String(sel).indexOf("admin-chip") >= 0) return [adminChip, parentChip, refsChip];
  if (String(sel).indexOf("messages-chip") >= 0) return [messagesChip];
  if (String(sel).indexOf("basecamp-chip") >= 0) return [basecampChip];
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
assert(messagesChip.hidden, "Bennett view hides the Messages chip");
assert(!basecampChip.hidden, "Bennett kid view can reach Base Camp");
assert(!Game.shouldGateAdultPage("basecamp.html", "bennett"), "Base Camp is not an adult desk");
assert(Game.audioAllowed(), "Bennett still hears audio");
assert(Game.playSoundCue(Game.setSoundCue(Game.emptyFamily(), "tables", "honk"), funLib, "tables"), "Bennett table cue still plays");
assert(Game.playSoundCue(Game.emptyFamily(), null, "undo"), "Bennett hears the shipped undo click");

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
assert(!messagesChip.hidden, "Mom view shows the Messages chip");
assert.strictEqual(Game.playSoundCue(Game.setSoundCue(Game.emptyFamily(), "tables", "honk"), funLib, "tables"), false, "mom table cue is a no-op");
assert.strictEqual(Game.honk(), false, "mom honk is a no-op");
assert.strictEqual(Game.playRandomLibraryItem(funLib), null, "mom library play is a no-op");
assert.strictEqual(Game.playLibraryItem({ id: "honk", kind: "audio", synth: "honk" }), false, "mom library synth is a no-op");

store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "bennett" });
assert.strictEqual(typeof Game.telemetryDeviceRole, "function");
assert.strictEqual(Game.siteViewFromRole(Game.telemetryDeviceRole()), "bennett");
Game.setSiteView("bennett");
assert.strictEqual(Game.mountSiteViewControl(), null, "mountSiteViewControl omits the switch on a bennett device");
assert(!hud.querySelector(".site-view"), "bennett device omits site-view HTML");
assert(!hud.children.some((c) => /site-view-btn|Preview/.test(c.innerHTML || "")), "bennett phone has no Preview · Me · Bennett · Mom");

store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "orin" });
Game.setSiteView("bennett");
const orinSwitch = hud.querySelector(".site-view") || Game.mountSiteViewControl();
assert(orinSwitch && /data-site-view="me"/.test(orinSwitch.innerHTML) && /data-site-view="bennett"/.test(orinSwitch.innerHTML) && /data-site-view="mom"/.test(orinSwitch.innerHTML), "orin device keeps the switch while previewing Bennett");

store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "parent" });
const parentSwitch = Game.mountSiteViewControl();
assert(parentSwitch && /data-site-view="mom"/.test(parentSwitch.innerHTML), "parent device still shows the preview switch");

store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "orin" });

Game.setSiteView("me");
assert.strictEqual(Game.siteView(), "me");
assert(Game.audioAllowed(), "Me allows audio again");
assert(!adminChip.hidden, "Me shows Admin again");
document.createElement = prevCreate;
document.querySelectorAll = prevAll;
document.querySelector = prevOne;
document.getElementById = prevGet;
document.body = prevBody;
document.documentElement = prevRoot;

(async () => {
  const askCalls = [];
  ctx.fetch = async (url, init) => {
    askCalls.push({ url: String(url), headers: (init && init.headers) || {}, body: init && init.body });
    if (String(url).indexOf("/functions/v1/ask") >= 0) {
      return { ok: true, json: async () => ({ reply: "What's the first serve?", live: true, source: "xai" }) };
    }
    throw new Error("no local ask");
  };
  const liveAsk = await Tutor.ask({
    title: "English 10",
    className: "English 10",
    classId: "english-10",
    messages: [{ role: "bennett", text: "help" }],
    images: [{ mime: "image/jpeg", data: "ZmFrZQ" }]
  });
  assert.strictEqual(liveAsk.reply, "What's the first serve?", "live Ask AI should use the family-token function first");
  assert.strictEqual(askCalls[0] && askCalls[0].headers["x-family-token"], "fam", "live Ask AI should send x-family-token");
  assert(!askCalls.some((row) => row.url === "/api/ask"), "live Ask AI should not fall through when the function replies");
  const liveBody = askCalls[0] && askCalls[0].body ? JSON.parse(String(askCalls[0].body)) : {};
  assert.strictEqual(liveBody.className, "English 10", "tutor posts className");
  assert(Array.isArray(liveBody.images) && liveBody.images[0] && liveBody.images[0].data === "ZmFrZQ", "tutor posts images field");

  askCalls.length = 0;
  delete store["bw-telemetry"];
  ctx.fetch = async (url, init) => {
    askCalls.push({ url: String(url), headers: (init && init.headers) || {} });
    if (String(url).indexOf("/functions/v1/ask") >= 0) {
      return { ok: true, json: async () => ({ reply: "What's one first move?", live: true, source: "xai" }) };
    }
    throw new Error("no local ask");
  };
  const noTokenAsk = await Tutor.ask({ title: "English 10", messages: [{ role: "bennett", text: "help" }] });
  assert.strictEqual(noTokenAsk.reply, "What's one first move?", "Bennett with no Connect still hits the live ask function");
  assert(askCalls[0] && String(askCalls[0].url).indexOf("/functions/v1/ask") >= 0, "tutor.js posts to the ask function even when no family token");
  assert(!askCalls[0].headers["x-family-token"], "no family token means no x-family-token header");
  assert(noTokenAsk.live === true && noTokenAsk.source === "xai", "no-token Pages ask is a live mentor reply, not testAsk");
  assert(!askCalls.some((row) => row.url === "/api/ask"), "no-token live ask should not fall through when the function replies");

  askCalls.length = 0;
  const noTokenHelp = await Tutor.request({ title: "English 10: Finish summer comic strips", note: "from class", mode: "nudge" });
  assert.strictEqual(noTokenHelp.live, true, "A little help should use the live mentor with no family token");
  assert(askCalls.some((row) => String(row.url).indexOf("/functions/v1/ask") >= 0), "A little help posts to the ask function even when no family token");
  store["bw-telemetry"] = JSON.stringify({ url: "https://example.supabase.co", anonKey: "anon", familyToken: "fam", role: "orin" });

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

  localStorage.removeItem("bw-family");
  localStorage.removeItem("bw-mom-library");
  assert(!Game.getFamilyDraft(), "first visit has no family pack");
  assert(!Game.getMomLibrary(), "first visit has no library draft");
  assert(await Game.playUndoSound(), "playUndoSound plays the shipped undo wav with no family pack");

  console.log("check-content-library: ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
