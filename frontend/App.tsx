import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./src/design/tokens";
import { GeaFontsProvider, GeaText } from "./src/design/typography";
import type { PoiSummary, Visit } from "./src/domain/contracts";
import { preferencesSchema } from "./src/domain/contracts";
import { availableBadges, type BadgeContext, type BadgeDef, badgeBonus, badgeProgress, type BadgeId, badges as badgeDefs, earnedBadges, poiStatus, type PoiRef, totalPoints } from "./src/domain/points";
import { devicePhotoPoints, localActivityPoints, type PoiProgress } from "./src/features/stories/progress";
import { useQuestDays } from "./src/features/progress/useQuestDays";
import { questKind, questPlan } from "./src/features/stories/questPlan";
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
import type { Preferences } from "./src/features/preferences/usePreferences";
import { formatCountdown, museumClosingAt, visitWindow } from "./src/features/preferences/visitTiming";
import { closingTimeLabel, EXIT_BUFFER_MS, extensionOptions, MINUTE_MS, suggestNextPoi, visitPrompt, type VisitPrompt, type VisitSuggestion } from "./src/features/visit/lifecycle";
import { VisitSheet, type VisitPanel } from "./src/features/visit/VisitSheet";
import { useVisitLifecycle } from "./src/features/visit/useVisitLifecycle";
import { profileForAge, recommendRoute, type Route } from "./src/features/preferences/recommend";
import { ProgressScreen } from "./src/features/progress/ProgressScreen";
import { wingEnabled, wingsMode } from "./src/config/wings";
import { useVisitProgress } from "./src/features/progress/useVisitProgress";
import { type ParsedQr, qrErrorMessage, wrapQr } from "./src/features/qr/qrPayload";
import { type DummyScan, ScanQrScreen, type ScanState } from "./src/features/stories/hifi/ScanQrScreen";
import { StoryFlow } from "./src/features/stories/hifi/StoryFlow";
import { LocationFailedSplash, LocationSuccessSplash } from "./src/features/location/LocationSplash";
import { LocationCheckingSplash } from "./src/features/location/LocationChecking";
import { type AdventureSummary, formatVisitDuration, ShareResultScreen, WellDoneScreen } from "./src/features/stories/hifi/AdventureDoneScreens";
import { StoryButton } from "./src/features/stories/hifi/parts";
import { useOperation } from "./src/hooks/useOperation";
import { useAuthRefresh } from "./src/hooks/useAuthRefresh";
import { useVisitSession } from "./src/hooks/useVisitSession";
import { useGeofence } from "./src/hooks/useGeofence";
import { useVisitClock } from "./src/hooks/useVisitClock";
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
  | { readonly name: "summary" }
  | { readonly name: "share" }
  | { readonly name: "story"; readonly poiId: string; readonly token: string | null };

function Home(): ReactElement {
  useAuthRefresh();
  const onboarding = useOnboarding();
  const preferences = usePreferences();
  const { busy, error: operationError, clearError, runOperation } = useOperation();
  const visitState = useVisitProgress(storiesSource);
  const { visit, progress, progressOf } = visitState;
  const effectivePreferences: Preferences | null = visit?.personalization ?? preferences.preferences;
  const profile = profileForAge(effectivePreferences);
  const session = useVisitSession(api, runOperation, profile);
  const startedAtMs: number | null = visit?.startedAt ?? null;
  const endsAtMs: number | null = visit?.planned_end_at != null ? Date.parse(visit.planned_end_at)
    : storiesSource.kind === "api" ? null
    : startedAtMs === null || effectivePreferences === null ? null : visitWindow(effectivePreferences.duration, startedAtMs).endsAtMs;
  const [demoOffsetMs, setDemoOffsetMs] = useState<number>(0);
  const lifecycle = useVisitLifecycle({ api, source: storiesSource.kind, visit, replaceVisit: visitState.replaceVisit, demoOffsetMs });
  const clock = useVisitClock(startedAtMs, endsAtMs, lifecycle.serverOffsetMs + demoOffsetMs);
  const closingAtMs: number | null = visit?.closing_at != null ? Date.parse(visit.closing_at)
    : storiesSource.kind === "mock" && startedAtMs !== null ? museumClosingAt(startedAtMs) : null;
  const museumClosed: boolean = closingAtMs !== null && clock.nowMs >= closingAtMs;
  const visitEnded: boolean = visit?.status === "selesai" || museumClosed;
  const [requestedPanel, setRequestedPanel] = useState<"finish" | "extend" | null>(null);
  const [recommendedCode, setRecommendedCode] = useState<string | null>(null);
  const [closedAcknowledged, setClosedAcknowledged] = useState<boolean>(false);
  const [mapDestination, setMapDestination] = useState<"exit" | "pois">("pois");
  const automaticFinishAttempt = useRef<string | null>(null);
  useEffect((): void => {
    if (!museumClosed) automaticFinishAttempt.current = null;
    if (visit === null || visit.status === "selesai" || !museumClosed || lifecycle.busy || lifecycle.error !== null) return;
    if (automaticFinishAttempt.current === visit.id_sesi) return;
    automaticFinishAttempt.current = visit.id_sesi;
    if (storiesSource.kind === "api") void lifecycle.refresh();
    else void lifecycle.finish();
  }, [visit, museumClosed, lifecycle.busy, lifecycle.error]);
  const [planError, setPlanError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState<boolean>(false);
  // Pulihkan jawaban dari sesi server; draft perangkat hanya dipakai sebelum sesi memiliki rencana.
  useEffect((): void => {
    if (visit?.personalization == null || preferences.state === "loading") return;
    if (JSON.stringify(visit.personalization) !== JSON.stringify(preferences.preferences)) preferences.save(visit.personalization);
  }, [visit?.personalization, preferences.state]);
  useEffect((): (() => void) | undefined => {
    if (!visitState.ready || storiesSource.kind !== "api" || visit === null ||
      visit.status !== "aktif" || museumClosed || visit.personalization != null || preferences.preferences === null) return undefined;
    let active: boolean = true;
    setSavingPlan(true);
    setPlanError(null);
    api.personalizeVisit(visit.id_sesi, preferences.preferences, wingsMode).then(async (updated: Visit): Promise<void> => {
      if (active) {
        setSavingPlan(false);
        await visitState.replaceVisit(updated);
      }
    }).catch((cause: unknown): void => {
      if (active) setPlanError(readableError(cause));
    }).finally((): void => {
      if (active) setSavingPlan(false);
    });
    return (): void => { active = false; };
  }, [visitState.ready, visit?.id_sesi, visit?.personalization, preferences.preferences]);

  async function savePreferences(value: Preferences): Promise<void> {
    await runOperation("stories", async (): Promise<void> => {
      if (storiesSource.kind === "api" && visit !== null) {
        const updated: Visit = await api.personalizeVisit(visit.id_sesi, value, wingsMode);
        await visitState.replaceVisit(updated);
        setPlanError(null);
      } else if (visit !== null && startedAtMs !== null) {
        const deadline: number = JSON.stringify(value) === JSON.stringify(effectivePreferences) && endsAtMs !== null
          ? endsAtMs : visitWindow(value.duration, startedAtMs).endsAtMs;
        await visitState.replaceVisit({ ...visit, personalization: preferencesSchema.parse(value), planned_end_at: new Date(deadline).toISOString() });
      }
      preferences.save(value);
    });
  }
  // Toast "Rute Untuk Anda" sekali saat kunjungan baru dimulai (dari peta awal).
  const [routeToast, setRouteToast] = useState<boolean>(false);
  const lastVisitId = useRef<string | null | undefined>(undefined);
  useEffect((): void => {
    if (!visitState.ready) return;
    const id: string | null = visit?.id_sesi ?? null;
    if (lastVisitId.current === null && id !== null) setRouteToast(true);
    lastVisitId.current = id;
  }, [visitState.ready, visit?.id_sesi]);

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
  const scanPending = useRef<boolean>(false);
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
      const state = progress[museum.idPoi];
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
      quests: questPlan(poi.id ?? "", profile),
    }));
  const questsDone: number = refs.filter((ref: PoiRef): boolean => {
    const state = progress[ref.id];
    if (state === undefined || ref.quest === null) return false;
    return state.completed || state.failed;
  }).length;
  const questDays: number = useQuestDays(questsDone);
  // Lencana prioritas rendah (BD-05, BD-08, BD-09; POI-12 s.d. POI-21) ditunda sesuai sheet Badge_Poin:
  // konten POI-15 s.d. POI-20 belum ada. Ganti ke wingEnabled("right") setelah kontennya lengkap.
  const badgeContext: BadgeContext = { kid: profile === "anak", questDays, rightWing: false };
  const localBadges: readonly BadgeId[] = earnedBadges(refs, progress, badgeContext);
  // Kuis API memakai total server; hasil model APK disimpan dan dijumlahkan di perangkat.
  const badges: readonly BadgeId[] = storiesSource.kind === "api"
    ? [...new Set([...visitState.rewards.badges, ...localBadges])]
    : localBadges;
  // Poin aktivitas (check-in, cerita, percobaan pertama, POI tuntas) dihitung di aplikasi.
  const points: number = localActivityPoints(progress) + (storiesSource.kind === "api"
    ? visitState.rewards.totalPoints + devicePhotoPoints(progress) + badgeBonus(
      localBadges.filter((id: BadgeId): boolean => !visitState.rewards.badges.includes(id)),
    )
    : totalPoints(refs, progress, badgeContext));
  // Anggaran rute memakai waktu mulai yang tetap, sehingga progres dan timer tidak mengubah rutenya.
  const route: Route | null = useMemo((): Route | null => {
    if (storiesSource.kind === "api" && visit !== null) {
      if (visit.personalization == null || visit.route_codes == null || visit.route_minutes == null || visit.closing_limited == null) return null;
      return {
        codes: visit.route_codes, topics: visit.personalization.topics,
        duration: visit.personalization.duration, totalMinutes: visit.route_minutes,
        closingLimited: visit.closing_limited,
      };
    }
    return recommendRoute(
      effectivePreferences,
      museumPois.filter((poi): boolean => wingEnabled(poi.wing) &&
        summaries?.some((summary: PoiSummary): boolean => summary.id_poi === poi.idPoi) === true
      ).map((poi): string => poi.code),
      new Date(startedAtMs ?? Date.now()),
    );
  }, [effectivePreferences, summaries, startedAtMs, visit]);
  /** Ruangan berikutnya di rute yang belum selesai (selain ruangan yang sedang dibuka). */
  function nextStop(exceptPoiId: string): string | null {
    const next: MapPoi | undefined = route?.codes
      .map((code: string): MapPoi | undefined => mapPois.find((poi: MapPoi): boolean => poi.museum.code === code))
      .find((poi: MapPoi | undefined): boolean =>
        poi !== undefined && poi.id !== exceptPoiId && poi.status !== "selesai" && progress[poi.id ?? ""]?.closed !== true
      );
    return next === undefined ? null : `${next.museum.code} · ${next.museum.name}`;
  }
  const routeDone: boolean = route !== null && route.codes.length > 0 &&
    route.codes.every((code: string): boolean => {
      const match = mapPois.find((poi: MapPoi): boolean => poi.museum.code === code);
      return match !== undefined && match.status === "selesai";
    });
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
    durationText: formatVisitDuration(startedAtMs, visit?.end_time == null ? museumClosed && closingAtMs !== null ? closingAtMs : clock.nowMs : Date.parse(visit.end_time)),
    durationMinutes: Math.max(1, Math.round(((visit?.end_time == null ? museumClosed && closingAtMs !== null ? closingAtMs : clock.nowMs : Date.parse(visit.end_time)) - (startedAtMs ?? clock.nowMs)) / 60_000)),
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
  const geofence = useGeofence({ visitId: visit?.id_sesi ?? null, checkpoints: visitEnded ? [] : checkpoints });
  const options: readonly number[] = endsAtMs === null || closingAtMs === null || visitEnded ? [] : extensionOptions(endsAtMs, closingAtMs, clock.nowMs);
  const suggestionBudgetMs: number = endsAtMs === null || closingAtMs === null ? 0
    : Math.min(endsAtMs, closingAtMs - EXIT_BUFFER_MS) - clock.nowMs;
  const suggestion: VisitSuggestion | null = suggestNextPoi(
    mapPois.filter((poi: MapPoi): boolean => poi.id !== null && poi.status !== "selesai").map((poi: MapPoi): typeof poi.museum => poi.museum),
    effectivePreferences, geofence.currentFix, suggestionBudgetMs,
  );
  const automaticPrompt: VisitPrompt | null = endsAtMs === null || closingAtMs === null || visit === null || visitEnded
    ? null : visitPrompt(clock.nowMs, endsAtMs, closingAtMs, routeDone && suggestion !== null);
  const promptKey: string | null = automaticPrompt === null ? null
    : automaticPrompt.startsWith("closing") ? `${automaticPrompt}:${closingAtMs}`
    : `${automaticPrompt}:${endsAtMs}:${automaticPrompt === "route_done" ? suggestion?.poi.code ?? "" : ""}`;
  const pendingPrompt: VisitPrompt | null = promptKey !== null && lifecycle.dismissed !== null && !lifecycle.dismissed.includes(promptKey) ? automaticPrompt : null;
  const panel: VisitPanel | null = visitEnded && !closedAcknowledged ? museumClosed || visit?.ended_reason === "closing" ? "closed" : "finished"
    : pendingPrompt === "closing_prepare" || pendingPrompt === "closing_soon" ? pendingPrompt : requestedPanel ?? pendingPrompt;

  async function dismissVisitPanel(): Promise<void> {
    if (promptKey !== null) await lifecycle.dismiss(promptKey);
    setRequestedPanel(null);
  }
  async function extendVisit(minutes: number): Promise<void> {
    if (endsAtMs === null || closingAtMs === null) return;
    if (await lifecycle.extend(minutes, endsAtMs, closingAtMs)) {
      await dismissVisitPanel();
    }
  }
  async function finishVisit(): Promise<void> {
    if (await lifecycle.finish()) {
      setRequestedPanel(null);
      setClosedAcknowledged(true);
      setScreen({ name: "summary" });
    }
  }
  const cardZone: ZoneInfo | null = zones.find((z: ZoneInfo): boolean => z.code === geofence.card) ?? null;
  const cardPoi: MapPoi | null = mapPois.find((poi: MapPoi): boolean => poi.museum.code === geofence.card) ?? null;

  async function beginVisit(token: string): Promise<Visit> {
    const created: Visit = await storiesSource.startQrVisit(randomUUID(), token, profile);
    const start: number = created.startedAt ?? Date.now();
    const planned: Visit = storiesSource.kind === "mock" && effectivePreferences !== null ? {
      ...created, startedAt: start, personalization: preferencesSchema.parse(effectivePreferences),
      planned_end_at: new Date(visitWindow(effectivePreferences.duration, start).endsAtMs).toISOString(),
      closing_at: new Date(museumClosingAt(start)).toISOString(),
    } : created;
    visitState.startVisit(planned);
    return planned;
  }

  function failScan(message: string): void {
    setScanMessage(message);
    setScanState("failed");
  }

  async function handleScan(result: ParsedQr): Promise<void> {
    if (visitEnded) { failScan("Kunjungan sudah selesai. Buka ringkasan kunjunganmu."); return; }
    if (scanPending.current) return;
    if (!result.ok) {
      failScan(qrErrorMessage(result.reason));
      return;
    }
    scanPending.current = true;
    setScanState("detected");
    try {
      // QR pintu masuk / zona: kunjungan dimulai, tetap di layar scan untuk QR koleksi berikutnya.
      if (result.kind === "entrance" || (result.kind === null && visit === null)) {
        if (visit === null) {
          await beginVisit(result.token);
          setScanNotice("Kunjungan dimulai! Kembali ke peta atau scan QR koleksi di sini.");
        } else {
          setScanNotice("Kunjunganmu masih aktif. Kembali ke peta atau scan QR koleksi untuk melanjutkan.");
        }
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
      scanPending.current = false;
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
          message={operationError !== null
            ? { title: "Lokasi belum dapat diperiksa", description: operationError }
            : session.notice ?? {
              title: "Lokasi belum dapat diperiksa",
              description: "Periksa izin dan layanan lokasi, lalu coba lagi atau pindai QR pintu masuk.",
            }}
          decision={operationError === null ? session.decision : null}
          settingsAction={session.locationSettingsAction}
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
            // Demo memakai QR uji lokal; onboarding tidak perlu menghubungi server GPS.
            if (storiesMockEnabled) {
              onboarding.complete();
              return;
            }
            void session.checkLocation();
          }}
        />
      </>
    );
  }
  // Setelah onboarding: preferensi (usia → waktu → minat), baru masuk peta.
  if (preferences.state === "show" && !visitEnded) {
    return (
      <>
        <StatusBar style="light" />
        <PreferencesScreen
          value={preferences.draft}
          onChange={preferences.updateDraft}
          onBack={(): void => {
            setLocationSplash(visit === null ? "fail" : "ok");
          }}
          onDone={(value: Preferences): void => { void savePreferences(value); }}
          saving={busy === "stories"}
          error={operationError}
          onDismissError={clearError}
        />
      </>
    );
  }

  const visitSheet: ReactElement | null = closingAtMs !== null && visit !== null ? <VisitSheet key={`${panel}:${endsAtMs}`}
        panel={panel} closingAtMs={closingAtMs} options={options} suggestion={suggestion}
        busy={lifecycle.busy} error={lifecycle.error}
        onDismiss={(): void => { void dismissVisitPanel(); }}
        onChooseExtension={(): void => { setRequestedPanel("extend"); }}
        onExtend={(minutes: number): void => { void extendVisit(minutes); }}
        onSuggest={(): void => { if (suggestion !== null) setRecommendedCode(suggestion.poi.code); void dismissVisitPanel(); }}
        onFinish={(): void => { void finishVisit(); }}
        onExitDirections={(): void => { setMapDestination("exit"); setClosedAcknowledged(visitEnded); setScreen({ name: "map" }); void dismissVisitPanel(); }}
        onSummary={(): void => { setClosedAcknowledged(true); setScreen({ name: "summary" }); }} /> : null;

  if (screen.name === "story" && visit !== null && !visitEnded) {
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
        {(panel === "closing_soon" || panel === "closing_prepare") && visitSheet}
      </>
    );
  }

  if (screen.name === "scan" && !visitEnded) {
    return (
      <>
        <StatusBar style="light" />
        <ScanQrScreen
          state={scanState}
          failMessage={scanMessage}
          notice={scanNotice}
          onResult={handleScan}
          onRetry={(): void => setScanState("scanning")}
          onBack={(): void => setScreen({ name: "map" })}
          dummies={mapDummies}
        />
        {(panel === "closing_soon" || panel === "closing_prepare") && visitSheet}
      </>
    );
  }

  if (screen.name === "summary") {
    return (
      <>
        <StatusBar style="dark" />
        <WellDoneScreen
          summary={adventure}
          onShare={(): void => setScreen({ name: "share" })}
          onHome={(): void => setScreen({ name: "map" })}
        />
      </>
    );
  }

  if (screen.name === "share") {
    return (
      <>
        <StatusBar style="dark" />
        <ShareResultScreen
          summary={adventure}
          onBack={(): void => setScreen({ name: "summary" })}
        />
      </>
    );
  }

  if (screen.name === "progress") {
    return (
      <>
        <StatusBar style="light" />
        <ProgressScreen
          earned={badges}
          available={availableBadges(badgeContext)}
          progress={badgeProgress(refs, progress, badgeContext)}
          onBack={(): void => setScreen({ name: "map" })}
          onEndVisit={(): void => { setRequestedPanel("finish"); setScreen({ name: "map" }); }}
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
        destination={mapDestination}
        onBack={visitEnded ? (): void => setScreen({ name: "summary" }) : preferences.reopen}
        visitEnded={visitEnded}
        recommendedCode={recommendedCode}
        timeTests={storiesSource.kind !== "mock" || endsAtMs === null || closingAtMs === null ? [] : [
          { label: "Waktu uji: durasi tinggal 4 menit", onPress: (): void => setDemoOffsetMs(endsAtMs - 4 * MINUTE_MS - Date.now()) },
          { label: "Waktu uji: durasi habis", onPress: (): void => setDemoOffsetMs(endsAtMs + 1000 - Date.now()) },
          { label: "Waktu uji: museum tutup 14 menit lagi", onPress: (): void => setDemoOffsetMs(closingAtMs - 14 * MINUTE_MS - Date.now()) },
          { label: "Waktu uji: museum tutup 4 menit lagi", onPress: (): void => setDemoOffsetMs(closingAtMs - 4 * MINUTE_MS - Date.now()) },
          { label: "Waktu uji: museum sudah tutup", onPress: (): void => setDemoOffsetMs(closingAtMs + 1000 - Date.now()) },
          { label: "Waktu uji: kembali ke jam asli", onPress: (): void => setDemoOffsetMs(0) },
        ]}
        visitTimeLabel={visit === null || endsAtMs === null || closingAtMs === null ? null : visitEnded ? "Kunjungan selesai"
          : closingAtMs - clock.nowMs <= 15 * MINUTE_MS ? `Museum tutup dalam ${formatCountdown(Math.max(0, closingAtMs - clock.nowMs))}`
          : `Rencana ${formatCountdown(clock.remainingMs ?? 0)} · tutup ${closingTimeLabel(closingAtMs)}`}
        onExtendTime={options.length === 0 ? null : (): void => setRequestedPanel("extend")}
        remainingMs={clock.remainingMs}
        routeToast={routeToast}
        onCloseRouteToast={(): void => setRouteToast(false)}
        wingsMode={wingsMode}
        pois={mapPois}
        loading={(summaries === null && poisError === null) || savingPlan}
        error={planError ?? poisError ?? (summaries !== null && summaries.length === 0
          ? "Data koleksi belum tersedia di server. Hubungi tim untuk mengisi data POI."
          : null)}
        hasVisit={visit !== null}
        totalPoints={points}
        visitedCount={mapPois.filter((poi: MapPoi): boolean => {
          if (poi.id === null || (wingsMode === "left" && poi.museum.wing !== "left")) return false;
          const state: PoiProgress = progressOf(poi.id);
          return state.checkedIn === true || state.verifiedUntil !== null || state.closed || state.completed || state.failed;
        }).length}
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
          setPlanError(null);
          if (storiesSource.kind === "api" && visit !== null && effectivePreferences !== null) {
            setSavingPlan(true);
            api.personalizeVisit(visit.id_sesi, effectivePreferences, wingsMode)
              .then(visitState.replaceVisit)
              .catch((cause: unknown): void => setPlanError(readableError(cause)))
              .finally((): void => setSavingPlan(false));
          }
        }}
        onOpenSummary={(): void => { if (visitEnded) setScreen({ name: "summary" }); else setRequestedPanel("finish"); }}
        onOpenBadges={(): void => setScreen({ name: "progress" })}
        onOpenPoi={(poiId: string): void => setScreen({ name: "story", poiId, token: null })}
        userFix={geofence.fix}
        route={route}
        profile={visit?.profil ?? profile}
      />
      {visitSheet}
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
