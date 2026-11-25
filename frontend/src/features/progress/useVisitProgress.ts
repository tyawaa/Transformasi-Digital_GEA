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
import { restoredDevicePhotoAnswers } from "../../services/devicePhotoQuest";
import {
  emptyProgress,
  recordQuestAnswer,
  mergeServerProgress,
  type PoiProgress,
  type ProgressMap,
  type RestoredVisit,
  type VisitRewards,
} from "../stories/progress";
import { questPlan } from "../stories/questPlan";

// Sesi demo tidak boleh dipulihkan lewat API, atau sebaliknya.
const visitKey = (source: StoriesSource["kind"]): string => `gea.visit.v2:${source}`;
const progressKey = (source: StoriesSource["kind"], idSesi: string): string => `gea.progress.v2:${source}:${idSesi}`;

export type VisitProgressState = {
  readonly ready: boolean;
  readonly visit: Visit | null;
  readonly progress: ProgressMap;
  readonly rewards: VisitRewards;
  readonly error: string | null;
  readonly retry: () => void;
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly startVisit: (visit: Visit) => void;
  readonly replaceVisit: (visit: Visit) => Promise<void>;
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
      const scopedRaw: string | null = await AsyncStorage.getItem(visitKey(source.kind));
      const raw: string | null = scopedRaw ?? await AsyncStorage.getItem("gea.visit.v1");
      if (raw === null) return;
      const parsed = JSON.parse(raw) as Partial<Visit>;
      const restoredVisit: Visit = visitSchema.parse({
        ...parsed,
        startedAt: parsed.startedAt ?? (parsed.start_time ? Date.parse(parsed.start_time) : Date.now()),
      });
      // Migrasi v1: hanya sesi API yang memiliki start_time dari database.
      const legacy: boolean = scopedRaw === null;
      const storedSource: StoriesSource["kind"] = restoredVisit.start_time === undefined ? "mock" : "api";
      if (legacy && storedSource !== source.kind) return;
      const storedProgress: string | null = await AsyncStorage.getItem(
        legacy ? `gea.progress.v1:${restoredVisit.id_sesi}` : progressKey(source.kind, restoredVisit.id_sesi),
      );
      let local: ProgressMap = storedProgress === null ? {} : (JSON.parse(storedProgress) as ProgressMap);
      // Migrasi cache demo lama yang belum menyimpan poin per jawaban.
      if (source.kind === "mock") {
        local = Object.fromEntries(Object.entries(local).map(([id, state]): [string, PoiProgress] => [
          id, state.quests === undefined ? { ...state, pointsAwarded: quizPoints(state) } : state,
        ]));
      }
      const photoAnswers: readonly AnswerResult[] = await restoredDevicePhotoAnswers(restoredVisit.id_sesi);
      local = photoAnswers.reduce((current: ProgressMap, answer: AnswerResult): ProgressMap => ({
        ...current,
        [answer.idPoi]: recordQuestAnswer(current[answer.idPoi] ?? { ...emptyProgress, closed: true }, answer, questPlan(answer.idPoi, restoredVisit.profil)),
      }), local);
      if (!active) return;
      setVisit(restoredVisit);
      const server: RestoredVisit | null = await source.restore(restoredVisit.id_sesi);
      if (!active) return;
      if (server !== null) {
        if (server.visit.start_time === undefined) throw new Error("Server tidak mengirim waktu mulai kunjungan.");
        local = mergeServerProgress(local, server.progress, server.visit.profil);
        setRewards(server.rewards);
        const authoritative: Visit = { ...server.visit, startedAt: Date.parse(server.visit.start_time) };
        await AsyncStorage.setItem(visitKey(source.kind), JSON.stringify(authoritative));
        if (!active) return;
        setVisit(authoritative);
      }
      if (server !== null || legacy) {
        await AsyncStorage.setItem(progressKey(source.kind, restoredVisit.id_sesi), JSON.stringify(local));
      }
      if (legacy) {
        if (server === null) await AsyncStorage.setItem(visitKey(source.kind), JSON.stringify(restoredVisit));
        await AsyncStorage.removeItem("gea.visit.v1");
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
    AsyncStorage.setItem(progressKey(source.kind, idSesi), JSON.stringify(next)).catch((cause: unknown): void =>
      warn("gea_progress_save_failed", cause)
    );
  }

  function startVisit(next: Visit): void {
    const startedAt: number = next.startedAt ?? (next.start_time ? Date.parse(next.start_time) : Date.now());
    const withStart: Visit = { ...next, startedAt };
    setVisit(withStart);
    setProgress({});
    setRewards({ totalPoints: 0, badges: [] });
    AsyncStorage.setItem(visitKey(source.kind), JSON.stringify(withStart)).catch((cause: unknown): void =>
      warn("gea_visit_save_failed", cause)
    );
  }

  async function replaceVisit(next: Visit): Promise<void> {
    if (visit === null || next.id_sesi !== visit.id_sesi) throw new Error("Sesi personalisasi tidak cocok dengan kunjungan aktif.");
    if (next.start_time === undefined) throw new Error("Server tidak mengirim waktu mulai kunjungan.");
    const updated: Visit = { ...next, startedAt: Date.parse(next.start_time) };
    await AsyncStorage.setItem(visitKey(source.kind), JSON.stringify(updated));
    setVisit(updated);
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
    if (source.kind === "api" && answer.evaluationSource !== "device") {
      const scored: ScoredAnswerResult = scoredAnswerResultSchema.parse(answer);
      setRewards((current: VisitRewards): VisitRewards => ({
        totalPoints: scored.totalPoints,
        badges: [...new Set([...current.badges, ...scored.newBadges])],
      }));
    }
    if (visit === null) throw new Error("Sesi kunjungan belum dimulai.");
    setProgress((current: ProgressMap): ProgressMap => {
      const next: ProgressMap = {
        ...current,
        [answer.idPoi]: recordQuestAnswer(current[answer.idPoi] ?? emptyProgress, answer, questPlan(answer.idPoi, visit.profil)),
      };
      persist(visit.id_sesi, next);
      return next;
    });
  }

  function endVisit(): void {
    setError(null);
    if (visit !== null) {
      AsyncStorage.removeItem(progressKey(source.kind, visit.id_sesi)).catch((cause: unknown): void =>
        warn("gea_progress_clear_failed", cause)
      );
    }
    setVisit(null);
    setProgress({});
    setRewards({ totalPoints: 0, badges: [] });
    AsyncStorage.removeItem(visitKey(source.kind)).catch((cause: unknown): void => warn("gea_visit_clear_failed", cause));
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
    replaceVisit,
    update,
    recordAnswer,
    endVisit,
  };
}
