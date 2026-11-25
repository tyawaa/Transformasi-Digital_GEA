import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors, componentColors } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { onboardingAssets as img, SceneLayer } from "../onboarding/scene";
import { FrameStage } from "../stories/hifi/parts";
import { useLanguage } from "../preferences/LanguageSettings";

const branch = require("../../../assets/onboarding/v1561.svg") as number;
const leaf = require("../../../assets/onboarding/v1557.svg") as number;

/** Ilustrasi pengecekan dipakai saat onboarding dan saat cek ulang lokasi. */
export function LocationCheckingContent(
  { top, active }: { readonly top: number; readonly active: boolean },
): ReactElement {
  const { t } = useLanguage();
  const pulse = useRef<Animated.Value>(new Animated.Value(0)).current;

  useEffect((): (() => void) | undefined => {
    if (!active) {
      pulse.setValue(0);
      return undefined;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    animation.start();
    return (): void => animation.stop();
  }, [active, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={[styles.content, { top }]} pointerEvents="none">
      <SceneLayer layer={{ src: img.welcomeBone, left: 308, top: 60, width: 68, height: 90, rotate: -30 }} />
      <SceneLayer layer={{ src: branch, left: -35, top: 315, width: 115, height: 155, rotate: 16 }} />
      <SceneLayer layer={{ src: branch, left: 28, top: 751, width: 95, height: 155, rotate: 20 }} />
      <SceneLayer layer={{ src: img.welcomeBone, left: 318, top: 740, width: 68, height: 90, rotate: -48 }} />
      <SceneLayer layer={{ src: leaf, left: 282, top: 606, width: 42, height: 25 }} />
      <View style={[styles.dot, styles.dotLeft]} />
      <View style={[styles.dot, styles.dotRight]} />
      <GeaText variant="display42" color={colors.secondaryGreen[100]} accessibilityRole="header" style={styles.title}>
        {t("Sedang\nmengecek\nlokasimu", "Checking\nyour\nlocation")}
      </GeaText>
      <Image accessible={false} source={img.map} contentFit="fill" style={styles.map} />
      <Animated.View style={[styles.pulse, { transform: [{ scale: ringScale }] }]}>
        <Image accessible={false} source={img.ring1118} style={styles.fill} />
      </Animated.View>
      <Image accessible={false} source={img.ring1117} style={styles.middleRing} />
      <Image accessible={false} source={img.ring1116} style={styles.innerRing} />
      <Image accessible={false} source={img.pin} style={styles.pin} />
      <GeaText variant="body16" color={componentColors.bodyDark} accessibilityLiveRegion="polite" style={styles.description}>
        {t("Sebentar ya, pastikan GPS\nkamu aktif.", "Please wait and make sure\nyour GPS is on.")}
      </GeaText>
    </View>
  );
}

export function LocationCheckingSplash(): ReactElement {
  return (
    <FrameStage background={colors.primary[300]}>
      <SceneLayer layer={{ src: img.shapeStep4, left: -117, top: -134.43, width: 623, height: 521.43 }} />
      <LocationCheckingContent top={0} active={true} />
    </FrameStage>
  );
}

const styles = StyleSheet.create({
  content: { position: "absolute", left: 0, width: 390, height: 844 },
  title: { position: "absolute", left: 86, top: 90, width: 218, textAlign: "center", textTransform: "uppercase" },
  map: { position: "absolute", left: 51.23, top: 293.25, width: 288.6, height: 288.5 },
  pulse: { position: "absolute", left: 105, top: 365, width: 182, height: 182 },
  fill: { width: "100%", height: "100%" },
  middleRing: { position: "absolute", left: 145, top: 396, width: 100, height: 100 },
  innerRing: { position: "absolute", left: 162, top: 413, width: 66, height: 66 },
  pin: { position: "absolute", left: 171.5, top: 414.5, width: 48, height: 48 },
  description: { position: "absolute", left: 34, top: 652, width: 323, textAlign: "center" },
  dot: { position: "absolute", width: 13, height: 13, borderRadius: 7, backgroundColor: colors.secondaryGreen[800] },
  dotLeft: { left: 38, top: 601 },
  dotRight: { left: 356, top: 700, width: 8, height: 8, backgroundColor: colors.secondaryGreen[300] },
});
