import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Baca preferensi gerakan perangkat dan ikuti perubahan pengaturannya selama komponen tampil. */
export function useReducedMotion(): boolean | null {
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  useEffect((): (() => void) => {
    let active: boolean = true;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled: boolean): void => {
      setReducedMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled: boolean): void => {
      if (active) setReducedMotion((current: boolean | null): boolean => current ?? enabled);
    }, (cause: unknown): never => {
      console.error("gea_notification_motion_preference_failed", { error: cause instanceof Error ? cause.message : String(cause) });
      throw cause;
    });
    return (): void => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reducedMotion;
}
