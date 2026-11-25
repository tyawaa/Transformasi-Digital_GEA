import { Image } from "expo-image";
import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors } from "../../design/tokens";
import { GeaText } from "../../design/typography";

const bone: number = require("../../../assets/onboarding/welcome-bone.svg") as number;

/** Kartu awal: GPS sebagai jalur utama, QR pintu masuk sebagai cadangan. */
export function StartMap({ checkingLocation, onScan, onCheckLocation, notice }: {
  readonly checkingLocation: boolean;
  readonly onScan: () => void;
  readonly onCheckLocation: () => void;
  readonly notice: string | null;
}): ReactElement {
  return (
    <View style={styles.wrap}>
      <Image accessible={false} source={bone} style={styles.bone} contentFit="contain" />
      <GeaText variant="heading20" color={colors.tertiary[300]} style={styles.title}>Mulai petualanganmu</GeaText>
      <GeaText variant="body14" color={colors.primary[800]}>{notice ?? "Periksa lokasi di museum untuk memulai."}</GeaText>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: checkingLocation }} disabled={checkingLocation} onPress={onCheckLocation} style={({ pressed }) => [styles.button, (pressed || checkingLocation) && styles.dim]}>
        {checkingLocation ? <ActivityIndicator color={colors.white} /> : <GeaText variant="bold16" color={colors.white}>Mulai perjalanan</GeaText>}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onScan} hitSlop={6} style={styles.qr}><GeaText variant="body14" color={colors.primary[800]} style={styles.link}>Lokasi belum tersedia? Pindai QR pintu masuk</GeaText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  // Tulang dekoratif seperti di layar Selamat Datang (welcome-bone.svg), biar kartu tidak terlalu polos.
  bone: { position: "absolute", right: 18, top: -4, width: 26, height: 66, transform: [{ rotate: "35deg" }] },
  title: { textTransform: "uppercase", lineHeight: 28 },
  button: { alignItems: "center", borderRadius: 8, paddingVertical: 13, backgroundColor: colors.primary[700] },
  qr: { paddingVertical: 2 },
  link: { textDecorationLine: "underline", textAlign: "center" },
  dim: { opacity: 0.6 },
});
