// Lokasi latar belakang untuk mode tanpa layar. Task harus didaftarkan saat modul pertama dimuat
// (diimpor dari index.ts), bukan di dalam komponen.
// Catatan: Expo Go tidak mendukung lokasi latar belakang; uji layar terkunci memakai development build.
import * as Location from "expo-location";
import type { Language } from "../../domain/contracts";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { handleEyesFreeFix } from "./engine";

const TASK = "gea-eyes-free-location";

type TaskData = { readonly locations?: readonly Location.LocationObject[] };

if (Platform.OS !== "web") {
  TaskManager.defineTask<TaskData>(TASK, ({ data, error }): Promise<void> => {
    if (error !== null) {
      console.warn("gea_eyesfree_task_failed", error.message);
      return Promise.resolve();
    }
    const latest: Location.LocationObject | undefined = data.locations?.[data.locations.length - 1];
    if (latest !== undefined) {
      handleEyesFreeFix({
        latitude: latest.coords.latitude,
        longitude: latest.coords.longitude,
        accuracyMeters: latest.coords.accuracy ?? Number.POSITIVE_INFINITY,
      });
    }
    return Promise.resolve();
  });
}

export type BackgroundResult = "running" | "denied" | "unsupported";

export async function startBackgroundGuidance(language: Language): Promise<BackgroundResult> {
  if (Platform.OS === "web") return "unsupported";
  try {
    const permission = await Location.requestBackgroundPermissionsAsync();
    if (!permission.granted) return "denied";
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) return "running";
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 2,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: language === "en" ? "GEA · eyes free mode" : "GEA · mode tanpa layar",
        notificationBody: language === "en" ? "Vibration guidance continues while your screen is locked." : "Petunjuk lewat getaran tetap aktif saat layar terkunci.",
        notificationColor: "#2F5D3A",
      },
    });
    return "running";
  } catch (cause: unknown) {
    console.warn("gea_eyesfree_background_unavailable", cause instanceof Error ? cause.message : String(cause));
    return "unsupported";
  }
}

export async function stopBackgroundGuidance(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TASK)) await Location.stopLocationUpdatesAsync(TASK);
  } catch (cause: unknown) {
    console.warn("gea_eyesfree_background_stop_failed", cause instanceof Error ? cause.message : String(cause));
  }
}
