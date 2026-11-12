import { randomUUID } from "expo-crypto";
import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Toast, type ToastTone } from "../../../design/Toast";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type {
  AnswerResult,
  OptionLabel,
  PoiDetail,
  PoiVerification,
  QuestOption,
  Visit,
} from "../../../domain/contracts";
import {
  attemptsLeft,
  type BadgeDef,
  badges,
  type BadgeId,
  isOutOfAttempts,
  MAX_ATTEMPTS,
  quizPoints,
} from "../../../domain/points";
import { GeaServiceError, readableError } from "../../../services/api";
import { type StoriesSource, storiesMockEnabled } from "../../../services/stories";
import { museumPoiById, type StoryContent } from "../../../data/museum";
import { mockMediaUrl } from "../../../services/media";
import { SceneLayer } from "../../onboarding/scene";
import { type ParsedQr, qrErrorMessage } from "../../qr/qrPayload";
import type { PoiProgress } from "../progress";
import { isiPanelLayer, StoryBackground } from "./backgrounds";
import { BackButton, FRAME_H, FrameStage, PhotoFrame, StoryButton } from "./parts";
import { type DummyScan, ScanQrScreen, type ScanState } from "./ScanQrScreen";
import { StoryAudio } from "./StoryAudio";
import { ChallengeScreen } from "./ChallengeScreen";
import { PhotoTaskScreen } from "./PhotoTaskScreen";
import { ChallengeDoneScreen, ExplorerResultScreen, StoryFinalScreen, StoryFinishedScreen } from "./StoryEndScreens";

// Alur per koleksi (revisi 12 Nov 2026): Scan QR → Summary → Isi 1 → Isi 2 (kartu koleksi; ketuk = cari & foto)
// → Kisah Selesai → Tantangan (sheet Quest) → Yeay! → Mini Quiz → Selamat Penjelajah!
type Step =
  | "scan"
  | "loading"
  | "summary"
  | "story"
  | "story2"
  | "narration"
  | "photo"
  | "storyDone"
  | "challenge"
  | "challengeDone"
  | "quiz"
  | "result"
  | "final";

// Story Isi: teks mulai y=592, tombol berjarak 52 dari bawah. Panel cokelat (gambar) cukup sampai
// ±y=860; di bawahnya diisi warna yang sama saat cerita panjang.
const ISI_TOP = 592;
const ISI_BOTTOM = 52;
const ISI_FILL_TOP = 860;
// Kuis: kartu mulai paling tinggi di y=110 (di bawah tombol Keluar).
const CARD_TOP = 110;
const QUIZ_BOTTOM = 48;

type ToastMessage ={ readonly tone: ToastTone; readonly title: string; readonly description: string };

type Props = {
  readonly source: StoriesSource;
  readonly visit: Visit;
  readonly poiId: string;
  /** Token QR koleksi yang sudah dipindai dari peta; langsung diverifikasi. */
  readonly initialToken?: string | null;
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly onProgress: (poiId: string, patch: Partial<PoiProgress>) => void;
  readonly totalPoints: number;
  readonly earnedBadges: readonly BadgeId[];
  readonly allCompleted: boolean;
  readonly dummyScans: readonly DummyScan[];
  /** Ruangan berikutnya di rute rekomendasi, mis. "P08 · Terjadinya Tenaga Tektonik". */
  readonly nextStop?: string | null;
  readonly onExit: () => void;
};

function isVerified(progress: PoiProgress): boolean {
  return progress.verifiedUntil !== null && progress.verifiedUntil > Date.now();
}

/** Langkah saat koleksi dibuka lagi, sesuai progres yang tersimpan. */
function resumeStep(state: PoiProgress): Step {
  if (state.completed || state.failed) return "result";
  if (state.challengeDone === true) return "challengeDone";
  return state.closed ? "storyDone" : "summary";
}

/**
 * Alur Story: Scan QR → Summary → Isi 1 → Isi 2 (cari & foto koleksi) → Kisah Selesai → Tantangan
 * → Yeay! → Mini Quiz → Selamat Penjelajah. Mini Quiz hanya aktif setelah QR koleksi terverifikasi
 * (maks. 3 percobaan, poin 20/10/5/0). Tantangan dan foto koleksi dinilai di aplikasi.
 */
export function StoryFlow(props: Props): ReactElement {
  const { source, visit, progressOf, onProgress } = props;
  const [poiId, setPoiId] = useState<string>(props.poiId);
  const [poi, setPoi] = useState<PoiDetail | null>(null);
  const progress: PoiProgress = progressOf(poiId);
  const verified: boolean = isVerified(progress);
  const [step, setStep] = useState<Step>(
    props.initialToken != null ? "scan" : progress.completed || progress.failed || verified ? "loading" : "scan",
  );
  const [scanState, setScanState] = useState<ScanState>(props.initialToken != null ? "detected" : "scanning");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const badgesAtStart = useRef<readonly BadgeId[]>(props.earnedBadges);
  // true = pengguna menuju Mini Quiz tetapi verifikasi QR sudah habis; setelah scan langsung ke kuis.
  const quizPending = useRef<boolean>(false);
  const [narrationFrom, setNarrationFrom] = useState<"story" | "story2">("story");
  // Tinggi isi cerita (judul + teks + tombol); menentukan apakah halaman perlu digulir.
  const [isiHeight, setIsiHeight] = useState<number>(0);
  const isiStep: boolean = step === "story" || step === "story2" || step === "narration";
  // Tinggi kartu kuis; halaman digulir bila tidak muat di 844.
  const [quizHeight, setQuizHeight] = useState<number>(0);
  // Kartu koleksi (Story Isi 2) yang sedang dicari & difoto.
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);

  // Masuk tanpa scan (sudah selesai / masih terverifikasi / "Mulai tanpa scan").
  useEffect((): (() => void) | undefined => {
    if (step !== "loading") return undefined;
    let active = true;
    source.poiDetail(poiId, visit.bahasa, visit.profil).then(
      (detail: PoiDetail): void => {
        if (!active) return;
        setPoi(detail);
        const state: PoiProgress = progressOf(poiId);
        setStep(resumeStep(state));
      },
      (cause: unknown): void => {
        if (active) setError(readableError(cause));
      },
    );
    return (): void => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, poiId]);

  useEffect((): void => {
    if (props.initialToken != null) void verify(props.initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect((): (() => void) | undefined => {
    if (toast === null) return undefined;
    const timer = setTimeout((): void => setToast(null), 5000);
    return (): void => clearTimeout(timer);
  }, [toast]);

  function onScan(result: ParsedQr): void {
    if (!result.ok) {
      setScanMessage(qrErrorMessage(result.reason));
      setScanState("failed");
      return;
    }
    if (result.kind === "entrance" || result.kind === "zone") {
      setScanMessage("Ini QR ruangan. Scan QR yang ada di dekat koleksi.");
      setScanState("failed");
      return;
    }
    void verify(result.token);
  }

  async function verify(token: string): Promise<void> {
    setScanState("detected");
    setScanMessage(null);
    try {
      const result: PoiVerification = await source.verifyPoiQr(visit.id_sesi, token, visit.bahasa, visit.profil);
      const until: number = Date.parse(result.expiresAt);
      onProgress(result.idPoi, { verifiedUntil: Number.isNaN(until) ? null : until });
      const state: PoiProgress = progressOf(result.idPoi);
      setPoiId(result.idPoi);
      setPoi(result.poi);
      setScanState("scanning");
      // Scan ulang setelah tantangan (verifikasi kedaluwarsa) → lanjut ke kuis.
      setStep(quizPending.current ? "quiz" : resumeStep(state));
      quizPending.current = false;
    } catch (cause: unknown) {
      console.warn("gea_poi_qr_failed", { error: readableError(cause) });
      setScanMessage(
        cause instanceof GeaServiceError && cause.code === "POI_QR_INVALID"
          ? "QR tidak dikenali. Scan QR di dekat koleksi."
          : readableError(cause),
      );
      setScanState("failed");
    }
  }

  async function finishStory(): Promise<void> {
    setError(null);
    try {
      await source.closeCard(visit.id_sesi, poiId);
      onProgress(poiId, { closed: true });
      setStep("storyDone");
    } catch (cause: unknown) {
      setError(readableError(cause));
    }
  }

  if (step === "scan") {
    return (
      <ScanQrScreen
        state={scanState}
        failMessage={scanMessage}
        onResult={onScan}
        onRetry={(): void => setScanState("scanning")}
        onBack={props.onExit}
        onSkip={(): void => setStep("loading")}
        dummies={props.dummyScans}
      />
    );
  }

  if (poi === null) {
    return (
      <FrameStage background={colors.primary[300]}>
        <StoryBackground />
        <BackButton onPress={props.onExit} />
        <View style={styles.centerBox}>
          {error === null
            ? <ActivityIndicator color={colors.primary[900]} />
            : <GeaText variant="body16" color={colors.black} style={styles.center}>{error}</GeaText>}
        </View>
      </FrameStage>
    );
  }

  const [description, audio] = poi.cards;
  // Kolom tambahan dari sheet (judul, fakta, penjelasan, foto survei) bila ada di data lokal.
  const museumPoi = museumPoiById(poi.id_poi);
  const local: StoryContent | null = museumPoi?.content ?? null;
  const secondPhoto: string = museumPoi !== undefined && local?.fotoKedua !== undefined
    ? mockMediaUrl(`/poi/${museumPoi.code}/${local.fotoKedua}`)
    : description.photoUrl;
  // Halaman ke-2 isi cerita ("Story Isi 2"): kartu koleksi yang disorot + fakta menarik.
  const highlights: readonly string[] = splitHighlights(local?.sorotan).slice(0, 4);
  const pageCount: number = highlights.length > 0 ? 2 : 1;
  const pageTwoTitle: string = local?.fakta !== undefined ? "Fakta Menarik" : "Cari di Ruangan Ini";
  const pageTwoText: string = `${local?.fakta !== undefined ? `${local.fakta}\n\n` : ""}Ketuk kartu koleksi di atas, cari koleksinya di ruangan ini, lalu foto.`;
  const photos: readonly number[] = progress.photos ?? [];
  const challenge = local?.tantangan;

  /** Ke Mini Quiz; bila verifikasi QR koleksi sudah habis, scan ulang dulu. */
  function goQuiz(): void {
    if (isVerified(progressOf(poiId))) {
      setStep("quiz");
      return;
    }
    quizPending.current = true;
    setScanMessage(null);
    setScanState("scanning");
    setStep("scan");
  }
  function openNarration(from: "story" | "story2"): void {
    setNarrationFrom(from);
    setStep("narration");
  }

  if (step === "photo" && photoIndex !== null) {
    const item: string = highlights[photoIndex] ?? "";
    return (
      <PhotoTaskScreen
        title="Cari & foto koleksi ini"
        instruction={item}
        target={`${item} terlihat jelas, sebaiknya bersama labelnya`}
        onBack={(): void => setStep("story2")}
        onDone={(): void => {
          onProgress(poiId, { photos: [...new Set([...photos, photoIndex])] });
          setStep("story2");
        }}
        testMode={storiesMockEnabled}
      />
    );
  }

  if (step === "storyDone") {
    return (
      <StoryFinishedScreen
        poiName={poi.nama}
        actionLabel={challenge !== undefined ? "Lakukan Tantangan" : "Lanjut ke Mini Quiz"}
        onAction={(): void => {
          if (challenge === undefined) goQuiz();
          else setStep(progress.challengeDone === true ? "challengeDone" : "challenge");
        }}
        onSkip={goQuiz}
      />
    );
  }

  if (step === "challenge" && challenge !== undefined) {
    return (
      <ChallengeScreen
        challenge={challenge}
        onBack={(): void => setStep("storyDone")}
        onDone={({ points }): void => {
          onProgress(poiId, { challengeDone: true, challengePoints: points });
          setStep("challengeDone");
        }}
        testMode={storiesMockEnabled}
      />
    );
  }

  if (step === "challengeDone") {
    return (
      <ChallengeDoneScreen
        poiName={poi.nama}
        success={challenge === undefined || (progress.challengePoints ?? 0) > 0}
        onQuiz={goQuiz}
        onSkip={(): void => setStep("result")}
      />
    );
  }

  if (step === "final") {
    return <StoryFinalScreen poiName={poi.nama} nextStop={props.nextStop ?? null} onHome={props.onExit} />;
  }

  const newBadges: readonly BadgeDef[] = badges.filter((badge: BadgeDef): boolean =>
    props.earnedBadges.includes(badge.id) && !badgesAtStart.current.includes(badge.id)
  );
  const score: number = quizPoints(progress) + (progress.challengePoints ?? 0);

  if (step === "result") {
    // Bintang dari Mini Quiz: benar di percobaan 1/2/3 = 3/2/1 bintang.
    const stars: number = progress.completed ? Math.max(1, 4 - progress.attempts) : 0;
    return (
      <ExplorerResultScreen
        poiName={poi.nama}
        stars={stars}
        conquered={progress.completed}
        score={score}
        reward={props.totalPoints}
        explanation={progress.completed || progress.failed ? local?.penjelasan : undefined}
        extra={[
          ...(props.nextStop != null ? [`Berikutnya di rutemu: ${props.nextStop}`] : []),
          ...newBadges.map((badge: BadgeDef): string => `Lencana baru: ${badge.name} (+${badge.bonus} poin)`),
        ]}
        onHome={(): void => {
          if (props.allCompleted) setStep("final");
          else props.onExit();
        }}
      />
    );
  }

  return (
    <FrameStage
      background={colors.primary[300]}
      frameHeight={isiStep
        ? ISI_TOP + isiHeight + ISI_BOTTOM
        : step === "quiz"
        ? CARD_TOP + quizHeight + QUIZ_BOTTOM
        : FRAME_H}
      scrollKey={step}
    >
      <StoryBackground />

      {step === "summary" && (
        <>
          <BackButton onPress={props.onExit} />
          <PhotoFrame photoUrl={description.photoUrl} label={poi.nama} left={10} top={150} box={352} size={{ width: 330, height: 322 }} border={14} rotate={-1.6} />
          {/* "Story Summary (2)": kartu putih di bawah foto, tombol Mulai Cerita di kanan. */}
          <View style={styles.summaryCard}>
            <GeaText variant={poi.nama.length > 24 ? "heading24" : "heading28"} color={colors.primary[900]} numberOfLines={2}>
              {poi.nama}
            </GeaText>
            <GeaText variant="body16Tight" color={componentColors.cardBody} numberOfLines={3}>{description.text}</GeaText>
            <StoryButton label="Mulai Cerita" onPress={(): void => setStep("story")} style={styles.summaryButton} />
          </View>
          <Pressable accessibilityRole="button" hitSlop={8} style={styles.audioMode} onPress={(): void => openNarration("story")}>
            <GeaText variant="body16" color={colors.primary[800]}>Aktifkan Mode Audio</GeaText>
            <AudioCircle />
          </Pressable>
        </>
      )}

      {(step === "story" || step === "story2" || step === "narration") && (
        <>
          <BackButton onPress={props.onExit} />
          {step === "story2" && highlights.length > 0
            ? (
              <HighlightCards
                items={highlights}
                done={photos}
                onPick={(index: number): void => {
                  setPhotoIndex(index);
                  setStep("photo");
                }}
              />
            )
            : (
              <>
                <PhotoFrame photoUrl={description.photoUrl} label={poi.nama} left={-21} top={86} box={301.076} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={-7.66} />
                <PhotoFrame photoUrl={secondPhoto} label={poi.nama} left={136} top={229} box={272.526} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={1.03} />
              </>
            )}
          <SceneLayer layer={isiPanelLayer} />
          {/* Panel cokelat diperpanjang ke bawah saat cerita panjang dan halaman digulir. */}
          <View style={[styles.isiFill, { height: Math.max(0, ISI_TOP + isiHeight + ISI_BOTTOM - ISI_FILL_TOP) }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step === "narration" ? "Tutup narasi" : "Dengarkan narasi"}
            hitSlop={8}
            style={styles.audioButton}
            onPress={(): void => {
              if (step === "narration") setStep(narrationFrom);
              else openNarration(step === "story2" ? "story2" : "story");
            }}
          >
            <AudioCircle active={step === "narration"} />
          </Pressable>
          <View
            style={styles.isiContent}
            onLayout={(event): void => setIsiHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.isiTexts}>
              <GeaText variant="heading28" color={colors.secondaryYellow[100]} numberOfLines={2}>
                {step === "narration" ? "Dengarkan Narasi" : step === "story2" ? pageTwoTitle : local?.judul ?? poi.nama}
              </GeaText>
              {step === "narration"
                ? <StoryAudio key={audio.audioUrl} audioUrl={audio.audioUrl} durationSeconds={audio.durationSeconds} />
                : (
                  <View>
                    <GeaText variant="body16Tight" color={colors.secondaryYellow[0]}>
                      {step === "story2" ? pageTwoText : description.text}
                    </GeaText>
                    {step === "story" && pageCount === 1 && local?.fakta !== undefined && (
                      <View style={styles.fact}>
                        <GeaText variant="bold16" color={colors.primary[900]}>Fakta menarik</GeaText>
                        <GeaText variant="body14" color={componentColors.bodyDark}>{local.fakta}</GeaText>
                      </View>
                    )}
                  </View>
                )}
            </View>
            {error !== null && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">{error}</GeaText>}
            <View style={styles.isiNav}>
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                style={styles.flex}
                onPress={(): void => {
                  if (step === "narration") setStep(narrationFrom);
                  else setStep(step === "story2" ? "story" : "summary");
                }}
              >
                <GeaText variant="body16Tight" color={colors.secondaryYellow[100]} style={styles.link}>Kembali</GeaText>
              </Pressable>
              <StoryButton
                label="Lanjut"
                style={styles.shadowed}
                onPress={(): void => {
                  const from: "story" | "story2" = step === "narration" ? narrationFrom : step === "story2" ? "story2" : "story";
                  if (from === "story" && pageCount > 1) setStep("story2");
                  else void finishStory();
                }}
              />
            </View>
          </View>
        </>
      )}

      {step === "quiz" && (
        <Quiz
          poi={poi}
          attemptsUsed={progress.attempts}
          submit={(requestId: string, label: OptionLabel): Promise<AnswerResult> =>
            source.answerQuest(visit.id_sesi, poi.quest.idQuest, requestId, label)}
          onWrong={(answer: AnswerResult): void => {
            const failed: boolean = answer.failed ?? isOutOfAttempts(answer.attemptCount);
            onProgress(poiId, { attempts: answer.attemptCount, failed });
            if (failed) {
              setToast(null);
              setStep("result");
              return;
            }
            setToast({
              tone: "danger",
              title: `Belum tepat · sisa ${MAX_ATTEMPTS - answer.attemptCount} kesempatan`,
              description: answer.hint ?? "Coba amati koleksinya lagi.",
            });
          }}
          onCorrect={(answer: AnswerResult): void => {
            onProgress(poiId, { completed: true, attempts: answer.attemptCount });
            setToast(null);
            setStep("result");
          }}
          onError={(cause: unknown): void => {
            if (cause instanceof GeaServiceError && cause.code === "CHECKPOINT_VERIFICATION_REQUIRED") {
              onProgress(poiId, { verifiedUntil: null });
              setScanState("scanning");
              setStep("scan");
              return;
            }
            if (cause instanceof GeaServiceError && cause.code === "QUEST_ALREADY_COMPLETED") {
              onProgress(poiId, { completed: true });
              setStep("result");
              return;
            }
            if (cause instanceof GeaServiceError && cause.code === "QUEST_ATTEMPTS_EXHAUSTED") {
              onProgress(poiId, { failed: true, attempts: Math.max(progress.attempts, MAX_ATTEMPTS) });
              setStep("result");
              return;
            }
            setToast({ tone: "danger", title: "Jawaban belum terkirim", description: readableError(cause) });
          }}
          onBack={(): void => setStep("challengeDone")}
          onHeight={setQuizHeight}
        />
      )}

      {toast !== null && (
        <View style={styles.toast}>
          <Toast tone={toast.tone} title={toast.title} description={toast.description} onClose={(): void => setToast(null)} />
        </View>
      )}
    </FrameStage>
  );
}

/** SEMENTARA: frame "Story - Mini quiz" (D4) belum final. Maksimal 3 percobaan, hint setelah salah. */
function Quiz(
  { poi, attemptsUsed, submit, onWrong, onCorrect, onError, onBack, onHeight }: {
    readonly poi: PoiDetail;
    readonly attemptsUsed: number;
    readonly submit: (requestId: string, label: OptionLabel) => Promise<AnswerResult>;
    readonly onWrong: (answer: AnswerResult) => void;
    readonly onCorrect: (answer: AnswerResult) => void;
    readonly onError: (cause: unknown) => void;
    readonly onBack: () => void;
    /** Tinggi kartu kuis, agar halaman bisa digulir bila soal/petunjuk panjang. */
    readonly onHeight: (height: number) => void;
  },
): ReactElement {
  const [selected, setSelected] = useState<OptionLabel | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [hint, setHint] = useState<string | null>(null);
  const [wrong, setWrong] = useState<readonly OptionLabel[]>([]);
  // Percobaan yang gagal karena jaringan dikirim ulang dengan requestId yang sama.
  const pending = useRef<{ label: OptionLabel; requestId: string } | null>(null);
  const left: number = attemptsLeft({ completed: false, failed: false, attempts: attemptsUsed });

  async function send(): Promise<void> {
    if (selected === null) return;
    const attempt = pending.current !== null && pending.current.label === selected
      ? pending.current
      : { label: selected, requestId: randomUUID() };
    pending.current = attempt;
    setBusy(true);
    try {
      const answer: AnswerResult = await submit(attempt.requestId, attempt.label);
      pending.current = null;
      if (answer.completed) onCorrect(answer);
      else {
        setWrong((current) => [...current, attempt.label]);
        setSelected(null);
        setHint(answer.hint);
        onWrong(answer);
      }
    } catch (cause: unknown) {
      if (cause instanceof GeaServiceError) pending.current = null;
      onError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BackButton onPress={onBack} />
      <View style={styles.quizCard} onLayout={(event): void => onHeight(event.nativeEvent.layout.height)}>
        <View style={styles.quizHeader}>
          <GeaText variant="label16" color={colors.primary[700]}>MINI QUIZ</GeaText>
          <GeaText variant="label16" color={colors.primary[700]} accessibilityLabel={`Sisa ${left} kesempatan`}>
            {"●".repeat(left)}{"○".repeat(MAX_ATTEMPTS - left)}
          </GeaText>
        </View>
        <GeaText variant="heading24" color={colors.primary[900]}>{poi.quest.pertanyaan}</GeaText>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {poi.quest.options.map((option: QuestOption): ReactElement => {
            const active: boolean = selected === option.label_opsi;
            const crossed: boolean = wrong.includes(option.label_opsi);
            return (
              <Pressable
                key={option.label_opsi}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled: busy || crossed }}
                disabled={busy || crossed}
                onPress={(): void => setSelected(option.label_opsi)}
                style={[
                  styles.option,
                  { borderColor: active ? colors.primary[800] : colors.primary[400] },
                  crossed && styles.optionCrossed,
                ]}
              >
                <View style={[styles.letter, { backgroundColor: active ? colors.primary[800] : colors.primary[0] }]}>
                  <GeaText variant="bold16" color={active ? colors.secondaryYellow[0] : colors.primary[900]}>{option.label_opsi}</GeaText>
                </View>
                <GeaText variant="body16" color={colors.black} style={[styles.flex, crossed && styles.strike]}>{option.teks_opsi}</GeaText>
              </Pressable>
            );
          })}
        </View>
        {hint !== null && (
          <View accessibilityLiveRegion="polite" style={styles.hint}>
            <GeaText variant="bold16" color={colors.warning[500]}>Petunjuk</GeaText>
            <GeaText variant="body14" color={componentColors.bodyDark}>{hint}</GeaText>
          </View>
        )}
        <StoryButton label={busy ? "Memeriksa..." : "Kirim Jawaban"} disabled={selected === null || busy} onPress={(): void => void send()} />
      </View>
    </>
  );
}

const speakerIcon = require("../../../../assets/design/icon-speaker.svg") as number;
const cameraIcon = require("../../../../assets/design/icon-camera.svg") as number;

/** Tombol speaker bulat krem dari desain ("Aktifkan Mode Audio" dan panel isi cerita). */
function AudioCircle({ active = false }: { readonly active?: boolean }): ReactElement {
  return (
    <View style={[styles.audioIcon, active && styles.audioIconActive]}>
      <Image accessible={false} source={speakerIcon} style={styles.icon24} />
    </View>
  );
}

/** Pisahkan "A (x, y), B, C" per koma di luar tanda kurung. */
function splitHighlights(text: string | undefined): string[] {
  if (text === undefined) return [];
  const out: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === "," && depth === 0) {
      if (current.trim() !== "") out.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim() !== "") out.push(current.trim());
  return out
    .map((item: string): string => item.replace(/^dan\s+/i, ""))
    .map((item: string): string => item.charAt(0).toUpperCase() + item.slice(1));
}

// Posisi kartu bertumpuk seperti frame "Story - Story Isi 2".
const CARD_SPOTS: readonly { left: number; top: number; rotate: number }[] = [
  { left: 32, top: 132, rotate: -1.6 },
  { left: 78, top: 216, rotate: 1.2 },
  { left: 26, top: 300, rotate: -1.1 },
  { left: 86, top: 386, rotate: 1.4 },
];

/**
 * "Story Isi 2": kartu koleksi bertumpuk. Ketuk kartu → layar cari & foto koleksi itu.
 * Kotak centang di tepi kanan kartu terisi setelah koleksinya difoto.
 */
function HighlightCards(
  { items, done, onPick }: {
    readonly items: readonly string[];
    /** Indeks kartu yang sudah difoto. */
    readonly done: readonly number[];
    readonly onPick: (index: number) => void;
  },
): ReactElement {
  return (
    <>
      {items.map((item: string, i: number): ReactElement => {
        const spot = CARD_SPOTS[i] ?? { left: 32, top: 132, rotate: 0 };
        const checked: boolean = done.includes(i);
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Cari dan foto ${item}${checked ? ", sudah difoto" : ""}`}
            onPress={(): void => onPick(i)}
            style={({ pressed }) => [
              styles.highlightCard,
              { left: spot.left, top: spot.top, transform: [{ rotate: `${spot.rotate}deg` }] },
              pressed && styles.pressed,
            ]}
          >
            <Image accessible={false} source={cameraIcon} style={styles.icon28} />
            <View style={styles.flex}>
              <GeaText variant="heading20" color={colors.secondaryGreen[900]}>CARI &amp; FOTO</GeaText>
              <GeaText variant="body14" color={componentColors.bodyDark} numberOfLines={2}>{item}</GeaText>
            </View>
            <View style={[styles.cardCheck, checked && styles.cardCheckDone]}>
              {checked && <GeaText variant="bold16" color={colors.secondaryGreen[900]}>✓</GeaText>}
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.8 },
  // Kotak centang menjorok keluar di tepi kanan kartu, seperti frame "Story Isi 2".
  cardCheck: {
    position: "absolute",
    right: -14,
    top: 16,
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: colors.primary[600],
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondaryYellow[0],
  },
  cardCheckDone: { backgroundColor: colors.secondaryGreen[100] },
  centerBox: { position: "absolute", left: 24, right: 24, top: 380, alignItems: "center" },
  center: { textAlign: "center" },
  summaryCard: {
    position: "absolute",
    left: 28,
    top: 498,
    width: 338,
    gap: spacing[12],
    padding: spacing[16],
    paddingTop: spacing[24],
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: colors.white,
    boxShadow: shadows.drop,
  },
  summaryButton: { alignSelf: "flex-end", paddingHorizontal: spacing[16], boxShadow: shadows.drop },
  shadowed: { paddingHorizontal: spacing[16], boxShadow: shadows.drop },
  audioMode: { position: "absolute", right: 16, top: 764, flexDirection: "row", alignItems: "center", gap: spacing[8] },
  audioButton: { position: "absolute", left: 330, top: 534 },
  audioIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondaryYellow[100],
  },
  audioIconActive: { backgroundColor: colors.secondaryGreen[300] },
  icon24: { width: 24, height: 24 },
  icon28: { width: 28, height: 28 },
  highlightCard: {
    position: "absolute",
    width: 285,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderWidth: 2.5,
    borderColor: colors.primary[600],
    borderRadius: 6,
    backgroundColor: colors.primary[0],
    boxShadow: shadows.card,
  },
  texts: { alignSelf: "stretch", gap: spacing[12] },
  // Isi cerita mengikuti panjang teks; minimal setinggi frame 844 (tombol tetap di bawah).
  isiContent: {
    position: "absolute",
    left: 16,
    width: 358,
    top: ISI_TOP,
    minHeight: FRAME_H - ISI_TOP - ISI_BOTTOM,
    gap: spacing[12],
  },
  isiTexts: { flex: 1, gap: spacing[12] },
  isiFill: { position: "absolute", left: 0, width: 390, top: ISI_FILL_TOP, backgroundColor: colors.primary[800] },
  fact: {
    marginTop: spacing[12],
    gap: spacing[4],
    padding: spacing[12],
    borderRadius: radius.control,
    backgroundColor: colors.secondaryYellow[100],
  },
  isiNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flex: { flex: 1 },
  link: { textDecorationLine: "underline" },
  quizCard: {
    position: "absolute",
    left: 16,
    width: 362,
    bottom: 48,
    gap: spacing[16],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: radius.control,
    backgroundColor: colors.primary[0],
  },
  quizHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  options: { gap: spacing[8] },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    padding: spacing[12],
    borderWidth: 1,
    borderRadius: radius.control,
    backgroundColor: colors.secondaryYellow[0],
  },
  optionCrossed: { opacity: 0.45 },
  strike: { textDecorationLine: "line-through" },
  letter: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  hint: { gap: spacing[4], padding: spacing[12], borderRadius: radius.control, backgroundColor: colors.warning[0] },
  toast: { position: "absolute", left: 15, top: 47, width: 360 },
});
