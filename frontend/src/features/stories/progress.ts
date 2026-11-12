/** Status satu POI pada sesi ini. Disimpan di perangkat agar bertahan setelah app ditutup. */
export type PoiProgress = {
  /** Kartu cerita sudah dibaca sampai selesai dan ditutup. */
  readonly closed: boolean;
  /** Batas waktu verifikasi QR koleksi (ms epoch). Quest terkunci tanpa ini. */
  readonly verifiedUntil: number | null;
  /** Kuis dijawab benar. */
  readonly completed: boolean;
  /** Kuis gagal setelah batas percobaan habis. */
  readonly failed: boolean;
  readonly attempts: number;
  // Dinilai di aplikasi (belum ada di backend), jadi hanya tersimpan di perangkat.
  /** Indeks koleksi di "Story Isi 2" yang sudah difoto. */
  readonly photos?: readonly number[];
  /** Tantangan (quest kedua dari sheet) sudah dikerjakan. */
  readonly challengeDone?: boolean;
  /** Poin tantangan: poin sheet bila berhasil, 0 bila kesempatan habis. */
  readonly challengePoints?: number;
};

export const emptyProgress: PoiProgress = {
  closed: false,
  verifiedUntil: null,
  completed: false,
  failed: false,
  attempts: 0,
  photos: [],
  challengeDone: false,
  challengePoints: 0,
};

export type ProgressMap = { readonly [poiId: string]: PoiProgress };
