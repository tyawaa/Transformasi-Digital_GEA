// Preferensi → rute rekomendasi. Pilihan jawaban dan pemetaannya ke POI ada di file ini.
import { museumPoiByCode } from "../../data/museum.ts";
import type { Profile } from "../../domain/contracts";
import type { Preferences } from "./usePreferences";
import { visitWindow, type VisitWindow } from "./visitTiming.ts";

export const ageOptions = ["7-12 Tahun", "13-17 Tahun", "18-24 Tahun", ">24 Tahun"] as const;

/**
 * Kategori pengunjung sesuai sheet (Kategori_Pengunjung): 7–12 tahun = Anak-anak ("anak"); selain itu,
 * termasuk bila belum memilih, = Umum ("dewasa").
 */
export function profileForAge(prefs: Preferences | null): Profile {
  return prefs?.age === "7-12 Tahun" ? "anak" : "dewasa";
}

/** Topik minat dan ruangan (kode POI) yang membahasnya. SEMENTARA: cek ke tim konten. */
export const topics: readonly { readonly label: string; readonly codes: readonly string[] }[] = [
  { label: "Gunung Api & Gempa", codes: ["P03", "P08", "P04"] },
  { label: "Batuan & Mineral", codes: ["P07", "P10", "P11", "P06"] },
  { label: "Bentang Alam & Gua", codes: ["P02", "P04", "P06", "P21"] },
  { label: "Asal-usul Bumi", codes: ["P09", "P05", "P12", "P13"] },
  { label: "Fosil & Hewan Purba", codes: ["P01", "P14", "P15", "P16", "P17", "P18"] },
];

/** Estimasi menit per POI bila belum ada di POI_Preference (mis. POI-12 s.d. POI-21). */
const DEFAULT_POI_MINUTES = 7;
// POI-01 s.d. POI-11 = prioritas tinggi (kuning di sheet); POI-12 s.d. POI-21 = rendah (oranye), ditunda.
const HIGH_PRIORITY_LAST = 11;

/** Estimasi lama kunjungan POI (menit), dari kolom Estimated_Duration di POI_Preference. */
export function poiMinutes(code: string): number {
  return museumPoiByCode(code)?.content?.durasiMenit ?? DEFAULT_POI_MINUTES;
}

// Urutan jalan kaki: sayap kiri baris atas kiri→kanan, lalu baris bawah kanan→kiri; lalu sayap kanan.
const walkOrder: readonly string[] = [
  "P10", "P04", "P03", "P02", "P01", "P09", "P08", "P07", "P06", "P05", "P11",
  "P12", "P13", "P14", "P15", "P16", "P17", "P18", "P19", "P20", "P21",
];

export type Route = {
  /** Kode POI urut jalan kaki. */
  readonly codes: readonly string[];
  /** Topik pilihan pengguna yang benar-benar punya ruangan di rute. */
  readonly topics: readonly string[];
  readonly duration: string;
  /** Total estimasi menit semua ruangan di rute. */
  readonly totalMinutes: number;
  /** true = rute dipotong karena mendekati jam tutup. */
  readonly closingLimited: boolean;
};

/** Topik yang cocok dengan sebuah ruangan, dari minat pengguna. */
export function matchedTopics(prefs: Preferences | null, code: string): readonly string[] {
  if (prefs === null) return [];
  return topics
    .filter((topic) => prefs.topics.includes(topic.label) && topic.codes.includes(code))
    .map((topic) => topic.label);
}

/**
 * Pilih ruangan dari yang tersedia. Skor = 2 × topik minat yang cocok, sama untuk semua usia,
 * dan POI prioritas rendah (P12+) selalu di belakang. Ruangan diambil menurut skor
 * selama total Estimated_Duration masih muat di waktu efektif, lalu diurutkan sesuai jalur jalan kaki.
 */
export function recommendRoute(
  prefs: Preferences | null,
  available: readonly string[],
  now: Date,
): Route | null {
  if (prefs === null || available.length === 0) return null;
  const budget: VisitWindow = visitWindow(prefs.duration, now.getTime());
  const lowPriority = (code: string): boolean => Number(code.slice(1)) > HIGH_PRIORITY_LAST;
  const walk = (code: string): number => {
    const index: number = walkOrder.indexOf(code);
    return index === -1 ? walkOrder.length : index;
  };
  const score = (code: string): number =>
    matchedTopics(prefs, code).length * 2 - (lowPriority(code) ? 100 : 0);

  const picked: string[] = [];
  let total = 0;
  for (const code of [...available].sort((a: string, b: string): number => score(b) - score(a) || walk(a) - walk(b))) {
    const minutes: number = poiMinutes(code);
    if (total + minutes > budget.budgetMinutes) continue;
    picked.push(code);
    total += minutes;
  }
  picked.sort((a: string, b: string): number => walk(a) - walk(b));

  const routeTopics: readonly string[] = prefs.topics.filter((label: string): boolean =>
    picked.some((code: string): boolean => matchedTopics(prefs, code).includes(label))
  );
  return {
    codes: picked,
    topics: routeTopics,
    duration: prefs.duration,
    totalMinutes: total,
    closingLimited: budget.closingLimited,
  };
}
