// Rekaman instruksi quest (voice over kelompok) di layar quest: mundur/maju 10 detik dan putar/jeda.
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { type ReactElement, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, spacing } from "../../../design/tokens";
import { GeaText } from "../../../design/typography";
import { useLanguage } from "../../preferences/LanguageSettings";
import { releaseAudio } from "../../../services/audioFocus";
import { AudioControls } from "./AudioControls";

const speakerIcon = require("../../../../assets/design/icon-speaker.svg") as number;

export function QuestAudio({ source }: { readonly source: number }): ReactElement {
  const { t } = useLanguage();
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

  return (
    <View style={[styles.root, status.playing && styles.playing]}>
      <View style={styles.heading}>
        <Image accessible={false} source={speakerIcon} style={styles.speaker} tintColor={colors.primary[800]} />
        <GeaText variant="bold16" color={colors.primary[900]}>{t("Dengarkan instruksi", "Listen to Instructions")}</GeaText>
      </View>
      <AudioControls player={player} status={status} id={id} tone="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[8], padding: spacing[12],
    borderRadius: radius.control, borderWidth: 2, borderColor: colors.primary[600], backgroundColor: colors.primary[0],
  },
  playing: { borderColor: colors.secondaryGreen[900] },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing[8] },
  speaker: { width: 22, height: 22 },
});
