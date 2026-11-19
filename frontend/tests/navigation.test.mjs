import assert from "node:assert/strict";
import { test } from "node:test";
import { museumPois } from "../src/data/museum.ts";
import { ENTRANCE, PLAN_PINS, locateOnPlan, routeLegs, walkingPath } from "../src/features/map/navigation.ts";

const anchors = museumPois.map((poi) => ({ code: poi.code, latitude: poi.latitude, longitude: poi.longitude }));
const pin = (code) => {
  const result = PLAN_PINS.find((item) => item.code === code);
  assert.ok(result, `Pin ${code} harus ada di denah`);
  return result;
};
const point = ({ x, y }) => ({ x, y });

test("semua checkpoint survei terpetakan pada pin denah yang sesuai", () => {
  assert.equal(PLAN_PINS.length, museumPois.length);
  for (const anchor of anchors) {
    assert.deepEqual(locateOnPlan({ ...anchor, accuracyMeters: 5 }, anchors), point(pin(anchor.code)));
  }
  assert.equal(locateOnPlan(null, anchors), null);
  assert.equal(locateOnPlan({ ...anchors[0], accuracyMeters: 35 }, anchors), null);
  assert.equal(locateOnPlan({ latitude: 0, longitude: 0, accuracyMeters: 5 }, anchors), null);
});

test("rute pintu masuk ke sayap kiri melewati bukaan koridor, bukan dinding", () => {
  const path = walkingPath(ENTRANCE, pin("P02"));
  assert.deepEqual(path[0], ENTRANCE);
  assert.deepEqual(path.at(-1), pin("P02"));
  assert.ok(path.some(({ x, y }) => x === 1017 && y === 188));
  assert.ok(path.some(({ x, y }) => x === 571 && y === 188));
});

test("urutan rekomendasi menentukan leg, dan posisi terbaru mengubah awal rute", () => {
  const codes = Object.freeze(["P02", "P06", "P11", "P14"]);
  const legs = routeLegs(ENTRANCE, codes);
  assert.deepEqual(legs.map((leg) => leg.code), codes);
  assert.deepEqual(legs[1].points[0], pin("P02"));
  assert.deepEqual(routeLegs(pin("P09"), codes)[0].points[0], pin("P09"));
  assert.deepEqual(routeLegs(ENTRANCE, []), []);
  assert.throws(() => routeLegs(ENTRANCE, ["P99"]), /P99/);
});

test("semua pasangan POI terhubung dan titik yang sudah dicapai tidak membuat putaran", () => {
  for (const start of PLAN_PINS) {
    assert.deepEqual(walkingPath(start, start), [start]);
    for (const end of PLAN_PINS) {
      const path = walkingPath(start, end);
      assert.deepEqual(path[0], start);
      assert.deepEqual(path.at(-1), end);
      assert.ok(path.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
    }
  }
});
