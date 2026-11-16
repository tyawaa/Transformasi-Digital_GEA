import { readConfig } from "../supabase/functions/gea-api/config.ts";
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import { SupabaseGateway } from "../supabase/functions/gea-api/supabase.ts";
import {
  parsePoiMediaManifest,
  type PoiImage,
  type PoiMedia,
  type PoiMediaManifest,
} from "./poi-media.ts";

async function verifiedBytes(
  source: string,
  poi: PoiMedia,
  image: PoiImage,
): Promise<Uint8Array<ArrayBuffer>> {
  const filePath: string = `${source}/${poi.poiCode}/${image.fileName}`;
  const bytes: Uint8Array<ArrayBuffer> = await Deno.readFile(filePath);
  const hash: ArrayBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const sha256: string = Array.from(new Uint8Array(hash)).map((byte: number): string =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (sha256 !== image.sha256 || bytes.byteLength !== image.byteLength) {
    throw new ValidationError(
      `File ${filePath} berubah sejak manifest dibuat; jalankan media:prepare lagi.`,
    );
  }
  return bytes;
}

/** Memvalidasi seluruh file sebelum upload; keberhasilan mencakup pemeriksaan URL publik. */
async function uploadPoiMedia(
  manifest: PoiMediaManifest,
  source: string,
  gateway: SupabaseGateway,
): Promise<void> {
  for (const poi of manifest.pois) {
    for (const image of poi.images) await verifiedBytes(source, poi, image);
  }
  for (const poi of manifest.pois) {
    for (const image of poi.images) {
      const bytes: Uint8Array<ArrayBuffer> = await verifiedBytes(source, poi, image);
      await gateway.uploadMedia(image.objectPath, bytes);
      console.log(
        JSON.stringify({
          event: "poi_media_uploaded",
          poiCode: poi.poiCode,
          sequence: image.sequence,
          path: image.objectPath,
          bytes: bytes.byteLength,
        }),
      );
    }
  }
}

if (import.meta.main) {
  const [input, source]: string[] = Deno.args;
  if (input === undefined || source === undefined || Deno.args.length !== 2) {
    throw new ValidationError(
      "Jalankan: npm run media:upload -- data/poi-media.json .local/poi-media. Isi SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di environment admin.",
    );
  }
  const manifest: PoiMediaManifest = parsePoiMediaManifest(
    JSON.parse(await Deno.readTextFile(input)) as unknown,
  );
  const gateway: SupabaseGateway = new SupabaseGateway(readConfig(Deno.env.toObject()));
  await uploadPoiMedia(manifest, source, gateway);
  console.log(
    JSON.stringify({ event: "poi_media_upload_complete", poiCount: manifest.pois.length }),
  );
}
