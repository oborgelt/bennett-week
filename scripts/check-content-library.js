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

const kinds = new Set(["image", "video", "audio", "link"]);
const groups = new Set(["ace", "riff", "scorch", "crew", "fun"]);
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

const honk = library.items.find((item) => item.id === "banana-honk");
assert(honk, "TEST Banana honk seed is missing");
assert(honk.test === true, "Banana honk should be TEST");
assert(honk.kind === "audio", "Banana honk should be audio");
assert(honk.character === "fun", "Banana honk should sit on Fun / Sounds");
assert(honk.synth === "honk", "Banana honk should be a generated beep");
assert(!honk.path && !honk.url, "Banana honk must not point at a third-party file");

const reward = (achievements.achievements || []).find((a) => a.id === "test-banana-honk");
assert(reward, "TEST Banana honk achievement is missing");
assert(reward.rewardUnlock && reward.rewardUnlock.type === "content", "Banana honk reward should be content");
assert(reward.rewardUnlock.id === "banana-honk", "Banana honk reward should unlock banana-honk");
assert(!banned.test(JSON.stringify(reward)), "achievement seed must not invent ITYSL lines");

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
  BW_BUILD: { build: 33, modified: "2026-08-15T13:35:00-05:00" }
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
assert(english.grade && english.grade.display, "keep English TEST grade");
assert(band.grade && band.grade.display, "keep Band TEST grade");
assert((english.items || []).length >= 3, "keep existing English progress items");
assert((band.items || []).length >= 2, "keep existing Band progress items");
assert.deepStrictEqual(english.khan, ["ela", "grammar"], "English maps to ELA + grammar");
assert(!band.khan, "Band has no Khan course");
assert.strictEqual(band.period, "P1");
assert.strictEqual(english.period, "P6");
assert.strictEqual(byId.chemistry.time, "10:55–12:10");
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

const norm = Game.normalizeLibrary(library);
assert(norm.items.some((item) => item.id === "banana-honk"), "normalizeLibrary dropped Banana honk");
assert.strictEqual(Game.inferKind("img/library/foo.mp3", "", ""), "audio");
assert.strictEqual(Game.labelFromFilename("my-cool_honk.mp3"), "My Cool Honk");
assert.strictEqual(Game.labelFromFilename("TEST-beep.wav"), "TEST Beep");
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

const pack = {
  currency: achievements.currency,
  achievements: achievements.achievements
};
let family = Game.emptyFamily();
const awarded = Game.awardStreak(pack, family, "test-banana-honk");
assert(awarded.freshContent, "awarding Banana honk should unlock content");
assert(Game.alreadyUnlockedContent("banana-honk"), "content unlock should persist");
family = awarded.family;
assert(family.contentUnlocks["banana-honk"], "family pack should carry the content unlock");

const exported = Game.exportPack(pack, family, Game.defaultCharacters(), norm);
assert.strictEqual(exported.version, 7);
assert(exported.libraryBlobs && typeof exported.libraryBlobs === "object");
assert(exported.contentUnlocks["banana-honk"], "export should include content unlocks");
assert(exported.library.items.some((item) => item.id === "banana-honk" && item.kind === "audio"));
assert(!banned.test(JSON.stringify(exported)), "family pack seed must not invent ITYSL lines");

const revoked = Game.revokeAchievement(pack, family, "test-banana-honk");
assert(revoked.revokedContent, "undo award should lock the sound again");
assert(!Game.alreadyUnlockedContent("banana-honk"), "content should be locked after undo");

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
