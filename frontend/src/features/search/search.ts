// PB09: pencarian ruang dan koleksi di denah. Semua data dari dataset lokal (src/data/museum.ts),
// jadi tetap jalan tanpa internet. Fungsi murni, diuji di tests/search.test.mjs.
import type { MuseumPoi } from "../../data/museum.ts";

export const MIN_QUERY_LENGTH = 3;

export type SearchKind = "ruang" | "koleksi";

export type SearchEntry = {
  readonly kind: SearchKind;
  /** Nama yang ditampilkan (nama ruang atau nama koleksi). */
  readonly label: string;
  /** Kode ruang/POI tempat koleksi berada, mis. "P07". */
  readonly roomCode: string;
  readonly roomName: string;
  readonly words: readonly string[];
  readonly text: string;
};

export type SearchHit = SearchEntry & { readonly score: number };

// Isi kolom "Koleksi yang Disorot" yang bukan nama koleksi.
const NOT_A_COLLECTION: readonly string[] = ["video"];

/** Huruf kecil, tanpa aksen dan tanda baca. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function entry(kind: SearchKind, label: string, poi: MuseumPoi): SearchEntry {
  const text: string = normalize(label);
  return { kind, label, roomCode: poi.code, roomName: poi.name, text, words: text.split(" ").filter((word: string): boolean => word.length > 0) };
}

function collections(poi: MuseumPoi): readonly string[] {
  const raw: string | undefined = poi.content?.sorotan;
  if (raw === undefined || /display kosong/i.test(raw)) return [];
  return raw
    .split(/,|\bdan\b(?=[^,]*$)/)
    .map((item: string): string => item.trim())
    .filter((item: string): boolean => item.length > 0 && !NOT_A_COLLECTION.includes(item.toLowerCase()))
    .map((item: string): string => item.charAt(0).toUpperCase() + item.slice(1));
}

/** Satu entri per ruang ditambah satu entri per koleksi yang disorot di ruang itu. */
export function buildSearchIndex(pois: readonly MuseumPoi[]): readonly SearchEntry[] {
  return pois.flatMap((poi: MuseumPoi): readonly SearchEntry[] => [
    entry("ruang", poi.name, poi),
    ...collections(poi).map((label: string): SearchEntry => entry("koleksi", label, poi)),
  ]);
}

/** Jarak edit dengan pertukaran dua huruf bersebelahan dihitung satu kesalahan. */
export function editDistance(a: string, b: string): number {
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_: unknown, i: number): number[] =>
    Array.from({ length: b.length + 1 }, (_unused: unknown, j: number): number => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const row: number[] = rows[i] as number[];
      const above: number[] = rows[i - 1] as number[];
      const cost: number = a[i - 1] === b[j - 1] ? 0 : 1;
      let best: number = Math.min((above[j] as number) + 1, (row[j - 1] as number) + 1, (above[j - 1] as number) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, ((rows[i - 2] as number[])[j - 2] as number) + 1);
      }
      row[j] = best;
    }
  }
  return (rows[a.length] as number[])[b.length] as number;
}

/** Salah ketik yang masih diterima: 1 huruf untuk kata pendek, 2 huruf untuk kata ≥ 7 huruf. */
function tolerance(term: string): number {
  return term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
}

/** Skor satu kata kueri terhadap kata-kata entri; null = tidak cocok. */
function termScore(term: string, words: readonly string[]): number | null {
  let best: number | null = null;
  for (const word of words) {
    let score: number | null = null;
    if (word === term) score = 0;
    else if (word.startsWith(term)) score = 1;
    else if (word.includes(term)) score = 2;
    else {
      // Kata yang sedang diketik dibandingkan dengan awalan sepanjang kueri.
      const limit: number = tolerance(term);
      const prefix: number = editDistance(term, word.slice(0, term.length));
      const whole: number = editDistance(term, word);
      const typo: number = Math.min(prefix, whole);
      if (limit > 0 && typo <= limit) score = 3 + typo;
    }
    if (score !== null && (best === null || score < best)) best = score;
  }
  return best;
}

/**
 * Hasil muncul setelah 3 huruf. Semua kata kueri harus cocok (persis, awalan, atau salah ketik ringan).
 * `roomCode` null = semua ruang.
 */
export function searchMuseum(index: readonly SearchEntry[], query: string, roomCode: string | null = null): readonly SearchHit[] {
  const normalized: string = normalize(query);
  if (normalized.replace(/ /g, "").length < MIN_QUERY_LENGTH) return [];
  const terms: readonly string[] = normalized.split(" ");
  return index
    .filter((item: SearchEntry): boolean => roomCode === null || item.roomCode === roomCode)
    .flatMap((item: SearchEntry): readonly SearchHit[] => {
      const phrase: boolean = item.text.includes(normalized);
      let total = 0;
      for (const term of terms) {
        const score: number | null = phrase ? 0 : termScore(term, item.words);
        if (score === null) return [];
        total += score;
      }
      // Ruang didahulukan bila skornya sama, lalu label yang lebih pendek.
      return [{ ...item, score: total * 10 + (item.kind === "ruang" ? 0 : 1) + item.text.length / 1000 }];
    })
    .sort((a: SearchHit, b: SearchHit): number => a.score - b.score);
}
