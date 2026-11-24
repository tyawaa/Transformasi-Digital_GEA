import { type ReactElement, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Toast } from "../../design/Toast";
import { AnimatedNotification } from "../../design/AnimatedNotification";
import { colors, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { MuseumPoi, ZoneInfo } from "../../data/museum";
import type { Fix } from "../../domain/geofence";
import type { PoiStatus } from "../../domain/points";
import type { GeofenceStatus } from "../../hooks/useGeofence";
import { useHeading } from "../../hooks/useHeading";
import { estimatePlanBearing, type HeadingAnchor } from "../../domain/heading";
import type { Route } from "../preferences/recommend";
import { formatCountdown } from "../preferences/visitTiming";
import { FrameStage } from "../stories/hifi/parts";
import { ENTRANCE, PLAN_PINS, locateOnPlan, routeLegs, type LocationAnchor, type PlanPin, type PlanPoint, type RouteLeg } from "./navigation";
import { PlanViewport } from "./PlanViewport";
import { StartMap } from "./StartMap";

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
  readonly completedCount: number;
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
  readonly onOpenProgress: () => void;
  readonly onOpenSummary?: () => void;
  /** Membuka alur verifikasi geofence POI sebelum mengakses cerita. */
  readonly onOpenPoi: (id: string) => void;
  readonly userFix: Fix | null;
  readonly route: Route | null;
};

const CARD_TOP: number = 600;

/** Pemilihan pin tidak memberi akses cerita; Buka cerita memulai verifikasi GPS. */
export function MapScreen(props: Props): ReactElement {
  const orientation = useHeading();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [testsOpen, setTestsOpen] = useState<boolean>(false);
  const [routeOpen, setRouteOpen] = useState<boolean>(false);
  const [expiryDismissed, setExpiryDismissed] = useState<boolean>(false);
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
  const target: MapPoi | null = selected ?? props.nearby ?? remaining[0] ?? null;
  const destinationCodes: readonly string[] = useMemo((): readonly string[] => {
    const codes: readonly string[] = remaining.map((poi: MapPoi): string => poi.museum.code);
    return target === null || target.id === null ? codes : [target.museum.code, ...codes.filter((code: string): boolean => code !== target.museum.code)];
  }, [remaining, target]);
  const legs: readonly RouteLeg[] = useMemo((): readonly RouteLeg[] => routeLegs(location ?? ENTRANCE, destinationCodes), [location, destinationCodes]);

  const routeCount: number = props.route?.codes.length ?? 0;
  const routePois: readonly MapPoi[] = (props.route?.codes ?? []).flatMap((code: string): readonly MapPoi[] => {
    const poi: MapPoi | undefined = props.pois.find((item: MapPoi): boolean => item.museum.code === code);
    return poi === undefined ? [] : [poi];
  });
  const routeCompleted: number = routePois.filter((poi: MapPoi): boolean => poi.status === "selesai").length;
  const timeExpired: boolean = props.remainingMs !== null && props.remainingMs === 0;
  const showRouteToast: boolean = props.routeToast === true && props.hasVisit && routeCount > 0;

  function choosePoi(code: string): void {
    setSelectedCode(code);
    if (props.nearby !== null && props.nearby.museum.code !== code) props.onDismissNearby();
  }

  const signal: string = props.gpsStatus === "simulated" ? `Mode uji lokasi${props.gpsWeak ? " · GPS belum akurat" : ""}`
    : props.checkingLocation ? "Mencari lokasimu…"
    : props.gpsStatus === "no_permission" ? "Izinkan lokasi untuk mengikuti posisimu"
    : props.gpsError !== null ? "Lokasi belum tersedia · pindai QR bila perlu"
    : props.gpsWeak ? "GPS belum akurat · pindai QR bila perlu"
    : location !== null && props.userFix !== null ? `Perkiraan lokasi · akurasi ±${Math.round(props.userFix.accuracyMeters)} m`
    : props.hasVisit && props.userFix !== null ? "Posisi di luar jangkauan denah"
    : props.hasVisit ? "Menunggu lokasi GPS…" : "Aktifkan lokasi untuk mulai menjelajah";
  const locationNeedsAttention: boolean = props.hasVisit && (
    props.checkingLocation || props.gpsStatus === "no_permission" || props.gpsError !== null || props.gpsWeak
  );

  return (
    <FrameStage background={colors.primary[0]}>
      <PlanViewport pois={props.pois} selectedCode={selectedCode} nextCode={target?.museum.code ?? null}
        routeCodes={props.route?.codes ?? []} legs={legs} location={location} leftOnly={props.wingsMode === "left"}
        onSelect={choosePoi} onLocate={props.onCheckLocation} orientation={orientation} planBearing={planBearing}
        onOpenTests={props.hasVisit && props.gpsTests.length > 0 ? (): void => setTestsOpen(true) : null} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke personalisasi"
          onPress={props.onBack} hitSlop={8} style={({ pressed }) => [styles.backButton, pressed && styles.dim]}>
          <GeaText variant="heading28" color={colors.primary[900]}>‹</GeaText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${routeCount > 0 ? `${routeCompleted} dari ${routeCount} koleksi rute selesai` : "Rute belum tersedia"}. ${props.totalPoints} poin. Lihat progres dan lencana`}
          onPress={props.onOpenProgress} style={styles.statPill}>
          <GeaText variant="bold16" color={colors.primary[900]}>{routeCount > 0 ? `${routeCompleted}/${routeCount}` : "—"}</GeaText>
          <GeaText variant="caption12" color={colors.primary[800]}>koleksi · {props.totalPoints} poin</GeaText>
        </Pressable>
        <View style={[styles.statPill, timeExpired && styles.timeExpired]}>
          <GeaText variant="caption12" color={colors.primary[800]}>Sisa waktu</GeaText>
          <GeaText variant="bold16" color={timeExpired ? colors.tertiary[200] : colors.primary[900]}>
            {props.remainingMs === null ? props.hasVisit ? "Menunggu rencana" : "Belum dimulai" : formatCountdown(props.remainingMs)}
          </GeaText>
        </View>
      </View>
      {locationNeedsAttention && <View style={styles.signal}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${signal}. Periksa lokasi`}
          onPress={props.onCheckLocation} disabled={props.checkingLocation} style={styles.signalContent}>
          <GeaText variant="caption12" color={colors.primary[800]} style={styles.flex} numberOfLines={1}>{signal}</GeaText>
          <GeaText variant="caption12" color={colors.primary[800]}>Periksa ›</GeaText>
        </Pressable>
      </View>}
      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cardContent}>
        {props.loading ? (
          <View style={styles.row}><ActivityIndicator color={colors.primary[800]} /><GeaText variant="body14" color={colors.primary[800]}>Memuat koleksi…</GeaText></View>
        ) : props.error !== null ? (
          <><GeaText variant="heading20" color={colors.tertiary[300]}>Koleksi belum bisa dimuat</GeaText><GeaText variant="body14" color={colors.primary[800]}>{props.error}</GeaText><MapButton label="Coba lagi" onPress={props.onRetry} /></>
        ) : !props.hasVisit ? (
          <StartMap checkingLocation={props.checkingLocation} onScan={props.onScan} onCheckLocation={props.onCheckLocation} notice={props.notice?.description ?? null} />
        ) : (
          <>
            {target !== null ? (
              <>
                <View style={styles.cardHeading}>
                  <GeaText variant="caption12" color={colors.primary[700]} style={styles.flex}>
                    {selected !== null ? "Tujuan pilihanmu" : "Tujuan berikutnya"} · {target.museum.code}
                  </GeaText>
                  {routeCount > 0 && <Pressable accessibilityRole="button" accessibilityLabel={`Lihat rute ${routeCount} koleksi`}
                    accessibilityState={{ expanded: routeOpen }} onPress={(): void => setRouteOpen(true)} style={styles.routeLink}>
                    <GeaText variant="body14" color={colors.primary[800]}>Lihat rute ›</GeaText>
                  </Pressable>}
                </View>
                <GeaText variant="bold16" color={colors.primary[900]} numberOfLines={2} style={styles.poiTitle}>{target.museum.name}</GeaText>
                {target.id === null && <GeaText variant="body14" color={colors.primary[800]}>Cerita koleksi ini segera hadir.</GeaText>}
              </>
            ) : (
              <><GeaText variant="heading20" color={colors.tertiary[300]}>{props.route !== null && props.route.codes.length > 0 ? "Rutemu selesai!" : "Mau jelajah ke mana?"}</GeaText><GeaText variant="body14" color={colors.primary[800]}>Ketuk pin koleksi di peta untuk melihat tujuanmu.</GeaText></>
            )}
            {target?.id != null && <GeaText variant="body14" color={colors.primary[800]}>Mulai saat kamu di dekat koleksi.</GeaText>}
            <View style={styles.actions}>
              {target !== null && target.id !== null && (
                <View style={styles.flex}>
                  <MapButton label="Mulai cerita" onPress={(): void => { if (target.id !== null) props.onOpenPoi(target.id); }} />
                </View>
              )}
              {target === null && props.completedCount > 0 && props.onOpenSummary !== undefined && (
                <View style={styles.flex}>
                  <MapButton label="Lihat Ringkasan Akhir" onPress={props.onOpenSummary} />
                </View>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel="Lokasi belum sesuai? Pindai QR"
                onPress={props.onScan} style={styles.qrButton}>
                <GeaText variant="body14" color={colors.primary[800]}>Pindai QR</GeaText>
              </Pressable>
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
      <AnimatedNotification style={[styles.toast, styles.expiryPosition]}>
        {timeExpired && !expiryDismissed ? (
          <View style={styles.expiryToast} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <View style={styles.flex}>
              <GeaText variant="bold16" color={colors.primary[900]}>Waktu rencanamu selesai</GeaText>
              <GeaText variant="body14" color={colors.primary[800]}>Progresmu tetap tersimpan. Kamu bisa membuka ringkasan kunjungan.</GeaText>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup pemberitahuan waktu" style={styles.sheetClose}
              onPress={(): void => setExpiryDismissed(true)}>
              <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
            </Pressable>
          </View>
        ) : null}
      </AnimatedNotification>
      <AnimatedNotification style={styles.toast}>
        {(!timeExpired || expiryDismissed) && showRouteToast ? (
          <Toast
            tone="success"
            title="Rute Untuk Anda"
            description={`${routeCount} Titik Kunjungan`}
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
    </FrameStage>
  );
}

function MapButton({ label, onPress }: { readonly label: string; readonly onPress: () => void }): ReactElement {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.dim]}><GeaText variant="bold16" color={colors.white}>{label}</GeaText></Pressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { position: "absolute", left: 16, right: 16, top: 32, height: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  statPill: { flex: 1, minHeight: 52, justifyContent: "center", alignItems: "center", paddingHorizontal: 10, borderRadius: 26, backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  timeExpired: { backgroundColor: colors.warning[100], borderColor: colors.tertiary[100] },
  signal: { position: "absolute", left: 16, right: 16, top: 100, minHeight: 44, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  signalContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  card: { position: "absolute", top: CARD_TOP, bottom: 24, left: 16, width: 358, borderRadius: 20, overflow: "hidden", backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  cardContent: { padding: spacing[16], gap: 8 },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 44 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  poiCode: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  poiTitle: { fontSize: 20, lineHeight: 26 },
  button: { alignSelf: "stretch", alignItems: "center", minHeight: 48, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.primary[800] },
  dim: { opacity: 0.6 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  qrButton: { minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200] },
  routeLink: { minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  expiryPosition: { top: 100 },
  expiryToast: { padding: 16, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.primary[600], backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  routeSheet: { position: "absolute", left: 16, bottom: 16, width: 358, maxHeight: 632, borderRadius: 24, padding: 20, gap: 12, backgroundColor: colors.white },
  sheetClose: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  routeList: { gap: 10, paddingBottom: 12 },
  routeStop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: colors.primary[100] },
  routeStopActive: { backgroundColor: colors.secondaryGreen[100], borderColor: colors.secondaryGreen[700] },
  zone: { padding: 8, borderRadius: 10, backgroundColor: colors.secondaryGreen[100] },
  testMenu: { position: "absolute", right: 16, top: 112, width: 300, maxHeight: 460, padding: 12, borderRadius: 16, backgroundColor: colors.white, boxShadow: shadows.drop, zIndex: 10 },
  testItem: { paddingHorizontal: 8, paddingVertical: 12 },
  testHeading: { paddingHorizontal: 8, paddingVertical: 10 },
  toast: { position: "absolute", left: 15, top: 47, width: 360, zIndex: 20 },
});
