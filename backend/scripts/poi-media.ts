import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import {
  array,
  type JsonObject,
  object,
  text,
  uuid,
} from "../supabase/functions/gea-api/validation.ts";
import { quote } from "./sql.ts";

export type PoiImage = {
  readonly sequence: number;
  readonly fileName: string;
  readonly objectPath: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly instruction: string | null;
};

export type PoiMedia = {
  readonly poiCode: string;
  readonly idPoi: string;
  readonly images: readonly PoiImage[];
};

export type PoiMediaManifest = {
  readonly schemaVersion: 1;
  readonly bucket: "gea-media";
  readonly pois: readonly PoiMedia[];
};

/** Nomor awalan menentukan peran: 1–2 cerita, 3 ke atas referensi tantangan foto. */
export function imageSequence(fileName: string): number {
  const match: RegExpMatchArray | null = fileName.match(/^([1-9]\d*)(?:-[a-zA-Z0-9_-]+)?\.jpg$/);
  const sequence: number = Number(match?.[1]);
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new ValidationError(
      `Nama gambar ${fileName} harus dimulai nomor positif dan berakhiran .jpg.`,
    );
  }
  return sequence;
}

function parseImage(value: unknown, poiCode: string): PoiImage {
  const image: JsonObject = object(value, `${poiCode}.image`);
  const fileName: string = text(image.fileName, "image.fileName", 200);
  const sequence: number = imageSequence(fileName);
  const sha256: string = text(image.sha256, "image.sha256", 64);
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new ValidationError(`Hash ${fileName} tidak valid.`);
  const objectPath: string = `images/poi/${poiCode}/${sequence}-${sha256.slice(0, 16)}.jpg`;
  if (
    image.sequence !== sequence || image.objectPath !== objectPath ||
    typeof image.byteLength !== "number" || !Number.isSafeInteger(image.byteLength) ||
    image.byteLength < 1 || image.byteLength > 10485760
  ) {
    throw new ValidationError(
      `Metadata ${poiCode}/${fileName} tidak valid; periksa urutan, path dan batas 10 MiB.`,
    );
  }
  if (sequence <= 2 && image.instruction !== null) {
    throw new ValidationError(
      `Gambar cerita ${poiCode}/${fileName} tidak boleh memiliki instruksi foto.`,
    );
  }
  return {
    sequence,
    fileName,
    objectPath,
    sha256,
    byteLength: image.byteLength,
    instruction: sequence <= 2 ? null : text(image.instruction, "image.instruction", 2000),
  };
}

export function parsePoiMediaManifest(value: unknown): PoiMediaManifest {
  const manifest: JsonObject = object(value, "manifest media");
  if (manifest.schemaVersion !== 1 || manifest.bucket !== "gea-media") {
    throw new ValidationError("Manifest harus memakai schemaVersion 1 dan bucket gea-media.");
  }
  const pois: readonly PoiMedia[] = array(manifest.pois, "manifest.pois").map(
    (value: unknown): PoiMedia => {
      const poi: JsonObject = object(value, "media POI");
      const poiCode: string = text(poi.poiCode, "poiCode", 3);
      if (!/^P(0[1-9]|1[0-9]|20)$/.test(poiCode)) {
        throw new ValidationError(`Kode ${poiCode} tidak valid.`);
      }
      const images: readonly PoiImage[] = array(poi.images, "poi.images")
        .map((image: unknown): PoiImage => parseImage(image, poiCode))
        .toSorted((left: PoiImage, right: PoiImage): number => left.sequence - right.sequence);
      if (
        images[0]?.sequence !== 1 || images[1]?.sequence !== 2 || images.length < 3 ||
        new Set(images.map((image: PoiImage): number => image.sequence)).size !== images.length
      ) {
        throw new ValidationError(
          `${poiCode} wajib punya gambar 1, 2 dan minimal satu referensi 3+, tanpa nomor ganda.`,
        );
      }
      return { poiCode, idPoi: uuid(poi.idPoi, `${poiCode}.idPoi`), images };
    },
  );
  if (
    pois.length === 0 ||
    new Set(pois.map((poi: PoiMedia): string => poi.poiCode)).size !== pois.length ||
    new Set(pois.map((poi: PoiMedia): string => poi.idPoi)).size !== pois.length
  ) throw new ValidationError("Manifest media kosong atau mengandung POI ganda.");
  return { schemaVersion: 1, bucket: "gea-media", pois };
}

/** Memasang pemetaan setelah semua objek Storage terunggah, tanpa memublikasikan draft. */
export function preparePoiMediaSql(manifest: PoiMediaManifest): string {
  const statements: readonly string[] = manifest.pois.map((poi: PoiMedia): string => {
    const first: PoiImage | undefined = poi.images.find((image: PoiImage): boolean =>
      image.sequence === 1
    );
    if (first === undefined) throw new ValidationError(`Gambar utama ${poi.poiCode} belum ada.`);
    return `
  update public.poi set path_foto=${quote(first.objectPath)} where id_poi=${quote(poi.idPoi)};
  if not found then raise exception ${
      quote(`POI ${poi.poiCode} belum ada; jalankan seed checkpoint.`)
    }; end if;
  delete from public.poi_media where id_poi=${quote(poi.idPoi)};
  insert into public.poi_media(id_poi,nomor,path_foto,instruksi) values
${
      poi.images.map((image: PoiImage): string =>
        `    (${quote(poi.idPoi)},${image.sequence},${quote(image.objectPath)},${
          image.instruction === null ? "null" : quote(image.instruction)
        })`
      ).join(",\n")
    };`;
  });
  return `-- Pemetaan media editorial; jalankan setelah upload dan verifikasi URL.\ndo $poi_media$\nbegin\n${
    statements.join("\n")
  }\nend;\n$poi_media$;\n`;
}
