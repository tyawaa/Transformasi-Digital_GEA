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

const floor: number = require("../../../assets/design/startmap-floor.svg") as number;
const pinImage: number = require("../../../assets/design/map-pin.svg") as number;
const pinShadow: number = require("../../../assets/design/map-pin-shadow.svg") as number;
const VIEW_WIDTH: number = 358;
const VIEW_HEIGHT: number = 416;
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
  readonly pois: readonly MapPoi[];
  readonly selectedCode: string | null;
  readonly nextCode: string | null;
  readonly routeCodes: readonly string[];
  readonly legs: readonly RouteLeg[];
  readonly location: PlanPoint | null;
  readonly leftOnly: boolean;
  readonly onSelect: (code: string) => void;
  readonly onLocate: () => void;
};

function shouldPan(event: GestureResponderEvent, gesture: PanResponderGestureState): boolean {
  return event.nativeEvent.touches.length > 1 || Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6;
}

function centeredCamera(point: PlanPoint, zoom: number): Camera {
  return boundCamera({ x: VIEW_WIDTH / 2 - point.x * zoom, y: VIEW_HEIGHT * 0.55 - point.y * zoom, zoom });
}

function boundCamera(camera: Camera): Camera {
  const bound = (value: number, size: number, viewport: number): number =>
    size <= viewport ? (viewport - size) / 2 : Math.max(viewport - size - 20, Math.min(20, value));
  return {
    x: bound(camera.x, PLAN_WIDTH * camera.zoom, VIEW_WIDTH),
    y: bound(camera.y, PLAN_HEIGHT * camera.zoom, VIEW_HEIGHT),
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
    y: bound(camera.y, PLAN_HEIGHT * camera.zoom, VIEW_HEIGHT),
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
  const { width, height } = useWindowDimensions();
  const screenScale: number = Math.min(width / 390, height / 844);
  const [camera, setCamera] = useState<Camera>(centeredCamera(props.location ?? ENTRANCE, 0.65));
  const [following, setFollowing] = useState<boolean>(true);
  const cameraRef = useRef<Camera>(camera);
  const gestureRef = useRef<GestureStart>({ camera, span: null, offset: { x: 0, y: 0 } });
  const dot = useRef<Animated.ValueXY>(new Animated.ValueXY(props.location ?? ENTRANCE)).current;
  const lastLocation = useRef<PlanPoint | null>(props.location);
  cameraRef.current = camera;
  const source: { readonly uri: string } = useMemo(() => ({ uri: routeSvg(props.legs) }), [props.legs]);
  const locationX: number | undefined = props.location?.x;
  const locationY: number | undefined = props.location?.y;

  useEffect((): void => {
    if (locationX === undefined || locationY === undefined) {
      lastLocation.current = null;
      return;
    }
    const point: PlanPoint = { x: locationX, y: locationY };
    if (lastLocation.current === null) dot.setValue(point);
    else Animated.timing(dot, { toValue: point, duration: 450, useNativeDriver: false }).start();
    lastLocation.current = point;
    if (following) setCamera((current: Camera): Camera => centeredCamera(point, current.zoom));
  }, [locationX, locationY, following, dot]);

  useEffect((): void => {
    const pin: PlanPin | undefined = PLAN_PINS.find((item: PlanPin): boolean => item.code === props.selectedCode);
    if (pin === undefined) return;
    setFollowing(false);
    setCamera((current: Camera): Camera => boundCamera(centeredCamera(pin, Math.max(0.75, current.zoom))));
  }, [props.selectedCode]);

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
          y: VIEW_HEIGHT / 2 - (VIEW_HEIGHT / 2 - start.camera.y) * ratio + (span.midpoint.y - start.span.midpoint.y) / screenScale,
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
      if (following && props.location !== null) return centeredCamera(props.location, zoom);
      const ratio: number = zoom / current.zoom;
      return boundDraggedCamera({
        x: VIEW_WIDTH / 2 - (VIEW_WIDTH / 2 - current.x) * ratio,
        y: VIEW_HEIGHT / 2 - (VIEW_HEIGHT / 2 - current.y) * ratio,
        zoom,
      });
    });
  }

  function showPlan(): void {
    const planWidth: number = props.leftOnly ? 1145 : PLAN_WIDTH;
    const zoom: number = (VIEW_WIDTH - 32) / planWidth;
    setFollowing(false);
    setCamera({ x: 16, y: (VIEW_HEIGHT - PLAN_HEIGHT * zoom) / 2, zoom });
  }

  function showRoute(): void {
    const points: readonly PlanPoint[] | undefined = props.legs[0]?.points;
    if (points === undefined || points.length === 0) {
      throw new RangeError("Jalur menuju tujuan belum tersedia pada denah.");
    }
    const minX: number = Math.min(...points.map((point: PlanPoint): number => point.x));
    const maxX: number = Math.max(...points.map((point: PlanPoint): number => point.x));
    const minY: number = Math.min(...points.map((point: PlanPoint): number => point.y));
    const maxY: number = Math.max(...points.map((point: PlanPoint): number => point.y));
    const zoom: number = Math.max(MIN_ZOOM, Math.min(0.8, (VIEW_WIDTH - 80) / Math.max(1, maxX - minX), (VIEW_HEIGHT - 120) / Math.max(1, maxY - minY)));
    setFollowing(false);
    setCamera(centeredCamera({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, zoom));
  }

  function locate(): void {
    setFollowing(true);
    const point: PlanPoint = props.location ?? ENTRANCE;
    const zoom: number = Math.max(camera.zoom, 0.65);
    setCamera(centeredCamera(point, zoom));
    if (props.location === null) props.onLocate();
  }

  return (
    <>
      <View style={[styles.viewport, Platform.OS === "web" && webTouchStyle]} {...panResponder.panHandlers}>
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
              <Pressable
                key={pin.code}
                accessibilityRole="button"
                accessibilityLabel={`${pin.code}, ${poi.museum.name}${poi.id === null ? ", segera hadir" : ""}${next ? ", tujuan berikutnya" : ""}`}
                accessibilityState={{ selected }}
                onPress={(): void => { setFollowing(false); props.onSelect(pin.code); }}
                style={[styles.pin, { left: pin.x - 27, top: pin.y - 64, transform: [{ scale: Math.max(1, 0.5 / camera.zoom) }] }, poi.id === null && styles.unavailable]}
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
            );
          })}
          <View style={[styles.pin, { left: 990, top: 361 }]} pointerEvents="none">
            <Image draggable={false} source={pinShadow} style={styles.pinShadow} />
            <Image draggable={false} source={pinImage} style={styles.pinImage} />
            <View style={styles.pinLabel}><GeaText variant="heading24" color={colors.primary[900]}>S</GeaText></View>
          </View>
          {props.location !== null && (
            <Animated.View accessibilityLabel="Perkiraan posisimu dari GPS" pointerEvents="none" style={[styles.you, { left: dot.x, top: dot.y }]}>
              <View style={styles.youHalo}><View style={styles.youDot} /></View>
              <View style={styles.youLabel}><GeaText variant="caption12" color={colors.white}>Kamu</GeaText></View>
            </Animated.View>
          )}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={props.legs.length === 0 ? "Lihat seluruh denah" : "Lihat jalur menuju tujuan"}
          onPress={props.legs.length === 0 ? showPlan : showRoute} style={styles.routeButton}>
          <View style={styles.routeIndicator} />
          <GeaText variant="body14" color={colors.primary[900]}>
            {props.legs[0] === undefined ? "Denah lantai 1" : `${props.location === null ? "Dari pintu masuk →" : "Menuju"} ${props.legs[0].code}`}
          </GeaText>
          <GeaText variant="body14" color={colors.primary[700]}>↗</GeaText>
        </Pressable>
        <View style={styles.controls}>
          <View style={styles.zoomGroup}>
            <MapControl label="Perbesar peta" text="+" onPress={(): void => zoomBy(1.3)} active={false} />
            <View style={styles.controlDivider} />
            <MapControl label="Perkecil peta" text="−" onPress={(): void => zoomBy(1 / 1.3)} active={false} />
          </View>
          <MapControl label="Lihat seluruh denah" text="▣" onPress={showPlan} active={false} />
          <MapControl label={following ? "Mengikuti lokasimu" : "Ikuti lokasi saya"} text="◎" onPress={locate} active={following} />
        </View>
        <View pointerEvents="none" style={styles.hint}>
          <GeaText variant="caption12" color={colors.primary[800]}>
            {following && props.location !== null ? "Mengikuti lokasi" : "Geser untuk jelajahi peta"}
          </GeaText>
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
  viewport: { position: "absolute", left: 16, top: 152, width: VIEW_WIDTH, height: VIEW_HEIGHT, overflow: "hidden", borderRadius: 22, backgroundColor: colors.primary[100], borderWidth: 1, borderColor: colors.primary[300] },
  plan: { position: "absolute", left: 0, top: 0, width: PLAN_WIDTH, height: PLAN_HEIGHT, transformOrigin: "top left" },
  floor: { position: "absolute", left: 0.29, top: 7.86, width: 1917.16, height: 516.851, transform: [{ rotate: "0.62deg" }] },
  route: { position: "absolute", left: 0, top: 0, width: PLAN_WIDTH, height: PLAN_HEIGHT },
  pin: { position: "absolute", width: 58, height: 73, transformOrigin: "center bottom" },
  pinImage: { position: "absolute", left: -3.1, top: -2.9, width: 58.06, height: 69.17 },
  pinShadow: { position: "absolute", left: 11, top: 61, width: 29, height: 11 },
  pinLabel: { position: "absolute", left: 3.73, top: 4.56, width: 45.73, height: 45.73, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary[0] },
  pinHalo: { position: "absolute", left: -10, top: -10, width: 73, height: 73, borderRadius: 37, borderWidth: 3, borderColor: colors.secondaryGreen[700], backgroundColor: colors.secondaryGreen[100] },
  selectedHalo: { borderColor: colors.tertiary[200] },
  finished: { backgroundColor: colors.secondaryGreen[200] },
  order: { position: "absolute", right: -5, top: -10, minWidth: 24, height: 24, paddingHorizontal: 4, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, borderColor: colors.primary[0], backgroundColor: colors.primary[700] },
  nextOrder: { backgroundColor: colors.secondaryGreen[800] },
  unavailable: { opacity: 0.5 },
  you: { position: "absolute", width: 54, marginLeft: -27, marginTop: -18, alignItems: "center", zIndex: 4 },
  youHalo: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondaryGreen[200], alignItems: "center", justifyContent: "center" },
  youDot: { width: 19, height: 19, borderRadius: 10, borderWidth: 3, borderColor: colors.white, backgroundColor: colors.secondaryGreen[700] },
  youLabel: { backgroundColor: colors.primary[800], borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  controls: { position: "absolute", right: 12, bottom: 16, gap: 8 },
  zoomGroup: { borderRadius: 12, overflow: "hidden", backgroundColor: colors.white },
  control: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  controlText: { fontSize: 23, lineHeight: 27 },
  controlDivider: { height: 1, marginHorizontal: 10, backgroundColor: colors.primary[100] },
  controlActive: { backgroundColor: colors.primary[700] },
  hint: { position: "absolute", left: 12, bottom: 14, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: colors.primary[0] },
  routeButton: { position: "absolute", left: 12, top: 12, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.white, boxShadow: shadows.drop },
  routeIndicator: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary[700] },
  pressed: { opacity: 0.7 },
});
