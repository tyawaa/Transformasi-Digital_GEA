// Petualangan selesai (semua koleksi tuntas), Figma Hifi Sprint 3:
// "Selesai Story Splash" 436:2028 (Well Done + reward) → "Petualangan selesai — Bagikan hasil" 476:3066.
// Poin = total resmi (mode API: Supabase, ditambah poin tantangan yang belum dinilai server).
import { Image } from "expo-image";
import { type ReactElement, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, View } from "react-native";
import { colors, componentColors, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { ScanBackground } from "./backgrounds";
import { FrameStage, StoryButton } from "./parts";

const mascot = require("../../../../assets/design/mascot.svg") as number;
const ellipse = require("../../../../assets/design/welldone-ellipse.svg") as number;
const rays = require("../../../../assets/design/welldone-rays.svg") as number;
const glow = require("../../../../assets/design/welldone-glow.png") as number;
const ribbonTail = require("../../../../assets/design/ribbon-right.svg") as number;
const tick = require("../../../../assets/design/icon-tick-circle.svg") as number;
const medal = require("../../../../assets/design/icon-medal-star.svg") as number;
const MASCOT_RATIO = 214.85 / 200;

export type AdventureSummary = {
  readonly poisDone: number;
  readonly poisTotal: number;
  readonly questsDone: number;
  readonly questsTotal: number;
  readonly totalPoints: number;
  /** Lencana terbaik yang diraih; null = belum ada lencana. */
  readonly badgeName: string | null;
};

/** Pita merah "Well done!" dengan ekor di kiri dan kanan. */
function WellDoneRibbon({ top }: { readonly top: number }): ReactElement {
  return (
    <View style={[ribbon.root, { top }]} accessibilityRole="header" accessibilityLabel="Well done!">
      <Image accessible={false} source={ribbonTail} style={[ribbon.tail, ribbon.right]} contentFit="fill" />
      <Image accessible={false} source={ribbonTail} style={[ribbon.tail, ribbon.left]} contentFit="fill" />
      <View style={ribbon.box}>
        <GeaText variant="display42" color={colors.white} style={ribbon.text}>Well done!</GeaText>
      </View>
    </View>
  );
}

function formatPoints(points: number): string {
  return points.toLocaleString("id-ID");
}

/** Layar "Well Done!": reward poin, cara tukar, bagikan, kembali. */
export function WellDoneScreen(
  { summary, onShare, onHome }: {
    readonly summary: AdventureSummary;
    readonly onShare: () => void;
    readonly onHome: () => void;
  },
): ReactElement {
  const [howTo, setHowTo] = useState<boolean>(false);
  return (
    <FrameStage background={colors.primary[200]}>
      <Image accessible={false} source={ellipse} style={done.ellipse} />
      <Image accessible={false} source={rays} style={done.rays} contentFit="fill" />
      <Image accessible={false} source={glow} style={done.glow} contentFit="fill" />
      <WellDoneRibbon top={92} />
      <Image accessible={false} source={mascot} style={done.mascot} contentFit="contain" />
      <View style={done.card}>
        <GeaText variant="bold16" color={colors.primary[200]}>REWARD</GeaText>
        <View style={done.pointBox} accessibilityLabel={`${summary.totalPoints} poin`}>
          <GeaText variant="bold16" color={colors.primary[800]}>
            <GeaText variant="bold16" color={colors.primary[800]} style={done.pointNumber}>
              {formatPoints(summary.totalPoints)}{" "}
            </GeaText>
            POINTS
          </GeaText>
        </View>
        <GeaText variant="body14" color={colors.black} style={done.howText}>
          Tukarkan Reward dengan merchandise Museum Geologi Bandung.{" "}
          <GeaText
            variant="bold16"
            color={colors.black}
            style={done.howLink}
            accessibilityRole="link"
            onPress={(): void => setHowTo((open: boolean): boolean => !open)}
          >
            Lihat tatacara penukaran Reward
          </GeaText>
        </GeaText>
        {howTo && (
          <GeaText variant="body14" color={componentColors.bodyDark} style={done.howText} accessibilityLiveRegion="polite">
            Tunjukkan layar ini ke petugas Museum Geologi Bandung untuk menanyakan penukaran reward.
          </GeaText>
        )}
        <View style={done.buttons}>
          <StoryButton label="Bagikan Hasil Penjelajahan" onPress={onShare} style={done.stretch} />
          <Pressable
            accessibilityRole="button"
            onPress={onHome}
            style={({ pressed }) => [done.secondary, pressed && done.pressed]}
          >
            <GeaText variant="button16" color={colors.primary[800]}>Kembali ke Halaman Utama</GeaText>
          </Pressable>
        </View>
      </View>
    </FrameStage>
  );
}

/** Kartu hasil untuk dibagikan (tangkap layar / Share). */
export function ShareResultScreen(
  { summary, onBack }: { readonly summary: AdventureSummary; readonly onBack: () => void },
): ReactElement {
  const percent: number = summary.poisTotal === 0 ? 0 : Math.round((summary.poisDone / summary.poisTotal) * 100);
  const badge: string = summary.badgeName ?? "Penjelajah Bumi";

  async function share(): Promise<void> {
    const message = [
      "Aku adalah Penjelajah Bumi! 🌏",
      `${summary.poisDone}/${summary.poisTotal} petualangan · ${summary.questsDone}/${summary.questsTotal} misi · ${formatPoints(summary.totalPoints)} poin`,
      `Reward terbuka: Lencana ${badge}`,
      "#JelajahMuseumGeologi",
    ].join("\n");
    try {
      await Share.share({ message });
    } catch {
      // Browser tanpa Web Share API: buka Instagram saja.
      void Linking.openURL("https://www.instagram.com/");
    }
  }

  return (
    <FrameStage background={colors.primary[300]}>
      <ScanBackground />
      <WellDoneRibbon top={113} />
      <View style={share_.card}>
        <GeaText variant="bold16" color={colors.primary[900]} style={share_.museum}>MUSEUM GEOLOGI BANDUNG</GeaText>
        <Image accessible={false} source={mascot} style={share_.mascot} contentFit="contain" />
        <GeaText variant="bold16" color={colors.primary[900]} style={share_.iam}>AKU ADALAH</GeaText>
        <GeaText variant="heading28" color={colors.primary[900]} style={share_.headline}>Penjelajah Bumi!</GeaText>
        <View style={share_.status}>
          <Image accessible={false} source={tick} style={share_.tick} />
          <GeaText variant="bold16" color={colors.secondaryYellow[0]} style={share_.statusText}>
            {percent}% PETUALANGAN TUNTAS
          </GeaText>
        </View>
        <View style={share_.stats}>
          <Stat value={`${summary.poisDone}/${summary.poisTotal}`} label="Petualangan" />
          <View style={share_.divider} />
          <Stat value={`${summary.questsDone}/${summary.questsTotal}`} label="Misi selesai" />
          <View style={share_.divider} />
          <Stat value={formatPoints(summary.totalPoints)} label="Total poin" />
        </View>
        <View style={share_.reward}>
          <Image accessible={false} source={medal} style={share_.medal} />
          <View style={share_.rewardText}>
            <GeaText variant="bold16" color={colors.white} style={share_.rewardLabel}>REWARD TERBUKA</GeaText>
            <GeaText variant="bold16" color={colors.white}>Lencana {badge}</GeaText>
          </View>
        </View>
        <GeaText variant="caption12" color={colors.primary[900]} style={share_.tag}>#JelajahMuseumGeologi</GeaText>
      </View>
      <StoryButton label="Bagikan" onPress={(): void => void share()} style={share_.button} />
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onBack} style={share_.back}>
        <GeaText variant="label16" color={colors.primary[900]} style={share_.underline}>Kembali</GeaText>
      </Pressable>
    </FrameStage>
  );
}

function Stat({ value, label }: { readonly value: string; readonly label: string }): ReactElement {
  return (
    <View style={share_.stat}>
      <GeaText variant="bold16" color={colors.primary[900]} style={share_.statValue}>{value}</GeaText>
      <GeaText variant="caption12" color={colors.primary[900]}>{label}</GeaText>
    </View>
  );
}

const ribbon = StyleSheet.create({
  root: { position: "absolute", left: 10.5, width: 369, height: 67 },
  tail: { position: "absolute", top: 11, width: 60.7, height: 59 },
  right: { left: 302 },
  left: { left: 4.3, transform: [{ scaleX: -1 }] },
  box: {
    position: "absolute",
    left: 55,
    right: 55,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[12],
    borderRadius: 4,
    backgroundColor: colors.tertiary[200],
  },
  text: { fontSize: 36, lineHeight: 43, textTransform: "uppercase" },
});

const done = StyleSheet.create({
  ellipse: { position: "absolute", left: -291, top: -67, width: 974, height: 974 },
  rays: { position: "absolute", left: -174, top: -189, width: 680.557, height: 1235.5 },
  glow: { position: "absolute", left: -375, top: -233, width: 1140, height: 1130, opacity: 0.5 },
  mascot: { position: "absolute", left: 95, top: 195, width: 200, height: 200 * MASCOT_RATIO },
  card: {
    position: "absolute",
    left: 10.5,
    top: 446,
    width: 369,
    alignItems: "center",
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  pointBox: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: 8,
    backgroundColor: "#EADED3",
    boxShadow: "inset 0px 4px 12px 0px rgba(0, 0, 0, 0.16)",
  },
  pointNumber: { fontSize: 28 },
  howText: { textAlign: "center", lineHeight: 21 },
  howLink: { fontSize: 14, textDecorationLine: "underline" },
  buttons: { alignSelf: "stretch", gap: spacing[12] },
  stretch: { alignSelf: "stretch", boxShadow: shadows.drop },
  secondary: {
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary[800],
    boxShadow: shadows.drop,
  },
  pressed: { opacity: 0.7 },
});

const share_ = StyleSheet.create({
  card: {
    position: "absolute",
    left: 20,
    top: 229,
    width: 350,
    height: 437.5,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.secondaryYellow[0],
  },
  museum: { position: "absolute", left: 20, top: 20, width: 310, textAlign: "center", fontSize: 12, lineHeight: 16 },
  mascot: { position: "absolute", left: 22, top: 53, width: 100, height: 100 * MASCOT_RATIO },
  iam: { position: "absolute", left: 138, top: 58, width: 192, fontSize: 11, lineHeight: 16 },
  headline: { position: "absolute", left: 138, top: 80, width: 192, lineHeight: 34 },
  status: {
    position: "absolute",
    left: 20,
    top: 180,
    width: 310,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
    borderRadius: 6,
    backgroundColor: colors.primary[900],
  },
  tick: { width: 20, height: 20 },
  statusText: { fontSize: 12, lineHeight: 16 },
  stats: { position: "absolute", left: 20, top: 242, width: 310, flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: spacing[4] },
  statValue: { fontSize: 28, lineHeight: 34 },
  divider: { width: 1, height: 44, backgroundColor: colors.primary[200] },
  reward: {
    position: "absolute",
    left: 20,
    top: 324,
    width: 310,
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#CC4B18",
  },
  medal: { width: 36, height: 36 },
  rewardText: { flex: 1, gap: spacing[4] },
  rewardLabel: { fontSize: 11, lineHeight: 16 },
  tag: { position: "absolute", left: 20, top: 407, width: 310, textAlign: "center", fontSize: 11 },
  button: { position: "absolute", left: 20, top: 690, width: 350, boxShadow: shadows.drop },
  back: { position: "absolute", left: 20, top: 750, width: 350, alignItems: "center", paddingVertical: spacing[8] },
  underline: { textDecorationLine: "underline" },
});

