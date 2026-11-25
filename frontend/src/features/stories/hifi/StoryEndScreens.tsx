// Layar akhir cerita, mengikuti frame "Selesai Story Splash" terbaru:
// Kisah Selesai → (tantangan) → Yeay! → Mini Quiz → Selamat Penjelajah!
// Maskot: SVG vektor dari Figma (node 359:3019 "Group 123325"), tajam di semua ukuran layar.
import { Image } from "expo-image";
import { type ReactElement, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, View } from "react-native";
import { Button } from "../../../design/Button";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { FrameStage, StoryButton, useFrameBleed } from "./parts";
import { useLanguage } from "../../preferences/LanguageSettings";

const mascot = require("../../../../assets/design/mascot.svg") as number;
const background = require("../../../../assets/design/finished-bg.svg") as number;
// Rasio maskot di Figma (200 × 214.85).
const MASCOT_RATIO = 214.85 / 200;

/** Latar cokelat layar akhir cerita, selebar layar. */
function FinishedBackground(): ReactElement {
  const { span } = useFrameBleed();
  return <Image accessible={false} source={background} style={[splash.bg, span]} contentFit="fill" />;
}

/** "Kisah selesai. Lanjutkan penjelajahanmu!" setelah Story Isi. */
export function StoryFinishedScreen(
  { poiName, hasActivity, actionLabel, onAction, onSkip }: {
    readonly poiName: string;
    /** false = tidak ada quest untuk profil ini (mis. anak di POI tanpa quest foto). */
    readonly hasActivity: boolean;
    /** "Lakukan Tantangan", "Lanjut ke Mini Quiz", atau "Lihat Hasil". */
    readonly actionLabel: string;
    readonly onAction: () => void;
    readonly onSkip: () => void;
  },
): ReactElement {
  const { t } = useLanguage();
  return (
    <MascotSplash
      title={t("Kisah selesai. Lanjutkan penjelajahanmu!", "Story complete. Keep exploring!")}
      description={hasActivity
        ? t(`Selamat explorer, kamu baru saja menamatkan cerita tentang ${poiName}. Ayo hidupkan ceritamu dengan tantangan!`,
          `You finished the story about ${poiName}. Bring it to life with a quest!`)
        : t(`Selamat explorer, kamu baru saja menamatkan cerita tentang ${poiName}. Yuk, lanjut ke koleksi berikutnya!`,
          `You finished the story about ${poiName}. Continue to the next collection!`)}
      actionLabel={actionLabel}
      onAction={onAction}
      onSkip={onSkip}
    />
  );
}

/** "Yeay! Kamu berhasil menyelesaikan tantangan" sebelum Mini Quiz. */
export function ChallengeDoneScreen(
  { poiName, success, onQuiz, onSkip }: {
    readonly poiName: string;
    /** false = kesempatan tantangan habis; judul disesuaikan. */
    readonly success: boolean;
    readonly onQuiz: () => void;
    readonly onSkip: () => void;
  },
): ReactElement {
  return (
    <MascotSplash
      title={success ? "Yeay! Kamu berhasil menyelesaikan tantangan" : "Tantangan selesai. Tetap semangat!"}
      description={`Sebelum mengakhiri perjalanan di ${poiName}, buktikan pengetahuanmu dulu yuk!`}
      actionLabel="Lanjut ke Mini Quiz"
      onAction={onQuiz}
      onSkip={onSkip}
    />
  );
}

/** Template splash: maskot mengintip di balik kartu putih, tombol hijau di bawah, Skip di kanan atas. */
function MascotSplash(
  { title, description, actionLabel, onAction, onSkip }: {
    readonly title: string;
    readonly description: string;
    readonly actionLabel: string;
    readonly onAction: () => void;
    readonly onSkip: () => void;
  },
): ReactElement {
  return (
    <FrameStage background={colors.primary[800]}>
      <FinishedBackground />
      <Pressable accessibilityRole="button" hitSlop={12} onPress={onSkip} style={splash.skip}>
        <GeaText variant="label16" color={colors.secondaryYellow[0]} style={splash.underline}>Skip</GeaText>
      </Pressable>
      <Image accessible={false} source={mascot} style={splash.mascot} contentFit="contain" />
      <View style={splash.card}>
        <GeaText variant="heading28" color={colors.tertiary[100]} style={splash.center}>{title}</GeaText>
        <GeaText variant="body16" color={componentColors.bodyDark} style={splash.center}>{description}</GeaText>
      </View>
      <StoryButton label={actionLabel} onPress={onAction} style={splash.button} />
    </FrameStage>
  );
}

/** "Selamat Penjelajah!": bintang dari kuis, SCORE (poin koleksi ini) dan REWARD (total poin). */
export function ExplorerResultScreen(
  { poiName, stars, conquered, score, reward, explanation, extra, allCompleted = false, onHome }: {
    readonly poiName: string;
    /** Penjelasan jawaban Mini Quiz (kolom "Penjelasan setelah Menjawab"). */
    readonly explanation?: string | undefined;
    /** 0–3: benar di percobaan 1/2/3 = 3/2/1 bintang. */
    readonly stars: number;
    /** true = kuis dijawab benar. */
    readonly conquered: boolean;
    /** Poin yang didapat di POI ini. */
    readonly score?: number;
    /** Total poin terkumpul. */
    readonly reward: number;
    /** Baris tambahan: rute berikutnya, lencana baru. */
    readonly extra?: readonly string[];
    readonly allCompleted?: boolean;
    readonly onHome: () => void;
  },
): ReactElement {
  // Lembar putih ikut memanjang (penjelasan, lencana baru); halaman digulir bila tidak muat.
  const { t } = useLanguage();
  const [sheetHeight, setSheetHeight] = useState<number>(0);
  const { bleed, span } = useFrameBleed();
  return (
    <FrameStage background={colors.primary[800]} frameHeight={Math.max(RESULT_BASE, SHEET_TOP + sheetHeight)}>
      <FinishedBackground />
      <Image accessible={false} source={mascot} style={result.mascot} contentFit="contain" />
      <View
        style={[result.sheet, span, { paddingHorizontal: spacing[16] + bleed, minHeight: RESULT_BASE - SHEET_TOP }]}
        onLayout={(event): void => setSheetHeight(event.nativeEvent.layout.height)}
      >
        <View accessibilityLabel={t(`${stars} dari 3 bintang`, `${stars} out of 3 stars`)} style={result.stars}>
          {[0, 1, 2].map((i: number): ReactElement => (
            <GeaText
              key={i}
              variant="display42"
              color={i < stars ? componentColors.resultStar : colors.greys[0]}
              style={[result.star, i < stars && result.starGlow]}
            >
              ★
            </GeaText>
          ))}
        </View>
        <GeaText variant="display42" color={colors.primary[800]} style={splash.center}>
          {t("Selamat Penjelajah!", "Well done, Explorer!")}
        </GeaText>
        <GeaText variant="body16" color={componentColors.bodyDark} style={splash.center}>
          {conquered
            ? t(`Kamu berhasil menaklukan ${poiName}. Perjalanan selanjutnya masih menunggu!`, `You conquered ${poiName}. Your next adventure awaits!`)
            : t(`Kamu sudah menjelajahi ${poiName}. Perjalanan selanjutnya masih menunggu!`, `You explored ${poiName}. Your next adventure awaits!`)}
        </GeaText>
        {explanation !== undefined && (
          <GeaText variant="body14" color={componentColors.cardCaption} style={splash.center}>{explanation}</GeaText>
        )}
        <View style={result.divider} />
        {score !== undefined ? (
          <View style={result.scores}>
            <ScoreBox label={t("SKOR", "SCORE")} value={String(score)} />
            <ScoreBox label={t("HADIAH", "REWARD")} value={String(reward)} unit={t("POIN", "POINTS")} />
          </View>
        ) : (
          <ScoreBox label={t("HADIAH", "REWARD")} value={String(reward)} unit={t("POIN", "POINTS")} />
        )}
        <StoryButton
          label={allCompleted ? t("Lihat Ringkasan Akhir", "View Visit Summary") : t("Kembali ke Halaman Utama", "Back to Map")}
          onPress={onHome}
          style={result.button}
        />
      </View>
    </FrameStage>
  );
}

function ScoreBox(
  { label, value, unit }: { readonly label: string; readonly value: string; readonly unit?: string },
): ReactElement {
  return (
    <View style={result.scoreCol}>
      <GeaText variant="label16" color={colors.primary[200]}>{label}</GeaText>
      <View style={result.box}>
        <GeaText variant="heading28" color={colors.primary[800]}>{value}</GeaText>
        {unit !== undefined && <GeaText variant="bold16" color={colors.primary[800]}>{unit}</GeaText>}
      </View>
    </View>
  );
}

/** Figma "Final" (Finish): penutup kunjungan setelah semua koleksi selesai, dengan bagikan ke Instagram. */
export function StoryFinalScreen(
  { poiName, nextStop, onHome }: {
    readonly poiName: string;
    /** Ruangan berikutnya di rute rekomendasi; null = rute selesai / tanpa preferensi. */
    readonly nextStop: string | null;
    readonly onHome: () => void;
  },
): ReactElement {
  async function share(): Promise<void> {
    const message = `Aku baru saja menamatkan cerita tentang ${poiName} di Museum Geologi Bandung bersama GEA!`;
    try {
      await Share.share({ message });
    } catch {
      // Browser tanpa Web Share API: buka Instagram saja.
      void Linking.openURL("https://www.instagram.com/");
    }
  }

  return (
    <FrameStage background={colors.primary[800]}>
      <FinishedBackground />
      <View style={splash.card}>
        <GeaText variant="heading28" color={colors.tertiary[100]} style={splash.center}>
          Kisah selesai. Lanjutkan penjelajahanmu!
        </GeaText>
        <GeaText variant="body16" color={componentColors.bodyDark} style={splash.center}>
          Selamat explorer, kamu baru saja menamatkan cerita tentang {poiName}. Bagikan petualanganmu dan lanjutkan ke koleksi berikutnya!
        </GeaText>
        {nextStop !== null && (
          <GeaText variant="label16" color={colors.secondaryGreen[900]} style={splash.center}>
            Berikutnya di rutemu: {nextStop}
          </GeaText>
        )}
      </View>
      <StoryButton label="Bagikan ke Instagram" onPress={(): void => void share()} style={splash.button} />
      <View style={splash.homeButton}>
        <Button appearance="outline" tone="primary" label="Kembali ke Halaman Utama" onPress={onHome} style={splash.stretch} />
      </View>
    </FrameStage>
  );
}

// Tinggi minimum layar hasil (frame 844) dan posisi lembar putih (frame "Selamat Penjelajah").
const RESULT_BASE = 844;
const SHEET_TOP = 362;

const splash = StyleSheet.create({
  bg: { position: "absolute", left: 0, top: 0, width: 390, height: 844 },
  skip: { position: "absolute", right: 16, top: 38, zIndex: 1 },
  underline: { textDecorationLine: "underline" },
  // Maskot mengintip di balik kartu (frame "Selesai Story Splash (2)": x 60–335, puncak tanduk y≈117).
  mascot: { position: "absolute", left: 60, top: 116, width: 272, height: 272 * MASCOT_RATIO },
  card: {
    position: "absolute",
    left: 18,
    top: 318,
    width: 354,
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.white,
  },
  center: { textAlign: "center" },
  button: { position: "absolute", left: 17, top: 692, width: 356, boxShadow: shadows.drop },
  homeButton: { position: "absolute", left: 17, top: 748, width: 356 },
  stretch: { alignSelf: "stretch" },
});

const result = StyleSheet.create({
  // Frame "Selamat Penjelajah": maskot penuh di atas (x 97–297, y 86–300).
  mascot: { position: "absolute", left: 96, top: 85, width: 200, height: 200 * MASCOT_RATIO },
  sheet: {
    position: "absolute",
    left: 0,
    top: SHEET_TOP,
    width: 390,
    alignItems: "center",
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingTop: spacing[24],
    paddingBottom: spacing[32],
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.white,
  },
  stars: { flexDirection: "row", gap: spacing[8] },
  star: { fontSize: 56, lineHeight: 60 },
  starGlow: { textShadowColor: "rgba(212, 80, 30, 0.45)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  divider: { width: 246, height: 1, backgroundColor: colors.greys[0] },
  scores: { flexDirection: "row", gap: spacing[12], alignSelf: "stretch" },
  scoreCol: { flex: 1, alignItems: "center", gap: spacing[8] },
  box: {
    alignSelf: "stretch",
    height: 52,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: spacing[8],
    paddingTop: spacing[8],
    borderRadius: radius.control,
    backgroundColor: componentColors.resultBox,
    boxShadow: shadows.drop,
  },
  button: { alignSelf: "stretch", boxShadow: shadows.drop },
});
