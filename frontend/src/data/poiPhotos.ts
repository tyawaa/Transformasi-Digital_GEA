// Foto survei per POI. File fotonya TIDAK masuk Git (lihat .gitignore): jalankan
// scripts/sync-poi-photos.ps1 untuk menyalin foto dari folder POI dan membuat poiPhotos.local.ts.
// Tanpa file itu aplikasi tetap jalan; layar cerita memakai ilustrasi sementara.

type PhotoMap = { readonly [code: string]: readonly number[] };

let photos: PhotoMap = {};
try {
  // Metro memperlakukan require di dalam try/catch sebagai dependensi opsional.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  photos = (require("./poiPhotos.local") as { poiPhotos: PhotoMap }).poiPhotos;
} catch {
  photos = {};
}

/** Foto ke-`index` milik POI `code` (mis. "P03"), atau null bila belum ada. */
export function poiPhoto(code: string, index: number): number | null {
  return photos[code.toUpperCase()]?.[index] ?? null;
}

export function hasPoiPhotos(code: string): boolean {
  return (photos[code.toUpperCase()]?.length ?? 0) > 0;
}
