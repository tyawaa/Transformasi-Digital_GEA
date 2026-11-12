import { type ApprovedStories, approvedStories } from "./approved-stories.ts";
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import { quote } from "./sql.ts";

/** SQL atomik untuk konten yang sudah ada; gagal jika POI/varian belum disiapkan. */
export function prepareStoryUpdates(dataset: ApprovedStories): string {
  const updates: readonly string[] = dataset.stories.map((story): string => `
  update public.konten set
    teks_cerita=${quote(story.description)},
    judul_cerita=${quote(story.title)},
    fakta_menarik=${quote(story.fact)},
    koleksi_sorotan=${quote(story.highlights)}
  where id_poi=${quote(story.idPoi)}
    and bahasa=${quote(dataset.language)} and profil=${quote(dataset.profile)};
  if not found then
    raise exception ${
    quote(
      `Konten ${story.poiCode} (${dataset.language}/${dataset.profile}) belum tersedia; siapkan seed lengkap dengan media dan quest terlebih dahulu.`,
    )
  };
  end if;`);
  return `-- Cerita final; foto, audio, quest, dan status publikasi tetap.\ndo $story_updates$\nbegin\n${
    updates.join("\n")
  }\nend;\n$story_updates$;\n`;
}

if (import.meta.main) {
  const [output]: string[] = Deno.args;
  if (output === undefined || Deno.args.length !== 1) {
    throw new ValidationError("Jalankan: npm run stories:prepare -- output.sql");
  }
  await Deno.writeTextFile(output, prepareStoryUpdates(approvedStories), { createNew: true });
  console.log(
    JSON.stringify({
      event: "story_updates_prepared",
      output,
      poiCount: approvedStories.stories.length,
    }),
  );
}
