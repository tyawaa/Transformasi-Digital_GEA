import { useCallback, useEffect, useRef, useState } from "react";
import type { Fix } from "../../domain/geofence";
import type { Language } from "../../domain/contracts";
import { type BackgroundResult, startBackgroundGuidance, stopBackgroundGuidance } from "./background";
import {
  disableEyesFree,
  enableEyesFree,
  type EyesFreeTarget,
  handleEyesFreeFix,
  resetEyesFreeVisit,
  setEyesFreeTarget,
} from "./engine";
import { type ExploreMode, readExploreMode, saveExploreMode } from "./mode";

export type EyesFree = {
  readonly selectedMode: ExploreMode;
  readonly loaded: boolean;
  readonly error: string | null;
  readonly enabled: boolean;
  /** Status lokasi latar belakang; null = mode mati. */
  readonly background: BackgroundResult | null;
  readonly toggle: () => void;
};

export function useEyesFree(
  { visitId, target, fix, language }: {
    readonly language: Language;
    readonly visitId: string | null;
    readonly target: EyesFreeTarget | null;
    readonly fix: Fix | null;
  },
): EyesFree {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [background, setBackground] = useState<BackgroundResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<ExploreMode>("biasa");
  const [loaded, setLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const activation = useRef<number>(0);
  const requested = useRef<boolean>(false);

  const turnOn = useCallback(async (): Promise<void> => {
    const request: number = activation.current + 1;
    activation.current = request;
    requested.current = true;
    enableEyesFree();
    const result: BackgroundResult = await startBackgroundGuidance(language);
    if (activation.current !== request) {
      if (!requested.current) await stopBackgroundGuidance();
      return;
    }
    setEnabled(true);
    setBackground(result);
  }, [language]);

  const turnOff = useCallback((): void => {
    activation.current += 1;
    requested.current = false;
    setEnabled(false);
    setBackground(null);
    disableEyesFree();
    void stopBackgroundGuidance();
  }, []);

  useEffect((): (() => void) => {
    let active: boolean = true;
    if (visitId === null) turnOff();
    void readExploreMode().then(async (mode: ExploreMode | null): Promise<void> => {
      if (!active) return;
      setSelectedMode(mode === null ? "biasa" : mode);
      if (visitId !== null && mode === "tanpa-layar") await turnOn();
    }).catch((cause: unknown): void => {
      console.error("gea_explore_mode_load_failed", { visitId, error: cause instanceof Error ? cause.message : String(cause) });
      if (active) {
        turnOff();
        setError("Mode jelajah belum dapat diaktifkan. Coba pilih mode lagi.");
      }
    }).finally((): void => { if (active) setLoaded(true); });
    return (): void => { active = false; turnOff(); };
  }, [visitId, turnOn, turnOff]);

  useEffect((): void => resetEyesFreeVisit(), [visitId]);
  useEffect((): void => setEyesFreeTarget(target), [target]);
  useEffect((): void => {
    if (enabled && fix !== null) handleEyesFreeFix(fix);
  }, [enabled, fix, target]);

  const toggle = useCallback((): void => {
    const next: boolean = selectedMode !== "tanpa-layar";
    setSelectedMode(next ? "tanpa-layar" : "biasa");
    setError(null);
    saveExploreMode(next ? "tanpa-layar" : "biasa");
    if (next && visitId !== null) void turnOn().catch((cause: unknown): void => {
      turnOff();
      console.error("gea_explore_mode_enable_failed", { visitId, error: cause instanceof Error ? cause.message : String(cause) });
      setError("Mode jelajah belum dapat diaktifkan. Coba pilih mode lagi.");
    });
    else turnOff();
  }, [selectedMode, visitId, turnOn, turnOff]);

  return { enabled, selectedMode, loaded, error, background, toggle };
}
