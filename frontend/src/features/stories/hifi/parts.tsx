import { Image } from "expo-image";
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { colors, componentColors, radius } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { mediaSource } from "../../../services/media";
import { backArrow } from "./backgrounds";

export const FRAME_W = 390;
export const FRAME_H = 844;

/**
 * Frame Figma 390 × 844 yang diskalakan agar muat di layar. Bila isi lebih panjang
 * (frameHeight > 844), seluruh halaman bisa digulir ke bawah, bukan kotak teks kecil.
 */
export function FrameStage(
  { background, children, frameHeight = FRAME_H, scrollKey }: {
    readonly background: string;
    readonly children: ReactNode;
    /** Tinggi isi dalam satuan frame; > 844 = halaman bisa digulir. */
    readonly frameHeight?: number;
    /** Ganti nilai ini (mis. langkah cerita) agar halaman kembali ke atas. */
    readonly scrollKey?: string;
  },
): ReactElement {
  const { width, height } = useWindowDimensions();
  const scale: number = Math.min(width / FRAME_W, height / FRAME_H);
  const rootRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const frameH: number = Math.max(FRAME_H, frameHeight);
  // Jarak atas sama seperti frame 844 yang ditengahkan; transform scale berpusat di tengah frame.
  const offsetTop: number = (height - FRAME_H * scale) / 2;
  const stageTop: number = offsetTop - (frameH - frameH * scale) / 2;

  useEffect((): void => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);

  // Web: browser bisa menggulir kontainer overflow hidden saat elemen difokus. Kunci di 0.
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

  return (
    <View ref={rootRef} style={[styles.root, { backgroundColor: background }]}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={frameH > FRAME_H}
        showsVerticalScrollIndicator={false}
        // overflow hidden: hiasan yang menjulur melewati bawah frame tidak ikut bisa digulir.
        contentContainerStyle={{ height: Math.max(height, offsetTop * 2 + frameH * scale), overflow: "hidden" }}
      >
        <View
          style={[
            styles.stage,
            { left: (width - FRAME_W) / 2, top: stageTop, height: frameH, transform: [{ scale }] },
          ]}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

/** Tombol Story di Figma: hijau, Qanelas Medium, tanpa bayangan. */
export function StoryButton(
  { label, onPress, disabled = false, style }: {
    readonly label: string;
    readonly onPress: () => void;
    readonly disabled?: boolean;
    readonly style?: StyleProp<ViewStyle>;
  },
): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled
            ? colors.greys[200]
            : pressed
            ? colors.secondaryGreen[500]
            : colors.secondaryGreen[300],
        },
        style,
      ]}
    >
      <GeaText variant="bold16" color={componentColors.bodyDark} style={styles.center}>
        {label}
      </GeaText>
    </Pressable>
  );
}

/** Tombol kembali desain terbaru: lingkaran krem berisi panah + tulisan "Keluar". */
export function BackButton(
  { onPress, label = "Keluar" }: { readonly onPress: () => void; readonly label?: string | null },
): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? "Kembali"}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <View style={styles.backCircle}>
        <Image accessible={false} source={backArrow} style={styles.backIcon} />
      </View>
      {label !== null && <GeaText variant="body16" color={colors.primary[700]}>{label}</GeaText>}
    </Pressable>
  );
}

/** Foto berbingkai hijau yang diputar, seperti "Frame 21" di Figma. */
export function PhotoFrame(
  { photoUrl, label, left, top, box, size, border, rotate }: {
    readonly photoUrl: string;
    readonly label: string;
    readonly left: number;
    readonly top: number;
    readonly box: number;
    readonly size: { readonly width: number; readonly height: number };
    readonly border: number;
    readonly rotate: number;
  },
): ReactElement {
  return (
    <View style={[styles.photoBox, { left, top, width: box, height: box }]}>
      <View
        style={[
          styles.photo,
          { width: size.width, height: size.height, borderWidth: border, transform: [{ rotate: `${rotate}deg` }] },
        ]}
      >
        <Image
          accessibilityLabel={label}
          source={mediaSource(photoUrl)}
          contentFit="cover"
          style={styles.fill}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  stage: { position: "absolute", width: FRAME_W, height: FRAME_H },
  button: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 42,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  center: { textAlign: "center" },
  back: { position: "absolute", left: 16, top: 48, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 2 },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondaryYellow[100],
  },
  backIcon: { width: 24, height: 24, transform: [{ scaleX: -1 }] },
  pressed: { opacity: 0.7 },
  photoBox: { position: "absolute", alignItems: "center", justifyContent: "center" },
  photo: {
    overflow: "hidden",
    borderColor: colors.secondaryGreen[300],
    borderRadius: 2,
    backgroundColor: colors.primary[100],
  },
  fill: { width: "100%", height: "100%" },
});
