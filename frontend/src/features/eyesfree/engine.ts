// PB16: mode tanpa layar. Sengaja di luar React supaya tetap jalan dari task lokasi latar
// belakang saat layar terkunci (background.ts) maupun dari GPS biasa saat app terbuka.
// Tidak memakai suara buatan: saat tiba diputar rekaman kelompok, petunjuk jarak lewat getaran.
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Vibration } from "react-native";
import { ARRIVAL_VIBRATION, type Guidance, GUIDANCE_VIBRATION, shouldAnnounce } from "../../domain/eyesFree";
import { distanceMeters, type Fix, ACCURACY_LIMIT_METERS } from "../../domain/geofence";

export type EyesFreeTarget = {
  readonly code: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
  /** Rekaman cerita kelompok (data/poiAudio.ts); undefined = cukup getar. */
  readonly recording?: number | undefined;
};

let enabled = false;
let targets: readonly EyesFreeTarget[] = [];
let stops: readonly EyesFreeTarget[] = [];
let arrived: ReadonlySet<string> = new Set();
let lastGuidance: Guidance | null = null;
let player: AudioPlayer | null = null;

export function stopEyesFreeNarration(): void {
  player?.remove();
  player = null;
}

function narrate(target: EyesFreeTarget): void {
  stopEyesFreeNarration();
  Vibration.vibrate([...ARRIVAL_VIBRATION]);
  if (target.recording === undefined) return;
  player = createAudioPlayer(target.recording);
  player.play();
}

export async function enableEyesFree(): Promise<void> {
  enabled = true;
  lastGuidance = null;
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "duckOthers" })
    .catch((cause: unknown): void => console.warn("gea_eyesfree_audio_mode_failed", cause));
}

export function disableEyesFree(): void {
  enabled = false;
  stopEyesFreeNarration();
  lastGuidance = null;
}

/** Urutan tujuan untuk getar petunjuk jarak (rute yang belum selesai, atau tujuan pilihan di depan). */
export function setEyesFreeTargets(next: readonly EyesFreeTarget[]): void {
  targets = next;
}

/** Semua POI yang dibuka: rekaman diputar saat tiba di POI mana pun, bukan hanya tujuan rute. */
export function setEyesFreeStops(next: readonly EyesFreeTarget[]): void {
  stops = next;
}

/** Kunjungan baru: semua POI bisa diumumkan lagi. */
export function resetEyesFreeVisit(): void {
  arrived = new Set();
  lastGuidance = null;
}

export function handleEyesFreeFix(fix: Fix, nowMs: number = Date.now()): void {
  if (!enabled || !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters > ACCURACY_LIMIT_METERS) return;
  // Radius POI saling tumpang tindih, jadi yang diumumkan POI terdekat.
  const arrival: EyesFreeTarget | undefined = [...stops, ...targets]
    .filter((target: EyesFreeTarget): boolean => !arrived.has(target.code) && distanceMeters(fix, target) <= target.radiusMeters)
    .sort((a: EyesFreeTarget, b: EyesFreeTarget): number => distanceMeters(fix, a) - distanceMeters(fix, b))[0];
  if (arrival !== undefined) {
    arrived = new Set([...arrived, arrival.code]);
    lastGuidance = null;
    narrate(arrival);
    return;
  }
  const next: EyesFreeTarget | undefined = targets.find((target: EyesFreeTarget): boolean => !arrived.has(target.code));
  if (next === undefined) return;
  const guidance: Guidance = { code: next.code, meters: distanceMeters(fix, next), atMs: nowMs };
  if (!shouldAnnounce(lastGuidance, guidance)) return;
  // Rekaman yang sedang diputar tidak diganggu getaran petunjuk.
  if (player?.playing === true) return;
  lastGuidance = guidance;
  Vibration.vibrate([...GUIDANCE_VIBRATION]);
}
