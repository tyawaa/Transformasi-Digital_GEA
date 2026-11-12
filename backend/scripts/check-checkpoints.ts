import catalog from "../data/checkpoints.json" with { type: "json" };
import {
  type Checkpoint,
  type CheckpointDataset,
  type CheckpointZone,
  parseCheckpointDataset,
  type ZoneCode,
} from "./checkpoint-dataset.ts";

type ZoneCount = { readonly zoneCode: ZoneCode; readonly poiCount: number };

/** Memeriksa A9 tanpa menulis database, mengambil foto, atau menerbitkan token QR. */
function checkCheckpoints(): void {
  const dataset: CheckpointDataset = parseCheckpointDataset(catalog);
  const sharedCoordinates: readonly (readonly string[])[] = dataset.pois.flatMap(
    (poi: Checkpoint, index: number): readonly (readonly string[])[] => {
      if (
        dataset.pois.slice(0, index).some((other: Checkpoint): boolean =>
          other.latitude === poi.latitude && other.longitude === poi.longitude
        )
      ) return [];
      const codes: readonly string[] = dataset.pois.filter((other: Checkpoint): boolean =>
        other.latitude === poi.latitude && other.longitude === poi.longitude
      ).map((other: Checkpoint): string => other.poiCode);
      return codes.length > 1 ? [codes] : [];
    },
  );
  console.log(JSON.stringify(
    {
      event: "checkpoints_validated",
      poiCount: dataset.pois.length,
      zones: dataset.zones.map((zone: CheckpointZone): ZoneCount => ({
        zoneCode: zone.zoneCode,
        poiCount: dataset.pois.filter((poi: Checkpoint): boolean =>
          poi.idZona === zone.idZona
        ).length,
      })),
      coordinateSourceConfirmed: dataset.coordinateSourceConfirmed,
      surveyCompleted: dataset.surveyCompleted,
      sharedCoordinates,
      qrPayloadFormat: "64 lowercase hex characters; verified by backend",
    },
    null,
    2,
  ));
  if (!dataset.coordinateSourceConfirmed || !dataset.surveyCompleted) {
    console.warn(JSON.stringify({
      event: "checkpoint_confirmation_pending",
      coordinateSourceConfirmed: dataset.coordinateSourceConfirmed,
      surveyCompleted: dataset.surveyCompleted,
    }));
  }
}

if (import.meta.main) checkCheckpoints();
