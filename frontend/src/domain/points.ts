// Aturan poin, progres, dan lencana Sprint 2 (E11, keputusan A7).
// Sumber hitungan resmi nantinya ada di Supabase (E11/E12 milik C-2). Sampai endpoint itu ada,
// aplikasi menghitung dengan aturan yang sama dari data percobaan agar tampilan bisa diuji.
// Modul ini sengaja tanpa import supaya bisa diuji langsung dengan Node.

export const MAX_ATTEMPTS = 3;

/** Poin kuis menurut percobaan ke-1/2/3; gagal = 0. Quest foto (5) ditunda ke Sprint 3. */
export const QUIZ_POINTS: readonly number[] = [20, 10, 5];
export const PHOTO_POINTS = 5;

export type QuestState = {
  readonly completed: boolean;
  readonly failed: boolean;
  readonly attempts: number;
};

export type StoryState = QuestState & { readonly closed: boolean };

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

export type BadgeId = "BD-01" | "BD-02" | "BD-04" | "BD-05";

export type BadgeDef = {
  readonly id: BadgeId;
  readonly name: string;
  readonly description: string;
  readonly bonus: number;
};

// Dari sheet Badge_Poin. BD-03 (Pemburu Foto) menunggu quest foto di Sprint 3.
export const badges: readonly BadgeDef[] = [
  { id: "BD-01", name: "Penjelajah Sayap Kiri", description: "Selesaikan semua POI aktif di sayap kiri.", bonus: 50 },
  { id: "BD-02", name: "Penjelajah Sayap Kanan", description: "Selesaikan semua POI aktif di sayap kanan.", bonus: 50 },
  { id: "BD-04", name: "Otak Geologi", description: "Jawab benar semua kuis di percobaan pertama.", bonus: 40 },
  { id: "BD-05", name: "Geolog Sejati", description: "Selesaikan semua POI aktif.", bonus: 100 },
];

export type PoiRef = { readonly id: string; readonly wing: "left" | "right" | null };

function done(state: StoryState | undefined): boolean {
  return state !== undefined && (state.completed || state.failed);
}

export function earnedBadges(
  pois: readonly PoiRef[],
  states: { readonly [poiId: string]: StoryState | undefined },
): readonly BadgeId[] {
  if (pois.length === 0) return [];
  const wingDone = (wing: "left" | "right"): boolean => {
    const inWing: readonly PoiRef[] = pois.filter((poi: PoiRef): boolean => poi.wing === wing);
    return inWing.length > 0 && inWing.every((poi: PoiRef): boolean => done(states[poi.id]));
  };
  const all: boolean = pois.every((poi: PoiRef): boolean => done(states[poi.id]));
  const perfect: boolean = pois.every((poi: PoiRef): boolean => {
    const state: StoryState | undefined = states[poi.id];
    return state !== undefined && state.completed && state.attempts === 1;
  });
  const result: BadgeId[] = [];
  if (wingDone("left")) result.push("BD-01");
  if (wingDone("right")) result.push("BD-02");
  if (perfect) result.push("BD-04");
  if (all) result.push("BD-05");
  return result;
}

export function totalPoints(
  pois: readonly PoiRef[],
  states: { readonly [poiId: string]: StoryState | undefined },
): number {
  const quiz: number = pois.reduce((sum: number, poi: PoiRef): number => {
    const state: StoryState | undefined = states[poi.id];
    return sum + (state === undefined ? 0 : quizPoints(state));
  }, 0);
  const bonus: number = earnedBadges(pois, states).reduce(
    (sum: number, id: BadgeId): number =>
      sum + (badges.find((badge: BadgeDef): boolean => badge.id === id)?.bonus ?? 0),
    0,
  );
  return quiz + bonus;
}
