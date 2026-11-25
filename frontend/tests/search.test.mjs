import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import photoHunt from "../assets/daftar_pencarian/photo-hunt/catalog.json" with { type: "json" };
import { museumPois } from "../src/data/museum.ts";
import { questCatalog } from "../src/data/quests.ts";
import { buildLocalizedSearchIndex, buildSearchIndex, editDistance, searchMuseum } from "../src/features/search/search.ts";
import { localizeCopy, localizedPoiName, localizedDuration } from "../src/data/localizedCopy.ts";
import { badges } from "../src/domain/points.ts";
import { ageOptions, topics } from "../src/features/preferences/recommend.ts";
import { durationOptions } from "../src/features/preferences/visitTiming.ts";

const index = buildSearchIndex(museumPois);
const first = (query, room = null) => searchMuseum(index, query, room)[0];

test("pencarian Inggris mempertahankan tujuan navigasi dan alias katalog Indonesia", () => {
  const english = buildLocalizedSearchIndex(museumPois, "en");
  for (const [query, code] of [["meteorite", "P09"], ["dacite", "P07"], ["tulang lengan", "P01"]]) {
    assert.equal(searchMuseum(english, query, null)[0].roomCode, code);
  }
  assert.deepEqual(english.map(({ kind, roomCode }) => ({ kind, roomCode })), index.map(({ kind, roomCode }) => ({ kind, roomCode })));
});

test("katalog lencana, ruangan, dan pilihan personalisasi memiliki terjemahan Inggris", () => {
  for (const badge of badges) {
    assert.notEqual(localizeCopy(badge.name, "en"), badge.name);
    assert.notEqual(localizeCopy(badge.description, "en"), badge.description);
  }
  for (const poi of museumPois) assert.ok(localizedPoiName(poi, "en").length > 0);
  for (const value of [...ageOptions, ...durationOptions, ...topics.map(({ label }) => label)]) {
    assert.notEqual(localizeCopy(value, "en"), value);
  }
  assert.equal(localizedDuration("1 jam 15 menit", "en"), "1 hr 15 min");
});

test("hasil baru muncul setelah 3 huruf", () => {
  assert.equal(searchMuseum(index, "").length, 0);
  assert.equal(searchMuseum(index, "ka").length, 0);
  assert.ok(searchMuseum(index, "kar").length > 0);
});

test("menemukan ruang, koleksi Photo Hunt, dan kode POI", () => {
  assert.equal(first("kars").roomCode, "P02");
  assert.equal(first("kars").kind, "ruang");
  const dasit = first("dasit");
  assert.equal(dasit.kind, "koleksi");
  assert.equal(dasit.roomCode, "P07");
  assert.equal(first("P14").roomCode, "P14");
  assert.equal(first("P07").kind, "poi");
  assert.equal(first("P07").roomCode, "P07");
  assert.equal(first("POI 4").roomCode, "P04");
});

test("toleran salah ketik ringan", () => {
  assert.equal(editDistance("gunugn", "gunung"), 1);
  assert.equal(first("gunug api").roomCode, "P03");
  assert.equal(first("obsidain").roomCode, "P03");
  assert.equal(first("meteort namibia").roomCode, "P09");
  assert.equal(searchMuseum(index, "xyzqw").length, 0);
});

test("bisa disaring per ruang", () => {
  const all = searchMuseum(index, "poi");
  assert.ok(new Set(all.map((hit) => hit.roomCode)).size > 1);
  const p10 = searchMuseum(index, "poi", "P10");
  assert.ok(p10.length > 0);
  assert.ok(p10.every((hit) => hit.roomCode === "P10"));
});

test("tujuh koleksi memakai foto referensi Photo Hunt asli dan tujuan quest yang sesuai", async () => {
  const collections = index.filter((entry) => entry.kind === "koleksi");
  assert.equal(collections.length, 7);
  for (const target of photoHunt) {
    const quest = questCatalog.find((quest) => quest.idQuest === target.questId);
    assert.ok(quest, target.questId);
    assert.equal(quest.type, "foto");
    const poi = museumPois.find((poi) => poi.code === target.poiCode);
    assert.equal(poi.idPoi, quest.idPoi);
    const entry = collections.find((entry) => entry.roomCode === target.poiCode);
    assert.equal(entry.label, target.name);
    const photo = await readFile(new URL(`../assets/daftar_pencarian/photo-hunt/${target.photoFile}`, import.meta.url));
    assert.equal(createHash("sha256").update(photo).digest("hex"), target.photoSha256);
  }
});

test("tidak memasukkan isian yang bukan koleksi", () => {
  assert.ok(!index.some((item) => item.text === "video"));
  assert.ok(!index.some((item) => item.text.includes("display kosong")));
});
