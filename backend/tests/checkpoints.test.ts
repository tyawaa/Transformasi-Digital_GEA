import { deepStrictEqual, equal, throws } from "node:assert/strict";
import catalog from "../data/checkpoints.json" with { type: "json" };
import template from "../data/poi-template.json" with { type: "json" };
import {
  type Checkpoint,
  type CheckpointDataset,
  type CheckpointZone,
  parseCheckpointDataset,
  resolveEntranceQrTarget,
  resolvePoiQrTarget,
} from "../scripts/checkpoint-dataset.ts";
import { prepareInitialSeed } from "../scripts/prepare-seed.ts";
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";

type PoiTemplate = (typeof template.pois)[number];
type PoiIdentity = { readonly idPoi: string; readonly idZona: string; readonly name: string };

Deno.test("A9: 20 POI final, dua sayap, koordinat desimal dan template B6 konsisten", (): void => {
  const dataset: CheckpointDataset = parseCheckpointDataset(catalog);
  deepStrictEqual(
    dataset.pois.map((poi: Checkpoint): string => poi.poiCode),
    Array.from(
      { length: 20 },
      (_value: unknown, index: number): string => `POI-${String(index + 1).padStart(2, "0")}`,
    ),
  );
  deepStrictEqual(
    dataset.zones.map((zone: CheckpointZone): number =>
      dataset.pois.filter((poi: Checkpoint): boolean => poi.idZona === zone.idZona).length
    ),
    [11, 9],
  );
  deepStrictEqual(
    template.pois.map((poi: PoiTemplate): PoiIdentity => ({
      idPoi: poi.idPoi,
      idZona: poi.idZona,
      name: poi.name,
    })),
    dataset.pois.map((poi: Checkpoint): PoiIdentity => ({
      idPoi: poi.idPoi,
      idZona: poi.idZona,
      name: poi.name,
    })),
  );
  equal(dataset.coordinateSourceConfirmed, true);
  equal(dataset.surveyCompleted, true);
  equal(dataset.pois.every((poi: Checkpoint): boolean => poi.surveyDate === "2026-11-10"), true);
  equal(dataset.pois[0]?.latitude, -6.900722);
  equal(dataset.pois[0]?.longitude, 107.621361);
  equal(dataset.pois[5]?.latitude, -6.90075);
  equal(dataset.pois[6]?.latitude, -6.90075);
  equal(dataset.pois[9]?.latitude, -6.900649);
  equal(dataset.pois[9]?.longitude, 107.621063);
  equal(dataset.pois[9]?.sourceLatitude, "-6900649.000000");
  equal(dataset.pois[9]?.sourceLongitude, "107621063.000000");
  equal(dataset.pois[10]?.latitude, -6.900694);
  equal(dataset.pois[10]?.longitude, 107.621056);
  equal(dataset.pois.every((poi: Checkpoint): boolean => poi.radiusMeters === 15), true);
  equal(dataset.pois.every((poi: Checkpoint): boolean => poi.gpsAccuracyMeters === null), true);
  throws((): string => prepareInitialSeed(template), /belum disetujui/);
});

Deno.test("A9: salah koordinat, kode, zona, UUID ganda dan radius lama ditolak", (): void => {
  const invalidPois: readonly unknown[] = [
    { ...catalog.pois[0], latitude: -6900722 },
    { ...catalog.pois[0], radiusMeters: 10 },
    { ...catalog.pois[0], poiCode: "POI-21" },
    { ...catalog.pois[0], idZona: catalog.zones[1]?.idZona },
    { ...catalog.pois[0], idPoi: catalog.pois[1]?.idPoi },
    { ...catalog.pois[0], gpsAccuracyMeters: -1 },
    { ...catalog.pois[0], surveyDate: "2026-02-30" },
  ];
  for (const invalid of invalidPois) {
    throws(
      (): CheckpointDataset =>
        parseCheckpointDataset({ ...catalog, pois: [invalid, ...catalog.pois.slice(1)] }),
      ValidationError,
    );
  }
  throws(
    (): CheckpointDataset =>
      parseCheckpointDataset({ ...catalog, pois: catalog.pois.slice(0, 15) }),
    ValidationError,
  );
});

Deno.test("A9 QR: label/UUID merujuk target tetap; POI-10/11 punya identitas berbeda", (): void => {
  const dataset: CheckpointDataset = parseCheckpointDataset(catalog);
  equal(
    resolvePoiQrTarget(dataset, "POI-10"),
    "30000000-0000-4000-8000-000000000010",
  );
  equal(
    resolvePoiQrTarget(dataset, "POI-11"),
    "30000000-0000-4000-8000-000000000011",
  );
  equal(
    resolvePoiQrTarget(dataset, "30000000-0000-4000-8000-000000000001"),
    resolvePoiQrTarget(dataset, "POI-01"),
  );
  equal(resolveEntranceQrTarget(dataset, "LEFT_WING"), catalog.zones[0]?.idZona);
  for (const code of ["POI-21", "P01", "RIGHT_WING"]) {
    throws((): string => resolvePoiQrTarget(dataset, code), /Target QR tidak terdaftar/);
  }
  throws((): string => resolveEntranceQrTarget(dataset, "POI-01"), ValidationError);
});
