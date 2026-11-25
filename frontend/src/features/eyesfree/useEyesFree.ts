import { useCallback, useEffect, useState } from "react";
import type { Fix } from "../../domain/geofence";
import { type BackgroundResult, startBackgroundGuidance, stopBackgroundGuidance } from "./background";
import {
  disableEyesFree,
  enableEyesFree,
  type EyesFreeTarget,
  handleEyesFreeFix,
  resetEyesFreeVisit,
  setEyesFreeStops,
  setEyesFreeTargets,
} from "./engine";
import { readExploreMode, saveExploreMode } from "./mode";

export type EyesFree = {
  readonly enabled: boolean;
  /** Status lokasi latar belakang; null = mode mati. */
  readonly background: BackgroundResult | null;
  readonly toggle: () => void;
};

export function useEyesFree(
  { visitId, stops, targets, fix }: {
    readonly visitId: string | null;
    /** Semua POI yang dibuka (audio saat tiba). */
    readonly stops: readonly EyesFreeTarget[];
    readonly targets: readonly EyesFreeTarget[];
    readonly fix: Fix | null;
  },
): EyesFree {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [background, setBackground] = useState<BackgroundResult | null>(null);

  const turnOn = useCallback(async (): Promise<void> => {
    setEnabled(true);
    await enableEyesFree();
    setBackground(await startBackgroundGuidance());
  }, []);

  const turnOff = useCallback((): void => {
    setEnabled(false);
    setBackground(null);
    disableEyesFree();
    void stopBackgroundGuidance();
  }, []);

  useEffect((): (() => void) => {
    let active: boolean = true;
    if (visitId === null) { turnOff(); return turnOff; }
    readExploreMode().then((mode): void => {
      if (active && mode === "tanpa-layar") void turnOn();
    }, (): void => undefined);
    return (): void => { active = false; turnOff(); };
  }, [visitId, turnOn, turnOff]);

  useEffect((): void => resetEyesFreeVisit(), [visitId]);
  useEffect((): void => setEyesFreeStops(stops), [stops]);
  useEffect((): void => setEyesFreeTargets(targets), [targets]);
  useEffect((): void => {
    if (fix !== null) handleEyesFreeFix(fix);
  }, [fix]);

  const toggle = useCallback((): void => {
    const next: boolean = !enabled;
    saveExploreMode(next ? "tanpa-layar" : "biasa");
    if (next) void turnOn();
    else turnOff();
  }, [enabled, turnOn, turnOff]);

  return { enabled, background, toggle };
}
