import type { ReactElement } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { StatusNotice } from "../../components/StatusNotice";
import type {
  AccessDecision,
  DecisionMessage,
  Visit,
} from "../../domain/contracts";
import type { BusyOperation } from "../../hooks/useOperation";
import { colors } from "../../theme/colors";
import { styles } from "../../theme/styles";
import type { LocationSettingsAction } from "../../hooks/useVisitSession";
import { useLanguage } from "../preferences/LanguageSettings";

type LandingScreenProps = {
  readonly visit: Visit | null;
  readonly busy: BusyOperation | null;
  readonly notice: DecisionMessage | null;
  readonly decision: AccessDecision | null;
  readonly error: string | null;
  readonly connection: string;
  readonly locationLabel: string;
  readonly locationSettingsAction: LocationSettingsAction | null;
  readonly onPrimary: () => void;
  readonly onOpenScanner: () => void;
  readonly onCheckConnection: () => void;
};
export function LandingScreen(
  {
    visit,
    busy,
    notice,
    decision,
    error,
    connection,
    locationLabel,
    locationSettingsAction,
    onPrimary,
    onOpenScanner,
    onCheckConnection,
  }: LandingScreenProps,
): ReactElement {
  const { t } = useLanguage();
  return (
    <>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>{t("LIHAT LEBIH DEKAT", "TAKE A CLOSER LOOK")}</Text>
          <Text style={styles.heroMark}>01 / GEA</Text>
        </View>
        <View accessible={false} style={styles.museum}>
          <View style={styles.museumRoof} />
          <View style={styles.columns}>
            {[0, 1, 2, 3].map((column: number): ReactElement => (
              <View key={column} style={styles.column} />
            ))}
          </View>
          <View style={styles.museumBase} />
        </View>
        <Text style={styles.heroTitle}>
          {t("Setiap koleksi", "Every collection")}{"\n"}{t("punya cerita.", "has a story.")}
        </Text>
        <Text style={styles.heroDescription}>
          {t("Temukan cerita, dengarkan narasi, dan amati koleksi di sekitarmu.", "Discover stories, listen to narration, and explore the collections around you.")}
        </Text>
      </View>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>{t("MULAI DARI SINI", "START HERE")}</Text>
        <Text style={styles.title}>{t("Sudah sampai di museum?", "Have you arrived at the museum?")}</Text>
        <Text style={styles.body}>
          {t("Izinkan lokasi saat aplikasi digunakan untuk memastikan kamu berada di area museum. Aktifkan GPS dan pilih lokasi akurat saat diminta.", "Allow location access while using the app to check that you are at the museum. Enable GPS and precise location when prompted.")}
        </Text>
      </View>
      <View style={styles.steps}>
        {[t("Periksa area", "Check the area"), t("Buka cerita", "Read story"), t("Jelajahi koleksi", "Explore collections")].map((
          step: string,
          index: number,
        ): ReactElement => (
          <View key={step} style={styles.step}>
            <Text style={styles.stepNumber}>0{index + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      <StatusNotice notice={notice} decision={decision} error={error} />
      {visit === null && locationSettingsAction !== null && (
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          style={[styles.secondary, busy !== null && styles.disabled]}
          onPress={(): void => {
            void locationSettingsAction.onPress();
          }}
        >
          <Text style={styles.secondaryText}>{locationSettingsAction.label}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy !== null}
        style={[styles.primary, busy !== null && styles.disabled]}
        onPress={(): void => {
          onPrimary();
        }}
      >
        {busy !== null && <ActivityIndicator color={colors.white} />}
        <Text style={styles.primaryText}>
          {busy === "location"
            ? locationLabel
            : busy === "qr"
            ? t("Memeriksa QR...", "Checking QR code…")
            : busy === "stories"
            ? t("Memuat koleksi...", "Loading collections…")
            : visit === null
            ? t("Periksa lokasi saya", "Check my location")
            : t("Buka koleksi", "Open collections")}
        </Text>
        {busy === null && <Text style={styles.buttonArrow}>→</Text>}
      </Pressable>
      {visit === null && (
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          style={styles.secondary}
          onPress={(): void => {
            onOpenScanner();
          }}
        >
          <Text style={styles.secondaryText}>
            {t("Gunakan QR pintu masuk", "Use entrance QR code")}
          </Text>
        </Pressable>
      )}
      <View style={styles.connectionRow}>
        <View style={styles.connectionInfo}>
          <View style={styles.dot} />
          <Text style={styles.connectionText}>{connection}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={busy !== null}
          hitSlop={12}
          onPress={(): void => {
            onCheckConnection();
          }}
        >
          <Text style={styles.checkText}>
            {busy === "connection" ? t("Memeriksa...", "Checking…") : t("Cek layanan", "Check connection")}
          </Text>
        </Pressable>
      </View>
    </>
  );
}
