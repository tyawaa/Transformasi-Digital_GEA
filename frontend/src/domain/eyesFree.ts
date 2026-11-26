// PB16: kapan mode tanpa layar memberi tanda ke pengunjung. Fungsi murni, diuji di tests/eyesFree.test.mjs.

export type Guidance = { readonly code: string; readonly meters: number; readonly atMs: number };

export function hasReachedDestination(meters: number): boolean {
  return meters < 2;
}

/** Batas jarak yang selalu ditandai saat dilewati. */
const MILESTONES: readonly number[] = [20, 10];
const REPEAT_MS = 30_000;

/**
 * Tanda diberikan saat tujuan berganti, saat melewati 20 m dan 10 m, atau paling cepat tiap
 * 30 detik bila jaraknya berubah minimal 5 m. Supaya tidak bergetar terus saat diam di tempat.
 */
export function shouldAnnounce(last: Guidance | null, next: Guidance): boolean {
  if (last === null || last.code !== next.code) return true;
  if (MILESTONES.some((mark: number): boolean => last.meters > mark && next.meters <= mark)) return true;
  return next.atMs - last.atMs >= REPEAT_MS && Math.abs(next.meters - last.meters) >= 5;
}

/** Pola getar kedatangan: dua getaran panjang. */
export const ARRIVAL_VIBRATION: readonly number[] = [0, 400, 200, 400];

/** Pola getar petunjuk jarak: satu getaran pendek. */
export const GUIDANCE_VIBRATION: readonly number[] = [0, 150];
