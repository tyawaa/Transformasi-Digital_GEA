// PB16: mode tanpa layar. Sengaja di luar React supaya tetap jalan dari task lokasi latar
// belakang saat layar terkunci (background.ts) maupun dari GPS biasa saat app terbuka.
// Petunjuk jarak dan tanda kedatangan memakai getaran.
import { Vibration } from "react-native";
import { ARRIVAL_VIBRATION, type Guidance, GUIDANCE_VIBRATION, hasReachedDestination, shouldAnnounce } from "../../domain/eyesFree";
import { distanceMeters, type Fix, ACCURACY_LIMIT_METERS } from "../../domain/geofence";

export type EyesFreeTarget = {
  readonly code: string;
  readonly latitude: number;
  readonly longitude: number;
};

let enabled = false;
let target: EyesFreeTarget | null = null;
let arrived: ReadonlySet<string> = new Set();
let lastGuidance: Guidance | null = null;

export function enableEyesFree(): void {
  enabled = true;
  lastGuidance = null;
}

export function disableEyesFree(): void {
  enabled = false;
  lastGuidance = null;
}

export function setEyesFreeTarget(next: EyesFreeTarget | null): void {
  if (target?.code !== next?.code) lastGuidance = null;
  target = next;
}

/** Kunjungan baru: semua POI bisa diumumkan lagi. */
export function resetEyesFreeVisit(): void {
  arrived = new Set();
  lastGuidance = null;
}

export function handleEyesFreeFix(fix: Fix, nowMs: number = Date.now()): void {
  if (!enabled || target === null || arrived.has(target.code)
    || !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters > ACCURACY_LIMIT_METERS) return;
  const meters: number = distanceMeters(fix, target);
  if (hasReachedDestination(meters)) {
    arrived = new Set([...arrived, target.code]);
    lastGuidance = null;
    Vibration.vibrate([...ARRIVAL_VIBRATION]);
    return;
  }
  const guidance: Guidance = { code: target.code, meters, atMs: nowMs };
  if (!shouldAnnounce(lastGuidance, guidance)) return;
  lastGuidance = guidance;
  Vibration.vibrate([...GUIDANCE_VIBRATION]);
}
