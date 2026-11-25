import { fromByteArray } from "base64-js";
import { Image } from "expo-image";
import { type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  type GestureResponderEvent,
  PanResponder,
  type PanResponderGestureState,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { colors, shadows } from "../../design/tokens";
import { GeaText } from "../../design/typography";
import { headingDelta, headingUpRotation } from "../../domain/heading";
import type { MapHeading } from "../../hooks/useHeading";
import { useFrameBleed } from "../stories/hifi/parts";
import type { MapPoi } from "./MapScreen";
import {
  ENTRANCE,
  PLAN_HEIGHT,
  PLAN_PINS,
  PLAN_WIDTH,
  type PlanPin,
  type PlanPoint,
  type RouteLeg,
} from "./navigation";
import { useLanguage } from "../preferences/LanguageSettings";
import { localizedPoiName } from "../../data/localizedCopy";

const floor: number = require("../../../assets/design/startmap-floor.svg") as number;
const pinImage: number = require("../../../assets/design/map-pin.svg") as number;
const pinShadow: number = require("../../../assets/design/map-pin-shadow.svg") as number;
const background: number = require("../../../assets/design/navigation/background.svg") as number;
const zoomImage: number = require("../../../assets/design/navigation/zoom.svg") as number;
const locateImage: number = require("../../../assets/design/navigation/locate.svg") as number;
const VIEW_WIDTH: number = 390;
const VIEW_HEIGHT: number = 844;
const MAP_TOP: number = 170;
const MAP_HEIGHT: number = 316;
const MAP_CENTER_Y: number = MAP_TOP + MAP_HEIGHT / 2;
const MIN_ZOOM: number = 0.18;
const MAX_ZOOM: number = 1.8;
const webTouchStyle: ViewStyle & { readonly touchAction: "none"; readonly userSelect: "none" } = {
  touchAction: "none",
  userSelect: "none",
};

type Camera = { readonly x: number; readonly y: number; readonly zoom: number };
type TouchSpan = { readonly distance: number; readonly midpoint: PlanPoint };
type GestureStart = {
  readonly camera: Camera;
  readonly span: TouchSpan | null;
  readonly offset: PlanPoint;
};
type Props = {
  readonly destination: "exit" | "pois";
  readonly pois: readonly MapPoi[];
  readonly selectedCode: string | null;
  readonly nextCode: string | null;
  readonly routeCodes: readonly string[];
  readonly legs: readonly RouteLeg[];
  readonly location: PlanPoint | null;
  readonly leftOnly: boolean;
  readonly onSelect: (code: string) => void;
  readonly onLocate: () => void;
  readonly orientation: MapHeading;
  readonly planBearing: number | null;
  readonly onOpenTests: (() => void) | null;
};

function shouldPan(event: GestureResponderEvent, gesture: PanResponderGestureState): boolean {
  return event.nativeEvent.touches.length > 1 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6;
}

function centeredCamera(point: PlanPoint, zoom: number): Camera {
  return boundCamera({ x: VIEW_WIDTH / 2 - point.x * zoom, y: MAP_CENTER_Y - point.y * zoom, zoom });
}

function headingCamera(point: PlanPoint, zoom: number): Camera {
  return { x: VIEW_WIDTH / 2 - point.x * zoom, y: MAP_TOP + MAP_HEIGHT * 0.65 - point.y * zoom, zoom };
}

function boundCamera(camera: Camera): Camera {
  const bound = (value: number, size: number, viewport: number): number =>
    size <= viewport ? (viewport - size) / 2 : Math.max(viewport - size - 20, Math.min(20, value));
  return {
    x: bound(camera.x, PLAN_WIDTH * camera.zoom, VIEW_WIDTH),
    y: MAP_TOP + bound(camera.y - MAP_TOP, PLAN_HEIGHT * camera.zoom, MAP_HEIGHT),
    zoom: camera.zoom,
  };
}

/** Geser manual tetap tersedia saat denah muat, dengan sebagian denah selalu terlihat. */
function boundDraggedCamera(camera: Camera): Camera {
  const bound = (value: number, size: number, viewport: number): number => {
    const visible: number = Math.min(size, viewport) / 2;
    return Math.max(visible - size, Math.min(viewport - visible, value));
  };
  return {
    x: bound(camera.x, PLAN_WIDTH * camera.zoom, VIEW_WIDTH),
    y: MAP_TOP + bound(camera.y - MAP_TOP, PLAN_HEIGHT * camera.zoom, MAP_HEIGHT),
    zoom: camera.zoom,
  };
}

function touchSpan(event: GestureResponderEvent): TouchSpan | null {
  const first = event.nativeEvent.touches[0];
  const second = event.nativeEvent.touches[1];
  if (first === undefined || second === undefined) return null;
  return {
    distance: Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY),
    midpoint: { x: (first.pageX + second.pageX) / 2, y: (first.pageY + second.pageY) / 2 },
  };
}

/** Panah hanya pada leg aktif agar jalur pergi/pulang yang bertumpuk tidak memberi arah berlawanan. */
function routeSvg(legs: readonly RouteLeg[]): string {
  const paths: string = [...legs].reverse().map((leg: RouteLeg, reversedIndex: number): string => {
    const active: boolean = reversedIndex === legs.length - 1;
    const line: string = leg.points.map((point: PlanPoint, index: number): string => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
    const arrows: string = active ? leg.points.slice(1).map((end: PlanPoint, index: number): string => {
      const start: PlanPoint | undefined = leg.points[index];
      if (start === undefined) throw new RangeError(`Awal segmen jalur ${leg.code} tidak ditemukan.`);
      const distance: number = Math.hypot(end.x - start.x, end.y - start.y);
      if (distance < 45) return "";
      const angle: number = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
      return `<path d="M-8,-6 L0,0 L-8,6" transform="translate(${(start.x + end.x) / 2},${(start.y + end.y) / 2}) rotate(${angle})" fill="none" stroke="${colors.primary[800]}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join("") : "";
    return `<path d="${line}" fill="none" stroke="${active ? colors.primary[700] : colors.primary[500]}" opacity="${active ? 1 : 0.35}" stroke-width="${active ? 3.5 : 2.5}" stroke-dasharray="9 9" stroke-linecap="round" stroke-linejoin="round"/>${arrows}`;
  }).join("");
  const svg: string = `<svg xmlns="http://www.w3.org/2000/svg" width="${PLAN_WIDTH}" height="${PLAN_HEIGHT}" viewBox="0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}">${paths}</svg>`;
  const bytes: Uint8Array = new TextEncoder().encode(svg);
  return `data:image/svg+xml;base64,${fromByteArray(bytes)}`;
}

export function PlanViewport(props: Props): ReactElement {
  const { language, t } = useLanguage();
  const { width, height } = useWindowDimensions();
  const screenScale: number = Math.min(width / 390, height / 844);
  const { bleed, span } = useFrameBleed();
  const [camera, setCamera] = useState<Camera>(centeredCamera(props.location ?? ENTRANCE, 0.85));
  const [following, setFollowing] = useState<boolean>(true);
  const [toolsOpen, setToolsOpen] = useState<boolean>(false);
  const viewportRef = useRef<View>(null);
  const rotation = useRef<Animated.Value>(new Animated.Value(0)).current;
  const rotationTarget = useRef<number>(0);
  const rotationAnchor = useRef<PlanPoint | null>(props.location);
  const rotationStyle = useMemo(() => rotation.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }), [rotation]);
  const counterRotationStyle = useMemo(() => rotation.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "-360deg"] }), [rotation]);
  const compassActive: boolean = props.orientation.state.degrees !== null && props.planBearing !== null && props.location !== null;
  const cameraRef = useRef<Camera>(camera);
  const gestureRef = useRef<GestureStart>({ camera, span: null, offset: { x: 0, y: 0 } });
  const dot = useRef<Animated.ValueXY>(new Animated.ValueXY(props.location ?? ENTRANCE)).current;
  const lastLocation = useRef<PlanPoint | null>(props.location);
  cameraRef.current = camera;
  const source: { readonly uri: string } = useMemo(() => ({ uri: routeSvg(props.legs) }), [props.legs]);
  const locationX: number | undefined = props.location?.x;
  const locationY: number | undefined = props.location?.y;
  if (following && props.location !== null) rotationAnchor.current = props.location;

  useEffect((): (() => void) | undefined => {
    if (Platform.OS !== "web") return undefined;
    const viewport: HTMLElement | null = viewportRef.current as unknown as HTMLElement | null;
    if (viewport === null) return undefined;
    const resetScroll = (): void => {
      if (viewport.scrollTop !== 0 || viewport.scrollLeft !== 0) viewport.scrollTo(0, 0);
    };
    viewport.addEventListener("scroll", resetScroll);
    return (): void => viewport.removeEventListener("scroll", resetScroll);
  }, []);

  useEffect((): void => {
    if (props.orientation.state.status === "requesting" || props.orientation.state.status === "simulated") setFollowing(true);
    // Aktivasi adalah tindakan pengguna; pembaruan sensor tidak membatalkan geser manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.orientation.activation]);

  useEffect((): void => {
    const degrees: number | null = props.orientation.state.degrees;
    if (compassActive && !following) return;
    const target: number = compassActive && degrees !== null && props.planBearing !== null
      ? headingUpRotation(degrees, props.planBearing) : 0;
    const next: number = rotationTarget.current + headingDelta(rotationTarget.current, target);
    rotationTarget.current = next;
    Animated.timing(rotation, { toValue: next, duration: 180, useNativeDriver: true }).start();
  }, [props.orientation.state.degrees, props.planBearing, compassActive, following, rotation]);

  useEffect((): void => {
    if (locationX === undefined || locationY === undefined) {
      lastLocation.current = null;
      return;
    }
    const point: PlanPoint = { x: locationX, y: locationY };
    if (lastLocation.current === null || (compassActive && following)) dot.setValue(point);
    else Animated.timing(dot, { toValue: point, duration: 450, useNativeDriver: false }).start();
    lastLocation.current = point;
    if (following) setCamera((current: Camera): Camera => compassActive ? headingCamera(point, current.zoom) : centeredCamera(point, current.zoom));
  }, [locationX, locationY, following, compassActive, dot]);

  useEffect((): void => {
    const pin: PlanPin | undefined = PLAN_PINS.find((item: PlanPin): boolean => item.code === props.selectedCode);
    if (pin === undefined) return;
    props.orientation.disable();
    setFollowing(false);
    setCamera((current: Camera): Camera => boundCamera(centeredCamera(pin, Math.max(0.75, current.zoom))));
  }, [props.selectedCode, props.orientation.disable]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (): boolean => false,
    onMoveShouldSetPanResponder: shouldPan,
    onMoveShouldSetPanResponderCapture: shouldPan,
    onPanResponderGrant: (event, gesture): void => {
      gestureRef.current = { camera: cameraRef.current, span: touchSpan(event), offset: { x: gesture.dx, y: gesture.dy } };
      setFollowing(false);
    },
    onPanResponderMove: (event, gesture): void => {
      const start: GestureStart = gestureRef.current;
      const span: TouchSpan | null = touchSpan(event);
      if ((span === null) !== (start.span === null)) {
        gestureRef.current = { camera: cameraRef.current, span, offset: { x: gesture.dx, y: gesture.dy } };
        return;
      }
      if (span !== null && start.span !== null && start.span.distance > 0) {
        const zoom: number = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, start.camera.zoom * span.distance / start.span.distance));
        const ratio: number = zoom / start.camera.zoom;
        setCamera(boundDraggedCamera({
          x: VIEW_WIDTH / 2 - (VIEW_WIDTH / 2 - start.camera.x) * ratio + (span.midpoint.x - start.span.midpoint.x) / screenScale,
          y: MAP_CENTER_Y - (MAP_CENTER_Y - start.camera.y) * ratio + (span.midpoint.y - start.span.midpoint.y) / screenScale,
          zoom,
        }));
        return;
      }
      if (start.span !== null) return;
      setCamera(boundDraggedCamera({
        ...start.camera,
        x: start.camera.x + (gesture.dx - start.offset.x) / screenScale,
        y: start.camera.y + (gesture.dy - start.offset.y) / screenScale,
      }));
    },
    onPanResponderTerminationRequest: (): boolean => false,
  }), [screenScale]);

  function zoomBy(multiplier: number): void {
    setCamera((current: Camera): Camera => {
      const zoom: number = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom * multiplier));
      if (following && props.location !== null) return compassActive ? headingCamera(props.location, zoom) : centeredCamera(props.location, zoom);
      const ratio: number = zoom / current.zoom;
      return boundDraggedCamera({
        x: VIEW_WIDTH / 2 - (VIEW_WIDTH / 2 - current.x) * ratio,
        y: MAP_CENTER_Y - (MAP_CENTER_Y - current.y) * ratio,
        zoom,
      });
    });
  }

  function showPlan(): void {
    props.orientation.disable();
    const planWidth: number = props.leftOnly ? 1145 : PLAN_WIDTH;
    const zoom: number = (VIEW_WIDTH - 32) / planWidth;
    setFollowing(false);
    setCamera({ x: 16, y: MAP_CENTER_Y - PLAN_HEIGHT * zoom / 2, zoom });
  }

  function showRoute(): void {
    const points: readonly PlanPoint[] | undefined = props.legs[0]?.points;
    if (points === undefined || points.length === 0) {
      throw new RangeError("Jalur menuju tujuan belum tersedia pada denah.");
    }
    props.orientation.disable();
    const minX: number = Math.min(...points.map((point: PlanPoint): number => point.x));
    const maxX: number = Math.max(...points.map((point: PlanPoint): number => point.x));
    const minY: number = Math.min(...points.map((point: PlanPoint): number => point.y));
    const maxY: number = Math.max(...points.map((point: PlanPoint): number => point.y));
    const zoom: number = Math.max(MIN_ZOOM, Math.min(0.8, (VIEW_WIDTH - 80) / Math.max(1, maxX - minX), (MAP_HEIGHT - 80) / Math.max(1, maxY - minY)));
    setFollowing(false);
    setCamera(centeredCamera({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, zoom));
  }

  function locate(): void {
    setFollowing(true);
    const point: PlanPoint = props.location ?? ENTRANCE;
    const zoom: number = Math.max(camera.zoom, 0.85);
    setCamera(compassActive ? headingCamera(point, zoom) : centeredCamera(point, zoom));
    if (props.location === null) props.onLocate();
  }

  function toggleHeading(): void {
    if (compassActive || props.orientation.state.status === "requesting") {
      props.orientation.disable();
      return;
    }
    setFollowing(true);
    void props.orientation.enable();
  }

  useEffect((): void => {
    if (props.destination !== "exit") return;
    props.orientation.disable();
    setFollowing(false);
    if (props.legs.length > 0) showRoute();
    else setCamera(centeredCamera(ENTRANCE, 0.5));
  }, [props.destination]);

  const pivotX: number = rotationAnchor.current === null ? VIEW_WIDTH / 2 : camera.x + rotationAnchor.current.x * camera.zoom;
  const pivotY: number = rotationAnchor.current === null ? VIEW_HEIGHT / 2 : camera.y + rotationAnchor.current.y * camera.zoom;
  const headingHint: string = props.orientation.state.status === "simulated" && compassActive
    ? t(`Uji arah · ${Math.round(props.orientation.state.degrees ?? 0)}°`, `Test heading · ${Math.round(props.orientation.state.degrees ?? 0)}°`)
    : props.orientation.state.status === "requesting" ? t("Menunggu kompas…", "Waiting for compass…")
    : props.orientation.state.message !== null ? t("Kompas belum siap · lihat keterangan di bawah", "Compass not ready · see details below")
    : compassActive && following ? t("Mengikuti perkiraan arah hadap", "Following estimated heading")
    : following && props.location !== null ? t("Mengikuti lokasi · ↑ untuk arah hadap", "Following location · ↑ for heading")
    : t("Geser peta · ◎ untuk mengikuti", "Drag map · ◎ to follow");

  return (
    <>
      <View ref={viewportRef} style={[styles.viewport, span, Platform.OS === "web" && webTouchStyle]} {...panResponder.panHandlers}>
        {/* Latar dan jendela denah selebar layar; koordinat isinya tetap mengikuti frame 390. */}
        <View style={styles.backgroundClip} pointerEvents="none">
          <Image accessible={false} draggable={false} source={background} style={styles.background} contentFit="fill" />
        </View>
        <View style={styles.mapClip}>
        <Animated.View style={[styles.mapCanvas, { left: bleed, transformOrigin: [pivotX, pivotY, 0], transform: [{ rotate: rotationStyle }] }]}>
        <View style={[styles.plan, { transform: [{ translateX: camera.x }, { translateY: camera.y }, { scale: camera.zoom }] }]}>
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Image accessible={false} draggable={false} source={floor} style={styles.floor} contentFit="fill" />
            <Image accessible={false} draggable={false} source={source} style={styles.route} contentFit="fill" />
          </View>
          {PLAN_PINS.filter((pin: PlanPin): boolean => props.pois.some((poi: MapPoi): boolean => poi.museum.code === pin.code)).map((pin: PlanPin): ReactElement => {
            const poi: MapPoi | undefined = props.pois.find((item: MapPoi): boolean => item.museum.code === pin.code);
            if (poi === undefined) throw new RangeError(`Data POI ${pin.code} tidak ditemukan.`);
            const order: number = props.routeCodes.indexOf(pin.code);
            const selected: boolean = props.selectedCode === pin.code;
            const next: boolean = props.nextCode === pin.code;
            return (
              <Animated.View key={pin.code} style={[styles.pin, { left: pin.x - 27, top: pin.y - 64,
                transform: [{ scale: Math.max(1, 0.5 / camera.zoom) }, { rotate: counterRotationStyle }] }, poi.id === null && styles.unavailable]}>
              <Pressable
                key={pin.code}
                accessibilityRole="button"
                accessibilityLabel={`${pin.code}, ${localizedPoiName(poi.museum, language)}${poi.id === null ? t(", segera hadir", ", coming soon") : ""}${next ? t(", tujuan berikutnya", ", next destination") : ""}`}
                accessibilityState={{ selected }}
                onPress={(): void => { setFollowing(false); props.onSelect(pin.code); }}
                style={StyleSheet.absoluteFill}
                hitSlop={10}
              >
                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {(next || selected) && <View style={[styles.pinHalo, selected && styles.selectedHalo]} />}
                <Image accessible={false} draggable={false} source={pinShadow} style={styles.pinShadow} />
                <Image accessible={false} draggable={false} source={pinImage} style={styles.pinImage} />
                <View style={[styles.pinLabel, poi.status === "selesai" && styles.finished]}>
                  <GeaText variant="heading20" color={colors.primary[900]}>{pin.code}</GeaText>
                </View>
                {order >= 0 && (
                  <View style={[styles.order, next && styles.nextOrder]}>
                    <GeaText variant="caption12" color={colors.white}>{poi.status === "selesai" ? "✓" : order + 1}</GeaText>
                  </View>
                )}
                </View>
              </Pressable>
              </Animated.View>
            );
          })}
          <Animated.View style={[styles.pin, { left: 990, top: 361, transform: [{ rotate: counterRotationStyle }] }]} pointerEvents="none">
            <Image draggable={false} source={pinShadow} style={styles.pinShadow} />
            <Image draggable={false} source={pinImage} style={styles.pinImage} />
            <View style={styles.pinLabel}><GeaText variant="heading24" color={colors.primary[900]}>S</GeaText></View>
          </Animated.View>
          {props.destination === "exit" && <View accessibilityLabel={t("Pintu keluar museum", "Museum exit")} pointerEvents="none"
            style={{ position: "absolute", left: ENTRANCE.x - 110, top: ENTRANCE.y - 45, width: 220, padding: 14, borderRadius: 12, backgroundColor: colors.secondaryGreen[100], borderWidth: 3, borderColor: colors.primary[800] }}>
            <GeaText variant="heading24" color={colors.primary[900]} style={{ textAlign: "center" }}>{t("Pintu keluar ↓", "Exit ↓")}</GeaText>
          </View>}
          {props.location !== null && (
            <Animated.View accessibilityLabel={t("Perkiraan posisimu dari GPS", "Estimated GPS position")} pointerEvents="none" style={[styles.you, { left: dot.x, top: dot.y, transform: [{ rotate: counterRotationStyle }] }]}>
              {compassActive && following && <View style={styles.youDirection} />}
              <View style={styles.youHalo}><View style={styles.youDot} /></View>
            </Animated.View>
          )}
        </View>
        </Animated.View>
        </View>
        <View style={[styles.controls, { right: 16 + bleed }]}>
          {toolsOpen && <View style={styles.toolsTray}>
            <MapControl label={t("Lihat seluruh denah", "View full map")} text="▣" onPress={showPlan} active={false} />
            <MapControl label={props.legs.length === 0 ? t("Lihat denah lantai 1", "View ground floor map") : t("Lihat jalur menuju tujuan", "View route to destination")}
              text="↗" onPress={props.legs.length === 0 ? showPlan : showRoute} active={false} />
            <Pressable accessibilityRole="button" accessibilityLabel={compassActive ? t("Kembali ke orientasi denah", "Reset map orientation") : t("Aktifkan peta mengikuti arah hadap HP", "Rotate map with phone heading")}
              accessibilityState={{ selected: compassActive, disabled: props.location === null || props.planBearing === null }}
              disabled={props.location === null || props.planBearing === null} onPress={toggleHeading}
              style={[styles.control, compassActive && styles.controlActive, (props.location === null || props.planBearing === null) && styles.unavailable]}>
              <GeaText variant="bold16" color={compassActive ? colors.white : colors.primary[800]}>↑</GeaText>
            </Pressable>
            {props.onOpenTests !== null && <MapControl label={t("Buka mode uji GPS", "Open GPS test mode")} text="T"
              onPress={(): void => { setToolsOpen(false); props.onOpenTests?.(); }} active={false} />}
            <View style={styles.toolsHint} pointerEvents="none">
              <GeaText variant="caption12" color={colors.primary[800]}>{language === "en" && props.orientation.state.message !== null ? t("Kompas belum siap. Periksa izin sensor dan coba lagi.", "Compass not ready. Check sensor permissions and try again.") : props.orientation.state.message ?? headingHint}</GeaText>
            </View>
          </View>}
          <View style={styles.zoomGroup}>
            <Image accessible={false} source={zoomImage} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
            <Pressable accessibilityRole="button" accessibilityLabel={t("Perbesar peta", "Zoom in")} onPress={(): void => zoomBy(1.3)} style={styles.zoomHit} />
            <Pressable accessibilityRole="button" accessibilityLabel={t("Perkecil peta", "Zoom out")} onPress={(): void => zoomBy(1 / 1.3)} style={styles.zoomHit} />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={following ? t("Mengikuti lokasimu", "Following your location") : t("Ikuti lokasi saya", "Follow my location")}
            accessibilityState={{ selected: following }} onPress={locate} style={({ pressed }) => [styles.locateControl, pressed && styles.pressed]}>
            <Image accessible={false} source={locateImage} style={StyleSheet.absoluteFill} contentFit="fill" />
          </Pressable>
          <View style={styles.moreControl}>
            <MapControl label={toolsOpen ? t("Tutup kontrol peta", "Close map controls") : t("Buka kontrol peta", "Open map controls")} text="⋯"
              onPress={(): void => setToolsOpen(!toolsOpen)} active={toolsOpen} />
          </View>
        </View>
      </View>
    </>
  );
}

function MapControl({ label, text, onPress, active }: {
  readonly label: string;
  readonly text: string;
  readonly onPress: () => void;
  readonly active: boolean;
}): ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.control, active && styles.controlActive, pressed && styles.pressed]}>
      <GeaText variant="bold16" color={active ? colors.white : colors.primary[800]} style={styles.controlText}>{text}</GeaText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  viewport: { position: "absolute", top: 0, height: MAP_TOP + MAP_HEIGHT, overflow: "hidden", backgroundColor: colors.primary[300] },
  backgroundClip: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, overflow: "hidden" },
  background: { position: "absolute", left: 0, top: 0, width: "100%", height: VIEW_HEIGHT },
  mapClip: { position: "absolute", left: 0, right: 0, top: MAP_TOP, height: MAP_HEIGHT, overflow: "hidden", backgroundColor: colors.primary[0], borderTopWidth: 3, borderBottomWidth: 3, borderColor: colors.primary[800] },
  mapCanvas: { position: "absolute", left: 0, top: -MAP_TOP, width: VIEW_WIDTH, height: VIEW_HEIGHT },
  plan: { position: "absolute", left: 0, top: 0, width: PLAN_WIDTH, height: PLAN_HEIGHT, transformOrigin: "top left" },
  floor: { position: "absolute", left: 0.29, top: 7.86, width: 1917.16, height: 516.851, transform: [{ rotate: "0.62deg" }] },
  route: { position: "absolute", left: 0, top: 0, width: PLAN_WIDTH, height: PLAN_HEIGHT },
  pin: { position: "absolute", width: 58, height: 73, transformOrigin: [27, 64, 0] },
  pinImage: { position: "absolute", left: -3.1, top: -2.9, width: 58.06, height: 69.17 },
  pinShadow: { position: "absolute", left: 11, top: 61, width: 29, height: 11 },
  pinLabel: { position: "absolute", left: 3.73, top: 4.56, width: 45.73, height: 45.73, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  pinHalo: { position: "absolute", left: -10, top: -10, width: 73, height: 73, borderRadius: 37, borderWidth: 3, borderColor: colors.secondaryGreen[700], backgroundColor: colors.secondaryGreen[100] },
  selectedHalo: { borderColor: colors.tertiary[200] },
  finished: { backgroundColor: colors.secondaryGreen[200] },
  order: { position: "absolute", right: -5, top: -10, minWidth: 24, height: 24, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, borderColor: colors.primary[0], backgroundColor: colors.primary[700] },
  nextOrder: { backgroundColor: colors.secondaryGreen[800] },
  unavailable: { opacity: 0.5 },
  you: { position: "absolute", width: 64, marginLeft: -32, marginTop: -32, alignItems: "center", zIndex: 4, transformOrigin: [32, 32, 0] },
  youDirection: { position: "absolute", top: -10, width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 14, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: colors.secondaryGreen[600] },
  youHalo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.secondaryYellow[100], alignItems: "center", justifyContent: "center" },
  youDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: colors.secondaryYellow[0], backgroundColor: colors.secondaryGreen[400] },
  controls: { position: "absolute", right: 16, top: 286, gap: 12 },
  moreControl: { position: "absolute", right: 56, top: 108 },
  toolsTray: { position: "absolute", right: 56, bottom: 56, gap: 8, padding: 8, borderRadius: 24, backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  toolsHint: { position: "absolute", right: 56, top: 0, width: 180, padding: 12, borderRadius: 12, backgroundColor: colors.secondaryYellow[0], boxShadow: shadows.drop },
  zoomGroup: { width: 44, height: 96 },
  zoomHit: { width: 44, height: 48 },
  locateControl: { width: 44, height: 44 },
  control: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondaryYellow[0], alignItems: "center", justifyContent: "center", boxShadow: shadows.drop },
  controlText: { fontSize: 23, lineHeight: 27 },
  controlActive: { backgroundColor: colors.primary[700] },
  pressed: { opacity: 0.7 },
});
