import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { type ReactElement, type Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { type GestureResponderEvent, Platform, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { colors, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { useLanguage } from "../../preferences/LanguageSettings";

const speakerIcon = require("../../../../assets/design/icon-speaker.svg") as number;

export type AudioControlsHandle = { readonly play: () => Promise<void> };

type Props = {
  readonly source: number | { readonly uri: string };
  readonly durationSeconds?: number;
  readonly autoPlay?: boolean;
  readonly onAutoPlayed?: (() => void) | undefined;
  readonly suspend?: boolean;
  readonly onDark?: boolean;
  readonly expanded?: boolean;
  readonly ref?: Ref<AudioControlsHandle>;
};

function clock(seconds: number): string {
  const wholeSeconds: number = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

export function AudioToggle({ expanded, onPress, style }: {
  readonly expanded: boolean;
  readonly onPress: () => void;
  readonly style?: StyleProp<ViewStyle>;
}): ReactElement {
  const { t } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={expanded ? t("Tutup kontrol audio", "Hide audio controls") : t("Dengarkan audio", "Listen to audio")}
      accessibilityState={{ expanded }}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.speaker, style, pressed && styles.dim]}
    >
      <Image accessible={false} source={speakerIcon} style={styles.speakerIcon} />
    </Pressable>
  );
}

export function AudioControls({ source, durationSeconds = 0, autoPlay = false, onAutoPlayed, suspend = false, onDark = false, expanded, ref }: Props): ReactElement | null {
  const { t } = useLanguage();
  const player = useAudioPlayer(source, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const autoPlayed = useRef<boolean>(false);
  const sliderWidth = useRef<number>(0);
  const sliderLeft = useRef<number>(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [localExpanded, setLocalExpanded] = useState<boolean | null>(null);
  const visible: boolean = expanded ?? localExpanded ?? autoPlay;

  useEffect((): void => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((cause: unknown): void => {
      console.warn("gea_audio_mode_failed", { error: cause instanceof Error ? cause.message : String(cause) });
    });
  }, []);

  useEffect((): void => {
    if (!visible || suspend || !status.isLoaded || (!autoPlay && onAutoPlayed === undefined) || autoPlayed.current) return;
    autoPlayed.current = true;
    if (!player.playing) player.play();
    onAutoPlayed?.();
  }, [autoPlay, onAutoPlayed, player, status.isLoaded, suspend, visible]);

  useEffect((): void => {
    if ((!visible || suspend) && status.playing) player.pause();
  }, [player, status.playing, suspend, visible]);

  const duration: number = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : durationSeconds;
  const atEnd: boolean = status.didJustFinish || (duration > 0 && status.currentTime >= duration);
  const currentTime: number = preview ?? (atEnd && duration > 0 ? duration : Math.max(0, status.currentTime));
  const progress: number = duration > 0 ? Math.min(100, currentTime / duration * 100) : 0;
  const label: string = status.playing ? t("Jeda", "Pause") : atEnd ? t("Putar ulang", "Replay") : t("Putar", "Play");
  const elapsed: string = clock(currentTime);
  const total: string = duration > 0 ? clock(duration) : "–:––";
  const time: string = `${elapsed} / ${total}`;
  const ink: string = onDark ? colors.secondaryYellow[0] : colors.primary[900];
  const canSeek: boolean = status.isLoaded && !suspend && duration > 0;
  const sliderLabel: string = t("Posisi audio", "Audio position");
  const clampTime = (seconds: number): number => Math.max(0, Math.min(duration, seconds));

  function seek(seconds: number): void {
    if (!canSeek) return;
    void player.seekTo(clampTime(seconds)).catch((cause: unknown): void => {
      console.warn("gea_audio_seek_failed", cause);
    });
  }

  function skip(seconds: number): void {
    seek(player.currentTime + seconds);
  }

  function touchTime(event: GestureResponderEvent): number {
    return clampTime((event.nativeEvent.pageX - sliderLeft.current) / sliderWidth.current * duration);
  }

  async function play(): Promise<void> {
    if (suspend || player.playing) return;
    if (atEnd) {
      try {
        await player.seekTo(0);
      } catch (cause: unknown) {
        console.warn("gea_audio_replay_failed", cause);
        return;
      }
    }
    player.play();
  }

  useImperativeHandle(ref, () => ({ play }));

  function toggle(): void {
    if (player.playing) player.pause();
    else void play();
  }

  if (!visible && expanded !== undefined) return null;

  return (
    <View style={styles.root}>
      {expanded === undefined && <AudioToggle expanded={visible} onPress={(): void => {
        setLocalExpanded(!visible);
        if (!visible) void play();
      }} style={styles.inlineSpeaker} />}
      {visible && <>
        <View>
          {Platform.OS === "web" ? (
            <input
              type="range"
              aria-label={sliderLabel}
              aria-valuetext={time}
              min={0}
              max={duration}
              step="any"
              value={Math.min(currentTime, duration)}
              disabled={!canSeek}
              onChange={(event): void => seek(Number(event.currentTarget.value))}
              style={{ display: "block", width: "100%", height: 24, margin: 0, accentColor: ink, touchAction: "none", cursor: canSeek ? "pointer" : "default" }}
            />
          ) : (
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={sliderLabel}
              accessibilityState={{ disabled: !canSeek }}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress), text: time }}
              accessibilityActions={[{ name: "decrement" }, { name: "increment" }]}
              onAccessibilityAction={(event): void => skip(event.nativeEvent.actionName === "decrement" ? -5 : 5)}
              onLayout={(event): void => { sliderWidth.current = event.nativeEvent.layout.width; }}
              onStartShouldSetResponder={(): boolean => canSeek && sliderWidth.current > 0}
              onResponderGrant={(event): void => {
                sliderLeft.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
                setPreview(touchTime(event));
              }}
              onResponderMove={(event): void => setPreview(touchTime(event))}
              onResponderRelease={(event): void => { seek(touchTime(event)); setPreview(null); }}
              onResponderTerminate={(): void => setPreview(null)}
              style={styles.slider}
            >
              <View pointerEvents="none" style={styles.track}>
                <View style={[styles.fill, { width: `${progress}%`, backgroundColor: ink }]} />
                <View style={[styles.thumb, { left: `${progress}%`, backgroundColor: ink }]} />
              </View>
            </View>
          )}
          <View style={styles.times}>
            <GeaText variant="caption12" color={ink}>{elapsed}</GeaText>
            <GeaText variant="caption12" color={ink}>{total}</GeaText>
          </View>
        </View>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Mundur 5 detik", "Back 5 seconds")} disabled={!canSeek} onPress={(): void => skip(-5)} style={({ pressed }) => [styles.skip, (!canSeek || pressed) && styles.dim]}>
            <View style={[styles.skipGlyph, styles.reverse]}>
              <View style={[styles.chevron, { borderLeftColor: ink }]} /><View style={[styles.chevron, { borderLeftColor: ink }]} />
            </View>
            <GeaText variant="caption12" color={ink}>5</GeaText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={status.isLoaded ? label : t("Memuat audio…", "Loading audio…")}
            disabled={!status.isLoaded || suspend}
            onPress={toggle}
            style={({ pressed }) => [styles.button, (!status.isLoaded || suspend || pressed) && styles.dim]}
          >
            {status.playing ? <View style={styles.pause}><View style={styles.bar} /><View style={styles.bar} /></View>
              : <View style={styles.play} />}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Maju 5 detik", "Forward 5 seconds")} disabled={!canSeek} onPress={(): void => skip(5)} style={({ pressed }) => [styles.skip, (!canSeek || pressed) && styles.dim]}>
            <View style={styles.skipGlyph}>
              <View style={[styles.chevron, { borderLeftColor: ink }]} /><View style={[styles.chevron, { borderLeftColor: ink }]} />
            </View>
            <GeaText variant="caption12" color={ink}>5</GeaText>
          </Pressable>
        </View>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing[4] },
  speaker: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondaryYellow[100] },
  speakerIcon: { width: 24, height: 24 },
  inlineSpeaker: { alignSelf: "flex-end" },
  button: {
    width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.secondaryYellow[100],
  },
  dim: { opacity: 0.65 },
  play: {
    marginLeft: 3, width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderLeftWidth: 12,
    borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: colors.primary[800],
  },
  pause: { flexDirection: "row", gap: 4 },
  bar: { width: 4, height: 16, borderRadius: 1, backgroundColor: colors.primary[800] },
  times: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing[4] },
  slider: { height: 28, justifyContent: "center", paddingHorizontal: 6 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.primary[100] },
  fill: { height: 4, borderRadius: 2 },
  thumb: { position: "absolute", top: -4, marginLeft: -6, width: 12, height: 12, borderRadius: 6 },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing[16] },
  skip: { width: 44, height: 44, gap: 2, justifyContent: "center", alignItems: "center" },
  skipGlyph: { flexDirection: "row" },
  reverse: { transform: [{ scaleX: -1 }] },
  chevron: { width: 0, height: 0, borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 8, borderTopColor: "transparent", borderBottomColor: "transparent" },
});
