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
import { FrameStage, useFrameBleed } from "../stories/hifi/parts";
import { closingTimeLabel, type VisitPrompt, type VisitSuggestion } from "./lifecycle";
import { useLanguage } from "../preferences/LanguageSettings";
import { localizedPoiName, localizedSuggestionReason } from "../../data/localizedCopy";

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

function sheetCopy(panel: VisitPanel, closingAtMs: number, t: (id: string, en: string) => string): Copy {
  const closing: string = closingTimeLabel(closingAtMs);
  const copy: Readonly<Record<VisitPanel, Copy>> = {
    closing_soon: { title: t("Museum segera tutup", "The museum is closing soon"), description: t(`Museum tutup pukul ${closing} WIB. Selesaikan penjelajahanmu dan sisakan waktu untuk menuju pintu keluar.`, `The museum closes at ${closing} WIB. Finish exploring and allow time to reach the exit.`) },
    closing_prepare: { title: t("Saatnya bersiap pulang", "Time to prepare to leave"), description: t(`Museum tutup pukul ${closing} WIB. Selesaikan aktivitasmu dan bersiap menuju pintu keluar. Kunjungan akan selesai otomatis saat museum tutup.`, `The museum closes at ${closing} WIB. Finish your activities and head to the exit. Your visit ends automatically at closing time.`) },
    time_soon: { title: t("Masih ingin menjelajah?", "Want to keep exploring?"), description: t("Rencana kunjunganmu tinggal 5 menit atau kurang. Mau menambah waktu untuk melihat koleksi lainnya?", "You have five minutes or less left in your plan. Would you like more time to explore other collections?") },
    time_up: { title: t("Waktu rencanamu selesai", "Your planned time is up"), description: t("Masih ingin melanjutkan perjalanan? Kamu bisa menambah waktu selama museum masih buka.", "Want to continue? You can add time while the museum is still open.") },
    route_done: { title: t("Rute pilihanmu sudah selesai!", "You completed your route!"), description: t("Masih punya waktu? Ada koleksi lain yang bisa kamu jelajahi sebelum mengakhiri kunjungan.", "Still have time? Explore another collection before finishing your visit.") },
    finish: { title: t("Selesaikan perjalanan?", "Finish your visit?"), description: t("Progres dan poin yang sudah tercatat tetap tersimpan. Kunjungan yang sudah selesai tidak dapat dilanjutkan kembali.", "Your recorded progress and points are saved. A finished visit cannot be resumed.") },
    extend: { title: t("Mau tambah berapa lama?", "How much time would you like to add?"), description: t(`Tambahan waktu melanjutkan rencana kunjunganmu. Museum tutup pukul ${closing} WIB; 5 menit terakhir disisihkan untuk bersiap keluar.`, `Extra time extends your current plan. The museum closes at ${closing} WIB; the final five minutes are reserved for leaving.`) },
    closed: { title: t("Museum sudah tutup", "The museum is closed"), description: t("Kunjunganmu hari ini telah selesai. Terima kasih sudah menjelajah bersama GEA! Progres yang sudah tercatat tetap tersimpan.", "Your visit has ended for today. Thank you for exploring with GEA! Your recorded progress is saved.") },
    finished: { title: t("Perjalananmu sudah selesai", "Your visit is complete"), description: t("Terima kasih sudah menjelajah bersama GEA! Kamu bisa membuka kembali ringkasan, progres, dan poin kunjungan ini.", "Thank you for exploring with GEA! You can revisit this visit's summary, progress, and points.") },
  };
  return copy[panel];
}

/** Sheet akhir kunjungan mengikuti warna, font, dan lengkung desain GEA; semua teks tetap native. */
export function VisitSheet(props: Props): ReactElement | null {
  const { t } = useLanguage();
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const { bleed, span } = useFrameBleed();
  if (props.panel === null) return null;
  const copy: Copy = sheetCopy(props.panel, props.closingAtMs, t);
  const completed: boolean = props.panel === "closed" || props.panel === "finished";
  const canSuggest: boolean = props.suggestion !== null && (props.panel === "finish" || props.panel === "route_done");
  const showExtension: boolean = props.options.length > 0 && ["time_soon", "time_up", "route_done", "finish"].includes(props.panel);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={completed ? props.onSummary : props.onDismiss}>
      <FrameStage background="rgba(31,26,22,0.42)">
        {!completed && <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup pemberitahuan kunjungan", "Close visit notification")}
          style={StyleSheet.absoluteFill} onPress={props.busy ? undefined : props.onDismiss} />}
        <View style={[styles.sheet, span]} accessibilityViewIsModal>
          <Svg width={span.width} height={54} viewBox="0 0 390 54" preserveAspectRatio="none" style={styles.curve} accessible={false}>
            <Path d="M0 9 Q190 -9 390 54 L390 55 L0 55Z" fill={colors.secondaryYellow[0]} />
          </Svg>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: 24 + bleed }]} showsVerticalScrollIndicator={false}>
            <SheetHeading title={copy.title} description={copy.description} />
            {canSuggest && props.suggestion !== null && <SuggestionCard suggestion={props.suggestion} />}
            {props.panel === "extend" && <View style={styles.options}>
              {props.options.map((minutes: number): ReactElement => <Pressable key={minutes} accessibilityRole="radio"
                accessibilityLabel={t(`Tambah ${minutes} menit`, `Add ${minutes} minutes`)} accessibilityState={{ checked: selectedMinutes === minutes, disabled: props.busy }}
                disabled={props.busy} onPress={(): void => setSelectedMinutes(minutes)}
                style={[styles.option, selectedMinutes === minutes && styles.selected]}>
                <GeaText variant="bold16" color={colors.primary[900]}>+{minutes} {t("menit", "min")}</GeaText>
              </Pressable>)}
              {props.options.length === 0 && <GeaText variant="body14" color={colors.primary[800]}>{t("Waktu tambahan sudah tidak tersedia. Museum akan segera tutup.", "No extra time is available. The museum is closing soon.")}</GeaText>}
            </View>}
            {props.error !== null && <GeaText variant="body14" color={colors.tertiary[300]} accessibilityRole="alert">{props.error}</GeaText>}
            <View style={styles.actions}>
              {(props.panel === "closing_prepare" || props.panel === "closed") && <Button label={t("Arah ke pintu keluar", "Directions to the exit")}
                tone="secondary" appearance="outline" onPress={props.onExitDirections} />}
              {completed ? <Button label={props.busy ? t("Menyimpan kunjungan…", "Saving your visit…") : t("Lihat ringkasan kunjungan", "View visit summary")}
                tone="primary" appearance="fill" disabled={props.busy} onPress={props.onSummary} />
                : props.panel === "extend" ? <>
                  <Button label={t("Kembali", "Back")} tone="secondary" appearance="outline" onPress={props.busy ? (): void => undefined : props.onDismiss} />
                  <Button label={props.busy ? t("Menyimpan…", "Saving…") : t("Simpan durasi", "Save duration")} tone="primary" appearance="fill"
                    disabled={props.busy || selectedMinutes === null || !props.options.includes(selectedMinutes)}
                    onPress={(): void => { if (selectedMinutes !== null) props.onExtend(selectedMinutes); }} />
                </> : <>
                  {canSuggest && <Button label={t("Lanjut jelajah", "Keep exploring")} tone="primary" appearance="fill" disabled={props.busy} onPress={props.onSuggest} />}
                  {showExtension && <Button label={t("Tambah waktu", "Add time")} tone="primary" appearance="fill" disabled={props.busy} onPress={props.onChooseExtension} />}
                  {props.panel === "closing_soon" || props.panel === "time_soon" ?
                    <Button label={props.panel === "closing_soon" ? t("Mengerti", "Got it") : t("Tetap sesuai rencana", "Keep my plan")} tone="secondary" appearance="outline" onPress={props.onDismiss} />
                    : <Button label={props.busy ? t("Menyimpan…", "Saving…") : t("Selesaikan kunjungan", "Finish visit")} tone="secondary" appearance="fill" disabled={props.busy} onPress={props.onFinish} />}
                  {props.panel === "closing_prepare" || props.panel === "finish" || props.panel === "route_done" ?
                    <Button label={t("Kembali ke peta", "Back to map")} tone="secondary" appearance="outline" onPress={props.onDismiss} /> : null}
                </>}
            </View>
          </ScrollView>
        </View>
      </FrameStage>
    </Modal>
  );
}

function SuggestionCard({ suggestion }: { readonly suggestion: VisitSuggestion }): ReactElement {
  const { language, t } = useLanguage();
  const hunt: boolean = photoHunt.some((target): boolean => target.poiCode === suggestion.poi.code);
  return <View style={styles.suggestion}>
    <Image source={hunt ? photoHuntPhoto(suggestion.poi.code) : { uri: poiStoryPhoto(suggestion.poi.idPoi, 1) }}
      accessibilityLabel={t(`Foto ${suggestion.poi.name}`, `Photo of ${localizedPoiName(suggestion.poi, language)}`)} style={styles.photo} contentFit="cover" />
    <View style={styles.details}>
      <GeaText variant="bold16" color={colors.primary[900]}>{suggestion.poi.code} · {localizedPoiName(suggestion.poi, language)}</GeaText>
      <GeaText variant="body14" color={colors.primary[800]}>{localizedSuggestionReason(suggestion.reason, language)}</GeaText>
      <GeaText variant="caption12" color={colors.primary[800]}>±{suggestion.minutes} {t("menit termasuk perpindahan", "min including walking time")}{hunt ? t(" · Ada Photo Hunt", " · Includes Photo Hunt") : ""}</GeaText>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, maxHeight: 680, paddingTop: 4, backgroundColor: colors.secondaryYellow[0] },
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
