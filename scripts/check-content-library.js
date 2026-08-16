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
const parentHtml = fs.readFileSync(path.join(root, "parent.html"), "utf8");
assert(/test-angle-finder/.test(parentHtml) && /test-field-kit/.test(parentHtml) && /test-unplugged-strap/.test(parentHtml) && /test-daily-pick/.test(parentHtml), "parent desk fallback should list the four gear awards");
assert(/outfit/.test(parentHtml), "parent desk should offer an outfit reward type");
assert(adminHtml.includes("img/library/angle-finder.png") && adminHtml.includes("img/library/daily-pick.png"), "Admin file:// seed should include gear stills");
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
  addEventListener() {},
  getElementById() { return null; },
  createElement() {
    return { style: {}, className: "", id: "", classList: { add() {}, remove() {} }, appendChild() {}, querySelector() { return null; } };
  }
};
const window = {
  localStorage,
  document,
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
const crewJs = fs.readFileSync(path.join(root, "js/characters.js"), "utf8");
const parentJs = fs.readFileSync(path.join(root, "js/parent.js"), "utf8");
assert(/bennett:\s*\{/.test(weekJs), "trophy window slots should include bennett");
assert(crewJs.includes("markOpened") && crewJs.includes("maybeAwardSignIn"), "Characters page should sign in and award Bennett");
assert(weekJs.includes("maybeAwardSignIn"), "lobby should award Bennett on first open");
assert(/Unlocked by sign-in/.test(parentJs) && /Unlocks the first time he opens the site/.test(parentJs), "parent desk should label Bennett as unlocked-by-sign-in");
const weekHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const themeCss = fs.readFileSync(path.join(root, "css/theme.css"), "utf8");
["trophy-room.jpg", "trophy-pedestal.jpg", "trophy-cubbies.jpg", "trophy-pegboard.jpg", "trophy-lockers.jpg", "trophy-window.jpg"].forEach((name) => {
  const pathName = "img/library/" + name;
  assert(weekJs.includes(pathName) || weekHtml.includes(pathName) || themeCss.includes(pathName), "trophy room should use " + name);
});
assert(!/id="shelf-title"/.test(weekHtml) && !/id="shelf-manage"/.test(weekHtml), "Bennett's treehouse should not have a Trophy room header or Manage");
assert(!/id="trophy-rail"/.test(weekHtml) && !/id="trophy-manage"/.test(weekHtml), "Bennett's treehouse should not have a labeled rail or card grid");
assert(/id="trophy-leave"/.test(weekHtml) && /id="trophy-look-wide"/.test(weekHtml), "treehouse needs a full-room look layer and a leave control");
assert(/theme\.css\?v=/.test(weekHtml) && /week\.js\?v=/.test(weekHtml) && /game\.js\?v=/.test(weekHtml), "index should cache-bust css/js");
assert(!/trophyManage/.test(weekJs), "week.js should not keep a manage mode in Bennett's room");
assert(/trophy-plaque/.test(weekJs) && /prefersReducedMotion/.test(weekJs), "walk-up objects should open a plaque and respect reduced motion");
assert(/id="trophy-walkup"/.test(weekHtml) && /data-zone="window"/.test(weekHtml) && /data-zone="lockers"/.test(weekHtml), "wide room needs five walk-up lantern plaques");
assert(weekJs.includes("zoneFromStagePoint") && weekJs.includes("getBoundingClientRect()"), "a tap on the still must walk up from the stage viewport");
assert(weekJs.includes("walkUpFromControl") && /enterTrophyZone\(btn\.dataset\.zone\)/.test(weekJs), "walk-up plaques must call enterTrophyZone");
assert(!/setPointerCapture/.test(weekJs) && !weekJs.includes("hotspotFromEvent") && !weekJs.includes("elementFromPoint"), "trophy room must not capture the pointer or hit-test the look-layer glows");
assert((weekJs.match(/maybeAutoPreviewAll/g) || []).length >= 2, "preview should gap-fill on boot and when opening the trophy room");
assert(!/e\.pointerType !== "mouse"/.test(weekJs), "hover mouse-look should not pan the hotspot layer");
assert(/id="trophy-order-list"/.test(parentHtml), "parent desk should keep trophy drag-reorder");
assert(/theme\.css\?v=/.test(parentHtml) && /parent\.js\?v=/.test(parentHtml), "parent desk should cache-bust css/js");
assert(crewJs.includes("gearThumbHtml") && crewJs.includes("alreadyUnlockedGear"), "loadout should use real gear stills when unlocked");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-preview-all", "bw-preview-locked", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
const previewFamily = Game.emptyFamily();
const auto = Game.maybeAutoPreviewAll(pack, previewFamily);
assert(auto.ran, "first load with no crew/gear should auto-preview once");
assert(Game.alreadyUnlockedCharacter("ace") && Game.alreadyUnlockedCharacter("fuzz"), "preview should unlock the crew");
assert(Game.alreadyUnlockedCharacter("bennett") && Game.alreadyUnlocked("signin-bennett"), "preview / Unlock all should include Signed in → Bennett");
assert(Game.alreadyUnlockedGear("angle-finder") && Game.alreadyUnlockedGear("unplugged-strap") && Game.alreadyUnlockedGear("first-serve"), "preview should unlock gear");
assert(Game.alreadyUnlocked("straight-as-3w") && Game.alreadyUnlocked("hidden-banana"), "preview should award the other streaks");
assert.strictEqual(localStorage.getItem("bw-preview-all"), "1", "auto-preview should set bw-preview-all");
assert(!localStorage.getItem("bw-preview-locked"), "auto-preview should not lock rewards");
const afterAce = Game.revokeAchievement(pack, auto.family, "test-ace-closer");
assert(!Game.alreadyUnlockedCharacter("ace"), "undoing Meet Ace should lock Ace");
const gap = Game.maybeAutoPreviewAll(pack, afterAce.family);
assert(!gap.ran, "later boots should gap-fill quietly");
assert(Game.alreadyUnlockedCharacter("ace"), "gap-fill should restore missing preview crew");
const locked = Game.revokeAllPreview(pack, gap.family);
assert(!Game.alreadyUnlockedCharacter("ace") && !Game.alreadyUnlockedGear("angle-finder"), "Lock them back should revoke preview awards");
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

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-preview-all", "bw-preview-locked", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
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

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-preview-all", "bw-preview-locked", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
Game.markCharacterUnlocked("bennett");
const previewAfterBennett = Game.maybeAutoPreviewAll(pack, Game.emptyFamily());
assert(previewAfterBennett.ran, "Bennett-only unlock should not block auto-preview of the crew");
assert(Game.alreadyUnlockedCharacter("ace"), "auto-preview still unlocks teammates after Bennett signed in");

["bw-unlocks", "bw-character-unlocks", "bw-gear-unlocks", "bw-preview-all", "bw-preview-locked", "bw-bananas"].forEach((key) => localStorage.removeItem(key));
localStorage.removeItem("bw-family");
Game.markCharacterUnlocked("bennett");
localStorage.setItem("bw-preview-all", "1");
const orinGap = Game.maybeAutoPreviewAll(pack, Game.emptyFamily());
assert(!orinGap.ran, "a device that already saw preview should gap-fill without fanfare");
assert(Game.alreadyUnlockedCharacter("ace") && Game.alreadyUnlockedCharacter("riff") && Game.alreadyUnlockedCharacter("scorch"), "Orin-style preview-all + Bennett should still unlock the crew");
assert(Game.alreadyUnlockedCharacter("deuce") && Game.alreadyUnlockedCharacter("fuzz") && Game.alreadyUnlockedCharacter("bennett"), "gap-fill should include Deuce, Fuzz, and Bennett");
assert(Game.alreadyUnlockedGear("angle-finder") && Game.alreadyUnlockedGear("field-kit") && Game.alreadyUnlockedGear("unplugged-strap"), "gap-fill should include Angle Finder, Field Kit, Unplugged Strap");
assert(Game.alreadyUnlockedGear("daily-pick") && Game.alreadyUnlockedGear("notebook-holding") && Game.alreadyUnlockedGear("first-serve"), "gap-fill should include Daily Pick, Notebook of Holding, First Serve");

(async () => {
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
