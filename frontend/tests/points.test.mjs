// Jalankan: npm test  (Node >= 22.18 membaca file .ts langsung)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  attemptsLeft,
  earnedBadges,
  isOutOfAttempts,
  poiStatus,
  quizPoints,
  totalPoints,
} from "../src/domain/points.ts";

const s = (completed, failed, attempts, closed = true) => ({ completed, failed, attempts, closed });

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

test("lencana dan total poin tidak ganda", () => {
  const pois = [
    { id: "a", wing: "left" },
    { id: "b", wing: "right" },
  ];
  assert.deepEqual(earnedBadges(pois, {}), []);
  const half = { a: s(true, false, 1) };
  assert.deepEqual(earnedBadges(pois, half), ["BD-01"]);
  assert.equal(totalPoints(pois, half), 20 + 50);
  const all = { a: s(true, false, 1), b: s(true, false, 1) };
  assert.deepEqual(earnedBadges(pois, all), ["BD-01", "BD-02", "BD-04", "BD-05"]);
  assert.equal(totalPoints(pois, all), 40 + 50 + 50 + 40 + 100);
  const mixed = { a: s(true, false, 2), b: s(false, true, 3) };
  assert.deepEqual(earnedBadges(pois, mixed), ["BD-01", "BD-02", "BD-05"]);
  assert.equal(totalPoints(pois, mixed), 10 + 50 + 50 + 100);
});
