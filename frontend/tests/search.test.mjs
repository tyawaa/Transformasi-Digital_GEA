import assert from "node:assert/strict";
import { test } from "node:test";
import { museumPois } from "../src/data/museum.ts";
import { buildSearchIndex, editDistance, searchMuseum } from "../src/features/search/search.ts";

const index = buildSearchIndex(museumPois);
const first = (query, room = null) => searchMuseum(index, query, room)[0];

test("hasil baru muncul setelah 3 huruf", () => {
  assert.equal(searchMuseum(index, "").length, 0);
  assert.equal(searchMuseum(index, "ka").length, 0);
  assert.ok(searchMuseum(index, "kar").length > 0);
});

test("menemukan ruang dan koleksi", () => {
  assert.equal(first("kars").roomCode, "P02");
  assert.equal(first("kars").kind, "ruang");
  const lapis = first("lapis lazuli");
  assert.equal(lapis.kind, "koleksi");
  assert.equal(lapis.roomCode, "P07");
  assert.equal(first("coelacanth").roomCode, "P14");
});

test("toleran salah ketik ringan", () => {
  assert.equal(editDistance("gunugn", "gunung"), 1);
  assert.equal(first("gunug api").roomCode, "P03");
  assert.equal(first("stalaktti").roomCode, "P02");
  assert.equal(first("batubra").roomCode, "P11");
  assert.equal(searchMuseum(index, "xyzqw").length, 0);
});

test("bisa disaring per ruang", () => {
  const all = searchMuseum(index, "sekis");
  assert.ok(new Set(all.map((hit) => hit.roomCode)).size > 1);
  const p10 = searchMuseum(index, "sekis", "P10");
  assert.ok(p10.length > 0);
  assert.ok(p10.every((hit) => hit.roomCode === "P10"));
});

test("tidak memasukkan isian yang bukan koleksi", () => {
  assert.ok(!index.some((item) => item.text === "video"));
  assert.ok(!index.some((item) => item.text.includes("display kosong")));
});
