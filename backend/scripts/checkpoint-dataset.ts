import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import { type Coordinate, validateCoordinate } from "../supabase/functions/gea-api/geofence.ts";
import {
  array,
  finiteNumber,
  type JsonObject,
  object,
  text,
  uuid,
} from "../supabase/functions/gea-api/validation.ts";

export const POI_COUNT: number = 20;
export const ZONE_COUNT: number = 2;
export type ZoneCode = "LEFT_WING" | "RIGHT_WING";
export type CheckpointZone = {
  readonly zoneCode: ZoneCode;
  readonly idZona: string;
  readonly name: string;
};
export type Checkpoint = Coordinate & {
  readonly poiCode: string;
  readonly idPoi: string;
  readonly idZona: string;
  readonly name: string;
  readonly originalName: string;
  readonly radiusMeters: 15;
  readonly triggerMethod: "gps";
  readonly gpsAccuracyMeters: number | null;
  readonly surveyDate: string | null;
  readonly surveyor: string | null;
  readonly photoReferenceFolder: string;
  readonly sourceLatitude: string;
  readonly sourceLongitude: string;
};
export type CheckpointDataset = {
  readonly schemaVersion: 1;
  readonly coordinateSystem: "WGS84";
  readonly coordinateSourceConfirmed: boolean;
  readonly surveyCompleted: boolean;
  readonly zones: readonly CheckpointZone[];
  readonly pois: readonly Checkpoint[];
};

function nullableText(value: unknown, field: string): string | null {
  return value === null ? null : text(value, field, 200);
}

function parseZone(value: unknown): CheckpointZone {
  const zone: JsonObject = object(value, "zone");
  if (zone.zoneCode !== "LEFT_WING" && zone.zoneCode !== "RIGHT_WING") {
    throw new ValidationError("zone.zoneCode harus LEFT_WING atau RIGHT_WING.");
  }
  return {
    zoneCode: zone.zoneCode,
    idZona: uuid(zone.idZona, "zone.idZona"),
    name: text(zone.name, "zone.name", 200),
  };
}

function parseCheckpoint(value: unknown): Checkpoint {
  const poi: JsonObject = object(value, "checkpoint");
  const poiCode: string = text(poi.poiCode, "poiCode", 6);
  if (!/^POI-(0[1-9]|1[0-9]|20)$/.test(poiCode)) {
    throw new ValidationError(`poiCode ${poiCode} harus POI-01 sampai POI-20.`);
  }
  const coordinate: Coordinate = validateCoordinate({
    latitude: finiteNumber(poi.latitude, `${poiCode}.latitude`),
    longitude: finiteNumber(poi.longitude, `${poiCode}.longitude`),
  });
  if (poi.radiusMeters !== 15 || poi.triggerMethod !== "gps") {
    throw new ValidationError(`${poiCode} harus memakai radiusMeters 15 dan triggerMethod gps.`);
  }
  const accuracy: number | null = poi.gpsAccuracyMeters === null
    ? null
    : finiteNumber(poi.gpsAccuracyMeters, `${poiCode}.gpsAccuracyMeters`);
  if (accuracy !== null && accuracy < 0) {
    throw new ValidationError(`${poiCode}.gpsAccuracyMeters tidak boleh negatif.`);
  }
  const surveyDate: string | null = nullableText(poi.surveyDate, `${poiCode}.surveyDate`);
  if (
    surveyDate !== null &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(surveyDate) ||
      !Number.isFinite(Date.parse(surveyDate)) ||
      new Date(surveyDate).toISOString().slice(0, 10) !== surveyDate)
  ) {
    throw new ValidationError(`${poiCode}.surveyDate harus tanggal valid YYYY-MM-DD atau null.`);
  }
  const photoReferenceFolder: string = text(
    poi.photoReferenceFolder,
    `${poiCode}.photoReferenceFolder`,
    1024,
  );
  if (
    !/^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+$/.test(photoReferenceFolder)
  ) {
    throw new ValidationError(`${poiCode}.photoReferenceFolder harus URL folder Google Drive.`);
  }
  return {
    poiCode,
    idPoi: uuid(poi.idPoi, `${poiCode}.idPoi`),
    idZona: uuid(poi.idZona, `${poiCode}.idZona`),
    name: text(poi.name, `${poiCode}.name`, 200),
    originalName: text(poi.originalName, `${poiCode}.originalName`, 200),
    ...coordinate,
    radiusMeters: 15,
    triggerMethod: "gps",
    gpsAccuracyMeters: accuracy,
    surveyDate,
    surveyor: nullableText(poi.surveyor, `${poiCode}.surveyor`),
    photoReferenceFolder,
    sourceLatitude: text(poi.sourceLatitude, `${poiCode}.sourceLatitude`, 40),
    sourceLongitude: text(poi.sourceLongitude, `${poiCode}.sourceLongitude`, 40),
  };
}

/**
 * A9: 20 POI, dua sayap, koordinat WGS84 dan radius checkpoint 15 m.
 * Status survei mengikuti konfirmasi pemilik data; metadata kosong tidak membatalkannya.
 * POI-10 dan POI-11 memiliki titik dan ID koleksi berbeda.
 * Dataset ini tidak menetapkan pusat/radius zona atau batas geofence museum.
 */
export function parseCheckpointDataset(value: unknown): CheckpointDataset {
  const dataset: JsonObject = object(value, "checkpointDataset");
  if (typeof dataset.surveyCompleted !== "boolean") {
    throw new ValidationError(
      "surveyCompleted harus boolean sesuai status survei yang dikonfirmasi.",
    );
  }
  if (
    dataset.schemaVersion !== 1 || dataset.coordinateSystem !== "WGS84" ||
    typeof dataset.coordinateSourceConfirmed !== "boolean"
  ) {
    throw new ValidationError(
      "Dataset harus schemaVersion 1, coordinateSystem WGS84, dan coordinateSourceConfirmed boolean.",
    );
  }
  const zones: readonly CheckpointZone[] = array(dataset.zones, "zones").map(parseZone);
  const pois: readonly Checkpoint[] = array(dataset.pois, "pois").map(parseCheckpoint);
  if (
    zones.length !== ZONE_COUNT ||
    new Set(zones.map((zone: CheckpointZone): ZoneCode => zone.zoneCode)).size !==
      ZONE_COUNT ||
    new Set(zones.map((zone: CheckpointZone): string => zone.idZona)).size !== ZONE_COUNT
  ) {
    throw new ValidationError("Dataset harus memiliki dua zona dengan kode dan UUID berbeda.");
  }
  if (
    pois.length !== POI_COUNT ||
    new Set(pois.map((poi: Checkpoint): string => poi.poiCode)).size !== POI_COUNT ||
    new Set(pois.map((poi: Checkpoint): string => poi.idPoi)).size !== POI_COUNT
  ) {
    throw new ValidationError("Dataset harus memiliki 20 POI dengan kode dan UUID berbeda.");
  }
  for (const poi of pois) {
    const zone: CheckpointZone | undefined = zones.find((zone: CheckpointZone): boolean =>
      zone.idZona === poi.idZona
    );
    const expectedZone: ZoneCode = Number(poi.poiCode.slice(4)) <= 11 ? "LEFT_WING" : "RIGHT_WING";
    if (zone === undefined || zone.zoneCode !== expectedZone) {
      throw new ValidationError(
        `${poi.poiCode}.idZona harus merujuk ${expectedZone} dalam dataset.`,
      );
    }
  }
  return {
    schemaVersion: 1,
    coordinateSystem: "WGS84",
    coordinateSourceConfirmed: dataset.coordinateSourceConfirmed,
    surveyCompleted: dataset.surveyCompleted,
    zones,
    pois,
  };
}

/**
 * Label POI-01..20 dipetakan ke UUID untuk penerbit QR koleksi.
 * Isi QR tetap token acak 64 hex, bukan label/UUID. Scanner memanggil API untuk
 * memverifikasi token dan mendapatkan idPoi; lookup identitas offline belum tersedia.
 */
export function resolvePoiQrTarget(dataset: CheckpointDataset, target: string): string {
  const targetId: string | undefined = dataset.pois.find((poi: Checkpoint): boolean =>
    poi.poiCode === target || poi.idPoi === target
  )?.idPoi;
  if (targetId === undefined) {
    throw new ValidationError(`Target QR tidak terdaftar: scope=poi, target=${target}.`);
  }
  return targetId;
}

/** Memetakan kode sayap/UUID ke zona sesi untuk QR pintu masuk pada kontrak backend saat ini. */
export function resolveEntranceQrTarget(dataset: CheckpointDataset, target: string): string {
  const targetId: string | undefined = dataset.zones.find((zone: CheckpointZone): boolean =>
    zone.zoneCode === target || zone.idZona === target
  )?.idZona;
  if (targetId === undefined) {
    throw new ValidationError(`Target QR tidak terdaftar: scope=entrance, target=${target}.`);
  }
  return targetId;
}
