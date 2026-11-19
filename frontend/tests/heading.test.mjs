import assert from "node:assert/strict";
import { test } from "node:test";
import { browserCompassHeading, estimatePlanBearing, headingDelta, headingUpRotation, normalizeHeading } from "../src/domain/heading.ts";
import { museumPois } from "../src/data/museum.ts";
import { PLAN_PINS } from "../src/features/map/navigation.ts";

test("arah hadap utara, timur, selatan, barat selalu menjadi atas layar", () => {
  for (const planBearing of [0, 17, 350]) {
    for (const heading of [0, 90, 180, 270, 359]) {
      const directionOnPlan = heading - planBearing;
      assert.ok(Math.abs(normalizeHeading(directionOnPlan + headingUpRotation(heading, planBearing))) < 1e-8);
    }
  }
});

test("melewati utara menggunakan rotasi terpendek tanpa putaran 358 derajat", () => {
  assert.equal(headingDelta(359, 1), 2);
  assert.equal(headingDelta(1, 359), -2);
  assert.equal(normalizeHeading(-90), 270);
  assert.throws(() => normalizeHeading(Number.NaN), RangeError);
});

test("heading browser memperhitungkan alpha, kemiringan, dan orientasi layar", () => {
  assert.equal(browserCompassHeading(0, 0, 0, 0), 0);
  assert.equal(browserCompassHeading(270, 40, 0, 0), 90);
  assert.equal(browserCompassHeading(180, 40, 0, 0), 180);
  assert.equal(browserCompassHeading(90, 40, 0, 0), 270);
  assert.equal(browserCompassHeading(0, 0, 0, 90), 90);
  assert.equal(browserCompassHeading(0, 90, 0, 0), null);
});

test("orientasi denah berasal dari data survei, dan data tidak memadai tidak mengarang arah", () => {
  const northUp = [
    { latitude: 0, longitude: 0, x: 0, y: 100 },
    { latitude: 0, longitude: 1, x: 100, y: 100 },
    { latitude: 1, longitude: 0, x: 0, y: 0 },
  ];
  assert.ok(Math.abs(headingDelta(estimatePlanBearing(northUp), 0)) < 0.01);
  const eastUp = northUp.map((anchor) => ({ ...anchor, x: anchor.y, y: -anchor.x }));
  assert.ok(Math.abs(headingDelta(estimatePlanBearing(eastUp), 90)) < 0.01);
  assert.equal(estimatePlanBearing([]), null);
  assert.equal(estimatePlanBearing([northUp[0]]), null);
  const survey = museumPois.map((poi) => {
    const pin = PLAN_PINS.find((point) => point.code === poi.code);
    assert.ok(pin);
    return { latitude: poi.latitude, longitude: poi.longitude, x: pin.x, y: pin.y };
  });
  const bearing = estimatePlanBearing(survey);
  assert.ok(Number.isFinite(bearing));
  assert.ok(bearing >= 0 && bearing < 360);
});
