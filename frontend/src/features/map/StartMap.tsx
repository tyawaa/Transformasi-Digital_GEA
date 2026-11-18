// Peta awal sebelum kunjungan (Hifi Sprint 3 "Peta"). Setelah kunjungan mulai, pakai peta navigasi.
import { Image } from "expo-image";
import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { ScanBackground } from "../stories/hifi/backgrounds";
import { FrameStage } from "../stories/hifi/parts";

const floor = require("../../../assets/design/startmap-floor.svg") as number;
const route = require("../../../assets/design/startmap-route.svg") as number;
const pin = require("../../../assets/design/map-pin.svg") as number;
const pinShadow = require("../../../assets/design/map-pin-shadow.svg") as number;
const you = require("../../../assets/design/map-you.svg") as number;

// Posisi pin di denah Figma (1917.741 × 532.568).
const PINS: readonly { readonly code: string; readonly x: number; readonly y: number }[] = [
  { code: "P01", x: 748, y: 65 },
  { code: "P02", x: 544, y: 60 },
  { code: "P03", x: 403, y: 48 },
  { code: "P04", x: 262, y: 38 },
  { code: "P05", x: 262, y: 271 },
  { code: "P06", x: 415, y: 284 },
  { code: "P07", x: 544, y: 289 },
  { code: "P08", x: 678, y: 286 },
  { code: "P09", x: 813, y: 284 },
  { code: "P10", x: 78, y: 70 },
  { code: "P11", x: 78, y: 179 },
  { code: "S", x: 990, y: 361 },
];

// Pintu masuk (S) di tengah layar.
const PLAN_LEFT = -819;
const PLAN_TOP = 58;

export function StartMap(
  { checkingLocation, onScan, onCheckLocation }: {
    readonly checkingLocation: boolean;
    readonly onScan: () => void;
    readonly onCheckLocation: () => void;
  },
): ReactElement {
  return (
    <FrameStage background={colors.primary[300]}>
      <ScanBackground />
      <View style={styles.plan} accessibilityLabel="Denah lantai 1 di sekitar pintu masuk">
        <Image accessible={false} source={floor} style={styles.floor} contentFit="fill" />
        <Image accessible={false} source={route} style={styles.fill} contentFit="fill" />
        {PINS.map((item): ReactElement => (
          <View key={item.code} style={[styles.pin, { left: item.x, top: item.y }]}>
            <Image accessible={false} source={pinShadow} style={styles.pinShadow} />
            <Image accessible={false} source={pin} style={styles.pinShape} />
            <View style={styles.pinLabel}>
              <GeaText variant="heading20" color={colors.primary[900]} style={item.code === "S" ? styles.pinS : styles.pinText}>
                {item.code}
              </GeaText>
            </View>
          </View>
        ))}
      </View>
      <Image accessibilityLabel="Posisimu saat ini" source={you} style={styles.you} />

      <View style={styles.card}>
        <GeaText variant="heading20" color={colors.tertiary[300]} style={styles.title} accessibilityRole="header">
          {"Selamat Memulai\nPerjalanan Anda"}
        </GeaText>
        <GeaText variant="body14" color={colors.primary[800]} style={styles.body}>
          Pindai QR pada pintu masuk untuk memulai perjalanan Anda.
        </GeaText>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: checkingLocation }}
            disabled={checkingLocation}
            hitSlop={8}
            onPress={onCheckLocation}
            style={styles.gps}
          >
            {checkingLocation
              ? <ActivityIndicator size="small" color={colors.primary[800]} />
              : <GeaText variant="body14" color={colors.primary[800]} style={styles.link}>Cek lokasi dengan GPS</GeaText>}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onScan}
            style={({ pressed }) => [styles.scan, pressed && styles.pressed]}
          >
            <GeaText variant="bold16" color={colors.primary[0]} style={styles.scanText}>Pindai QR</GeaText>
          </Pressable>
        </View>
      </View>
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" },
  plan: { position: "absolute", left: PLAN_LEFT, top: PLAN_TOP, width: 1917.741, height: 532.568 },
  floor: {
    position: "absolute",
    left: 0.29,
    top: 7.86,
    width: 1917.16,
    height: 516.851,
    transform: [{ rotate: "0.62deg" }],
  },
  pin: { position: "absolute", width: 58, height: 73 },
  pinShadow: { position: "absolute", left: 11, top: 61, width: 29, height: 11 },
  pinShape: { position: "absolute", left: -3.1, top: -2.9, width: 58.06, height: 69.17 },
  pinLabel: {
    position: "absolute",
    left: 3.73,
    top: 4.56,
    width: 45.73,
    height: 45.73,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[0],
  },
  pinText: { fontSize: 19.6 },
  pinS: { fontSize: 24 },
  you: { position: "absolute", left: 168, top: 530, width: 56, height: 56 },
  card: {
    position: "absolute",
    left: 16,
    top: 598,
    width: 358,
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[24],
    borderRadius: 8,
    backgroundColor: colors.primary[0],
    boxShadow: shadows.drop,
  },
  title: { fontSize: 22, lineHeight: 28, textTransform: "uppercase" },
  body: { lineHeight: 20 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[12] },
  gps: { flexShrink: 1, paddingVertical: spacing[8] },
  link: { textDecorationLine: "underline" },
  scan: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: 8,
    backgroundColor: colors.primary[700],
    boxShadow: shadows.drop,
  },
  scanText: { fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.8 },
});
