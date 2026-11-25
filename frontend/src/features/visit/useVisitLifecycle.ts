import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { z } from "zod";
import type { Visit, VisitStatus } from "../../domain/contracts";
import { type GeaApi, readableError } from "../../services/api";
import { extendedDeadline } from "./lifecycle";
import { museumClosingAt } from "../preferences/visitTiming";

type Props = {
  readonly api: GeaApi;
  readonly source: "api" | "mock";
  readonly visit: Visit | null;
  readonly replaceVisit: (visit: Visit) => Promise<void>;
  readonly demoOffsetMs: number;
};
type VisitLifecycle = {
  readonly serverOffsetMs: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly dismissed: readonly string[] | null;
  readonly dismiss: (key: string) => Promise<void>;
  readonly extend: (minutes: number, endsAtMs: number, closingAtMs: number) => Promise<boolean>;
  readonly finish: () => Promise<boolean>;
  readonly refresh: () => Promise<void>;
};

/** Pilihan tersimpan per sesi; waktu server diperiksa lagi saat aplikasi kembali aktif. */
export function useVisitLifecycle({ api, source, visit, replaceVisit, demoOffsetMs }: Props): VisitLifecycle {
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<readonly string[] | null>(null);
  const pending = useRef<boolean>(false);
  const currentVisit = useRef<Visit | null>(visit);
  currentVisit.current = visit;
  const noticeKey: string | null = visit === null ? null : `gea.visit-notices:${source}:${visit.id_sesi}`;

  useEffect((): (() => void) => {
    let active: boolean = true;
    setDismissed(null);
    if (noticeKey === null) return (): void => { active = false; };
    AsyncStorage.getItem(noticeKey).then((raw: string | null): void => {
      const values: readonly string[] = raw === null ? [] : z.array(z.string()).parse(JSON.parse(raw) as unknown);
      if (active) setDismissed(values);
    }).catch((cause: unknown): void => { if (active) setError(readableError(cause)); });
    return (): void => { active = false; };
  }, [noticeKey]);

  async function refresh(): Promise<void> {
    const snapshot: Visit | null = currentVisit.current;
    if (source !== "api" || snapshot === null || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const result: VisitStatus = await api.visitStatus(snapshot.id_sesi);
      if (currentVisit.current?.id_sesi !== snapshot.id_sesi) return;
      setServerOffsetMs(Date.parse(result.serverNow) - Date.now());
      await replaceVisit(result.visit);
      setError(null);
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally { pending.current = false; setBusy(false); }
  }

  useEffect((): (() => void) | undefined => {
    if (visit === null || source !== "api") return undefined;
    void refresh();
    const interval: ReturnType<typeof setInterval> = setInterval((): void => { void refresh(); }, 60_000);
    const subscription = AppState.addEventListener("change", (state): void => {
      if (state === "active") void refresh();
    });
    return (): void => { clearInterval(interval); subscription.remove(); };
  }, [visit?.id_sesi, source]);

  async function dismiss(key: string): Promise<void> {
    if (noticeKey === null || dismissed === null) return;
    const next: readonly string[] = [...new Set([...dismissed, key])];
    try {
      await AsyncStorage.setItem(noticeKey, JSON.stringify(next));
      setDismissed(next);
    } catch (cause: unknown) { setError(readableError(cause)); }
  }

  async function extend(minutes: number, endsAtMs: number, closingAtMs: number): Promise<boolean> {
    if (visit === null || visit.status !== "aktif" || pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const deadline: number = extendedDeadline(endsAtMs, closingAtMs, Date.now() + serverOffsetMs + demoOffsetMs, minutes);
      const updated: Visit = source === "api" ? await api.extendVisit(visit.id_sesi, randomUUID(), minutes)
        : { ...visit, planned_end_at: new Date(deadline).toISOString(), closing_at: new Date(closingAtMs).toISOString(), closing_limited: false };
      await replaceVisit(updated);
      return true;
    } catch (cause: unknown) {
      setError(readableError(cause));
      return false;
    } finally { pending.current = false; setBusy(false); }
  }

  async function finish(): Promise<boolean> {
    if (visit === null || pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const nowMs: number = Date.now() + serverOffsetMs + demoOffsetMs;
      const closingAtMs: number = visit.closing_at === undefined || visit.closing_at === null
        ? museumClosingAt(visit.startedAt ?? nowMs) : Date.parse(visit.closing_at);
      const updated: Visit = source === "api" ? await api.finishVisit(visit.id_sesi)
        : { ...visit, status: "selesai", end_time: new Date(Math.min(nowMs, closingAtMs)).toISOString(), ended_reason: nowMs >= closingAtMs ? "closing" : "visitor" };
      await replaceVisit(updated);
      return true;
    } catch (cause: unknown) {
      setError(readableError(cause));
      return false;
    } finally { pending.current = false; setBusy(false); }
  }

  return { serverOffsetMs, busy, error, dismissed, dismiss, extend, finish, refresh };
}
