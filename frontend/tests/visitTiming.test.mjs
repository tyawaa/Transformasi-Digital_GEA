import assert from "node:assert/strict";
import { test } from "node:test";
import { museumPois } from "../src/data/museum.ts";
import { recommendRoute } from "../src/features/preferences/recommend.ts";
import { formatCountdown, remainingVisitMs, visitWindow } from "../src/features/preferences/visitTiming.ts";

const start = Date.parse("2026-11-24T10:00:00+07:00");

test("durasi personalisasi dibatasi jam tutup WIB, termasuk pilihan lebih dari 1,5 jam", () => {
  for (const [choice, minutes] of [["< 30 menit", 30], ["30-45 Menit", 45], ["45 menit-1.5 Jam", 90]]) {
    const plan = visitWindow(choice, start);
    assert.equal(plan.endsAtMs, start + minutes * 60_000);
    assert.equal(plan.budgetMinutes, minutes);
    assert.equal(plan.closingLimited, false);
  }
  const nearClosing = Date.parse("2026-11-24T15:45:00+07:00");
  assert.deepEqual(visitWindow("30-45 Menit", nearClosing), {
    endsAtMs: Date.parse("2026-11-24T16:00:00+07:00"), budgetMinutes: 15, closingLimited: true,
  });
  assert.equal(visitWindow("> 1.5 jam", start).budgetMinutes, 360);
  assert.equal(visitWindow("< 30 menit", Date.parse("2026-11-24T17:00:00+07:00")).budgetMinutes, 0);
});

test("timer melanjutkan timestamp tersimpan dan berhenti di nol meskipun dibuka lagi esok hari", () => {
  const persisted = JSON.parse(JSON.stringify({ startedAt: start, duration: "< 30 menit" }));
  const plan = visitWindow(persisted.duration, persisted.startedAt);
  assert.equal(remainingVisitMs(plan.endsAtMs, start + 5 * 60_000), 25 * 60_000);
  assert.equal(remainingVisitMs(plan.endsAtMs, start + 31 * 60_000), 0);
  assert.equal(remainingVisitMs(plan.endsAtMs, start + 24 * 60 * 60_000), 0);
  assert.equal(formatCountdown(25 * 60_000), "25:00");
  assert.equal(formatCountdown(90 * 60_000 + 59_000), "1:30:59");
  assert.equal(formatCountdown(1), "00:01");
  assert.equal(formatCountdown(0), "00:00");
});

test("pilihan durasi dan timestamp invalid menghasilkan error yang jelas", () => {
  assert.throws(() => visitWindow("durasi salah", start), RangeError);
  assert.throws(() => visitWindow("< 30 menit", NaN), RangeError);
  assert.throws(() => visitWindow("< 30 menit", 1e30), RangeError);
  assert.throws(() => remainingVisitMs(Infinity, start), RangeError);
  assert.throws(() => formatCountdown(-1), RangeError);
});

test("rekomendasi rute memakai minat dan waktu yang sama untuk anak dan umum", () => {
  const available = Object.freeze(museumPois.filter((poi) => poi.content !== null).map((poi) => poi.code));
  const prefs = Object.freeze({ age: "18-24 Tahun", duration: "30-45 Menit", topics: Object.freeze(["Gunung Api & Gempa"]) });
  const adult = recommendRoute(prefs, available, new Date(start));
  const child = recommendRoute({ ...prefs, age: "7-12 Tahun" }, available, new Date(start));
  assert.ok(adult.codes.length > 0);
  assert.deepEqual(child, adult);
  assert.ok(adult.totalMinutes <= 45);
  const nearClosing = recommendRoute(prefs, available, new Date("2026-11-24T15:45:00+07:00"));
  assert.ok(nearClosing.totalMinutes <= 15);
  assert.equal(nearClosing.closingLimited, true);
  const afterClosing = recommendRoute(prefs, available, new Date("2026-11-24T17:00:00+07:00"));
  assert.deepEqual(afterClosing.codes, []);
});
