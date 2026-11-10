// Progres dan lencana (UI21–UI22). Frame HP 390 × 844, gaya sama dengan layar Story hi-fi.
// SEMENTARA: hi-fi D4 belum final.
import type { ReactElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { type BadgeDef, badges, type BadgeId, quizPoints } from "../../domain/points";
import type { MapPoi } from "../map/MapScreen";
import { ScanBackground } from "../stories/hifi/backgrounds";
import { FrameStage } from "../stories/hifi/parts";
import type { PoiProgress } from "../stories/progress";

type Props = {
  readonly pois: readonly MapPoi[];
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly totalPoints: number;
  readonly earned: readonly BadgeId[];
  /** Lencana yang berlaku di versi peta ini (BD-02 hilang bila hanya sayap kiri). */
  readonly available?: readonly BadgeDef[];
  readonly onBack: () => void;
  readonly onEndVisit: () => void;
};

export function ProgressScreen({ pois, progressOf, totalPoints, earned, available = badges, onBack, onEndVisit }: Props): ReactElement {
  const active: readonly MapPoi[] = pois.filter((poi: MapPoi): boolean => poi.id !== null);
  const done: number = active.filter((poi: MapPoi): boolean => poi.status === "selesai").length;
  const ratio: number = active.length === 0 ? 0 : done / active.length;

  return (
    <FrameStage background={colors.primary[300]}>
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
          <GeaText variant="bold16" color={colors.primary[900]}>{done} dari {active.length} koleksi selesai</GeaText>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
          </View>
          <GeaText variant="caption12" color={componentColors.cardCaption}>Benar di percobaan 1/2/3 = 20/10/5 poin</GeaText>
        </View>
      </View>

      <GeaText variant="heading20" color={colors.primary[900]} style={styles.section}>Lencana</GeaText>
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
                <GeaText variant="caption12" color={has ? colors.secondaryGreen[900] : colors.primary[700]}>
                  {has ? `+${badge.bonus} poin` : "Terkunci"}
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
                accessibilityLabel={`${poi.museum.code} ${poi.museum.name}: ${quizPoints(state)} poin`}
                style={[styles.chip, finished && styles.chipDone]}
              >
                <GeaText variant="bold16" color={finished ? colors.white : colors.primary[900]}>{poi.museum.code}</GeaText>
                <GeaText variant="caption12" color={finished ? colors.white : colors.primary[700]}>
                  {finished ? `+${quizPoints(state)}` : state.closed ? "quest" : "–"}
                </GeaText>
              </View>
            );
          })}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={onEndVisit} hitSlop={8} style={styles.end}>
        <GeaText variant="caption12" color={colors.tertiary[200]} style={styles.link}>
          Akhiri kunjungan dan hapus progres di HP ini
        </GeaText>
      </Pressable>
    </FrameStage>
  );
}

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
  section: { position: "absolute", left: 20, top: 290 },
  badges: {
    position: "absolute",
    left: 16,
    top: 322,
    width: 358,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  badge: {
    ...card,
    width: 175,
    height: 72,
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
    position: "absolute",
    left: 16,
    top: 496,
    width: 358,
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
  end: { position: "absolute", left: 16, width: 358, top: 760 },
});
