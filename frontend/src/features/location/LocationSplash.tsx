// Hasil cek lokasi GPS (Figma Hifi Sprint 3: "Sukses Splash - Lokasi" 436:3226 dan "Gagal Splash - Lokasi" 436:3360).
// Hijau = posisi di dalam area museum; merah = di luar area museum.
import { Image } from "expo-image";
import type { ReactElement } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Button } from "../../design/Button";
import { colors, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { FrameStage, StoryButton } from "../stories/hifi/parts";

const okEllipse = require("../../../assets/design/loc-ok-ellipse.svg") as number;
const okGroup = require("../../../assets/design/loc-ok-group.svg") as number;
const failEllipse = require("../../../assets/design/loc-fail-ellipse.svg") as number;
const failBottom = require("../../../assets/design/loc-fail-bottom.svg") as number;
const failTop = require("../../../assets/design/loc-fail-top.svg") as number;
const mascot = require("../../../assets/design/mascot.svg") as number;
const mascotSad = require("../../../assets/design/mascot-sad.svg") as number;

// Museum Geologi Bandung (Jl. Diponegoro No. 57) untuk tombol "lihat arah".
const MUSEUM_DIRECTIONS = "https://www.google.com/maps/dir/?api=1&destination=Museum+Geologi+Bandung";

export function LocationSuccessSplash({ onContinue }: { readonly onContinue: () => void }): ReactElement {
  return (
    <FrameStage background={colors.success[500]}>
      <Image accessible={false} source={okEllipse} style={styles.ellipse} />
      <Image accessible={false} source={okGroup} style={styles.okGroup} contentFit="fill" />
      <View style={[styles.mascotBox, styles.mascotOk]}>
        <Image accessible={false} source={mascot} style={styles.fill} contentFit="contain" />
      </View>
      <View style={[styles.content, { top: 268 }]}>
        <GeaText variant="display42" color={colors.secondaryGreen[100]} style={styles.title} accessibilityRole="header">
          Kamu sudah berada di area museum!
        </GeaText>
        <View style={styles.body}>
          <GeaText variant="body16" color={colors.white} style={styles.text}>
            Selamat datang di Museum Geologi Bandung. Jejak bumi jutaan tahun sudah menunggumu.
          </GeaText>
          <StoryButton label="Lanjutkan petualangan" onPress={onContinue} style={styles.stretch} />
        </View>
      </View>
    </FrameStage>
  );
}

export function LocationFailedSplash(
  { onRecheck, onUseQr, checking }: {
    readonly onRecheck: () => void;
    /** Jalur alternatif agar pengguna tidak terjebak: lanjut dan mulai kunjungan dengan QR pintu masuk. */
    readonly onUseQr: () => void;
    readonly checking: boolean;
  },
): ReactElement {
  return (
    <FrameStage background={colors.danger[500]}>
      <Image accessible={false} source={failEllipse} style={styles.ellipse} />
      <Image accessible={false} source={failBottom} style={styles.failBottom} contentFit="fill" />
      <View style={[styles.mascotBox, styles.mascotSad]}>
        <Image accessible={false} source={mascotSad} style={styles.fill} contentFit="contain" />
      </View>
      <Image accessible={false} source={failTop} style={styles.failTop} contentFit="fill" />
      <View style={[styles.content, { top: 238 }]}>
        <GeaText variant="display42" color={colors.secondaryGreen[100]} style={styles.title} accessibilityRole="header">
          Kamu belum berada di area museum
        </GeaText>
        <View style={styles.body}>
          <GeaText variant="body16" color={colors.white} style={styles.text}>
            Petualangan GEA dimulai di Museum Geologi Bandung. Yuk, datang dulu ke sana!
          </GeaText>
          <Button
            appearance="fill"
            tone="danger"
            label="Yuk lihat arah ke museum!"
            onPress={(): void => void Linking.openURL(MUSEUM_DIRECTIONS)}
            style={styles.stretch}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: checking }}
            disabled={checking}
            onPress={onRecheck}
            style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
          >
            <GeaText variant="button16" color={colors.secondaryGreen[200]}>
              {checking ? "Memeriksa lokasi..." : "Cek ulang lokasi"}
            </GeaText>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onUseQr}>
            <GeaText variant="body14" color={colors.secondaryGreen[200]} style={styles.link}>
              Sudah di museum? Pakai QR pintu masuk
            </GeaText>
          </Pressable>
        </View>
      </View>
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
  ellipse: { position: "absolute", left: -291, top: -67, width: 974, height: 974 },
  okGroup: { position: "absolute", left: -174, top: -189, width: 680.557, height: 1235.5 },
  failBottom: { position: "absolute", left: -42, top: 640, width: 620.557, height: 397.5 },
  failTop: {
    position: "absolute",
    left: -86,
    top: -187,
    width: 648.236,
    height: 374.314,
    transform: [{ rotate: "-4.2deg" }],
  },
  // Maskot mengintip dari kanan bawah (Figma: miring 7.34°).
  mascotBox: { position: "absolute", width: 316.866, height: 340.396 },
  mascotOk: { left: 133, top: 556, transform: [{ rotate: "7.34deg" }] },
  mascotSad: { left: 145, top: 592, transform: [{ rotate: "8deg" }] },
  content: { position: "absolute", left: 16, width: 358, gap: spacing[12] },
  title: { textAlign: "center", textTransform: "uppercase", lineHeight: 50 },
  body: { alignItems: "center", gap: spacing[16] },
  text: { width: 319, textAlign: "center", lineHeight: 24 },
  stretch: { alignSelf: "stretch" },
  outline: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.secondaryGreen[200],
  },
  pressed: { opacity: 0.7 },
  link: { textDecorationLine: "underline", textAlign: "center" },
});
