import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactElement, type ReactNode, useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

type LanguageSettings = {
  readonly language: Language;
  readonly t: (id: string, en: string) => string;
  readonly loaded: boolean;
  readonly saving: boolean;
  readonly error: string | null;
  readonly select: (value: Language) => void;
};
type ModeSettings = {
  readonly enabled: boolean;
  readonly loaded: boolean;
  readonly description: string;
  readonly select: (enabled: boolean) => void;
};
const LanguageContext = createContext<LanguageSettings | null>(null);

export function useLanguage(): LanguageSettings {
  const settings: LanguageSettings | null = useContext(LanguageContext);
  if (settings === null) throw new Error("useLanguage harus dipakai di dalam LanguageSettingsProvider.");
  return settings;
}

export function LanguageSettingsProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [language, setLanguage] = useState<Language>("id");
  const [loaded, setLoaded] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active: boolean = true;
    void AsyncStorage.getItem(storageKey).then((stored: string | null): void => {
      if (stored !== null && stored !== "id" && stored !== "en") {
        throw new TypeError(`Bahasa tersimpan tidak valid: key=${storageKey}, value=${stored}`);
      }
      if (active && stored !== null) setLanguage(stored);
    }).catch((cause: unknown): void => {
      console.error("gea_language_load_failed", { key: storageKey, error: cause instanceof Error ? cause.message : String(cause) });
      if (active) setError("Pilihan bahasa belum dapat dimuat. Pilih bahasa untuk menyimpannya kembali.");
    }).finally((): void => {
      if (active) setLoaded(true);
    });
    return () => { active = false; };
  }, []);

  function select(value: Language): void {
    if (!loaded || saving) return;
    setSaving(true);
    setError(null);
    void AsyncStorage.setItem(storageKey, value).then((): void => {
      if (value !== language) stopEyesFreeNarration();
      setLanguage(value);
    }).catch((cause: unknown): void => {
      console.error("gea_language_save_failed", { key: storageKey, language: value, error: cause instanceof Error ? cause.message : String(cause) });
      setError("Pilihan bahasa belum tersimpan. Coba pilih lagi.");
    }).finally((): void => setSaving(false));
  }

  const t = (id: string, en: string): string => language === "en" ? en : id;
  return (
    <LanguageContext.Provider value={{ language, t, loaded, saving, error, select }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageButton({ expanded, onPress }: {
  readonly expanded: boolean;
  readonly onPress: () => void;
}): ReactElement {
  const { t } = useLanguage();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("Pengaturan bahasa dan mode", "Language and mode settings")}
      aria-expanded={expanded} onPress={onPress}
      style={[styles.gear, expanded && styles.gearOpen]}>
      <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
        <Path fill={colors.primary[900]} fillRule="evenodd" d="M10.2 2.6a3.6 3.6 0 0 1 3.6 0l5.6 3.2a3.6 3.6 0 0 1 1.8 3.1v6.2a3.6 3.6 0 0 1-1.8 3.1l-5.6 3.2a3.6 3.6 0 0 1-3.6 0l-5.6-3.2a3.6 3.6 0 0 1-1.8-3.1V8.9a3.6 3.6 0 0 1 1.8-3.1l5.6-3.2ZM12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
      </Svg>
    </Pressable>
  );
}

export function SettingsPanel({ eyesFree }: {
  readonly eyesFree: ModeSettings;
}): ReactElement {
  const { language, loaded, saving, error, select, t } = useLanguage();
  return (
    <View style={styles.panel} accessibilityViewIsModal>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("Pilih bahasa", "Choose language")} style={styles.group}>
        <GeaText variant="bold16" color={colors.primary[900]} style={styles.heading}>{t("Pilih bahasa", "Choose language")}</GeaText>
        <View style={styles.divider} />
        {options.map(({ value, label }) => (
          <SettingsOption key={value} label={label} selected={language === value} disabled={!loaded || saving} onPress={(): void => select(value)} />
        ))}
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={t("Pilih mode", "Choose mode")} style={styles.group}>
        <GeaText variant="bold16" color={colors.primary[900]} style={styles.heading}>{t("Pilih mode", "Choose mode")}</GeaText>
        <View style={styles.divider} />
        <SettingsOption label={t("Mode normal", "Normal mode")} selected={!eyesFree.enabled} disabled={!eyesFree.loaded} onPress={(): void => eyesFree.select(false)} />
        <SettingsOption label={t("Mode tanpa layar", "Eyes free mode")} selected={eyesFree.enabled} disabled={!eyesFree.loaded} onPress={(): void => eyesFree.select(true)} />
      </View>
      <GeaText variant="caption12" color={colors.primary[900]} style={styles.modeDescription}>{eyesFree.description}</GeaText>
      {error !== null && <GeaText variant="body14" color={colors.danger[100]} accessibilityRole="alert">
        {t(error, "Language preference could not be read or saved. Select your language again.")}
      </GeaText>}
    </View>
  );
}

function SettingsOption({ label, selected, disabled, onPress }: {
  readonly label: string;
  readonly selected: boolean;
  readonly disabled: boolean;
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
  panel: { width: 246, maxWidth: "100%", gap: 8, borderRadius: 16, borderWidth: 1.5, borderColor: colors.primary[900], paddingHorizontal: 7, paddingVertical: 10, backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  group: { gap: 4 },
  modeDescription: { paddingHorizontal: 4, lineHeight: 16 },
  heading: { marginHorizontal: 4, marginBottom: 4, fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.primary[100], marginBottom: 4 },
  option: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 10, paddingLeft: 12, paddingRight: 16 },
  selected: { backgroundColor: colors.primary[0] },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.primary[900], alignItems: "center", justifyContent: "center" },
  radioFill: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[900] },
  gear: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary[900], backgroundColor: colors.secondaryYellow[0], alignItems: "center", justifyContent: "center" },
  gearOpen: { backgroundColor: colors.primary[100] },
});
