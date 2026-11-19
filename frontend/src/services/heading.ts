import * as Location from "expo-location";
import { normalizeHeading } from "../domain/heading";
import type { HeadingCallback, HeadingIssueCallback, HeadingStartResult } from "./headingTypes";

/** Kompas native menggunakan trueHeading agar sama dengan koordinat survei. */
export async function startHeading(onHeading: HeadingCallback, onIssue: HeadingIssueCallback): Promise<HeadingStartResult> {
  const current: Location.LocationPermissionResponse = await Location.getForegroundPermissionsAsync();
  const permission: Location.LocationPermissionResponse = current.granted || !current.canAskAgain
    ? current : await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return { status: "denied", message: "Izinkan lokasi saat aplikasi digunakan untuk membaca arah kompas." };
  const onReading = (reading: Location.LocationHeadingObject): void => {
    if (!Number.isFinite(reading.trueHeading) || reading.trueHeading < 0 || reading.accuracy < 2) {
      onIssue("Kompas belum akurat. Jauhkan HP dari benda logam dan kalibrasi dengan gerakan angka delapan.");
      return;
    }
    onHeading({ degrees: normalizeHeading(reading.trueHeading), timestamp: Date.now() });
  };
  for (let attempt: number = 1; attempt <= 2; attempt += 1) {
    try {
      const subscription: Location.LocationSubscription = await Location.watchHeadingAsync(onReading, onIssue);
      return { status: "started", subscription };
    } catch (cause: unknown) {
      console.warn("gea_heading_start_failed", { attempt, error: cause instanceof Error ? cause.message : String(cause) });
      if (attempt === 2) throw cause;
    }
  }
  throw new Error("Pemantauan kompas tidak berhasil dimulai.");
}
