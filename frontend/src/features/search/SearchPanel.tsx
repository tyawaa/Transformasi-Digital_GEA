// PB09: cari ruang atau koleksi, saring per ruang, ketuk hasil untuk menjadikannya tujuan di peta.
import { type ReactElement, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { TextField } from "../../design/TextField";
import { colors, shadows, spacing } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { MuseumPoi } from "../../data/museum";
import { buildSearchIndex, MIN_QUERY_LENGTH, normalize, type SearchEntry, type SearchHit, searchMuseum } from "./search";

type Props = {
  readonly pois: readonly MuseumPoi[];
  readonly onPick: (roomCode: string) => void;
  readonly onClose: () => void;
};

export function SearchPanel({ pois, onPick, onClose }: Props): ReactElement {
  const [query, setQuery] = useState<string>("");
  const [room, setRoom] = useState<string | null>(null);
  const index: readonly SearchEntry[] = useMemo((): readonly SearchEntry[] => buildSearchIndex(pois), [pois]);
  const hits: readonly SearchHit[] = useMemo((): readonly SearchHit[] => searchMuseum(index, query, room), [index, query, room]);
  const typed: number = normalize(query).replace(/ /g, "").length;
  const roomName: string | undefined = pois.find((poi: MuseumPoi): boolean => poi.code === room)?.name;

  return (
    <View style={styles.sheet}>
      <View style={styles.row}>
        <GeaText variant="heading24" color={colors.primary[900]} style={styles.flex}>Cari ruang & koleksi</GeaText>
        <Pressable accessibilityRole="button" accessibilityLabel="Tutup pencarian" onPress={onClose} style={styles.close}>
          <GeaText variant="heading24" color={colors.primary[800]}>×</GeaText>
        </Pressable>
      </View>
      <TextField
        search
        autoFocus
        value={query}
        onChangeText={setQuery}
        placeholder="Contoh: gunung api, lapis lazuli"
        accessibilityLabel="Cari ruang atau koleksi"
        returnKeyType="search"
        autoCorrect={false}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipBar}>
        <Chip label="Semua ruang" active={room === null} onPress={(): void => setRoom(null)} />
        {pois.map((poi: MuseumPoi): ReactElement => (
          <Chip key={poi.code} label={`${poi.code} · ${poi.name}`} active={room === poi.code}
            onPress={(): void => setRoom(room === poi.code ? null : poi.code)} />
        ))}
      </ScrollView>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {typed < MIN_QUERY_LENGTH ? (
          <GeaText variant="body14" color={colors.primary[700]}>
            Ketik minimal {MIN_QUERY_LENGTH} huruf{room !== null && roomName !== undefined ? ` untuk mencari di ${roomName}` : ""}.
          </GeaText>
        ) : hits.length === 0 ? (
          <GeaText variant="body14" color={colors.primary[700]}>
            Belum ketemu "{query.trim()}"{roomName !== undefined ? ` di ${roomName}` : ""}. Coba kata lain{room !== null ? " atau pilih Semua ruang" : ""}.
          </GeaText>
        ) : hits.map((hit: SearchHit): ReactElement => (
          <Pressable key={`${hit.kind}-${hit.roomCode}-${hit.label}`} accessibilityRole="button"
            accessibilityLabel={hit.kind === "ruang" ? `Ruang ${hit.label}. Jadikan tujuan` : `${hit.label}, di ruang ${hit.roomName}. Jadikan tujuan`}
            onPress={(): void => onPick(hit.roomCode)}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
            <View style={styles.code}><GeaText variant="bold16" color={colors.primary[900]}>{hit.roomCode}</GeaText></View>
            <View style={styles.flex}>
              <GeaText variant="bold16" color={colors.primary[900]} numberOfLines={2}>{hit.label}</GeaText>
              <GeaText variant="caption12" color={colors.primary[700]} numberOfLines={1}>
                {hit.kind === "ruang" ? "Ruang" : `Koleksi · ${hit.roomName}`}
              </GeaText>
            </View>
            <GeaText variant="body14" color={colors.primary[800]}>Tuju ›</GeaText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress }: { readonly label: string; readonly active: boolean; readonly onPress: () => void }): ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <GeaText variant="caption12" color={active ? colors.white : colors.primary[800]} numberOfLines={1}>{label}</GeaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  sheet: { position: "absolute", left: 16, top: 40, bottom: 16, width: 358, borderRadius: 24, padding: 20, gap: 12, backgroundColor: colors.white, boxShadow: shadows.drop },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  chipBar: { flexGrow: 0 },
  chips: { gap: spacing[8], paddingRight: 8 },
  chip: { minHeight: 36, maxWidth: 220, justifyContent: "center", paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.primary[300], backgroundColor: colors.secondaryYellow[0] },
  chipActive: { backgroundColor: colors.primary[800], borderColor: colors.primary[800] },
  list: { gap: 10, paddingBottom: 12 },
  hit: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, minHeight: 64, borderRadius: 16, borderWidth: 1, borderColor: colors.primary[100] },
  code: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
});
