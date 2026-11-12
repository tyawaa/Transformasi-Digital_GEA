// Jalankan: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCURACY_LIMIT_METERS, distanceMeters, nearestInside, stepGeofence } from "../src/domain/geofence.ts";

// Koordinat P03 dan P02 dari Excel survei; P01 zona sayap kiri.
const P03 = { id: "P03", latitude: -6.900694, longitude: 107.621278, radiusMeters: 10 };
const P02 = { id: "P02", latitude: -6.900667, longitude: 107.621306, radiusMeters: 10 };
const FAR = { latitude: -6.90150, longitude: 107.62250 };
const at = (p, accuracy = 5) => ({ latitude: p.latitude, longitude: p.longitude, accuracyMeters: accuracy });
// Geser ~d meter ke utara.
const north = (p, d) => ({ latitude: p.latitude + d / 111_320, longitude: p.longitude });

test("jarak Haversine masuk akal", () => {
  assert.ok(Math.abs(distanceMeters(P03, north(P03, 10)) - 10) < 0.2);
});

test("masuk radius memicu enter sekali, tidak berulang selama di dalam", () => {
  let s = stepGeofence([], at(FAR), [P03]);
  assert.deepEqual(s.events, []);
  s = stepGeofence(s.inside, at(P03), [P03]);
  assert.deepEqual(s.events, [{ type: "enter", id: "P03" }]);
  s = stepGeofence(s.inside, at(north(P03, 4)), [P03]);
  assert.deepEqual(s.events, []);
  s = stepGeofence(s.inside, at(north(P03, 11)), [P03]); // masih dalam toleransi tepi
  assert.deepEqual(s.events, []);
});

test("keluar lalu masuk lagi memicu enter lagi", () => {
  let s = stepGeofence([], at(P03), [P03]);
  s = stepGeofence(s.inside, at(north(P03, 30)), [P03]);
  assert.deepEqual(s.events, [{ type: "exit", id: "P03" }]);
  s = stepGeofence(s.inside, at(P03), [P03]);
  assert.deepEqual(s.events, [{ type: "enter", id: "P03" }]);
});

test("GPS lemah (>20 m) tidak menyimpulkan masuk/keluar", () => {
  let s = stepGeofence([], at(P03, ACCURACY_LIMIT_METERS + 5), [P03]);
  assert.equal(s.weak, true);
  assert.deepEqual(s.events, []);
  s = stepGeofence(["P03"], at(FAR, 40), [P03]);
  assert.deepEqual(s.inside, ["P03"]);
  assert.deepEqual(s.events, []);
});

test("ruang aktif = checkpoint terdekat yang dimasuki", () => {
  const s = stepGeofence([], at(P03), [P03, P02]);
  assert.equal(nearestInside(s.inside, at(P03), [P03, P02])?.id, "P03");
});
