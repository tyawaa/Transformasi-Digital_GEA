// Jalankan: npm test  (Node >= 22.18 membaca file .ts langsung)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attemptsLeft,
  availableBadges,
  earnedBadges,
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
  const umum = availableBadges({ kid: false }).map((b) => b.id);
  const anak = availableBadges({ kid: true }).map((b) => b.id);
  // Prioritas rendah (sayap kanan) hanya tampil bila sayap kanan dibuka.
  assert.equal(umum.includes("BD-05") || umum.includes("BD-08") || umum.includes("BD-09"), false);
  assert.equal(availableBadges({ rightWing: true }).some((b) => b.id === "BD-05"), true);
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
  assert.deepEqual(earnedBadges(pois, {}), []);
  const one = { b: challenge(true, 1, 10) };
  assert.deepEqual(earnedBadges(pois, one), ["BD-06"]);
  assert.equal(totalPoints(pois, one), 10 + 10);
  const all = {
    a: challenge(true, 0, 20),
    b: challenge(true, 1, 10),
    c: challenge(true, 1, 10),
    d: challenge(true, 1, 20),
  };
  assert.deepEqual(earnedBadges(pois, all), ["BD-01", "BD-02", "BD-03", "BD-04", "BD-06", "BD-07"]);
  assert.equal(totalPoints(pois, all), 60 + 50 + 30 + 40 + 100 + 10 + 30);
});

test("anak: POI quest foto jadi cerita saja; Penjelajah Cilik di 2 POI", () => {
  const pois = [
    { id: "a", wing: "left", code: "P01", quest: null },
    { id: "b", wing: "left", code: "P02", quest: "quiz" },
    { id: "c", wing: "left", code: "P04", quest: "kuis" },
  ];
  const states = { a: s(true, false, 0), b: s(true, false, 2), c: challenge(true, 2, 10) };
  const ids = earnedBadges(pois, states, { kid: true });
  assert.deepEqual(ids, ["BD-01", "BD-04", "BD-06", "BD-15"]);
  assert.equal(earnedBadges(pois, states, { kid: true, questDays: 3 }).includes("BD-11"), true);
});
