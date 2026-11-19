import { browserCompassHeading, normalizeHeading } from "../domain/heading";
import type { HeadingCallback, HeadingIssueCallback, HeadingStartResult } from "./headingTypes";

type CompassEvent = DeviceOrientationEvent & {
  readonly webkitCompassHeading?: number;
  readonly webkitCompassAccuracy?: number;
};
type OrientationPermissionApi = typeof DeviceOrientationEvent & {
  readonly requestPermission?: (absolute: boolean) => Promise<"granted" | "denied">;
};

/** Dipanggil langsung dari tombol agar permintaan izin sensor memenuhi user activation browser. */
export async function startHeading(onHeading: HeadingCallback, onIssue: HeadingIssueCallback): Promise<HeadingStartResult> {
  if (!window.isSecureContext) return { status: "unavailable", message: "Kompas browser memerlukan HTTPS atau localhost. Buka aplikasi melalui koneksi aman." };
  if (!("DeviceOrientationEvent" in window)) return { status: "unavailable", message: "Sensor arah tidak tersedia di browser ini. Gunakan HP yang memiliki kompas." };
  if (window.screen.orientation === undefined) return { status: "unavailable", message: "Browser ini belum mendukung orientasi layar untuk kompas. Perbarui browser HP terlebih dahulu." };
  const api: OrientationPermissionApi = DeviceOrientationEvent;
  if (api.requestPermission !== undefined) {
    const permission: "granted" | "denied" = await api.requestPermission(true);
    if (permission !== "granted") return { status: "denied", message: "Izin sensor arah belum diberikan. Izinkan akses Gerakan dan Orientasi untuk mengikuti arah hadap." };
  }
  function onOrientation(event: DeviceOrientationEvent): void {
    const reading: CompassEvent = event;
    const screenAngle: number = window.screen.orientation.angle;
    if (reading.webkitCompassHeading !== undefined) {
      if (!Number.isFinite(reading.webkitCompassHeading) || reading.webkitCompassHeading < 0 ||
        (reading.webkitCompassAccuracy !== undefined && (reading.webkitCompassAccuracy < 0 || reading.webkitCompassAccuracy > 50))) {
        onIssue("Kompas belum akurat. Jauhkan HP dari benda logam dan kalibrasi sensornya.");
        return;
      }
      onHeading({ degrees: normalizeHeading(reading.webkitCompassHeading + screenAngle), timestamp: Date.now() });
      return;
    }
    if (!reading.absolute || reading.alpha === null || reading.beta === null || reading.gamma === null) return;
    if (![reading.alpha, reading.beta, reading.gamma, screenAngle].every(Number.isFinite)) {
      onIssue("Sensor belum memberikan arah yang valid. Coba kalibrasi kompas HP.");
      return;
    }
    const degrees: number | null = browserCompassHeading(reading.alpha, reading.beta, reading.gamma, screenAngle);
    if (degrees === null) {
      onIssue("Pegang HP sedikit lebih mendatar agar arah hadap dapat dibaca.");
      return;
    }
    onHeading({ degrees, timestamp: Date.now() });
  }
  window.addEventListener("deviceorientationabsolute", onOrientation);
  window.addEventListener("deviceorientation", onOrientation);
  return { status: "started", subscription: { remove: (): void => {
    window.removeEventListener("deviceorientationabsolute", onOrientation);
    window.removeEventListener("deviceorientation", onOrientation);
  } } };
}
