import { Image, type ImageErrorEventData } from "expo-image";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, type TextStyle, View } from "react-native";
import type { MuseumPoi } from "../../data/museum";
import { photoHuntPhoto } from "../../data/photoHuntPhotos";
import { poiStoryPhoto } from "../../data/poiMedia";
import { colors, shadows } from "../../design/tokens";
import { GeaText, useFont } from "../../design/typography";
import { FrameStage, useFrameBleed } from "../stories/hifi/parts";
import { buildSearchIndex, MIN_QUERY_LENGTH, normalize, type SearchEntry, type SearchKind, searchMuseum } from "./search";

type Props = {
  readonly pois: readonly MuseumPoi[];
  readonly onPick: (roomCode: string) => void;
  readonly onClose: () => void;
};
type Category = { readonly kind: SearchKind; readonly label: string; readonly color: string };
type SearchPhotoSource = number | { readonly uri: string };
const categories: readonly Category[] = [
  { kind: "koleksi", label: "Koleksi", color: colors.primary[700] },
  { kind: "ruang", label: "Ruang", color: colors.tertiary[200] },
  { kind: "poi", label: "POI", color: colors.secondaryGreen[800] },
];
const background: number = require("../../../assets/daftar_pencarian/background.svg") as number;
const inputFrame: number = require("../../../assets/daftar_pencarian/input-frame.svg") as number;
const filterImage: number = require("../../../assets/daftar_pencarian/filter-button.svg") as number;
const chipFrame: number = require("../../../assets/daftar_pencarian/chip-frame.svg") as number;
const resultFrame: number = require("../../../assets/daftar_pencarian/result-frame.svg") as number;
const backImage: number = require("../../../assets/daftar_pencarian/back.svg") as number;

/** Daftar pencarian memakai katalog yang tersedia di peta; Navigasi hanya memilih tujuan. */
export function SearchPanel({ pois, onPick, onClose }: Props): ReactElement {
  const [query, setQuery] = useState<string>("");
  const [kind, setKind] = useState<SearchKind | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const resultsRef = useRef<ScrollView>(null);
  const inputFont: TextStyle = useFont("Qanelas-Regular");
  const { span } = useFrameBleed();
  const index: readonly SearchEntry[] = useMemo((): readonly SearchEntry[] => buildSearchIndex(pois), [pois]);
  const typed: number = normalize(query).replace(/ /g, "").length;
  const results: readonly SearchEntry[] = useMemo((): readonly SearchEntry[] => {
    const matches: readonly SearchEntry[] = typed === 0 ? index : searchMuseum(index, query, room);
    return matches.filter((entry: SearchEntry): boolean => (kind === null || entry.kind === kind) && (room === null || entry.roomCode === room));
  }, [index, query, typed, kind, room]);
  const selectedRoom: MuseumPoi | undefined = pois.find((poi: MuseumPoi): boolean => poi.code === room);

  useEffect((): void => {
    resultsRef.current?.scrollTo({ y: 0, animated: false });
  }, [query, kind, room]);

  return (
    <FrameStage background={colors.primary[800]}>
      <Image accessible={false} source={background} style={[styles.background, span]} contentFit="fill" pointerEvents="none" />
      <GeaText accessibilityRole="header" variant="heading28" color={colors.secondaryGreen[0]} style={styles.title} numberOfLines={1}>RUANG PENCARIAN!</GeaText>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke peta" onPress={onClose}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Image accessible={false} source={backImage} style={styles.backIcon} />
      </Pressable>
      <View style={styles.searchRow}>
        <View style={styles.inputBox}>
          <Image accessible={false} source={inputFrame} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
          <TextInput value={query} onChangeText={setQuery} placeholder="Cari Koleksi" accessibilityLabel="Cari koleksi, ruang, atau POI"
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" placeholderTextColor={colors.greys[200]}
            selectionColor={colors.primary[800]} style={[styles.input, inputFont]} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filter berdasarkan ruang"
          accessibilityState={{ expanded: filtersOpen, selected: room !== null }} onPress={(): void => setFiltersOpen(true)}
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}>
          <Image accessible={false} source={filterImage} style={StyleSheet.absoluteFill} contentFit="fill" />
          {room !== null && <View style={styles.filterDot} />}
        </Pressable>
      </View>
      <View style={styles.categories}>
        {categories.map((category: Category): ReactElement => (
          <Pressable key={category.kind} accessibilityRole="button" accessibilityLabel={`Kategori ${category.label}`}
            accessibilityState={{ selected: kind === category.kind }} onPress={(): void => setKind(kind === category.kind ? null : category.kind)}
            style={({ pressed }) => [styles.category, kind === category.kind && styles.categorySelected, pressed && styles.pressed]}>
            <Image accessible={false} source={chipFrame} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
            <GeaText variant="body14" color={colors.black}>{category.label}</GeaText>
          </Pressable>
        ))}
      </View>
      {selectedRoom !== undefined && <Pressable accessibilityRole="button" accessibilityLabel="Hapus filter ruang" onPress={(): void => setRoom(null)} style={styles.roomFilter}>
        <GeaText variant="caption12" color={colors.primary[900]} numberOfLines={1}>{selectedRoom.code} · {selectedRoom.name}  ×</GeaText>
      </Pressable>}
      <ScrollView ref={resultsRef} style={[styles.results, room !== null && styles.filteredResults]} contentContainerStyle={styles.resultList}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {typed > 0 && typed < MIN_QUERY_LENGTH ? (
          <View style={styles.notice}><GeaText variant="body16" color={colors.primary[900]}>Ketik minimal {MIN_QUERY_LENGTH} huruf untuk mencari koleksi, ruang, atau kode POI.</GeaText></View>
        ) : results.length === 0 ? (
          <View style={styles.notice} accessibilityLiveRegion="polite">
            <GeaText variant="heading24" color={colors.tertiary[300]}>Belum ada hasil</GeaText>
            <GeaText variant="body14" color={colors.primary[900]}>{query.trim().length > 0 ? `Belum ketemu “${query.trim()}”. Coba kata lain atau ubah filter.` : "Belum ada koleksi untuk filter ini."}</GeaText>
          </View>
        ) : results.map((entry: SearchEntry): ReactElement => {
          const poi: MuseumPoi | undefined = pois.find((item: MuseumPoi): boolean => item.code === entry.roomCode);
          const category: Category | undefined = categories.find((item: Category): boolean => item.kind === entry.kind);
          if (poi === undefined || category === undefined) throw new RangeError(`Data hasil pencarian ${entry.kind}/${entry.roomCode}/${entry.label} tidak tersedia.`);
          return <SearchCard key={`${entry.kind}-${entry.roomCode}-${entry.label}`} entry={entry} poi={poi} category={category} onPick={onPick} />;
        })}
      </ScrollView>
      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={(): void => setFiltersOpen(false)}>
        <FrameStage background="rgba(31, 26, 22, 0.45)">
          <Pressable accessibilityRole="button" accessibilityLabel="Tutup filter ruang" style={StyleSheet.absoluteFill} onPress={(): void => setFiltersOpen(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.filterHeading}>
              <GeaText variant="heading28" color={colors.primary[900]}>Pilih ruang</GeaText>
              <Pressable accessibilityRole="button" accessibilityLabel="Tutup pilihan ruang" onPress={(): void => setFiltersOpen(false)} style={styles.closeFilter}>
                <GeaText variant="heading24" color={colors.primary[900]}>×</GeaText>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.roomList}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: room === null }} onPress={(): void => { setRoom(null); setFiltersOpen(false); }} style={styles.roomOption}>
                <GeaText variant="bold16" color={colors.primary[900]}>Semua ruang</GeaText>
              </Pressable>
              {pois.map((poi: MuseumPoi): ReactElement => (
                <Pressable key={poi.code} accessibilityRole="button" accessibilityLabel={`Filter ${poi.code}, ${poi.name}`}
                  accessibilityState={{ selected: room === poi.code }} onPress={(): void => { setRoom(poi.code); setFiltersOpen(false); }}
                  style={[styles.roomOption, room === poi.code && styles.roomOptionSelected]}>
                  <GeaText variant="body14" color={colors.primary[900]}>{poi.code} · {poi.name}</GeaText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </FrameStage>
      </Modal>
    </FrameStage>
  );
}

function SearchCard({ entry, poi, category, onPick }: {
  readonly entry: SearchEntry;
  readonly poi: MuseumPoi;
  readonly category: Category;
  readonly onPick: (roomCode: string) => void;
}): ReactElement {
  const title: string = entry.kind === "poi" ? `POI ${poi.number}` : entry.label;
  const description: string | null = entry.kind === "koleksi" ? `Koleksi di ${poi.name}.`
    : entry.kind === "poi" ? poi.name : poi.content?.fakta ?? null;
  const photo: SearchPhotoSource = entry.kind === "koleksi" ? photoHuntPhoto(poi.code) : { uri: poiStoryPhoto(poi.idPoi, 1) };
  return (
    <View style={styles.card}>
      <Image accessible={false} source={resultFrame} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
      <SearchPhoto source={photo} label={`Foto ${title}`} />
      <View style={styles.cardBody}>
        <View style={[styles.tag, { backgroundColor: category.color }]}>
          <GeaText variant="chip10" color={colors.secondaryYellow[0]}>{category.label}</GeaText>
        </View>
        <GeaText variant="heading28" color={colors.tertiary[300]} numberOfLines={entry.kind === "koleksi" ? 3 : 2} style={styles.cardTitle}>{title}</GeaText>
        {description !== null && <GeaText variant="body14" color={colors.primary[800]} numberOfLines={3} style={styles.description}>{description}</GeaText>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Navigasi ke ${title}, ${poi.code}`}
          onPress={(): void => onPick(poi.code)} style={({ pressed }) => [styles.navigate, pressed && styles.pressed]}>
          <GeaText variant="bold16" color={colors.black}>Navigasi</GeaText>
        </Pressable>
      </View>
    </View>
  );
}

function SearchPhoto({ source, label }: { readonly source: SearchPhotoSource; readonly label: string }): ReactElement {
  const [attempt, setAttempt] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  function handleError(event: ImageErrorEventData): void {
    console.warn("gea_search_photo_failed", { source, attempt: attempt + 1, error: event.error });
    if (attempt < 2) {
      setAttempt(attempt + 1);
      return;
    }
    setError(event.error);
  }
  return (
    <View style={styles.photo}>
      <Image key={attempt} source={source} accessibilityLabel={label} style={StyleSheet.absoluteFill} contentFit="cover" onError={handleError} />
      {error !== null && <Pressable accessibilityRole="button" accessibilityLabel={`Muat ulang ${label}. ${error}`}
        onPress={(): void => { setError(null); setAttempt(0); }} style={styles.photoError}>
        <GeaText variant="caption12" color={colors.primary[900]} style={styles.photoErrorText}>Foto gagal dimuat. Ketuk untuk mencoba lagi.</GeaText>
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  background: { position: "absolute", top: 0, bottom: 0 },
  title: { position: "absolute", left: 16, right: 76, top: 58, fontSize: 32, lineHeight: 38 },
  back: { position: "absolute", right: 16, top: 54, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondaryYellow[0], alignItems: "center", justifyContent: "center" },
  backIcon: { width: 22, height: 22, transform: [{ rotate: "180deg" }] },
  searchRow: { position: "absolute", top: 106, left: 12, right: 12, height: 54, flexDirection: "row", gap: 8 },
  inputBox: { flex: 1 },
  input: { flex: 1, position: "relative", zIndex: 1, paddingHorizontal: 18, paddingVertical: 0, fontSize: 16, color: colors.primary[900] },
  filterButton: { width: 44, height: 54 },
  filterDot: { position: "absolute", right: 2, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondaryGreen[300] },
  categories: { position: "absolute", left: 14, top: 172, flexDirection: "row", gap: 8 },
  category: { width: 72, height: 34, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  categorySelected: { borderColor: colors.secondaryGreen[800] },
  roomFilter: { position: "absolute", top: 216, left: 16, right: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.secondaryGreen[100] },
  results: { position: "absolute", top: 220, left: 12, right: 12, bottom: 16 },
  filteredResults: { top: 260 },
  resultList: { gap: 12, paddingBottom: 12 },
  card: { minHeight: 168, flexDirection: "row", padding: 16, gap: 12, borderRadius: 14, boxShadow: shadows.card },
  photo: { width: 110, minHeight: 132, alignSelf: "stretch", borderRadius: 16, overflow: "hidden", backgroundColor: colors.primary[100] },
  photoError: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 8, backgroundColor: colors.primary[100] },
  photoErrorText: { textAlign: "center", lineHeight: 16 },
  cardBody: { flex: 1, gap: 6 },
  tag: { alignSelf: "flex-start", paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, minHeight: 14 },
  cardTitle: { lineHeight: 30 },
  description: { fontSize: 12, lineHeight: 15 },
  navigate: { minHeight: 36, marginTop: 4, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.secondaryGreen[300], boxShadow: shadows.card },
  pressed: { opacity: 0.7 },
  notice: { padding: 20, gap: 12, borderRadius: 16, backgroundColor: colors.primary[0] },
  filterSheet: { position: "absolute", left: 16, right: 16, bottom: 24, maxHeight: 624, borderRadius: 24, padding: 20, gap: 12, backgroundColor: colors.secondaryYellow[0] },
  filterHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeFilter: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  roomList: { gap: 8 },
  roomOption: { minHeight: 44, justifyContent: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200] },
  roomOptionSelected: { backgroundColor: colors.secondaryGreen[100] },
});
