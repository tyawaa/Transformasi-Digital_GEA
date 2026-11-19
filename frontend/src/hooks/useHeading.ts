import { useCallback, useEffect, useRef, useState } from "react";
import { headingDelta, normalizeHeading } from "../domain/heading";
import { startHeading } from "../services/heading";
import type { HeadingSample, HeadingStartResult, HeadingSubscription } from "../services/headingTypes";

export type HeadingState = {
  readonly status: "idle" | "requesting" | "watching" | "simulated" | "denied" | "unavailable" | "error";
  readonly degrees: number | null;
  readonly message: string | null;
};
export type MapHeading = {
  readonly state: HeadingState;
  readonly activation: number;
  readonly enable: () => Promise<void>;
  readonly disable: () => void;
  readonly simulate: (degrees: number) => void;
};

/** Sensor hanya aktif setelah tombol ditekan; semua subscription dan timer dilepas saat keluar peta. */
export function useHeading(): MapHeading {
  const [state, setState] = useState<HeadingState>({ status: "idle", degrees: null, message: null });
  const subscription = useRef<HeadingSubscription | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revision = useRef<number>(0);
  const latest = useRef<HeadingSample | null>(null);

  const stop = useCallback((): void => {
    revision.current += 1;
    subscription.current?.remove();
    subscription.current = null;
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    latest.current = null;
  }, []);

  useEffect((): (() => void) => stop, [stop]);

  const disable = useCallback((): void => {
    stop();
    setState({ status: "idle", degrees: null, message: null });
  }, [stop]);

  const enable = useCallback(async (): Promise<void> => {
    stop();
    const request: number = revision.current;
    let signalReceived: boolean = false;
    setState({ status: "requesting", degrees: null, message: "Menunggu sensor kompas…" });
    try {
      const result: HeadingStartResult = await startHeading(
        (sample: HeadingSample): void => {
          if (request !== revision.current) return;
          signalReceived = true;
          if (timer.current !== null) clearTimeout(timer.current);
          timer.current = null;
          const previous: HeadingSample | null = latest.current;
          if (previous !== null && (sample.timestamp - previous.timestamp < 80 || Math.abs(headingDelta(previous.degrees, sample.degrees)) < 1)) return;
          latest.current = sample;
          setState({ status: "watching", degrees: sample.degrees, message: null });
        },
        (message: string): void => {
          if (request !== revision.current) return;
          signalReceived = true;
          if (timer.current !== null) clearTimeout(timer.current);
          timer.current = null;
          latest.current = null;
          setState((current: HeadingState): HeadingState => current.status === "error" && current.message === message
            ? current : { status: "error", degrees: null, message });
        },
      );
      if (request !== revision.current) {
        if (result.status === "started") result.subscription.remove();
        return;
      }
      if (result.status !== "started") {
        setState({ status: result.status, degrees: null, message: result.message });
        return;
      }
      subscription.current = result.subscription;
      if (!signalReceived) {
        timer.current = setTimeout((): void => {
          if (request !== revision.current) return;
          stop();
          setState({ status: "unavailable", degrees: null, message: "Kompas belum mengirim arah. Coba di HP bersensor kompas dan periksa izin sensor browser." });
        }, 8000);
      }
    } catch (cause: unknown) {
      if (request !== revision.current) return;
      stop();
      const message: string = cause instanceof Error ? cause.message : String(cause);
      console.warn("gea_heading_failed", { message });
      setState({ status: "error", degrees: null, message: `Kompas gagal dibaca: ${message}. Periksa izin sensor dan coba lagi.` });
    }
  }, [stop]);

  const simulate = useCallback((degrees: number): void => {
    stop();
    setState({ status: "simulated", degrees: normalizeHeading(degrees), message: null });
  }, [stop]);

  return { state, activation: revision.current, enable, disable, simulate };
}
