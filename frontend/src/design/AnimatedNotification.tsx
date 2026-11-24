import { type ReactElement, useEffect, useRef, useState } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { useReducedMotion } from "./useReducedMotion";

/** Pertahankan notifikasi sampai animasi keluar selesai, termasuk ketika timer mengosongkan isinya. */
export function AnimatedNotification({ children, style }: {
  readonly children: ReactElement | null;
  readonly style: StyleProp<ViewStyle>;
}): ReactElement | null {
  const [retained, setRetained] = useState<ReactElement | null>(children);
  const reducedMotion: boolean | null = useReducedMotion();
  const progress: Animated.Value = useRef<Animated.Value>(new Animated.Value(0)).current;
  const visible: boolean = children !== null;

  useEffect((): void => {
    if (children !== null) setRetained(children);
  }, [children]);

  useEffect((): (() => void) | undefined => {
    if (reducedMotion === null) return undefined;
    if (reducedMotion) {
      progress.setValue(visible ? 1 : 0);
      if (!visible) setRetained(null);
      return undefined;
    }
    const animation: Animated.CompositeAnimation = visible
      ? Animated.spring(progress, { toValue: 1, stiffness: 240, damping: 21, mass: 0.8, useNativeDriver: true, isInteraction: false })
      : Animated.timing(progress, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true, isInteraction: false });
    animation.start(({ finished }: { readonly finished: boolean }): void => {
      if (finished && !visible) setRetained(null);
    });
    return (): void => animation.stop();
  }, [progress, visible, reducedMotion]);

  const content: ReactElement | null = children ?? retained;
  if (content === null) return null;
  return (
    <Animated.View
      testID="notification-motion"
      pointerEvents={visible ? "box-none" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={[style, {
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" }),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }]}
    >
      {content}
    </Animated.View>
  );
}
