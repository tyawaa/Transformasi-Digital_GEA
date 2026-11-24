import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Toast } from "../../../design/Toast";
import { AnimatedNotification } from "../../../design/AnimatedNotification";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type {
  AnswerResult,
  OptionLabel,
  PoiDetail,
  PoiVerification,
  Quest,
  Visit,
} from "../../../domain/contracts";
import {
  ACTIVITIES,
  activitiesDone,
  type ActivityId,
  type BadgeDef,
  badges,
  type BadgeId,
} from "../../../domain/points";
import { GeaServiceError, readableError } from "../../../services/api";
import { readVisitorLocation, type LocationReading } from "../../../services/location";
import { type Fix, stepGeofence } from "../../../domain/geofence";
import { type StoriesSource } from "../../../services/stories";
import { museumPoiById, type StoryContent } from "../../../data/museum";
import { storyRecording } from "../../../data/poiAudio";
import { audioSource } from "../../../services/media";
import { SceneLayer } from "../../onboarding/scene";
import { type ParsedQr, qrErrorMessage } from "../../qr/qrPayload";
import type { PoiProgress } from "../progress";
import { isiPanelLayer, StoryBackground } from "./backgrounds";
import { BackButton, FRAME_H, FrameStage, PhotoFrame, StoryButton } from "./parts";
import { type DummyScan, ScanQrScreen, type ScanState } from "./ScanQrScreen";
import { StoryAudio } from "./StoryAudio";
import { QuestListScreen, QuestTaskScreen } from "./QuestScreens";
import { ExplorerResultScreen, StoryFinishedScreen } from "./StoryEndScreens";
import { type AdventureSummary, ShareResultScreen, WellDoneScreen } from "./AdventureDoneScreens";

const speakerIcon = require("../../../../assets/design/icon-speaker.svg") as number;

// Scan QR / GPS → cerita dan ilustrasi → Kisah Selesai → daftar quest per POI → hasil.
type Step =
  | "gps"
  | "scan"
  | "loading"
  | "summary"
  | "story"
  | "story2"
  | "narration"
  | "storyDone"
  | "quests"
  | "quest"
  | "result"
  | "final"
  | "share";

// Story Isi: teks mulai y=592, tombol berjarak 52 dari bawah. Panel cokelat (gambar) cukup sampai
// ±y=860; di bawahnya diisi warna yang sama saat cerita panjang.
const ISI_TOP = 592;
const ISI_BOTTOM = 52;
const ISI_FILL_TOP = 860;

type Props = {
  readonly source: StoriesSource;
  readonly visit: Visit;
  readonly poiId: string;
  /** Token QR koleksi yang sudah dipindai dari peta; langsung diverifikasi. */
  readonly initialToken?: string | null;
  readonly gpsFix: Fix | null;
  /** Posisi yang dipilih secara eksplisit dalam Mode uji GPS; null memakai bacaan perangkat baru. */
  readonly gpsSimulation: Fix | null;
  readonly progressOf: (poiId: string) => PoiProgress;
  readonly onProgress: (poiId: string, patch: Partial<PoiProgress>) => void;
  readonly onAnswer: (answer: AnswerResult) => void;
  readonly totalPoints: number;
  readonly earnedBadges: readonly BadgeId[];
  readonly allCompleted: boolean;
  readonly adventure: AdventureSummary;
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
  return state.closed ? "quests" : "summary";
}

/**
 * Cerita diselesaikan sebelum daftar quest dibuka. Jawaban dan kesempatan disimpan per quest;
 * backend menentukan poin sesuai sheet. Aktivitas kamera terpisah dari cerita.
 */
type Reward = { readonly id: number; readonly points: number; readonly labels: readonly string[] };

/** Alur cerita + notifikasi poin kecil di atas layar. */
export function StoryFlow(props: Props): ReactElement {
  const [reward, setReward] = useState<Reward | null>(null);
  // Ukuran pil mengikuti skala frame 390 × 844 seperti layar lain.
  const { width, height } = useWindowDimensions();
  const scale: number = Math.min(width / 390, height / FRAME_H);
  function addRewards(items: readonly { readonly points: number; readonly label: string }[]): void {
    // Poin yang masuk bersamaan digabung jadi satu notifikasi.
    setReward((current: Reward | null): Reward => ({
      id: Date.now(),
      points: (current?.points ?? 0) + items.reduce((sum, item): number => sum + item.points, 0),
      labels: [...(current?.labels ?? []), ...items.map((item): string => item.label)],
    }));
  }
  return (
    <View style={styles.flowRoot}>
      <StoryFlowSteps {...props} onRewards={addRewards} />
      <View pointerEvents="box-none" style={[styles.rewardWrap, { top: (height - FRAME_H * scale) / 2 + 47 * scale, transform: [{ scale }] }]}>
        <AnimatedNotification style={styles.rewardToast}>
          {reward !== null ? (
            <Toast
              tone="success"
              title={`+${reward.points} Poin`}
              description={reward.labels.join(" · ")}
              countdown={{ id: reward.id, durationMs: 3000 }}
              onClose={(): void => setReward(null)}
            />
          ) : null}
        </AnimatedNotification>
      </View>
    </View>
  );
}

function StoryFlowSteps(props: Props & { readonly onRewards: (items: readonly { readonly points: number; readonly label: string }[]) => void }): ReactElement {
  const { source, visit, progressOf, onProgress } = props;
  const [poiId, setPoiId] = useState<string>(props.poiId);
  const [poi, setPoi] = useState<PoiDetail | null>(null);
  const progress: PoiProgress = progressOf(poiId);
  // Poin baru (aktivitas, kuis, tantangan) dibandingkan dengan keadaan sebelumnya → toast.
  const earnedBefore = useRef<{ readonly poiId: string; readonly activities: readonly ActivityId[]; readonly quiz: number; readonly challenge: number } | null>(null);
  useEffect((): void => {
    const now = {
      poiId,
      activities: activitiesDone(progress),
      quiz: progress.pointsAwarded,
      challenge: progress.challengePoints ?? 0,
    };
    const before = earnedBefore.current;
    earnedBefore.current = now;
    if (before === null || before.poiId !== poiId) return;
    const items: { points: number; label: string }[] = [];
    if (now.quiz > before.quiz) items.push({ points: now.quiz - before.quiz, label: "Jawaban benar" });
    if (now.challenge > before.challenge) items.push({ points: now.challenge - before.challenge, label: "Tantangan selesai" });
    for (const id of now.activities) {
      if (!before.activities.includes(id)) items.push({ points: ACTIVITIES[id].points, label: ACTIVITIES[id].label });
    }
    if (items.length > 0) props.onRewards(items);
  });
  // Lencana baru juga muncul sebagai toast poin.
  const badgesSeen = useRef<readonly BadgeId[]>(props.earnedBadges);
  useEffect((): void => {
    const fresh: readonly BadgeDef[] = badges.filter((badge: BadgeDef): boolean =>
      props.earnedBadges.includes(badge.id) && !badgesSeen.current.includes(badge.id)
    );
    badgesSeen.current = props.earnedBadges;
    if (fresh.length > 0) {
      props.onRewards(fresh.map((badge: BadgeDef) => ({ points: badge.bonus, label: `Lencana ${badge.name}` })));
    }
  }, [props.earnedBadges]);
  const verified: boolean = isVerified(progress);
  const [step, setStep] = useState<Step>(
    props.initialToken != null ? "scan" : "gps",
  );
  const [scanState, setScanState] = useState<ScanState>(props.initialToken != null ? "detected" : "scanning");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gpsAttempt, setGpsAttempt] = useState<number>(0);
  const [gpsLabel, setGpsLabel] = useState<string>("Memeriksa lokasi koleksi...");
  const checkpoint = museumPoiById(poiId);
  const gpsInsidePoi: boolean = checkpoint !== undefined && props.gpsFix !== null &&
    stepGeofence([], props.gpsFix, [{ ...checkpoint, id: poiId }]).inside.includes(poiId);
  // Kembali ke daftar quest setelah verifikasi lokasi diperbarui.
  const questPending = useRef<boolean>(false);
  const [narrationFrom, setNarrationFrom] = useState<"story" | "story2">("story");
  // Tinggi isi cerita (judul + teks + tombol); menentukan apakah halaman perlu digulir.
  const [isiHeight, setIsiHeight] = useState<number>(0);
  const isiStep: boolean = step === "story" || step === "story2" || step === "narration";
  // Quest yang dibuka dari daftar setelah cerita.
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // Muat ulang cerita yang sudah selesai atau masih terverifikasi.
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
    if (step !== "gps") return undefined;
    let active: boolean = true;
    setError(null);
    setGpsLabel("Memeriksa lokasi koleksi...");
    async function verifyGps(): Promise<void> {
      const reading: LocationReading = props.gpsSimulation === null
        ? await readVisitorLocation((message: string): void => { if (active) setGpsLabel(message); })
        : { status: "available", location: props.gpsSimulation };
      if (!active) return;
      if (reading.status !== "available") {
        throw new GeaServiceError(0, "LOCATION_UNAVAILABLE", "Posisi belum dapat dibaca. Periksa izin lokasi dan coba lagi, atau gunakan QR koleksi.");
      }
      const result: PoiVerification = await source.verifyPoiGps(visit.id_sesi, poiId, reading.location, visit.bahasa, visit.profil);
      if (active) acceptVerification(result);
    }
    void verifyGps().catch((cause: unknown): void => {
      console.warn("gea_poi_gps_failed", { poiId, error: readableError(cause) });
      if (active) setError(readableError(cause));
    });
    return (): void => { active = false; };
    // Pembaruan GPS tidak membatalkan verifikasi yang sedang berjalan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, poiId, gpsAttempt]);

  useEffect((): void => {
    if (step === "gps" && error !== null && gpsInsidePoi) {
      setGpsAttempt((attempt: number): number => attempt + 1);
    }
    // Coba lagi otomatis hanya saat posisi baru masuk radius, bukan berulang saat layanan gagal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsInsidePoi]);

  async function onScan(result: ParsedQr): Promise<void> {
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
    await verify(result.token);
  }

  async function verify(token: string): Promise<void> {
    setScanState("detected");
    setScanMessage(null);
    try {
      const result: PoiVerification = await source.verifyPoiQr(visit.id_sesi, token, visit.bahasa, visit.profil);
      setScanState("scanning");
      acceptVerification(result);
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

  function acceptVerification(result: PoiVerification): void {
    if (questPending.current && result.idPoi !== poiId) {
      throw new GeaServiceError(403, "WRONG_POI_QR", "QR ini untuk koleksi lain. Pindai QR koleksi yang questnya sedang kamu lanjutkan.");
    }
    const until: number = Date.parse(result.expiresAt);
    if (!Number.isFinite(until)) throw new Error("Masa berlaku verifikasi koleksi tidak valid.");
    onProgress(result.idPoi, { verifiedUntil: until, checkedIn: true });
    const state: PoiProgress = progressOf(result.idPoi);
    setPoiId(result.idPoi);
    setPoi(result.poi);
    setError(null);
    // Verifikasi ulang sebelum menjawab quest mengembalikan pengguna ke daftar.
    setStep(questPending.current ? "quests" : resumeStep(state));
    questPending.current = false;
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

  if (step === "gps") {
    return (
      <FrameStage background={colors.primary[300]}>
        <StoryBackground />
        <BackButton onPress={props.onExit} />
        <View style={[styles.centerBox, { top: 220, gap: spacing[16] }]}>
          <GeaText variant="heading28" color={colors.primary[900]} style={styles.center}>Memeriksa lokasi koleksi</GeaText>
          {error === null && <ActivityIndicator color={colors.primary[900]} />}
          <GeaText variant="body16" color={colors.primary[900]} accessibilityLiveRegion="polite" style={styles.center}>{error ?? gpsLabel}</GeaText>
          {error !== null && <StoryButton label="Periksa lokasi lagi" onPress={(): void => setGpsAttempt((attempt: number): number => attempt + 1)} />}
          <StoryButton label="Gunakan QR koleksi" onPress={(): void => { setError(null); setStep("scan"); }} />
        </View>
      </FrameStage>
    );
  }

  if (step === "scan") {
    return (
      <ScanQrScreen
        state={scanState}
        failMessage={scanMessage}
        onResult={onScan}
        onRetry={(): void => setScanState("scanning")}
        onBack={props.onExit}
        {...(props.initialToken == null && {
          title: `Pindai QR koleksi untuk membuka ${museumPoiById(poiId)?.name ?? "ceritanya"}`,
          helper: "Scan QR di dekat koleksi untuk membuka cerita dan tantangannya.",
        })}
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
  // Data lokal: konten anak dan quest dari sheet (questPlan memakai data lokal di semua mode); judul, fakta,
  // foto kedua, dan koleksi utamanya dari backend (description), data lokal hanya cadangan mode mock.
  const museumPoi = museumPoiById(poi.id_poi);
  const local: StoryContent | null = source.kind === "mock" ? museumPoi?.content ?? null : null;
  const secondPhoto: string = description.secondPhotoUrl;
  // Halaman ke-2 isi cerita ("Story Isi 2"): kartu koleksi yang disorot + fakta menarik.
  const highlights: readonly string[] = splitHighlights(description.highlights ?? undefined);
  const pageCount: number = highlights.length > 0 ? 2 : 1;
  // Anak: judul dan fakta dari Konten_Cerita_Anak (teks cerita anak datang dari sumber data sesuai profil).
  const kid: boolean = visit.profil === "anak";
  // Rekaman voice over kelompok didahulukan; audio dari sumber data hanya cadangan.
  const recording: number | undefined = museumPoi === undefined ? undefined : storyRecording(museumPoi.code, visit.profil);
  const narration: { readonly key: string; readonly source: number | { readonly uri: string }; readonly seconds: number } | null =
    recording !== undefined ? { key: `vo-${museumPoi?.code ?? poiId}-${visit.profil}`, source: recording, seconds: 30 }
      : audio !== null ? { key: audio.audioUrl, source: audioSource(audio.audioUrl), seconds: audio.durationSeconds } : null;
  const judul: string | undefined = (kid ? local?.judulAnak : undefined) ?? description.title ?? local?.judul;
  const fakta: string | undefined = (kid ? local?.faktaAnak : undefined) ?? description.fact ?? local?.fakta;
  const pageTwoTitle: string = fakta !== undefined ? "Fakta Menarik" : "Cari di Ruangan Ini";
  const pageTwoText: string = [fakta, highlights.length > 0 ? `Koleksi di ruangan ini: ${highlights.join(", ")}.` : undefined].filter((value: string | undefined): boolean => value !== undefined).join("\n\n");
  const quests: readonly Quest[] = poi.quests.filter((quest: Quest): boolean => quest.isDisabled !== true);
  const selectedQuest: Quest | undefined = quests.find((quest: Quest): boolean => quest.idQuest === selectedQuestId);

  function showResult(): void {
    if (quests.length === 0) onProgress(poiId, { completed: true });
    setStep("result");
  }

  function openNarration(from: "story" | "story2"): void {
    setNarrationFrom(from);
    setStep("narration");
  }

  if (step === "storyDone") {
    return <StoryFinishedScreen poiName={poi.nama} hasActivity={quests.length > 0}
      actionLabel={quests.length > 0 ? "Lihat Daftar Quest" : "Lihat Hasil"}
      onAction={(): void => { if (quests.length > 0) setStep("quests"); else showResult(); }}
      onSkip={(): void => setStep("quests")} />;
  }

  if (step === "quests") {
    return <QuestListScreen poiName={poi.nama} quests={quests} results={progress.quests ?? {}}
      onPick={(quest: Quest): void => { setSelectedQuestId(quest.idQuest); setStep("quest"); }}
      onResult={showResult} onBack={props.onExit} />;
  }

  if (step === "quest" && selectedQuest !== undefined) {
    return <QuestTaskScreen key={selectedQuest.idQuest} quest={selectedQuest} profile={visit.profil} result={progress.quests?.[selectedQuest.idQuest]}
      onBack={(): void => setStep("quests")}
      submit={async (requestId: string, label: OptionLabel | null, text: string | null): Promise<AnswerResult> => {
        if (!isVerified(progressOf(poiId))) {
          questPending.current = true;
          setStep("gps");
          throw new GeaServiceError(403, "CHECKPOINT_VERIFICATION_REQUIRED", "Verifikasi lokasi koleksi diperlukan sebelum menjawab.");
        }
        try {
          const answer: AnswerResult = await source.answerQuest(visit.id_sesi, selectedQuest.idQuest, requestId, label, text === null ? {} : { jawabanTeks: text });
          props.onAnswer(answer);
          return answer;
        } catch (cause: unknown) {
          if (cause instanceof GeaServiceError && cause.code === "CHECKPOINT_VERIFICATION_REQUIRED") {
            onProgress(poiId, { verifiedUntil: null });
            questPending.current = true;
            setStep("gps");
          }
          throw cause;
        }
      }} />;
  }

  if (step === "final") {
    return <WellDoneScreen summary={props.adventure} onShare={(): void => setStep("share")} onHome={props.onExit} />;
  }
  if (step === "share") {
    return <ShareResultScreen summary={props.adventure} onBack={(): void => setStep("final")} />;
  }


  if (step === "result") {
    const completedCount: number = quests.filter((quest: Quest): boolean => progress.quests?.[quest.idQuest]?.completed === true).length;
    const stars: number = quests.length === 0 ? (progress.completed ? 3 : 0) : Math.round(3 * completedCount / quests.length);
    return (
      <ExplorerResultScreen
        poiName={poi.nama}
        stars={stars}
        conquered={progress.completed}
        score={progress.pointsAwarded + (progress.challengePoints ?? 0)}
        reward={props.totalPoints}
        allCompleted={props.allCompleted}
        explanation={quests.length > 0 ? `${completedCount} dari ${quests.length} quest berhasil. Quest yang belum selesai bisa dilanjutkan dari daftar quest.` : undefined}
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
          {narration !== null && <Pressable accessibilityRole="button" hitSlop={8} style={styles.audioMode} onPress={(): void => openNarration("story")}>
            <GeaText variant="body16" color={colors.primary[800]}>Aktifkan Mode Audio</GeaText>
            <AudioCircle />
          </Pressable>}
        </>
      )}

      {(step === "story" || step === "story2" || step === "narration") && (
        <>
          <BackButton onPress={props.onExit} />
          <PhotoFrame photoUrl={description.photoUrl} label={poi.nama} left={-21} top={86} box={301.076} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={-7.66} />
          <PhotoFrame photoUrl={secondPhoto} label={poi.nama} left={136} top={229} box={272.526} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={1.03} />
          <SceneLayer layer={isiPanelLayer} />
          {/* Panel cokelat diperpanjang ke bawah saat cerita panjang dan halaman digulir. */}
          <View style={[styles.isiFill, { height: Math.max(0, ISI_TOP + isiHeight + ISI_BOTTOM - ISI_FILL_TOP) }]} />
          {narration !== null && <Pressable
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
          </Pressable>}
          <View
            style={styles.isiContent}
            onLayout={(event): void => setIsiHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.isiTexts}>
              <GeaText variant="heading28" color={colors.secondaryYellow[100]} numberOfLines={2}>
                {step === "narration" ? "Dengarkan Narasi" : step === "story2" ? pageTwoTitle : judul ?? poi.nama}
              </GeaText>
              {step === "narration" && narration !== null
                ? <StoryAudio key={narration.key} source={narration.source} durationSeconds={narration.seconds} />
                : (
                  <View>
                    <GeaText variant="body16Tight" color={colors.secondaryYellow[0]}>
                      {step === "story2" ? pageTwoText : description.text}
                    </GeaText>
                    {step === "story" && pageCount === 1 && fakta !== undefined && (
                      <View style={styles.fact}>
                        <GeaText variant="bold16" color={colors.primary[900]}>Fakta menarik</GeaText>
                        <GeaText variant="body14" color={componentColors.bodyDark}>{fakta}</GeaText>
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

    </FrameStage>
  );
}

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

const styles = StyleSheet.create({
  flowRoot: { flex: 1 },
  rewardWrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 50, transformOrigin: "top" },
  rewardToast: { width: 360 },
  pressed: { opacity: 0.8 },
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
});
