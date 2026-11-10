// E10 / PB06: pantau GPS selama kunjungan aktif dan munculkan kartu saat pengunjung masuk radius.
// - Bacaan ±1 detik, jadi kartu muncul ≤3 detik setelah masuk radius.
// - Tidak berulang selama tetap di dalam; keluar lalu masuk lagi memicu lagi (src/domain/geofence.ts).
// - Kartu yang ditutup tidak muncul lagi di kunjungan yang sama (disimpan per id_sesi).
// - Hanya berjalan bila izin lokasi SUDAH diberikan; hook ini tidak memunculkan dialog izin.
// - Mode uji: simulate() menggantikan GPS asli dengan posisi buatan (untuk uji di web/laptop).
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Checkpoint, distanceMeters, type Fix, nearestInside, stepGeofence } from "../domain/geofence";

export type GeofenceStatus = "off" | "watching" | "no_permission" | "simulated";

export type GeofenceState = {
  readonly status: GeofenceStatus;
  /** Checkpoint terdekat yang sedang dimasuki (ruang aktif). */
  readonly active: Checkpoint | null;
  /** Akurasi terakhir lebih buruk dari 20 m: tampilkan banner "GPS lemah". */
  readonly weak: boolean;
  /** Checkpoint yang kartunya sedang ditampilkan (belum ditutup). */
  readonly card: string | null;
  readonly dismiss: (id: string) => void;
  /** null = kembali ke GPS asli. */
  readonly simulate: (fix: Fix | null) => void;
};

const storageKey = (visitId: string): string => `gea.geofence.dismissed.v1:${visitId}`;

export function useGeofence(
  { visitId, checkpoints, onEnter }: {
    /** null = belum ada kunjungan; pemantauan mati. */
    readonly visitId: string | null;
    readonly checkpoints: readonly Checkpoint[];
    /** Dipanggil untuk setiap checkpoint yang baru dimasuki (mis. zona untuk intro sayap). */
    readonly onEnter?: (id: string) => void;
  },
): GeofenceState {
  const [status, setStatus] = useState<GeofenceStatus>("off");
  const [active, setActive] = useState<Checkpoint | null>(null);
  const [weak, setWeak] = useState(false);
  const [card, setCard] = useState<string | null>(null);
  const [simulated, setSimulated] = useState<Fix | null>(null);

  const inside = useRef<readonly string[]>([]);
  const dismissed = useRef<ReadonlySet<string>>(new Set());
  const checkpointsRef = useRef(checkpoints);
  checkpointsRef.current = checkpoints;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const reset = (): void => {
    inside.current = [];
    setActive(null);
    setWeak(false);
    setCard(null);
  };

  // Daftar kartu yang sudah ditutup, per kunjungan.
  useEffect((): void => {
    dismissed.current = new Set();
    reset();
    if (visitId === null) return;
    AsyncStorage.getItem(storageKey(visitId)).then(
      (raw: string | null): void => {
        if (raw === null) return;
        try {
          const ids: unknown = JSON.parse(raw);
          if (Array.isArray(ids)) dismissed.current = new Set(ids.filter((id): id is string => typeof id === "string"));
        } catch {
          // Data rusak: anggap belum ada kartu yang ditutup.
        }
      },
      (): void => undefined,
    );
  }, [visitId]);

  const handleFix = useCallback((fix: Fix): void => {
    const step = stepGeofence(inside.current, fix, checkpointsRef.current);
    setWeak(step.weak);
    if (step.weak) return;
    inside.current = step.inside;
    setActive(nearestInside(step.inside, fix, checkpointsRef.current));
    // Beberapa checkpoint bisa dimasuki sekaligus: kartu untuk yang paling dekat.
    let nearest: { id: string; distance: number } | null = null;
    for (const event of step.events) {
      if (event.type === "enter") {
        onEnterRef.current?.(event.id);
        const checkpoint = checkpointsRef.current.find((c: Checkpoint): boolean => c.id === event.id);
        if (checkpoint === undefined || dismissed.current.has(event.id)) continue;
        const distance: number = distanceMeters(fix, checkpoint);
        if (nearest === null || distance < nearest.distance) nearest = { id: event.id, distance };
      } else {
        setCard((current: string | null): string | null => (current === event.id ? null : current));
      }
    }
    if (nearest !== null) setCard(nearest.id);
  }, []);

  // GPS asli (dimatikan saat simulasi aktif).
  useEffect((): (() => void) | undefined => {
    if (visitId === null || simulated !== null) return undefined;
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;
    (async (): Promise<void> => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          setStatus("no_permission");
          return;
        }
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
          (position: Location.LocationObject): void => {
            handleFix({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters: position.coords.accuracy ?? Number.POSITIVE_INFINITY,
            });
          },
        );
        if (cancelled) subscription.remove();
        else setStatus("watching");
      } catch {
        if (!cancelled) setStatus("no_permission");
      }
    })();
    return (): void => {
      cancelled = true;
      subscription?.remove();
      setStatus("off");
    };
  }, [visitId, simulated, handleFix]);

  // Posisi buatan dari Mode uji.
  useEffect((): void => {
    if (simulated === null || visitId === null) return;
    setStatus("simulated");
    handleFix(simulated);
  }, [simulated, visitId, handleFix]);

  const dismiss = useCallback((id: string): void => {
    const next = new Set(dismissed.current);
    next.add(id);
    dismissed.current = next;
    setCard((current: string | null): string | null => (current === id ? null : current));
    if (visitId !== null) {
      AsyncStorage.setItem(storageKey(visitId), JSON.stringify([...next])).catch((): void => undefined);
    }
  }, [visitId]);

  const simulate = useCallback((fix: Fix | null): void => {
    if (fix === null) reset();
    setSimulated(fix);
  }, []);

  return { status, active, weak, card, dismiss, simulate };
}
