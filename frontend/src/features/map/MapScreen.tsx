// Peta lantai 1 (layar utama setelah onboarding). Denah dari "Survey Docs" (P01–P21).
// Frame HP 390 × 844 tanpa gulir, gaya sama dengan layar Story hi-fi (latar Scan QR, Ellak + Qanelas).
// SEMENTARA: hi-fi peta (D3, PD-1) belum ada. Geofence (E10): kartu "Kamu di dekat", banner GPS lemah,
// pilih ruang manual ("Saya di sini"), dan Mode uji GPS (hanya mode mock).
import { type ReactElement, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { MuseumPoi, Wing, ZoneInfo } from "../../data/museum";
import type { Fix } from "../../domain/geofence";
import type { PoiStatus } from "../../domain/points";
import type { Route } from "../preferences/recommend";
import { ScanBackground } from "../stories/hifi/backgrounds";
import { FrameStage, StoryButton } from "../stories/hifi/parts";

export type MapPoi = {
  readonly museum: MuseumPoi;
  /** UUID POI di database; null = belum tersedia di sumber data. */
  readonly id: string | null;
  readonly status: PoiStatus;
};

type Notice = { readonly title: string; readonly description: string };

/** Pilihan Mode uji GPS; fix null = kembali ke GPS asli. */
export type GpsTest = { readonly label: string; readonly fix: Fix | null };

type Props = {
  /** "left" = hanya Sayap Kiri (denah lebih besar), "both" = dua sayap. Lihat src/config/wings.ts. */
  readonly wingsMode: "left" | "both";
  readonly pois: readonly MapPoi[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly hasVisit: boolean;
  readonly totalPoints: number;
  readonly completedCount: number;
  readonly activeWing: Wing | null;
  readonly zoneIntro: ZoneInfo | null;
  readonly notice: Notice | null;
  readonly checkingLocation: boolean;
  readonly onDismissZone: () => void;
  /** Kartu geofence: POI yang radiusnya baru dimasuki. */
  readonly nearby: MapPoi | null;
  readonly onDismissNearby: () => void;
  /** Akurasi GPS > 20 m selama kunjungan: tawarkan scan QR. */
  readonly gpsWeak: boolean;
  readonly gpsTests: readonly GpsTest[];
  readonly onGpsTest: (fix: Fix | null) => void;
  readonly onPickWing: (wing: Wing) => void;
  readonly onScan: () => void;
  readonly onCheckLocation: () => void;
  readonly onRetry: () => void;
  readonly onOpenPoi: (id: string) => void;
  readonly onOpenProgress: () => void;
  /** Rute dari preferensi (usia, waktu, minat); null = belum ada preferensi. */
  readonly route: Route | null;
  /** Topik minat pengguna yang cocok dengan ruangan ini. */
  readonly topicsFor: (code: string) => readonly string[];
};

// Tombol Scan QR: posisi default di frame 844 dan tingginya.
const SCAN_TOP = 772;
const SCAN_HEIGHT = 48;

const statusLabel: Record<PoiStatus, string> = {
  belum: "Belum dikunjungi",
  sebagian: "Sedang dijelajahi",
  selesai: "Selesai",
};

const roomFill: Record<PoiStatus, string> = {
  belum: colors.primary[0],
  sebagian: colors.secondaryYellow[200],
  selesai: colors.secondaryGreen[600],
};

export function MapScreen(props: Props): ReactElement {
  const [selected, setSelected] = useState<string | null>(null);
  const picked: MapPoi | undefined = props.pois.find((poi: MapPoi): boolean => poi.museum.code === selected);
  const active: number = props.pois.filter((poi: MapPoi): boolean => poi.id !== null).length;
  const leftOnly: boolean = props.wingsMode === "left";
  const [testsOpen, setTestsOpen] = useState(false);
  const [testLabel, setTestLabel] = useState<string | null>(null);
  // Kartu bawah bisa panjang (mis. rute 11+ ruangan). Tombol Scan QR turun mengikuti kartu,
  // dan seluruh halaman bisa digulir bila tidak muat.
  const [cardHeight, setCardHeight] = useState<number>(0);
  const cardTop: number = leftOnly ? 580 : 600;
  const scanTop: number = Math.max(SCAN_TOP, cardTop + cardHeight + 16);
  const pageHeight: number = props.hasVisit ? scanTop + SCAN_HEIGHT + 24 : cardTop + cardHeight + 24;
  const showTests: boolean = props.hasVisit && props.gpsTests.length > 0;
  const pickWing = props.hasVisit ? props.onPickWing : null;

  return (
    <FrameStage background={colors.primary[300]} frameHeight={pageHeight}>
      <ScanBackground />

      {/* Kepala: judul + poin */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <GeaText variant="heading28" color={colors.secondaryYellow[100]}>Peta Lantai 1</GeaText>
          <GeaText variant="body14" color={colors.secondaryYellow[0]}>Museum Geologi Bandung</GeaText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lihat progres dan lencana"
          onPress={props.onOpenProgress}
          style={({ pressed }) => [styles.points, pressed && styles.pressed]}
        >
          <GeaText variant="heading24" color={colors.primary[900]}>{props.totalPoints}</GeaText>
          <GeaText variant="caption12" color={colors.primary[800]}>poin · {props.completedCount}/{active}</GeaText>
        </Pressable>
      </View>

      {/* Banner GPS lemah (PB04/PB05): tetap tampil selama akurasi buruk */}
      {props.gpsWeak && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="GPS lemah. Scan QR di dekat koleksi"
          onPress={props.onScan}
          style={[styles.weak, showTests && styles.weakShort]}
        >
          <GeaText variant="caption12" color={colors.white} numberOfLines={1}>
            GPS lemah · ketuk untuk scan QR koleksi
          </GeaText>
        </Pressable>
      )}
      {showTests && (
        <Pressable
          accessibilityRole="button"
          onPress={(): void => setTestsOpen((open: boolean): boolean => !open)}
          style={styles.testPill}
        >
          <GeaText variant="caption12" color={colors.primary[900]} numberOfLines={1}>
            {testLabel ?? "Uji GPS"} {testsOpen ? "▴" : "▾"}
          </GeaText>
        </Pressable>
      )}

      {/* Denah: versi sayap kiri saja (lebih besar) atau dua sayap */}
      <WingPlan
        top={150}
        maxHeight={leftOnly ? 280 : 152}
        stretch={leftOnly}
        title="Sayap Kiri"
        subtitle="Geologi Indonesia"
        wing="left"
        pois={props.pois}
        here={props.activeWing === "left"}
        onPickHere={pickWing}
        selected={selected}
        onSelect={setSelected}
        route={props.route?.codes ?? []}
      />
      {leftOnly
        ? (
          <View style={styles.soonWing}>
            <GeaText variant="label16" color={colors.primary[800]}>Sayap Kanan · Sejarah Kehidupan</GeaText>
            <GeaText variant="caption12" color={colors.primary[700]}>Segera hadir</GeaText>
          </View>
        )
        : (
          <WingPlan
            top={352}
            maxHeight={152}
            stretch={false}
            title="Sayap Kanan"
            subtitle="Sejarah Kehidupan"
            wing="right"
            pois={props.pois}
            here={props.activeWing === "right"}
            onPickHere={pickWing}
            selected={selected}
            onSelect={setSelected}
            route={props.route?.codes ?? []}
          />
        )}

      <View style={[styles.legend, leftOnly && { top: 552 }]}>
        <Legend color={roomFill.belum} label="Belum" />
        <Legend color={roomFill.sebagian} label="Dijelajahi" />
        <Legend color={roomFill.selesai} label="Selesai" />
        <Legend color={colors.primary[400]} label="Segera hadir" dashed />
      </View>

      {/* Kartu bawah: satu informasi saja pada satu waktu */}
      <View
        style={[styles.card, { top: cardTop }]}
        onLayout={(event): void => setCardHeight(event.nativeEvent.layout.height)}
      >
        <BottomCard {...props} picked={picked} onClosePick={(): void => setSelected(null)} onSelect={setSelected} />
      </View>

      {props.hasVisit && (
        <StoryButton label="Scan QR" onPress={props.onScan} style={[styles.scan, { top: scanTop }]} />
      )}

      {showTests && testsOpen && (
        <View style={styles.testMenu}>
          <ScrollView>
            {props.gpsTests.map((test: GpsTest): ReactElement => (
              <Pressable
                key={test.label}
                accessibilityRole="button"
                onPress={(): void => {
                  setTestsOpen(false);
                  setSelected(null);
                  setTestLabel(test.fix === null ? null : test.label);
                  props.onGpsTest(test.fix);
                }}
                style={({ pressed }) => [styles.testItem, pressed && styles.pressed]}
              >
                <GeaText variant="body14" color={colors.primary[900]}>{test.label}</GeaText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </FrameStage>
  );
}

function BottomCard(
  props: Props & {
    readonly picked: MapPoi | undefined;
    readonly onClosePick: () => void;
    readonly onSelect: (code: string) => void;
  },
): ReactElement {
  if (props.loading) {
    return (
      <View style={styles.cardRow}>
        <ActivityIndicator color={colors.primary[900]} />
        <GeaText variant="body16" color={componentColors.bodyDark}>Memuat koleksi...</GeaText>
      </View>
    );
  }
  if (props.error !== null) {
    return (
      <>
        <GeaText variant="heading20" color={colors.tertiary[100]}>Koleksi belum bisa dimuat</GeaText>
        <GeaText variant="body14" color={componentColors.bodyDark}>{props.error}</GeaText>
        <TextLink label="Coba lagi" onPress={props.onRetry} />
      </>
    );
  }
  if (!props.hasVisit) {
    return (
      <>
        <GeaText variant="heading20" color={colors.primary[900]}>Mulai kunjunganmu</GeaText>
        <GeaText variant="body14" color={componentColors.bodyDark}>
          {props.notice?.description ?? "Scan QR di pintu masuk museum. Setelah itu, scan QR di dekat koleksi untuk membuka ceritanya."}
        </GeaText>
        {props.route !== null && props.route.codes.length > 0 && (
          <GeaText variant="caption12" color={colors.secondaryGreen[900]}>
            Rute untukmu sudah siap: {props.route.codes.length} ruangan (lihat nomor di peta).
          </GeaText>
        )}
        <StoryButton label="Scan QR pintu masuk" onPress={props.onScan} style={styles.full} />
        <TextLink
          label={props.checkingLocation ? "Memeriksa lokasi..." : "Atau periksa lokasi dengan GPS"}
          onPress={props.onCheckLocation}
          center
        />
      </>
    );
  }
  if (props.picked !== undefined) {
    const poi: MapPoi = props.picked;
    const available: boolean = poi.id !== null;
    return (
      <>
        <View style={styles.cardRow}>
          <View style={[styles.codeBadge, { backgroundColor: available ? roomFill[poi.status] : colors.primary[400] }]}>
            <GeaText variant="bold16" color={poi.status === "selesai" && available ? colors.white : colors.primary[900]}>
              {poi.museum.code}
            </GeaText>
          </View>
          <View style={styles.flex}>
            <GeaText variant="heading20" color={colors.primary[900]} numberOfLines={2}>{poi.museum.name}</GeaText>
            <GeaText variant="caption12" color={colors.primary[700]}>
              {available ? statusLabel[poi.status] : "Ceritanya segera hadir"}
            </GeaText>
            {routeNote(props, poi.museum.code) !== null && (
              <GeaText variant="caption12" color={colors.secondaryGreen[900]} numberOfLines={2}>
                {routeNote(props, poi.museum.code)}
              </GeaText>
            )}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" hitSlop={12} onPress={props.onClosePick}>
            <GeaText variant="bold16" color={colors.primary[700]}>✕</GeaText>
          </Pressable>
        </View>
        {available && (
          <StoryButton
            label={poi.status === "selesai" ? "Lihat hasil" : "Buka cerita"}
            onPress={(): void => {
              if (poi.id !== null) props.onOpenPoi(poi.id);
            }}
            style={styles.full}
          />
        )}
      </>
    );
  }
  if (props.nearby !== null && props.nearby.id !== null) {
    const poi: MapPoi = props.nearby;
    return (
      <>
        <View style={styles.cardRow}>
          <View style={[styles.codeBadge, { backgroundColor: roomFill[poi.status] }]}>
            <GeaText variant="bold16" color={poi.status === "selesai" ? colors.white : colors.primary[900]}>
              {poi.museum.code}
            </GeaText>
          </View>
          <View style={styles.flex}>
            <GeaText variant="caption12" color={colors.secondaryGreen[900]}>KAMU DI DEKAT</GeaText>
            <GeaText variant="heading20" color={colors.primary[900]} numberOfLines={2}>{poi.museum.name}</GeaText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup" hitSlop={12} onPress={props.onDismissNearby}>
            <GeaText variant="bold16" color={colors.primary[700]}>✕</GeaText>
          </Pressable>
        </View>
        <StoryButton
          label={poi.status === "selesai" ? "Lihat hasil" : "Buka cerita"}
          onPress={(): void => {
            if (poi.id !== null) props.onOpenPoi(poi.id);
          }}
          style={styles.full}
        />
      </>
    );
  }
  if (props.zoneIntro !== null) {
    return (
      <>
        <GeaText variant="caption12" color={colors.secondaryGreen[900]}>KAMU MEMASUKI</GeaText>
        <GeaText variant="heading20" color={colors.primary[900]}>{props.zoneIntro.name}</GeaText>
        <GeaText variant="body14" color={componentColors.bodyDark} numberOfLines={4}>{props.zoneIntro.intro}</GeaText>
        <TextLink label="Tutup" onPress={props.onDismissZone} />
      </>
    );
  }
  if (props.route !== null && props.route.codes.length > 0) {
    const route: Route = props.route;
    const stops: readonly MapPoi[] = route.codes
      .map((code: string): MapPoi | undefined => props.pois.find((poi: MapPoi): boolean => poi.museum.code === code))
      .filter((poi: MapPoi | undefined): poi is MapPoi => poi !== undefined);
    const allDone: boolean = stops.every((poi: MapPoi): boolean => poi.status === "selesai");
    return (
      <>
        <GeaText variant="heading20" color={colors.primary[900]}>
          {allDone ? "Rutemu selesai!" : "Rute untukmu"}
        </GeaText>
        <GeaText variant="body14" color={componentColors.bodyDark} numberOfLines={2}>
          {allDone
            ? "Hebat! Masih ada waktu? Ketuk ruangan lain di peta."
            : `${stops.length} ruangan · ${route.duration}${route.topics.length > 0 ? ` · ${route.topics.join(", ")}` : ""}`}
        </GeaText>
        <View style={styles.stops}>
          {stops.map((poi: MapPoi, index: number): ReactElement => (
            <Pressable
              key={poi.museum.code}
              accessibilityRole="button"
              accessibilityLabel={`Rute ${index + 1}: ${poi.museum.name}`}
              onPress={(): void => props.onSelect(poi.museum.code)}
              style={({ pressed }) => [styles.stop, poi.status === "selesai" && styles.stopDone, pressed && styles.pressed]}
            >
              <GeaText variant="caption12" color={poi.status === "selesai" ? colors.white : colors.primary[900]}>
                {index + 1}. {poi.museum.code}{poi.status === "selesai" ? " ✓" : ""}
              </GeaText>
            </Pressable>
          ))}
        </View>
      </>
    );
  }
  return (
    <>
      <GeaText variant="heading20" color={colors.primary[900]}>Mau jelajah ke mana?</GeaText>
      <GeaText variant="body14" color={componentColors.bodyDark}>
        Ketuk ruangan di peta untuk melihat koleksinya, atau scan QR di dekat koleksi untuk langsung membuka ceritanya.
      </GeaText>
    </>
  );
}

/** "Rute untukmu #2 · cocok dengan minatmu: Gunung Api" untuk kartu ruangan. */
function routeNote(props: Props, code: string): string | null {
  const index: number = props.route?.codes.indexOf(code) ?? -1;
  const matches: readonly string[] = props.topicsFor(code);
  if (index === -1 && matches.length === 0) return null;
  const parts: string[] = [];
  if (index !== -1) parts.push(`Rute untukmu #${index + 1}`);
  if (matches.length > 0) parts.push(`cocok dengan minatmu: ${matches.join(", ")}`);
  return parts.join(" · ");
}

function TextLink(
  { label, onPress, center = false }: { readonly label: string; readonly onPress: () => void; readonly center?: boolean },
): ReactElement {
  return (
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={center ? styles.center : undefined}>
      <GeaText variant="label16" color={colors.primary[800]} style={styles.link}>{label}</GeaText>
    </Pressable>
  );
}

function Legend(
  { color, label, dashed = false }: { readonly color: string; readonly label: string; readonly dashed?: boolean },
): ReactElement {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }, dashed && styles.dashed]} />
      <GeaText variant="caption12" color={colors.primary[900]}>{label}</GeaText>
    </View>
  );
}

function WingPlan(
  { top, maxHeight, stretch, title, subtitle, wing, pois, here, onPickHere, selected, onSelect, route }: {
    readonly top: number;
    /** Tinggi maksimum denah di frame 390 × 844. */
    readonly maxHeight: number;
    /** true = ruangan boleh lebih tinggi dari proporsi denah (versi satu sayap). */
    readonly stretch: boolean;
    readonly title: string;
    readonly subtitle: string;
    readonly wing: Wing;
    readonly pois: readonly MapPoi[];
    readonly here: boolean;
    /** null = tombol "Saya di sini" disembunyikan (belum ada kunjungan). */
    readonly onPickHere: ((wing: Wing) => void) | null;
    readonly selected: string | null;
    readonly onSelect: (code: string) => void;
    /** Kode POI rute rekomendasi; nomor urut tampil di pojok ruangan. */
    readonly route: readonly string[];
  },
): ReactElement {
  const rooms: readonly MapPoi[] = pois.filter((poi: MapPoi): boolean => poi.museum.wing === wing);
  const width: number = Math.max(...rooms.map((poi: MapPoi): number => poi.museum.room.x + poi.museum.room.w));
  const height: number = Math.max(...rooms.map((poi: MapPoi): number => poi.museum.room.y + poi.museum.room.h));
  // Dua sayap: proporsi denah dijaga agar muat tanpa gulir. Satu sayap: ruangan dibuat lebih tinggi
  // supaya mudah diketuk.
  const sx: number = Math.min(1, 338 / width);
  const sy: number = stretch ? Math.min(maxHeight / height, sx * 2) : Math.min(sx, maxHeight / height);
  const scaleX: number = stretch ? sx : sy;
  return (
    <View style={[styles.wing, { top }, here && styles.wingHere]}>
      <View style={styles.wingHead}>
        <GeaText variant="heading20" color={colors.primary[900]}>{title}</GeaText>
        <GeaText variant="caption12" color={colors.primary[700]} style={styles.flex}>· {subtitle}</GeaText>
        {here
          ? (
            <View style={styles.hereChip}>
              <GeaText variant="caption12" color={colors.white}>Kamu di sini</GeaText>
            </View>
          )
          : onPickHere !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tandai saya di ${title}`}
              hitSlop={8}
              onPress={(): void => onPickHere(wing)}
              style={styles.pickChip}
            >
              <GeaText variant="caption12" color={colors.primary[800]}>Saya di sini</GeaText>
            </Pressable>
          )}
      </View>
      <View style={{ width: width * scaleX, height: height * sy, alignSelf: "center" }}>
        {rooms.map((poi: MapPoi): ReactElement => {
          const { room } = poi.museum;
          const available: boolean = poi.id !== null;
          const isSelected: boolean = selected === poi.museum.code;
          const done: boolean = available && poi.status === "selesai";
          return (
            <Pressable
              key={poi.museum.code}
              accessibilityRole="button"
              accessibilityLabel={`${poi.museum.code} ${poi.museum.name}, ${available ? statusLabel[poi.status] : "segera hadir"}`}
              onPress={(): void => onSelect(poi.museum.code)}
              style={({ pressed }) => [
                styles.room,
                {
                  left: room.x * scaleX + 1.5,
                  top: room.y * sy + 1.5,
                  width: room.w * scaleX - 3,
                  height: room.h * sy - 3,
                },
                available ? { backgroundColor: roomFill[poi.status] } : styles.soon,
                isSelected && styles.roomSelected,
                pressed && styles.pressed,
              ]}
            >
              <GeaText variant="bold16" color={done ? colors.white : available ? colors.primary[900] : colors.primary[700]}>
                {poi.museum.code}
              </GeaText>
              {done && <GeaText variant="caption12" color={colors.white}>✓</GeaText>}
              {route.includes(poi.museum.code) && (
                <View style={styles.routeBadge}>
                  <GeaText variant="caption12" color={colors.white} style={styles.routeBadgeText}>
                    {route.indexOf(poi.museum.code) + 1}
                  </GeaText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  full: { alignSelf: "stretch" },
  center: { alignSelf: "center" },
  link: { textDecorationLine: "underline" },
  pressed: { opacity: 0.75 },
  header: {
    position: "absolute",
    left: 20,
    top: 52,
    width: 350,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  points: {
    minWidth: 76,
    alignItems: "center",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.control,
    borderWidth: 3,
    borderColor: colors.secondaryGreen[300],
    backgroundColor: colors.secondaryYellow[0],
    boxShadow: shadows.drop,
  },
  wing: {
    position: "absolute",
    left: 16,
    width: 358,
    gap: spacing[8],
    paddingHorizontal: spacing[8],
    paddingTop: spacing[8],
    paddingBottom: spacing[12],
    borderRadius: radius.control,
    borderWidth: 3,
    borderColor: colors.primary[700],
    backgroundColor: colors.primary[100],
    boxShadow: shadows.drop,
  },
  wingHere: { borderColor: colors.secondaryGreen[700] },
  wingHead: { flexDirection: "row", alignItems: "center", gap: spacing[4], paddingHorizontal: spacing[4] },
  hereChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryGreen[700],
  },
  room: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.primary[800],
    borderRadius: 4,
  },
  pickChip: {
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary[700],
  },
  weak: {
    position: "absolute",
    left: 16,
    top: 114,
    width: 358,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: spacing[12],
    borderRadius: radius.pill,
    backgroundColor: colors.tertiary[200],
    zIndex: 2,
  },
  weakShort: { width: 248 },
  testPill: {
    position: "absolute",
    right: 16,
    top: 114,
    maxWidth: 104,
    height: 30,
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.primary[700],
    backgroundColor: colors.secondaryYellow[0],
    zIndex: 3,
  },
  testMenu: {
    position: "absolute",
    right: 16,
    top: 148,
    width: 220,
    maxHeight: 420,
    borderRadius: radius.control,
    borderWidth: 2,
    borderColor: colors.primary[700],
    backgroundColor: colors.secondaryYellow[0],
    boxShadow: shadows.drop,
    zIndex: 4,
  },
  testItem: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[300],
  },
  roomSelected: { borderWidth: 4, borderColor: colors.tertiary[200] },
  soon: { backgroundColor: colors.primary[400], borderStyle: "dashed", borderColor: colors.primary[600] },
  soonWing: {
    position: "absolute",
    left: 16,
    top: 498,
    width: 358,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.control,
    borderWidth: 2.5,
    borderStyle: "dashed",
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[200],
  },
  legend: {
    position: "absolute",
    left: 16,
    top: 572,
    width: 358,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[12],
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing[4] },
  legendDot: { width: 14, height: 14, borderRadius: 3, borderWidth: 2, borderColor: colors.primary[800] },
  dashed: { borderStyle: "dashed", borderColor: colors.primary[600] },
  card: {
    position: "absolute",
    left: 16,
    top: 600,
    width: 358,
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    borderRadius: radius.control,
    backgroundColor: componentColors.welcomeBackground,
    boxShadow: shadows.drop,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  codeBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    borderWidth: 2.5,
    borderColor: colors.primary[800],
    alignItems: "center",
    justifyContent: "center",
  },
  scan: { position: "absolute", left: 16, width: 358, top: 772, boxShadow: shadows.drop },
  // Nomor rute di pojok kiri atas ruangan, sedikit keluar dari kotak agar kode ruangan
  // tetap terbaca di ruangan kecil (mode dua sayap).
  routeBadge: {
    position: "absolute",
    left: -7,
    top: -7,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tertiary[200],
    zIndex: 1,
  },
  routeBadgeText: { fontSize: 10, lineHeight: 12 },
  stops: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  stop: {
    paddingHorizontal: spacing[8],
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.tertiary[200],
    backgroundColor: colors.secondaryYellow[0],
  },
  stopDone: { backgroundColor: colors.secondaryGreen[700], borderColor: colors.secondaryGreen[700] },
});
