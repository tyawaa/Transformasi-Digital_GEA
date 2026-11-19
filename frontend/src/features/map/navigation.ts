import { ACCURACY_LIMIT_METERS, distanceMeters, type Fix } from "../../domain/geofence.ts";

export type PlanPoint = { readonly x: number; readonly y: number };
export type PlanPin = PlanPoint & { readonly code: string };
export type LocationAnchor = { readonly code: string; readonly latitude: number; readonly longitude: number };
export type RouteLeg = { readonly code: string; readonly points: readonly PlanPoint[] };
type WalkNode = PlanPoint & { readonly id: string; readonly links: readonly string[] };
type MeasuredAnchor = { readonly pin: PlanPin; readonly distance: number };

export const PLAN_WIDTH: number = 1917.741;
export const PLAN_HEIGHT: number = 532.568;
export const ENTRANCE: PlanPoint = { x: 1017, y: 490 };

/** Titik kaki pin pada aset startmap-floor.svg; semua layer memakai koordinat denah ini. */
export const PLAN_PINS: readonly PlanPin[] = [
  { code: "P01", x: 775, y: 129 },
  { code: "P02", x: 571, y: 124 },
  { code: "P03", x: 430, y: 112 },
  { code: "P04", x: 289, y: 102 },
  { code: "P05", x: 289, y: 335 },
  { code: "P06", x: 442, y: 348 },
  { code: "P07", x: 571, y: 353 },
  { code: "P08", x: 705, y: 350 },
  { code: "P09", x: 840, y: 348 },
  { code: "P10", x: 105, y: 134 },
  { code: "P11", x: 105, y: 243 },
  { code: "P12", x: 1190, y: 345 },
  { code: "P13", x: 1190, y: 115 },
  { code: "P14", x: 1370, y: 115 },
  { code: "P15", x: 1515, y: 115 },
  { code: "P16", x: 1730, y: 115 },
  { code: "P17", x: 1460, y: 345 },
  { code: "P18", x: 1800, y: 345 },
  { code: "P19", x: 1855, y: 490 },
  { code: "P20", x: 1725, y: 490 },
];

/** Koridor bersama dan cabangnya mencegah garis langsung memotong dinding antar-ruang. */
const WALK_NODES: readonly WalkNode[] = [
  { id: "west", x: 105, y: 188, links: ["left"] },
  { id: "left", x: 289, y: 188, links: ["west", "middle"] },
  { id: "middle", x: 442, y: 188, links: ["left", "karst"] },
  { id: "karst", x: 571, y: 188, links: ["middle", "east"] },
  { id: "east", x: 840, y: 188, links: ["karst", "entry"] },
  { id: "entry", x: 1017, y: 188, links: ["east", "door", "right"] },
  { id: "door", x: 1017, y: 490, links: ["entry"] },
  { id: "right", x: 1190, y: 188, links: ["entry", "life"] },
  { id: "life", x: 1460, y: 188, links: ["right", "farRight"] },
  { id: "farRight", x: 1800, y: 188, links: ["life", "lowerDoor"] },
  { id: "lowerDoor", x: 1855, y: 420, links: ["farRight", "lower"] },
  { id: "lower", x: 1725, y: 420, links: ["lowerDoor"] },
];

function length(a: PlanPoint, b: PlanPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nodeById(id: string): WalkNode {
  const node: WalkNode | undefined = WALK_NODES.find((item: WalkNode): boolean => item.id === id);
  if (node === undefined) throw new RangeError(`Simpul koridor ${id} tidak terdaftar.`);
  return node;
}

function project(point: PlanPoint, a: PlanPoint, b: PlanPoint): PlanPoint {
  const dx: number = b.x - a.x;
  const dy: number = b.y - a.y;
  const ratio: number = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return { x: a.x + ratio * dx, y: a.y + ratio * dy };
}

type CorridorProjection = { readonly point: PlanPoint; readonly a: WalkNode; readonly b: WalkNode; readonly distance: number };

function nearestCorridor(point: PlanPoint): CorridorProjection {
  const candidates: readonly CorridorProjection[] = WALK_NODES.flatMap((a: WalkNode): readonly CorridorProjection[] =>
    a.links.filter((id: string): boolean => a.id < id).map((id: string): CorridorProjection => {
      const b: WalkNode = nodeById(id);
      const projected: PlanPoint = project(point, a, b);
      return { point: projected, a, b, distance: length(point, projected) };
    }),
  );
  const first: CorridorProjection | undefined = candidates[0];
  if (first === undefined) throw new RangeError("Denah belum memiliki koridor navigasi.");
  return candidates.reduce((best: CorridorProjection, item: CorridorProjection): CorridorProjection => item.distance < best.distance ? item : best, first);
}

function corridorPath(start: string, end: string): readonly PlanPoint[] {
  const pending: string[][] = [[start]];
  const visited: Set<string> = new Set<string>();
  while (pending.length > 0) {
    const path: string[] | undefined = pending.shift();
    if (path === undefined) throw new RangeError("Antrean koridor tidak valid.");
    const last: string | undefined = path[path.length - 1];
    if (last === undefined) throw new RangeError("Jalur koridor kosong.");
    if (last === end) return path.map(nodeById);
    visited.add(last);
    for (const link of nodeById(last).links) {
      if (!visited.has(link)) pending.push([...path, link]);
    }
  }
  throw new RangeError(`Koridor ${start} tidak terhubung ke ${end}.`);
}

/** Jalur terpendek pada koridor denah, termasuk akses dari/ke titik POI. */
export function walkingPath(start: PlanPoint, end: PlanPoint): readonly PlanPoint[] {
  if (length(start, end) < 0.5) return [end];
  const from: CorridorProjection = nearestCorridor(start);
  const to: CorridorProjection = nearestCorridor(end);
  const sameEdge: boolean = from.a.id === to.a.id && from.b.id === to.b.id;
  const candidates: readonly (readonly PlanPoint[])[] = sameEdge
    ? [[start, from.point, to.point, end]]
    : [from.a, from.b].flatMap((a: WalkNode): readonly (readonly PlanPoint[])[] =>
      [to.a, to.b].map((b: WalkNode): readonly PlanPoint[] => [start, from.point, ...corridorPath(a.id, b.id), to.point, end]),
    );
  const first: readonly PlanPoint[] | undefined = candidates[0];
  if (first === undefined) throw new RangeError("Jalur denah tidak ditemukan.");
  const shortest: readonly PlanPoint[] = candidates.reduce(
    (best: readonly PlanPoint[], path: readonly PlanPoint[]): readonly PlanPoint[] => pathLength(path) < pathLength(best) ? path : best, first,
  );
  return shortest.filter((point: PlanPoint, index: number): boolean => index === 0 || length(point, shortest[index - 1] as PlanPoint) > 0.1);
}

function pathLength(points: readonly PlanPoint[]): number {
  return points.reduce((total: number, point: PlanPoint, index: number): number => {
    const previous: PlanPoint | undefined = points[index - 1];
    return total + (previous === undefined ? 0 : length(previous, point));
  }, 0);
}

/** Urutan mengikuti rekomendasi; POI yang selesai disaring oleh pemanggil. */
export function routeLegs(start: PlanPoint, codes: readonly string[]): readonly RouteLeg[] {
  const pins: readonly PlanPin[] = codes.map((code: string): PlanPin => {
    const pin: PlanPin | undefined = PLAN_PINS.find((item: PlanPin): boolean => item.code === code);
    if (pin === undefined) throw new RangeError(`Posisi denah untuk ${code} belum terdaftar.`);
    return pin;
  });
  return pins.map((pin: PlanPin, index: number): RouteLeg => ({
    code: pin.code,
    points: walkingPath(index === 0 ? start : pins[index - 1] as PlanPin, pin),
  }));
}

/** Perkiraan posisi dari titik survei terdekat; bukan kalibrasi presisi indoor. */
export function locateOnPlan(fix: Fix | null, anchors: readonly LocationAnchor[]): PlanPoint | null {
  if (fix === null || !Number.isFinite(fix.accuracyMeters) || fix.accuracyMeters > ACCURACY_LIMIT_METERS) return null;
  const measured: readonly MeasuredAnchor[] = anchors.flatMap((anchor: LocationAnchor): readonly MeasuredAnchor[] => {
    const pin: PlanPin | undefined = PLAN_PINS.find((item: PlanPin): boolean => item.code === anchor.code);
    return pin === undefined ? [] : [{ pin, distance: distanceMeters(fix, anchor) }];
  }).sort((a: MeasuredAnchor, b: MeasuredAnchor): number => a.distance - b.distance);
  const closest: MeasuredAnchor | undefined = measured[0];
  if (closest === undefined || closest.distance > 40) return null;
  if (closest.distance < 0.5) return { x: closest.pin.x, y: closest.pin.y };
  const samples: readonly MeasuredAnchor[] = measured.slice(0, 4).filter((sample: MeasuredAnchor): boolean => (Number(sample.pin.code.slice(1)) <= 11) === (Number(closest.pin.code.slice(1)) <= 11));
  const sum: number = samples.reduce((total: number, sample: MeasuredAnchor): number => total + 1 / sample.distance ** 2, 0);
  return {
    x: samples.reduce((total: number, sample: MeasuredAnchor): number => total + sample.pin.x / sample.distance ** 2, 0) / sum,
    y: samples.reduce((total: number, sample: MeasuredAnchor): number => total + sample.pin.y / sample.distance ** 2, 0) / sum,
  };
}
