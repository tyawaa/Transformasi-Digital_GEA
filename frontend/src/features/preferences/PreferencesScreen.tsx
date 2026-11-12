import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { StoryBackground } from "../stories/hifi/backgrounds";
import { FrameStage, StoryButton } from "../stories/hifi/parts";
import { ageOptions, durationOptions, topics } from "./recommend";
import type { Preferences } from "./usePreferences";

// Figma "Preferensi - Usia / Waktu / Minat".
type Question = {
  readonly title: string;
  readonly hint: string;
  readonly multiple: boolean;
  readonly options: readonly string[];
};

const questions: readonly [Question, Question, Question] = [
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
];

/** Tiga layar preferensi setelah onboarding: usia → waktu → minat. */
export function PreferencesScreen(
  { onDone }: { readonly onDone: (value: Preferences) => void },
): ReactElement {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [answers, setAnswers] = useState<readonly [readonly string[], readonly string[], readonly string[]]>([[], [], []]);
  const question: Question = questions[step];
  const selected: readonly string[] = answers[step];

  function toggle(option: string): void {
    const next: readonly string[] = question.multiple
      ? selected.includes(option) ? selected.filter((item: string): boolean => item !== option) : [...selected, option]
      : [option];
    setAnswers((current) => {
      const copy = [...current] as [readonly string[], readonly string[], readonly string[]];
      copy[step] = next;
      return copy;
    });
  }

  function next(): void {
    if (step < 2) {
      setStep((step + 1) as 1 | 2);
      return;
    }
    onDone({ age: answers[0][0] ?? "", duration: answers[1][0] ?? "", topics: answers[2] });
  }

  // Daftar dengan 5 pilihan dimulai sedikit lebih tinggi agar tetap di atas tombol.
  const listTop: number = question.options.length > 4 ? 290 : 316;

  return (
    <FrameStage background={colors.primary[300]}>
      <StoryBackground />
      <View style={styles.header}>
        <GeaText variant="display42" color={colors.secondaryGreen[100]} style={[styles.center, styles.upper]}>
          {question.title}
        </GeaText>
        <GeaText variant="body16" color={componentColors.textWhite} style={styles.center}>
          {question.hint}
        </GeaText>
      </View>
      <View style={[styles.list, { top: listTop }]}>
        {question.options.map((option: string): ReactElement => {
          const checked: boolean = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole={question.multiple ? "checkbox" : "radio"}
              accessibilityState={{ checked }}
              onPress={(): void => toggle(option)}
              style={({ pressed }) => [styles.option, checked && styles.optionChecked, pressed && styles.pressed]}
            >
              <GeaText variant="label16" color={colors.tertiary[300]} style={styles.optionText}>
                {option}
              </GeaText>
              <View style={[styles.box, checked && styles.boxChecked]}>
                {checked && <GeaText variant="bold16" color={colors.secondaryGreen[900]}>✓</GeaText>}
              </View>
            </Pressable>
          );
        })}
      </View>
      <StoryButton label="Lanjut" onPress={next} disabled={selected.length === 0} style={styles.button} />
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
  upper: { textTransform: "uppercase", fontSize: 36, lineHeight: 36 },
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
  optionText: { flex: 1, fontSize: 18 },
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
});
