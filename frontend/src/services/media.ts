import { type ImageSourcePropType } from "react-native";
import { poiPhoto } from "../data/poiPhotos";

// URL dengan host ini hanya dipakai data dummy (E4) dan menunjuk ke file di assets/mock.
// URL lain (dari backend/Storage) dipakai apa adanya.
export const MOCK_MEDIA_HOST = "mock.gea.local";

const mockFiles: { readonly [path: string]: number } = {
  // Sementara: ilustrasi fosil dari onboarding sampai foto asli POI diunggah (B5/B6).
  "/photo.png": require("../../assets/onboarding/group477.svg") as number,
  "/narasi.wav": require("../../assets/mock/narasi-dummy.wav") as number,
};

export function mockMediaUrl(path: string): string {
  return `https://${MOCK_MEDIA_HOST}${path}`;
}

function mockFile(url: string): number | null {
  const parsed: URL = new URL(url);
  if (parsed.host !== MOCK_MEDIA_HOST) return null;
  // Foto survei: /poi/<kode>/<nomor>. Bila foto belum disinkronkan, pakai ilustrasi sementara.
  const survey: RegExpMatchArray | null = parsed.pathname.match(/^\/poi\/(P\d{2})\/(\d+)$/i);
  if (survey !== null) {
    return poiPhoto(survey[1] ?? "", Number(survey[2])) ?? mockFiles["/photo.png"] ?? null;
  }
  const file: number | undefined = mockFiles[parsed.pathname];
  if (file === undefined) throw new Error(`Media dummy tidak dikenal: ${url}`);
  return file;
}

export function imageSource(url: string): ImageSourcePropType {
  return mockFile(url) ?? { uri: url };
}

/** Sumber media untuk expo-audio dan expo-image: file dummy atau URL. */
export function mediaSource(url: string): number | { readonly uri: string } {
  return mockFile(url) ?? { uri: url };
}

export const audioSource = mediaSource;
