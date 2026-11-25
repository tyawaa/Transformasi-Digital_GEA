import { Image } from "expo-image";
import { type ReactElement, useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, View } from "react-native";
import { colors, shadows } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { BadgeDef, BadgeId, BadgeProgress, BadgeProgressMap } from "../../domain/points";
import { FrameStage, useFrameBleed } from "../stories/hifi/parts";

type Props = {
  readonly earned: readonly BadgeId[];
  readonly available: readonly BadgeDef[];
  readonly progress: BadgeProgressMap;
  readonly onBack: () => void;
  readonly onEndVisit: () => void;
};

const background: number = require("../../../assets/badges/background.png") as number;
const flag: number = require("../../../assets/badges/flag.svg") as number;
const story: number = require("../../../assets/badges/story.svg") as number;
const medal: number = require("../../../assets/badges/medal.svg") as number;
const map: number = require("../../../assets/badges/map.svg") as number;
const compass: number = require("../../../assets/badges/compass.svg") as number;
const award: number = require("../../../assets/badges/award.svg") as number;
const check: number = require("../../../assets/badges/check.svg") as number;
const lock: number = require("../../../assets/badges/lock.svg") as number;
const badgeIcons: Readonly<Record<BadgeId, number>> = {
  "BD-01": map, "BD-02": compass, "BD-03": story, "BD-04": award,
  "BD-05": map, "BD-06": flag, "BD-07": story, "BD-08": map,
  "BD-09": compass, "BD-10": medal, "BD-11": flag, "BD-12": medal,
  "BD-13": award, "BD-14": compass, "BD-15": map,
};

/** Kartu memakai data kunjungan; gambar referensi hanya menyediakan ilustrasi. */
export function ProgressScreen({ earned, available, progress, onBack, onEndVisit }: Props): ReactElement {
  const [bodyHeight, setBodyHeight] = useState<number>(0);
  const { span } = useFrameBleed();
  const earnedCount: number = available.filter((badge: BadgeDef): boolean => earned.includes(badge.id)).length;
  const orderedBadges: readonly BadgeDef[] = [
    ...available.filter((badge: BadgeDef): boolean => earned.includes(badge.id)),
    ...available.filter((badge: BadgeDef): boolean => !earned.includes(badge.id)),
  ];

  useEffect((): (() => void) => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", (): boolean => {
      onBack();
      return true;
    });
    return (): void => subscription.remove();
  }, [onBack]);

  return (
    <FrameStage background={colors.primary[200]} frameHeight={76 + bodyHeight + 32}>
      <View pointerEvents="none" accessible={false} style={[styles.background, span]}>
        <Image source={background} style={styles.backgroundImage} contentFit="fill" />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke peta"
        onPress={onBack} hitSlop={8} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <GeaText variant="bold16" color={colors.secondaryYellow[0]}>‹  Peta</GeaText>
      </Pressable>
      <View style={styles.body} onLayout={(event): void => setBodyHeight(event.nativeEvent.layout.height)}>
        <View style={styles.heading}>
          <GeaText variant="display42" color={colors.secondaryGreen[0]} style={styles.title}>Daftar Lencana!</GeaText>
          <GeaText variant="body14" color={colors.secondaryYellow[0]} style={styles.intro}>
            {"Jelajahi museum dan kumpulkan\ncerita di balik setiap lencana."}
          </GeaText>
        </View>
        <View style={styles.summary}>
          <GeaText variant="bold16" color={colors.black}>{earnedCount} dari {available.length} lencana didapat</GeaText>
          <GeaText variant="caption12" color={colors.primary[900]}>
            {earnedCount === available.length && available.length > 0
              ? "Hebat! Semua lencana sudah terkumpul!"
              : earnedCount === 0 ? "Petualanganmu baru dimulai!" : "Terus jelajahi, masih ada lencana menantimu!"}
          </GeaText>
          <ProgressBar current={earnedCount} target={available.length} label="Lencana terkumpul" />
        </View>
        <View style={styles.sectionHeading}>
          <GeaText variant="heading24" color={colors.secondaryGreen[0]}>Semua Lencana</GeaText>
          <GeaText variant="caption12" color={colors.secondaryYellow[0]}>{available.length} lencana</GeaText>
        </View>
        <View style={styles.grid}>
          {orderedBadges.map((badge: BadgeDef): ReactElement => (
            <BadgeCard key={badge.id} badge={badge} earned={earned.includes(badge.id)} progress={progress[badge.id]} />
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={onEndVisit} style={({ pressed }) => [styles.finish, pressed && styles.pressed]}>
          <GeaText variant="bold16" color={colors.primary[900]}>Selesaikan kunjungan</GeaText>
        </Pressable>
      </View>
    </FrameStage>
  );
}

function BadgeCard({ badge, earned, progress }: {
  readonly badge: BadgeDef;
  readonly earned: boolean;
  readonly progress: BadgeProgress;
}): ReactElement {
  const current: number = earned ? progress.target : progress.current;
  return (
    <View style={[styles.card, earned && styles.cardEarned]}>
      {!earned && <GeaText variant="caption12" color={colors.greys[300]} style={styles.counter}>
        {progress.target > 0 ? `${current}/${progress.target}` : "–"}
      </GeaText>}
      <View style={[styles.medallion, earned && styles.medallionEarned]}>
        <Image source={badgeIcons[badge.id]} style={styles.icon} contentFit="contain"
          tintColor={earned ? colors.tertiary[300] : colors.greys[300]} accessible={false} />
      </View>
      <GeaText variant="heading20" color={earned ? colors.tertiary[300] : colors.primary[900]} style={styles.badgeName}>
        {badge.name}
      </GeaText>
      <GeaText variant="caption12" color={earned ? colors.primary[900] : colors.greys[300]} style={styles.description}>
        {badge.description}
      </GeaText>
      <View style={styles.cardFooter}>
        {!earned && <ProgressBar current={current} target={progress.target} label={badge.name} />}
        <View style={[styles.status, earned && styles.statusEarned]}>
          <Image source={earned ? check : lock} style={styles.statusIcon} contentFit="contain"
            tintColor={earned ? colors.primary[900] : colors.greys[300]} accessible={false} />
          <GeaText variant="caption12" color={earned ? colors.primary[900] : colors.greys[300]} style={styles.statusText}>
            {earned ? "Sudah didapat" : "Belum didapat"}
          </GeaText>
        </View>
      </View>
    </View>
  );
}

function ProgressBar({ current, target, label }: {
  readonly current: number;
  readonly target: number;
  readonly label: string;
}): ReactElement {
  const ratio: number = target === 0 ? 0 : Math.min(1, Math.max(0, current / target));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: target, now: current }} style={styles.bar}>
      <View style={[styles.barFill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: { position: "absolute", top: 0, left: 0, width: 390, height: 844, overflow: "hidden" },
  // Strip status bar bawaan PNG disembunyikan; status bar asli disediakan sistem operasi.
  backgroundImage: { position: "absolute", top: -44, left: 0, width: "100%", height: 888 },
  back: { position: "absolute", top: 30, left: 16, minHeight: 36, justifyContent: "center" },
  pressed: { opacity: 0.7 },
  body: { position: "absolute", top: 76, left: 16, width: 358, gap: 12 },
  heading: { gap: 6 },
  title: { fontSize: 32, lineHeight: 36 },
  intro: { lineHeight: 18 },
  summary: { backgroundColor: colors.secondaryGreen[300], borderRadius: 12, padding: 14, gap: 4 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { width: 173, minHeight: 220, borderRadius: 12, borderWidth: 1, borderColor: colors.primary[400],
    padding: 10, alignItems: "center", backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  cardEarned: { backgroundColor: colors.primary[0], borderColor: colors.primary[700] },
  counter: { position: "absolute", right: 10, top: 10, fontSize: 10, fontWeight: "700" },
  medallion: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary[100], alignItems: "center", justifyContent: "center" },
  medallionEarned: { backgroundColor: colors.secondaryGreen[300] },
  icon: { width: 36, height: 36 },
  badgeName: { textAlign: "center", lineHeight: 20, minHeight: 40, marginTop: 6 },
  description: { textAlign: "center", lineHeight: 16, marginTop: 4, minHeight: 48 },
  cardFooter: { alignSelf: "stretch", marginTop: "auto", paddingTop: 10, gap: 8 },
  bar: { height: 4, backgroundColor: colors.primary[100], borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary[700] },
  status: { borderRadius: 12, backgroundColor: colors.primary[100], flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, minHeight: 24 },
  statusEarned: { backgroundColor: colors.secondaryGreen[200] },
  statusIcon: { width: 14, height: 14 },
  statusText: { fontWeight: "700" },
  finish: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.primary[0] },
});
