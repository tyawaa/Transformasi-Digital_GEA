import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { colors } from "../../design/tokens";
import { GeaText } from "../../design/typography";

/** Kartu awal: GPS sebagai jalur utama, QR pintu masuk sebagai cadangan. */
export function StartMap({ checkingLocation, onScan, onCheckLocation, notice }: {
  readonly checkingLocation: boolean;
  readonly onScan: () => void;
  readonly onCheckLocation: () => void;
  readonly notice: string | null;
}): ReactElement {
  return (
    <>
      <GeaText variant="heading24" color={colors.tertiary[300]} style={styles.title}>Selamat memulai perjalanan Anda</GeaText>
      <GeaText variant="body14" color={colors.primary[800]}>{notice ?? "Aktifkan lokasi untuk memulai perjalanan dan mengikuti arah menuju koleksi pilihanmu."}</GeaText>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: checkingLocation }} disabled={checkingLocation} onPress={onCheckLocation} style={({ pressed }) => [styles.button, (pressed || checkingLocation) && styles.dim]}>
        {checkingLocation ? <ActivityIndicator color={colors.white} /> : <GeaText variant="bold16" color={colors.white}>Mulai perjalanan</GeaText>}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onScan} hitSlop={6} style={styles.qr}><GeaText variant="body14" color={colors.primary[800]} style={styles.link}>Lokasi belum tersedia? Pindai QR pintu masuk</GeaText></Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  title: { textTransform: "uppercase", lineHeight: 28 },
  button: { alignItems: "center", borderRadius: 8, paddingVertical: 13, backgroundColor: colors.primary[700] },
  qr: { paddingVertical: 2 },
  link: { textDecorationLine: "underline", textAlign: "center" },
  dim: { opacity: 0.6 },
});
