import { randomUUID } from "expo-crypto";
import { Image } from "expo-image";
import { type ReactElement, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { TextField } from "../../../design/TextField";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type { AnswerResult, OptionLabel, Profile, Quest, QuestType } from "../../../domain/contracts";
import { questRecording } from "../../../data/poiAudio";
import type { QuestProgress } from "../../../domain/points";
import { readableError } from "../../../services/api";
import type { CapturedPhoto } from "../../../services/photo";
import { PhotoQuestScreen } from "./PhotoQuestScreen";
import { StoryBackground } from "./backgrounds";
import { BackButton, FrameStage, StoryButton } from "./parts";
import { QuestAudio } from "./QuestAudio";
import { useLanguage } from "../../preferences/LanguageSettings";

const icons: readonly [number, number] = [
  require("../../../../assets/design/card-discover.svg") as number,
  require("../../../../assets/design/card-search-zoom.svg") as number,
];
const labels: { readonly [type in QuestType]: string } = {
  foto: "CARI & FOTO", pilgan: "PILIHAN GANDA", isian_singkat: "ISIAN SINGKAT",
  benar_salah: "BENAR / SALAH", cocokkan: "COCOKKAN",
};

const englishLabels: typeof labels = {
  foto: "FIND & PHOTOGRAPH", pilgan: "MULTIPLE CHOICE", isian_singkat: "SHORT ANSWER",
  benar_salah: "TRUE / FALSE", cocokkan: "MATCHING",
};

/** Daftar quest setelah cerita, memakai kartu miring dan kotak centang seperti referensi. */
export function QuestListScreen({ poiName, quests, results, onPick, onResult, onBack }: {
  readonly poiName: string;
  readonly quests: readonly Quest[];
  readonly results: { readonly [questId: string]: QuestProgress };
  readonly onPick: (quest: Quest) => void;
  readonly onResult: () => void;
  readonly onBack: () => void;
}): ReactElement {
  const { language, t } = useLanguage();
  const typeLabels = language === "en" ? englishLabels : labels;
  const completed: number = quests.filter((quest: Quest): boolean => results[quest.idQuest]?.completed === true).length;
  const bottom: number = Math.max(560, 185 + quests.length * 134);
  return (
    <FrameStage background={colors.primary[300]} frameHeight={bottom + 220}>
      <StoryBackground />
      <BackButton onPress={onBack} />
      <View style={styles.heading}>
        <GeaText variant="heading28" color={colors.primary[900]}>{t("Tantangan per POI", "Collection Quests")}</GeaText>
        <GeaText variant="body16" color={componentColors.bodyDark}>{poiName}</GeaText>
        <GeaText variant="label16" color={colors.primary[900]}>{t(`${completed} dari ${quests.length} quest berhasil`, `${completed} of ${quests.length} quests completed`)}</GeaText>
      </View>
      {quests.map((quest: Quest, index: number): ReactElement => {
        const result: QuestProgress | undefined = results[quest.idQuest];
        const success: boolean = result?.completed === true;
        return (
          <Pressable
            key={quest.idQuest}
            accessibilityRole="button"
            accessibilityLabel={`${typeLabels[quest.type]}: ${quest.title ?? quest.instruksi}. ${success ? t("Sudah selesai", "Completed") : result?.failed ? t("Kesempatan habis", "No attempts left") : t("Belum selesai", "Incomplete")}`}
            onPress={(): void => onPick(quest)}
            style={({ pressed }) => [styles.questCard, {
              left: index % 2 === 0 ? 26 : 65, top: 215 + index * 134,
              transform: [{ rotate: index % 2 === 0 ? "-2.5deg" : "2.5deg" }],
            }, pressed && styles.pressed]}
          >
            <Image accessible={false} source={index % 2 === 0 ? icons[0] : icons[1]} style={styles.icon} />
            <View style={styles.cardText}>
              <GeaText variant="heading20" color={colors.secondaryGreen[900]}>{typeLabels[quest.type]}</GeaText>
              <GeaText variant="body16" color={componentColors.bodyDark} numberOfLines={2}>{quest.title ?? quest.instruksi}</GeaText>
              <GeaText variant="caption12" color={componentColors.bodyDark}>
                {success ? t(`Selesai · +${result?.pointsAwarded ?? 0} poin`, `Completed · +${result?.pointsAwarded ?? 0} pts`)
                  : result?.failed ? t("Kesempatan habis", "No attempts left")
                    : t(`${quest.points ?? 0} poin · ${quest.maxAttempts ?? 3} kesempatan`, `${quest.points ?? 0} pts · ${quest.maxAttempts ?? 3} attempts`)}
              </GeaText>
            </View>
            <View style={[styles.check, success && styles.checkDone]}>
              {success && <GeaText variant="bold16" color={colors.secondaryGreen[900]}>✓</GeaText>}
              {result?.failed && <GeaText variant="bold16" color={colors.danger[100]}>×</GeaText>}
            </View>
          </Pressable>
        );
      })}
      <View style={[styles.footer, { top: bottom }]}>
        <GeaText variant="body16" color={componentColors.bodyDark} style={styles.center}>
          {quests.length === 0 ? t("Cerita selesai. Belum ada quest untuk profilmu di POI ini.", "Story complete. There are no quests for your profile at this stop.")
            : t("Ketuk kartu untuk mengerjakan tantangannya.", "Tap a card to start a quest.")}
        </GeaText>
        <StoryButton label={t("Lihat Hasil", "View Results")} onPress={onResult} />
      </View>
    </FrameStage>
  );
}

/** Quest foto diperiksa model APK; instruksi audio mengikuti profil pengunjung. */
export function QuestTaskScreen({ quest, profile, result, submit, submitPhoto, onBack }: {
  readonly quest: Quest;
  /** Untuk memilih rekaman instruksi versi umum/anak. */
  readonly profile: Profile;
  readonly result: QuestProgress | undefined;
  readonly submit: (requestId: string, label: OptionLabel | null, text: string | null) => Promise<AnswerResult>;
  readonly submitPhoto: (requestId: string, photo: CapturedPhoto) => Promise<AnswerResult>;
  readonly onBack: () => void;
}): ReactElement {
  const { language, t } = useLanguage();
  const typeLabels = language === "en" ? englishLabels : labels;
  const [selected, setSelected] = useState<OptionLabel | null>(null);
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState<number>(0);
  const pending = useRef<{ readonly requestId: string; readonly label: OptionLabel | null; readonly text: string | null } | null>(null);
  const finished: boolean = result?.completed === true || result?.failed === true;
  const attempts: number = result?.attempts ?? 0;
  const limit: number = quest.maxAttempts ?? 3;
  const isText: boolean = quest.type === "isian_singkat";
  const photo: boolean = quest.type === "foto";
  const recording: number | undefined = quest.code == null ? undefined : questRecording(quest.code, profile, language);

  if (photo && !finished) return <PhotoQuestScreen quest={quest} recording={recording} submit={submitPhoto} onBack={onBack} />;

  async function send(): Promise<void> {
    if (busy || finished || photo) return;
    const value: string | null = isText ? text.trim() : null;
    if (isText ? value === "" : selected === null) return;
    const current = pending.current;
    const request = current !== null && current.label === selected && current.text === value
      ? current : { requestId: randomUUID(), label: selected, text: value };
    pending.current = request;
    setBusy(true);
    setError(null);
    try {
      const answer: AnswerResult = await submit(request.requestId, request.label, request.text);
      pending.current = null;
      setHint(answer.hint);
      setSelected(null);
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FrameStage background={colors.primary[300]} frameHeight={150 + height + 48}>
      <StoryBackground />
      <BackButton onPress={onBack} />
      <View style={styles.task} onLayout={(event): void => setHeight(event.nativeEvent.layout.height)}>
        <GeaText variant="heading28" color={colors.primary[900]}>{typeLabels[quest.type]}</GeaText>
        <View style={styles.question}>
          <GeaText variant="heading24" color={colors.secondaryGreen[900]}>{quest.title ?? quest.instruksi}</GeaText>
          <GeaText variant="body16" color={componentColors.bodyDark}>{quest.pertanyaan}</GeaText>
          <GeaText variant="caption12" color={componentColors.bodyDark}>{quest.points ?? 0} {t("poin", "pts")}{!photo && t(` · Sisa ${Math.max(0, limit - attempts)} dari ${limit} kesempatan`, ` · ${Math.max(0, limit - attempts)} of ${limit} attempts left`)}</GeaText>
          {recording !== undefined ? <QuestAudio key={recording} source={recording} /> : language === "en" &&
            <GeaText variant="caption12" color={componentColors.bodyDark}>English audio unavailable.</GeaText>}
        </View>
        {finished ? (
          <View style={styles.question} accessibilityLiveRegion="polite">
            <GeaText variant="heading24" color={colors.primary[900]}>{result?.completed ? (photo ? t("Foto sesuai!", "Photo accepted!") : t("Jawaban benar!", "Correct!")) : t("Kesempatan habis", "No attempts left")}</GeaText>
            <GeaText variant="body16" color={componentColors.bodyDark}>{quest.penjelasan}</GeaText>
            <GeaText variant="bold16" color={colors.primary[900]}>+{result?.pointsAwarded ?? 0} {t("poin", "pts")}</GeaText>
          </View>
        ) : (
          <>
            {isText ? (
              <TextField label={t("Jawabanmu", "Your answer")} value={text} onChangeText={setText} editable={!busy} autoCapitalize="none" placeholder={t("Tulis jawaban singkat", "Enter a short answer")} />
            ) : (
              <View accessibilityRole="radiogroup" style={styles.options}>
                {quest.options.map((option): ReactElement => (
                  <Pressable key={option.label_opsi} accessibilityRole="radio"
                    accessibilityState={{ checked: selected === option.label_opsi, disabled: busy }} disabled={busy}
                    onPress={(): void => setSelected(option.label_opsi)}
                    style={[styles.option, selected === option.label_opsi && styles.optionSelected]}
                  >
                    <GeaText variant="body16" color={componentColors.bodyDark} style={styles.cardText}>{option.teks_opsi}</GeaText>
                    <View style={[styles.choiceCheck, selected === option.label_opsi && styles.checkDone]}>
                      {selected === option.label_opsi && <GeaText variant="bold16" color={colors.secondaryGreen[900]}>✓</GeaText>}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            {hint !== null && <View style={styles.question} accessibilityLiveRegion="polite">
              <GeaText variant="bold16" color={colors.primary[900]}>{t("Belum tepat. Coba lagi!", "Not quite. Try again!")}</GeaText>
              <GeaText variant="body14" color={componentColors.bodyDark}>{language === "en" ? quest.hint : hint}</GeaText>
            </View>}
            {busy && <ActivityIndicator color={colors.primary[900]} />}
            <StoryButton label={busy ? t("Memeriksa jawaban…", "Checking answer…") : t("Kirim Jawaban", "Submit Answer")} disabled={busy || (isText ? text.trim() === "" : selected === null)} onPress={(): void => { void send(); }} />
          </>
        )}
        {error !== null && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">{error}</GeaText>}
        <StoryButton label={t("Kembali ke Daftar Quest", "Back to Quests")} onPress={onBack} disabled={busy} />
      </View>
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  heading: { position: "absolute", left: 24, right: 24, top: 96, gap: spacing[8] },
  questCard: {
    position: "absolute", width: 287, minHeight: 114, flexDirection: "row", alignItems: "center",
    padding: 16, gap: 12, borderRadius: 10, borderWidth: 2, borderColor: colors.primary[600],
    backgroundColor: componentColors.welcomeBackground, boxShadow: shadows.drop,
  },
  icon: { width: 28, height: 28 },
  cardText: { flex: 1, gap: 4 },
  check: {
    position: "absolute", right: -12, top: "50%", marginTop: -12, width: 24, height: 24,
    borderWidth: 2, borderColor: colors.primary[600], alignItems: "center", justifyContent: "center",
    backgroundColor: colors.secondaryYellow[0],
  },
  checkDone: { backgroundColor: colors.secondaryGreen[100] },
  pressed: { opacity: 0.8 },
  footer: { position: "absolute", left: 24, right: 24, alignItems: "center", gap: 20 },
  center: { textAlign: "center" },
  task: { position: "absolute", left: 20, right: 20, top: 150, gap: spacing[16] },
  question: { padding: spacing[16], borderRadius: radius.control, backgroundColor: componentColors.welcomeBackground, gap: spacing[12] },
  options: { gap: spacing[8] },
  option: { flexDirection: "row", alignItems: "center", padding: spacing[16], gap: spacing[12], backgroundColor: colors.primary[0], borderRadius: radius.control, borderWidth: 2, borderColor: colors.primary[600] },
  optionSelected: { borderColor: colors.secondaryGreen[900] },
  choiceCheck: { width: 24, height: 24, borderWidth: 2, borderColor: colors.primary[600], alignItems: "center", justifyContent: "center" },
});
