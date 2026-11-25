import { type ReactElement, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Toast } from "../../design/Toast";
import { AnimatedNotification } from "../../design/AnimatedNotification";
import { colors, shadows } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { MuseumPoi, ZoneInfo } from "../../data/museum";
import { storyRecording } from "../../data/poiAudio";
import type { Profile } from "../../domain/contracts";
import type { Fix } from "../../domain/geofence";
import type { PoiStatus } from "../../domain/points";
import type { GeofenceStatus } from "../../hooks/useGeofence";
import { useHeading } from "../../hooks/useHeading";
import { estimatePlanBearing, type HeadingAnchor } from "../../domain/heading";
import type { Route } from "../preferences/recommend";
import { formatCountdown } from "../preferences/visitTiming";
import { LanguageButton, SettingsPanel, useLanguage } from "../preferences/LanguageSettings";
import { FrameStage } from "../stories/hifi/parts";
import {
  ENTRANCE, PLAN_PINS, estimateMetersPerUnit, locateOnPlan, pathLength, reachedDestination, routeLegs,
  type LocationAnchor, type PlanPin, type PlanPoint, type RouteLeg, updateActiveLeg, walkingMinutes, walkingPath,
} from "./navigation";
import { PlanViewport } from "./PlanViewport";
import { StartMap } from "./StartMap";
import type { EyesFreeTarget } from "../eyesfree/engine";
import { useEyesFree } from "../eyesfree/useEyesFree";
import type { BackgroundResult } from "../eyesfree/background";

export type MapPoi = {
  readonly museum: MuseumPoi;
  readonly id: string | null;
  readonly status: PoiStatus;
};
export type GpsTest = { readonly label: string; readonly fix: Fix | null };
type Notice = { readonly title: string; readonly description: string };
type HeadingTest = { readonly label: string; readonly degrees: number };
const headingTests: readonly HeadingTest[] = [
  { label: "Hadap utara", degrees: 0 },
  { label: "Hadap timur", degrees: 90 },
  { label: "Hadap selatan", degrees: 180 },
  { label: "Hadap barat", degrees: 270 },
];
type Props = {
  readonly afterPoiCode: string | undefined;
  readonly onBack: () => void;
  readonly remainingMs: number | null;
  /** Tampilkan toast "Rute Untuk Anda" (baru masuk dari peta awal). */
  readonly routeToast?: boolean;
  readonly onCloseRouteToast?: () => void;
  readonly wingsMode: "left" | "both";
  readonly pois: readonly MapPoi[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly hasVisit: boolean;
  readonly totalPoints: number;
  readonly visitedCount: number;
  readonly zoneIntro: ZoneInfo | null;
  readonly notice: Notice | null;
  readonly checkingLocation: boolean;
  readonly onDismissZone: () => void;
  readonly nearby: MapPoi | null;
  readonly onDismissNearby: () => void;
  readonly gpsWeak: boolean;
  readonly gpsStatus: GeofenceStatus;
  readonly gpsError: string | null;
  readonly gpsTests: readonly GpsTest[];
  readonly onGpsTest: (fix: Fix | null) => void;
  readonly onScan: () => void;
  readonly onCheckLocation: () => void;
  readonly onRetry: () => void;
  readonly onOpenSummary?: () => void;
  /** Membuka alur verifikasi geofence POI sebelum mengakses cerita. */
  readonly onOpenPoi: (id: string) => void;
  readonly userFix: Fix | null;
  readonly route: Route | null;
  /** Profil pengunjung, untuk memilih rekaman cerita umum/anak di mode tanpa layar. */
  readonly profile: Profile;
};

const CARD_TOP: number = 486;
const overviewImage: number = require("../../../assets/design/navigation/overview.svg") as number;
const directionIcon: number = require("../../../assets/design/navigation/direction.svg") as number;
const scanIcon: number = require("../../../assets/design/navigation/scan.svg") as number;
const bookIcon: number = require("../../../assets/design/navigation/book.svg") as number;
const flagIcon: number = require("../../../assets/design/navigation/flag.svg") as number;

/** Pemilihan pin tidak memberi akses cerita; Buka cerita memulai verifikasi GPS. */
export function MapScreen(props: Props): ReactElement {
  const { language, t } = useLanguage();
  const orientation = useHeading();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [testsOpen, setTestsOpen] = useState<boolean>(false);
  const [routeOpen, setRouteOpen] = useState<boolean>(false);
  const [expiryDismissed, setExpiryDismissed] = useState<boolean>(false);
  const [navigationStopped, setNavigationStopped] = useState<boolean>(false);
  const [eyesFreeToast, setEyesFreeToast] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    if (!settingsOpen) return;
    if (Platform.OS === "web") {
      const handleKey = (event: KeyboardEvent): void => {
        if (event.key === "Escape") setSettingsOpen(false);
      };
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      setSettingsOpen(false);
      return true;
    });
    return () => back.remove();
  }, [settingsOpen]);
  const anchors: readonly LocationAnchor[] = useMemo((): readonly LocationAnchor[] => props.pois.map((poi: MapPoi): LocationAnchor => ({
    code: poi.museum.code, latitude: poi.museum.latitude, longitude: poi.museum.longitude,
  })), [props.pois]);
  const location: PlanPoint | null = useMemo((): PlanPoint | null => locateOnPlan(props.userFix, anchors), [props.userFix, anchors]);
  const planBearing: number | null = useMemo((): number | null => estimatePlanBearing(anchors.flatMap((anchor: LocationAnchor): readonly HeadingAnchor[] => {
    const pin: PlanPin | undefined = PLAN_PINS.find((item: PlanPin): boolean => item.code === anchor.code);
    return pin === undefined ? [] : [{ ...anchor, x: pin.x, y: pin.y }];
  })), [anchors]);
  const remaining: readonly MapPoi[] = useMemo((): readonly MapPoi[] => {
    const codes = props.route?.codes ?? [];
    const previous = props.afterPoiCode === undefined ? -1 : codes.indexOf(props.afterPoiCode);
    const ordered = previous < 0 ? codes : [...codes.slice(previous + 1), ...codes.slice(0, previous)];
    return ordered
      .map((code): MapPoi | undefined => props.pois.find((poi: MapPoi): boolean => poi.museum.code === code))
      .filter((poi): poi is MapPoi => poi !== undefined && poi.id !== null && poi.status !== "selesai" &&
        poi.museum.code !== props.afterPoiCode);
  }, [props.route, props.pois, props.afterPoiCode]);
  const selected: MapPoi | null = props.pois.find((poi: MapPoi): boolean => poi.museum.code === selectedCode) ?? null;
  const nearby = props.nearby?.status === "selesai" ? null : props.nearby;
  const target: MapPoi | null = selected ?? remaining[0] ?? (props.afterPoiCode === undefined ? nearby : null);
  const destinationCodes: readonly string[] = useMemo((): readonly string[] => {
    if (navigationStopped) return [];
    const codes: readonly string[] = remaining.map((poi: MapPoi): string => poi.museum.code);
    return target === null || target.id === null ? codes : [target.museum.code, ...codes.filter((code: string): boolean => code !== target.museum.code)];
  }, [remaining, target, navigationStopped]);
  const eyesFreeStop = (poi: MapPoi): EyesFreeTarget => ({
    code: poi.museum.code, name: poi.museum.name, latitude: poi.museum.latitude, longitude: poi.museum.longitude,
    radiusMeters: poi.museum.radiusMeters, recording: storyRecording(poi.museum.code, props.profile, language),
  });
  const eyesFreeStops: readonly EyesFreeTarget[] = useMemo((): readonly EyesFreeTarget[] => props.pois
    .filter((poi: MapPoi): boolean => poi.id !== null && (props.wingsMode === "both" || poi.museum.wing === "left"))
    .map(eyesFreeStop),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [props.pois, props.wingsMode, props.profile, language]);
  const eyesFreeTargets: readonly EyesFreeTarget[] = useMemo((): readonly EyesFreeTarget[] => destinationCodes.flatMap((code: string): readonly EyesFreeTarget[] => {
    const poi: MapPoi | undefined = props.pois.find((item: MapPoi): boolean => item.museum.code === code);
    return poi === undefined ? [] : [eyesFreeStop(poi)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [destinationCodes, props.pois, props.profile, language]);
  const eyesFree = useEyesFree({
    visitId: props.hasVisit ? "visit" : null, stops: eyesFreeStops, targets: eyesFreeTargets, fix: props.userFix,
  });
  const estimatedScale = useMemo(() => estimateMetersPerUnit(anchors), [anchors]);
  const plannedLegs = useMemo(() => routeLegs(ENTRANCE, destinationCodes), [destinationCodes]);
  const activeCode = destinationCodes[0];
  const [tracked, setTracked] = useState<{ readonly leg: RouteLeg; readonly rerouted: boolean } | null>(null);
  useEffect(() => {
    if (activeCode === undefined) {
      setTracked(null);
      return;
    }
    const end = PLAN_PINS.find((pin) => pin.code === activeCode);
    if (location === null || end === undefined || estimatedScale === null) return;
    // Hitung pada fix GPS terbaru; watcher meminta pembaruan setiap 1 detik.
    setTracked((previous) => previous?.leg.code === activeCode
      ? updateActiveLeg(previous.leg, location, estimatedScale)
      : { leg: { code: activeCode, points: walkingPath(location, end) }, rerouted: false });
  }, [activeCode, location, estimatedScale]);
  const currentLeg = tracked !== null && tracked.leg.code === activeCode ? tracked : null;
  const legs = currentLeg === null ? plannedLegs : [currentLeg.leg, ...plannedLegs.slice(1)];

  const routeCount: number = props.route?.codes.length ?? 0;
  const routePois: readonly MapPoi[] = (props.route?.codes ?? []).flatMap((code: string): readonly MapPoi[] => {
    const poi: MapPoi | undefined = props.pois.find((item: MapPoi): boolean => item.museum.code === code);
    return poi === undefined ? [] : [poi];
  });
  const availableCount: number = props.pois.filter((poi: MapPoi): boolean => poi.id !== null && (props.wingsMode === "both" || poi.museum.wing === "left")).length;
  const targetLabel: string = target === null ? "" : `POI ${Number(target.museum.code.slice(1))}`;
  const hasActiveTarget = activeCode !== undefined && activeCode === target?.museum.code;
  const arrived = hasActiveTarget && target !== null && reachedDestination(props.userFix, target.museum);
  const remainingMeters = arrived ? 0 : hasActiveTarget && location !== null && currentLeg !== null && estimatedScale !== null
    ? Math.round(pathLength(currentLeg.leg.points) * estimatedScale) : null;
  const directionTitle: string = navigationStopped ? t("Navigasi dihentikan", "Navigation stopped")
    : target === null ? t("Pilih tujuan di peta", "Choose a destination on the map")
    : !hasActiveTarget ? t("Rute belum tersedia", "Route unavailable")
    : arrived ? t("Kamu sudah tiba", "You’ve arrived")
    : currentLeg?.rerouted === true && location !== null ? t("Rute diperbarui", "Route recalculated")
    : t("Ikuti jalur di peta", "Follow the route on the map");
  const zone = language === "en" ? props.zoneIntro?.en : props.zoneIntro;
  const timeExpired: boolean = props.remainingMs !== null && props.remainingMs === 0;
  const visitTimeLeft = props.remainingMs === null ? null : formatCountdown(props.remainingMs);
  const showRouteToast: boolean = props.routeToast === true && props.hasVisit && routeCount > 0;

  function choosePoi(code: string): void {
    setSelectedCode(code);
    setNavigationStopped(false);
    if (props.nearby !== null && props.nearby.museum.code !== code) props.onDismissNearby();
  }

  function stopNavigation(): void {
    setNavigationStopped(true);
    if (eyesFree.enabled) eyesFree.toggle();
    setEyesFreeToast(false);
  }

  function startNavigation(): void {
    setNavigationStopped(false);
  }

  const signal: string = props.gpsStatus === "simulated" ? `Mode uji lokasi${props.gpsWeak ? " · GPS belum akurat" : ""}`
    : props.checkingLocation ? t("Mencari lokasimu…", "Finding your location…")
    : props.gpsStatus === "no_permission" ? t("Izinkan lokasi untuk mengikuti posisimu", "Allow location access to follow your position")
    : props.gpsError !== null ? t("Lokasi belum tersedia · pindai QR bila perlu", "Location unavailable · scan QR if needed")
    : props.gpsWeak ? t("GPS belum akurat · pindai QR bila perlu", "Weak GPS accuracy · scan QR if needed")
    : location !== null && props.userFix !== null ? t(`Akurasi GPS ± ${Math.round(props.userFix.accuracyMeters)} meter`, `GPS accuracy ±${Math.round(props.userFix.accuracyMeters)} m`)
    : props.hasVisit && props.userFix !== null ? t("Posisi di luar jangkauan denah", "Location outside the map area")
    : props.hasVisit ? t("Menunggu lokasi GPS…", "Waiting for GPS…") : t("Aktifkan lokasi untuk mulai menjelajah", "Enable location to start exploring");

  return (
    <FrameStage background={colors.primary[0]}>
      <PlanViewport pois={props.pois} selectedCode={selectedCode} nextCode={target?.museum.code ?? null}
        routeCodes={props.route?.codes ?? []} legs={legs} location={location} leftOnly={props.wingsMode === "left"}
        onSelect={choosePoi} onLocate={props.onCheckLocation} orientation={orientation} planBearing={planBearing}
        onOpenTests={props.hasVisit && props.gpsTests.length > 0 ? (): void => setTestsOpen(true) : null} />
      <View style={styles.overview} pointerEvents="box-none">
        <Image accessible={false} source={overviewImage} style={StyleSheet.absoluteFill} contentFit="fill" />
        <View style={styles.visitedStat} accessibilityLabel={`${props.visitedCount} dari ${availableCount} POI dikunjungi`}>
          <GeaText variant="bold16" color={colors.primary[700]} style={styles.statValue}>{props.visitedCount}/{availableCount} POI</GeaText>
          <GeaText variant="caption12" color={colors.primary[700]} style={styles.statCaption}>{t("Dikunjungi", "Visited")}</GeaText>
        </View>
        <View style={styles.pointsStat} accessibilityLabel={`${props.totalPoints} poin terkumpul`}>
          <GeaText variant="bold16" color={colors.primary[700]} style={styles.statValue}>{props.totalPoints} {t("poin", "pts")}</GeaText>
          <GeaText variant="caption12" color={colors.primary[700]} style={styles.statCaption}>{t("Terkumpul", "Earned")}</GeaText>
        </View>
        <View role="timer" style={styles.timeStat}
          accessibilityLabel={`${t("Sisa waktu kunjungan", "Visit time left")}: ${visitTimeLeft ?? t("Belum tersedia", "Unavailable")}`}>
          <GeaText variant="bold16" color={timeExpired ? colors.tertiary[200] : colors.primary[700]} style={styles.statValue}>{visitTimeLeft ?? "—"}</GeaText>
          <GeaText variant="caption12" color={colors.primary[700]} style={styles.statCaption}>{t("Sisa waktu", "Time left")}</GeaText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Cari koleksi, segera tersedia", "Collection search, coming soon")}
          accessibilityState={{ disabled: true }} disabled style={styles.searchButton} />
        <Pressable accessibilityRole="button" accessibilityLabel={t("Lencana, segera tersedia", "Badges, coming soon")}
          accessibilityState={{ disabled: true }} disabled style={styles.badgeButton}>
          <GeaText variant="label16" color={colors.primary[900]} style={styles.badgeLabel}>{t("Lencana", "Badges")}</GeaText>
        </Pressable>
      </View>
      {props.hasVisit && <View style={styles.signal}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${signal}. Periksa lokasi`}
          onPress={props.onCheckLocation} disabled={props.checkingLocation} style={styles.signalContent}>
          <GeaText variant="caption12" color={colors.primary[800]} numberOfLines={1}>{signal}</GeaText>
        </Pressable>
      </View>}
      <View style={styles.card}>
        <View style={styles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardContent}>
        {props.loading ? (
          <View style={styles.row}><ActivityIndicator color={colors.primary[800]} /><GeaText variant="body14" color={colors.primary[800]}>{t("Memuat koleksi…", "Loading collections…")}</GeaText></View>
        ) : props.error !== null ? (
          <><GeaText variant="heading20" color={colors.tertiary[300]}>{t("Koleksi belum bisa dimuat", "Could not load collections")}</GeaText><GeaText variant="body14" color={colors.primary[800]}>{props.error}</GeaText><MapButton label={t("Coba lagi", "Try again")} onPress={props.onRetry} /></>
        ) : !props.hasVisit ? (
          <StartMap checkingLocation={props.checkingLocation} onScan={props.onScan} onCheckLocation={props.onCheckLocation} notice={props.notice?.description ?? null} />
        ) : (
          <>
            {target !== null ? (
              <>
                <View style={styles.guidance}>
                  <Image accessible={false} source={directionIcon} style={styles.directionIcon} />
                  <View style={styles.guidanceText}>
                    <GeaText variant="bold16" color={colors.primary[800]} role="status" accessibilityLiveRegion="polite" style={styles.directionTitle}>{directionTitle}</GeaText>
                    <GeaText variant="body14" color={colors.primary[800]} style={styles.directionCaption}>
                      {navigationStopped ? t("Lanjutkan saat kamu siap menjelajah", "Resume when you are ready")
                        : arrived ? t(`Kamu tiba di ${targetLabel}.`, `You’ve reached ${targetLabel}.`)
                        : !hasActiveTarget ? null
                        : remainingMeters === null ? t("Menunggu posisi untuk menghitung jarak dan waktu.", "Waiting for your location to estimate distance and time.")
                        : t(`${remainingMeters} m tersisa · ±${walkingMinutes(remainingMeters)} menit`, `${remainingMeters} m left · ~${walkingMinutes(remainingMeters)} min`)}
                    </GeaText>
                  </View>
                </View>
                <View style={styles.destination}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Lihat rute. Tujuan ${targetLabel}, ${target.museum.name}`}
                    onPress={(): void => setRouteOpen(true)} style={styles.destinationText}>
                    <GeaText variant="caption12" color={colors.primary[900]} style={styles.destinationCaption}>
                      {selected !== null ? t("TUJUAN PILIHANMU", "SELECTED DESTINATION") : t("TUJUAN SELANJUTNYA", "NEXT DESTINATION")}
                    </GeaText>
                    <GeaText variant="display42" color={colors.tertiary[300]}>{targetLabel}</GeaText>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={navigationStopped ? startNavigation : stopNavigation}
                    style={({ pressed }) => [styles.stopButton, pressed && styles.dim]}>
                    <GeaText variant="bold16" color={colors.primary[800]}>{navigationStopped ? t("Mulai Navigasi", "Start Navigation") : t("Stop Navigasi", "Stop Navigation")}</GeaText>
                  </Pressable>
                </View>
                <GeaText variant="body16" color={colors.primary[800]} style={styles.invitation}>
                  {target.id === null ? t("Cerita koleksi ini segera hadir.", "This collection’s story is coming soon.") : t(`Yuk, kunjungi ${targetLabel} untuk mendengarkan cerita menariknya`, `Visit ${targetLabel} to hear its story`)}
                </GeaText>
              </>
            ) : (
              <><GeaText variant="heading20" color={colors.tertiary[300]}>{props.route !== null && props.route.codes.length > 0 ? t("Rutemu selesai!", "Route complete!") : t("Mau jelajah ke mana?", "Where would you like to explore?")}</GeaText><GeaText variant="body14" color={colors.primary[800]}>{t("Ketuk pin koleksi di peta untuk melihat tujuanmu.", "Tap a map pin to choose a destination.")}</GeaText></>
            )}
            <View style={styles.actions}>
              <NavigationAction label="Scan QR" icon={scanIcon} background={colors.secondaryGreen[100]} disabled={false} onPress={props.onScan} />
              <NavigationAction label={t("Baca cerita", "Read story")} icon={bookIcon} background={colors.primary[0]} disabled={target?.id == null}
                onPress={(): void => { if (target?.id != null) props.onOpenPoi(target.id); }} />
              <NavigationAction label={t("Akhiri\nkunjungan", "End visit")} icon={flagIcon} background={colors.primary[0]} disabled={props.onOpenSummary === undefined}
                onPress={(): void => { stopNavigation(); props.onOpenSummary?.(); }} />
            </View>
            {zone != null && selected === null && target === null && (
              <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup informasi sayap", "Dismiss wing information")} onPress={props.onDismissZone} style={styles.zone}>
                <GeaText variant="bold16" color={colors.primary[900]}>{zone.name}</GeaText>
                <GeaText variant="caption12" color={colors.primary[800]}>{zone.intro}</GeaText>
              </Pressable>
            )}
          </>
        )}
        </ScrollView>
      </View>
      <Modal visible={routeOpen} transparent animationType="slide" onRequestClose={(): void => setRouteOpen(false)}>
        <FrameStage background="rgba(31, 26, 22, 0.45)">
          <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup daftar rute", "Close route list")} style={StyleSheet.absoluteFill} onPress={(): void => setRouteOpen(false)} />
          <View style={styles.routeSheet}>
            <View style={styles.row}>
              <GeaText variant="heading24" color={colors.primary[900]} style={styles.flex}>{t("Rute petualangan", "Adventure Route")}</GeaText>
              <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup daftar rute", "Close route list")} onPress={(): void => setRouteOpen(false)} style={styles.sheetClose}>
                <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
              </Pressable>
            </View>
            <GeaText variant="body14" color={colors.primary[800]}>{routeCount} {t("koleksi", "collections")} · {props.route?.totalMinutes ?? 0} {t("menit", "min")} · {props.totalPoints} {t("poin", "pts")}</GeaText>
            <GeaText variant="body14" color={colors.primary[800]}>{t("Sisa waktu", "Time left")}: {visitTimeLeft ?? t("Belum tersedia", "Unavailable")}</GeaText>
            <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.routeLink}>
              <GeaText variant="body14" color={colors.primary[800]}>{t("Ubah rencana kunjungan ›", "Edit visit plan ›")}</GeaText>
            </Pressable>
            <ScrollView contentContainerStyle={styles.routeList}>
              {routePois.map((poi: MapPoi, index: number): ReactElement => (
                <Pressable key={poi.museum.code} accessibilityRole="button"
                  accessibilityLabel={`${index + 1}. ${poi.museum.name}. ${poi.status === "selesai" ? t("Selesai", "Completed") : t("Belum selesai", "Incomplete")}`}
                  onPress={(): void => { choosePoi(poi.museum.code); setRouteOpen(false); }}
                  style={[styles.routeStop, target?.museum.code === poi.museum.code && styles.routeStopActive]}>
                  <View style={styles.poiCode}><GeaText variant="bold16" color={colors.primary[900]}>{poi.museum.code}</GeaText></View>
                  <View style={styles.flex}>
                    <GeaText variant="bold16" color={colors.primary[900]}>{index + 1}. {poi.museum.name}</GeaText>
                    <GeaText variant="caption12" color={colors.primary[700]}>{poi.status === "selesai" ? t("✓ Selesai", "✓ Completed") : t("Belum selesai", "Incomplete")}</GeaText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            {selected !== null && <Pressable accessibilityRole="button" accessibilityLabel={t("Kembali ke rute rekomendasi", "Return to recommended route")}
              onPress={(): void => { setSelectedCode(null); setRouteOpen(false); }} style={styles.routeLink}>
              <GeaText variant="body14" color={colors.primary[800]}>{t("Ikuti rute rekomendasi ›", "Follow recommended route ›")}</GeaText>
            </Pressable>}
            {timeExpired && props.onOpenSummary !== undefined && <MapButton label={t("Lihat ringkasan", "View summary")} onPress={props.onOpenSummary} />}
            {props.gpsError !== null && <GeaText variant="caption12" color={colors.tertiary[200]}>{props.gpsError}</GeaText>}
          </View>
        </FrameStage>
      </Modal>
      <AnimatedNotification style={styles.toast}>
        {eyesFreeToast && eyesFree.enabled ? (
          <Toast tone="success" title="Mode tanpa layar aktif" description={eyesFreeNote(eyesFree.background)}
            countdown={{ id: "eyes-free", durationMs: 5000 }} onClose={(): void => setEyesFreeToast(false)} />
        ) : null}
      </AnimatedNotification>
      <AnimatedNotification style={[styles.toast, styles.expiryPosition]}>
        {!eyesFreeToast && timeExpired && !expiryDismissed ? (
          <View style={styles.expiryToast} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <View style={styles.flex}>
              <GeaText variant="bold16" color={colors.primary[900]}>{t("Waktu rencanamu selesai", "Your planned visit time is up")}</GeaText>
              <GeaText variant="body14" color={colors.primary[800]}>{t("Progresmu tetap tersimpan. Kamu bisa membuka ringkasan kunjungan.", "Your progress is saved. You can open your visit summary.")}</GeaText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup pemberitahuan waktu", "Dismiss time notice")} style={styles.sheetClose}
              onPress={(): void => setExpiryDismissed(true)}>
              <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
            </Pressable>
          </View>
        ) : null}
      </AnimatedNotification>
      <AnimatedNotification style={styles.toast}>
        {!eyesFreeToast && (!timeExpired || expiryDismissed) && showRouteToast ? (
          <Toast
            tone="success"
            title={t("Rute Untuk Anda", "Your Recommended Route")}
            description={t(`${routeCount} Titik Kunjungan`, `${routeCount} stops`)}
            countdown={{ id: "route", durationMs: 5000 }}
            onClose={(): void => props.onCloseRouteToast?.()}
          />
        ) : null}
      </AnimatedNotification>
      {testsOpen && props.hasVisit && props.gpsTests.length > 0 && (
        <View style={styles.testMenu}>
          <ScrollView>
            <View style={styles.row}>
              <GeaText variant="bold16" color={colors.primary[800]} style={styles.flex}>Mode uji</GeaText>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup mode uji GPS" onPress={(): void => setTestsOpen(false)} style={styles.sheetClose}>
                <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
              </Pressable>
            </View>
            <GeaText variant="bold16" color={colors.primary[800]} style={styles.testHeading}>Uji arah hadap</GeaText>
            {headingTests.map((test: HeadingTest): ReactElement => (
              <Pressable key={test.label} accessibilityRole="button"
                onPress={(): void => { orientation.simulate(test.degrees); setTestsOpen(false); }} style={styles.testItem}>
                <GeaText variant="body14" color={colors.primary[900]}>{test.label} · {test.degrees}°</GeaText>
              </Pressable>
            ))}
            <GeaText variant="bold16" color={colors.primary[800]} style={styles.testHeading}>Uji posisi GPS</GeaText>
            {props.gpsTests.map((test: GpsTest): ReactElement => (
            <Pressable key={test.label} accessibilityRole="button"
              onPress={(): void => { props.onGpsTest(test.fix); setTestsOpen(false); setSelectedCode(null); }} style={styles.testItem}>
              <GeaText variant="body14" color={colors.primary[900]}>{test.label}</GeaText>
            </Pressable>
          ))}</ScrollView>
        </View>
      )}
      {settingsOpen && <>
        <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup pengaturan", "Close settings")}
          style={styles.settingsBackdrop} onPress={(): void => setSettingsOpen(false)} />
        <View style={styles.settingsPanel}>
          <SettingsPanel eyesFree={{ enabled: eyesFree.enabled, select: (enabled) => {
            if (enabled === eyesFree.enabled) return;
            eyesFree.toggle();
            setEyesFreeToast(enabled);
          } }} />
        </View>
      </>}
      <View style={styles.languageControl}>
        <LanguageButton expanded={settingsOpen} onPress={(): void => setSettingsOpen(!settingsOpen)} />
      </View>
    </FrameStage>
  );
}

function NavigationAction({ label, icon, background, disabled, onPress }: {
  readonly label: string;
  readonly icon: number;
  readonly background: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
}): ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label.replace("\n", " ")}
      accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.actionButton, { backgroundColor: background }, (pressed || disabled) && styles.dim]}>
      <Image accessible={false} source={icon} style={styles.actionIcon} />
      <GeaText variant="label16" color={colors.primary[900]} style={styles.actionLabel}>{label}</GeaText>
    </Pressable>
  );
}

function eyesFreeNote(background: BackgroundResult | null): string {
  if (background === "running") return "Rekaman cerita diputar saat tiba, layar boleh dikunci";
  if (background === "denied") return "Izinkan lokasi \"Selalu\" agar jalan saat layar terkunci";
  return "Rekaman cerita diputar saat tiba selama app terbuka";
}

function MapButton({ label, onPress }: { readonly label: string; readonly onPress: () => void }): ReactElement {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.dim]}><GeaText variant="bold16" color={colors.white}>{label}</GeaText></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overview: { position: "absolute", left: 0, top: 0, width: 390, height: 182 },
  visitedStat: { position: "absolute", left: 61, top: 69, gap: 2 },
  pointsStat: { position: "absolute", left: 176, top: 69, gap: 2 },
  timeStat: { position: "absolute", left: 295, top: 69, gap: 2 },
  statValue: { lineHeight: 20 },
  statCaption: { lineHeight: 14 },
  searchButton: { position: "absolute", left: 16, top: 127, width: 44, height: 44 },
  badgeButton: { position: "absolute", left: 254, top: 127, width: 124, height: 44, justifyContent: "center", paddingLeft: 44 },
  badgeLabel: { fontSize: 14 },
  settingsBackdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 20 },
  settingsPanel: { position: "absolute", left: 72, top: 178, zIndex: 21 },
  languageControl: { position: "absolute", left: 72, top: 127, zIndex: 22 },
  signal: { position: "absolute", left: 16, top: 446, maxWidth: 300, height: 30, borderRadius: 20, paddingHorizontal: 12, backgroundColor: colors.secondaryYellow[0] },
  signalContent: { flex: 1, justifyContent: "center" },
  card: { position: "absolute", top: CARD_TOP, bottom: 0, left: 0, width: 390, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", backgroundColor: colors.secondaryYellow[0] },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginTop: 10, marginBottom: 14, backgroundColor: colors.primary[200] },
  cardContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  guidance: { minHeight: 74, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 20, backgroundColor: colors.secondaryGreen[100] },
  directionIcon: { width: 24, height: 26 },
  guidanceText: { flex: 1, gap: 4 },
  directionTitle: { fontSize: 20, lineHeight: 24 },
  directionCaption: { lineHeight: 20 },
  destination: { flexDirection: "row", alignItems: "center", gap: 12 },
  destinationText: { flex: 1, gap: 8 },
  destinationCaption: { fontSize: 10, lineHeight: 14, fontWeight: "700" },
  stopButton: { width: 164, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[100] },
  invitation: { lineHeight: 24, minHeight: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  poiCode: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  button: { alignSelf: "stretch", alignItems: "center", minHeight: 48, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary[800] },
  dim: { opacity: 0.6 },
  actions: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  actionButton: { flex: 1, minHeight: 72, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 4, boxShadow: shadows.card },
  actionIcon: { width: 24, height: 24 },
  actionLabel: { textAlign: "center", lineHeight: 16 },
  routeLink: { minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  expiryPosition: { top: 152 },
  expiryToast: { padding: 16, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.primary[600], backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  routeSheet: { position: "absolute", left: 16, bottom: 16, width: 358, maxHeight: 632, borderRadius: 24, padding: 20, gap: 12, backgroundColor: colors.white },
  sheetClose: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  routeList: { gap: 10, paddingBottom: 12 },
  routeStop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: colors.primary[100] },
  routeStopActive: { backgroundColor: colors.secondaryGreen[100], borderColor: colors.secondaryGreen[700] },
  zone: { padding: 8, borderRadius: 10, backgroundColor: colors.secondaryGreen[100] },
  testMenu: { position: "absolute", right: 16, top: 160, width: 300, maxHeight: 460, padding: 12, borderRadius: 16, backgroundColor: colors.white, boxShadow: shadows.drop, zIndex: 10 },
  testItem: { paddingHorizontal: 8, paddingVertical: 12 },
  testHeading: { paddingHorizontal: 8, paddingVertical: 10 },
  toast: { position: "absolute", left: 15, top: 47, width: 360, zIndex: 20 },
});
