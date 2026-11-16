// SEMENTARA: layar "Kisah Selesai" dan "Side Quest" mengikuti draft desain PD yang belum final.
// Semua teks dan tata letak dikumpulkan di file ini supaya mudah diganti saat hi-fi final keluar.
import { Image } from "expo-image";
import { type ReactElement, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, View } from "react-native";
import { Button } from "../../../design/Button";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type { PoiDetail } from "../../../domain/contracts";
import { mediaSource } from "../../../services/media";
import { StoryBackground } from "./backgrounds";
import { BackButton, FrameStage, StoryButton } from "./parts";

// SEMENTARA: ikan Coelacanth dan latar tiga lapis meniru draft desain "Kisah Selesai".
const illustration = require("../../../../assets/design/finished-fish.png") as number;
const background = require("../../../../assets/design/finished-bg.svg") as number;

/** Draft "Kisah selesai. Lanjutkan penjelajahanmu!" (setelah cerita). */
export function StoryFinishedScreen(
  { poiName, onSideQuest, onSkip }: {
    readonly poiName: string;
    readonly onSideQuest: () => void;
    readonly onSkip: () => void;
  },
): ReactElement {
  return (
    <FinishedScreen
      title="Kisah selesai. Lanjutkan penjelajahanmu!"
      description={`Selamat explorer, kamu baru saja menamatkan cerita tentang ${poiName}. Ayo hidupkan ceritamu dengan Side Quest!`}
      actionLabel="Lakukan Side Quest"
      onAction={onSideQuest}
      onSkip={onSkip}
    />
  );
}

/** Placeholder layar selesai kuis: layout sama dengan Kisah Selesai, teks berbeda. */
export function QuizFinishedScreen(
  { poiName, completed, onResult, onSkip }: {
    readonly poiName: string;
    readonly completed: boolean;
    readonly onResult: () => void;
    readonly onSkip: () => void;
  },
): ReactElement {
  return (
    <FinishedScreen
      title={completed ? "Side quest selesai. Hebat, explorer!" : "Side quest selesai. Tetap semangat!"}
      description={completed
        ? `Kamu berhasil menjawab mini quiz tentang ${poiName}. Yuk lihat berapa poin yang kamu kumpulkan!`
        : `Kesempatan menjawab mini quiz tentang ${poiName} sudah habis. Lihat hasilmu, lalu lanjutkan ke koleksi berikutnya!`}
      actionLabel="Lihat Poin"
      onAction={onResult}
      onSkip={onSkip}
    />
  );
}

/** Figma "Final": layar penutup cerita dengan tombol bagikan dan kembali ke halaman utama. */
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
      <Image accessible={false} source={background} style={finished.bg} contentFit="fill" />
      <View style={finished.card}>
        <GeaText variant="heading28" color={colors.tertiary[100]} style={finished.center}>
          Kisah selesai. Lanjutkan penjelajahanmu!
        </GeaText>
        <GeaText variant="body16" color={componentColors.bodyDark} style={finished.center}>
          Selamat explorer, kamu baru saja menamatkan cerita tentang {poiName}. Bagikan petualanganmu dan lanjutkan ke koleksi berikutnya!
        </GeaText>
        {nextStop !== null && (
          <GeaText variant="label16" color={colors.secondaryGreen[900]} style={finished.center}>
            Berikutnya di rutemu: {nextStop}
          </GeaText>
        )}
      </View>
      <StoryButton label="Bagikan ke Instagram" onPress={(): void => void share()} style={finished.button} />
      <View style={finished.homeButton}>
        <Button appearance="outline" tone="primary" label="Kembali ke Halaman Utama" onPress={onHome} style={finished.stretch} />
      </View>
    </FrameStage>
  );
}

/** Template layar "selesai" (draft PD). Ganti di sini saat hi-fi final keluar. */
function FinishedScreen(
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
      <Image accessible={false} source={background} style={finished.bg} contentFit="fill" />
      <Pressable accessibilityRole="button" hitSlop={12} onPress={onSkip} style={finished.skip}>
        <GeaText variant="label16" color={colors.secondaryYellow[0]} style={finished.underline}>Skip</GeaText>
      </Pressable>
      <Image accessible={false} source={illustration} style={finished.art} contentFit="contain" />
      <View style={finished.card}>
        <GeaText variant="heading28" color={colors.tertiary[100]} style={finished.center}>
          {title}
        </GeaText>
        <GeaText variant="body16" color={componentColors.bodyDark} style={finished.center}>
          {description}
        </GeaText>
      </View>
      <StoryButton label={actionLabel} onPress={onAction} style={finished.button} />
    </FrameStage>
  );
}

export type SideQuestTask = {
  readonly label: string;
  readonly done: boolean;
  readonly icon: "camera" | "search" | "quiz";
};

const taskIcons: Record<SideQuestTask["icon"], number> = {
  camera: require("../../../../assets/design/icon-camera.svg") as number,
  search: require("../../../../assets/design/icon-search.svg") as number,
  quiz: require("../../../../assets/design/icon-quiz.svg") as number,
};

/** Draft daftar Side Quest dengan kotak centang per tugas. */
export function SideQuestScreen(
  { poiName, photoChallenges, notice, tasks, locked, actionLabel, onAction, onBack }: {
    readonly poiName: string;
    readonly photoChallenges: PoiDetail["photoChallenges"];
    readonly notice: string | null;
    readonly tasks: readonly SideQuestTask[];
    readonly locked: boolean;
    readonly actionLabel: string;
    readonly onAction: () => void;
    readonly onBack: () => void;
  },
): ReactElement {
  const [contentHeight, setContentHeight] = useState<number>(0);
  return (
    <FrameStage background={colors.primary[300]} frameHeight={124 + contentHeight + 48}>
      <StoryBackground />
      <BackButton onPress={onBack} />
      <View style={side.content} onLayout={(event): void => setContentHeight(event.nativeEvent.layout.height)}>
      <View style={side.intro}>
        <GeaText variant="label16" color={componentColors.bodyDark} style={finished.center}>
          Selamat explorer, kamu baru saja menamatkan cerita tentang {poiName}. Ayo hidupkan ceritamu dengan Side Quest!
        </GeaText>
      </View>
      {photoChallenges.length > 0 && <PhotoChallengeGallery challenges={photoChallenges} />}
      {notice !== null && <GeaText variant="body16" color={componentColors.bodyDark}>{notice}</GeaText>}
      <View style={side.list}>
        {tasks.map((task: SideQuestTask): ReactElement => (
          <View
            key={task.label}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            style={side.task}
          >
            <Image accessible={false} source={taskIcons[task.icon]} style={side.icon} />
            <GeaText variant="body16Tight" color={componentColors.bodyDark} style={side.taskText}>
              {task.label}
            </GeaText>
            <View style={[side.box, task.done && side.boxDone]}>
              {task.done && <GeaText variant="bold16" color={colors.secondaryGreen[900]}>✓</GeaText>}
            </View>
          </View>
        ))}
        {locked && (
          <GeaText variant="body14" color={colors.tertiary[300]} style={finished.center}>
            Quest terkunci. Scan QR di dekat koleksi untuk membukanya.
          </GeaText>
        )}
      </View>
      <StoryButton label={actionLabel} onPress={onAction} style={side.button} />
      </View>
    </FrameStage>
  );
}

/** Referensi foto nomor 3+; setiap gambar tetap punya instruksi dan nomor aslinya. */
function PhotoChallengeGallery({ challenges }: { readonly challenges: PoiDetail["photoChallenges"] }): ReactElement {
  const [index, setIndex] = useState<number>(0);
  const challenge: PoiDetail["photoChallenges"][number] | undefined = challenges[index];
  if (challenge === undefined) throw new RangeError(`Referensi foto ke-${index + 1} belum tersedia.`);
  return (
    <View style={side.gallery}>
      <GeaText variant="heading28" color={colors.primary[900]}>Temukan gambar ini</GeaText>
      <Image
        source={mediaSource(challenge.photoUrl)}
        accessibilityLabel={`Referensi tantangan foto ${index + 1}`}
        contentFit="contain"
        style={side.referencePhoto}
      />
      <GeaText variant="body16Tight" color={componentColors.bodyDark}>{challenge.instruction}</GeaText>
      <View style={side.galleryNav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Referensi sebelumnya" disabled={index === 0} accessibilityState={{ disabled: index === 0 }} onPress={(): void => setIndex(index - 1)} style={[side.referenceButton, index === 0 && side.disabled]}>
          <GeaText variant="label16" color={colors.primary[900]}>Sebelumnya</GeaText>
        </Pressable>
        <GeaText variant="label16" color={colors.primary[900]}>{index + 1} / {challenges.length}</GeaText>
        <Pressable accessibilityRole="button" accessibilityLabel="Referensi berikutnya" disabled={index === challenges.length - 1} accessibilityState={{ disabled: index === challenges.length - 1 }} onPress={(): void => setIndex(index + 1)} style={[side.referenceButton, index === challenges.length - 1 && side.disabled]}>
          <GeaText variant="label16" color={colors.primary[900]}>Berikutnya</GeaText>
        </Pressable>
      </View>
    </View>
  );
}

const finished = StyleSheet.create({
  bg: { position: "absolute", left: 0, top: 0, width: 390, height: 844 },
  skip: { position: "absolute", right: 16, top: 38, zIndex: 1 },
  underline: { textDecorationLine: "underline" },
  // Posisi ikan sama dengan frame "Selesai Story Splash" (393 px, diskalakan ke 390).
  art: { position: "absolute", left: 36, top: 135, width: 319, height: 163 },
  card: {
    position: "absolute",
    left: 18,
    top: 325,
    width: 358,
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.white,
  },
  center: { textAlign: "center" },
  button: { position: "absolute", left: 17, top: 696, width: 358, boxShadow: shadows.drop },
  homeButton: { position: "absolute", left: 17, top: 752, width: 358 },
  stretch: { alignSelf: "stretch" },
});

const side = StyleSheet.create({
  content: { position: "absolute", left: 16, top: 124, width: 358, gap: spacing[24] },
  intro: {
    padding: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.white,
  },
  // "Story - Mini quiz": daftar tugas mulai y≈350, kartu krem berbingkai cokelat.
  list: { gap: spacing[8] },
  button: { alignSelf: "stretch", boxShadow: shadows.drop },
  gallery: { gap: spacing[12], padding: spacing[12], borderRadius: radius.control, backgroundColor: colors.primary[0] },
  referencePhoto: { width: "100%", height: 320, borderWidth: 8, borderColor: colors.secondaryGreen[300], backgroundColor: colors.primary[100] },
  galleryNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  referenceButton: { paddingVertical: spacing[12], paddingHorizontal: spacing[8] },
  disabled: { opacity: 0.4 },
  icon: { width: 28, height: 28 },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minHeight: 64,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderWidth: 2.5,
    borderColor: colors.primary[600],
    borderRadius: 6,
    backgroundColor: colors.primary[0],
  },
  taskText: { flex: 1 },
  box: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: colors.primary[600],
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondaryYellow[0],
  },
  boxDone: { backgroundColor: colors.secondaryGreen[100] },
});
