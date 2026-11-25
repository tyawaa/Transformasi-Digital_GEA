// Progres dan lencana (UI21–UI22). Frame HP 390 × 844, gaya sama dengan layar Story hi-fi.
// SEMENTARA: hi-fi D4 belum final.
import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { type BadgeDef, badges, type BadgeId, activityPoints } from "../../domain/points";
import type { MapPoi } from "../map/MapScreen";
import { ScanBackground } from "../stories/hifi/backgrounds";
import { FrameStage } from "../stories/hifi/parts";
import type { PoiProgress } from "../stories/progress";

type Props = {
  readonly pois: readonly MapPoi[];
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly totalPoints: number;
  readonly earned: readonly BadgeId[];
  /** Lencana yang berlaku untuk pengunjung ini (sheet Badge_Poin; lihat availableBadges). */
  readonly available?: readonly BadgeDef[];
  readonly durationText?: string;
  readonly onBack: () => void;
  readonly onEndVisit: () => void;
};

export function ProgressScreen({ pois, progressOf, totalPoints, earned, available = badges, durationText, onBack, onEndVisit }: Props): ReactElement {
  const active: readonly MapPoi[] = pois.filter((poi: MapPoi): boolean => poi.id !== null);
  const done: number = active.filter((poi: MapPoi): boolean => poi.status === "selesai").length;
  const ratio: number = active.length === 0 ? 0 : done / active.length;
  // Lencana bisa banyak (sheet Badge_Poin): isi mengalir ke bawah dan halaman bisa digulir.
  const [bodyHeight, setBodyHeight] = useState<number>(0);

  return (
    <FrameStage background={colors.primary[300]} frameHeight={BODY_TOP + bodyHeight + 32}>
      <ScanBackground />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kembali ke peta"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <GeaText variant="bold16" color={colors.primary[900]}>‹</GeaText>
        <GeaText variant="label16" color={colors.primary[900]}>Peta</GeaText>
      </Pressable>
      <GeaText variant="heading28" color={colors.secondaryYellow[100]} style={styles.title}>Progres Jelajah</GeaText>

      <View style={styles.summary}>
        <View style={styles.pointBox}>
          <GeaText variant="display42" color={colors.primary[900]}>{totalPoints}</GeaText>
          <GeaText variant="label16" color={colors.primary[700]}>poin</GeaText>
        </View>
        <View style={styles.flex}>
          <GeaText variant="bold16" color={colors.primary[900]}>
            {done} dari {active.length} koleksi selesai{durationText != null ? ` · ${durationText}` : ""}
          </GeaText>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
          </View>
          <GeaText variant="caption12" color={componentColors.cardCaption}>Check-in 10 · cerita 5 · kuis 20/10/5 · POI tuntas 10 · lencana</GeaText>
        </View>
      </View>

      <View style={styles.body} onLayout={(event): void => setBodyHeight(event.nativeEvent.layout.height)}>
      <GeaText variant="heading20" color={colors.primary[900]}>Lencana</GeaText>
      <View style={styles.badges}>
        {available.map((badge: BadgeDef): ReactElement => {
          const has: boolean = earned.includes(badge.id);
          return (
            <View key={badge.id} style={[styles.badge, has && styles.badgeOn]}>
              <View style={[styles.medal, has && styles.medalOn]}>
                <GeaText variant="heading20" color={has ? colors.secondaryYellow[0] : colors.primary[300]}>★</GeaText>
              </View>
              <View style={styles.flex}>
                <GeaText variant="bold16" color={colors.primary[900]} numberOfLines={2}>{badge.name}</GeaText>
                <GeaText variant="caption12" color={componentColors.cardCaption} numberOfLines={3}>
                  {badge.description}
                </GeaText>
                <GeaText variant="caption12" color={has ? colors.secondaryGreen[900] : colors.primary[700]}>
                  {has ? `+${badge.bonus} poin` : `Terkunci · +${badge.bonus} poin`}
                </GeaText>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.list}>
        <GeaText variant="heading20" color={colors.primary[900]}>Koleksi</GeaText>
        <View style={styles.grid}>
          {active.map((poi: MapPoi): ReactElement => {
            const state: PoiProgress = progressOf(poi.id ?? "");
            const finished: boolean = state.completed || state.failed;
            return (
              <View
                key={poi.museum.code}
                accessibilityLabel={`${poi.museum.code} ${poi.museum.name}: ${poiPoints(state)} poin`}
                style={[styles.chip, finished && styles.chipDone]}
              >
                <GeaText variant="bold16" color={finished ? colors.white : colors.primary[900]}>{poi.museum.code}</GeaText>
                <GeaText variant="caption12" color={finished ? colors.white : colors.primary[700]}>
                  {finished ? `+${poiPoints(state)}` : state.closed ? "quest" : "–"}
                </GeaText>
              </View>
            );
          })}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={onEndVisit} hitSlop={8}>
        <GeaText variant="caption12" color={colors.tertiary[200]} style={styles.link}>
          Selesaikan kunjungan
        </GeaText>
      </Pressable>
      </View>
    </FrameStage>
  );
}

/** Poin satu POI: Mini Quiz (dari server/mode mock) + tantangan. */
function poiPoints(state: PoiProgress): number {
  return state.pointsAwarded + (state.challengePoints ?? 0) + activityPoints(state);
}

// Bagian lencana, koleksi, dan tautan akhir mengalir mulai y=290.
const BODY_TOP = 290;

const card = {
  borderRadius: radius.control,
  backgroundColor: componentColors.welcomeBackground,
  boxShadow: shadows.drop,
} as const;

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing[4] },
  pressed: { opacity: 0.7 },
  link: { textDecorationLine: "underline", textAlign: "center" },
  back: {
    position: "absolute",
    left: 16,
    top: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryYellow[0],
    boxShadow: shadows.drop,
  },
  title: { position: "absolute", left: 16, top: 96, width: 358 },
  summary: {
    ...card,
    position: "absolute",
    left: 16,
    top: 160,
    width: 358,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    padding: spacing[16],
    borderWidth: 3,
    borderColor: colors.secondaryGreen[300],
  },
  pointBox: { alignItems: "center", minWidth: 86 },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.primary[100], overflow: "hidden" },
  barFill: { height: 12, borderRadius: 6, backgroundColor: colors.secondaryGreen[600] },
  body: { position: "absolute", left: 16, top: BODY_TOP, width: 358, gap: spacing[12] },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  badge: {
    ...card,
    width: 175,
    minHeight: 72,
    paddingVertical: spacing[8],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[8],
    borderWidth: 2.5,
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[0],
  },
  badgeOn: { borderColor: colors.secondaryGreen[700], backgroundColor: colors.secondaryGreen[0] },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[100],
  },
  medalOn: { borderColor: colors.secondaryGreen[800], backgroundColor: colors.secondaryGreen[600] },
  list: {
    ...card,
    gap: spacing[12],
    padding: spacing[16],
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  chip: {
    width: 58,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.control,
    borderWidth: 2.5,
    borderColor: colors.primary[800],
    backgroundColor: colors.primary[0],
  },
  chipDone: { backgroundColor: colors.secondaryGreen[600], borderColor: colors.secondaryGreen[800] },
});
