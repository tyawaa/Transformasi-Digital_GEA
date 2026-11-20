import { type ReactElement, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { MuseumPoi, ZoneInfo } from "../../data/museum";
import type { Fix } from "../../domain/geofence";
import type { PoiStatus } from "../../domain/points";
import type { GeofenceStatus } from "../../hooks/useGeofence";
import { useHeading } from "../../hooks/useHeading";
import { estimatePlanBearing, type HeadingAnchor } from "../../domain/heading";
import type { Route } from "../preferences/recommend";
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
  readonly topicsFor: (code: string) => readonly string[];
};

const CARD_TOP: number = 584;

/** Pemilihan pin tidak memberi akses cerita; Buka cerita memulai verifikasi GPS. */
export function MapScreen(props: Props): ReactElement {
  const orientation = useHeading();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [testsOpen, setTestsOpen] = useState<boolean>(false);
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

  return (
    <FrameStage background={colors.primary[0]}>
      <PlanViewport pois={props.pois} selectedCode={selectedCode} nextCode={target?.museum.code ?? null}
        routeCodes={props.route?.codes ?? []} legs={legs} location={location} leftOnly={props.wingsMode === "left"}
        onSelect={choosePoi} onLocate={props.onCheckLocation} orientation={orientation} planBearing={planBearing} />
      <View style={styles.header}>
        <View style={styles.flex}>
          <GeaText variant="heading24" color={colors.primary[900]}>Peta petualangan</GeaText>
          <GeaText variant="caption12" color={colors.primary[800]}>Lantai 1 · Museum Geologi</GeaText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Lihat progres dan lencana" onPress={props.onOpenProgress} style={styles.points}>
          <GeaText variant="bold16" color={colors.primary[900]}>{props.totalPoints} poin</GeaText>
          <GeaText variant="caption12" color={colors.primary[800]}>{props.completedCount}/{props.pois.filter((poi: MapPoi): boolean => poi.id !== null).length} POI</GeaText>
        </Pressable>
      </View>
      <View style={styles.signal}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${signal}. Periksa lokasi`}
          onPress={props.onCheckLocation} disabled={props.checkingLocation} style={styles.signalContent}>
          <View style={[styles.signalDot, (props.gpsWeak || props.gpsError !== null || props.gpsStatus === "no_permission") && styles.signalWeak]} />
          <GeaText variant="caption12" color={colors.primary[800]} style={styles.flex} numberOfLines={1}>{signal}</GeaText>
        </Pressable>
        {props.hasVisit && props.gpsTests.length > 0 && (
          <Pressable accessibilityRole="button" accessibilityLabel="Buka mode uji GPS"
            onPress={(): void => setTestsOpen(!testsOpen)} style={styles.testPill}>
            <GeaText variant="caption12" color={colors.primary[800]}>Uji GPS {testsOpen ? "▴" : "▾"}</GeaText>
          </Pressable>
        )}
      </View>
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
                <View style={styles.row}>
                  <View style={styles.poiCode}>
                    <GeaText variant="bold16" color={colors.primary[800]}>{target.museum.code}</GeaText>
                  </View>
                  <View style={styles.flex}>
                    <GeaText variant="caption12" color={colors.primary[700]} style={styles.targetCaption}>
                      {selected !== null ? "Koleksi pilihanmu" : props.nearby !== null ? "Kamu di dekat" : "Tujuan berikutnya"}
                    </GeaText>
                    <GeaText variant="bold16" color={colors.primary[900]} numberOfLines={2} style={styles.poiTitle}>{target.museum.name}</GeaText>
                  </View>
                  {selected !== null && <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke rute rekomendasi" onPress={(): void => setSelectedCode(null)} hitSlop={8} style={styles.closeButton}><GeaText variant="body16" color={colors.primary[800]}>×</GeaText></Pressable>}
                </View>
                {props.topicsFor(target.museum.code).length > 0 && <GeaText variant="caption12" color={colors.secondaryGreen[900]} numberOfLines={1}>{props.topicsFor(target.museum.code).join(" · ")}</GeaText>}
                {target.id === null && <GeaText variant="body14" color={colors.primary[800]}>Cerita koleksi ini segera hadir.</GeaText>}
              </>
            ) : (
              <><GeaText variant="heading20" color={colors.tertiary[300]}>{props.route !== null && props.route.codes.length > 0 ? "Rutemu selesai!" : "Mau jelajah ke mana?"}</GeaText><GeaText variant="body14" color={colors.primary[800]}>Ketuk pin koleksi di peta, lalu tekan Buka cerita untuk memeriksa lokasimu.</GeaText></>
            )}
            {remaining.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stopScroll} contentContainerStyle={styles.stops}>
              {remaining.map((poi: MapPoi): ReactElement => {
                const order: number = (props.route?.codes.indexOf(poi.museum.code) ?? -1) + 1;
                return (
                  <Pressable key={poi.museum.code} accessibilityRole="button"
                    accessibilityLabel={`Rekomendasi ${order}, ${poi.museum.code}, ${poi.museum.name}`}
                    onPress={(): void => choosePoi(poi.museum.code)}
                    style={[styles.stop, target?.museum.code === poi.museum.code && styles.stopActive]}>
                    <GeaText variant="caption12" color={colors.primary[900]}>{order}. {poi.museum.code}</GeaText>
                  </Pressable>
                );
              })}
            </ScrollView>}
            <View style={styles.actions}>
              {target !== null && target.id !== null && (
                <View style={styles.flex}>
                  <MapButton label="Buka cerita" onPress={(): void => { if (target.id !== null) props.onOpenPoi(target.id); }} />
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
            <GeaText variant="caption12" color={colors.primary[700]}>
              {target?.id != null ? "Lokasi diperiksa saat membuka cerita. QR jika diperlukan." : "Pilih pin koleksi untuk melihat ceritanya."}
            </GeaText>
            {props.gpsError !== null && <GeaText variant="caption12" color={colors.tertiary[200]} accessibilityRole="alert">{props.gpsError}</GeaText>}
            {orientation.state.message !== null && orientation.state.status !== "requesting" && (
              <GeaText variant="caption12" color={colors.tertiary[200]} accessibilityRole="alert">{orientation.state.message}</GeaText>
            )}
            {props.zoneIntro !== null && selected === null && target === null && (
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup informasi sayap" onPress={props.onDismissZone} style={styles.zone}>
                <GeaText variant="caption12" color={colors.primary[800]}>{props.zoneIntro.name} · ketuk untuk tutup</GeaText>
              </Pressable>
            )}
          </>
        )}
        </ScrollView>
      </View>
      {testsOpen && props.hasVisit && props.gpsTests.length > 0 && (
        <View style={styles.testMenu}>
          <ScrollView>
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
  header: { position: "absolute", left: 20, right: 20, top: 28, height: 56, flexDirection: "row", alignItems: "center", gap: 12 },
  points: { minWidth: 76, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", backgroundColor: colors.white },
  signal: { position: "absolute", left: 16, right: 16, top: 104, height: 34, borderRadius: 12, paddingHorizontal: 10, backgroundColor: colors.primary[100], flexDirection: "row", alignItems: "center", gap: 8 },
  signalContent: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34 },
  signalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondaryGreen[700] },
  signalWeak: { backgroundColor: colors.tertiary[100] },
  card: { position: "absolute", top: CARD_TOP, bottom: 16, left: 16, width: 358, borderRadius: 22, overflow: "hidden", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary[100] },
  cardContent: { padding: spacing[16], gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  targetCaption: { marginBottom: 4 },
  poiCode: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  poiTitle: { fontSize: 17, lineHeight: 22 },
  closeButton: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.primary[0] },
  button: { alignSelf: "stretch", alignItems: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primary[800] },
  dim: { opacity: 0.6 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  qrButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200], backgroundColor: colors.primary[0] },
  stopScroll: { flexGrow: 0, flexShrink: 0, height: 34 },
  stops: { gap: 8, paddingVertical: 2 },
  stop: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.primary[100] },
  stopActive: { backgroundColor: colors.secondaryGreen[100], borderColor: colors.secondaryGreen[700] },
  zone: { padding: 8, borderRadius: 10, backgroundColor: colors.secondaryGreen[100] },
  testPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.primary[0] },
  testMenu: { position: "absolute", right: 16, top: 144, width: 230, maxHeight: 300, padding: 8, borderRadius: 16, backgroundColor: colors.white, boxShadow: shadows.drop, zIndex: 10 },
  testItem: { paddingHorizontal: 8, paddingVertical: 12 },
  testHeading: { paddingHorizontal: 8, paddingVertical: 10 },
});
