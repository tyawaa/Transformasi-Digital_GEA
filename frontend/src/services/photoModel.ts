import type { DevicePhotoVerdict } from "./photoModelTypes";

/** The bundled native model is currently implemented for Android APKs. */
export function verifyDevicePhoto(_uri: string, _questId: string): Promise<DevicePhotoVerdict> {
  return Promise.reject(new Error("Pemeriksaan AI di perangkat tersedia pada APK Android GEA. Buka fitur ini dari APK."));
}
