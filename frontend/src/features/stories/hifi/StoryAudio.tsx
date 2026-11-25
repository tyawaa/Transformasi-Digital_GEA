import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef } from "react";
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { colors } from "../../../design/tokens";

const speakerIcon = require("../../../../assets/design/icon-speaker.svg") as number;

export type Narration = {
  readonly key: string;
  readonly source: number | { readonly uri: string };
  readonly seconds: number;
};

type Props = {
  readonly narration: Narration;
  /** true sekali saat "Aktifkan Mode Audio" ditekan dari ringkasan; narasi langsung diputar. */
  readonly autoPlay: boolean;
  readonly onAutoPlayed: () => void;
  /** true saat cerita diistirahatkan (lihat PauseButton); narasi ikut dijeda. */
  readonly suspend: boolean;
  readonly style?: StyleProp<ViewStyle>;
};

/**
 * Tombol earphone di panel Story Isi: sekali ketuk memutar/menjeda narasi di tempat,
 * tanpa pindah ke layar lain. Dipertahankan tetap sama lintas halaman Story Isi 1/2
 * selama narasinya sama, jadi audio tidak mengulang saat pengguna membalik halaman.
 */
export function NarrationButton({ narration, autoPlay, onAutoPlayed, suspend, style }: Props): ReactElement {
  const player = useAudioPlayer(narration.source);
  const status = useAudioPlayerStatus(player);
  const autoPlayedFor = useRef<string | null>(null);

  useEffect((): void => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((cause: unknown): void => {
      console.warn("gea_audio_mode_failed", { error: cause instanceof Error ? cause.message : String(cause) });
    });
  }, []);

  useEffect((): void => {
    if (!autoPlay || !status.isLoaded || autoPlayedFor.current === narration.key) return;
    autoPlayedFor.current = narration.key;
    player.play();
    onAutoPlayed();
    // Hanya bereaksi saat flag/loading berubah; player dan onAutoPlayed stabil secara identitas per narasi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, status.isLoaded, narration.key]);

  useEffect((): void => {
    if (suspend && status.playing) player.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspend]);

  async function toggle(): Promise<void> {
    if (!status.isLoaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    const duration: number = status.duration > 0 ? status.duration : narration.seconds;
    if (status.currentTime >= duration - 0.25) await player.seekTo(0);
    player.play();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? "Jeda narasi" : "Dengarkan narasi"}
      hitSlop={8}
      style={style}
      onPress={(): void => void toggle()}
    >
      <View style={[styles.icon, status.playing && styles.iconActive]}>
        <Image accessible={false} source={speakerIcon} style={styles.speaker} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondaryYellow[100],
  },
  iconActive: { backgroundColor: colors.secondaryGreen[300] },
  speaker: { width: 24, height: 24 },
});
