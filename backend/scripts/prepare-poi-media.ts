import catalog from "../data/checkpoints.json" with { type: "json" };
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import {
  imageSequence,
  parsePoiMediaManifest,
  type PoiImage,
  type PoiMedia,
  type PoiMediaManifest,
  preparePoiMediaSql,
} from "./poi-media.ts";

async function prepareImage(
  source: URL,
  fileName: string,
  poiCode: string,
  poiName: string,
): Promise<PoiImage> {
  const bytes: Uint8Array<ArrayBuffer> = await Deno.readFile(
    new URL(`${poiCode}/${fileName}`, source),
  );
  const hash: ArrayBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const sha256: string = Array.from(new Uint8Array(hash)).map((byte: number): string =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const sequence: number = imageSequence(fileName);
  return {
    sequence,
    fileName,
    objectPath: `images/poi/${poiCode}/${sequence}-${sha256.slice(0, 16)}.jpg`,
    sha256,
    byteLength: bytes.byteLength,
    instruction: sequence <= 2
      ? null
      : `Temukan objek pada gambar ini di area ${poiName}, lalu foto objek yang sama.`,
  };
}

/** Membaca versi gambar yang telah diperkecil; urutan nomor tidak harus berurutan tanpa celah. */
async function prepareManifest(source: URL): Promise<PoiMediaManifest> {
  const folders: readonly Deno.DirEntry[] = (await Array.fromAsync(Deno.readDir(source)))
    .toSorted((left: Deno.DirEntry, right: Deno.DirEntry): number =>
      left.name.localeCompare(right.name)
    );
  const pois: readonly PoiMedia[] = await Promise.all(
    folders.map(async (folder: Deno.DirEntry): Promise<PoiMedia> => {
      if (!folder.isDirectory) {
        throw new ValidationError(`Folder sumber berisi file tak terduga: ${folder.name}.`);
      }
      const checkpoint: (typeof catalog.pois)[number] | undefined = catalog.pois.find(
        (poi: (typeof catalog.pois)[number]): boolean =>
          poi.poiCode === `POI-${folder.name.slice(1)}`,
      );
      if (checkpoint === undefined) {
        throw new ValidationError(`Folder ${folder.name} tidak ada di master POI.`);
      }
      const entries: readonly Deno.DirEntry[] = await Array.fromAsync(
        Deno.readDir(new URL(`${folder.name}/`, source)),
      );
      const images: readonly PoiImage[] = await Promise.all(
        entries.map((entry: Deno.DirEntry): Promise<PoiImage> => {
          if (!entry.isFile) {
            throw new ValidationError(`Entri gambar tidak valid: ${folder.name}/${entry.name}.`);
          }
          return prepareImage(source, entry.name, folder.name, checkpoint.name);
        }),
      );
      return { poiCode: folder.name, idPoi: checkpoint.idPoi, images };
    }),
  );
  return parsePoiMediaManifest({ schemaVersion: 1, bucket: "gea-media", pois });
}

if (import.meta.main) {
  const [source, output, sqlOutput]: string[] = Deno.args;
  if (
    source === undefined || output === undefined || sqlOutput === undefined ||
    Deno.args.length !== 3
  ) {
    throw new ValidationError(
      "Jalankan: npm run media:prepare -- .local/poi-media data/poi-media.json .local/poi-media.sql",
    );
  }
  const sourceUrl: URL = new URL(
    `${source.replaceAll("\\", "/").replace(/\/$/, "")}/`,
    new URL(`file:///${Deno.cwd().replaceAll("\\", "/")}/`),
  );
  const manifest: PoiMediaManifest = await prepareManifest(sourceUrl);
  await Deno.writeTextFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
  await Deno.writeTextFile(sqlOutput, preparePoiMediaSql(manifest));
  console.log(
    JSON.stringify({
      event: "poi_media_prepared",
      output,
      sqlOutput,
      poiCount: manifest.pois.length,
      imageCount: manifest.pois.reduce(
        (total: number, poi: PoiMedia): number => total + poi.images.length,
        0,
      ),
    }),
  );
}
