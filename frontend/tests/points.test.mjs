// Jalankan: npm test  (Node >= 22.18 membaca file .ts langsung)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activitiesDone,
  activityPoints,
  attemptsLeft,
  availableBadges,
  earnedBadges,
  formatVisitDuration,
  isOutOfAttempts,
  poiStatus,
  quizPoints,
  totalPoints,
} from "../src/domain/points.ts";

const s = (completed, failed, attempts, closed = true) => ({ completed, failed, attempts, closed });
const challenge = (success, attempts, points) => ({
  ...s(true, false, 0),
  challengeDone: true,
  challengeAttempts: attempts,
  challengePoints: success ? points : 0,
});

test("poin kuis 20/10/5/0 sesuai percobaan", () => {
  assert.equal(quizPoints(s(true, false, 1)), 20);
  assert.equal(quizPoints(s(true, false, 2)), 10);
  assert.equal(quizPoints(s(true, false, 3)), 5);
  assert.equal(quizPoints(s(false, true, 3)), 0);
  assert.equal(quizPoints(s(false, false, 1)), 0);
});

test("maksimal 3 percobaan", () => {
  assert.equal(attemptsLeft(s(false, false, 0)), 3);
  assert.equal(attemptsLeft(s(false, false, 2)), 1);
  assert.equal(attemptsLeft(s(true, false, 1)), 0);
  assert.equal(isOutOfAttempts(2), false);
  assert.equal(isOutOfAttempts(3), true);
});

test("status POI belum/sebagian/selesai", () => {
  assert.equal(poiStatus(undefined, false), "belum");
  assert.equal(poiStatus(undefined, true), "sebagian");
  assert.equal(poiStatus(s(false, false, 0, true), false), "sebagian");
  assert.equal(poiStatus(s(true, false, 1), false), "selesai");
  assert.equal(poiStatus(s(false, true, 3), false), "selesai");
});

test("daftar lencana sesuai sheet Badge_Poin dan profil", () => {
  const umum = availableBadges({ kid: false, oldSheet: true }).map((b) => b.id);
  const anak = availableBadges({ kid: true, oldSheet: true }).map((b) => b.id);
  // Prioritas rendah (sayap kanan) hanya tampil bila sayap kanan dibuka.
  assert.equal(umum.includes("BD-05") || umum.includes("BD-08") || umum.includes("BD-09"), false);
  assert.equal(availableBadges({ rightWing: true, oldSheet: true }).some((b) => b.id === "BD-05"), true);
  // Anak tidak mengerjakan quest foto: tanpa Pemburu Foto dan Fotografer Cilik; ada Penjelajah Cilik.
  assert.equal(anak.includes("BD-02") || anak.includes("BD-14"), false);
  assert.equal(anak.includes("BD-15"), true);
  assert.equal(umum.includes("BD-15"), false);
});

test("lencana dari quest per POI dan total poin tidak ganda", () => {
  const pois = [
    { id: "a", wing: "left", code: "P03", quest: "foto" },
    { id: "b", wing: "left", code: "P04", quest: "kuis" },
    { id: "c", wing: "left", code: "P05", quest: "kuis" },
    { id: "d", wing: "left", code: "P08", quest: "kuis" },
  ];
  const old = { oldSheet: true };
  assert.deepEqual(earnedBadges(pois, {}, old), []);
  const one = { b: challenge(true, 1, 10) };
  assert.deepEqual(earnedBadges(pois, one, old), ["BD-06"]);
  assert.equal(totalPoints(pois, one, old), 10 + 10);
  const all = {
    a: challenge(true, 0, 20),
    b: challenge(true, 1, 10),
    c: challenge(true, 1, 10),
    d: challenge(true, 1, 20),
  };
  assert.deepEqual(earnedBadges(pois, all, old), ["BD-01", "BD-02", "BD-03", "BD-04", "BD-06", "BD-07"]);
  assert.equal(totalPoints(pois, all, old), 60 + 50 + 30 + 40 + 100 + 10 + 30);
  // Sheet terbaru: hanya BD-01 s.d. BD-04.
  assert.deepEqual(earnedBadges(pois, all), ["BD-01", "BD-02", "BD-03", "BD-04"]);
});

test("anak: POI quest foto jadi cerita saja; Penjelajah Cilik di 2 POI", () => {
  const pois = [
    { id: "a", wing: "left", code: "P01", quest: null },
    { id: "b", wing: "left", code: "P02", quest: "quiz" },
    { id: "c", wing: "left", code: "P04", quest: "kuis" },
  ];
  const states = { a: s(true, false, 0), b: s(true, false, 2), c: challenge(true, 2, 10) };
  const ids = earnedBadges(pois, states, { kid: true, oldSheet: true });
  assert.deepEqual(ids, ["BD-01", "BD-04", "BD-06", "BD-15"]);
  assert.equal(earnedBadges(pois, states, { kid: true, questDays: 3, oldSheet: true }).includes("BD-11"), true);
});

test("poin aktivitas sheet: check-in 10, cerita 5, percobaan pertama 5, POI tuntas 10", () => {
  assert.equal(activityPoints(undefined), 0);
  assert.equal(activityPoints({ ...s(false, false, 0, false), checkedIn: true }), 10);
  assert.equal(activityPoints({ ...s(false, false, 0, true), checkedIn: true }), 15);
  assert.deepEqual(activitiesDone({ ...s(true, false, 1), checkedIn: true }), ["checkIn", "story", "firstTry", "poiDone"]);
  assert.equal(activityPoints({ ...s(true, false, 1), checkedIn: true }), 30);
  assert.equal(activityPoints({ ...s(true, false, 2), checkedIn: true }), 25);
  // Tantangan benar di percobaan pertama juga dapat bonus; foto (0 percobaan) tidak.
  assert.ok(activitiesDone({ ...s(true, false, 0), challengeSuccess: true, challengeAttempts: 1 }).includes("firstTry"));
  assert.ok(!activitiesDone({ ...s(true, false, 0), challengeSuccess: true, challengeAttempts: 0 }).includes("firstTry"));
});

test("sheet terbaru: lencana aktif BD-01 s.d. BD-04, sheet lama ditahan; Geolog Sejati = sayap kiri", () => {
  assert.deepEqual(availableBadges({ kid: false }).map((b) => b.id), ["BD-01", "BD-02", "BD-03", "BD-04"]);
  assert.deepEqual(availableBadges({ kid: true }).map((b) => b.id), ["BD-01", "BD-03", "BD-04"]);
  const pois = [
    { id: "a", wing: "left", code: "P01", quest: "quiz" },
    { id: "b", wing: "right", code: "P12", quest: "quiz" },
  ];
  const states = { a: s(true, false, 1) };
  assert.ok(earnedBadges(pois, states).includes("BD-04"));
  assert.ok(!earnedBadges(pois, states, { rightWing: true }).includes("BD-04"));
});

test("format durasi kunjungan (menit dan jam)", () => {
  const now = 1700000000000;
  // Fallback default bila belum ada start time
  assert.equal(formatVisitDuration(null, now), "15 menit");
  assert.equal(formatVisitDuration(undefined, now), "15 menit");
  // Kurang dari 1 jam
  assert.equal(formatVisitDuration(now - 10 * 60_000, now), "10 menit");
  assert.equal(formatVisitDuration(now - 45 * 60_000, now), "45 menit");
  // Pas 1 jam
  assert.equal(formatVisitDuration(now - 60 * 60_000, now), "1 jam");
  // Lebih dari 1 jam
  assert.equal(formatVisitDuration(now - 75 * 60_000, now), "1 jam 15 menit");
  assert.equal(formatVisitDuration(now - 120 * 60_000, now), "2 jam");
});

test("PB12 acceptance: aturan gating quest dan batas 3 percobaan", () => {
  // Gating verifikasi: masa berlaku verifikasi (15 menit)
  const now = 1700000000000;
  const verifiedActive = { verifiedUntil: now + 10 * 60_000 };
  const verifiedExpired = { verifiedUntil: now - 1 * 60_000 };
  const unverified = { verifiedUntil: null };

  const isVerifiedCheck = (state, atMs) => state.verifiedUntil !== null && state.verifiedUntil > atMs;

  assert.equal(isVerifiedCheck(verifiedActive, now), true, "Quest terbuka saat di checkpoint aktif");
  assert.equal(isVerifiedCheck(verifiedExpired, now), false, "Quest terkunci saat verifikasi kedaluwarsa");
  assert.equal(isVerifiedCheck(unverified, now), false, "Quest terkunci di luar checkpoint");

  // Percobaan & hint: percobaan 1-2 menghasilkan hint bila salah, percobaan 3 gagal permanen
  assert.equal(attemptsLeft(s(false, false, 0)), 3);
  assert.equal(attemptsLeft(s(false, false, 1)), 2);
  assert.equal(attemptsLeft(s(false, false, 2)), 1);
  assert.equal(attemptsLeft(s(false, false, 3)), 0);
  assert.equal(isOutOfAttempts(3), true, "Percobaan ke-3 salah = kesempatan habis (failed)");
});

