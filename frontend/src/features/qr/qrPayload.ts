// Format isi QR GEA (E13, usulan untuk A9/D5).
//
// Backend hanya mengenal token acak 64 hex (database menyimpan hash-nya). Agar aplikasi bisa
// memvalidasi tanpa internet dan tahu jenis QR, QR cetak boleh membungkus token itu:
//
//   GEA1:POI:P03:<token64hex>       QR koleksi
//   GEA1:ZONE:ZL:<token64hex>       QR zona (ZL = sayap kiri, ZR = sayap kanan)
//   GEA1:ENTRANCE:-:<token64hex>    QR pintu masuk
//
// Token 64 hex polos (format Sprint 1) tetap diterima; jenisnya ditentukan backend.
// Yang dikirim ke backend selalu hanya token, sehingga kontrak API tidak berubah.

import { museumPoiByCode, poiIdFor, zones } from "../../data/museum.ts";

export type QrKind = "entrance" | "zone" | "poi";

export type ParsedQr =
  | {
    readonly ok: true;
    readonly token: string;
    /** null = QR polos; jenis diketahui setelah diperiksa backend. */
    readonly kind: QrKind | null;
    readonly code: string | null;
    /** UUID POI untuk QR koleksi berlabel. */
    readonly poiId: string | null;
  }
  | { readonly ok: false; readonly reason: "not_gea" | "unknown_code" };

const TOKEN = /^[0-9a-f]{64}$/;
const WRAPPED = /^GEA1:(POI|ZONE|ENTRANCE):([A-Z0-9-]+):([0-9a-f]{64})$/;

export function parseQr(raw: string): ParsedQr {
  const text: string = raw.trim();
  if (TOKEN.test(text)) {
    return { ok: true, token: text, kind: null, code: null, poiId: null };
  }
  const match: RegExpMatchArray | null = text.match(WRAPPED);
  if (match === null) return { ok: false, reason: "not_gea" };
  const [, type = "", code = "", token = ""] = match;
  if (type === "ENTRANCE") {
    return { ok: true, token, kind: "entrance", code: null, poiId: null };
  }
  if (type === "ZONE") {
    const known: boolean = zones.some((zone) => zone.code === code);
    return known
      ? { ok: true, token, kind: "zone", code, poiId: null }
      : { ok: false, reason: "unknown_code" };
  }
  const poi = museumPoiByCode(code);
  return poi === undefined
    ? { ok: false, reason: "unknown_code" }
    : { ok: true, token, kind: "poi", code: poi.code, poiId: poiIdFor(poi.number) };
}

export function qrErrorMessage(reason: "not_gea" | "unknown_code"): string {
  return reason === "not_gea"
    ? "QR tidak dikenali. Arahkan kamera ke QR resmi GEA."
    : "QR tidak dikenali. Kode koleksi ini tidak ada di daftar museum.";
}

/** Buat isi QR berlabel. Dipakai mode uji dan pembuatan QR sheet. */
export function wrapQr(kind: QrKind, code: string | null, token: string): string {
  const type: string = kind === "poi" ? "POI" : kind === "zone" ? "ZONE" : "ENTRANCE";
  return `GEA1:${type}:${code ?? "-"}:${token}`;
}
