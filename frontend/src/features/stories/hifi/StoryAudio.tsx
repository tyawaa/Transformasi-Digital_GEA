import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { type ReactElement, useEffect, useRef } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { releaseAudio } from "../../../services/audioFocus";
import { AudioControls, playAudio } from "./AudioControls";

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
 * Kontrol narasi di panel Story Isi: mundur 10 detik, putar/jeda, maju 10 detik. Dipertahankan
 * lintas halaman Story Isi 1/2 selama narasinya sama, jadi audio tidak mengulang saat membalik halaman.
 * Narasi hanya diputar lewat tombol (termasuk "Aktifkan Mode Audio"), tidak otomatis.
 */
export function NarrationButton({ narration, autoPlay, onAutoPlayed, suspend, style }: Props): ReactElement {
  const player = useAudioPlayer(narration.source);
  const status = useAudioPlayerStatus(player);
  const autoPlayedFor = useRef<string | null>(null);
  const id = useRef<symbol>(Symbol("story-audio")).current;

  // Keluar dari cerita: audio berhenti, tidak terus bunyi di layar lain.
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

  useEffect((): void => {
    if (!autoPlay || !status.isLoaded || autoPlayedFor.current === narration.key) return;
    autoPlayedFor.current = narration.key;
    playAudio(player, status, id, narration.seconds);
    onAutoPlayed();
    // Hanya bereaksi saat flag/loading berubah; player dan onAutoPlayed stabil secara identitas per narasi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, status.isLoaded, narration.key]);

  useEffect((): void => {
    if (suspend && status.playing) player.pause();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspend]);

  return (
    <View style={style}>
      <AudioControls player={player} status={status} id={id} tone="dark" fallbackSeconds={narration.seconds} />
    </View>
  );
}
