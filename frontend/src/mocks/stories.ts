// Data mode uji (EXPO_PUBLIC_STORIES_SOURCE=mock). Isi POI diambil dari src/data/museum.ts
// (Excel survei), termasuk cerita final dari backend/data/approved-stories.json.
// Foto editorial memakai URL Storage dari manifest; audio mock masih file dummy.
// Bentuk setiap objek mengikuti respons API backend (lihat backend/README.md).
import {
  type Language,
  type PoiDetail,
  type PoiSummary,
  type Profile,
  type Quest,
} from "../domain/contracts";
import { activePois, type MuseumPoi, poiIdFor } from "../data/museum";
import { localizedQuestsForPoi, questsForPoi } from "../data/quests";
import { poiPhotoChallenges, poiStoryPhoto } from "../data/poiMedia";
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

const pois = activePois.filter(withContent).filter((poi: MuseumPoi): boolean => poi.number <= 11);

/** Gambar nomor 1 selalu dipakai untuk ringkasan dan foto cerita pertama. */
function mainPhoto(poi: MuseumPoi): string {
  return poiStoryPhoto(poi.idPoi, 1);
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
  profile: "dewasa",
  cards: [
    {
      type: "description",
      text: poi.content.cerita,
      photoUrl: mainPhoto(poi),
      secondPhotoUrl: poiStoryPhoto(poi.idPoi, 2),
      title: poi.content.judul,
      fact: poi.content.fakta,
      highlights: poi.content.sorotan,
    },
    { type: "audio", audioUrl: mockMediaUrl("/narasi.wav"), durationSeconds: 30 },
  ],
  photoChallenges: poiPhotoChallenges(poi.idPoi),
  quest: firstQuest(poi.idPoi),
  quests: [...questsForPoi(poi.idPoi, "dewasa")],
}));

function firstQuest(poiId: string): Quest {
  const quest: Quest | undefined = questsForPoi(poiId, "dewasa")[0];
  if (quest === undefined) throw new Error(`Quest untuk POI ${poiId} belum tersedia.`);
  return quest;
}

/**
 * Teks cerita anak (ceritaAnak, dari Konten_Cerita_Anak). Seperti backend, bila belum ada teks anak
 * dipakai versi Umum (dewasa).
 */
export function mockPoiForProfile(detail: PoiDetail, profile: Profile, language: Language): PoiDetail {
  const quests: readonly Quest[] = localizedQuestsForPoi(detail.id_poi, profile, language);
  const profiled: PoiDetail = { ...detail, profile, quests: [...quests] };
  const content = pois.find((poi): boolean => poiIdFor(poi.number) === detail.id_poi)?.content;
  const [description, audio] = detail.cards;
  const english = language === "en" ? content?.en?.[profile === "anak" ? "anak" : "umum"] : undefined;
  if (language === "en" && english === undefined) {
    throw new RangeError(`Terjemahan cerita belum tersedia: poiId=${detail.id_poi}, profile=${profile}, language=${language}`);
  }
  if (english !== undefined) {
    return {
      ...profiled,
      language,
      quest: quests[0] ?? detail.quest,
      cards: [{ ...description, text: english.cerita, title: english.judul, fact: english.fakta, highlights: null }, null],
    };
  }
  const text: string | undefined = profile === "anak" ? content?.ceritaAnak : undefined;
  if (text === undefined) return profiled;
  return { ...profiled, cards: [{ ...description, text }, audio] };
}

/** Token koleksi → POI. Hanya dipakai sumber data mock untuk meniru backend. */
export const mockTokenToPoi: ReadonlyMap<string, string> = new Map(
  pois.map((poi) => [mockPoiToken(poi.number), poiIdFor(poi.number)]),
);
