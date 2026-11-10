import { type BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { type ReactElement, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { colors, componentColors, radius, shadows, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { type ParsedQr, parseQr } from "../../qr/qrPayload";
import { ScanBackground } from "./backgrounds";
import { FrameStage, StoryButton } from "./parts";

export type ScanState = "scanning" | "detected" | "failed";

export type DummyScan = { readonly label: string; readonly payload: string };

type Props = {
  readonly state: ScanState;
  /** Pesan merah saat gagal; default sesuai hi-fi. */
  readonly failMessage?: string | null;
  /** Pesan hijau (mis. kunjungan dimulai), menggantikan kalimat bantuan. */
  readonly notice?: string | null;
  readonly title?: string;
  /** Kalimat bantuan di bawah kamera. */
  readonly helper?: string;
  /** Hasil QR yang sudah divalidasi offline (format + kode di dataset lokal). */
  readonly onResult: (result: ParsedQr) => void;
  readonly onRetry: () => void;
  /** Kembali ke peta. */
  readonly onBack: () => void;
  /** "Mulai tanpa scan": buka cerita, quest tetap terkunci. */
  readonly onSkip?: (() => void) | null;
  /** Hanya pada mode data dummy, untuk uji tanpa QR fisik. */
  readonly dummies?: readonly DummyScan[];
};

/**
 * E13 – komponen QR scanner bersama (Story - Scan QR 36:215 + 43:639, Gagal 57:277).
 * Dipakai untuk QR pintu masuk, zona, dan koleksi. Output: token + jenis + poi_id bila diketahui.
 */
export function ScanQrScreen(
  {
    state,
    failMessage = null,
    notice = null,
    title = "Scan qr code untuk memulai petualanganmu",
    helper = "Arahkan kamera ke QR di pintu masuk atau di dekat koleksi.",
    onResult,
    onRetry,
    onBack,
    onSkip = null,
    dummies = [],
  }: Props,
): ReactElement {
  const [permission, requestPermission] = useCameraPermissions();
  const [testsOpen, setTestsOpen] = useState<boolean>(false);
  const handled = useRef<boolean>(false);
  if (state === "scanning") handled.current = false;

  function onBarcode(result: BarcodeScanningResult): void {
    if (handled.current || state !== "scanning") return;
    handled.current = true;
    onResult(parseQr(result.data));
  }

  return (
    <FrameStage background={colors.primary[300]}>
      <ScanBackground />

      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali ke peta"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
        >
          <GeaText variant="bold16" color={colors.primary[900]}>‹</GeaText>
          <GeaText variant="label16" color={colors.primary[900]}>Peta</GeaText>
        </Pressable>
        {dummies.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: testsOpen }}
            hitSlop={8}
            onPress={(): void => setTestsOpen(!testsOpen)}
            style={({ pressed }) => [styles.pill, styles.testPill, pressed && styles.pillPressed]}
          >
            <GeaText variant="caption12" color={colors.primary[900]}>Mode uji {testsOpen ? "▴" : "▾"}</GeaText>
          </Pressable>
        )}
      </View>

      <View style={styles.column}>
        <GeaText variant="heading28" color={colors.secondaryYellow[100]} style={styles.title}>
          {title}
        </GeaText>
        <View style={styles.cameraBox}>
          <View style={styles.camera}>
            {permission?.granted === true
              ? (
                <CameraView
                  style={styles.fill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={state === "scanning" ? onBarcode : undefined}
                />
              )
              : (
                <View style={styles.permission}>
                  <GeaText variant="body16" color={colors.secondaryYellow[0]} style={styles.center}>
                    Izin kamera diperlukan untuk membaca QR. Tidak ada foto yang disimpan.
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
      </View>

      {/* Status di bawah kamera: posisi dan bentuk pill sama dengan desain ([LOADING STATE] / gagal). */}
      <View style={styles.statusArea}>
        {state === "detected" && (
          <View accessibilityLiveRegion="polite" style={[styles.status, styles.loading]}>
            <GeaText variant="label16" color={componentColors.bodyDark}>Memeriksa QR...</GeaText>
            <ActivityIndicator color={componentColors.bodyDark} />
          </View>
        )}
        {state === "failed" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLiveRegion="assertive"
            onPress={onRetry}
            style={[styles.status, styles.failed]}
          >
            <GeaText variant="label16" color={componentColors.textWhite} style={styles.center}>
              {failMessage ?? "QR gagal discan, scan ulang!"}
            </GeaText>
          </Pressable>
        )}
        {state === "scanning" && notice !== null && (
          <View accessibilityLiveRegion="polite" style={[styles.status, styles.loading]}>
            <GeaText variant="label16" color={componentColors.bodyDark} style={styles.center}>{notice}</GeaText>
          </View>
        )}
        {state === "scanning" && notice === null && (
          <GeaText variant="body14" color={colors.primary[900]} style={styles.center}>{helper}</GeaText>
        )}
        {onSkip !== null && state !== "detected" && (
          <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8}>
            <GeaText variant="label16" color={colors.primary[900]} style={styles.link}>
              Mulai tanpa scan
            </GeaText>
          </Pressable>
        )}
      </View>

      {testsOpen && (
        <View style={styles.testPanel}>
          <GeaText variant="caption12" color={colors.greys[300]}>Hanya untuk uji tanpa QR fisik</GeaText>
          {dummies.map((dummy: DummyScan): ReactElement => (
            <Pressable
              key={dummy.payload}
              accessibilityRole="button"
              disabled={state === "detected"}
              onPress={(): void => {
                setTestsOpen(false);
                handled.current = true;
                onResult(parseQr(dummy.payload));
              }}
              style={({ pressed }) => [styles.testItem, pressed && styles.pillPressed]}
            >
              <GeaText variant="body14" color={colors.primary[900]}>{dummy.label.replace(/^Uji: /, "")}</GeaText>
            </Pressable>
          ))}
        </View>
      )}
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    left: 16,
    top: 40,
    width: 358,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
  pillPressed: { opacity: 0.7 },
  testPill: { paddingHorizontal: spacing[12], backgroundColor: colors.secondaryYellow[100] },
  column: { position: "absolute", left: 19, top: 99, width: 352, alignItems: "center", gap: 24 },
  title: { alignSelf: "stretch", textAlign: "center" },
  cameraBox: { width: 332.299, height: 419.916, alignItems: "center", justifyContent: "center" },
  camera: {
    width: 314.463,
    height: 406.274,
    borderWidth: 15,
    borderColor: colors.secondaryGreen[300],
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: colors.black,
    transform: [{ rotate: "2.56deg" }],
  },
  fill: { flex: 1 },
  permission: { flex: 1, padding: 20, gap: 16, alignItems: "center", justifyContent: "center" },
  center: { textAlign: "center" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  statusArea: { position: "absolute", left: 24, top: 666, width: 342, alignItems: "center", gap: spacing[12] },
  loading: { maxWidth: 342, backgroundColor: colors.secondaryGreen[300], boxShadow: shadows.drop },
  failed: { maxWidth: 342, backgroundColor: componentColors.qrFailed, boxShadow: shadows.drop },
  link: { textDecorationLine: "underline", textAlign: "center" },
  testPanel: {
    position: "absolute",
    right: 16,
    top: 84,
    width: 240,
    gap: spacing[4],
    padding: spacing[12],
    borderRadius: radius.control,
    backgroundColor: colors.white,
    boxShadow: shadows.drop,
  },
  testItem: {
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    borderRadius: radius.control,
    backgroundColor: colors.primary[0],
  },
});
