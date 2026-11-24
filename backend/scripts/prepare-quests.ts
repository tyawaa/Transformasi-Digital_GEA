import dataset from "../data/quests.json" with { type: "json" };
import { quote } from "./sql.ts";

/** SQL quest dari sheet. POI yang belum punya konten quest tetap ditunda, tanpa membuat cerita baru. */
export function prepareQuests(): string {
  return dataset.map((quest): string => {
    const id: string = quote(quest.idQuest);
    const poi: string = quote(quest.idPoi);
    const variants: readonly string[] = ["dewasa", "anak"];
    const accepted: string = `ARRAY[${quest.acceptedAnswers.map(quote).join(",")}]::text[]`;
    const nullable = (value: string | null): string => value === null ? "NULL" : quote(value);
    const lines: readonly string[] = [
      `insert into public.quest(id_quest,id_poi,tipe_quest,kode_quest,poin,batas_percobaan,wajib_badge,urutan)
select ${id},${poi},${quote(quest.type)},${
        quote(quest.code)
      },${quest.points},${quest.maxAttempts},${quest.requiredForBadge},${
        Number(quest.code.slice(2))
      }
where exists(select 1 from public.quest where id_poi=${poi})
on conflict(id_quest) do update set tipe_quest=excluded.tipe_quest,kode_quest=excluded.kode_quest,poin=excluded.poin,batas_percobaan=excluded.batas_percobaan,wajib_badge=excluded.wajib_badge,urutan=excluded.urutan;`,
      `delete from public.quest_opsi_text where id_quest=${id};`,
      `delete from public.quest_opsi where id_quest=${id};`,
      ...variants.map((profile: string): string =>
        `insert into public.quest_teks(id_quest,bahasa,profil,instruksi,pertanyaan,hint,target_foto,kunci_isian,variasi_jawaban,penjelasan,kriteria_foto)
select ${id},'id',${quote(profile)},${quote(quest.title)},${quote(quest.question)},${
          quote(quest.hint)
        },${nullable(quest.photoTarget)},${
          quest.type === "isian_singkat" ? quote(quest.answer) : "NULL"
        },${accepted},${quote(quest.explanation)},${nullable(quest.photoCriteria)}
where exists(select 1 from public.quest where id_quest=${id})
on conflict(id_quest,bahasa,profil) do update set instruksi=excluded.instruksi,pertanyaan=excluded.pertanyaan,hint=excluded.hint,target_foto=excluded.target_foto,kunci_isian=excluded.kunci_isian,variasi_jawaban=excluded.variasi_jawaban,penjelasan=excluded.penjelasan,kriteria_foto=excluded.kriteria_foto;`
      ),
      ...quest.options.flatMap((option): readonly string[] => [
        `insert into public.quest_opsi(id_quest,label_opsi,is_correct) select ${id},${
          quote(option.label_opsi)
        },${
          option.label_opsi === quest.answer
        } where exists(select 1 from public.quest where id_quest=${id});`,
        `insert into public.quest_opsi_text(id_quest,label_opsi,bahasa,teks_opsi) select ${id},${
          quote(option.label_opsi)
        },'id',${
          quote(option.teks_opsi)
        } where exists(select 1 from public.quest where id_quest=${id});`,
      ]),
    ];
    return lines.join("\n");
  }).join("\n\n") + "\n";
}

if (import.meta.main) {
  const content: string =
    "-- Quest prioritas POI-01–11 dari data/quests.json; pertahankan cerita dan media.\n" +
    prepareQuests();
  await Deno.writeTextFile(
    new URL("../supabase/migrations/20261124000300_quest_content.sql", import.meta.url),
    content,
  );
  const seedPath: URL = new URL("../data/b6_seed_content_poi.sql", import.meta.url);
  const seed: string = (await Deno.readTextFile(seedPath)).replaceAll("\r\n", "\n");
  const marker: string = "-- BEGIN GENERATED QUEST CONTENT\n";
  const markerIndex: number = seed.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("Seed B6 tidak memiliki penanda konten quest yang dihasilkan.");
  }
  await Deno.writeTextFile(seedPath, seed.slice(0, markerIndex) + marker + content);
}
