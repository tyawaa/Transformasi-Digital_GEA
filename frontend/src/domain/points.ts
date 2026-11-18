// Aturan poin, progres, dan lencana (Sprint 2 E11/A7; lencana Sprint 3 dari sheet Badge_Poin).
// Perhitungan lokal hanya untuk mode mock; mode API memakai hasil resmi Supabase.
import type { BadgeId } from "./contracts.ts";

export type { BadgeId } from "./contracts.ts";

export const MAX_ATTEMPTS = 3;

/** Poin kuis menurut percobaan ke-1/2/3; gagal = 0. Poin tantangan ditambahkan terpisah (challengePoints). */
export const QUIZ_POINTS: readonly number[] = [20, 10, 5];
export const PHOTO_POINTS = 5;

export type QuestState = {
  readonly completed: boolean;
  readonly failed: boolean;
  readonly attempts: number;
};

export type StoryState = QuestState & {
  readonly closed: boolean;
  /** Poin tantangan (foto / benar-salah / isian) dari sheet Quest, dinilai di aplikasi. */
  readonly challengePoints?: number;
};

export function quizPoints(state: QuestState): number {
  if (!state.completed) return 0;
  return QUIZ_POINTS[state.attempts - 1] ?? 0;
}

export function attemptsLeft(state: QuestState): number {
  if (state.completed || state.failed) return 0;
  return Math.max(0, MAX_ATTEMPTS - state.attempts);
}

/** Setelah jawaban salah ke-n: apakah quest berakhir gagal. */
export function isOutOfAttempts(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

export type PoiStatus = "belum" | "sebagian" | "selesai";

export function poiStatus(state: StoryState | undefined, verified: boolean): PoiStatus {
  if (state === undefined) return verified ? "sebagian" : "belum";
  if (state.completed || state.failed) return "selesai";
  if (state.closed || state.attempts > 0 || verified) return "sebagian";
  return "belum";
}

// Sprint 3: daftar lencana dari sheet Badge_Poin (workbook _Anak, 15 Nov 2026).
// Kuning = prioritas tinggi (POI-01 s.d. POI-11). Oranye/merah = prioritas rendah (POI-12 s.d. POI-21):
// BD-05, BD-08, BD-09 hanya tampil bila sayap kanan dibuka. BD-14 (foto anak) nonaktif karena anak tidak
// mengerjakan quest foto.
export type BadgeDef = {
  readonly id: BadgeId;
  readonly name: string;
  readonly description: string;
  readonly bonus: number;
  /** Untuk siapa lencana berlaku. */
  readonly audience: "semua" | "umum" | "anak";
  /** true = bergantung pada POI-12 s.d. POI-21 (sayap kanan). */
  readonly lowPriority?: boolean;
  /** false = belum bisa diraih di versi ini. */
  readonly active?: boolean;
};

export const badges: readonly BadgeDef[] = [
  { id: "BD-01", name: "Penjelajah Sayap Kiri", description: "Check-in di semua POI sayap kiri (POI-01 s.d. POI-11).", bonus: 50, audience: "semua" },
  { id: "BD-02", name: "Pemburu Foto", description: "Selesaikan semua quest tipe Foto.", bonus: 30, audience: "umum" },
  { id: "BD-03", name: "Otak Geologi", description: "Jawab benar semua kuis tanpa salah.", bonus: 40, audience: "semua" },
  { id: "BD-04", name: "Geolog Sejati", description: "Selesaikan semua POI.", bonus: 100, audience: "semua" },
  { id: "BD-05", name: "Penjelajah Sayap Kanan", description: "Check-in di semua POI sayap kanan (POI-12 s.d. POI-20).", bonus: 50, audience: "semua", lowPriority: true },
  { id: "BD-06", name: "Langkah Pertama", description: "Selesaikan quest pertamamu di POI mana pun.", bonus: 10, audience: "semua" },
  { id: "BD-07", name: "Pembaca Gerak Bumi", description: "Selesaikan quest di POI-03, POI-04, POI-05, dan POI-08.", bonus: 30, audience: "semua" },
  { id: "BD-08", name: "Pengelana Lorong Waktu", description: "Selesaikan quest di POI-12 s.d. POI-17.", bonus: 40, audience: "semua", lowPriority: true },
  { id: "BD-09", name: "Jejak Manusia Purba", description: "Selesaikan quest di POI-18, POI-19, dan POI-20.", bonus: 30, audience: "semua", lowPriority: true },
  { id: "BD-10", name: "Kolektor Batuan", description: "Selesaikan quest di POI-07, POI-10, dan POI-11.", bonus: 30, audience: "semua" },
  { id: "BD-11", name: "Rajin Berkunjung", description: "Selesaikan minimal 1 quest pada 3 hari kunjungan yang berbeda.", bonus: 20, audience: "semua" },
  { id: "BD-12", name: "Si Teliti", description: "Jawab benar pada percobaan pertama di 5 quest kuis.", bonus: 25, audience: "semua" },
  { id: "BD-13", name: "Penakluk Tantangan Sulit", description: "Selesaikan semua quest tingkat Sulit (POI-06 dan POI-10).", bonus: 40, audience: "semua" },
  { id: "BD-14", name: "Fotografer Cilik", description: "Selesaikan semua quest foto anak-anak.", bonus: 25, audience: "anak", active: false },
  { id: "BD-15", name: "Penjelajah Cilik", description: "Selesaikan quest anak-anak di minimal 2 POI berbeda.", bonus: 15, audience: "anak" },
];

/**
 * POI untuk hitungan lencana. quest = quest yang berlaku untuk profil pengunjung:
 * "quiz" = Mini Quiz pilihan ganda/cocokkan (dinilai backend), "kuis" = tantangan benar-salah/isian,
 * "foto" = tantangan foto, null = tidak ada quest (POI selesai setelah cerita).
 */
export type PoiRef = {
  readonly id: string;
  readonly wing: "left" | "right" | null;
  readonly code?: string;
  readonly quest?: "quiz" | "kuis" | "foto" | null;
};

export type BadgeContext = {
  /** Pengunjung kategori Anak-anak. */
  readonly kid?: boolean;
  /** Jumlah hari berbeda pengunjung menyelesaikan quest (BD-11). */
  readonly questDays?: number;
  /** Sayap kanan dibuka di versi ini (lencana prioritas rendah). */
  readonly rightWing?: boolean;
};

/** Lencana yang tampil untuk pengunjung ini. */
export function availableBadges(ctx: BadgeContext = {}): readonly BadgeDef[] {
  return badges.filter((badge: BadgeDef): boolean =>
    badge.active !== false &&
    (badge.lowPriority !== true || ctx.rightWing === true) &&
    (badge.audience === "semua" || (badge.audience === "anak") === (ctx.kid === true))
  );
}

export type BadgeState = StoryState & {
  readonly challengeDone?: boolean;
  readonly challengeAttempts?: number;
};

function done(state: StoryState | undefined): boolean {
  return state !== undefined && (state.completed || state.failed);
}

function questOf(poi: PoiRef): "quiz" | "kuis" | "foto" | null {
  return poi.quest === undefined ? "quiz" : poi.quest;
}

/** Quest POI ini sudah dikerjakan (benar atau kesempatan habis); POI tanpa quest = cerita selesai. */
function questFinished(poi: PoiRef, state: BadgeState | undefined): boolean {
  if (state === undefined) return false;
  const quest = questOf(poi);
  if (quest === "quiz" || quest === null) return done(state);
  return state.challengeDone === true;
}

/** Quest kuis (Mini Quiz atau benar-salah/isian) dijawab benar di percobaan pertama. */
function firstTry(poi: PoiRef, state: BadgeState | undefined): boolean {
  if (state === undefined) return false;
  const quest = questOf(poi);
  if (quest === "quiz") return state.completed && state.attempts === 1;
  if (quest === "kuis") return state.challengeDone === true && state.challengeAttempts === 1 && (state.challengePoints ?? 0) > 0;
  return false;
}

/** Pernah datang ke POI (check-in): QR/cerita/quest. */
function visited(state: BadgeState | undefined): boolean {
  return state !== undefined &&
    (state.closed || state.completed || state.failed || state.attempts > 0 || state.challengeDone === true);
}

export function earnedBadges(
  pois: readonly PoiRef[],
  states: { readonly [poiId: string]: BadgeState | undefined },
  ctx: BadgeContext = {},
): readonly BadgeId[] {
  if (pois.length === 0) return [];
  const byCode = (code: string): PoiRef | undefined => pois.find((poi: PoiRef): boolean => poi.code === code);
  const finished = (poi: PoiRef): boolean => questFinished(poi, states[poi.id]);
  // Semua POI yang disebut lencana harus ada di versi ini dan questnya sudah selesai.
  const finishedAll = (codes: readonly string[]): boolean =>
    codes.every((code: string): boolean => {
      const poi = byCode(code);
      return poi !== undefined && finished(poi);
    });
  const wingVisited = (wing: "left" | "right"): boolean => {
    const inWing: readonly PoiRef[] = pois.filter((poi: PoiRef): boolean => poi.wing === wing);
    return inWing.length > 0 && inWing.every((poi: PoiRef): boolean => visited(states[poi.id]));
  };
  const withQuest = (kind: "foto" | "kuiz"): readonly PoiRef[] =>
    pois.filter((poi: PoiRef): boolean => kind === "foto" ? questOf(poi) === "foto" : questOf(poi) === "quiz" || questOf(poi) === "kuis");
  const photos = withQuest("foto");
  const quizzes = withQuest("kuiz");
  const questsDone: number = pois.filter((poi: PoiRef): boolean => questOf(poi) !== null && finished(poi)).length;

  const earned: { readonly [id in BadgeId]?: boolean } = {
    "BD-01": wingVisited("left"),
    "BD-02": photos.length > 0 && photos.every(finished),
    "BD-03": quizzes.length > 0 && quizzes.every((poi: PoiRef): boolean => firstTry(poi, states[poi.id])),
    "BD-04": pois.every((poi: PoiRef): boolean => done(states[poi.id])),
    "BD-05": wingVisited("right"),
    "BD-06": questsDone >= 1,
    "BD-07": finishedAll(["P03", "P04", "P05", "P08"]),
    "BD-08": finishedAll(["P12", "P13", "P14", "P15", "P16", "P17"]),
    "BD-09": finishedAll(["P18", "P19", "P20"]),
    "BD-10": finishedAll(["P07", "P10", "P11"]),
    "BD-11": (ctx.questDays ?? 0) >= 3,
    "BD-12": quizzes.filter((poi: PoiRef): boolean => firstTry(poi, states[poi.id])).length >= 5,
    "BD-13": finishedAll(["P06", "P10"]),
    "BD-15": questsDone >= 2,
  };
  return availableBadges(ctx)
    .filter((badge: BadgeDef): boolean => earned[badge.id] === true)
    .map((badge: BadgeDef): BadgeId => badge.id);
}

export function totalPoints(
  pois: readonly PoiRef[],
  states: { readonly [poiId: string]: BadgeState | undefined },
  ctx: BadgeContext = {},
): number {
  const quests: number = pois.reduce((sum: number, poi: PoiRef): number => {
    const state: StoryState | undefined = states[poi.id];
    return sum + (state === undefined ? 0 : quizPoints(state) + (state.challengePoints ?? 0));
  }, 0);
  return quests + badgeBonus(earnedBadges(pois, states, ctx));
}

/** Jumlah bonus poin dari daftar lencana. */
export function badgeBonus(ids: readonly BadgeId[]): number {
  return ids.reduce(
    (sum: number, id: BadgeId): number =>
      sum + (badges.find((badge: BadgeDef): boolean => badge.id === id)?.bonus ?? 0),
    0,
  );
}
