export type HeadingAnchor = {
  readonly latitude: number;
  readonly longitude: number;
  readonly x: number;
  readonly y: number;
};

export function normalizeHeading(degrees: number): number {
  if (!Number.isFinite(degrees)) throw new RangeError("Sudut kompas harus berupa angka hingga.");
  return ((degrees % 360) + 360) % 360;
}

/** Selisih terpendek mencegah rotasi memutar satu lingkaran saat melewati utara. */
export function headingDelta(from: number, to: number): number {
  return ((normalizeHeading(to) - normalizeHeading(from) + 540) % 360) - 180;
}

/** Sudut denah yang membuat arah hadap pengguna berada di atas layar. */
export function headingUpRotation(heading: number, planTopBearing: number): number {
  return headingDelta(heading, planTopBearing);
}

/** Fit rotasi survei WGS84 ke denah. Hasil tetap perkiraan karena denah bersifat skematis. */
export function estimatePlanBearing(anchors: readonly HeadingAnchor[]): number | null {
  if (anchors.length < 2) return null;
  const latitude: number = anchors.reduce((sum: number, point: HeadingAnchor): number => sum + point.latitude, 0) / anchors.length;
  const longitude: number = anchors.reduce((sum: number, point: HeadingAnchor): number => sum + point.longitude, 0) / anchors.length;
  const x: number = anchors.reduce((sum: number, point: HeadingAnchor): number => sum + point.x, 0) / anchors.length;
  const y: number = anchors.reduce((sum: number, point: HeadingAnchor): number => sum + point.y, 0) / anchors.length;
  const longitudeScale: number = Math.cos(latitude * Math.PI / 180);
  const sums: { readonly dot: number; readonly cross: number } = anchors.reduce((total, point: HeadingAnchor) => {
    const east: number = (point.longitude - longitude) * longitudeScale;
    const north: number = point.latitude - latitude;
    const planX: number = point.x - x;
    const planY: number = y - point.y;
    return { dot: total.dot + east * planX + north * planY, cross: total.cross + east * planY - north * planX };
  }, { dot: 0, cross: 0 });
  if (Math.hypot(sums.dot, sums.cross) < 1e-10) return null;
  return normalizeHeading(Math.atan2(sums.cross, sums.dot) * 180 / Math.PI);
}

/** Proyeksi arah atas layar dari rotasi Z-X-Y DeviceOrientation ke bidang horizontal. */
export function browserCompassHeading(alpha: number, beta: number, gamma: number, screenAngle: number): number | null {
  const radians: number = Math.PI / 180;
  const a: number = alpha * radians;
  const b: number = beta * radians;
  const g: number = gamma * radians;
  const s: number = screenAngle * radians;
  const east: number = (Math.cos(a) * Math.cos(g) - Math.sin(a) * Math.sin(b) * Math.sin(g)) * Math.sin(s) - Math.sin(a) * Math.cos(b) * Math.cos(s);
  const north: number = (Math.sin(a) * Math.cos(g) + Math.cos(a) * Math.sin(b) * Math.sin(g)) * Math.sin(s) + Math.cos(a) * Math.cos(b) * Math.cos(s);
  if (Math.hypot(east, north) < 0.15) return null;
  return normalizeHeading(Math.atan2(east, north) / radians);
}
