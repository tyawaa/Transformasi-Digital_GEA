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
};

export const emptyProgress: PoiProgress = {
  closed: false,
  verifiedUntil: null,
  completed: false,
  failed: false,
  attempts: 0,
};

export type ProgressMap = { readonly [poiId: string]: PoiProgress };
