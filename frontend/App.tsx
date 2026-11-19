import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./src/design/tokens";
import { GeaFontsProvider, GeaText } from "./src/design/typography";
import type { PoiSummary, Visit } from "./src/domain/contracts";
import { availableBadges, type BadgeContext, type BadgeDef, badgeBonus, type BadgeId, badges as badgeDefs, earnedBadges, poiStatus, type PoiRef, totalPoints } from "./src/domain/points";
import { localChallengePoints } from "./src/features/stories/progress";
import { useQuestDays } from "./src/features/progress/useQuestDays";
import { questKind } from "./src/features/stories/questPlan";
import {
  activePois,
  museumPoiById,
  museumPois,
  type ZoneInfo,
  zones,
} from "./src/data/museum";
import { type MapPoi, MapScreen } from "./src/features/map/MapScreen";
import { OnboardingScreen } from "./src/features/onboarding/OnboardingScreen";
import { useOnboarding } from "./src/features/onboarding/useOnboarding";
import { PreferencesScreen } from "./src/features/preferences/PreferencesScreen";
import { usePreferences } from "./src/features/preferences/usePreferences";
import { matchedTopics, profileForAge, recommendRoute, type Route } from "./src/features/preferences/recommend";
import { ProgressScreen } from "./src/features/progress/ProgressScreen";
import { wingEnabled, wingsMode } from "./src/config/wings";
import { useVisitProgress } from "./src/features/progress/useVisitProgress";
import { type ParsedQr, qrErrorMessage, wrapQr } from "./src/features/qr/qrPayload";
import { type DummyScan, ScanQrScreen, type ScanState } from "./src/features/stories/hifi/ScanQrScreen";
import { StoryFlow } from "./src/features/stories/hifi/StoryFlow";
import { LocationFailedSplash, LocationSuccessSplash } from "./src/features/location/LocationSplash";
import { LocationCheckingSplash } from "./src/features/location/LocationChecking";
import type { AdventureSummary } from "./src/features/stories/hifi/AdventureDoneScreens";
import { StoryButton } from "./src/features/stories/hifi/parts";
import { useOperation } from "./src/hooks/useOperation";
import { useAuthRefresh } from "./src/hooks/useAuthRefresh";
import { useVisitSession } from "./src/hooks/useVisitSession";
import { useGeofence } from "./src/hooks/useGeofence";
import type { Checkpoint, Fix } from "./src/domain/geofence";
import type { GpsTest } from "./src/features/map/MapScreen";
import { MOCK_ENTRANCE_QR, MOCK_ENTRANCE_TOKEN, mockPoiQr, mockZoneToken } from "./src/mocks/stories";
import { GeaApi, readableError } from "./src/services/api";
import { ApiStoriesSource, MockStoriesSource, type StoriesSource, storiesMockEnabled } from "./src/services/stories";
import { publicConfig, supabase } from "./src/services/supabase";
import { registerDemoSource } from "./src/services/demoBridge";


const api: GeaApi = new GeaApi(publicConfig.url, supabase);
// E20: backend asli; data lokal dari Excel (E14) hanya jika EXPO_PUBLIC_STORIES_SOURCE=mock.
const storiesSource: StoriesSource = storiesMockEnabled ? new MockStoriesSource() : new ApiStoriesSource(api);

// Tombol uji di layar scan (hanya mode mock).
const INVALID_QR: string = wrapQr("poi", "P99", "00".repeat(32));
const mapDummies: readonly DummyScan[] = storiesMockEnabled
  ? [
    { label: "Uji: QR pintu masuk", payload: MOCK_ENTRANCE_QR },
    { label: "Uji: QR zona sayap kiri", payload: wrapQr("zone", "ZL", mockZoneToken("ZL")) },
    ...activePois.filter((poi) => wingEnabled(poi.wing)).map((poi) => ({ label: `Uji: QR koleksi ${poi.code}`, payload: mockPoiQr(poi) })),
    { label: "Uji: QR tidak dikenal", payload: INVALID_QR },
  ]
  : [];

// Mode uji GPS di peta (hanya mode mock): posisi buatan untuk uji geofence di web/laptop.
const OUTSIDE: Fix = { latitude: -6.90150, longitude: 107.62250, accuracyMeters: 5 };
const gpsTests: readonly GpsTest[] = storiesMockEnabled
  ? [
    { label: "Pakai GPS asli", fix: null },
    { label: "Di luar museum", fix: OUTSIDE },
    { label: "GPS lemah (35 m)", fix: { ...OUTSIDE, accuracyMeters: 35 } },
    ...zones.filter((z) => wingEnabled(z.wing)).map((z): GpsTest => ({
      label: `Masuk ${z.name.split(" · ")[0] ?? z.code}`,
      fix: { latitude: z.latitude, longitude: z.longitude, accuracyMeters: 5 },
    })),
    ...activePois.filter((poi) => wingEnabled(poi.wing)).map((poi): GpsTest => ({
      label: `Di dekat ${poi.code}`,
      fix: { latitude: poi.latitude, longitude: poi.longitude, accuracyMeters: 5 },
    })),
  ]
  : [];

function storyDummies(poiId: string): readonly DummyScan[] {
  if (!storiesMockEnabled) return [];
  const poi = museumPoiById(poiId);
  return [
    ...(poi === undefined ? [] : [{ label: `Uji: QR koleksi ${poi.code}`, payload: mockPoiQr(poi) }]),
    { label: "Uji: QR tidak dikenal", payload: INVALID_QR },
  ];
}

type Screen =
  | { readonly name: "map" }
  | { readonly name: "scan" }
  | { readonly name: "progress" }
  | { readonly name: "story"; readonly poiId: string; readonly token: string | null };

function Home(): ReactElement {
  useAuthRefresh();
  const onboarding = useOnboarding();
  const preferences = usePreferences();
  const { busy, error: operationError, runOperation } = useOperation();
  const profile = profileForAge(preferences.preferences);
  const session = useVisitSession(api, runOperation, profile);
  const visitState = useVisitProgress(storiesSource);
  const { visit, progress, progressOf } = visitState;

  const [screen, setScreen] = useState<Screen>({ name: "map" });
  // Splash lokasi: ok = di area museum, fail = selain itu.
  const [locationSplash, setLocationSplash] = useState<"ok" | "fail" | null>(null);
  const wasCheckingLocation = useRef<boolean>(false);
  useEffect((): void => {
    const checking: boolean = busy === "location";
    if (wasCheckingLocation.current && !checking) {
      const decision = session.decision;
      const verified: boolean = decision?.status === "inside" && decision.accessAllowed &&
        session.visit !== null && operationError === null;
      setLocationSplash(verified ? "ok" : "fail");
    }
    wasCheckingLocation.current = checking;
  }, [busy, session.decision, session.visit, operationError]);
  const [summaries, setSummaries] = useState<readonly PoiSummary[] | null>(null);
  const [poisError, setPoisError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [qrZoneIntro, setQrZoneIntro] = useState<ZoneInfo | null>(null);

  async function loadPois(): Promise<void> {
    setPoisError(null);
    try {
      setSummaries(await storiesSource.pois());
    } catch (cause: unknown) {
      setPoisError(readableError(cause));
    }
  }
  useEffect((): void => {
    void loadPois();
  }, []);

  // Kunjungan dari GPS (useVisitSession) ikut disimpan sebagai kunjungan aktif.
  useEffect((): void => {
    if (session.visit !== null && session.visit.id_sesi !== visit?.id_sesi) visitState.startVisit(session.visit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.visit]);

  const mapPois: readonly MapPoi[] = useMemo((): readonly MapPoi[] =>
    museumPois.filter((museum) => wingEnabled(museum.wing)).map((museum): MapPoi => {
      const match: PoiSummary | undefined = summaries?.find((s: PoiSummary): boolean =>
        museumPoiById(s.id_poi)?.code === museum.code
      );
      const id: string | null = match?.id_poi ?? null;
      const state = id === null ? undefined : progress[id];
      const verified: boolean = state?.verifiedUntil != null && state.verifiedUntil > Date.now();
      return { museum, id, status: poiStatus(state, verified) };
    }), [summaries, progress]);

  // Lencana sheet Badge_Poin: tiap POI membawa kode dan jenis quest untuk profil pengunjung ini.
  const refs: readonly PoiRef[] = mapPois
    .filter((poi: MapPoi): boolean => poi.id !== null)
    .map((poi: MapPoi): PoiRef => ({
      id: poi.id ?? "",
      wing: poi.museum.wing,
      code: poi.museum.code,
      quest: questKind(poi.id ?? "", profile),
    }));
  const questsDone: number = refs.filter((ref: PoiRef): boolean => {
    const state = progress[ref.id];
    if (state === undefined || ref.quest === null) return false;
    return ref.quest === "quiz" ? state.completed || state.failed : state.challengeDone === true;
  }).length;
  const questDays: number = useQuestDays(questsDone);
  // Lencana prioritas rendah (BD-05, BD-08, BD-09; POI-12 s.d. POI-21) ditunda sesuai sheet Badge_Poin:
  // konten POI-15 s.d. POI-20 belum ada. Ganti ke wingEnabled("right") setelah kontennya lengkap.
  const badgeContext: BadgeContext = { kid: profile === "anak", questDays, rightWing: false };
  const localBadges: readonly BadgeId[] = earnedBadges(refs, progress, badgeContext);
  // Mode API: poin kuis dan lencana resmi dari Supabase. Tantangan (benar-salah/isian/foto) dan lencana yang
  // butuh data perangkat belum dinilai server, jadi ditambahkan di atas total resmi tanpa dihitung dua kali.
  const badges: readonly BadgeId[] = storiesSource.kind === "api"
    ? [...new Set([...visitState.rewards.badges, ...localBadges])]
    : localBadges;
  const points: number = storiesSource.kind === "api"
    ? visitState.rewards.totalPoints + localChallengePoints(progress) + badgeBonus(
      localBadges.filter((id: BadgeId): boolean => !visitState.rewards.badges.includes(id)),
    )
    : totalPoints(refs, progress, badgeContext);
  // Rute rekomendasi dari preferensi, hanya dari ruangan yang ceritanya sudah tersedia.
  const route: Route | null = useMemo((): Route | null =>
    recommendRoute(
      preferences.preferences,
      mapPois.filter((poi: MapPoi): boolean => poi.id !== null).map((poi: MapPoi): string => poi.museum.code),
    ), [preferences.preferences, mapPois]);
  /** Ruangan berikutnya di rute yang belum selesai (selain ruangan yang sedang dibuka). */
  function nextStop(exceptPoiId: string): string | null {
    const next: MapPoi | undefined = route?.codes
      .map((code: string): MapPoi | undefined => mapPois.find((poi: MapPoi): boolean => poi.museum.code === code))
      .find((poi: MapPoi | undefined): boolean =>
        poi !== undefined && poi.id !== exceptPoiId && poi.status !== "selesai" && progress[poi.id ?? ""]?.closed !== true
      );
    return next === undefined ? null : `${next.museum.code} · ${next.museum.name}`;
  }
  const allDone: boolean = refs.length > 0 && mapPois.every((poi: MapPoi): boolean => poi.id === null || poi.status === "selesai");
  // Data layar Well Done.
  const bestBadge: BadgeDef | undefined = badgeDefs
    .filter((badge: BadgeDef): boolean => badges.includes(badge.id))
    .sort((a: BadgeDef, b: BadgeDef): number => b.bonus - a.bonus)[0];
  const adventure: AdventureSummary = {
    poisDone: mapPois.filter((poi: MapPoi): boolean => poi.id !== null && poi.status === "selesai").length,
    poisTotal: refs.length,
    questsDone,
    questsTotal: refs.filter((ref: PoiRef): boolean => ref.quest !== null).length,
    totalPoints: points,
    badgeName: bestBadge?.name ?? null,
  };

  // Zona dipantau selama kunjungan; POI hanya diperiksa setelah Buka cerita ditekan.
  const checkpoints: readonly Checkpoint[] = useMemo((): readonly Checkpoint[] => [
    ...zones.filter((z: ZoneInfo): boolean => wingEnabled(z.wing)).map((z: ZoneInfo): Checkpoint => ({
      id: z.code, latitude: z.latitude, longitude: z.longitude, radiusMeters: z.radiusMeters,
    })),
    ...mapPois.filter((poi: MapPoi): boolean =>
      screen.name === "story" && poi.id !== null && poi.id === screen.poiId
    ).map((poi: MapPoi): Checkpoint => ({
      id: poi.museum.code, latitude: poi.museum.latitude, longitude: poi.museum.longitude, radiusMeters: poi.museum.radiusMeters,
    })),
  ], [mapPois, screen]);
  const geofence = useGeofence({ visitId: visit?.id_sesi ?? null, checkpoints });
  const cardZone: ZoneInfo | null = zones.find((z: ZoneInfo): boolean => z.code === geofence.card) ?? null;
  const cardPoi: MapPoi | null = mapPois.find((poi: MapPoi): boolean => poi.museum.code === geofence.card) ?? null;

  async function beginVisit(token: string): Promise<Visit> {
    const created: Visit = await storiesSource.startQrVisit(randomUUID(), token, profile);
    visitState.startVisit(created);
    return created;
  }

  function failScan(message: string): void {
    setScanMessage(message);
    setScanState("failed");
  }

  async function handleScan(result: ParsedQr): Promise<void> {
    if (!result.ok) {
      failScan(qrErrorMessage(result.reason));
      return;
    }
    setScanState("detected");
    try {
      // QR pintu masuk / zona: kunjungan dimulai, tetap di layar scan untuk QR koleksi berikutnya.
      if (result.kind === "entrance" || (result.kind === null && visit === null)) {
        await beginVisit(result.token);
        setScanNotice("Kunjungan dimulai! Kembali ke peta, pilih koleksi dan tekan Buka cerita untuk memeriksa GPS, atau scan QR koleksi di sini.");
        return;
      }
      if (result.kind === "zone") {
        if (visit === null) await beginVisit(result.token);
        const info: ZoneInfo | undefined = zones.find((z: ZoneInfo): boolean => z.code === result.code);
        setQrZoneIntro(info ?? null);
        setScanNotice(`Kamu di ${info?.name ?? "zona ini"}. Pilih koleksi di peta dan tekan Buka cerita untuk memeriksa GPS, atau scan QR koleksi di sini.`);
        return;
      }
      // QR koleksi: langsung buka template cerita POI tersebut.
      if (visit === null) {
        if (storiesSource.kind !== "mock") {
          failScan("Scan QR pintu masuk dulu untuk memulai kunjungan.");
          return;
        }
        await beginVisit(MOCK_ENTRANCE_TOKEN);
      }
      const target = result.poiId === null ? undefined : museumPoiById(result.poiId);
      if (target !== undefined && !wingEnabled(target.wing)) {
        failScan("Koleksi ini ada di Sayap Kanan, yang belum dibuka di versi ini.");
        return;
      }
      setScreen({ name: "story", poiId: result.poiId ?? "", token: result.token });
    } catch (cause: unknown) {
      failScan(readableError(cause));
    } finally {
      setScanState((current: ScanState): ScanState => (current === "detected" ? "scanning" : current));
    }
  }

  if (onboarding.state === "loading" || preferences.state === "loading" || !visitState.ready) {
    return <View style={{ flex: 1, backgroundColor: colors.primary[300] }} />;
  }
  if (visitState.error !== null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16, backgroundColor: colors.primary[300] }}>
        <GeaText variant="heading24" color={colors.primary[900]}>Progres kunjungan belum dapat dimuat</GeaText>
        <GeaText variant="body16" color={colors.primary[900]} accessibilityRole="alert">{visitState.error}</GeaText>
        <StoryButton label="Coba lagi" onPress={visitState.retry} />
        <StoryButton label="Akhiri kunjungan ini" onPress={visitState.endVisit} />
      </View>
    );
  }
  function closeLocationSplash(): void {
    setLocationSplash(null);
    if (onboarding.state === "show") onboarding.complete();
  }
  if (busy === "location" && locationSplash !== null) {
    return (
      <>
        <StatusBar style="dark" />
        <LocationCheckingSplash />
      </>
    );
  }
  if (locationSplash === "ok") {
    return (
      <>
        <StatusBar style="light" />
        <LocationSuccessSplash onContinue={closeLocationSplash} />
      </>
    );
  }
  if (locationSplash === "fail") {
    return (
      <>
        <StatusBar style="light" />
        <LocationFailedSplash
          onRecheck={(): void => {
            void session.checkLocation();
          }}
          onScanQr={(): void => {
            closeLocationSplash();
            setScanMessage(null);
            setScanNotice(null);
            setScanState("scanning");
            setScreen({ name: "scan" });
          }}
        />
      </>
    );
  }
  if (onboarding.state === "show") {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingScreen
          checkingLocation={busy === "location"}
          onCheckLocation={(): void => {
            void session.checkLocation();
          }}
        />
      </>
    );
  }
  // Setelah onboarding: preferensi (usia → waktu → minat), baru masuk peta.
  if (preferences.state === "show") {
    return (
      <>
        <StatusBar style="light" />
        <PreferencesScreen onDone={preferences.save} />
      </>
    );
  }

  if (screen.name === "story" && visit !== null) {
    return (
      <>
        <StatusBar style="dark" />
        <StoryFlow
          key={`${screen.poiId}:${screen.token ?? ""}`}
          source={storiesSource}
          visit={visit}
          poiId={screen.poiId}
          initialToken={screen.token}
          gpsFix={geofence.currentFix}
          gpsSimulation={geofence.status === "simulated" ? geofence.currentFix : null}
          progressOf={progressOf}
          onProgress={visitState.update}
          onAnswer={visitState.recordAnswer}
          totalPoints={points}
          earnedBadges={badges}
          allCompleted={allDone}
          adventure={adventure}
          dummyScans={storyDummies(screen.poiId)}
          nextStop={nextStop(screen.poiId)}
          onExit={(): void => {
            const checkpoint = museumPoiById(screen.poiId);
            if (checkpoint !== undefined) geofence.dismiss(checkpoint.code);
            setScreen({ name: "map" });
          }}
        />
      </>
    );
  }

  if (screen.name === "scan") {
    return (
      <>
        <StatusBar style="light" />
        <ScanQrScreen
          state={scanState}
          failMessage={scanMessage}
          notice={scanNotice}
          onResult={(result: ParsedQr): void => void handleScan(result)}
          onRetry={(): void => setScanState("scanning")}
          onBack={(): void => setScreen({ name: "map" })}
          dummies={mapDummies}
        />
      </>
    );
  }

  if (screen.name === "progress") {
    return (
      <>
        <StatusBar style="dark" />
        <ProgressScreen
          pois={mapPois}
          progressOf={progressOf}
          totalPoints={points}
          earned={badges}
          available={availableBadges(badgeContext)}
          onBack={(): void => setScreen({ name: "map" })}
          onEndVisit={(): void => {
            visitState.endVisit();
            setScreen({ name: "map" });
          }}
        />
      </>
    );
  }

  const notice = operationError !== null
    ? { title: "Belum berhasil", description: operationError }
    : session.notice;

  return (
    <>
      <StatusBar style="dark" />
      <MapScreen
        wingsMode={wingsMode}
        pois={mapPois}
        loading={summaries === null && poisError === null}
        error={poisError ?? (summaries !== null && summaries.length === 0
          ? "Data koleksi belum tersedia di server. Hubungi tim untuk mengisi data POI."
          : null)}
        hasVisit={visit !== null}
        totalPoints={points}
        completedCount={mapPois.filter((poi: MapPoi): boolean => poi.id !== null && poi.status === "selesai").length}
        zoneIntro={cardZone ?? qrZoneIntro}
        nearby={cardPoi}
        gpsWeak={visit !== null && geofence.weak}
        gpsStatus={geofence.status}
        gpsError={geofence.error}
        gpsTests={gpsTests}
        onGpsTest={geofence.simulate}
        onDismissNearby={(): void => {
          if (cardPoi !== null) geofence.dismiss(cardPoi.museum.code);
        }}
        notice={visit === null ? notice : null}
        checkingLocation={busy === "location" || busy === "connection"}
        onDismissZone={(): void => {
          if (cardZone !== null) geofence.dismiss(cardZone.code);
          else setQrZoneIntro(null);
        }}
        onScan={(): void => {
          setScanMessage(null);
          setScanNotice(null);
          setScanState("scanning");
          setScreen({ name: "scan" });
        }}
        onCheckLocation={(): void => {
          if (visit === null) void session.checkLocation();
          else void runOperation("connection", geofence.refresh);
        }}
        onRetry={(): void => {
          setSummaries(null);
          void loadPois();
        }}
        onOpenProgress={(): void => setScreen({ name: "progress" })}
        onOpenPoi={(poiId: string): void => setScreen({ name: "story", poiId, token: null })}
        userFix={geofence.fix}
        route={route}
        topicsFor={(code: string): readonly string[] => matchedTopics(preferences.preferences, code)}
      />
    </>
  );
}

export default function App(): ReactElement {
  useEffect((): (() => void) | undefined => {
    if (Platform.OS !== "web" || window.parent === window) return undefined;
    return registerDemoSource(storiesSource.kind);
  }, []);
  return (
    <SafeAreaProvider>
      <GeaFontsProvider>
        <Home />
      </GeaFontsProvider>
    </SafeAreaProvider>
  );
}
