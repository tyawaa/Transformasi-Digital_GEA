// Data mode uji (EXPO_PUBLIC_STORIES_SOURCE=mock). Isi POI diambil dari src/data/museum.ts
// (Excel survei), termasuk cerita final dari backend/data/approved-stories.json.
// Foto dan audio masih file dummy sampai media asli diunggah (B5/B6).
// Bentuk setiap objek mengikuti respons API backend (lihat backend/README.md).
import {
  type OptionLabel,
  type PoiDetail,
  type PoiSummary,
} from "../domain/contracts";
import { activePois, type MuseumPoi, poiIdFor, questIdFor } from "../data/museum";
import { wrapQr } from "../features/qr/qrPayload";
import { mockMediaUrl } from "../services/media";

export const MOCK_ZONE_IDS = {
  left: "20000000-0000-4000-8000-000000000001",
  right: "20000000-0000-4000-8000-000000000002",
} as const;

/** Token QR uji (64 hex). Bukan token produksi. */
export const mockPoiToken = (n: number): string => n.toString(16).padStart(2, "0").repeat(32);
export const MOCK_ENTRANCE_TOKEN: string = "e0".repeat(32);
export const mockZoneToken = (code: "ZL" | "ZR"): string => (code === "ZL" ? "f1" : "f2").repeat(32);

/** QR berlabel untuk tombol uji di layar scan. */
export function mockPoiQr(poi: MuseumPoi): string {
  return wrapQr("poi", poi.code, mockPoiToken(poi.number));
}
export const MOCK_ENTRANCE_QR: string = wrapQr("entrance", null, MOCK_ENTRANCE_TOKEN);

function withContent(poi: MuseumPoi): poi is MuseumPoi & { content: NonNullable<MuseumPoi["content"]> } {
  return poi.content !== null;
}

const pois = activePois.filter(withContent);

/** Foto utama POI: foto survei jika ada, selain itu ilustrasi sementara. */
function mainPhoto(poi: MuseumPoi): string {
  return mockMediaUrl(`/poi/${poi.code}/${poi.content?.fotoUtama ?? 0}`);
}

export const mockPoiSummaries: readonly PoiSummary[] = pois.map((poi): PoiSummary => ({
  id_poi: poiIdFor(poi.number),
  nama: poi.name,
  photoUrl: mainPhoto(poi),
  estimasi_durasi: 5,
}));

export const mockPoiDetails: readonly PoiDetail[] = pois.map((poi, index: number): PoiDetail => ({
  id_poi: poiIdFor(poi.number),
  id_zona: MOCK_ZONE_IDS[poi.wing],
  nama: poi.name,
  path_foto: "mock/photo.png",
  denah_x: poi.room.x,
  denah_y: poi.room.y,
  prioritas: index + 1,
  estimasi_durasi: 5,
  language: "id",
  profile: "umum",
  cards: [
    {
      type: "description",
      text: poi.content.cerita,
      photoUrl: mainPhoto(poi),
      title: poi.content.judul,
      fact: poi.content.fakta,
      highlights: poi.content.sorotan,
    },
    { type: "audio", audioUrl: mockMediaUrl("/narasi.wav"), durationSeconds: 30 },
  ],
  quest: {
    idQuest: questIdFor(poi.number),
    type: "pilgan",
    instruksi: poi.content.instruksi,
    pertanyaan: poi.content.pertanyaan,
    options: (["A", "B", "C", "D"] as const).map((label: OptionLabel, i: number) => ({
      label_opsi: label,
      teks_opsi: poi.content.opsi[i] ?? "",
    })),
  },
}));

/** Token koleksi → POI. Hanya dipakai sumber data mock untuk meniru backend. */
export const mockTokenToPoi: ReadonlyMap<string, string> = new Map(
  pois.map((poi) => [mockPoiToken(poi.number), poiIdFor(poi.number)]),
);

/** Hanya dipakai sumber data mock untuk menilai jawaban, meniru server. Tidak dikirim ke layar. */
export const mockAnswerKeys: ReadonlyMap<
  string,
  { readonly kunci: OptionLabel; readonly hint: string }
> = new Map(
  pois.map((poi) => [questIdFor(poi.number), { kunci: poi.content.kunci, hint: poi.content.hint }]),
);
