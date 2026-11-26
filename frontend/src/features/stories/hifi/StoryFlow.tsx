import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { Toast } from "../../../design/Toast";
import { AnimatedNotification } from "../../../design/AnimatedNotification";
import { SheetModal } from "../../../design/SheetModal";
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
import type { CapturedPhoto } from "../../../services/photo";
import { museumPoiById, type StoryContent } from "../../../data/museum";
import { storyRecording } from "../../../data/poiAudio";
import { localizeCopy, localizedPoiName } from "../../../data/localizedCopy";
import { localizedQuestsForPoi, normalizeLocalQuestAnswer } from "../../../data/quests";
import { audioSource } from "../../../services/media";
import { SceneLayer } from "../../onboarding/scene";
import { useLanguage } from "../../preferences/LanguageSettings";
import { type ParsedQr, qrErrorMessage } from "../../qr/qrPayload";
import type { PoiProgress } from "../progress";
import { isiPanelLayer, StoryBackground } from "./backgrounds";
import { BackButton, FRAME_H, FrameStage, PauseButton, PhotoFrame, StoryButton, useFrameBleed } from "./parts";
import { type DummyScan, ScanQrScreen, type ScanState } from "./ScanQrScreen";
import { AudioControls, type AudioControlsHandle, AudioToggle } from "./StoryAudio";
import { readExploreMode } from "../../eyesfree/mode";
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
  const { t } = useLanguage();
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
              title={`+${reward.points} ${t("Poin", "Points")}`}
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
  const { language, t } = useLanguage();
  const { source, visit, progressOf, onProgress } = props;
  const [poiId, setPoiId] = useState<string>(props.poiId);
  const [poi, setPoi] = useState<PoiDetail | null>(null);
  const { span } = useFrameBleed();
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
    if (now.quiz > before.quiz) items.push({ points: now.quiz - before.quiz, label: t("Jawaban benar", "Correct answer") });
    if (now.challenge > before.challenge) items.push({ points: now.challenge - before.challenge, label: t("Tantangan selesai", "Challenge completed") });
    for (const id of now.activities) {
      if (!before.activities.includes(id)) items.push({ points: ACTIVITIES[id].points, label: localizeCopy(ACTIVITIES[id].label, language) });
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
      props.onRewards(fresh.map((badge: BadgeDef) => ({ points: badge.bonus, label: t(`Lencana ${badge.name}`, `Badge ${localizeCopy(badge.name, language)}`) })));
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
  const [gpsLabel, setGpsLabel] = useState<readonly [string, string] | null>(null);
  const [gpsError, setGpsError] = useState<readonly [string, string] | null>(null);
  const checkpoint = museumPoiById(poiId);
  const gpsInsidePoi: boolean = checkpoint !== undefined && props.gpsFix !== null &&
    stepGeofence([], props.gpsFix, [{ ...checkpoint, id: poiId }]).inside.includes(poiId);
  // Kembali ke daftar quest setelah verifikasi lokasi diperbarui.
  const questPending = useRef<boolean>(false);
  // Tinggi isi cerita (judul + teks + tombol); menentukan apakah halaman perlu digulir.
  const [isiHeight, setIsiHeight] = useState<number>(0);
  const isiStep: boolean = step === "story" || step === "story2";
  // Quest yang dibuka dari daftar setelah cerita.
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  // "Istirahat Dulu": jeda cerita (dan narasi) sampai pengguna menekan "Siap" atau menutup modal.
  const [paused, setPaused] = useState<boolean>(false);
  // "Aktifkan Mode Audio" dari ringkasan: narasi langsung diputar begitu tiba di Story Isi.
  const [autoPlayNarration, setAutoPlayNarration] = useState<boolean>(false);
  const [eyesFree, setEyesFree] = useState<boolean>(false);
  const [audioExpandedOverride, setAudioExpanded] = useState<boolean | null>(null);
  const audioExpanded: boolean = audioExpandedOverride ?? eyesFree;
  const audioControls = useRef<AudioControlsHandle>(null);

  useEffect(() => {
    let active = true;
    void readExploreMode().then((mode): void => {
      if (active) setEyesFree(mode === "tanpa-layar");
    }).catch((cause: unknown): void => console.warn("gea_explore_mode_load_failed", cause));
    return (): void => { active = false; };
  }, []);

  // Muat ulang cerita yang sudah selesai atau masih terverifikasi.
  useEffect((): (() => void) | undefined => {
    if (step !== "loading") return undefined;
    let active = true;
    source.poiDetail(poiId, language, visit.profil).then(
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
    setGpsLabel(null);
    setGpsError(null);
    async function verifyGps(): Promise<void> {
      const reading: LocationReading = props.gpsSimulation === null
        ? await readVisitorLocation((message, english): void => { if (active) setGpsLabel([message, english]); })
        : { status: "available", location: props.gpsSimulation };
      if (!active) return;
      if (reading.status !== "available") {
        throw new GeaServiceError(0, "LOCATION_UNAVAILABLE", "Posisi belum dapat dibaca. Periksa izin lokasi dan coba lagi, atau gunakan QR koleksi.");
      }
      const result: PoiVerification = await source.verifyPoiGps(visit.id_sesi, poiId, reading.location, language, visit.profil);
      if (active) acceptVerification(result);
    }
    void verifyGps().catch((cause: unknown): void => {
      console.warn("gea_poi_gps_failed", { poiId, error: readableError(cause) });
      if (active) setGpsError([readableError(cause), englishGpsError(cause)]);
    });
    return (): void => { active = false; };
    // Pembaruan GPS tidak membatalkan verifikasi yang sedang berjalan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, poiId, gpsAttempt]);

  useEffect((): void => {
    if (step === "gps" && gpsError !== null && gpsInsidePoi) {
      setGpsAttempt((attempt: number): number => attempt + 1);
    }
    // Coba lagi otomatis hanya saat posisi baru masuk radius, bukan berulang saat layanan gagal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsInsidePoi]);

  async function onScan(result: ParsedQr): Promise<void> {
    if (!result.ok) {
      setScanMessage(qrErrorMessage(result.reason, language));
      setScanState("failed");
      return;
    }
    if (result.kind === "entrance" || result.kind === "zone") {
      setScanMessage(t("Ini QR ruangan. Scan QR yang ada di dekat koleksi.", "This QR code is for an entrance or zone. Scan the QR code near the collection."));
      setScanState("failed");
      return;
    }
    await verify(result.token);
  }

  async function verify(token: string): Promise<void> {
    setScanState("detected");
    setScanMessage(null);
    try {
      const result: PoiVerification = await source.verifyPoiQr(visit.id_sesi, token, language, visit.profil);
      setScanState("scanning");
      acceptVerification(result);
    } catch (cause: unknown) {
      console.warn("gea_poi_qr_failed", { error: readableError(cause) });
      setScanMessage(
        cause instanceof GeaServiceError && cause.code === "POI_QR_INVALID"
          ? t("QR tidak dikenali. Scan QR di dekat koleksi.", "Unrecognized QR code. Scan the QR code near the collection.")
          : t(readableError(cause), "Could not verify the QR code. Try scanning it again."),
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
    const message = gpsError ?? gpsLabel;
    return (
      <FrameStage background={colors.primary[300]}>
        <StoryBackground />
        <BackButton onPress={props.onExit} label={t("Keluar", "Exit")} />
        <View style={[styles.centerBox, { top: 220, gap: spacing[16] }]}>
          <GeaText variant="heading28" color={colors.primary[900]} style={styles.center}>{t("Memeriksa lokasi koleksi", "Checking your location")}</GeaText>
          {gpsError === null && <ActivityIndicator color={colors.primary[900]} />}
          <GeaText variant="body16" color={colors.primary[900]} accessibilityLiveRegion="polite" style={styles.center}>
            {message === null ? t("Memeriksa lokasi koleksi...", "Checking your location…") : t(...message)}
          </GeaText>
          {gpsError !== null && <StoryButton label={t("Periksa lokasi lagi", "Check location again")} onPress={(): void => setGpsAttempt((attempt: number): number => attempt + 1)} />}
          <StoryButton label={t("Gunakan QR koleksi", "Use collection QR code")} onPress={(): void => { setError(null); setStep("scan"); }} />
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
          title: t(
            `Pindai QR koleksi untuk membuka ${museumPoiById(poiId)?.name ?? "ceritanya"}`,
            `Scan the collection QR code to open ${museumPoiById(poiId)?.name ?? "the story"}`,
          ),
          helper: t("Scan QR di dekat koleksi untuk membuka cerita dan tantangannya.", "Scan the QR code near the collection to unlock the story and quests."),
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

  const [originalDescription, audio] = poi.cards;
  // Data lokal: konten anak dan quest dari sheet (questPlan memakai data lokal di semua mode); judul, fakta,
  // foto kedua, dan koleksi utamanya dari backend (description), data lokal hanya cadangan mode mock.
  const museumPoi = museumPoiById(poi.id_poi);
  const local: StoryContent | null = source.kind === "mock" && language === "id" ? museumPoi?.content ?? null : null;
  const english = language === "en" ? museumPoi?.content?.en?.[visit.profil === "anak" ? "anak" : "umum"] : undefined;
  const description = english === undefined ? originalDescription : {
    ...originalDescription, title: english.judul, text: english.cerita, fact: english.fakta, highlights: null,
  };
  const missingEnglish = language === "en" && english === undefined && poi.language !== "en";
  if (missingEnglish) {
    return <FrameStage background={colors.primary[300]}>
      <StoryBackground />
      <BackButton onPress={props.onExit} label="Back" />
      <View style={styles.centerBox}>
        <GeaText variant="body16" color={colors.primary[900]} accessibilityRole="alert">English text is not available for this collection.</GeaText>
      </View>
    </FrameStage>;
  }
  const poiName: string = museumPoi === undefined ? poi.nama : localizedPoiName(museumPoi, language);
  const secondPhoto: string = description.secondPhotoUrl;
  // Halaman ke-2 isi cerita ("Story Isi 2"): kartu koleksi yang disorot + fakta menarik.
  const highlights: readonly string[] = splitHighlights(description.highlights ?? undefined);
  const pageCount: number = highlights.length > 0 ? 2 : 1;
  // Anak: judul dan fakta dari Konten_Cerita_Anak (teks cerita anak datang dari sumber data sesuai profil).
  const kid: boolean = visit.profil === "anak";
  // Rekaman voice over kelompok didahulukan; audio dari sumber data hanya cadangan.
  const recording: number | undefined = museumPoi === undefined ? undefined : storyRecording(museumPoi.code, visit.profil, language);
  const narration: { readonly key: string; readonly source: number | { readonly uri: string }; readonly seconds: number } | null =
    recording !== undefined ? { key: `vo-${museumPoi?.code ?? poiId}-${visit.profil}-${language}`, source: recording, seconds: 30 }
      : audio !== null && poi.language === language ? { key: `${language}:${audio.audioUrl}`, source: audioSource(audio.audioUrl), seconds: audio.durationSeconds } : null;
  const judul: string | undefined = (kid ? local?.judulAnak : undefined) ?? description.title ?? local?.judul;
  const fakta: string | undefined = (kid ? local?.faktaAnak : undefined) ?? description.fact ?? local?.fakta;
  const pageTwoTitle: string = fakta !== undefined ? t("Fakta Menarik", "Fun Fact") : t("Cari di Ruangan Ini", "Find in This Room");
  const pageTwoText: string = [fakta, highlights.length > 0 ? t(`Koleksi di ruangan ini: ${highlights.join(", ")}.`, `Collections in this room: ${highlights.join(", ")}.`) : undefined].filter((value: string | undefined): boolean => value !== undefined).join("\n\n");
  const englishQuests: readonly Quest[] = language === "en" ? localizedQuestsForPoi(poiId, visit.profil, "en") : [];
  const quests: readonly Quest[] = poi.quests.filter((quest: Quest): boolean => quest.isDisabled !== true).map((quest: Quest): Quest => {
    const translation = englishQuests.find((entry) => entry.idQuest === quest.idQuest);
    if (translation === undefined) return quest;
    const { title, instruksi, pertanyaan, options } = translation;
    return { ...quest, title, instruksi, pertanyaan, options, hint: translation.hint, penjelasan: translation.penjelasan };
  });
  const selectedQuest: Quest | undefined = quests.find((quest: Quest): boolean => quest.idQuest === selectedQuestId);

  function showResult(): void {
    if (quests.length === 0) onProgress(poiId, { completed: true });
    setStep("result");
  }

  function requireQuestVerification(): void {
    if (!isVerified(progressOf(poiId))) {
      questPending.current = true;
      setStep("gps");
      throw new GeaServiceError(403, "CHECKPOINT_VERIFICATION_REQUIRED", "Verifikasi lokasi koleksi diperlukan sebelum menjawab.");
    }
  }

  function handleQuestError(cause: unknown): never {
    if (cause instanceof GeaServiceError && cause.code === "CHECKPOINT_VERIFICATION_REQUIRED") {
      onProgress(poiId, { verifiedUntil: null });
      questPending.current = true;
      setStep("gps");
    }
    throw cause;
  }

  if (step === "storyDone") {
    return <StoryFinishedScreen poiName={poiName} hasActivity={quests.length > 0}
      actionLabel={quests.length > 0 ? t("Lihat Daftar Quest", "View Quests") : t("Lihat Hasil", "View Results")}
      onAction={(): void => { if (quests.length > 0) setStep("quests"); else showResult(); }}
      onSkip={(): void => setStep("quests")} />;
  }

  if (step === "quests") {
    return <QuestListScreen poiName={poiName} quests={quests} results={progress.quests ?? {}}
      onPick={(quest: Quest): void => { setSelectedQuestId(quest.idQuest); setStep("quest"); }}
      onResult={showResult} onBack={props.onExit} />;
  }

  if (step === "quest" && selectedQuest !== undefined) {
    return <QuestTaskScreen key={selectedQuest.idQuest} quest={selectedQuest} profile={visit.profil} eyesFree={eyesFree} result={progress.quests?.[selectedQuest.idQuest]}
      onBack={(): void => setStep("quests")}
      submitPhoto={async (requestId: string, photo: CapturedPhoto): Promise<AnswerResult> => {
        requireQuestVerification();
        try {
          const answer: AnswerResult = await source.answerPhotoQuest(visit.id_sesi, selectedQuest.idQuest, requestId, photo, visit.profil);
          if (answer.photoDecision === "accepted") props.onAnswer(answer);
          return answer;
        } catch (cause: unknown) {
          return handleQuestError(cause);
        }
      }}
      submit={async (requestId: string, label: OptionLabel | null, text: string | null): Promise<AnswerResult> => {
        requireQuestVerification();
        try {
          const answer: AnswerResult = await source.answerQuest(visit.id_sesi, selectedQuest.idQuest, requestId, label,
            text === null ? {} : { jawabanTeks: language === "en" ? normalizeLocalQuestAnswer(selectedQuest.code, text) : text });
          props.onAnswer(answer);
          return answer;
        } catch (cause: unknown) {
          return handleQuestError(cause);
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
        poiName={poiName}
        stars={stars}
        conquered={progress.completed}
        score={progress.pointsAwarded + (progress.challengePoints ?? 0)}
        reward={props.totalPoints}
        allCompleted={props.allCompleted}
        explanation={quests.length > 0 ? t(
          `${completedCount} dari ${quests.length} quest berhasil. Quest yang belum selesai bisa dilanjutkan dari daftar quest.`,
          `${completedCount} of ${quests.length} quests completed. You can resume unfinished quests from the quest list.`,
        ) : undefined}
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
          <PhotoFrame photoUrl={description.photoUrl} label={poiName} left={10} top={150} box={352} size={{ width: 330, height: 322 }} border={14} rotate={-1.6} />
          {/* "Story Summary (2)": kartu putih di bawah foto, tombol Mulai Cerita di kanan. */}
          <View style={styles.summaryCard}>
            <GeaText variant={poiName.length > 24 ? "heading24" : "heading28"} color={colors.primary[900]} numberOfLines={2}>
              {poiName}
            </GeaText>
            <GeaText variant="body16Tight" color={componentColors.cardBody} numberOfLines={3}>{description.text}</GeaText>
            <StoryButton label={t("Mulai Cerita", "Start Story")} onPress={(): void => { setAudioExpanded(null); setAutoPlayNarration(false); setStep("story"); }} style={styles.summaryButton} />
          </View>
          {narration !== null && <Pressable
            accessibilityRole="button"
            hitSlop={8}
            style={styles.audioMode}
            onPress={(): void => { setAudioExpanded(true); setAutoPlayNarration(true); setStep("story"); }}
          >
            <GeaText variant="body16" color={colors.primary[800]}>{t("Aktifkan Mode Audio", "Listen to Story")}</GeaText>
            <AudioBadge />
          </Pressable>}
        </>
      )}

      {(step === "story" || step === "story2") && (
        <>
          <BackButton onPress={props.onExit} />
          <PauseButton onPress={(): void => setPaused(true)} label={t("Istirahat Dulu", "Take a Break")} />
          <PhotoFrame photoUrl={description.photoUrl} label={poiName} left={-21} top={86} box={301.076} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={-7.66} />
          <PhotoFrame photoUrl={secondPhoto} label={poiName} left={136} top={229} box={272.526} size={{ width: 267.756, height: 267.756 }} border={12.551} rotate={1.03} />
          <SceneLayer layer={isiPanelLayer} />
          {/* Panel cokelat diperpanjang ke bawah saat cerita panjang dan halaman digulir. */}
          <View style={[styles.isiFill, span, { height: Math.max(0, ISI_TOP + isiHeight + ISI_BOTTOM - ISI_FILL_TOP) }]} />
          {narration !== null && <AudioToggle
            style={styles.audioButton}
            expanded={audioExpanded}
            onPress={(): void => {
              if (audioExpanded) setAutoPlayNarration(false);
              else void audioControls.current?.play();
              setAudioExpanded(!audioExpanded);
            }}
          />}
          <View
            style={styles.isiContent}
            onLayout={(event): void => setIsiHeight(event.nativeEvent.layout.height)}
          >
            <View style={styles.isiTexts}>
              <GeaText variant="heading28" color={colors.secondaryYellow[100]} numberOfLines={2}>
                {step === "story2" ? pageTwoTitle : judul ?? poiName}
              </GeaText>
              {narration !== null && <AudioControls
                key={narration.key}
                ref={audioControls}
                source={narration.source}
                durationSeconds={narration.seconds}
                autoPlay={eyesFree}
                onAutoPlayed={autoPlayNarration ? (): void => setAutoPlayNarration(false) : undefined}
                suspend={paused}
                expanded={audioExpanded}
                onDark
              />}
              <View>
                <GeaText variant="body16Tight" color={colors.secondaryYellow[0]}>
                  {step === "story2" ? pageTwoText : description.text}
                </GeaText>
                {step === "story" && pageCount === 1 && fakta !== undefined && (
                  <View style={styles.fact}>
                    <GeaText variant="bold16" color={colors.primary[900]}>{t("Fakta menarik", "Fun fact")}</GeaText>
                    <GeaText variant="body14" color={componentColors.bodyDark}>{fakta}</GeaText>
                  </View>
                )}
              </View>
            </View>
            {language === "en" && narration === null && <GeaText variant="body14" color={colors.secondaryYellow[0]}>English audio unavailable.</GeaText>}
            {error !== null && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">{error}</GeaText>}
            <View style={styles.isiNav}>
              <Pressable
                accessibilityRole="button"
                hitSlop={10}
                style={styles.flex}
                onPress={(): void => setStep(step === "story2" ? "story" : "summary")}
              >
                <GeaText variant="body16Tight" color={colors.secondaryYellow[100]} style={styles.link}>{t("Kembali", "Back")}</GeaText>
              </Pressable>
              <StoryButton
                label={t("Lanjut", "Continue")}
                style={styles.shadowed}
                onPress={(): void => {
                  if (step === "story" && pageCount > 1) setStep("story2");
                  else void finishStory();
                }}
              />
            </View>
          </View>
        </>
      )}

      <SheetModal
        visible={paused}
        onClose={(): void => setPaused(false)}
        title={t("Sudah siap untuk melanjutkan perjalanan?", "Ready to continue your adventure?")}
        description={t("Istirahat dulu nggak masalah. Ketuk Siap kalau kamu sudah mau lanjut membaca dan mengerjakan quest-nya.", "Take your time. Tap Ready when you want to continue reading and completing quests.")}
        actionLabel={t("Siap", "Ready")}
        onAction={(): void => setPaused(false)}
      />
    </FrameStage>
  );
}

function englishGpsError(cause: unknown): string {
  if (cause instanceof GeaServiceError) {
    switch (cause.code) {
      case "GPS_ACCURACY_EXCEEDS_20_METERS":
        return "Your location is not accurate enough. Check again or scan the collection QR code.";
      case "OUTSIDE_POI_AREA":
        return "Move closer to this collection or scan its QR code.";
      case "POI_NOT_FOUND":
        return "This collection could not be found.";
      case "LOCATION_UNAVAILABLE":
        return "Check location permissions and try again, or scan the collection QR code.";
    }
  }
  return `Could not verify your location: ${readableError(cause)}`;
}

/** Ikon speaker dekoratif di tombol "Aktifkan Mode Audio" pada ringkasan. */
function AudioBadge(): ReactElement {
  return (
    <View style={styles.audioIcon}>
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
