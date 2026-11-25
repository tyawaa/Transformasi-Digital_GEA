import assert from "node:assert/strict";
import { test } from "node:test";
import { museumPois } from "../src/data/museum.ts";
import { extendedDeadline, extensionOptions, MINUTE_MS, suggestNextPoi, visitPrompt } from "../src/features/visit/lifecycle.ts";

const now = Date.parse("2026-11-25T14:00:00+07:00");
const closing = Date.parse("2026-11-25T16:00:00+07:00");

test("tambahan melanjutkan rencana, menghidupkan durasi kedaluwarsa, dan menyisakan waktu keluar", () => {
  assert.deepEqual(extensionOptions(now + 10 * MINUTE_MS, closing, now), [10, 20, 30]);
  assert.equal(extendedDeadline(now + 10 * MINUTE_MS, closing, now, 20), now + 30 * MINUTE_MS);
  assert.equal(extendedDeadline(now - 10 * MINUTE_MS, closing, now, 10), now + 10 * MINUTE_MS);
  assert.deepEqual(extensionOptions(closing - 25 * MINUTE_MS, closing, closing - 30 * MINUTE_MS), [10, 20]);
  assert.deepEqual(extensionOptions(closing, closing, now), []);
  assert.throws(() => extendedDeadline(closing - 10 * MINUTE_MS, closing, now, 10), RangeError);
});

test("pengingat jam tutup mengalahkan durasi pribadi dan rute selesai", () => {
  assert.equal(visitPrompt(now, now + 4 * MINUTE_MS, closing, true), "time_soon");
  assert.equal(visitPrompt(now, now, closing, true), "time_up");
  assert.equal(visitPrompt(now, now + 60 * MINUTE_MS, closing, true), "route_done");
  assert.equal(visitPrompt(closing - 15 * MINUTE_MS, now, closing, true), "closing_soon");
  assert.equal(visitPrompt(closing - 5 * MINUTE_MS, now, closing, true), "closing_prepare");
  assert.equal(visitPrompt(closing, now, closing, true), null);
});

test("rekomendasi memakai minat, waktu aktivitas dan perpindahan, tanpa mengubah data masukan", () => {
  const pois = Object.freeze(museumPois.filter((poi) => ["P01", "P03", "P07"].includes(poi.code)));
  const prefs = Object.freeze({ age: "18-24 Tahun", duration: "30-45 Menit", topics: ["Batuan & Mineral"] });
  const picked = suggestNextPoi(pois, prefs, null, 30 * MINUTE_MS);
  assert.equal(picked.poi.code, "P07");
  assert.match(picked.reason, /Batuan & Mineral/);
  assert.ok(picked.minutes > picked.poi.content.durasiMenit);
  assert.equal(suggestNextPoi(pois, prefs, null, MINUTE_MS), null);
});
