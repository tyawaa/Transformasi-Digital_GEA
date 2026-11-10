// Geofence trigger kartu (E10 / PB06). Fungsi murni tanpa import supaya bisa diuji langsung
// dengan Node (lihat tests/geofence.test.mjs).
//
// Aturan:
// - Masuk radius checkpoint -> event "enter" (kartu muncul). Selama tetap di dalam, tidak ada event
//   baru, jadi kartu tidak muncul berulang.
// - Keluar radius (+ toleransi agar tidak berkedip di tepi) -> event "exit"; masuk lagi memicu lagi.
// - Bacaan dengan akurasi lebih buruk dari 20 m tidak dipakai menyimpulkan masuk/keluar
//   (status "weak"); aplikasi menawarkan scan QR.
// - Kartu yang sudah ditutup pengunjung tidak dimunculkan lagi di kunjungan yang sama
//   (disaring di luar fungsi ini dengan daftar "dismissed").

export const ACCURACY_LIMIT_METERS = 20;
/** Toleransi keluar radius agar kartu tidak muncul-hilang saat pengunjung berdiri di tepi. */
export const EXIT_MARGIN_METERS = 3;

export type Fix = {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
};

export type Checkpoint = {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
};

export type GeofenceEvent = { readonly type: "enter" | "exit"; readonly id: string };

export type GeofenceStep = {
  readonly inside: readonly string[];
  readonly events: readonly GeofenceEvent[];
  readonly weak: boolean;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function distanceMeters(
  a: { readonly latitude: number; readonly longitude: number },
  b: { readonly latitude: number; readonly longitude: number },
): number {
  const rad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Hitung status baru dari satu bacaan GPS. `inside` adalah status sebelumnya. */
export function stepGeofence(
  inside: readonly string[],
  fix: Fix,
  checkpoints: readonly Checkpoint[],
): GeofenceStep {
  if (!Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters > ACCURACY_LIMIT_METERS) {
    return { inside, events: [], weak: true };
  }
  const next: string[] = [];
  for (const checkpoint of checkpoints) {
    const distance: number = distanceMeters(fix, checkpoint);
    const wasInside: boolean = inside.includes(checkpoint.id);
    const limit: number = checkpoint.radiusMeters + (wasInside ? EXIT_MARGIN_METERS : 0);
    if (distance <= limit) next.push(checkpoint.id);
  }
  const events: GeofenceEvent[] = [
    ...next.filter((id: string): boolean => !inside.includes(id)).map((id: string): GeofenceEvent => ({ type: "enter", id })),
    ...inside.filter((id: string): boolean => !next.includes(id)).map((id: string): GeofenceEvent => ({ type: "exit", id })),
  ];
  return { inside: next, events, weak: false };
}

/** Checkpoint terdekat di antara yang sedang dimasuki (untuk ruang aktif di peta). */
export function nearestInside(
  inside: readonly string[],
  fix: Fix,
  checkpoints: readonly Checkpoint[],
): Checkpoint | null {
  let best: Checkpoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const checkpoint of checkpoints) {
    if (!inside.includes(checkpoint.id)) continue;
    const distance: number = distanceMeters(fix, checkpoint);
    if (distance < bestDistance) {
      best = checkpoint;
      bestDistance = distance;
    }
  }
  return best;
}
