// Splash hasil cek lokasi (Hifi Sprint 3: Sukses/Gagal Splash - Lokasi).
import { Image } from "expo-image";
import type { ReactElement } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Button } from "../../design/Button";
import { colors, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { AccessDecision, DecisionMessage } from "../../domain/contracts";
import type { LocationSettingsAction } from "../../hooks/useVisitSession";
import { FrameStage, StoryButton } from "../stories/hifi/parts";

const okEllipse = require("../../../assets/design/loc-ok-ellipse.svg") as number;
const okGroup = require("../../../assets/design/loc-ok-group.svg") as number;
const failEllipse = require("../../../assets/design/loc-fail-ellipse.svg") as number;
const failBottom = require("../../../assets/design/loc-fail-bottom.svg") as number;
const failTop = require("../../../assets/design/loc-fail-top.svg") as number;
const mascot = require("../../../assets/design/mascot.svg") as number;
const mascotSad = require("../../../assets/design/mascot-sad.svg") as number;

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
  { message, decision, settingsAction, onRecheck, onScanQr }: {
    readonly message: DecisionMessage;
    readonly decision: AccessDecision | null;
    readonly settingsAction: LocationSettingsAction | null;
    readonly onRecheck: () => void;
    readonly onScanQr: () => void;
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
        <GeaText variant="heading28" color={colors.secondaryGreen[100]} style={styles.title} accessibilityRole="header">
          {message.title}
        </GeaText>
        <View style={styles.body}>
          <GeaText variant="body16" color={colors.white} style={styles.text}>
            {message.description}
          </GeaText>
          {decision?.status === "outside" && <Button
            appearance="fill"
            tone="danger"
            label="Yuk lihat arah ke museum!"
            onPress={(): void => void Linking.openURL(MUSEUM_DIRECTIONS)}
            style={styles.stretch}
          />}
          {settingsAction !== null && <StoryButton
            label={settingsAction.label}
            onPress={(): void => void settingsAction.onPress()}
            style={styles.stretch}
          />}
          <Pressable
            accessibilityRole="button"
            onPress={onRecheck}
            style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
          >
            <GeaText variant="button16" color={colors.secondaryGreen[200]}>
              Cek ulang lokasi
            </GeaText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onScanQr} style={styles.linkWrap}>
            <GeaText variant="button16" color={colors.white} style={styles.text}>
              Lokasi belum tersedia? Pindai QR pintu masuk
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
  mascotBox: { position: "absolute", width: 316.866, height: 340.396 },
  mascotOk: { left: 133, top: 556, transform: [{ rotate: "7.34deg" }] },
  mascotSad: { left: 145, top: 592, transform: [{ rotate: "8deg" }] },
  content: { position: "absolute", left: 16, width: 358, gap: spacing[12] },
  title: { textAlign: "center", textTransform: "uppercase", lineHeight: 50 },
  body: { alignItems: "center", gap: spacing[16] },
  text: { width: 319, textAlign: "center", lineHeight: 24 },
  stretch: { alignSelf: "stretch" },
  // Pressable penuh lebar: tanpa alignItems "center", teks lebarnya 319 malah menempel di kiri.
  linkWrap: { alignSelf: "stretch", alignItems: "center" },
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
});
