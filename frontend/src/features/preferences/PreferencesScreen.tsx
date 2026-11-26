import { Image } from "expo-image";
import { type ReactElement, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Toast } from "../../design/Toast";
import { AnimatedNotification } from "../../design/AnimatedNotification";
import { colors, componentColors, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { StoryBackground } from "../stories/hifi/backgrounds";
import { BackButton, FrameStage, StoryButton, useFrameBleed } from "../stories/hifi/parts";
import { ageOptions, topics } from "./recommend";
import { durationOptions } from "./visitTiming";
import type { Preferences } from "./usePreferences";
import { type ExploreMode, readExploreMode, saveExploreMode } from "../eyesfree/mode";
import { useLanguage } from "./LanguageSettings";
import { localizeCopy } from "../../data/localizedCopy";

const headerTexture: number = require("../../../assets/design/preferences-header-texture.svg") as number;

// Figma "Preferensi - Usia / Waktu / Minat".
type Question = {
  readonly title: string;
  readonly hint: string;
  readonly multiple: boolean;
  readonly options: readonly string[];
  /** Keterangan kecil di bawah tiap pilihan. */
  readonly details?: readonly string[];
};

const modes: readonly { readonly mode: ExploreMode; readonly label: string; readonly detail: string }[] = [
  { mode: "biasa", label: "Mode biasa", detail: "Baca cerita dan kerjakan quest di layar, pindai QR koleksi." },
  { mode: "tanpa-layar", label: "Mode tanpa layar", detail: "HP bergetar untuk memberi petunjuk dan menandai kedatangan." },
];

const questions: readonly [Question, Question, Question, Question] = [
  {
    title: "Berapa usiamu sekarang?",
    hint: "Pilih salah satu.",
    multiple: false,
    options: ageOptions,
  },
  {
    title: "Berapa lama kamu ingin menjelajah?",
    hint: "Pilih salah satu.",
    multiple: false,
    options: durationOptions,
  },
  {
    title: "Topik apa yang menarik minatmu?",
    hint: "Boleh pilih lebih dari satu.",
    multiple: true,
    // Di Figma masih "Lorem ipsum". Topik dan ruangannya diatur di recommend.ts.
    options: topics.map((topic) => topic.label),
  },
  {
    title: "Mau menjelajah dengan cara apa?",
    hint: "Bisa diganti nanti lewat tombol speaker di peta.",
    multiple: false,
    options: modes.map((item) => item.label),
    details: modes.map((item) => item.detail),
  },
];

/** Empat layar preferensi setelah onboarding: usia → waktu → minat → mode jelajah. */
export function PreferencesScreen(
  { value, onChange, onBack, onDone, saving, error, onDismissError }: {
    readonly value: Preferences;
    readonly onChange: (value: Preferences) => void;
    readonly onBack: () => void;
    readonly onDone: (value: Preferences) => void;
    readonly saving: boolean;
    readonly error: string | null;
    readonly onDismissError: () => void;
  },
): ReactElement {
  const { language, t } = useLanguage();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  // Mode jelajah tidak ikut personalisasi server; disimpan di perangkat (lihat eyesfree/mode.ts).
  const [mode, setMode] = useState<ExploreMode | null>(null);
  useEffect((): void => {
    readExploreMode().then(setMode, (): void => undefined);
  }, []);
  const modeLabel: string | undefined = modes.find((item) => item.mode === mode)?.label;
  const answers: readonly [readonly string[], readonly string[], readonly string[], readonly string[]] = [
    value.age === "" ? [] : [value.age],
    value.duration === "" ? [] : [value.duration],
    value.topics,
    modeLabel === undefined ? [] : [modeLabel],
  ];
  const question: Question = questions[step];
  const selected: readonly string[] = answers[step];
  const [warning, setWarning] = useState<number | null>(null);
  const { bleed, span } = useFrameBleed();

  function toggle(option: string): void {
    const next: readonly string[] = question.multiple
      ? selected.includes(option) ? selected.filter((item: string): boolean => item !== option) : [...selected, option]
      : [option];
    setWarning(null);
    if (step === 3) {
      const chosen: ExploreMode | undefined = modes.find((item) => item.label === option)?.mode;
      if (chosen !== undefined) setMode(chosen);
      return;
    }
    onChange(step === 0
      ? { ...value, age: next[0] ?? "" }
      : step === 1
      ? { ...value, duration: next[0] ?? "" }
      : { ...value, topics: next });
  }

  function back(): void {
    setWarning(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (step === 1) setStep(0);
    else onBack();
  }

  function next(): void {
    if (selected.length === 0) {
      setWarning(Date.now());
      return;
    }
    setWarning(null);
    if (step < 3) {
      setStep((step + 1) as 1 | 2 | 3);
      return;
    }
    if (mode !== null) saveExploreMode(mode);
    onDone(value);
  }

  // Daftar dengan 5 pilihan dimulai sedikit lebih tinggi agar tetap di atas tombol.
  const listTop: number = question.options.length > 4 ? 290 : 316;

  return (
    <FrameStage background={colors.primary[300]}>
      <StoryBackground />
      <View style={[styles.header, span, { paddingHorizontal: spacing[16] + bleed }]}>
        <Image accessible={false} source={headerTexture} style={StyleSheet.absoluteFill} contentFit="fill" />
        <GeaText variant="display42" color={colors.secondaryGreen[100]} style={[styles.center, styles.upper]}>
          {localizeCopy(question.title, language)}
        </GeaText>
        <GeaText variant="body16" color={componentColors.textWhite} style={styles.center}>
          {localizeCopy(question.hint, language)}
        </GeaText>
      </View>
      <BackButton onPress={back} label={t("Kembali", "Back")} labelColor={colors.secondaryGreen[100]} />
      <View style={[styles.list, { top: listTop }]}>
        {question.options.map((option: string, index: number): ReactElement => {
          const checked: boolean = selected.includes(option);
          const detail: string | undefined = question.details?.[index];
          return (
            <Pressable
              key={option}
              accessibilityRole={question.multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked }}
              onPress={(): void => toggle(option)}
              style={({ pressed }) => [styles.option, detail !== undefined && styles.optionTall, checked && styles.optionChecked, pressed && styles.pressed]}
            >
              <View style={styles.optionBody}>
                <GeaText variant="label16" color={colors.tertiary[300]} style={styles.optionLabel}>
                  {localizeCopy(option, language)}
                </GeaText>
                {detail !== undefined && <GeaText variant="body14" color={colors.primary[800]}>{localizeCopy(detail, language)}</GeaText>}
              </View>
              <View style={[styles.box, checked && styles.boxChecked]}>
                {checked && <GeaText variant="bold16" color={colors.secondaryGreen[900]}>✓</GeaText>}
              </View>
            </Pressable>
          );
        })}
      </View>
      <StoryButton label={saving ? t("Menyimpan…", "Saving…") : t("Lanjut", "Continue")} disabled={saving} onPress={next} style={styles.button} />
      <AnimatedNotification style={styles.toast}>
        {error !== null ? <Toast tone="danger" title={t("Personalisasi belum tersimpan", "Preferences could not be saved")} description={error} countdown={null} onClose={onDismissError} /> : null}
      </AnimatedNotification>
      <AnimatedNotification style={styles.toast}>
        {warning !== null ? (
          <Toast
            tone="danger"
            title={t("Belum ada pilihan", "No options available")}
            description={question.multiple ? t("Pilih minimal satu topik dulu untuk melanjutkan.", "Choose at least one topic to continue.") : t("Pilih salah satu jawaban dulu untuk melanjutkan.", "Choose an answer to continue.")}
            countdown={{ id: warning, durationMs: 5000 }}
            onClose={(): void => setWarning(null)}
          />
        ) : null}
      </AnimatedNotification>
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 390,
    height: 251,
    paddingTop: 110,
    paddingHorizontal: spacing[16],
    gap: spacing[12],
    alignItems: "center",
    backgroundColor: colors.primary[900],
  },
  center: { textAlign: "center" },
  // lineHeight > fontSize: sama dengan fontSize memotong huruf Ellak di iOS.
  upper: { textTransform: "uppercase", fontSize: 36, lineHeight: 44 },
  list: { position: "absolute", left: 16, width: 358, gap: 12 },
  option: {
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing[16],
    paddingRight: spacing[16],
    borderWidth: 2.5,
    borderColor: colors.primary[500],
    borderRadius: 6,
    backgroundColor: colors.primary[0],
    boxShadow: shadows.card,
  },
  optionChecked: { borderColor: colors.tertiary[200] },
  pressed: { opacity: 0.8 },
  optionTall: { height: undefined, minHeight: 104, paddingVertical: spacing[12] },
  optionBody: { flex: 1, gap: 4, paddingRight: spacing[12] },
  optionLabel: { fontSize: 18 },
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
  boxChecked: { backgroundColor: colors.secondaryGreen[100] },
  button: { position: "absolute", left: 16, top: 729, width: 358, boxShadow: shadows.drop },
  toast: { position: "absolute", left: 15, top: 47, width: 360 },
});
