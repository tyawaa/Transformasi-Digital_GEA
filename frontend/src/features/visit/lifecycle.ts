import type { MuseumPoi } from "../../data/museum.ts";
import { distanceMeters, type Fix } from "../../domain/geofence.ts";
import type { Preferences } from "../preferences/usePreferences";
import { matchedTopics, poiMinutes } from "../preferences/recommend.ts";

export const MINUTE_MS: number = 60_000;
export const EXIT_BUFFER_MS: number = 5 * MINUTE_MS;
export type VisitPrompt = "closing_soon" | "closing_prepare" | "time_soon" | "time_up" | "route_done";
export type VisitSuggestion = {
  readonly poi: MuseumPoi;
  readonly minutes: number;
  readonly reason: string;
};

/** Tambahan dihitung dari rencana sebelumnya, atau sekarang bila rencana sudah terlewati. */
export function extensionOptions(endsAtMs: number, closingAtMs: number, nowMs: number): readonly number[] {
  return [10, 20, 30].filter((minutes: number): boolean =>
    Math.max(endsAtMs, nowMs) + minutes * MINUTE_MS <= closingAtMs - EXIT_BUFFER_MS,
  );
}

export function extendedDeadline(endsAtMs: number, closingAtMs: number, nowMs: number, minutes: number): number {
  if (!extensionOptions(endsAtMs, closingAtMs, nowMs).includes(minutes)) {
    throw new RangeError(`Tambahan waktu tidak tersedia: minutes=${minutes}, endsAtMs=${endsAtMs}, closingAtMs=${closingAtMs}, nowMs=${nowMs}`);
  }
  return Math.max(endsAtMs, nowMs) + minutes * MINUTE_MS;
}

/** Jam museum selalu mendapat prioritas; durasi pribadi tidak pernah menutup sesi otomatis. */
export function visitPrompt(nowMs: number, endsAtMs: number, closingAtMs: number, routeDone: boolean): VisitPrompt | null {
  const closingRemaining: number = closingAtMs - nowMs;
  if (closingRemaining <= 0) return null;
  if (closingRemaining <= EXIT_BUFFER_MS) return "closing_prepare";
  if (closingRemaining <= 15 * MINUTE_MS) return "closing_soon";
  if (endsAtMs <= nowMs) return "time_up";
  if (endsAtMs - nowMs <= 5 * MINUTE_MS) return "time_soon";
  return routeDone ? "route_done" : null;
}

/** Satu POI: cocok minat, belum selesai, dan muat bersama perjalanan serta cadangan keluar. */
export function suggestNextPoi(
  pois: readonly MuseumPoi[], preferences: Preferences | null, fix: Fix | null,
  availableMs: number,
): VisitSuggestion | null {
  const candidates: readonly VisitSuggestion[] = pois.map((poi: MuseumPoi): VisitSuggestion => {
    const interests: readonly string[] = matchedTopics(preferences, poi.code);
    // Tiga menit dialokasikan untuk perpindahan bila pengunjung belum memberikan lokasi.
    const walkingMinutes: number = fix === null ? 3 : Math.max(1, Math.ceil(distanceMeters(fix, poi) / 60));
    return {
      poi, minutes: poiMinutes(poi.code) + walkingMinutes,
      reason: interests.length > 0 ? `Sesuai minatmu: ${interests.join(", ")}.`
        : fix !== null ? "Koleksi yang belum selesai di dekat posisimu." : "Koleksi yang belum kamu selesaikan.",
    };
  }).filter((candidate: VisitSuggestion): boolean => candidate.minutes * MINUTE_MS <= availableMs)
    .sort((a: VisitSuggestion, b: VisitSuggestion): number =>
      matchedTopics(preferences, b.poi.code).length - matchedTopics(preferences, a.poi.code).length || a.minutes - b.minutes,
    );
  return candidates[0] ?? null;
}

export function closingTimeLabel(closingAtMs: number): string {
  return new Date(closingAtMs).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");
}
