import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  type AnswerResult,
  type ScoredAnswerResult,
  scoredAnswerResultSchema,
  type Visit,
  visitSchema,
} from "../../domain/contracts";
import { quizPoints } from "../../domain/points";
import { readableError } from "../../services/api";
import type { StoriesSource } from "../../services/stories";
import {
  emptyProgress,
  mergeServerProgress,
  type PoiProgress,
  type ProgressMap,
  type RestoredVisit,
  type VisitRewards,
} from "../stories/progress";

const VISIT_KEY = "gea.visit.v1";
const progressKey = (idSesi: string): string => `gea.progress.v1:${idSesi}`;

export type VisitProgressState = {
  readonly ready: boolean;
  readonly visit: Visit | null;
  readonly progress: ProgressMap;
  readonly rewards: VisitRewards;
  readonly error: string | null;
  readonly retry: () => void;
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly startVisit: (visit: Visit) => void;
  readonly update: (poiId: string, patch: Partial<PoiProgress>) => void;
  readonly recordAnswer: (answer: AnswerResult) => void;
  readonly endVisit: () => void;
};

function warn(event: string, cause: unknown): void {
  console.warn(event, { error: cause instanceof Error ? cause.message : String(cause) });
}

/**
 * Sesi kunjungan + progres per POI, tersimpan di AsyncStorage. Pada mode API, progres
 * dicocokkan dengan GET /sessions/{id}/progress saat aplikasi dibuka kembali.
 */
export function useVisitProgress(source: StoriesSource): VisitProgressState {
  const [ready, setReady] = useState<boolean>(false);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [rewards, setRewards] = useState<VisitRewards>({ totalPoints: 0, badges: [] });
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState<number>(0);

  useEffect((): (() => void) => {
    let active = true;
    async function load(): Promise<void> {
      const raw: string | null = await AsyncStorage.getItem(VISIT_KEY);
      if (raw === null) return;
      const restoredVisit: Visit = visitSchema.parse(JSON.parse(raw));
      const storedProgress: string | null = await AsyncStorage.getItem(progressKey(restoredVisit.id_sesi));
      let local: ProgressMap = storedProgress === null ? {} : (JSON.parse(storedProgress) as ProgressMap);
      // Migrasi cache demo lama yang belum menyimpan poin per jawaban.
      if (source.kind === "mock") {
        local = Object.fromEntries(Object.entries(local).map(([id, state]): [string, PoiProgress] => [
          id, { ...state, pointsAwarded: quizPoints(state) },
        ]));
      }
      if (!active) return;
      setVisit(restoredVisit);
      const server: RestoredVisit | null = await source.restore(restoredVisit.id_sesi);
      if (!active) return;
      if (server !== null) {
        local = mergeServerProgress(local, server.progress);
        setRewards(server.rewards);
        await AsyncStorage.setItem(progressKey(restoredVisit.id_sesi), JSON.stringify(local));
      }
      if (!active) return;
      setProgress(local);
    }
    load().catch((cause: unknown): void => {
      warn("gea_visit_load_failed", cause);
      if (active) setError(readableError(cause));
    }).finally((): void => {
      if (active) setReady(true);
    });
    return (): void => {
      active = false;
    };
  }, [source, reload]);

  function retry(): void {
    setError(null);
    setReady(false);
    setReload((current: number): number => current + 1);
  }

  function persist(idSesi: string, next: ProgressMap): void {
    AsyncStorage.setItem(progressKey(idSesi), JSON.stringify(next)).catch((cause: unknown): void =>
      warn("gea_progress_save_failed", cause)
    );
  }

  function startVisit(next: Visit): void {
    setVisit(next);
    setProgress({});
    setRewards({ totalPoints: 0, badges: [] });
    AsyncStorage.setItem(VISIT_KEY, JSON.stringify(next)).catch((cause: unknown): void =>
      warn("gea_visit_save_failed", cause)
    );
  }

  function update(poiId: string, patch: Partial<PoiProgress>): void {
    setProgress((current: ProgressMap): ProgressMap => {
      const next: ProgressMap = { ...current, [poiId]: { ...(current[poiId] ?? emptyProgress), ...patch } };
      if (visit !== null) persist(visit.id_sesi, next);
      return next;
    });
  }

  /** Respons API mengganti total; kode lencana baru digabung tanpa memberikan bonus lokal. */
  function recordAnswer(answer: AnswerResult): void {
    if (source.kind === "api") {
      const scored: ScoredAnswerResult = scoredAnswerResultSchema.parse(answer);
      setRewards((current: VisitRewards): VisitRewards => ({
        totalPoints: scored.totalPoints,
        badges: [...new Set([...current.badges, ...scored.newBadges])],
      }));
    }
    update(answer.idPoi, {
      completed: answer.completed,
      failed: answer.failed,
      attempts: answer.attemptCount,
      pointsAwarded: answer.pointsAwarded,
    });
  }

  function endVisit(): void {
    setError(null);
    if (visit !== null) {
      AsyncStorage.removeItem(progressKey(visit.id_sesi)).catch((cause: unknown): void =>
        warn("gea_progress_clear_failed", cause)
      );
    }
    setVisit(null);
    setProgress({});
    setRewards({ totalPoints: 0, badges: [] });
    AsyncStorage.removeItem(VISIT_KEY).catch((cause: unknown): void => warn("gea_visit_clear_failed", cause));
  }

  return {
    ready,
    visit,
    progress,
    rewards,
    error,
    retry,
    progressOf: (poiId: string): PoiProgress => progress[poiId] ?? emptyProgress,
    startVisit,
    update,
    recordAnswer,
    endVisit,
  };
}
