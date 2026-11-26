// Tombol putar rekaman instruksi quest (voice over kelompok) di layar quest.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { claimAudio, releaseAudio } from "../../../services/audioFocus";

const speakerIcon = require("../../../../assets/design/icon-speaker.svg") as number;

function clock(seconds: number): string {
  const safe: number = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function QuestAudio({ source }: { readonly source: number }): ReactElement {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const id = useRef<symbol>(Symbol("quest-audio")).current;

  useEffect((): (() => void) => (): void => {
    releaseAudio(id);
    try {
      player.pause();
    } catch {
      // Pemutar sudah dilepas expo-audio.
    }
  }, [id, player]);

  useEffect((): void => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((cause: unknown): void => {
      console.warn("gea_audio_mode_failed", { error: cause instanceof Error ? cause.message : String(cause) });
    });
  }, []);

  const duration: number = status.duration > 0 ? status.duration : 0;
  const atEnd: boolean = duration > 0 && status.currentTime >= duration - 0.25;
  const progress: number = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;

  function toggle(): void {
    if (status.playing) {
      player.pause();
      return;
    }
    if (atEnd) void player.seekTo(0);
    claimAudio(id, (): void => player.pause());
    player.play();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? "Jeda rekaman instruksi" : "Dengarkan instruksi quest"}
      disabled={!status.isLoaded}
      onPress={toggle}
      style={({ pressed }) => [styles.root, status.playing && styles.playing, pressed && styles.pressed]}
    >
      <View style={[styles.icon, status.playing && styles.iconPlaying]}>
        <Image accessible={false} source={speakerIcon} style={styles.speaker} tintColor={status.playing ? colors.white : colors.primary[800]} />
      </View>
      <View style={styles.body}>
        <GeaText variant="bold16" color={colors.primary[900]}>
          {!status.isLoaded ? "Memuat rekaman…" : status.playing ? "Jeda" : atEnd ? "Dengarkan lagi" : "Dengarkan instruksi"}
        </GeaText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
      <GeaText variant="caption12" color={colors.primary[800]}>{clock(status.playing || status.currentTime > 0 ? status.currentTime : duration)}</GeaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row", alignItems: "center", gap: spacing[12], padding: spacing[12],
    borderRadius: radius.control, borderWidth: 2, borderColor: colors.primary[600], backgroundColor: colors.primary[0],
  },
  playing: { borderColor: colors.secondaryGreen[900] },
  pressed: { opacity: 0.8 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.secondaryYellow[0] },
  iconPlaying: { backgroundColor: colors.secondaryGreen[900] },
  speaker: { width: 22, height: 22 },
  body: { flex: 1, gap: 6 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.primary[100], overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.secondaryGreen[900] },
});
