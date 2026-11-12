// Preferensi → rute rekomendasi. Pilihan jawaban dan pemetaannya ke POI ada di file ini.
import type { Profile } from "../../domain/contracts";
import type { Preferences } from "./usePreferences";

export const ageOptions = ["7-12 Tahun", "13-17 Tahun", "18-24 Tahun", ">24 Tahun"] as const;
export const durationOptions = ["< 30 menit", "30-45 Menit", "45 menit-1.5 Jam", "> 1.5 jam"] as const;

/** Gaya cerita sesuai umur: anak (7–12), remaja (13–17), dewasa (18+ atau belum memilih). */
export function profileForAge(prefs: Preferences | null): Profile {
  if (prefs?.age === "7-12 Tahun") return "anak";
  if (prefs?.age === "13-17 Tahun") return "remaja";
  return "dewasa";
}

/** Topik minat dan ruangan (kode POI) yang membahasnya. SEMENTARA: cek ke tim konten. */
export const topics: readonly { readonly label: string; readonly codes: readonly string[] }[] = [
  { label: "Gunung Api & Gempa", codes: ["P03", "P08", "P04"] },
  { label: "Batuan & Mineral", codes: ["P07", "P10", "P11", "P06"] },
  { label: "Bentang Alam & Gua", codes: ["P02", "P04", "P06", "P21"] },
  { label: "Asal-usul Bumi", codes: ["P09", "P05", "P12", "P13"] },
  { label: "Fosil & Hewan Purba", codes: ["P01", "P14", "P15", "P16", "P17", "P18"] },
];

/** Jumlah ruangan yang direkomendasikan per pilihan waktu (±7–10 menit per ruangan). */
const stopsByDuration: Record<(typeof durationOptions)[number], number> = {
  "< 30 menit": 3,
  "30-45 Menit": 5,
  "45 menit-1.5 Jam": 8,
  "> 1.5 jam": Number.POSITIVE_INFINITY,
};

// Ruangan yang paling visual/interaktif, didahulukan untuk anak 7–12 tahun.
const kidFriendly: readonly string[] = ["P05", "P03", "P01", "P02"];

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
};

/** Topik yang cocok dengan sebuah ruangan, dari minat pengguna. */
export function matchedTopics(prefs: Preferences | null, code: string): readonly string[] {
  if (prefs === null) return [];
  return topics
    .filter((topic) => prefs.topics.includes(topic.label) && topic.codes.includes(code))
    .map((topic) => topic.label);
}

/**
 * Pilih ruangan dari yang tersedia: skor = jumlah topik minat yang cocok (+1 untuk ruangan ramah anak
 * bila usia 7–12). Ambil sebanyak jatah waktu, lalu urutkan sesuai jalur jalan kaki.
 */
export function recommendRoute(prefs: Preferences | null, available: readonly string[]): Route | null {
  if (prefs === null || available.length === 0) return null;
  const limit: number = stopsByDuration[prefs.duration as keyof typeof stopsByDuration] ?? 5;
  const kid: boolean = prefs.age === "7-12 Tahun";
  const walk = (code: string): number => {
    const index: number = walkOrder.indexOf(code);
    return index === -1 ? walkOrder.length : index;
  };
  const score = (code: string): number =>
    matchedTopics(prefs, code).length * 2 + (kid && kidFriendly.includes(code) ? 1 : 0);

  const picked: readonly string[] = [...available]
    .sort((a: string, b: string): number => score(b) - score(a) || walk(a) - walk(b))
    .slice(0, limit)
    .sort((a: string, b: string): number => walk(a) - walk(b));

  const routeTopics: readonly string[] = prefs.topics.filter((label: string): boolean =>
    picked.some((code: string): boolean => matchedTopics(prefs, code).includes(label))
  );
  return { codes: picked, topics: routeTopics, duration: prefs.duration };
}
