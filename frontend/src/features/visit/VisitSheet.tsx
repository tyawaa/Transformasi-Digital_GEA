import { Image } from "expo-image";
import { type ReactElement, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Button } from "../../design/Button";
import { SheetHeading } from "../../design/SheetModal";
import { colors } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { photoHuntPhoto } from "../../data/photoHuntPhotos";
import { poiStoryPhoto } from "../../data/poiMedia";
import photoHunt from "../../../assets/daftar_pencarian/photo-hunt/catalog.json";
import { FrameStage } from "../stories/hifi/parts";
import { closingTimeLabel, type VisitPrompt, type VisitSuggestion } from "./lifecycle";

export type VisitPanel = VisitPrompt | "finish" | "extend" | "closed" | "finished";
type Props = {
  readonly panel: VisitPanel | null;
  readonly closingAtMs: number;
  readonly options: readonly number[];
  readonly suggestion: VisitSuggestion | null;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onDismiss: () => void;
  readonly onChooseExtension: () => void;
  readonly onExtend: (minutes: number) => void;
  readonly onSuggest: () => void;
  readonly onFinish: () => void;
  readonly onSummary: () => void;
  readonly onExitDirections: () => void;
};
type Copy = { readonly title: string; readonly description: string };

function sheetCopy(panel: VisitPanel, closingAtMs: number): Copy {
  const closing: string = closingTimeLabel(closingAtMs);
  const copy: Readonly<Record<VisitPanel, Copy>> = {
    closing_soon: { title: "Museum segera tutup", description: `Museum tutup pukul ${closing} WIB. Selesaikan penjelajahanmu dan sisakan waktu untuk menuju pintu keluar.` },
    closing_prepare: { title: "Saatnya bersiap pulang", description: `Museum tutup pukul ${closing} WIB. Selesaikan aktivitasmu dan bersiap menuju pintu keluar. Kunjungan akan selesai otomatis saat museum tutup.` },
    time_soon: { title: "Masih ingin menjelajah?", description: "Rencana kunjunganmu tinggal 5 menit atau kurang. Mau menambah waktu untuk melihat koleksi lainnya?" },
    time_up: { title: "Waktu rencanamu selesai", description: "Masih ingin melanjutkan perjalanan? Kamu bisa menambah waktu selama museum masih buka." },
    route_done: { title: "Rute pilihanmu sudah selesai!", description: "Masih punya waktu? Ada koleksi lain yang bisa kamu jelajahi sebelum mengakhiri kunjungan." },
    finish: { title: "Selesaikan perjalanan?", description: "Progres dan poin yang sudah tercatat tetap tersimpan. Kunjungan yang sudah selesai tidak dapat dilanjutkan kembali." },
    extend: { title: "Mau tambah berapa lama?", description: `Tambahan waktu melanjutkan rencana kunjunganmu. Museum tutup pukul ${closing} WIB; 5 menit terakhir disisihkan untuk bersiap keluar.` },
    closed: { title: "Museum sudah tutup", description: "Kunjunganmu hari ini telah selesai. Terima kasih sudah menjelajah bersama GEA! Progres yang sudah tercatat tetap tersimpan." },
    finished: { title: "Perjalananmu sudah selesai", description: "Terima kasih sudah menjelajah bersama GEA! Kamu bisa membuka kembali ringkasan, progres, dan poin kunjungan ini." },
  };
  return copy[panel];
}

/** Sheet akhir kunjungan mengikuti warna, font, dan lengkung desain GEA; semua teks tetap native. */
export function VisitSheet(props: Props): ReactElement | null {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  if (props.panel === null) return null;
  const copy: Copy = sheetCopy(props.panel, props.closingAtMs);
  const completed: boolean = props.panel === "closed" || props.panel === "finished";
  const canSuggest: boolean = props.suggestion !== null && (props.panel === "finish" || props.panel === "route_done");
  const showExtension: boolean = props.options.length > 0 && ["time_soon", "time_up", "route_done", "finish"].includes(props.panel);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={completed ? props.onSummary : props.onDismiss}>
      <FrameStage background="rgba(31,26,22,0.42)">
        {!completed && <Pressable accessibilityRole="button" accessibilityLabel="Tutup pemberitahuan kunjungan"
          style={StyleSheet.absoluteFill} onPress={props.busy ? undefined : props.onDismiss} />}
        <View style={styles.sheet} accessibilityViewIsModal>
          <Svg width={390} height={54} viewBox="0 0 390 54" style={styles.curve} accessible={false}>
            <Path d="M0 9 Q190 -9 390 54 L390 55 L0 55Z" fill={colors.secondaryYellow[0]} />
          </Svg>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <SheetHeading title={copy.title} description={copy.description} />
            {canSuggest && props.suggestion !== null && <SuggestionCard suggestion={props.suggestion} />}
            {props.panel === "extend" && <View style={styles.options}>
              {props.options.map((minutes: number): ReactElement => <Pressable key={minutes} accessibilityRole="radio"
                accessibilityLabel={`Tambah ${minutes} menit`} accessibilityState={{ checked: selectedMinutes === minutes, disabled: props.busy }}
                disabled={props.busy} onPress={(): void => setSelectedMinutes(minutes)}
                style={[styles.option, selectedMinutes === minutes && styles.selected]}>
                <GeaText variant="bold16" color={colors.primary[900]}>+{minutes} menit</GeaText>
              </Pressable>)}
              {props.options.length === 0 && <GeaText variant="body14" color={colors.primary[800]}>Waktu tambahan sudah tidak tersedia. Museum akan segera tutup.</GeaText>}
            </View>}
            {props.error !== null && <GeaText variant="body14" color={colors.tertiary[300]} accessibilityRole="alert">{props.error}</GeaText>}
            <View style={styles.actions}>
              {(props.panel === "closing_prepare" || props.panel === "closed") && <Button label="Arah ke pintu keluar"
                tone="secondary" appearance="outline" onPress={props.onExitDirections} />}
              {completed ? <Button label={props.busy ? "Menyimpan kunjungan…" : "Lihat ringkasan kunjungan"}
                tone="primary" appearance="fill" disabled={props.busy} onPress={props.onSummary} />
                : props.panel === "extend" ? <>
                  <Button label="Kembali" tone="secondary" appearance="outline" onPress={props.busy ? (): void => undefined : props.onDismiss} />
                  <Button label={props.busy ? "Menyimpan…" : "Simpan durasi"} tone="primary" appearance="fill"
                    disabled={props.busy || selectedMinutes === null || !props.options.includes(selectedMinutes)}
                    onPress={(): void => { if (selectedMinutes !== null) props.onExtend(selectedMinutes); }} />
                </> : <>
                  {canSuggest && <Button label="Lanjut jelajah" tone="primary" appearance="fill" disabled={props.busy} onPress={props.onSuggest} />}
                  {showExtension && <Button label="Tambah waktu" tone="primary" appearance="fill" disabled={props.busy} onPress={props.onChooseExtension} />}
                  {props.panel === "closing_soon" || props.panel === "time_soon" ?
                    <Button label={props.panel === "closing_soon" ? "Mengerti" : "Tetap sesuai rencana"} tone="secondary" appearance="outline" onPress={props.onDismiss} />
                    : <Button label={props.busy ? "Menyimpan…" : "Selesaikan kunjungan"} tone="secondary" appearance="fill" disabled={props.busy} onPress={props.onFinish} />}
                  {props.panel === "closing_prepare" || props.panel === "finish" || props.panel === "route_done" ?
                    <Button label="Kembali ke peta" tone="secondary" appearance="outline" onPress={props.onDismiss} /> : null}
                </>}
            </View>
          </ScrollView>
        </View>
      </FrameStage>
    </Modal>
  );
}

function SuggestionCard({ suggestion }: { readonly suggestion: VisitSuggestion }): ReactElement {
  const hunt: boolean = photoHunt.some((target): boolean => target.poiCode === suggestion.poi.code);
  return <View style={styles.suggestion}>
    <Image source={hunt ? photoHuntPhoto(suggestion.poi.code) : { uri: poiStoryPhoto(suggestion.poi.idPoi, 1) }}
      accessibilityLabel={`Foto ${suggestion.poi.name}`} style={styles.photo} contentFit="cover" />
    <View style={styles.details}>
      <GeaText variant="bold16" color={colors.primary[900]}>{suggestion.poi.code} · {suggestion.poi.name}</GeaText>
      <GeaText variant="body14" color={colors.primary[800]}>{suggestion.reason}</GeaText>
      <GeaText variant="caption12" color={colors.primary[800]}>±{suggestion.minutes} menit termasuk perpindahan{hunt ? " · Ada Photo Hunt" : ""}</GeaText>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, maxHeight: 680, paddingTop: 4, backgroundColor: colors.secondaryYellow[0] },
  curve: { position: "absolute", left: 0, top: -53 },
  handle: { width: 46, height: 4, borderRadius: 2, backgroundColor: colors.greys[300], alignSelf: "center", marginBottom: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 32, gap: 18 },
  actions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 12, marginTop: 4 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { borderWidth: 1.5, borderColor: colors.primary[300], borderRadius: 12, padding: 13 },
  selected: { borderColor: colors.secondaryGreen[700], backgroundColor: colors.secondaryGreen[100] },
  suggestion: { padding: 12, borderRadius: 14, backgroundColor: colors.primary[0], flexDirection: "row", gap: 12 },
  photo: { width: 74, minHeight: 100, borderRadius: 10 },
  details: { flex: 1, gap: 6 },
});
