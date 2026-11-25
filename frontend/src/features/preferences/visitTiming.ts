import { museumAccessAt, museumDayAt } from "../../domain/museumHours.ts";

export const durationOptions = ["< 30 menit", "30-45 Menit", "45 menit-1.5 Jam", "> 1.5 jam"] as const;
const MINUTE_MS: number = 60_000;

export type VisitWindow = {
  readonly endsAtMs: number;
  readonly budgetMinutes: number;
  readonly closingLimited: boolean;
};

function durationMinutes(duration: string): number {
  switch (duration) {
    case "< 30 menit": return 30;
    case "30-45 Menit": return 45;
    case "45 menit-1.5 Jam": return 90;
    case "> 1.5 jam": return Number.POSITIVE_INFINITY;
    default: throw new RangeError(`Pilihan durasi kunjungan tidak dikenal: ${duration}`);
  }
}

/** Batas waktu tetap pada tanggal kunjungan di zona waktu museum (WIB). */
export function museumClosingAt(startedAtMs: number): number {
  return museumDayAt(startedAtMs).closingAtMs;
}

export function visitWindow(duration: string, startedAtMs: number): VisitWindow {
  const closingAtMs: number = museumClosingAt(startedAtMs);
  const chosenEndMs: number = startedAtMs + durationMinutes(duration) * MINUTE_MS;
  if (museumAccessAt(startedAtMs) !== "open") return { endsAtMs: startedAtMs, budgetMinutes: 0, closingLimited: true };
  const endsAtMs: number = Math.max(startedAtMs, Math.min(chosenEndMs, closingAtMs));
  return {
    endsAtMs,
    budgetMinutes: Math.floor((endsAtMs - startedAtMs) / MINUTE_MS),
    closingLimited: closingAtMs < chosenEndMs,
  };
}

/** Menghitung dari timestamp, sehingga waktu tetap berjalan selama app di latar atau ditutup. */
export function remainingVisitMs(endsAtMs: number, nowMs: number): number {
  if (!Number.isFinite(endsAtMs) || !Number.isFinite(nowMs)) {
    throw new RangeError(`Batas atau waktu kunjungan tidak valid: endsAtMs=${endsAtMs}, nowMs=${nowMs}`);
  }
  return Math.max(0, endsAtMs - nowMs);
}

export function formatCountdown(remainingMs: number): string {
  if (!Number.isFinite(remainingMs) || remainingMs < 0) {
    throw new RangeError(`Sisa waktu kunjungan tidak valid: ${remainingMs}`);
  }
  const seconds: number = Math.ceil(remainingMs / 1000);
  const hours: number = Math.floor(seconds / 3600);
  const minutes: number = Math.floor(seconds / 60) % 60;
  const tail: string = `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return hours === 0 ? tail : `${hours}:${tail}`;
}
