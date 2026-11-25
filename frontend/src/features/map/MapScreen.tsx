import { type ReactElement, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Toast } from "../../design/Toast";
import { AnimatedNotification } from "../../design/AnimatedNotification";
import { colors, shadows } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { MuseumPoi, ZoneInfo } from "../../data/museum";
import { storyRecording } from "../../data/poiAudio";
import type { Profile } from "../../domain/contracts";
import { distanceMeters, type Fix } from "../../domain/geofence";
import type { PoiStatus } from "../../domain/points";
import type { GeofenceStatus } from "../../hooks/useGeofence";
import { useHeading } from "../../hooks/useHeading";
import { estimatePlanBearing, type HeadingAnchor } from "../../domain/heading";
import type { Route } from "../preferences/recommend";
import { formatCountdown } from "../preferences/visitTiming";
import { FrameStage } from "../stories/hifi/parts";
import { ENTRANCE, PLAN_PINS, locateOnPlan, routeLegs, walkingPath, type LocationAnchor, type PlanPin, type PlanPoint, type RouteLeg } from "./navigation";
import { PlanViewport } from "./PlanViewport";
import { StartMap } from "./StartMap";
import { SearchPanel } from "../search/SearchPanel";
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
  readonly destination: "exit" | "pois";
  readonly timeTests: readonly { readonly label: string; readonly onPress: () => void }[];
  readonly visitEnded: boolean;
  readonly recommendedCode: string | null;
  readonly visitTimeLabel: string | null;
  readonly onExtendTime: (() => void) | null;
  readonly onBack: () => void;
  readonly remainingMs: number | null;
  /** "Istirahat dulu": menjeda hitung mundur rencana kunjungan di layar ini. */
  readonly paused: boolean;
  readonly onPause: (() => void) | null;
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
  readonly onOpenBadges: () => void;
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
const speakerIcon: number = require("../../../assets/design/icon-speaker.svg") as number;

/** Pemilihan pin tidak memberi akses cerita; Buka cerita memulai verifikasi GPS. */
export function MapScreen(props: Props): ReactElement {
  const orientation = useHeading();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [testsOpen, setTestsOpen] = useState<boolean>(false);
  const [routeOpen, setRouteOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [navigationStopped, setNavigationStopped] = useState<boolean>(false);
  const [eyesFreeToast, setEyesFreeToast] = useState<boolean>(false);
  const anchors: readonly LocationAnchor[] = useMemo((): readonly LocationAnchor[] => props.pois.map((poi: MapPoi): LocationAnchor => ({
    code: poi.museum.code, latitude: poi.museum.latitude, longitude: poi.museum.longitude,
  })), [props.pois]);
  const location: PlanPoint | null = useMemo((): PlanPoint | null => locateOnPlan(props.userFix, anchors), [props.userFix, anchors]);
  const planBearing: number | null = useMemo((): number | null => estimatePlanBearing(anchors.flatMap((anchor: LocationAnchor): readonly HeadingAnchor[] => {
    const pin: PlanPin | undefined = PLAN_PINS.find((item: PlanPin): boolean => item.code === anchor.code);
    return pin === undefined ? [] : [{ ...anchor, x: pin.x, y: pin.y }];
  })), [anchors]);
  const remaining: readonly MapPoi[] = useMemo((): readonly MapPoi[] => (props.route?.codes ?? [])
    .map((code: string): MapPoi | undefined => props.pois.find((poi: MapPoi): boolean => poi.museum.code === code))
    .filter((poi: MapPoi | undefined): poi is MapPoi => poi !== undefined && poi.id !== null && poi.status !== "selesai"), [props.route, props.pois]);
  const selected: MapPoi | null = props.pois.find((poi: MapPoi): boolean => poi.museum.code === selectedCode) ?? null;
  const target: MapPoi | null = props.visitEnded || props.destination === "exit" ? null : selected ?? props.nearby ?? remaining[0] ?? null;
  const destinationCodes: readonly string[] = useMemo((): readonly string[] => {
    if (navigationStopped || props.visitEnded || props.destination === "exit") return [];
    const codes: readonly string[] = remaining.map((poi: MapPoi): string => poi.museum.code);
    return target === null || target.id === null ? codes : [target.museum.code, ...codes.filter((code: string): boolean => code !== target.museum.code)];
  }, [remaining, target, navigationStopped, props.visitEnded, props.destination]);
  const eyesFreeStop = (poi: MapPoi): EyesFreeTarget => ({
    code: poi.museum.code, name: poi.museum.name, latitude: poi.museum.latitude, longitude: poi.museum.longitude,
    radiusMeters: poi.museum.radiusMeters, recording: storyRecording(poi.museum.code, props.profile),
  });
  const eyesFreeStops: readonly EyesFreeTarget[] = useMemo((): readonly EyesFreeTarget[] => props.pois
    .filter((poi: MapPoi): boolean => poi.id !== null && (props.wingsMode === "both" || poi.museum.wing === "left"))
    .map(eyesFreeStop),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [props.pois, props.wingsMode, props.profile]);
  const eyesFreeTargets: readonly EyesFreeTarget[] = useMemo((): readonly EyesFreeTarget[] => destinationCodes.flatMap((code: string): readonly EyesFreeTarget[] => {
    const poi: MapPoi | undefined = props.pois.find((item: MapPoi): boolean => item.museum.code === code);
    return poi === undefined ? [] : [eyesFreeStop(poi)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [destinationCodes, props.pois, props.profile]);
  const eyesFree = useEyesFree({
    visitId: props.hasVisit && !props.visitEnded && props.destination === "pois" ? "visit" : null,
    stops: props.visitEnded || props.destination === "exit" ? [] : eyesFreeStops, targets: eyesFreeTargets, fix: props.userFix,
  });
  const legs: readonly RouteLeg[] = useMemo((): readonly RouteLeg[] => props.destination === "exit"
    ? location === null ? [] : [{ code: "EXIT", points: walkingPath(location, ENTRANCE) }]
    : routeLegs(location ?? ENTRANCE, destinationCodes), [location, destinationCodes, props.destination]);

  const routeCount: number = props.route?.codes.length ?? 0;
  const searchPois: readonly MuseumPoi[] = useMemo((): readonly MuseumPoi[] => props.pois
    .filter((poi: MapPoi): boolean => poi.id !== null && (props.wingsMode === "both" || poi.museum.wing === "left"))
    .map((poi: MapPoi): MuseumPoi => poi.museum), [props.pois, props.wingsMode]);
  const routePois: readonly MapPoi[] = (props.route?.codes ?? []).flatMap((code: string): readonly MapPoi[] => {
    const poi: MapPoi | undefined = props.pois.find((item: MapPoi): boolean => item.museum.code === code);
    return poi === undefined ? [] : [poi];
  });
  const availableCount: number = props.pois.filter((poi: MapPoi): boolean => poi.id !== null && (props.wingsMode === "both" || poi.museum.wing === "left")).length;
  const targetLabel: string = target === null ? "" : `POI ${Number(target.museum.code.slice(1))}`;
  const targetDistance: number | null = location !== null && props.userFix !== null && target !== null
    ? distanceMeters(props.userFix, target.museum) : null;
  const directionTitle: string = navigationStopped ? "Navigasi dihentikan"
    : target === null ? "Pilih tujuan di peta"
    : targetDistance === null ? "Ikuti jalur di peta"
    : targetDistance < 2 ? "Kamu dekat tujuan"
    : `Tujuan sekitar ${Math.round(targetDistance)} meter`;
  const timeExpired: boolean = props.remainingMs !== null && props.remainingMs === 0;
  const showRouteToast: boolean = props.routeToast === true && props.hasVisit && routeCount > 0;

  function choosePoi(code: string): void {
    if (props.visitEnded || props.destination === "exit") return;
    setSelectedCode(code);
    setNavigationStopped(false);
    if (props.nearby !== null && props.nearby.museum.code !== code) props.onDismissNearby();
  }
  useEffect((): void => {
    if (props.recommendedCode !== null && !props.visitEnded) choosePoi(props.recommendedCode);
  }, [props.recommendedCode, props.visitEnded]);

  function stopNavigation(): void {
    setNavigationStopped(true);
    if (eyesFree.enabled) eyesFree.toggle();
    setEyesFreeToast(false);
  }

  function startNavigation(): void {
    setNavigationStopped(false);
  }

  const signal: string = props.gpsStatus === "simulated" ? `Mode uji lokasi${props.gpsWeak ? " · GPS belum akurat" : ""}`
    : props.checkingLocation ? "Mencari lokasimu…"
    : props.gpsStatus === "no_permission" ? "Izinkan lokasi untuk mengikuti posisimu"
    : props.gpsError !== null ? "Lokasi belum tersedia · pindai QR bila perlu"
    : props.gpsWeak ? "GPS belum akurat · pindai QR bila perlu"
    : location !== null && props.userFix !== null ? `Akurasi GPS ± ${Math.round(props.userFix.accuracyMeters)} meter`
    : props.hasVisit && props.userFix !== null ? "Posisi di luar jangkauan denah"
    : props.hasVisit ? "Menunggu lokasi GPS…" : "Aktifkan lokasi untuk mulai menjelajah";

  return (
    <FrameStage background={colors.primary[0]}>
      <PlanViewport destination={props.destination} pois={props.pois} selectedCode={selectedCode} nextCode={target?.museum.code ?? null}
        routeCodes={props.route?.codes ?? []} legs={legs} location={location} leftOnly={props.wingsMode === "left"}
        onSelect={choosePoi} onLocate={props.onCheckLocation} orientation={orientation} planBearing={planBearing}
        onOpenTests={props.hasVisit && props.gpsTests.length > 0 ? (): void => setTestsOpen(true) : null} />
      <View style={styles.overview} pointerEvents="box-none">
        <Image accessible={false} source={overviewImage} style={StyleSheet.absoluteFill} contentFit="fill" />
        <View style={styles.visitedStat} accessibilityLabel={`${props.visitedCount} dari ${availableCount} POI dikunjungi`}>
          <GeaText variant="bold16" color={colors.primary[700]} style={styles.statValue}>{props.visitedCount}/{availableCount} POI</GeaText>
          <GeaText variant="caption12" color={colors.primary[700]} style={styles.statCaption}>Dikunjungi</GeaText>
        </View>
        <View style={styles.pointsStat} accessibilityLabel={`${props.totalPoints} poin terkumpul`}>
          <GeaText variant="bold16" color={colors.primary[700]} style={styles.statValue}>{props.totalPoints} poin</GeaText>
          <GeaText variant="caption12" color={colors.primary[700]} style={styles.statCaption}>Terkumpul</GeaText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cari koleksi, ruang, atau POI"
          onPress={(): void => setSearchOpen(true)} style={styles.searchButton} />
        <Pressable accessibilityRole="button" accessibilityLabel="Lihat koleksi lencana"
          onPress={props.onOpenBadges} style={({ pressed }) => [styles.badgeButton, pressed && styles.dim]}>
          <GeaText variant="label16" color={colors.primary[900]} style={styles.badgeLabel}>Lencana</GeaText>
        </Pressable>
      </View>
      {props.hasVisit && !props.visitEnded && <View style={styles.exploreMode}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: eyesFree.enabled }}
          accessibilityLabel="Mode tanpa layar: getar saat mendekat, rekaman cerita diputar saat tiba"
          onPress={(): void => { eyesFree.toggle(); setEyesFreeToast(!eyesFree.enabled); }}
          style={({ pressed }) => [styles.eyesFree, eyesFree.enabled && styles.eyesFreeOn, pressed && styles.dim]}>
          <Image accessible={false} source={speakerIcon} style={styles.toolIcon} tintColor={eyesFree.enabled ? colors.white : colors.primary[800]} />
        </Pressable>
      </View>}
      {props.visitTimeLabel !== null && <View style={styles.visitTime} accessibilityLiveRegion="polite">
        <GeaText variant="caption12" color={colors.primary[900]} style={styles.flex}>{props.visitTimeLabel}</GeaText>
        {props.onExtendTime !== null && <Pressable accessibilityRole="button" accessibilityLabel="Tambah waktu kunjungan"
          onPress={props.onExtendTime}><GeaText variant="body14" color={colors.primary[900]}>Tambah waktu</GeaText></Pressable>}
        {/* Lanjutkan dilakukan lewat sheet "Dijeda" (lihat VisitSheet), bukan di sini: pengunjung tidak bisa diam-diam menutupnya. */}
        {!props.paused && props.onPause !== null && (
          <Pressable accessibilityRole="button" accessibilityLabel="Istirahat dulu, jeda hitung mundur kunjungan" onPress={props.onPause}>
            <GeaText variant="body14" color={colors.primary[900]}>Istirahat dulu</GeaText>
          </Pressable>
        )}
      </View>}
      {props.hasVisit && <View style={styles.signal}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${signal}. Periksa lokasi`}
          onPress={props.onCheckLocation} disabled={props.checkingLocation} style={styles.signalContent}>
          <GeaText variant="caption12" color={colors.primary[800]} numberOfLines={1}>{signal}</GeaText>
        </Pressable>
      </View>}
      <View style={styles.card}>
      <View style={styles.cardInner}>
        <View style={styles.sheetHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardContent}>
        {props.loading ? (
          <View style={styles.row}><ActivityIndicator color={colors.primary[800]} /><GeaText variant="body14" color={colors.primary[800]}>Memuat koleksi…</GeaText></View>
        ) : props.error !== null ? (
          <><GeaText variant="heading20" color={colors.tertiary[300]}>Koleksi belum bisa dimuat</GeaText><GeaText variant="body14" color={colors.primary[800]}>{props.error}</GeaText><MapButton label="Coba lagi" onPress={props.onRetry} /></>
        ) : props.destination === "exit" ? (
          <><GeaText variant="heading28" color={colors.primary[900]}>Menuju pintu keluar</GeaText>
            <GeaText variant="body16" color={colors.primary[800]}>{location === null ? "Pintu keluar ditandai di denah. Aktifkan lokasi untuk melihat perkiraan jalur dari posisimu." : "Ikuti garis di peta menuju tanda Pintu keluar."}</GeaText>
            {props.onOpenSummary !== undefined && <MapButton label={props.visitEnded ? "Lihat ringkasan kunjungan" : "Selesaikan kunjungan"} onPress={props.onOpenSummary} />}</>
        ) : props.visitEnded ? (
          <><GeaText variant="heading28" color={colors.primary[900]}>Kunjungan sudah selesai</GeaText>
            <GeaText variant="body16" color={colors.primary[800]}>Terima kasih sudah menjelajah! Progres dan poin yang sudah tercatat tetap tersimpan.</GeaText>
            {props.onOpenSummary !== undefined && <MapButton label="Lihat ringkasan kunjungan" onPress={props.onOpenSummary} />}</>
        ) : !props.hasVisit ? (
          <StartMap checkingLocation={props.checkingLocation} onScan={props.onScan} onCheckLocation={props.onCheckLocation} notice={props.notice?.description ?? null} />
        ) : (
          <>
            {target !== null ? (
              <>
                <View style={styles.guidance} accessibilityLiveRegion="polite">
                  <Image accessible={false} source={directionIcon} style={styles.directionIcon} />
                  <View style={styles.guidanceText}>
                    <GeaText variant="bold16" color={colors.primary[800]} style={styles.directionTitle} numberOfLines={1}>{directionTitle}</GeaText>
                    <GeaText variant="body14" color={colors.primary[800]} style={styles.directionCaption} numberOfLines={1}>
                      {navigationStopped ? "Lanjutkan saat kamu siap menjelajah" : `Ikuti garis menuju ${targetLabel}`}
                    </GeaText>
                  </View>
                </View>
                <View style={styles.destination}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Lihat rute. Tujuan ${targetLabel}, ${target.museum.name}`}
                    onPress={(): void => setRouteOpen(true)} style={styles.destinationText}>
                    <GeaText variant="caption12" color={colors.primary[900]} style={styles.destinationCaption}>
                      {selected !== null ? "TUJUAN PILIHANMU" : "TUJUAN SELANJUTNYA"}
                    </GeaText>
                    <GeaText variant="display42" color={colors.tertiary[300]}>{targetLabel}</GeaText>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={navigationStopped ? startNavigation : stopNavigation}
                    style={({ pressed }) => [styles.stopButton, pressed && styles.dim]}>
                    <GeaText variant="bold16" color={colors.primary[800]}>{navigationStopped ? "Mulai Navigasi" : "Stop Navigasi"}</GeaText>
                  </Pressable>
                </View>
                <GeaText variant="body16" color={colors.primary[800]} style={styles.invitation}>
                  {target.id === null ? "Cerita koleksi ini segera hadir." : `Yuk, kunjungi ${targetLabel} untuk mendengarkan cerita menariknya`}
                </GeaText>
              </>
            ) : (
              <><GeaText variant="heading20" color={colors.tertiary[300]}>{props.route !== null && props.route.codes.length > 0 ? "Rutemu selesai!" : "Mau jelajah ke mana?"}</GeaText><GeaText variant="body14" color={colors.primary[800]}>Ketuk pin koleksi di peta untuk melihat tujuanmu.</GeaText></>
            )}
            <View style={styles.actions}>
              <NavigationAction label="Scan QR" icon={scanIcon} background={colors.secondaryGreen[100]} disabled={false} onPress={props.onScan} />
              <NavigationAction label="Baca cerita" icon={bookIcon} background={colors.primary[0]} disabled={target?.id == null}
                onPress={(): void => { if (target?.id != null) props.onOpenPoi(target.id); }} />
              <NavigationAction label={"Akhiri\nkunjungan"} icon={flagIcon} background={colors.primary[0]} disabled={props.onOpenSummary === undefined}
                onPress={(): void => { props.onOpenSummary?.(); }} />
            </View>
            {props.zoneIntro !== null && selected === null && target === null && (
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup informasi sayap" onPress={props.onDismissZone} style={styles.zone}>
                <GeaText variant="caption12" color={colors.primary[800]}>{props.zoneIntro.name} · ketuk untuk tutup</GeaText>
              </Pressable>
            )}
          </>
        )}
        </ScrollView>
      </View>
      </View>
      <Modal visible={routeOpen} transparent animationType="slide" onRequestClose={(): void => setRouteOpen(false)}>
        <FrameStage background="rgba(31, 26, 22, 0.45)">
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup daftar rute" style={StyleSheet.absoluteFill} onPress={(): void => setRouteOpen(false)} />
          <View style={styles.routeSheet}>
            <View style={styles.row}>
              <GeaText variant="heading24" color={colors.primary[900]} style={styles.flex}>Rute petualangan</GeaText>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup daftar rute" onPress={(): void => setRouteOpen(false)} style={styles.sheetClose}>
                <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
              </Pressable>
            </View>
            <GeaText variant="body14" color={colors.primary[800]}>{routeCount} koleksi · {props.route?.totalMinutes ?? 0} menit · {props.totalPoints} poin</GeaText>
            <GeaText variant="body14" color={colors.primary[800]}>Sisa waktu: {props.remainingMs === null ? "Belum tersedia" : formatCountdown(props.remainingMs)}</GeaText>
            <Pressable accessibilityRole="button" onPress={props.onBack} style={styles.routeLink}>
              <GeaText variant="body14" color={colors.primary[800]}>Ubah rencana kunjungan ›</GeaText>
            </Pressable>
            <ScrollView contentContainerStyle={styles.routeList}>
              {routePois.map((poi: MapPoi, index: number): ReactElement => (
                <Pressable key={poi.museum.code} accessibilityRole="button"
                  accessibilityLabel={`${index + 1}. ${poi.museum.name}. ${poi.status === "selesai" ? "Selesai" : "Belum selesai"}`}
                  onPress={(): void => { choosePoi(poi.museum.code); setRouteOpen(false); }}
                  style={[styles.routeStop, target?.museum.code === poi.museum.code && styles.routeStopActive]}>
                  <View style={styles.poiCode}><GeaText variant="bold16" color={colors.primary[900]}>{poi.museum.code}</GeaText></View>
                  <View style={styles.flex}>
                    <GeaText variant="bold16" color={colors.primary[900]}>{index + 1}. {poi.museum.name}</GeaText>
                    <GeaText variant="caption12" color={colors.primary[700]}>{poi.status === "selesai" ? "✓ Selesai" : "Belum selesai"}</GeaText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            {selected !== null && <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke rute rekomendasi"
              onPress={(): void => { setSelectedCode(null); setRouteOpen(false); }} style={styles.routeLink}>
              <GeaText variant="body14" color={colors.primary[800]}>Ikuti rute rekomendasi ›</GeaText>
            </Pressable>}
            {timeExpired && props.onOpenSummary !== undefined && <MapButton label="Lihat ringkasan" onPress={props.onOpenSummary} />}
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
      <AnimatedNotification style={styles.toast}>
        {!eyesFreeToast && !timeExpired && showRouteToast ? (
          <Toast
            tone="success"
            title="Rute Untuk Anda"
            description={`${routeCount} Titik Kunjungan`}
            countdown={{ id: "route", durationMs: 5000 }}
            onClose={(): void => props.onCloseRouteToast?.()}
          />
        ) : null}
      </AnimatedNotification>
      <Modal visible={searchOpen} animationType="slide" onRequestClose={(): void => setSearchOpen(false)}>
        <SearchPanel pois={searchPois} onClose={(): void => setSearchOpen(false)}
          onPick={(code: string): void => { choosePoi(code); setSearchOpen(false); }} />
      </Modal>
      {testsOpen && props.hasVisit && props.gpsTests.length > 0 && (
        <View style={styles.testMenu}>
          <ScrollView>
            <View style={styles.row}>
              <GeaText variant="bold16" color={colors.primary[800]} style={styles.flex}>Mode uji</GeaText>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup mode uji GPS" onPress={(): void => setTestsOpen(false)} style={styles.sheetClose}>
                <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
              </Pressable>
            </View>
            {props.timeTests.length > 0 && <GeaText variant="bold16" color={colors.primary[800]} style={styles.testHeading}>Uji waktu kunjungan</GeaText>}
            {props.timeTests.map((test): ReactElement => <Pressable key={test.label} accessibilityRole="button"
              onPress={(): void => { test.onPress(); setTestsOpen(false); }} style={styles.testItem}>
              <GeaText variant="body14" color={colors.primary[900]}>{test.label}</GeaText>
            </Pressable>)}
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
  visitTime: { position: "absolute", left: 14, right: 14, top: 178, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.secondaryYellow[0], borderWidth: 1, borderColor: colors.primary[300] },
  flex: { flex: 1 },
  overview: { position: "absolute", left: 0, top: 0, width: 390, height: 182 },
  visitedStat: { position: "absolute", left: 64, top: 69, gap: 2 },
  pointsStat: { position: "absolute", left: 250, top: 69, gap: 2 },
  statValue: { lineHeight: 20 },
  statCaption: { lineHeight: 14 },
  searchButton: { position: "absolute", left: 16, top: 127, width: 44, height: 44 },
  badgeButton: { position: "absolute", left: 254, top: 127, width: 124, height: 44, justifyContent: "center", paddingLeft: 44 },
  badgeLabel: { fontSize: 14 },
  exploreMode: { position: "absolute", left: 72, top: 127 },
  toolIcon: { width: 22, height: 22 },
  eyesFree: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary[900], alignItems: "center", justifyContent: "center", backgroundColor: colors.secondaryYellow[0] },
  eyesFreeOn: { backgroundColor: colors.primary[800] },
  signal: { position: "absolute", left: 16, top: 446, maxWidth: 300, height: 30, borderRadius: 20, paddingHorizontal: 12, backgroundColor: colors.secondaryYellow[0] },
  signalContent: { flex: 1, justifyContent: "center" },
  // overflow:hidden (sudut membulat) juga memotong boxShadow, jadi bayangan dipisah ke pembungkus luar.
  card: { position: "absolute", top: CARD_TOP, bottom: 0, left: 0, width: 390, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0px -4px 16px 0px rgba(0, 0, 0, 0.18)" },
  cardInner: { flex: 1, overflow: "hidden", borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.secondaryYellow[0] },
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
