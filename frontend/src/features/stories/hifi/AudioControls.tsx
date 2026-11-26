// Pemutar audio bergaya video player (narasi cerita dan instruksi quest): garis waktu yang bisa
// diketuk/digeser, waktu berjalan/total, tombol mundur 10 detik, putar/jeda, maju 10 detik.
import type { AudioPlayer, AudioStatus } from "expo-audio";
import { type ReactElement, useRef, useState } from "react";
import { type GestureResponderEvent, type LayoutChangeEvent, PanResponder, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { colors } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { useLanguage } from "../../preferences/LanguageSettings";
import { claimAudio } from "../../../services/audioFocus";

export const SKIP_SECONDS = 10;

export function clock(seconds: number): string {
  const safe: number = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Posisi baru setelah mundur/maju, dibatasi awal dan akhir rekaman. */
export function skipTarget(current: number, delta: number, duration: number): number {
  const end: number = duration > 0 ? Math.max(0, duration - 0.1) : Number.POSITIVE_INFINITY;
  return Math.min(end, Math.max(0, current + delta));
}

export function playAudio(player: AudioPlayer, status: AudioStatus, id: symbol, fallbackSeconds: number = 0): void {
  const duration: number = status.duration > 0 ? status.duration : fallbackSeconds;
  if (duration > 0 && status.currentTime >= duration - 0.25) void player.seekTo(0);
  claimAudio(id, (): void => player.pause());
  player.play();
}

function PlayIcon({ color }: { readonly color: string }): ReactElement {
  return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill={color} /></Svg>;
}

function PauseIcon({ color }: { readonly color: string }): ReactElement {
  return <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M7 4.5h3.2v15H7zM13.8 4.5H17v15h-3.2z" fill={color} /></Svg>;
}

/** Panah melingkar dengan angka 10, seperti tombol lompat di pemutar video. */
function SkipIcon({ color, forward }: { readonly color: string; readonly forward: boolean }): ReactElement {
  const arc: string = forward
    ? "M12 4.5a7.5 7.5 0 1 1-7.3 5.8M12 4.5V1.8l3.6 2.7L12 7.2z"
    : "M12 4.5a7.5 7.5 0 1 0 7.3 5.8M12 4.5V1.8L8.4 4.5 12 7.2z";
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24">
      <Path d={arc} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <SvgText x={12} y={15.6} fontSize={7.5} fontWeight="bold" fill={color} textAnchor="middle">10</SvgText>
    </Svg>
  );
}

type Props = {
  readonly player: AudioPlayer;
  readonly status: AudioStatus;
  readonly id: symbol;
  /** "dark" = di atas panel cokelat cerita, "light" = di kartu quest. */
  readonly tone: "dark" | "light";
  readonly fallbackSeconds?: number;
};

export function AudioControls({ player, status, id, tone, fallbackSeconds = 0 }: Props): ReactElement {
  const { t } = useLanguage();
  const duration: number = status.duration > 0 ? status.duration : fallbackSeconds;
  const ready: boolean = status.isLoaded;
  const [width, setWidth] = useState<number>(0);
  // Saat garis waktu digeser, posisi mengikuti jari dulu; audio baru dipindah saat dilepas.
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const live = useRef({ width: 0, duration: 0, ready: false });
  live.current = { width, duration, ready };

  const ratio: number = dragRatio ?? (duration > 0 ? Math.min(1, status.currentTime / duration) : 0);
  const shown: number = dragRatio === null ? status.currentTime : dragRatio * duration;
  const ink: string = colors.primary[900];
  const track: string = tone === "dark" ? colors.primary[300] : colors.primary[100];

  function ratioAt(event: GestureResponderEvent): number {
    const w: number = live.current.width;
    return w <= 0 ? 0 : Math.min(1, Math.max(0, event.nativeEvent.locationX / w));
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (): boolean => live.current.ready,
    onMoveShouldSetPanResponder: (): boolean => live.current.ready,
    onPanResponderGrant: (event: GestureResponderEvent): void => setDragRatio(ratioAt(event)),
    onPanResponderMove: (event: GestureResponderEvent): void => setDragRatio(ratioAt(event)),
    onPanResponderRelease: (event: GestureResponderEvent): void => {
      void player.seekTo(ratioAt(event) * live.current.duration);
      setDragRatio(null);
    },
    onPanResponderTerminate: (): void => setDragRatio(null),
  })).current;

  function skip(delta: number): void {
    if (!ready) return;
    void player.seekTo(skipTarget(status.currentTime, delta, duration));
  }

  function toggle(): void {
    if (!ready) return;
    if (status.playing) player.pause();
    else playAudio(player, status, id, fallbackSeconds);
  }

  return (
    <View style={[styles.root, tone === "dark" ? styles.rootDark : styles.rootLight]}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t("Posisi audio", "Audio position")}
        accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shown), text: `${clock(shown)} / ${clock(duration)}` }}
        style={styles.scrubArea}
        onLayout={(event: LayoutChangeEvent): void => setWidth(event.nativeEvent.layout.width)}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={[styles.track, { backgroundColor: track }]}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View pointerEvents="none" style={[styles.thumb, dragRatio !== null && styles.thumbActive, { left: Math.max(0, ratio * width - 7) }]} />
      </View>
      <View style={styles.row}>
        <GeaText variant="caption12" color={ink} style={styles.time}>{ready ? clock(shown) : "--:--"}</GeaText>
        <View style={styles.buttons}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Mundur 10 detik", "Back 10 seconds")}
            disabled={!ready} hitSlop={8} onPress={(): void => skip(-SKIP_SECONDS)}
            style={({ pressed }) => [styles.small, pressed && styles.pressed, !ready && styles.disabled]}>
            <SkipIcon color={ink} forward={false} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? t("Jeda", "Pause") : t("Putar", "Play")}
            disabled={!ready} hitSlop={8} onPress={toggle}
            style={({ pressed }) => [styles.main, pressed && styles.pressed, !ready && styles.disabled]}>
            {status.playing ? <PauseIcon color={colors.white} /> : <PlayIcon color={colors.white} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Maju 10 detik", "Forward 10 seconds")}
            disabled={!ready} hitSlop={8} onPress={(): void => skip(SKIP_SECONDS)}
            style={({ pressed }) => [styles.small, pressed && styles.pressed, !ready && styles.disabled]}>
            <SkipIcon color={ink} forward />
          </Pressable>
        </View>
        <GeaText variant="caption12" color={ink} style={[styles.time, styles.timeEnd]}>{ready ? clock(duration) : "--:--"}</GeaText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 2, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6, borderRadius: 16 },
  rootDark: { backgroundColor: colors.secondaryYellow[100] },
  rootLight: { backgroundColor: colors.secondaryYellow[0] },
  scrubArea: { height: 24, justifyContent: "center" },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.danger[500] },
  thumb: { position: "absolute", top: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.danger[500] },
  thumbActive: { transform: [{ scale: 1.3 }] },
  row: { flexDirection: "row", alignItems: "center" },
  time: { width: 40 },
  timeEnd: { textAlign: "right" },
  buttons: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  small: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  main: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[900] },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});
