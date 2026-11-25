import { type ReactElement, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useLanguage } from "../features/preferences/LanguageSettings";

export type ToastCountdown = {
  readonly id: number | string;
  readonly durationMs: number;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE: number = 32;
const RADIUS: number = 13;
const CIRCUMFERENCE: number = 2 * Math.PI * RADIUS;

/** X tetap diam; panjang garis lingkaran dan penutupan otomatis memakai satu jam animasi. */
export function ToastCloseButton({ color, countdown, onClose }: {
  readonly color: string;
  readonly countdown: ToastCountdown | null;
  readonly onClose: () => void;
}): ReactElement {
  const { t } = useLanguage();
  const remaining: Animated.Value = useRef<Animated.Value>(new Animated.Value(1)).current;
  const close = useRef<() => void>(onClose);
  const durationMs: number | null = countdown === null ? null : countdown.durationMs;
  if (durationMs !== null && (!Number.isFinite(durationMs) || durationMs <= 0)) {
    throw new RangeError(`Durasi countdown notifikasi harus positif dan finite: durationMs=${durationMs}.`);
  }

  useEffect((): void => {
    close.current = onClose;
  }, [onClose]);

  useEffect((): (() => void) | undefined => {
    remaining.setValue(1);
    if (durationMs === null) return undefined;
    const animation: Animated.CompositeAnimation = Animated.timing(remaining, {
      toValue: 0, duration: durationMs, easing: Easing.linear, useNativeDriver: false, isInteraction: false,
    });
    animation.start(({ finished }: { readonly finished: boolean }): void => {
      if (finished) close.current();
    });
    return (): void => animation.stop();
  }, [durationMs, remaining]);

  function dismiss(): void {
    remaining.stopAnimation();
    onClose();
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup notifikasi", "Close notification")} testID="notification-close-button"
      hitSlop={8} onPress={dismiss} style={styles.button}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} testID="notification-countdown">
          <AnimatedCircle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={color} strokeWidth={2}
            strokeLinecap="round" strokeDasharray={[CIRCUMFERENCE, CIRCUMFERENCE]}
            strokeDashoffset={remaining.interpolate({ inputRange: [0, 1], outputRange: [CIRCUMFERENCE, 0] })}
            opacity={remaining.interpolate({ inputRange: [0, 0.001], outputRange: [0, 1], extrapolate: "clamp" })}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View testID="notification-close-x" style={styles.cross}>
          <View style={[styles.stroke, { backgroundColor: color, transform: [{ rotate: "45deg" }] }]} />
          <View style={[styles.stroke, { backgroundColor: color, transform: [{ rotate: "-45deg" }] }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: SIZE, height: SIZE },
  cross: { position: "absolute", left: 9, top: 9, width: 14, height: 14 },
  stroke: { position: "absolute", top: 6, left: 0, width: 14, height: 2, borderRadius: 1 },
});
