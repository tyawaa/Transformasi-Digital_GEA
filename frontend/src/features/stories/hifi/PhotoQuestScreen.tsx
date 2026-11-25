import { CameraView, useCameraPermissions } from "expo-camera";
import { randomUUID } from "expo-crypto";
import { Image } from "expo-image";
import { type ReactElement, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type { AnswerResult, Quest } from "../../../domain/contracts";
import { readableError } from "../../../services/api";
import { type CapturedPhoto, prepareCapturedPhoto } from "../../../services/photo";
import { StoryBackground } from "./backgrounds";
import { BackButton, FrameStage, StoryButton } from "./parts";
import { QuestAudio } from "./QuestAudio";

type PhotoRequest = { readonly requestId: string; readonly photo: CapturedPhoto };

/** Kamera quest: model APK memeriksa foto di perangkat; hasil tak pasti tanpa penalti. */
export function PhotoQuestScreen({ quest, recording, submit, onBack }: {
  readonly quest: Quest;
  readonly recording: number | undefined;
  readonly submit: (requestId: string, photo: CapturedPhoto) => Promise<AnswerResult>;
  readonly onBack: () => void;
}): ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [pending, setPending] = useState<PhotoRequest | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [height, setHeight] = useState<number>(0);
  const locked = useRef<boolean>(false);

  async function capture(): Promise<void> {
    if (locked.current || camera.current === null) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.9, skipProcessing: false, exif: false });
      const photo: CapturedPhoto = await prepareCapturedPhoto(picture);
      setPending({ requestId: randomUUID(), photo });
    } catch (cause: unknown) {
      console.warn("photo_capture_failed", { error: cause instanceof Error ? cause.message : String(cause) });
      setError("Foto gagal diambil. Coba lagi.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function send(): Promise<void> {
    if (locked.current || pending === null) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      const answer: AnswerResult = await submit(pending.requestId, pending.photo);
      setFeedback(answer.photoMessage ?? answer.hint);
    } catch (cause: unknown) {
      setError(readableError(cause));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <FrameStage background={colors.primary[300]} frameHeight={150 + height + 48}>
      <StoryBackground />
      {!busy && <BackButton onPress={onBack} />}
      <View style={styles.content} onLayout={(event): void => setHeight(event.nativeEvent.layout.height)}>
        <GeaText variant="heading28" color={colors.primary[900]}>Cari &amp; Foto</GeaText>
        <View style={styles.card}>
          <GeaText variant="heading24" color={colors.secondaryGreen[900]}>{quest.title ?? quest.instruksi}</GeaText>
          <GeaText variant="body16" color={componentColors.bodyDark}>{quest.pertanyaan}</GeaText>
          <GeaText variant="body14" color={componentColors.bodyDark}>Yang harus terlihat: {quest.target_foto}</GeaText>
          {recording !== undefined && <QuestAudio source={recording} />}
        </View>
        <View style={styles.camera}>
          {pending !== null
            ? <Image source={{ uri: pending.photo.uri }} contentFit="contain" style={styles.fill} accessibilityLabel="Pratinjau foto koleksi" />
            : permission?.granted === true
            ? <CameraView ref={camera} style={styles.fill} facing="back" />
            : <View style={styles.permission}>
              <GeaText variant="body16" color={colors.white}>Izinkan kamera untuk memotret koleksi.</GeaText>
              <StoryButton label={permission?.canAskAgain === false ? "Buka Pengaturan" : "Izinkan Kamera"}
                onPress={(): void => { if (permission?.canAskAgain === false) void Linking.openSettings(); else void requestPermission(); }} />
            </View>}
        </View>
        <View style={styles.card}>
          <GeaText variant="body14" color={componentColors.bodyDark}>Posisikan objek di tengah dan foto dengan jelas. Label nama tidak wajib terlihat. Foto diperiksa langsung di HP tanpa diunggah. Progres foto tersimpan di HP ini.</GeaText>
          {quest.hint && <GeaText variant="body14" color={componentColors.bodyDark}>Petunjuk: {quest.hint}</GeaText>}
        </View>
        {feedback !== null && <GeaText variant="body16" color={colors.primary[900]} accessibilityLiveRegion="polite">{feedback}</GeaText>}
        {error !== null && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">{error}</GeaText>}
        {busy && <ActivityIndicator color={colors.primary[900]} />}
        {pending === null
          ? <StoryButton label={busy ? "Menyiapkan Foto…" : "Ambil Foto"} disabled={busy || permission?.granted !== true} onPress={(): void => { void capture(); }} />
          : <>
            <StoryButton label={busy ? "Memeriksa Foto…" : "Periksa Foto"} disabled={busy || feedback !== null} onPress={(): void => { void send(); }} />
            <Pressable disabled={busy} accessibilityRole="button" onPress={(): void => { setPending(null); setFeedback(null); setError(null); }}>
              <GeaText variant="label16" color={colors.primary[900]}>Ambil Ulang</GeaText>
            </Pressable>
          </>}
        <StoryButton label="Kembali ke Daftar Quest" disabled={busy} onPress={onBack} />
      </View>
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  content: { position: "absolute", left: 20, right: 20, top: 150, gap: spacing[16] },
  card: { padding: spacing[16], borderRadius: radius.control, backgroundColor: componentColors.welcomeBackground, gap: spacing[12] },
  camera: { height: 390, overflow: "hidden", borderRadius: radius.control, backgroundColor: colors.black },
  fill: { flex: 1 },
  permission: { flex: 1, padding: spacing[16], justifyContent: "center", gap: spacing[16] },
});
