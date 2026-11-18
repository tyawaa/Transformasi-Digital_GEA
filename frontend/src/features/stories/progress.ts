import type { BadgeId, VisitProgress } from "../../domain/contracts.ts";

/** Status satu POI pada sesi ini. Disimpan di perangkat agar bertahan setelah app ditutup. */
export type PoiProgress = {
  /** Kartu cerita sudah dibaca sampai selesai dan ditutup. */
  readonly closed: boolean;
  /** Batas waktu verifikasi GPS atau QR koleksi (ms epoch). Quest terkunci tanpa ini. */
  readonly verifiedUntil: number | null;
  /** Kuis dijawab benar. */
  readonly completed: boolean;
  /** Kuis gagal setelah batas percobaan habis. */
  readonly failed: boolean;
  readonly attempts: number;
  /** Poin kuis dari respons jawaban/progres, tanpa bonus lencana. */
  readonly pointsAwarded: number;
  // Dinilai di aplikasi (belum ada di backend), jadi hanya tersimpan di perangkat.
  /** Indeks koleksi di "Story Isi 2" yang sudah difoto. */
  readonly photos?: readonly number[];
  /** Tantangan (quest kedua dari sheet) sudah dikerjakan. */
  readonly challengeDone?: boolean;
  /** Poin tantangan: poin sheet bila berhasil, 0 bila kesempatan habis. */
  readonly challengePoints?: number;
  /** Jumlah jawaban tantangan non-foto (1 = benar di percobaan pertama); 0 untuk quest foto. */
  readonly challengeAttempts?: number;
};

/** Bagian progres yang hanya ada di perangkat (tantangan & foto koleksi). */
function localOnly(state: PoiProgress | undefined): Partial<PoiProgress> {
  if (state === undefined) return {};
  return {
    ...(state.photos !== undefined && { photos: state.photos }),
    ...(state.challengeDone !== undefined && { challengeDone: state.challengeDone }),
    ...(state.challengePoints !== undefined && { challengePoints: state.challengePoints }),
    ...(state.challengeAttempts !== undefined && { challengeAttempts: state.challengeAttempts }),
  };
}

/** Total poin tantangan lokal; belum dinilai server sehingga ditambahkan ke total resmi. */
export function localChallengePoints(progress: ProgressMap): number {
  return Object.values(progress).reduce((sum: number, state: PoiProgress): number => sum + (state.challengePoints ?? 0), 0);
}

export const emptyProgress: PoiProgress = {
  closed: false,
  verifiedUntil: null,
  completed: false,
  failed: false,
  attempts: 0,
  pointsAwarded: 0,
  photos: [],
  challengeDone: false,
  challengePoints: 0,
};

export type ProgressMap = { readonly [poiId: string]: PoiProgress };

export type VisitRewards = {
  readonly totalPoints: number;
  readonly badges: readonly BadgeId[];
};

export type RestoredVisit = {
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
    },
  ]));
  return {
    progress: { ...cards, ...quests },
    rewards: { totalPoints: server.totalPoints, badges: server.badges.map((badge): BadgeId => badge.kodeBadge) },
  };
}

/**
 * Server menentukan progres kuis; dari perangkat hanya dipertahankan masa berlaku verifikasi GPS/QR
 * dan data tantangan/foto (belum dinilai server).
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
