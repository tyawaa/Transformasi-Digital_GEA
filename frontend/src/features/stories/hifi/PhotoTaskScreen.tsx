// SEMENTARA: belum ada desain hi-fi untuk layar foto. Gaya mengikuti "Story - Scan QR"
// (latar, bingkai kamera hijau miring, judul Ellak kuning).
// Foto hanya ditampilkan sebagai pratinjau di HP; tidak disimpan dan tidak dikirim ke server.
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { type ReactElement, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import type { PoiDetail } from "../../../domain/contracts";
import { mediaSource } from "../../../services/media";
import { ScanBackground } from "./backgrounds";
import { FrameStage, StoryButton } from "./parts";

type Props = {
  /** Judul besar, mis. "Cari & foto koleksi ini" atau judul tantangan. */
  readonly title: string;
  /** Apa yang dicari, mis. "Elephas celebensis". */
  readonly instruction: string;
  /** Apa yang harus terlihat di foto (kolom "Target Foto" di sheet). */
  readonly target?: string | undefined;
  readonly hint?: string | undefined;
  readonly onBack: () => void;
  /** Dipanggil setelah pengguna memakai fotonya. */
  readonly onDone: () => void;
  /** Mode uji (data mock): tombol untuk lanjut tanpa kamera. */
  readonly testMode?: boolean;
  /** Foto referensi dari backend ("Temukan gambar ini"), bila ada untuk POI ini. */
  readonly references?: PoiDetail["photoChallenges"] | undefined;
};

export function PhotoTaskScreen(
  { title, instruction, target, hint, onBack, onDone, testMode = false, references = [] }: Props,
): ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [boxHeight, setBoxHeight] = useState<number>(0);

  async function capture(): Promise<void> {
    if (camera.current === null) return;
    setBusy(true);
    setError(null);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      setPhoto(picture.uri);
    } catch (cause: unknown) {
      console.warn("gea_photo_failed", { error: cause instanceof Error ? cause.message : String(cause) });
      setError("Foto gagal diambil. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const granted: boolean = permission?.granted === true;

  return (
    <FrameStage background={colors.primary[300]} frameHeight={INFO_TOP + boxHeight + 24}>
      <ScanBackground />

      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        >
          <GeaText variant="bold16" color={colors.primary[900]}>‹</GeaText>
          <GeaText variant="label16" color={colors.primary[900]}>Kembali</GeaText>
        </Pressable>
      </View>

      <GeaText variant="heading28" color={colors.secondaryYellow[100]} style={styles.title} numberOfLines={2}>
        {title}
      </GeaText>

      {/* Bingkai kamera / pratinjau foto */}
      <View style={styles.cameraBox}>
        <View style={styles.camera}>
          {photo !== null
            ? <Image accessibilityLabel="Foto yang baru diambil" source={{ uri: photo }} contentFit="cover" style={styles.fill} />
            : granted
            ? <CameraView ref={camera} style={styles.fill} facing="back" />
            : (
              <View style={styles.permission}>
                <GeaText variant="body16" color={colors.secondaryYellow[0]} style={styles.center}>
                  Izin kamera diperlukan untuk memotret koleksi. Foto hanya ada di HP-mu dan tidak dikirim.
                </GeaText>
                <StoryButton
                  label={permission?.canAskAgain === false ? "Buka pengaturan" : "Izinkan kamera"}
                  onPress={(): void => {
                    if (permission?.canAskAgain === false) void Linking.openSettings();
                    else void requestPermission();
                  }}
                />
              </View>
            )}
        </View>
      </View>

      {/* Info + tombol: ikut memanjang, halaman digulir bila tidak muat */}
      <View style={styles.info} onLayout={(event): void => setBoxHeight(event.nativeEvent.layout.height)}>
        {references.length > 0 && <ReferenceGallery challenges={references} />}
        <View style={styles.card}>
          <GeaText variant="label16" color={colors.primary[700]}>CARI &amp; FOTO</GeaText>
          <GeaText variant="bold16" color={componentColors.bodyDark}>{instruction}</GeaText>
          {target !== undefined && (
            <GeaText variant="body14" color={componentColors.cardCaption}>Yang harus terlihat: {target}</GeaText>
          )}
          {hint !== undefined && (
            showHint
              ? <GeaText variant="body14" color={colors.warning[500]}>Petunjuk: {hint}</GeaText>
              : (
                <Pressable accessibilityRole="button" hitSlop={8} onPress={(): void => setShowHint(true)}>
                  <GeaText variant="label16" color={colors.primary[800]} style={styles.link}>Lihat petunjuk</GeaText>
                </Pressable>
              )
          )}
        </View>
        {error !== null && (
          <GeaText variant="body14" color={componentColors.qrFailed} accessibilityRole="alert" style={styles.center}>{error}</GeaText>
        )}
        {photo === null
          ? (
            <StoryButton
              label={busy ? "Mengambil foto..." : "Ambil Foto"}
              disabled={!granted || busy}
              onPress={(): void => void capture()}
              style={styles.button}
            />
          )
          : (
            <View style={styles.row}>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={(): void => setPhoto(null)} style={styles.flex}>
                <GeaText variant="label16" color={colors.primary[900]} style={[styles.link, styles.center]}>Ulangi</GeaText>
              </Pressable>
              <StoryButton label="Pakai Foto" onPress={onDone} style={[styles.button, styles.flex2]} />
            </View>
          )}
        {busy && <ActivityIndicator color={colors.primary[900]} />}
        {testMode && (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onDone}>
            <GeaText variant="caption12" color={colors.primary[900]} style={[styles.link, styles.center]}>
              Mode uji: anggap sudah difoto
            </GeaText>
          </Pressable>
        )}
      </View>
    </FrameStage>
  );
}

/** Foto referensi nomor 3+ dari backend; tiap gambar punya instruksinya sendiri (dari kode tim). */
function ReferenceGallery({ challenges }: { readonly challenges: PoiDetail["photoChallenges"] }): ReactElement | null {
  const [index, setIndex] = useState<number>(0);
  const challenge: PoiDetail["photoChallenges"][number] | undefined = challenges[index];
  if (challenge === undefined) return null;
  const last: boolean = index === challenges.length - 1;
  return (
    <View style={styles.gallery}>
      <GeaText variant="heading20" color={colors.primary[900]}>Temukan gambar ini</GeaText>
      <Image
        source={mediaSource(challenge.photoUrl)}
        accessibilityLabel={`Referensi tantangan foto ${index + 1}`}
        contentFit="contain"
        style={styles.referencePhoto}
      />
      <GeaText variant="body14" color={componentColors.bodyDark}>{challenge.instruction}</GeaText>
      {challenges.length > 1 && (
        <View style={styles.galleryNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Referensi sebelumnya"
            disabled={index === 0}
            accessibilityState={{ disabled: index === 0 }}
            onPress={(): void => setIndex(index - 1)}
            style={[styles.referenceButton, index === 0 && styles.disabled]}
          >
            <GeaText variant="label16" color={colors.primary[900]}>Sebelumnya</GeaText>
          </Pressable>
          <GeaText variant="label16" color={colors.primary[900]}>{index + 1} / {challenges.length}</GeaText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Referensi berikutnya"
            disabled={last}
            accessibilityState={{ disabled: last }}
            onPress={(): void => setIndex(index + 1)}
            style={[styles.referenceButton, last && styles.disabled]}
          >
            <GeaText variant="label16" color={colors.primary[900]}>Berikutnya</GeaText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const INFO_TOP = 474;

const styles = StyleSheet.create({
  topBar: { position: "absolute", left: 16, top: 40 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryYellow[0],
    boxShadow: shadows.drop,
  },
  pressed: { opacity: 0.7 },
  title: { position: "absolute", left: 24, top: 96, width: 342, textAlign: "center" },
  cameraBox: { position: "absolute", left: 55, top: 176, width: 280, height: 280, alignItems: "center", justifyContent: "center" },
  camera: {
    width: 270,
    height: 270,
    borderWidth: 12,
    borderColor: colors.secondaryGreen[300],
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: colors.black,
    transform: [{ rotate: "2.56deg" }],
  },
  fill: { flex: 1 },
  permission: { flex: 1, padding: 16, gap: 12, alignItems: "center", justifyContent: "center" },
  info: { position: "absolute", left: 16, top: INFO_TOP, width: 358, gap: spacing[12] },
  card: {
    gap: spacing[8],
    padding: spacing[16],
    borderRadius: radius.control,
    backgroundColor: colors.white,
    boxShadow: shadows.drop,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing[12] },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  button: { boxShadow: shadows.drop },
  center: { textAlign: "center" },
  link: { textDecorationLine: "underline" },
  gallery: { gap: spacing[8], padding: spacing[12], borderRadius: radius.control, backgroundColor: colors.primary[0] },
  referencePhoto: {
    width: "100%",
    height: 240,
    borderWidth: 6,
    borderColor: colors.secondaryGreen[300],
    backgroundColor: colors.primary[100],
  },
  galleryNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  referenceButton: { paddingVertical: spacing[8], paddingHorizontal: spacing[8] },
  disabled: { opacity: 0.4 },
});
