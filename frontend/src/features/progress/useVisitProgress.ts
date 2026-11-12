import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { type Visit, visitSchema } from "../../domain/contracts";
import type { StoriesSource } from "../../services/stories";
import { emptyProgress, type PoiProgress, type ProgressMap } from "../stories/progress";

const VISIT_KEY = "gea.visit.v1";
const progressKey = (idSesi: string): string => `gea.progress.v1:${idSesi}`;

export type VisitProgressState = {
  readonly ready: boolean;
  readonly visit: Visit | null;
  readonly progress: ProgressMap;
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly startVisit: (visit: Visit) => void;
  readonly update: (poiId: string, patch: Partial<PoiProgress>) => void;
  readonly endVisit: () => void;
};

function warn(event: string, cause: unknown): void {
  console.warn(event, { error: cause instanceof Error ? cause.message : String(cause) });
}

/** Gabungkan progres server (sumber kebenaran percobaan) dengan verifikasi QR lokal. */
function merge(local: ProgressMap, server: ProgressMap): ProgressMap {
  const result: Record<string, PoiProgress> = { ...local };
  for (const [poiId, remote] of Object.entries(server)) {
    const mine: PoiProgress = local[poiId] ?? emptyProgress;
    result[poiId] = {
      // Foto dan tantangan hanya ada di perangkat; jangan hilang saat digabung dengan server.
      ...mine,
      closed: mine.closed || remote.closed,
      verifiedUntil: mine.verifiedUntil,
      completed: mine.completed || remote.completed,
      failed: mine.failed || remote.failed,
      attempts: Math.max(mine.attempts, remote.attempts),
    };
  }
  return result;
}

/**
 * Sesi kunjungan + progres per POI, tersimpan di AsyncStorage. Pada mode API, progres
 * dicocokkan dengan GET /sessions/{id}/progress saat aplikasi dibuka kembali.
 */
export function useVisitProgress(source: StoriesSource): VisitProgressState {
  const [ready, setReady] = useState<boolean>(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const latest = useRef<ProgressMap>({});
  latest.current = progress;

  useEffect((): (() => void) => {
    let active = true;
    async function load(): Promise<void> {
      const raw: string | null = await AsyncStorage.getItem(VISIT_KEY);
      if (raw === null) return;
      const parsed = visitSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return;
      const storedProgress: string | null = await AsyncStorage.getItem(progressKey(parsed.data.id_sesi));
      let local: ProgressMap = storedProgress === null ? {} : (JSON.parse(storedProgress) as ProgressMap);
      if (!active) return;
      setVisit(parsed.data);
      setProgress(local);
      try {
        const server: ProgressMap | null = await source.restore(parsed.data.id_sesi);
        if (server !== null && active) {
          local = merge(latest.current, server);
          setProgress(local);
          await AsyncStorage.setItem(progressKey(parsed.data.id_sesi), JSON.stringify(local));
        }
      } catch (cause: unknown) {
        // Tanpa jaringan tetap lanjut dengan progres lokal.
        warn("gea_progress_restore_failed", cause);
      }
    }
    load().catch((cause: unknown): void => warn("gea_visit_load_failed", cause)).finally((): void => {
      if (active) setReady(true);
    });
    return (): void => {
      active = false;
    };
  }, [source]);

  function persist(idSesi: string, next: ProgressMap): void {
    AsyncStorage.setItem(progressKey(idSesi), JSON.stringify(next)).catch((cause: unknown): void =>
      warn("gea_progress_save_failed", cause)
    );
  }

  function startVisit(next: Visit): void {
    setVisit(next);
    setProgress({});
    AsyncStorage.setItem(VISIT_KEY, JSON.stringify(next)).catch((cause: unknown): void =>
      warn("gea_visit_save_failed", cause)
    );
  }

  function update(poiId: string, patch: Partial<PoiProgress>): void {
    setProgress((current: ProgressMap): ProgressMap => {
      const next: ProgressMap = { ...current, [poiId]: { ...(current[poiId] ?? emptyProgress), ...patch } };
      latest.current = next;
      if (visit !== null) persist(visit.id_sesi, next);
      return next;
    });
  }

  function endVisit(): void {
    if (visit !== null) {
      AsyncStorage.removeItem(progressKey(visit.id_sesi)).catch((cause: unknown): void =>
        warn("gea_progress_clear_failed", cause)
      );
    }
    setVisit(null);
    setProgress({});
    AsyncStorage.removeItem(VISIT_KEY).catch((cause: unknown): void => warn("gea_visit_clear_failed", cause));
  }

  return {
    ready,
    visit,
    progress,
    progressOf: (poiId: string): PoiProgress => progress[poiId] ?? emptyProgress,
    startVisit,
    update,
    endVisit,
  };
}
