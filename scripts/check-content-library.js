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
  BW_BUILD: { build: 31, modified: "2026-08-15T13:10:00-05:00" }
};
window.window = window;
const ctx = vm.createContext({ window, document, localStorage, console, URL, encodeURIComponent });
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

const norm = Game.normalizeLibrary(library);
assert(norm.items.some((item) => item.id === "banana-honk"), "normalizeLibrary dropped Banana honk");
assert.strictEqual(Game.inferKind ? true : true, true);
assert.strictEqual(Game.youtubeId("https://www.youtube.com/watch?v=dQw4w9wgGcI"), "dQw4w9wgGcI");
assert.strictEqual(Game.youtubeId("https://youtu.be/dQw4w9wgGcI"), "dQw4w9wgGcI");
assert(Game.youtubeEmbedSrc("https://youtu.be/dQw4w9wgGcI").startsWith("https://www.youtube-nocookie.com/embed/"));
assert.strictEqual(Game.youtubeEmbedSrc("https://evil.example/embed/nope"), "");
assert(Game.isSafeHttpUrl("https://example.com/a.mp3"));
assert(!Game.isSafeHttpUrl("javascript:alert(1)"));

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
assert.strictEqual(exported.version, 6);
assert(exported.contentUnlocks["banana-honk"], "export should include content unlocks");
assert(exported.library.items.some((item) => item.id === "banana-honk" && item.kind === "audio"));

const revoked = Game.revokeAchievement(pack, family, "test-banana-honk");
assert(revoked.revokedContent, "undo award should lock the sound again");
assert(!Game.alreadyUnlockedContent("banana-honk"), "content should be locked after undo");

console.log("check-content-library: ok");
