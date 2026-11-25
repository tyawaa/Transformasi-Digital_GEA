import { questsForPoi } from "../data/quests.ts";
import type { PoiDetail, Profile, Quest } from "../domain/contracts.ts";

/** Use the packaged photo catalog while keeping the API's non-photo activities and story media. */
export function withDevicePhotoQuests(poi: PoiDetail, profile: Profile): PoiDetail {
  const photos: readonly Quest[] = questsForPoi(poi.id_poi, profile).filter((quest: Quest): boolean => quest.type === "foto");
  const photoIds: ReadonlySet<string> = new Set(photos.map((quest: Quest): string => quest.idQuest));
  const other: readonly Quest[] = poi.quests.filter((quest: Quest): boolean => !photoIds.has(quest.idQuest))
    .map((quest: Quest): Quest => profile === "anak" ? { ...quest, isDisabled: quest.type !== "foto" } : quest);
  return { ...poi, quests: [...other, ...photos] };
}
