// Quest per POI untuk satu profil pengunjung (sheet Quest + aturan Sprint 3). Dipakai alur cerita dan lencana.
import { museumPoiById, type StoryContent, type Tantangan } from "../../data/museum";
import type { Profile } from "../../domain/contracts";

/** Quest yang dikerjakan di POI ini, sesuai sheet dan profil pengunjung. */
export type QuestPlan = {
  /** Tantangan (foto / benar-salah / isian), atau undefined bila tidak ada untuk profil ini. */
  readonly challenge: Tantangan | undefined;
  /** Mini Quiz pilihan ganda (dinilai backend). */
  readonly hasQuiz: boolean;
};

/**
 * Sprint 3: satu quest per POI dari sheet Quest. Pilihan ganda/cocokkan = Mini Quiz, foto/benar-salah/isian =
 * tantangan. Anak (7–12) TIDAK mengerjakan quest foto (POI-01, 03, 07, 10 jadi cerita saja), tetapi quest
 * lain tetap dikerjakan. POI tanpa data lokal (mode API) tetap memakai Mini Quiz backend.
 */
export function questPlan(poiId: string, profile: Profile): QuestPlan {
  const content: StoryContent | null = museumPoiById(poiId)?.content ?? null;
  const challenge: Tantangan | undefined = content?.tantangan;
  // Anak: tidak ada quest foto sama sekali; quest lain (pilgan, cocokkan, benar/salah, isian) tetap dikerjakan.
  if (profile === "anak" && isPhotoQuest(challenge)) return { challenge: undefined, hasQuiz: false };
  return { challenge, hasQuiz: content?.tanpaKuis !== true };
}

/** Quest foto (termasuk cari objek yang dibuktikan dengan foto). */
export function isPhotoQuest(challenge: Tantangan | undefined): boolean {
  return challenge?.tipe === "foto" || challenge?.tipe === "cariObjek";
}

/**
 * Jenis quest POI untuk hitungan lencana: "quiz" = Mini Quiz (pilihan ganda/cocokkan), "kuis" = tantangan
 * benar-salah/isian, "foto" = tantangan foto, null = tidak ada quest (mis. anak di POI yang questnya foto).
 */
export function questKind(poiId: string, profile: Profile): "quiz" | "kuis" | "foto" | null {
  const plan: QuestPlan = questPlan(poiId, profile);
  if (plan.challenge !== undefined) return isPhotoQuest(plan.challenge) ? "foto" : "kuis";
  return plan.hasQuiz ? "quiz" : null;
}
