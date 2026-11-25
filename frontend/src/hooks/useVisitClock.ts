import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { remainingVisitMs } from "../features/preferences/visitTiming";

type VisitClock = {
  readonly nowMs: number;
  readonly remainingMs: number | null;
};

/** Pembaruan waktu bersama; pindah layar tidak mengubah waktu mulai kunjungan yang tersimpan. */
export function useVisitClock(startedAtMs: number | null, endsAtMs: number | null, serverOffsetMs: number): VisitClock {
  const [nowMs, setNowMs] = useState<number>(Date.now);
  useEffect((): (() => void) | undefined => {
    if (startedAtMs === null) return undefined;
    const refresh = (): void => setNowMs(Date.now());
    refresh();
    const interval: ReturnType<typeof setInterval> = setInterval(refresh, 1000);
    const subscription = AppState.addEventListener("change", refresh);
    return (): void => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [startedAtMs]);
  return {
    nowMs: nowMs + serverOffsetMs,
    remainingMs: startedAtMs === null || endsAtMs === null
      ? null
      : remainingVisitMs(endsAtMs, nowMs + serverOffsetMs),
  };
}
