import catalog from "../data/checkpoints.json" with { type: "json" };
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import { type ApprovedStories, approvedStories, type ApprovedStory } from "./approved-stories.ts";
import {
  type Checkpoint,
  type CheckpointDataset,
  type CheckpointZone,
  parseCheckpointDataset,
} from "./checkpoint-dataset.ts";
import { quote } from "./sql.ts";

/** Menyiapkan draft cerita secara atomik; kolom belum tersedia tetap NULL dan data lama dipertahankan. */
export function prepareStoryDrafts(
  stories: ApprovedStories,
  checkpoints: CheckpointDataset,
): string {
  const pois: readonly Checkpoint[] = stories.stories.map((story: ApprovedStory): Checkpoint => {
    const poi: Checkpoint | undefined = checkpoints.pois.find(
      (poi: Checkpoint): boolean => poi.idPoi === story.idPoi && poi.poiCode === story.poiCode,
    );
    if (poi === undefined) {
      throw new ValidationError(
        `Checkpoint cerita ${story.poiCode} tidak cocok dengan ID ${story.idPoi}.`,
      );
    }
    return poi;
  });
  const zones: readonly CheckpointZone[] = checkpoints.zones.filter((
    zone: CheckpointZone,
  ): boolean => pois.some((poi: Checkpoint): boolean => poi.idZona === zone.idZona));
  const statements: readonly string[] = [
    ...zones.map((zone: CheckpointZone): string =>
      `insert into public.zona(id_zona,nama) values (${quote(zone.idZona)},${
        quote(zone.name)
      }) on conflict (id_zona) do nothing;`
    ),
    ...pois.map((poi: Checkpoint): string =>
      `insert into public.poi(id_poi,id_zona,nama,is_published) values (${quote(poi.idPoi)},${
        quote(poi.idZona)
      },${quote(poi.name)},false) on conflict (id_poi) do nothing;`
    ),
    ...stories.stories.map((story: ApprovedStory): string =>
      `insert into public.konten(id_poi,bahasa,profil,teks_cerita,judul_cerita,fakta_menarik,koleksi_sorotan) values (${
        quote(story.idPoi)
      },${quote(stories.language)},${quote(stories.profile)},${quote(story.description)},${
        quote(story.title)
      },${quote(story.fact)},${quote(story.highlights)})
on conflict (id_poi,bahasa,profil) do update set teks_cerita=excluded.teks_cerita,judul_cerita=excluded.judul_cerita,fakta_menarik=excluded.fakta_menarik,koleksi_sorotan=excluded.koleksi_sorotan;`
    ),
  ];
  return `-- DIBUAT oleh npm run stories:drafts dari data/approved-stories.json.\n-- Draft belum dipublikasikan; foto, audio, denah, estimasi dan quest dilengkapi terpisah.\ndo $story_drafts$\nbegin\n${
    statements.join("\n\n")
  }\nend;\n$story_drafts$;\n`;
}

if (import.meta.main) {
  const [output]: string[] = Deno.args;
  if (output === undefined || Deno.args.length !== 1) {
    throw new ValidationError("Jalankan: npm run stories:drafts -- output.sql");
  }
  const checkpoints: CheckpointDataset = parseCheckpointDataset(catalog);
  await Deno.writeTextFile(output, prepareStoryDrafts(approvedStories, checkpoints), {
    createNew: true,
  });
  console.log(
    JSON.stringify({
      event: "story_drafts_prepared",
      output,
      poiCount: approvedStories.stories.length,
    }),
  );
}
