import dataset from "../../../backend/data/quests.json" with { type: "json" };
import { type Profile, type Quest, questSchema } from "../domain/contracts.ts";

/** Konten quest POI-01–11 dari sheet Quest dan Quest_Anak; kunci hanya dipakai sumber data mock. */
export const questCatalog = dataset;

type KidText = { readonly title: string; readonly question: string; readonly photoTarget: string; readonly hint: string; readonly explanation: string };

/** Sheet Quest_Anak: anak hanya mengerjakan quest foto versi anak; quest lain dinonaktifkan. */
export function questsForPoi(poiId: string, profile: Profile): readonly Quest[] {
  return questCatalog.filter((entry): boolean => entry.idPoi === poiId).map((entry): Quest => {
    const kid: KidText | undefined = profile === "anak" && "kid" in entry ? entry.kid as KidText : undefined;
    return questSchema.parse({
      idQuest: entry.idQuest,
      code: entry.code,
      title: kid?.title ?? entry.title,
      type: entry.type,
      instruksi: kid?.title ?? entry.title,
      pertanyaan: kid?.question ?? entry.question,
      options: entry.options,
      target_foto: kid?.photoTarget ?? entry.photoTarget,
      penjelasan: kid?.explanation ?? entry.explanation,
      hint: kid?.hint ?? entry.hint,
      points: entry.points,
      maxAttempts: entry.maxAttempts,
      requiredForBadge: entry.requiredForBadge,
      isDisabled: profile === "anak" && kid === undefined,
    });
  });
}
