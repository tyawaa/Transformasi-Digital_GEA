// SEMENTARA: belum ada desain hi-fi untuk layar tantangan. Kartu mengikuti gaya Mini Quiz.
// Tantangan dinilai di aplikasi (sheet Quest, kolom selain "Kuis Pilihan Ganda"); backend belum punya datanya.
import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { TextField } from "../../../design/TextField";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type { Tantangan } from "../../../data/museum";
import { StoryBackground } from "./backgrounds";
import { BackButton, FrameStage, StoryButton } from "./parts";
import { PhotoTaskScreen } from "./PhotoTaskScreen";

type Props = {
  readonly challenge: Tantangan;
  readonly onBack: () => void;
  /** points = poin sheet bila berhasil, 0 bila kesempatan habis. */
  readonly onDone: (result: { readonly success: boolean; readonly points: number }) => void;
  readonly testMode?: boolean;
};

/** Huruf kecil, tanpa spasi berlebih dan tanda baca, agar "Big Bang!" = "big bang". */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export function ChallengeScreen({ challenge, onBack, onDone, testMode = false }: Props): ReactElement {
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [answer, setAnswer] = useState<string>("");
  const [wrong, setWrong] = useState<boolean>(false);
  const [height, setHeight] = useState<number>(0);
  const photoType: boolean = challenge.tipe === "foto" || challenge.tipe === "cariObjek";
  const left: number = challenge.batasPercobaan - attempts;

  if (photoType && outcome === null) {
    return (
      <PhotoTaskScreen
        title={challenge.judul}
        instruction={challenge.instruksi}
        target={challenge.target}
        hint={challenge.hint}
        onBack={onBack}
        onDone={(): void => setOutcome(true)}
        testMode={testMode}
      />
    );
  }

  function check(value: string): void {
    const accepted: readonly string[] = challenge.jawaban ?? [];
    const correct: boolean = accepted.some((item: string): boolean => normalize(item) === normalize(value));
    const used: number = attempts + 1;
    setAttempts(used);
    if (correct) setOutcome(true);
    else if (used >= challenge.batasPercobaan) setOutcome(false);
    else setWrong(true);
  }

  return (
    <FrameStage background={colors.primary[300]} frameHeight={CARD_TOP + height + 48} scrollKey={String(outcome)}>
      <StoryBackground />
      <BackButton onPress={onBack} />
      <View style={styles.card} onLayout={(event): void => setHeight(event.nativeEvent.layout.height)}>
        <View style={styles.header}>
          <GeaText variant="label16" color={colors.primary[700]}>TANTANGAN</GeaText>
          {!photoType && outcome === null && (
            <GeaText variant="label16" color={colors.primary[700]} accessibilityLabel={`Sisa ${left} kesempatan`}>
              {"●".repeat(left)}{"○".repeat(attempts)}
            </GeaText>
          )}
        </View>
        <GeaText variant="heading24" color={colors.primary[900]}>{challenge.judul}</GeaText>

        {outcome === null
          ? (
            <>
              <GeaText variant="body16" color={componentColors.bodyDark}>{challenge.instruksi}</GeaText>
              {challenge.tipe === "benarSalah"
                ? (
                  <View accessibilityRole="radiogroup" style={styles.options}>
                    {["Benar", "Salah"].map((label: string): ReactElement => (
                      <Pressable
                        key={label}
                        accessibilityRole="radio"
                        onPress={(): void => check(label)}
                        style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                      >
                        <GeaText variant="bold16" color={colors.primary[900]}>{label}</GeaText>
                      </Pressable>
                    ))}
                  </View>
                )
                : (
                  <>
                    <TextField
                      value={answer}
                      onChangeText={(text: string): void => {
                        setAnswer(text);
                        setWrong(false);
                      }}
                      placeholder="Tulis jawabanmu"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={(): void => {
                        if (answer.trim() !== "") check(answer);
                      }}
                    />
                    <StoryButton label="Kirim Jawaban" disabled={answer.trim() === ""} onPress={(): void => check(answer)} />
                  </>
                )}
              {wrong && (
                <View accessibilityLiveRegion="polite" style={styles.hint}>
                  <GeaText variant="bold16" color={colors.warning[500]}>Belum tepat · sisa {left} kesempatan</GeaText>
                  {challenge.hint !== undefined && (
                    <GeaText variant="body14" color={componentColors.bodyDark}>{challenge.hint}</GeaText>
                  )}
                </View>
              )}
            </>
          )
          : (
            <>
              <View style={[styles.result, outcome ? styles.resultOk : styles.resultFail]}>
                <GeaText variant="bold16" color={outcome ? colors.success[500] : colors.danger[500]}>
                  {photoType
                    ? "Foto berhasil diambil!"
                    : outcome
                    ? `Benar! +${challenge.poin} poin`
                    : "Kesempatan habis"}
                </GeaText>
                {photoType && <GeaText variant="body14" color={componentColors.bodyDark}>+{challenge.poin} poin</GeaText>}
              </View>
              {challenge.penjelasan !== undefined && (
                <GeaText variant="body16" color={componentColors.bodyDark}>{challenge.penjelasan}</GeaText>
              )}
              <StoryButton
                label="Lanjut"
                onPress={(): void => onDone({ success: outcome, points: outcome ? challenge.poin : 0 })}
              />
            </>
          )}
      </View>
    </FrameStage>
  );
}

const CARD_TOP = 110;

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: 16,
    top: CARD_TOP,
    width: 358,
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.primary[0],
    boxShadow: shadows.drop,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  options: { flexDirection: "row", gap: spacing[12] },
  option: {
    flex: 1,
    alignItems: "center",
    padding: spacing[16],
    borderWidth: 2,
    borderColor: colors.primary[400],
    borderRadius: radius.control,
    backgroundColor: colors.secondaryYellow[0],
  },
  pressed: { opacity: 0.7 },
  hint: { gap: spacing[4], padding: spacing[12], borderRadius: radius.control, backgroundColor: colors.warning[0] },
  result: { gap: spacing[4], padding: spacing[12], borderRadius: radius.control },
  resultOk: { backgroundColor: colors.success[0] },
  resultFail: { backgroundColor: colors.danger[0] },
});
