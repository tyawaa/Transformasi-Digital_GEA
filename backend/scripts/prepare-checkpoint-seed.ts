import catalog from "../data/checkpoints.json" with { type: "json" };
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import {
  type Checkpoint,
  type CheckpointDataset,
  type CheckpointZone,
  parseCheckpointDataset,
} from "./checkpoint-dataset.ts";
import { quote } from "./sql.ts";

/** Mengisi master checkpoint secara atomik tanpa mengubah cerita, media, denah, kuis atau publikasi. */
export function prepareCheckpointSeed(dataset: CheckpointDataset): string {
  const statements: readonly string[] = [
    ...dataset.zones.map((zone: CheckpointZone): string =>
      `insert into public.zona(id_zona,nama) values (${quote(zone.idZona)},${quote(zone.name)})
on conflict (id_zona) do update set nama=excluded.nama;`
    ),
    ...dataset.pois.map((poi: Checkpoint): string =>
      `insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values (${quote(poi.idPoi)},${quote(poi.idZona)},${quote(poi.name)},${quote(poi.poiCode)},${
        quote(poi.originalName)
      },${poi.latitude},${poi.longitude},${poi.radiusMeters},false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;`
    ),
  ];
  const ids: string = dataset.pois.map((poi: Checkpoint): string => quote(poi.idPoi)).join(",");
  return `-- DIBUAT oleh npm run checkpoints:prepare dari data/checkpoints.json.\n-- Master POI; kolom zona GPS dan kelengkapan Stories tidak diubah.\ndo $checkpoint_seed$\nbegin\n${
    statements.join("\n\n")
  }\n
  if (select count(*) from public.poi where id_poi in (${ids})
    and kode_poi is not null and latitude is not null and longitude is not null and radius is not null) <> ${dataset.pois.length} then
    raise exception 'MASTER_POI_INCOMPLETE: pengisian checkpoint belum lengkap';
  end if;
  raise notice 'GEA_MASTER_POI_OK: ${dataset.pois.length} checkpoint tersimpan';
end;\n$checkpoint_seed$;\n`;
}

if (import.meta.main) {
  const [output]: string[] = Deno.args;
  if (output === undefined || Deno.args.length !== 1) {
    throw new ValidationError("Jalankan: npm run checkpoints:prepare -- output.sql");
  }
  const dataset: CheckpointDataset = parseCheckpointDataset(catalog);
  await Deno.writeTextFile(output, prepareCheckpointSeed(dataset), { createNew: true });
  console.log(
    JSON.stringify({ event: "checkpoint_seed_prepared", output, poiCount: dataset.pois.length }),
  );
}
