import { randomUUID } from "expo-crypto";
import { useState } from "react";
import { Linking, Platform } from "react-native";
import {
  type AccessDecision,
  type BackendHealth,
  type DecisionMessage,
  type DeviceLocation,
  decisionMessage,
  type Profile,
  type Visit,
} from "../domain/contracts";
import type { RunOperation } from "./useOperation";
import { GeaApi } from "../services/api";
import { localizeCopy } from "../data/localizedCopy";
import { useLanguage } from "../features/preferences/LanguageSettings";
import {
  type LocationReading,
  type LocationIssue,
  openLocationServicesSettings,
  readVisitorLocation,
} from "../services/location";

export type LocationSettingsAction = {
  readonly label: string;
  readonly onPress: () => Promise<void>;
};

const locationMessages: Readonly<Record<LocationIssue, DecisionMessage>> = {
  permission_denied: {
    title: "Izin lokasi belum diberikan",
    description: "Izinkan lokasi saat aplikasi digunakan untuk memeriksa area museum. Tekan Periksa lokasi saya untuk mencoba lagi, atau gunakan QR pintu masuk.",
  },
  permission_blocked: {
    title: "Izinkan lokasi di pengaturan",
    description: "Dialog izin tidak bisa ditampilkan lagi. Buka pengaturan aplikasi, izinkan lokasi saat digunakan, lalu kembali dan periksa lokasi lagi. Kamu juga bisa memakai QR pintu masuk.",
  },
  disabled: {
    title: "Lokasi HP belum aktif",
    description: Platform.OS === "ios"
      ? "Aktifkan Layanan Lokasi melalui Pengaturan → Privasi & Keamanan → Layanan Lokasi. Setelah kembali, tekan Periksa lokasi saya lagi, atau gunakan QR pintu masuk."
      : "Aktifkan lokasi HP melalui pengaturan, lalu kembali dan tekan Periksa lokasi saya lagi. Kamu juga bisa memakai QR pintu masuk.",
  },
  unavailable: {
    title: "Lokasi belum tersedia",
    description: "Browser atau perangkat belum bisa membaca posisi. Buka lewat localhost atau HTTPS, periksa izin lokasi, lalu coba lagi.",
  },
  accuracy_unavailable: {
    title: "Akurasi lokasi belum tersedia",
    description: "GPS belum memberikan informasi akurasi. Coba lagi di tempat dengan sinyal GPS lebih baik, atau gunakan QR pintu masuk.",
  },
  timeout: {
    title: "Posisi GPS belum ditemukan",
    description: "Pencarian posisi belum berhasil dalam 15 detik. Coba lagi di tempat dengan sinyal GPS lebih baik, atau gunakan QR pintu masuk.",
  },
};

type VisitSessionState = {
  readonly notice: DecisionMessage | null;
  readonly decision: AccessDecision | null;
  readonly visit: Visit | null;
  readonly scannerOpen: boolean;
  readonly connection: string;
  readonly locationLabel: string;
  readonly currentLocation: DeviceLocation | null;
  readonly locationSettingsAction: LocationSettingsAction | null;
  readonly openScanner: () => void;
  readonly closeScanner: () => void;
  readonly checkConnection: () => Promise<void>;
  readonly checkLocation: () => Promise<void>;
  readonly useEntranceQr: (token: string) => Promise<void>;
  /** Sesi baru: lupakan kunjungan, keputusan lokasi, dan pemberitahuan sesi sebelumnya. */
  readonly reset: () => void;
};

export function useVisitSession(
  api: GeaApi,
  runOperation: RunOperation,
  /** Kategori pengunjung dari preferensi usia (anak / dewasa = Umum). */
  profile: Profile,
): VisitSessionState {
  const { language, t } = useLanguage();
  const [notice, setNotice] = useState<DecisionMessage | null>(null);
  const [decision, setDecision] = useState<AccessDecision | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [connection, setConnection] = useState<string>("Belum diperiksa");
  const [locationLabel, setLocationLabel] = useState<string>("Memeriksa lokasi...");
  const [locationIssue, setLocationIssue] = useState<LocationIssue | null>(null);
  const [currentLocation, setCurrentLocation] = useState<DeviceLocation | null>(null);

  async function openAppSettings(): Promise<void> {
    await runOperation("connection", async (): Promise<void> => {
      setLocationLabel(t("Membuka pengaturan izin...", "Opening permission settings…"));
      await Linking.openSettings();
    });
  }

  async function openGpsSettings(): Promise<void> {
    await runOperation("connection", async (): Promise<void> => {
      setLocationLabel(t("Membuka pengaturan lokasi...", "Opening location settings…"));
      await openLocationServicesSettings();
    });
  }

  const locationSettingsAction: LocationSettingsAction | null =
    locationIssue === "permission_blocked"
      ? { label: localizeCopy("Buka pengaturan izin", language), onPress: openAppSettings }
      : locationIssue === "disabled" && Platform.OS === "android"
      ? { label: localizeCopy("Aktifkan lokasi HP", language), onPress: openGpsSettings }
      : null;

  async function checkConnection(): Promise<void> {
    await runOperation("connection", async (): Promise<void> => {
      let health: BackendHealth;
      try {
        health = await api.health();
      } catch (cause: unknown) {
        setConnection("Layanan belum tersedia");
        throw cause;
      }
      setConnection("Layanan terhubung");
      if (!health.museumConfigured) {
        setNotice({
          title: "Layanan terhubung",
          description:
            "Batas area museum sedang disiapkan. QR pintu masuk tetap bisa digunakan jika sudah tersedia.",
        });
      }
    });
  }

  async function checkLocation(): Promise<void> {
    setNotice(null);
    setDecision(null);
    setLocationIssue(null);
    setCurrentLocation(null);
    await runOperation("location", async (): Promise<void> => {
      const reading: LocationReading = await readVisitorLocation((id: string, en: string): void => setLocationLabel(t(id, en)));
      if (reading.status !== "available") {
        setLocationIssue(reading.status);
        setNotice(locationMessages[reading.status]);
        return;
      }
      setCurrentLocation(reading.location);
      setLocationLabel(t("Memeriksa area museum...", "Checking the museum area…"));
      const result: AccessDecision = await api.evaluateLocation(
        reading.location,
      );
      setDecision(result);
      setNotice(decisionMessage(result));
      if (result.status === "inside" && result.accessAllowed) {
        setLocationLabel(t("Lokasi cocok. Memulai kunjungan...", "Location verified. Starting your visit…"));
        const created: Visit = await api.startGpsVisit(
          randomUUID(),
          reading.location,
          profile,
        );
        setVisit(created);
      }
    });
  }

  async function useEntranceQr(token: string): Promise<void> {
    setScannerOpen(false);
    setDecision(null);
    setLocationIssue(null);
    await runOperation("qr", async (): Promise<void> => {
      const created: Visit = await api.startQrVisit(randomUUID(), token, profile);
      setVisit(created);
      setNotice({
        title: "Selamat datang di museum",
        description:
          "QR pintu masuk berhasil diverifikasi. Kunjunganmu sudah aktif.",
      });
    });
  }

  function openScanner(): void {
    setScannerOpen(true);
  }
  function closeScanner(): void {
    setScannerOpen(false);
  }
  function reset(): void {
    setVisit(null);
    setDecision(null);
    setNotice(null);
    setScannerOpen(false);
    setLocationIssue(null);
  }
  return {
    notice: notice === null ? null : { title: localizeCopy(notice.title, language), description: localizeCopy(notice.description, language) },
    decision,
    visit,
    scannerOpen,
    connection: localizeCopy(connection, language),
    locationLabel,
    currentLocation,
    locationSettingsAction,
    openScanner,
    closeScanner,
    checkConnection,
    checkLocation,
    useEntranceQr,
    reset,
  };
}
