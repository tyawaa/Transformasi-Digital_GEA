import { useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Button } from "../../design/Button";
import { PoiCard } from "../../design/Cards";
import { Toast } from "../../design/Toast";
import { colors, componentColors, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { DecisionMessage, DeviceLocation } from "../../domain/contracts";
import { onboardingAssets as img, SceneIllustrations, SceneLayer } from "./scene";

// Ukuran frame Figma.
const FRAME_W = 390;
const FRAME_H = 844;
// Posisi gulir tiap langkah. Langkah 2–4 adalah jendela pada satu kanvas tinggi:
// top jendela di kanvas = posisi + CANVAS_SHIFT (1021, 1846, 2636 seperti di Figma).
const STEP_SCROLL: readonly number[] = [0, 844, 1669, 2459];
const CANVAS_SHIFT = 177;
const CANVAS_H = 3480;

type Step = 0 | 1 | 2 | 3;

type Props = {
  /** Menjalankan pengecekan lokasi aplikasi (useVisitSession.checkLocation). */
  readonly onCheckLocation: () => void;
  /** true selama pengecekan lokasi berjalan. */
  readonly checkingLocation: boolean;
  readonly locationLabel: string;
  readonly locationNotice: DecisionMessage | null;
  readonly locationError: string | null;
  readonly currentLocation: DeviceLocation | null;
  /** true = posisi sudah di dalam area museum. */
  readonly locationOk: boolean;
  /** Langkah awal; 3 = langsung ke cek lokasi. */
  readonly initialStep?: Step;
  readonly onDone: () => void;
};

export function OnboardingScreen(
  { onCheckLocation, checkingLocation, locationLabel, locationNotice, locationError, currentLocation, locationOk, initialStep = 0, onDone }: Props,
): ReactElement {
  const { width, height } = useWindowDimensions();
  const scale: number = Math.min(width / FRAME_W, height / FRAME_H);
  const [step, setStep] = useState<Step>(initialStep);
  const scroll = useRef(new Animated.Value(STEP_SCROLL[initialStep] ?? 0)).current;
  // Warna latar ikut bergeser bersama adegan (0 = Selamat datang, 1 = langkah lain).
  const background = useRef(new Animated.Value(initialStep === 0 ? 0 : 1)).current;
  // Pakai ref agar layar tidak di-render ulang saat animasi mulai (bikin patah-patah).
  const moving = useRef<boolean>(false);

  // Web: browser menggulir kontainer ber-overflow hidden agar tombol yang difokus terlihat,
  // sehingga adegan bergeser. Kunci posisi gulirnya di 0 (tidak terjadi di HP).
  const rootRef = useRef<View>(null);
  useEffect((): (() => void) | undefined => {
    if (Platform.OS !== "web") return undefined;
    const node = rootRef.current as unknown as HTMLElement | null;
    if (node === null) return undefined;
    const reset = (): void => {
      if (node.scrollTop !== 0 || node.scrollLeft !== 0) node.scrollTo(0, 0);
    };
    node.addEventListener("scroll", reset);
    return (): void => node.removeEventListener("scroll", reset);
  }, []);

  const [location, requestLocation] = Location.useForegroundPermissions();
  const [camera, requestCamera] = useCameraPermissions();
  // Mikrofon dan notifikasi belum punya fitur di aplikasi; pilihan hanya dicatat.
  const [microphone, setMicrophone] = useState<boolean>(false);
  const [notification, setNotification] = useState<boolean>(false);
  const [warning, setWarning] = useState<{ readonly title: string; readonly description: string } | null>(null);
  useEffect((): (() => void) | undefined => {
    if (warning === null) return undefined;
    const timer = setTimeout((): void => setWarning(null), 6000);
    return (): void => clearTimeout(timer);
  }, [warning]);

  function goTo(next: Step, after?: () => void): void {
    if (moving.current) return;
    moving.current = true;
    const easing = Easing.inOut(Easing.cubic);
    Animated.parallel([
      Animated.timing(scroll, { toValue: STEP_SCROLL[next] ?? 0, duration: 700, easing, useNativeDriver: true }),
      Animated.timing(background, { toValue: next === 0 ? 0 : 1, duration: 700, easing, useNativeDriver: false }),
    ]).start((): void => {
      moving.current = false;
      setStep(next);
      after?.();
    });
  }

  async function askPermission(kind: "location" | "camera"): Promise<void> {
    try {
      if (kind === "location") await requestLocation();
      else await requestCamera();
    } catch (cause: unknown) {
      console.warn("gea_permission_failed", {
        kind,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  }

  /** Notifikasi saat Lanjut ditekan sebelum izin wajib diberikan. */
  function warnPermissions(): void {
    const needLocation: boolean = location?.granted !== true;
    const needCamera: boolean = camera?.granted !== true;
    const blocked: boolean = (needLocation && location?.canAskAgain === false) || (needCamera && camera?.canAskAgain === false);
    const what: string = needLocation && needCamera ? "lokasi dan kamera" : needLocation ? "lokasi" : "kamera";
    const why: string = needLocation && needCamera
      ? "Lokasi dipakai untuk tahu kamu sudah tiba di museum, kamera untuk scan QR koleksi."
      : needLocation
      ? "Lokasi dipakai untuk tahu kamu sudah tiba di museum."
      : "Kamera dipakai untuk scan QR koleksi.";
    setWarning({
      title: `Izinkan ${what} dulu, ya!`,
      description: blocked
        ? `${why} Izinnya sempat ditolak, buka pengaturan HP untuk mengaktifkannya.`
        : `${why} Ketuk kotak di kartu yang bertanda WAJIB.`,
    });
  }

  async function finishPermissions(): Promise<void> {
    if (location?.granted !== true || camera?.granted !== true) {
      warnPermissions();
      return;
    }
    setWarning(null);
    goTo(3, onCheckLocation);
  }

  const { welcomeY, canvasY, shape4Opacity, rootColor } = useMemo(() => ({
    welcomeY: Animated.multiply(scroll, -1),
    canvasY: Animated.multiply(Animated.add(scroll, CANVAS_SHIFT), -1),
    shape4Opacity: scroll.interpolate({
      inputRange: [STEP_SCROLL[2] ?? 0, STEP_SCROLL[3] ?? 0],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    rootColor: background.interpolate({
      inputRange: [0, 1],
      outputRange: [componentColors.welcomeBackground, colors.primary[300]],
    }),
  }), [scroll, background]);

  return (
    <Animated.View ref={rootRef} style={[styles.root, { backgroundColor: rootColor }]}>
      <View
        style={[
          styles.stage,
          {
            left: (width - FRAME_W) / 2,
            top: (height - FRAME_H) / 2,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Langkah 2–4: kanvas panjang yang digulir. */}
        <Animated.View style={[styles.canvas, { transform: [{ translateY: canvasY }] }]}>
          <SceneIllustrations />
          <PathTexts onNext={(): void => goTo(2)} disabled={step !== 1} />
          <Animated.View style={[styles.full, { opacity: Animated.subtract(1, shape4Opacity) }]} pointerEvents="none">
            <SceneLayer layer={{ src: img.shapeStep3, left: -109, top: 2501, width: 607.035, height: 449.5 }} />
          </Animated.View>
          <Animated.View style={[styles.full, { opacity: shape4Opacity }]} pointerEvents="none">
            <SceneLayer layer={{ src: img.shapeStep4, left: -117, top: 2501.57, width: 623, height: 521.43 }} />
          </Animated.View>
          {/* Konten izin tidak ada di frame Onboarding #4, jadi memudar saat bergeser. */}
          <Animated.View pointerEvents="box-none" style={[styles.full, { opacity: Animated.subtract(1, shape4Opacity) }]}>
          <PermissionStep
            top={1846}
            location={location?.granted === true}
            camera={camera?.granted === true}
            microphone={microphone}
            notification={notification}
            onLocation={(): void => void askPermission("location")}
            onCamera={(): void => void askPermission("camera")}
            onMicrophone={(): void => setMicrophone((value: boolean): boolean => !value)}
            onNotification={(): void => setNotification((value: boolean): boolean => !value)}
            onNext={(): void => void finishPermissions()}
            onLocked={warnPermissions}
            disabled={step !== 2}
          />
          </Animated.View>
          <LocationStep
            top={2636}
            checking={checkingLocation || step !== 3}
            progressLabel={locationLabel}
            notice={locationNotice}
            error={locationError}
            location={currentLocation}
            onRetry={onCheckLocation}
            onNext={(): void => {
              // Lanjut hanya kalau posisi sudah di area museum.
              if (locationOk) {
                onDone();
                return;
              }
              setWarning({
                title: "Lokasi belum sesuai",
                description: "Kamu belum berada di area museum. Tekan Periksa lokasi lagi setelah sampai di museum.",
              });
            }}
          />
        </Animated.View>

        {warning !== null && step >= 2 && (
          <View style={styles.toast}>
            <Toast
              tone="danger"
              title={warning.title}
              description={warning.description}
              onClose={(): void => setWarning(null)}
            />
          </View>
        )}

        {/* Langkah 1: Selamat datang (Onboarding #1). */}
        <Animated.View style={[styles.welcome, { transform: [{ translateY: welcomeY }] }]}>
          <Image
            accessible={false}
            source={img.welcomeBackground}
            contentFit="fill"
            style={styles.welcomeBackground}
          />
          <SceneLayer layer={{ src: img.welcomeBone, left: 278, top: 216, width: 77.572, height: 75.212, inner: { width: 30.357, height: 77.745 }, rotate: 132.98 }} />
          <View style={styles.welcomeText}>
            <GeaText variant="display42" color={colors.tertiary[300]} style={styles.welcomeTitle}>
              Selamat Datang di GEA!
            </GeaText>
            <GeaText variant="body16" color={componentColors.bodyDark} style={styles.center}>
              Teman jalan-jalanmu keliling Museum Geologi Bandung.
            </GeaText>
          </View>
          <NextButton
            top={734}
            left={86.5}
            label="Jelajah lebih jauh!"
            arrow
            disabled={step !== 0}
            onPress={(): void => goTo(1)}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function NextButton(
  { top, left = 89, label, arrow, disabled, onPress, onLocked }: {
    readonly top: number;
    readonly left?: number;
    readonly label: string;
    readonly arrow: boolean;
    readonly disabled: boolean;
    readonly onPress: () => void;
    /** Ada = tombol tampil nonaktif, tetapi ketukan memunculkan notifikasi. */
    readonly onLocked?: (() => void) | undefined;
  },
): ReactElement {
  const locked: boolean = onLocked !== undefined;
  return (
    <View style={[styles.buttonGroup, { top, left }]}>
      <Button
        appearance="fill"
        tone="primary"
        label={label}
        onPress={onPress}
        disabled={disabled || locked}
        style={styles.button}
      />
      {locked && !disabled && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} (belum bisa)`}
          accessibilityState={{ disabled: true }}
          onPress={onLocked}
          style={styles.lockedCover}
        />
      )}
      {arrow && (
        <Image accessible={false} source={img.arrowDown} style={styles.arrow} />
      )}
    </View>
  );
}

/** Onboarding #2: teks di sepanjang jalur fosil. */
function PathTexts(
  { onNext, disabled }: { readonly onNext: () => void; readonly disabled: boolean },
): ReactElement {
  return (
    <>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 151, top: 1095, width: 196, textAlign: "right" }]}>
        JELAJAHI
      </GeaText>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 31, top: 1278, width: 196 }]}>
        Jejak
      </GeaText>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 193, top: 1464, width: 154, textAlign: "right" }]}>
        WAKTU
      </GeaText>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, { left: 55, top: 1611, width: 154 }]}>
        BUMI
      </GeaText>
      <GeaText variant="body16" color={componentColors.bodyDark} style={[styles.abs, styles.center, { left: 34, top: 1671, width: 323 }]}>
        Ikuti rute sesuai waktumu, buka cerita tiap ruangan, dan selesaikan misi untuk mengumpulkan lencana.
      </GeaText>
      <NextButton top={1755} label="Lanjut" arrow disabled={disabled} onPress={onNext} />
    </>
  );
}

type PermissionProps = {
  readonly top: number;
  readonly location: boolean;
  readonly camera: boolean;
  readonly microphone: boolean;
  readonly notification: boolean;
  readonly onLocation: () => void;
  readonly onCamera: () => void;
  readonly onMicrophone: () => void;
  readonly onNotification: () => void;
  readonly onNext: () => void;
  /** Lanjut ditekan sebelum lokasi dan kamera diizinkan. */
  readonly onLocked: () => void;
  readonly disabled: boolean;
};

/** Onboarding #3: izin. */
function PermissionStep(props: PermissionProps): ReactElement {
  const { top, disabled } = props;
  return (
    <>
      <GeaText variant="display42" color={colors.tertiary[300]} style={[styles.abs, styles.upper, { left: 39, top: top + 89, width: 321 }]}>
        IZINKAN GEA membantu perjalanAN mu!
      </GeaText>
      <View style={[styles.cards, { top: top + 238 }]}>
        <PoiCard
          title="LOKASI"
          badge="WAJIB"
          icon={img.permLocation}
          description="Mendeteksi saat kamu tiba di museum dan mendekati ruangan"
          checked={props.location}
          actionLabel="Izinkan lokasi"
          onPressAction={disabled ? undefined : props.onLocation}
        />
        <PoiCard
          title="KAMERA"
          badge="WAJIB"
          icon={img.permCamera}
          description="Scan QR ruangan dan misi scan item koleksi"
          checked={props.camera}
          actionLabel="Izinkan kamera"
          onPressAction={disabled ? undefined : props.onCamera}
        />
        <PoiCard
          title="mikrofon"
          icon={img.permMicrophone}
          description="Perintah suara saat kamu tidak ingin menyentuh layar"
          checked={props.microphone}
          actionLabel="Izinkan mikrofon"
          onPressAction={disabled ? undefined : props.onMicrophone}
        />
        <PoiCard
          title="notifikasi"
          icon={img.permNotification}
          description="Memberi tahu saat kamu mendekati koleksi atau rute berubah"
          checked={props.notification}
          actionLabel="Izinkan notifikasi"
          onPressAction={disabled ? undefined : props.onNotification}
        />
      </View>
      <NextButton
        top={top + 728}
        label="Lanjut"
        arrow
        disabled={disabled}
        onPress={props.onNext}
        onLocked={props.location && props.camera ? undefined : props.onLocked}
      />
    </>
  );
}

/** Onboarding #4: sedang mengecek lokasi. Lingkaran berdenyut selama pengecekan. */
function LocationStep(
  { top, checking, progressLabel, notice, error, location, onRetry, onNext }: {
    readonly top: number;
    readonly checking: boolean;
    readonly progressLabel: string;
    readonly notice: DecisionMessage | null;
    readonly error: string | null;
    readonly location: DeviceLocation | null;
    readonly onRetry: () => void;
    readonly onNext: () => void;
  },
): ReactElement {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect((): (() => void) => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    if (checking) loop.start();
    else pulse.setValue(0);
    return (): void => loop.stop();
  }, [checking, pulse]);
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const hasResult: boolean = notice !== null || error !== null;
  const title: string = checking
    ? "Sedang mengecek lokasimu"
    : error !== null
    ? location !== null ? "Pemeriksaan area gagal" : "Lokasi belum bisa diperiksa"
    : notice?.title ?? "Periksa lokasimu";
  const description: string = checking
    ? progressLabel
    : error !== null && location !== null
    ? `Posisi berhasil dibaca, tetapi pemeriksaan ke layanan museum gagal. ${error}`
    : error ?? notice?.description ?? "Tekan Periksa lokasi lagi untuk membaca posisimu.";

  return (
    <>
      <GeaText variant="display42" color={colors.secondaryGreen[100]} style={[styles.abs, styles.upper, styles.center, { left: 34, top: top + 90, width: 321 }]}>
        {title}
      </GeaText>
      <Image accessible={false} source={img.map} contentFit="fill" style={[styles.abs, { left: 51.23, top: top + 293.25, width: 288.6, height: 288.5 }]} />
      <Animated.View pointerEvents="none" style={[styles.abs, { left: 105, top: top + 365, width: 182, height: 182, transform: [{ scale: ringScale }] }]}>
        <Image accessible={false} source={img.ring1118} style={styles.fill} />
      </Animated.View>
      <Image accessible={false} source={img.ring1117} style={[styles.abs, { left: 145, top: top + 396, width: 100, height: 100 }]} />
      <Image accessible={false} source={img.ring1116} style={[styles.abs, { left: 162, top: top + 413, width: 66, height: 66 }]} />
      <Image accessible={false} source={img.pin} style={[styles.abs, { left: 171.5, top: top + 414.5, width: 48, height: 48 }]} />
      {location !== null && (
        <GeaText variant="caption12" color={componentColors.bodyDark} style={[styles.abs, styles.center, { left: 34, top: top + 590, width: 323 }]}>
          {`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · Akurasi ±${Math.round(location.accuracyMeters)} m`}
        </GeaText>
      )}
      <ScrollView style={[styles.abs, { left: 34, top: top + 622, width: 323, height: 90 }]} contentContainerStyle={styles.locationMessage}>
        <GeaText variant="body14" color={componentColors.bodyDark} accessibilityLiveRegion="polite" style={styles.center}>
          {description}
        </GeaText>
      </ScrollView>
      <NextButton top={top + 728} label="Lanjut" arrow={false} disabled={checking || !hasResult} onPress={onNext} />
      {!checking && (
        <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.abs, { left: 34, top: top + 786, width: 323, paddingVertical: 8 }]}>
          <GeaText variant="label16" color={componentColors.bodyDark} style={styles.center}>Periksa lokasi lagi</GeaText>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  toast: { position: "absolute", left: 15, top: 47, width: 360, zIndex: 10 },
  stage: { position: "absolute", width: FRAME_W, height: FRAME_H },
  canvas: {
    position: "absolute",
    left: 0,
    top: 0,
    width: FRAME_W,
    height: CANVAS_H,
    backgroundColor: colors.primary[300],
  },
  full: { position: "absolute", left: 0, top: 0, width: FRAME_W, height: CANVAS_H },
  welcome: {
    position: "absolute",
    left: 0,
    top: 0,
    width: FRAME_W,
    height: FRAME_H,
    backgroundColor: componentColors.welcomeBackground,
  },
  welcomeBackground: { position: "absolute", left: 0, top: -230, width: FRAME_W, height: 1143 },
  welcomeText: {
    position: "absolute",
    left: 0,
    top: 17,
    width: FRAME_W,
    height: 267,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[48],
    gap: spacing[16],
    alignItems: "center",
  },
  welcomeTitle: { width: 352, textAlign: "center" },
  center: { textAlign: "center" },
  locationMessage: { flexGrow: 1, justifyContent: "center" },
  upper: { textTransform: "uppercase" },
  abs: { position: "absolute" },
  fill: { width: "100%", height: "100%" },
  lockedCover: { position: "absolute", left: 0, top: 0, width: "100%", height: 44 },
  buttonGroup: {
    position: "absolute",
    width: 212,
    alignItems: "center",
    gap: 11,
  },
  button: { alignSelf: "stretch", paddingHorizontal: 42 },
  arrow: { width: 24, height: 24 },
  cards: { position: "absolute", left: 39, width: 312, gap: spacing[16] },
});
