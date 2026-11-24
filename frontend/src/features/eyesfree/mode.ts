// Pilihan mode jelajah di preferensi awal; tombol speaker di peta memakai penyimpanan yang sama.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ExploreMode = "biasa" | "tanpa-layar";

const STORAGE_KEY = "gea.eyesfree.v1";

// Nilai terakhir di memori supaya peta langsung tahu pilihan dari preferensi tanpa menunggu penyimpanan.
let current: ExploreMode | null = null;

export async function readExploreMode(): Promise<ExploreMode | null> {
  if (current !== null) return current;
  const raw: string | null = await AsyncStorage.getItem(STORAGE_KEY);
  current = raw === "on" ? "tanpa-layar" : raw === "off" ? "biasa" : null;
  return current;
}

export function saveExploreMode(mode: ExploreMode): void {
  current = mode;
  AsyncStorage.setItem(STORAGE_KEY, mode === "tanpa-layar" ? "on" : "off").catch((cause: unknown): void => {
    console.warn("gea_explore_mode_save_failed", { error: cause instanceof Error ? cause.message : String(cause) });
  });
}
