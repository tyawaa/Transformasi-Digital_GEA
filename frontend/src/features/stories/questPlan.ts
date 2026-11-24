import { questsForPoi } from "../../data/quests.ts";
import type { Profile, Quest } from "../../domain/contracts.ts";

/** Daftar quest sesuai profil; anak hanya mengerjakan quest foto (Quest_Anak). */
export function questPlan(poiId: string, profile: Profile): readonly Quest[] {
  return questsForPoi(poiId, profile).filter((quest: Quest): boolean => quest.isDisabled !== true);
}

export function questKind(poiId: string, profile: Profile): "quiz" | "kuis" | "foto" | null {
  const quests: readonly Quest[] = questPlan(poiId, profile);
  if (quests.length === 0) return null;
  if (quests.every((quest: Quest): boolean => quest.type === "foto")) return "foto";
  return quests.some((quest: Quest): boolean => quest.type === "pilgan" || quest.type === "cocokkan") ? "quiz" : "kuis";
}
