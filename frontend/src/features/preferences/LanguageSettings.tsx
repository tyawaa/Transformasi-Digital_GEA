import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactElement, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, shadows } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import type { Language } from "../../domain/contracts";
import { stopEyesFreeNarration } from "../eyesfree/engine";

const storageKey = "gea.language.v1";
const options = [
  { value: "id", label: "Bahasa Indonesia" },
  { value: "en", label: "English" },
] as const;

const LanguageContext = createContext({
  language: "id" as Language,
  t: (id: string, _en: string): string => id,
  open: (): void => {},
  loaded: false,
  saveFailed: false,
  select: (_value: Language): void => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSettingsProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [language, setLanguage] = useState<Language>("id");
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then((stored) => {
      if (active && (stored === "id" || stored === "en")) setLanguage(stored);
    }).catch(() => {}).finally(() => {
      if (active) setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  function select(value: Language): void {
    if (value !== language) stopEyesFreeNarration();
    setLanguage(value);
    setSaveFailed(false);
    writes.current = writes.current.then(() => AsyncStorage.setItem(storageKey, value))
      .catch(() => setSaveFailed(true));
  }

  const close = (): void => setVisible(false);
  const t = (id: string, en: string): string => language === "en" ? en : id;
  return (
    <LanguageContext.Provider value={{ language, t, open: () => setVisible(true), loaded, saveFailed, select }}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Tutup pengaturan bahasa", "Close language settings")} style={StyleSheet.absoluteFill} onPress={close} />
          <SettingsPanel />
        </View>
      </Modal>
    </LanguageContext.Provider>
  );
}

export function LanguageButton({ compact = false, expanded, onPress }: {
  readonly compact?: boolean;
  readonly expanded?: boolean;
  readonly onPress?: () => void;
}): ReactElement {
  const { t, open } = useLanguage();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={onPress ? t("Pengaturan bahasa dan mode", "Language and mode settings") : t("Pengaturan bahasa", "Language settings")}
      aria-expanded={expanded} onPress={onPress ?? open} hitSlop={compact ? 6 : undefined}
      style={[styles.gear, compact && styles.compactGear, expanded && styles.gearOpen]}>
      <Svg width={compact ? 18 : 24} height={compact ? 18 : 24} viewBox="0 0 24 24" accessible={false}>
        <Path fill={colors.primary[900]} fillRule="evenodd" d="M10.2 2.6a3.6 3.6 0 0 1 3.6 0l5.6 3.2a3.6 3.6 0 0 1 1.8 3.1v6.2a3.6 3.6 0 0 1-1.8 3.1l-5.6 3.2a3.6 3.6 0 0 1-3.6 0l-5.6-3.2a3.6 3.6 0 0 1-1.8-3.1V8.9a3.6 3.6 0 0 1 1.8-3.1l5.6-3.2ZM12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
      </Svg>
    </Pressable>
  );
}

export function SettingsPanel({ eyesFree }: {
  readonly eyesFree?: { readonly enabled: boolean; readonly select: (enabled: boolean) => void };
}): ReactElement {
  const { language, loaded, saveFailed, select, t } = useLanguage();
  return (
    <View style={styles.panel} accessibilityViewIsModal>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("Pilih bahasa", "Choose language")} style={styles.group}>
        <GeaText variant="bold16" color={colors.primary[900]} style={styles.heading}>{t("Pilih bahasa", "Choose language")}</GeaText>
        <View style={styles.divider} />
        {options.map(({ value, label }) => (
          <SettingsOption key={value} label={label} selected={language === value} disabled={!loaded} onPress={() => select(value)} />
        ))}
      </View>
      {eyesFree && <View accessibilityRole="radiogroup" accessibilityLabel={t("Pilih mode", "Choose mode")} style={styles.group}>
        <GeaText variant="bold16" color={colors.primary[900]} style={styles.heading}>{t("Pilih mode", "Choose mode")}</GeaText>
        <View style={styles.divider} />
        <SettingsOption label="Normal mode" selected={!eyesFree.enabled} onPress={() => eyesFree.select(false)} />
        <SettingsOption label="Eyes free mode" selected={eyesFree.enabled} onPress={() => eyesFree.select(true)} />
      </View>}
      {saveFailed && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">
        {t("Pilihan bahasa belum tersimpan. Coba pilih lagi.", "Language preference could not be saved. Select it again.")}
      </GeaText>}
    </View>
  );
}

function SettingsOption({ label, selected, disabled, onPress }: {
  readonly label: string;
  readonly selected: boolean;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}): ReactElement {
  return (
    <Pressable accessibilityRole="radio" aria-checked={selected} disabled={disabled}
      onPress={onPress} style={[styles.option, selected && styles.selected]}>
      <GeaText variant="body14" color={colors.primary[900]}>{label}</GeaText>
      <View style={styles.radio}>{selected && <View style={styles.radioFill} />}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  panel: { width: 246, maxWidth: "100%", gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary[900], paddingHorizontal: 7, paddingVertical: 10, backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  group: { gap: 4 },
  heading: { marginHorizontal: 4, marginBottom: 4, fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.primary[100], marginBottom: 4 },
  option: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, paddingLeft: 12, paddingRight: 16 },
  selected: { backgroundColor: colors.primary[0] },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.primary[900], alignItems: "center", justifyContent: "center" },
  radioFill: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[900] },
  gear: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary[900], backgroundColor: colors.secondaryYellow[0], alignItems: "center", justifyContent: "center" },
  compactGear: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5 },
  gearOpen: { backgroundColor: colors.primary[100] },
});
