// SEMENTARA: belum ada desain hi-fi untuk layar tantangan. Kartu mengikuti gaya Mini Quiz.
// Mode API: dinilai jawab_quest di backend. Mode mock: dinilai di aplikasi.
import { type ReactElement, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { TextField } from "../../../design/TextField";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type { Tantangan } from "../../../data/museum";
import type { PoiDetail } from "../../../domain/contracts";
import { StoryBackground } from "./backgrounds";
import { BackButton, FrameStage, StoryButton } from "./parts";
import { PhotoTaskScreen } from "./PhotoTaskScreen";

type Props = {
  readonly challenge: Tantangan;
  readonly onBack: () => void;
  /** points = poin sheet bila berhasil, 0 bila kesempatan habis. */
  /** attempts = jumlah jawaban (0 untuk quest foto); dipakai lencana "percobaan pertama". */
  readonly onDone: (result: { readonly success: boolean; readonly points: number; readonly attempts: number }) => void;
  readonly testMode?: boolean;
  /** Foto referensi POI dari backend, ditampilkan di layar foto. */
  readonly references?: PoiDetail["photoChallenges"] | undefined;
  /** null = dinilai lokal. */
  readonly grade?: ((answer: ChallengeAnswer) => Promise<ServerGrade> | null) | undefined;
};

export type ChallengeAnswer =
  | { readonly kind: "photo" }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "choice"; readonly choice: string };

export type ServerGrade = {
  readonly correct: boolean;
  readonly failed: boolean;
  readonly attempts: number;
  readonly points: number;
  readonly hint: string | null;
};

/** Huruf kecil, tanpa spasi berlebih dan tanda baca, agar "Big Bang!" = "big bang". */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
}

export function ChallengeScreen({ challenge, onBack, onDone, testMode = false, references, grade }: Props): ReactElement {
  const [outcome, setOutcome] = useState<boolean | null>(null);
  const [serverPoints, setServerPoints] = useState<number | null>(null);
  const [serverHint, setServerHint] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [answer, setAnswer] = useState<string>("");
  const [wrong, setWrong] = useState<boolean>(false);
  const [height, setHeight] = useState<number>(0);
  const photoType: boolean = challenge.tipe === "foto" || challenge.tipe === "cariObjek";
  // Quest foto dengan pertanyaan pembuka (kolom Opsi A–D di sheet, mis. P01): jawab dulu, lalu foto.
  // Pertanyaan tidak menghalangi: setelah benar atau kesempatan habis, lanjut ke foto.
  const hasWarmup: boolean = photoType && (challenge.opsi?.length ?? 0) > 0;
  const [warmupDone, setWarmupDone] = useState<boolean>(!hasWarmup);
  const left: number = challenge.batasPercobaan - attempts;
  const choices: readonly string[] = challenge.tipe === "benarSalah" ? ["Benar", "Salah"] : hasWarmup ? challenge.opsi ?? [] : [];

  if (photoType && warmupDone && outcome === null) {
    return (
      <PhotoTaskScreen
        title={challenge.judul}
        instruction={challenge.instruksi}
        target={challenge.target}
        hint={challenge.hint}
        onBack={onBack}
        onDone={(): void => {
          const graded: Promise<ServerGrade> | null = grade?.({ kind: "photo" }) ?? null;
          if (graded === null) {
            setOutcome(true);
            return;
          }
          void apply(graded);
        }}
        testMode={testMode}
        references={references}
      />
    );
  }

  function checkWarmup(index: number): void {
    const used: number = attempts + 1;
    setAttempts(used);
    if ("ABCD"[index] === challenge.kunci || used >= challenge.batasPercobaan) {
      setWrong(false);
      setWarmupDone(true);
    } else setWrong(true);
  }

  async function apply(graded: Promise<ServerGrade>): Promise<void> {
    setSending(true);
    setSendError(null);
    try {
      const result: ServerGrade = await graded;
      setAttempts(result.attempts);
      setServerHint(result.hint);
      if (result.correct) {
        setServerPoints(result.points);
        setOutcome(true);
      } else if (result.failed) {
        setServerPoints(0);
        setOutcome(false);
      } else setWrong(true);
    } catch (cause: unknown) {
      setSendError(cause instanceof Error ? cause.message : "Jawaban belum terkirim. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  function check(value: string): void {
    if (sending) return;
    const graded: Promise<ServerGrade> | null = grade?.(
      challenge.tipe === "benarSalah" ? { kind: "choice", choice: value } : { kind: "text", text: value },
    ) ?? null;
    if (graded !== null) {
      setWrong(false);
      void apply(graded);
      return;
    }
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
          {(!photoType || !warmupDone) && outcome === null && (
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
              {choices.length > 0
                ? (
                  <View accessibilityRole="radiogroup" style={hasWarmup ? styles.optionList : styles.options}>
                    {choices.map((label: string, index: number): ReactElement => (
                      <Pressable
                        key={label}
                        accessibilityRole="radio"
                        onPress={(): void => {
                          if (hasWarmup) checkWarmup(index);
                          else check(label);
                        }}
                        style={({ pressed }) => [styles.option, hasWarmup && styles.optionRow, pressed && styles.pressed]}
                      >
                        <GeaText variant="bold16" color={colors.primary[900]}>
                          {hasWarmup ? `${"ABCD"[index]}. ${label}` : label}
                        </GeaText>
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
                  {(serverHint ?? challenge.hint) != null && (
                    <GeaText variant="body14" color={componentColors.bodyDark}>{serverHint ?? challenge.hint}</GeaText>
                  )}
                </View>
              )}
              {sendError !== null && (
                <GeaText variant="body14" color={colors.danger[500]} accessibilityRole="alert">{sendError}</GeaText>
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
                    ? `Benar! +${serverPoints ?? challenge.poin} poin`
                    : "Kesempatan habis"}
                </GeaText>
                {photoType && <GeaText variant="body14" color={componentColors.bodyDark}>+{serverPoints ?? challenge.poin} poin</GeaText>}
              </View>
              {challenge.penjelasan !== undefined && (
                <GeaText variant="body16" color={componentColors.bodyDark}>{challenge.penjelasan}</GeaText>
              )}
              <StoryButton
                label="Lanjut"
                onPress={(): void => onDone({
                  success: outcome,
                  // Poin dari server sudah masuk pointsAwarded.
                  points: serverPoints !== null ? 0 : outcome ? challenge.poin : 0,
                  attempts: photoType ? 0 : attempts,
                })}
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
  optionList: { gap: spacing[8] },
  optionRow: { flex: 0, alignItems: "flex-start", padding: spacing[12] },
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
