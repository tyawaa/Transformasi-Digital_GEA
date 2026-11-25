import * as Location from "expo-location";
import { Linking, Platform } from "react-native";
import { type DeviceLocation, locationSchema } from "../domain/contracts";

export type LocationIssue =
  | "permission_denied"
  | "permission_blocked"
  | "disabled"
  | "unavailable"
  | "accuracy_unavailable"
  | "timeout";

export type LocationReading =
  | { readonly status: "available"; readonly location: DeviceLocation }
  | { readonly status: LocationIssue };

const POSITION_TIMEOUT_MS: number = 15000;

function positionReading(coords: Pick<Location.LocationObjectCoords, "latitude" | "longitude" | "accuracy">): LocationReading {
  if (coords.accuracy === null) {
    return { status: "accuracy_unavailable" };
  }
  return {
    status: "available",
    location: locationSchema.parse({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracyMeters: coords.accuracy,
    }),
  };
}

/** Browser meminta posisi baru; izin dan pencarian GPS selesai lewat callback yang sama. */
async function readBrowserLocation(): Promise<LocationReading> {
  if (!window.isSecureContext || !("geolocation" in navigator)) {
    return { status: "unavailable" };
  }
  return new Promise<LocationReading>((resolve, reject): void => {
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition): void => {
        try {
          resolve(positionReading(position.coords));
        } catch (cause: unknown) {
          reject(cause);
        }
      },
      (error: GeolocationPositionError): void => {
        console.warn("gea_browser_location_failed", {
          code: error.code,
          message: error.message,
          timeoutMs: POSITION_TIMEOUT_MS,
        });
        switch (error.code) {
          case 1:
            resolve({ status: "permission_denied" });
            return;
          case 2:
            resolve({ status: "unavailable" });
            return;
          case 3:
            resolve({ status: "timeout" });
            return;
          default:
            reject(new Error(`Pengecekan lokasi browser gagal (kode ${error.code}): ${error.message}`));
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: POSITION_TIMEOUT_MS },
    );
  });
}

/** Batas tunggu UI; API sekali baca Expo tidak menyediakan pembatalan native. */
async function readCurrentPosition(): Promise<LocationReading> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout: Promise<LocationReading> = new Promise((resolve): void => {
    timer = setTimeout((): void => resolve({ status: "timeout" }), POSITION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: false,
      }).then((position: Location.LocationObject): LocationReading => positionReading(position.coords)),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Dialog aktivasi Android hanya muncul setelah pengguna meminta pemeriksaan lokasi. */
async function enableLocationServices(): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (Platform.OS !== "android") return false;
  try {
    await Location.enableNetworkProviderAsync();
  } catch (cause: unknown) {
    if (
      typeof cause !== "object" || cause === null || !("code" in cause) ||
      cause.code !== "ERR_LOCATION_SETTINGS_UNSATISFIED"
    ) throw cause;
    return false;
  }
  return Location.hasServicesEnabledAsync();
}

export async function openLocationServicesSettings(): Promise<void> {
  if (Platform.OS === "android") {
    await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
    return;
  }
  await Linking.openSettings();
}

/** Hanya izin foreground; lokasi tidak dibaca sampai pengunjung menekan tombol. */
export async function readVisitorLocation(
  onProgress: (message: string, english: string) => void,
): Promise<LocationReading> {
  if (Platform.OS === "web") {
    onProgress("Mencari posisi lokasi browser. Izinkan lokasi jika diminta...", "Finding your location in the browser. Allow location access if prompted…");
    return readBrowserLocation();
  }
  onProgress("Memeriksa izin lokasi...", "Checking location permission…");
  const current: Location.LocationPermissionResponse = await Location
    .getForegroundPermissionsAsync();
  if (!current.granted && !current.canAskAgain) return { status: "permission_blocked" };
  const permission: Location.LocationPermissionResponse = current.granted
    ? current
    : await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return { status: permission.canAskAgain ? "permission_denied" : "permission_blocked" };
  }
  onProgress("Memeriksa GPS perangkat...", "Checking your device’s GPS…");
  const enabled: boolean = await enableLocationServices();
  if (!enabled) return { status: "disabled" };
  onProgress("Mencari posisi GPS...", "Finding your GPS location…");
  return readCurrentPosition();
}
