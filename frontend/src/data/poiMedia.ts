import manifest from "../../../backend/data/poi-media.json" with { type: "json" };
import type { PoiDetail } from "../domain/contracts";
import { publicConfig } from "../services/supabase";

type PoiMediaEntry = (typeof manifest.pois)[number];

export function poiMedia(idPoi: string): PoiMediaEntry {
  const media: PoiMediaEntry | undefined = manifest.pois.find((poi: PoiMediaEntry): boolean => poi.idPoi === idPoi);
  if (media === undefined) throw new RangeError(`Media POI ${idPoi} belum tersedia di manifest.`);
  return media;
}

export function poiStoryPhoto(idPoi: string, sequence: 1 | 2): string {
  const image: PoiMediaEntry["images"][number] | undefined = poiMedia(idPoi).images.find(
    (image: PoiMediaEntry["images"][number]): boolean => image.sequence === sequence,
  );
  if (image === undefined) throw new RangeError(`Gambar cerita ${sequence} untuk POI ${idPoi} belum tersedia.`);
  return publicMediaUrl(image.objectPath);
}

export function poiPhotoChallenges(idPoi: string): PoiDetail["photoChallenges"] {
  return poiMedia(idPoi).images.filter((image: PoiMediaEntry["images"][number]): boolean => image.sequence >= 3)
    .map((image: PoiMediaEntry["images"][number]): PoiDetail["photoChallenges"][number] => {
      if (image.instruction === null) throw new TypeError(`Instruksi foto ${image.objectPath} belum diisi.`);
      return { sequence: image.sequence, photoUrl: publicMediaUrl(image.objectPath), instruction: image.instruction };
    });
}

function publicMediaUrl(path: string): string {
  return `${publicConfig.url.replace(/\/$/, "")}/storage/v1/object/public/gea-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}
