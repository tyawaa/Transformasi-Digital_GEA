// Petualangan selesai (Hifi Sprint 3): Well Done → kartu hasil untuk dibagikan.
import { Image } from "expo-image";
import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";
import { type ReactElement, useRef, useState } from "react";
import { Linking, Platform, Pressable, Share, StyleSheet, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { colors, componentColors, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { ScanBackground } from "./backgrounds";
import { formatVisitDuration } from "../../../domain/points";
import { FrameStage, StoryButton } from "./parts";
import { useLanguage } from "../../preferences/LanguageSettings";
import type { Language } from "../../../domain/contracts";
import { localizeCopy, localizedDuration } from "../../../data/localizedCopy";

export { formatVisitDuration };

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
  /** null = belum ada lencana. */
  readonly badgeName: string | null;
  /** Durasi kunjungan dalam teks (mis. "45 menit" atau "1 jam 15 menit"). */
  readonly durationText: string;
  readonly durationMinutes?: number;
};

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

function formatPoints(points: number, language: Language): string {
  return points.toLocaleString(language === "en" ? "en-GB" : "id-ID");
}

export function WellDoneScreen(
  { summary, onShare, onHome }: {
    readonly summary: AdventureSummary;
    readonly onShare: () => void;
    readonly onHome: () => void;
  },
): ReactElement {
  const { language, t } = useLanguage();
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
        <View style={done.pointBox} accessibilityLabel={t(`${summary.totalPoints} poin`, `${summary.totalPoints} points`)}>
          <GeaText variant="bold16" color={colors.primary[800]}>
            <GeaText variant="bold16" color={colors.primary[800]} style={done.pointNumber}>
              {formatPoints(summary.totalPoints, language)}{" "}
            </GeaText>
            POINTS
          </GeaText>
        </View>
        <View style={done.statsRow}>
          <View style={done.statItem}>
            <GeaText variant="bold16" color={colors.primary[900]}>{summary.poisDone}/{summary.poisTotal}</GeaText>
            <GeaText variant="caption12" color={colors.primary[700]}>{t("Koleksi", "Collections")}</GeaText>
          </View>
          <View style={done.statDivider} />
          <View style={done.statItem}>
            <GeaText variant="bold16" color={colors.primary[900]}>{localizedDuration(summary.durationText, language)}</GeaText>
            <GeaText variant="caption12" color={colors.primary[700]}>{t("Durasi", "Duration")}</GeaText>
          </View>
          <View style={done.statDivider} />
          <View style={done.statItem}>
            <GeaText variant="bold16" color={colors.primary[900]}>{summary.questsDone}/{summary.questsTotal}</GeaText>
            <GeaText variant="caption12" color={colors.primary[700]}>{t("Misi", "Quests")}</GeaText>
          </View>
        </View>
        <GeaText variant="body14" color={colors.black} style={done.howText}>
          {t("Tukarkan Reward dengan merchandise Museum Geologi Bandung.", "Redeem your reward for Museum Geologi Bandung merchandise.")}{" "}
          <GeaText
            variant="bold16"
            color={colors.black}
            style={done.howLink}
            accessibilityRole="link"
            onPress={(): void => setHowTo((open: boolean): boolean => !open)}
          >
            {t("Lihat tatacara penukaran Reward", "See how to redeem your reward")}
          </GeaText>
        </GeaText>
        {howTo && (
          <GeaText variant="body14" color={componentColors.bodyDark} style={done.howText} accessibilityLiveRegion="polite">
            {t("Tunjukkan layar ini ke petugas Museum Geologi Bandung untuk menanyakan penukaran reward.", "Show this screen to museum staff to ask about redeeming your reward.")}
          </GeaText>
        )}
        <View style={done.buttons}>
          <StoryButton label={t("Bagikan Hasil Penjelajahan", "Share Your Adventure")} onPress={onShare} style={done.stretch} />
          <Pressable
            accessibilityRole="button"
            onPress={onHome}
            style={({ pressed }) => [done.secondary, pressed && done.pressed]}
          >
            <GeaText variant="button16" color={colors.primary[800]}>{t("Kembali ke Halaman Utama", "Back to Home")}</GeaText>
          </Pressable>
        </View>
      </View>
    </FrameStage>
  );
}

async function renderSummaryCardToBlob(summary: AdventureSummary, language: Language): Promise<{ blob: Blob; dataUrl: string }> {
  const t = (id: string, en: string): string => language === "en" ? en : id;
  if (typeof document === "undefined") {
    throw new Error("DOM document tidak tersedia");
  }

  // Muat gambar maskot dari bundled asset untuk digambar ke kanvas
  let mascotImg: HTMLImageElement | null = null;
  try {
    const asset = Asset.fromModule(mascot);
    await asset.downloadAsync();
    const url = asset.localUri ?? asset.uri;
    if (url) {
      mascotImg = await new Promise<HTMLImageElement>((res, rej) => {
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = (): void => res(img);
        img.onerror = (): void => rej(new Error("Gagal memuat maskot"));
        img.src = url;
      });
    }
  } catch {
    // Lanjut tanpa maskot jika gagal dimuat
  }

  const canvas = document.createElement("canvas");
  const scale = 2;
  const w = 350 * scale;
  const h = 438 * scale;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context tidak tersedia");

  // Background rounded rect
  const r = 16 * scale;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(w - r, 0);
  ctx.quadraticCurveTo(w, 0, w, r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(r, h);
  ctx.quadraticCurveTo(0, h, 0, h - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = "#FEEBB5";
  ctx.fill();

  // Gambar maskot di kiri atas kartu (sesuai posisi React component)
  if (mascotImg) {
    ctx.drawImage(mascotImg, 22 * scale, 53 * scale, 100 * scale, Math.round(100 * MASCOT_RATIO) * scale);
  }

  ctx.fillStyle = "#0F3224";
  ctx.font = `bold ${12 * scale}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("MUSEUM GEOLOGI BANDUNG", w / 2, 32 * scale);

  ctx.font = `bold ${11 * scale}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(t("AKU ADALAH", "I AM AN"), 138 * scale, 68 * scale);
  ctx.font = `bold ${24 * scale}px sans-serif`;
  ctx.fillText(t("Penjelajah Bumi!", "Earth Explorer!"), 138 * scale, 98 * scale);

  // Pill status
  const pillY = 175 * scale;
  const pillH = 36 * scale;
  ctx.fillStyle = "#0F3224";
  ctx.beginPath();
  if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
    ctx.roundRect(20 * scale, pillY, 310 * scale, pillH, 6 * scale);
  } else {
    ctx.rect(20 * scale, pillY, 310 * scale, pillH);
  }
  ctx.fill();

  const percent = summary.poisTotal === 0 ? 0 : Math.round((summary.poisDone / summary.poisTotal) * 100);
  ctx.fillStyle = "#FEEBB5";
  ctx.font = `bold ${13 * scale}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(t(`✓  ${percent}% PETUALANGAN TUNTAS`, `✓  ${percent}% ADVENTURE COMPLETE`), w / 2, pillY + 23 * scale);

  // Stats row
  const statsY = 250 * scale;
  const colW = (310 * scale) / 4;
  const stats = [
    { val: `${summary.poisDone}/${summary.poisTotal}`, lbl: t("Koleksi", "Collections") },
    { val: localizedDuration(summary.durationText, language), lbl: t("Durasi", "Duration") },
    { val: `${summary.questsDone}/${summary.questsTotal}`, lbl: t("Misi", "Quests") },
    { val: formatPoints(summary.totalPoints, language), lbl: t("Poin", "Points") },
  ];

  stats.forEach((item, idx) => {
    const cx = 20 * scale + colW * idx + colW / 2;
    ctx.fillStyle = "#0F3224";
    ctx.font = `bold ${17 * scale}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(item.val, cx, statsY);
    ctx.font = `${10 * scale}px sans-serif`;
    ctx.fillText(item.lbl, cx, statsY + 18 * scale);

    if (idx < 3) {
      const divX = 20 * scale + colW * (idx + 1);
      ctx.strokeStyle = "#C9D4C9";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(divX, statsY - 14 * scale);
      ctx.lineTo(divX, statsY + 18 * scale);
      ctx.stroke();
    }
  });

  // Reward box
  const rewY = 320 * scale;
  const rewH = 64 * scale;
  ctx.fillStyle = "#CC4B18";
  ctx.beginPath();
  if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
    ctx.roundRect(20 * scale, rewY, 310 * scale, rewH, 8 * scale);
  } else {
    ctx.rect(20 * scale, rewY, 310 * scale, rewH);
  }
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${10 * scale}px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(t("★  REWARD TERBUKA", "★  REWARD UNLOCKED"), 38 * scale, rewY + 24 * scale);
  ctx.font = `bold ${14 * scale}px sans-serif`;
  ctx.fillText(t(`Lencana ${summary.badgeName ?? "Penjelajah Bumi"}`, `Badge: ${localizeCopy(summary.badgeName ?? "Penjelajah Bumi", language)}`), 38 * scale, rewY + 46 * scale);

  ctx.fillStyle = "#0F3224";
  ctx.font = `${11 * scale}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("#JelajahMuseumGeologi", w / 2, 415 * scale);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob: Blob | null): void => {
      if (blob === null) return reject(new Error("Gagal membuat gambar PNG"));
      resolve({ blob, dataUrl: canvas.toDataURL("image/png") });
    }, "image/png");
  });
}

export function ShareResultScreen(
  { summary, onBack }: { readonly summary: AdventureSummary; readonly onBack: () => void },
): ReactElement {
  const { language, t } = useLanguage();
  const percent: number = summary.poisTotal === 0 ? 0 : Math.round((summary.poisDone / summary.poisTotal) * 100);
  const badge: string = localizeCopy(summary.badgeName ?? "Penjelajah Bumi", language);
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  async function share(): Promise<void> {
    setSharing(true);
    setShareStatus(null);
    const duration: string = localizedDuration(summary.durationText, language);
    const message = [
      t("Aku adalah Penjelajah Bumi! 🌏", "I am an Earth Explorer! 🌏"),
      t(`${summary.poisDone}/${summary.poisTotal} koleksi · ${summary.questsDone}/${summary.questsTotal} misi · durasi ${duration} · ${formatPoints(summary.totalPoints, language)} poin`, `${summary.poisDone}/${summary.poisTotal} collections · ${summary.questsDone}/${summary.questsTotal} quests · duration ${duration} · ${formatPoints(summary.totalPoints, language)} points`),
      t(`Reward terbuka: Lencana ${badge}`, `Reward unlocked: Badge ${badge}`),
      "#JelajahMuseumGeologi",
    ].join("\n");

    try {
      if (Platform.OS === "web") {
        const { blob } = await renderSummaryCardToBlob(summary, language);
        const fileName = "GEA-Hasil-Penjelajahan.png";

        // Deteksi iframe: di dalam iframe navigator.share/canShare bisa return true
        // padahal file sharing diblokir browser — paksa download saja.
        const isInIframe = typeof window !== "undefined" && window.parent !== window;
        const file = new File([blob], fileName, { type: "image/png" });

        const canWebShare =
          !isInIframe &&
          typeof navigator !== "undefined" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] });

        if (canWebShare) {
          try {
            await navigator.share({
              title: t("Hasil Penjelajahan Museum Geologi", "My Museum Geologi Adventure"),
              text: message,
              files: [file],
            });
            setShareStatus(t("✓ Berhasil dibagikan!", "✓ Shared successfully!"));
            return;
          } catch {
            // Fallthrough ke download jika share gagal
          }
        }

        // Force download via object URL (lebih reliable daripada dataUrl di iframe)
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(objectUrl);
        }, 1500);

        setShareStatus(t("✓ Gambar tersimpan!", "✓ Image saved!"));
        return;
      }

      if (cardRef.current !== null) {
        const uri: string = await captureRef(cardRef, {
          format: "png",
          quality: 1.0,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: t("Bagikan Hasil Penjelajahan", "Share Your Adventure"),
            UTI: "public.png",
          });
          setShareStatus(t("✓ Berhasil dibagikan!", "✓ Shared successfully!"));
          return;
        }
      }

      await Share.share({ message });
    } catch (cause: unknown) {
      console.warn("gea_share_failed", cause);
      try {
        await Share.share({ message });
      } catch {
        void Linking.openURL("https://www.instagram.com/");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <FrameStage background={colors.primary[300]}>
      <ScanBackground />
      <WellDoneRibbon top={113} />
      <View ref={cardRef} collapsable={false} style={share_.card}>
        <GeaText variant="bold16" color={colors.primary[900]} style={share_.museum}>MUSEUM GEOLOGI BANDUNG</GeaText>
        <Image accessible={false} source={mascot} style={share_.mascot} contentFit="contain" />
        <GeaText variant="bold16" color={colors.primary[900]} style={share_.iam}>{t("AKU ADALAH", "I AM AN")}</GeaText>
        <GeaText variant="heading28" color={colors.primary[900]} style={share_.headline}>{t("Penjelajah Bumi!", "Earth Explorer!")}</GeaText>
        <View style={share_.status}>
          <Image accessible={false} source={tick} style={share_.tick} />
          <GeaText variant="bold16" color={colors.secondaryYellow[0]} style={share_.statusText}>
            {percent}{t("% PETUALANGAN TUNTAS", "% ADVENTURE COMPLETE")}
          </GeaText>
        </View>
        <View style={share_.stats}>
          <Stat value={`${summary.poisDone}/${summary.poisTotal}`} label={t("Koleksi", "Collections")} />
          <View style={share_.divider} />
          <Stat value={localizedDuration(summary.durationText, language)} label={t("Durasi", "Duration")} />
          <View style={share_.divider} />
          <Stat value={`${summary.questsDone}/${summary.questsTotal}`} label={t("Misi", "Quests")} />
          <View style={share_.divider} />
          <Stat value={formatPoints(summary.totalPoints, language)} label={t("Poin", "Points")} />
        </View>
        <View style={share_.reward}>
          <Image accessible={false} source={medal} style={share_.medal} />
          <View style={share_.rewardText}>
            <GeaText variant="bold16" color={colors.white} style={share_.rewardLabel}>{t("REWARD TERBUKA", "REWARD UNLOCKED")}</GeaText>
            <GeaText variant="bold16" color={colors.white}>{t("Lencana", "Badge")} {badge}</GeaText>
          </View>
        </View>
        <GeaText variant="caption12" color={colors.primary[900]} style={share_.tag}>#JelajahMuseumGeologi</GeaText>
      </View>
      <StoryButton
        label={sharing ? t("Menyiapkan Gambar...", "Preparing Image…") : shareStatus ?? t("Bagikan Gambar", "Share Image")}
        disabled={sharing}
        onPress={(): void => void share()}
        style={share_.button}
      />
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onBack} style={share_.back}>
        <GeaText variant="label16" color={colors.primary[900]} style={share_.underline}>{t("Kembali", "Back")}</GeaText>
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
    top: 430,
    width: 369,
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16] + spacing[4],
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    alignSelf: "stretch",
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    backgroundColor: "#F7F5F0",
    borderRadius: 8,
  },
  statItem: { alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 26, backgroundColor: colors.primary[200] },
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
  statValue: { fontSize: 18, lineHeight: 24 },
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

