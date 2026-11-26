import assert from "node:assert/strict";
import { test } from "node:test";
import { hasReachedDestination, shouldAnnounce } from "../src/domain/eyesFree.ts";

test("tanda kedatangan memakai ambang jarak yang sama dengan peta", () => {
  assert.equal(hasReachedDestination(25), false);
  assert.equal(hasReachedDestination(2), false);
  assert.equal(hasReachedDestination(1.9), true);
});

test("tanda petunjuk tidak diulang terus saat diam", () => {
  const start = { code: "P01", meters: 40, atMs: 0 };
  assert.equal(shouldAnnounce(null, start), true);
  assert.equal(shouldAnnounce(start, { code: "P01", meters: 39, atMs: 5_000 }), false);
  assert.equal(shouldAnnounce(start, { code: "P01", meters: 39, atMs: 60_000 }), false);
  assert.equal(shouldAnnounce(start, { code: "P01", meters: 30, atMs: 31_000 }), true);
  assert.equal(shouldAnnounce(start, { code: "P01", meters: 19, atMs: 2_000 }), true);
  assert.equal(shouldAnnounce(start, { code: "P02", meters: 40, atMs: 1_000 }), true);
});
