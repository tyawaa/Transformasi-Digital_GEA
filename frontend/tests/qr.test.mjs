import assert from "node:assert/strict";
import { test } from "node:test";
import checkpoints from "../../backend/data/checkpoints.json" with { type: "json" };
import approvedStories from "../../backend/data/approved-stories.json" with { type: "json" };
import { museumPois } from "../src/data/museum.ts";
import { parseQr, wrapQr } from "../src/features/qr/qrPayload.ts";

test("cerita final demo mengikuti sumber backend tanpa mengubah ID koleksi dan soal", () => {
  assert.equal(approvedStories.stories.length, 10);
  for (const story of approvedStories.stories) {
    const checkpoint = checkpoints.pois.find((poi) => poi.poiCode === story.poiCode);
    assert.ok(checkpoint);
    const poi = museumPois.find((poi) => poi.idPoi === checkpoint.idPoi);
    assert.ok(poi?.content);
    assert.equal(poi.content.judul, story.title);
    assert.equal(poi.content.cerita, story.description);
    assert.equal(poi.content.fakta, story.fact);
    assert.equal(poi.content.sorotan, story.highlights);
    assert.equal(poi.content.opsi.length, 4);
  }
  assert.equal(museumPois.find((poi) => poi.code === "P03")?.content?.judul, "Indonesia di Cincin Api");
});

test("integrasi A9/C3: 20 marker dan QR memakai ID serta koordinat checkpoint backend", () => {
  assert.equal(museumPois.length, 20);
  const token = "a".repeat(64);
  for (const checkpoint of checkpoints.pois) {
    const poi = museumPois.find((poi) => poi.idPoi === checkpoint.idPoi);
    assert.ok(poi, checkpoint.poiCode);
    assert.equal(poi.name, checkpoint.name);
    assert.equal(poi.latitude, checkpoint.latitude);
    assert.equal(poi.longitude, checkpoint.longitude);
    assert.equal(poi.radiusMeters, 15);
    for (const code of [poi.code, checkpoint.poiCode]) {
      const parsed = parseQr(wrapQr("poi", code, token));
      assert.equal(parsed.ok, true);
      assert.equal(parsed.poiId, checkpoint.idPoi);
      assert.equal(parsed.token, token);
    }
  }
  assert.equal(parseQr(wrapQr("poi", "P21", token)).ok, false);
  assert.equal(parseQr(wrapQr("poi", "POI-21", token)).ok, false);
  assert.equal(parseQr(token).token, token);
});
