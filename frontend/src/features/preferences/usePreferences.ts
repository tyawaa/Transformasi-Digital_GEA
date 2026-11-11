import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// v2: daftar topik berubah (dipetakan ke ruangan), jadi jawaban v1 ditanyakan ulang.
const STORAGE_KEY = "gea.preferences.v2";
// Untuk uji: EXPO_PUBLIC_ONBOARDING=always juga menampilkan preferensi setiap aplikasi dibuka.
const alwaysShow: boolean = process.env.EXPO_PUBLIC_ONBOARDING === "always";

export type Preferences = {
  readonly age: string;
  readonly duration: string;
  readonly topics: readonly string[];
};

export type PreferencesState = "loading" | "show" | "done";

/** Preferensi (usia, waktu, minat) ditanyakan sekali setelah onboarding, lalu disimpan di perangkat. */
export function usePreferences(): {
  readonly state: PreferencesState;
  readonly preferences: Preferences | null;
  readonly save: (value: Preferences) => void;
} {
  const [state, setState] = useState<PreferencesState>("loading");
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect((): void => {
    if (alwaysShow) {
      setState("show");
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY).then(
      (value: string | null): void => {
        if (value === null) {
          setState("show");
          return;
        }
        try {
          setPreferences(JSON.parse(value) as Preferences);
          setState("done");
        } catch {
          setState("show");
        }
      },
      (cause: unknown): void => {
        console.warn("gea_preferences_read_failed", {
          error: cause instanceof Error ? cause.message : String(cause),
        });
        setState("show");
      },
    );
  }, []);

  function save(value: Preferences): void {
    setPreferences(value);
    setState("done");
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)).catch((cause: unknown): void => {
      console.warn("gea_preferences_save_failed", {
        error: cause instanceof Error ? cause.message : String(cause),
      });
    });
  }

  return { state, preferences, save };
}
