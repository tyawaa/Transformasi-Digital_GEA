import dataset from "../../../backend/data/quests.json" with { type: "json" };
import { type Profile, type Quest, questSchema } from "../domain/contracts.ts";

/** Konten quest prioritas POI-01–11 dari sheet; kunci hanya dipakai sumber data mock. */
export const questCatalog = dataset;

export function questsForPoi(poiId: string, profile: Profile): readonly Quest[] {
  return questCatalog.filter((entry): boolean => entry.idPoi === poiId).map((entry): Quest =>
    questSchema.parse({
      idQuest: entry.idQuest,
      code: entry.code,
      title: entry.title,
      type: entry.type,
      instruksi: entry.title,
      pertanyaan: entry.question,
      options: entry.options,
      target_foto: entry.photoTarget,
      penjelasan: entry.explanation,
      hint: entry.hint,
      points: entry.points,
      maxAttempts: entry.maxAttempts,
      requiredForBadge: entry.requiredForBadge,
      isDisabled: profile === "anak" && entry.type === "foto",
    })
  );
}
