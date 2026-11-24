import type { AnswerResult, BadgeId, Quest, Visit, VisitProgress } from "../../domain/contracts.ts";
import { activityPoints, type QuestProgress } from "../../domain/points.ts";

/** Status satu POI pada sesi ini. Disimpan di perangkat agar bertahan setelah app ditutup. */
export type PoiProgress = {
  /** Kartu cerita sudah dibaca sampai selesai dan ditutup. */
  readonly closed: boolean;
  /** Batas waktu verifikasi GPS atau QR koleksi (ms epoch). Quest terkunci tanpa ini. */
  readonly verifiedUntil: number | null;
  /** Semua quest aktif di POI dijawab benar. */
  readonly completed: boolean;
  /** Semua quest sudah dikerjakan, dengan setidaknya satu quest kehabisan kesempatan. */
  readonly failed: boolean;
  readonly attempts: number;
  /** Jumlah poin semua quest di POI, tanpa bonus lencana. */
  readonly pointsAwarded: number;
  readonly quests?: { readonly [questId: string]: QuestProgress };
  // Dinilai di aplikasi (belum ada di backend), jadi hanya tersimpan di perangkat.
  /** Tantangan (quest kedua dari sheet) sudah dikerjakan. */
  readonly challengeDone?: boolean;
  /** Poin tantangan: poin sheet bila berhasil, 0 bila kesempatan habis. */
  readonly challengePoints?: number;
  /** Jumlah jawaban tantangan non-foto (1 = benar di percobaan pertama); 0 untuk quest foto. */
  readonly challengeAttempts?: number;
  /** Tantangan dijawab benar (dipakai bonus percobaan pertama). */
  readonly challengeSuccess?: boolean;
  /** Sudah check-in di POI ini (GPS/QR terverifikasi). */
  readonly checkedIn?: boolean;
};

/** Check-in lokal dipertahankan ketika jawaban per quest dipulihkan dari server. */
function localOnly(state: PoiProgress | undefined): Partial<PoiProgress> {
  if (state === undefined) return {};
  return {
    ...(state.checkedIn !== undefined && { checkedIn: state.checkedIn }),
  };
}

/** Poin aktivitas semua POI (check-in, cerita, percobaan pertama, POI tuntas). */
export function localActivityPoints(progress: ProgressMap): number {
  return Object.values(progress).reduce((sum: number, state: PoiProgress): number => sum + activityPoints(state), 0);
}

export const emptyProgress: PoiProgress = {
  closed: false,
  verifiedUntil: null,
  completed: false,
  failed: false,
  attempts: 0,
  pointsAwarded: 0,
  challengeDone: false,
  challengePoints: 0,
};

export type ProgressMap = { readonly [poiId: string]: PoiProgress };

/** Simpan hasil per quest dan hitung POI tuntas setelah seluruh quest yang aktif dikerjakan. */
export function recordQuestAnswer(state: PoiProgress, answer: AnswerResult, plan: readonly Quest[]): PoiProgress {
  const quest: Quest | undefined = plan.find((item: Quest): boolean => item.idQuest === answer.idQuest);
  if (quest === undefined) throw new Error(`Quest ${answer.idQuest} tidak ada pada POI ${answer.idPoi}.`);
  const quests: { readonly [questId: string]: QuestProgress } = {
    ...state.quests,
    [answer.idQuest]: {
      type: quest.type, completed: answer.completed, failed: answer.failed,
      attempts: answer.attemptCount, pointsAwarded: answer.pointsAwarded,
    },
  };
  const active: readonly QuestProgress[] = plan.flatMap((item: Quest): readonly QuestProgress[] => {
    const result: QuestProgress | undefined = quests[item.idQuest];
    return result === undefined ? [] : [result];
  });
  const completed: boolean = plan.length > 0 && plan.every((item: Quest): boolean => quests[item.idQuest]?.completed === true);
  const resolved: boolean = plan.length > 0 && plan.every((item: Quest): boolean =>
    quests[item.idQuest]?.completed === true || quests[item.idQuest]?.failed === true
  );
  return {
    ...state, quests, completed, failed: resolved && !completed,
    attempts: Math.max(0, ...active.map((result: QuestProgress): number => result.attempts)),
    pointsAwarded: active.reduce((sum: number, result: QuestProgress): number => sum + result.pointsAwarded, 0),
    challengeDone: resolved, challengePoints: 0, challengeAttempts: 0, challengeSuccess: completed,
  };
}

export type VisitRewards = {
  readonly totalPoints: number;
  readonly badges: readonly BadgeId[];
};

export type RestoredVisit = {
  readonly visit: Visit;
  readonly progress: ProgressMap;
  readonly rewards: VisitRewards;
};

/** Memakai hasil per POI dan total resmi tanpa menghitung ulang poin atau mengambil detail cerita. */
export function restoreServerVisit(server: VisitProgress): RestoredVisit {
  const cards: ProgressMap = Object.fromEntries(server.cards.map((card): [string, PoiProgress] => [
    card.id_poi,
    { ...emptyProgress, closed: card.status_kartu === "ditutup" },
  ]));
  const quests: ProgressMap = Object.fromEntries(server.poiProgress.map((poi): [string, PoiProgress] => [
    poi.id_poi,
    {
      closed: poi.kartu_ditutup || cards[poi.id_poi]?.closed === true,
      verifiedUntil: null,
      completed: poi.kuis_selesai,
      failed: poi.kuis_gagal,
      attempts: poi.jumlah_percobaan,
      pointsAwarded: poi.poin_kuis,
      quests: Object.fromEntries(server.quests.filter((quest): boolean => quest.id_poi === poi.id_poi).map((quest) => [
        quest.id_quest,
        {
          type: quest.type, completed: quest.answer_correct, failed: quest.failed === true,
          attempts: quest.jumlah_percobaan, pointsAwarded: quest.pointsAwarded ?? 0,
        },
      ])),
    },
  ]));
  return {
    visit: server.session,
    progress: { ...cards, ...quests },
    rewards: { totalPoints: server.totalPoints, badges: server.badges.map((badge): BadgeId => badge.kodeBadge) },
  };
}

/**
 * Server menentukan progres seluruh quest; perangkat mempertahankan verifikasi GPS/QR dan check-in.
 */
export function mergeServerProgress(local: ProgressMap, server: ProgressMap): ProgressMap {
  const verified: ProgressMap = Object.fromEntries(Object.entries(local).map(([id, state]): [string, PoiProgress] => [
    id, { ...emptyProgress, verifiedUntil: state.verifiedUntil, ...localOnly(state) },
  ]));
  const restored: ProgressMap = Object.fromEntries(Object.entries(server).map(([id, state]): [string, PoiProgress] => [
    id, { ...state, verifiedUntil: local[id]?.verifiedUntil ?? null, ...localOnly(local[id]) },
  ]));
  return { ...verified, ...restored };
}
