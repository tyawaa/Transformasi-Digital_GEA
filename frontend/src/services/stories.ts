import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  type AnswerResult,
  answerResultSchema,
  type ClosedCard,
  type DeviceLocation,
  locationSchema,
  closedCardSchema,
  type Language,
  type OptionLabel,
  type PoiDetail,
  poiDetailSchema,
  poiListSchema,
  type PoiSummary,
  type PoiVerification,
  poiVerificationSchema,
  type Profile,
  type Visit,
} from "../domain/contracts";
import { stepGeofence } from "../domain/geofence";
import { questCatalog } from "../data/quests";
import { museumPoiById } from "../data/museum";
import { type RestoredVisit, restoreServerVisit } from "../features/stories/progress";
import {
  MOCK_ENTRANCE_TOKEN,
  mockPoiDetails,
  mockPoiForProfile,
  mockPoiSummaries,
  mockTokenToPoi,
  mockZoneToken,
} from "../mocks/stories";
import { type GeaApi, GeaServiceError, type QuestAnswerExtra } from "./api";

/**
 * Sumber data Stories/quest. Mock (E4/E14) dan API (E7/E20) punya method yang sama,
 * sehingga layar tidak berubah saat mock ditukar ke backend.
 */
export interface StoriesSource {
  readonly kind: "mock" | "api";
  /** profile: kategori pengunjung dari preferensi usia (anak = Anak-anak 7–12, dewasa = Umum). */
  startQrVisit(idSesi: string, token: string, profile: Profile): Promise<Visit>;
  pois(): Promise<readonly PoiSummary[]>;
  poiDetail(idPoi: string, language: Language, profile: Profile): Promise<PoiDetail>;
  verifyPoiQr(idSesi: string, token: string, language: Language, profile: Profile): Promise<PoiVerification>;
  verifyPoiGps(idSesi: string, idPoi: string, location: DeviceLocation, language: Language, profile: Profile): Promise<PoiVerification>;
  answerQuest(
    idSesi: string,
    idQuest: string,
    requestId: string,
    labelOpsi: OptionLabel | null,
    extra?: QuestAnswerExtra,
  ): Promise<AnswerResult>;
  closeCard(idSesi: string, idPoi: string): Promise<ClosedCard>;
  /** Progres dari server untuk melanjutkan sesi; null = tidak ada data server (mock). */
  restore(idSesi: string): Promise<RestoredVisit | null>;
}

const VERIFICATION_MINUTES = 15;
const MOCK_STATE_KEY = "gea.mock.server.v2";

function delay(): Promise<void> {
  return new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve, 250);
  });
}

type MockState = {
  verifiedUntil: Record<string, number>;
  attempts: Record<string, number>;
  completed: Record<string, true>;
  failed: Record<string, true>;
  responses: Record<string, AnswerResult>;
  closed: Record<string, true>;
  payloads: Record<string, { readonly questId: string; readonly label: OptionLabel | null; readonly text: string | null }>;
};

/**
 * Meniru aturan backend: GPS atau QR memverifikasi koleksi sebelum quest, maksimal 3 percobaan,
 * retry idempoten, quest selesai = 409. Status "server" disimpan di perangkat agar uji
 * force-close tetap konsisten.
 */
export class MockStoriesSource implements StoriesSource {
  readonly kind = "mock" as const;
  private state: MockState | null = null;

  async startQrVisit(idSesi: string, token: string, profile: Profile): Promise<Visit> {
    await delay();
    if (token !== MOCK_ENTRANCE_TOKEN && token !== mockZoneToken("ZL") && token !== mockZoneToken("ZR")) {
      throw new GeaServiceError(403, "ENTRANCE_QR_INVALID", "QR pintu masuk tidak valid.");
    }
    return { id_sesi: idSesi, bahasa: "id", profil: profile, verification_method: "entrance_qr", status: "aktif" };
  }

  async pois(): Promise<readonly PoiSummary[]> {
    await delay();
    return poiListSchema.parse(mockPoiSummaries);
  }

  async poiDetail(idPoi: string, _language: Language, profile: Profile): Promise<PoiDetail> {
    await delay();
    return poiDetailSchema.parse(mockPoiForProfile(this.findPoi(idPoi), profile));
  }

  async verifyPoiQr(idSesi: string, token: string, _language: Language, profile: Profile): Promise<PoiVerification> {
    await delay();
    const idPoi: string | undefined = mockTokenToPoi.get(token);
    if (idPoi === undefined) {
      throw new GeaServiceError(403, "POI_QR_INVALID", "QR koleksi tidak valid.");
    }
    return this.storeVerification(idSesi, idPoi, profile);
  }

  async verifyPoiGps(idSesi: string, idPoi: string, location: DeviceLocation, _language: Language, profile: Profile): Promise<PoiVerification> {
    await delay();
    this.findPoi(idPoi);
    const checkpoint = museumPoiById(idPoi);
    if (checkpoint === undefined) throw new GeaServiceError(404, "POI_NOT_FOUND", "Titik koleksi tidak ditemukan.");
    const decision = stepGeofence([], locationSchema.parse(location), [{ ...checkpoint, id: idPoi }]);
    if (decision.weak) throw new GeaServiceError(403, "GPS_ACCURACY_EXCEEDS_20_METERS", "Lokasi belum cukup akurat.");
    if (!decision.inside.includes(idPoi)) throw new GeaServiceError(403, "OUTSIDE_POI_AREA", "Kamu belum berada di dekat koleksi ini.");
    return this.storeVerification(idSesi, idPoi, profile);
  }

  private async storeVerification(idSesi: string, idPoi: string, profile: Profile): Promise<PoiVerification> {
    const state: MockState = await this.load();
    const expiresAt: number = Date.now() + VERIFICATION_MINUTES * 60_000;
    state.verifiedUntil[`${idSesi}:${idPoi}`] = expiresAt;
    await this.save();
    return poiVerificationSchema.parse({ idPoi, verified: true, expiresAt: new Date(expiresAt).toISOString(), poi: mockPoiForProfile(this.findPoi(idPoi), profile) });
  }

  /** Penilaian mock mengikuti kunci, variasi jawaban, poin dan batas percobaan sheet. */
  async answerQuest(idSesi: string, idQuest: string, requestId: string, labelOpsi: OptionLabel | null, extra?: QuestAnswerExtra): Promise<AnswerResult> {
    await delay();
    const state: MockState = await this.load();
    const responseKey: string = `${idSesi}:${requestId}`;
    const text: string | null = extra?.jawabanTeks ?? null;
    const repeated: AnswerResult | undefined = state.responses[responseKey];
    if (repeated !== undefined) {
      const payload = state.payloads[responseKey];
      if (payload?.questId !== idQuest || payload.label !== labelOpsi || payload.text !== text) {
        throw new GeaServiceError(409, "IDEMPOTENCY_CONFLICT", "Permintaan ini sudah dipakai untuk jawaban berbeda.");
      }
      return repeated;
    }
    const quest = questCatalog.find((item): boolean => item.idQuest === idQuest);
    if (quest === undefined) throw new GeaServiceError(404, "QUEST_NOT_FOUND", "Quest tidak ditemukan.");
    if (state.closed[`${idSesi}:${quest.idPoi}`] !== true) {
      throw new GeaServiceError(403, "STORY_COMPLETION_REQUIRED", "Selesaikan cerita sebelum mengerjakan quest.");
    }
    if (quest.type === "foto") throw new GeaServiceError(503, "PHOTO_QUEST_NOT_AVAILABLE", "Fitur foto akan tersedia nanti.");
    const until: number | undefined = state.verifiedUntil[`${idSesi}:${quest.idPoi}`];
    if (until === undefined || until < Date.now()) {
      throw new GeaServiceError(403, "CHECKPOINT_VERIFICATION_REQUIRED", "Periksa GPS atau scan QR koleksi sebelum menjawab.");
    }
    const questKey: string = `${idSesi}:${idQuest}`;
    if (state.completed[questKey] === true) throw new GeaServiceError(409, "QUEST_ALREADY_COMPLETED", "Quest sudah selesai.");
    if (state.failed[questKey] === true) throw new GeaServiceError(409, "QUEST_ATTEMPTS_EXHAUSTED", "Kesempatan menjawab sudah habis.");
    if (quest.type === "isian_singkat" ? text === null || text.trim() === "" : !quest.options.some((option): boolean => option.label_opsi === labelOpsi)) {
      throw new GeaServiceError(400, "ANSWER_REQUIRED", "Isi jawaban sesuai tipe quest.");
    }
    const normalize = (value: string): string => value.trim().toLowerCase();
    const correct: boolean = quest.type === "isian_singkat"
      ? [quest.answer, ...quest.acceptedAnswers].some((answer: string): boolean => normalize(answer) === normalize(text ?? ""))
      : labelOpsi === quest.answer;
    const attemptCount: number = (state.attempts[questKey] ?? 0) + 1;
    state.attempts[questKey] = attemptCount;
    const failed: boolean = !correct && attemptCount >= quest.maxAttempts;
    if (correct) state.completed[questKey] = true;
    if (failed) state.failed[questKey] = true;
    const result: AnswerResult = answerResultSchema.parse({
      idQuest, idPoi: quest.idPoi, answerCorrect: correct, attemptCount,
      completed: correct, hint: correct || failed ? null : quest.hint, failed,
      pointsAwarded: correct ? quest.points : 0,
    });
    state.responses[responseKey] = result;
    state.payloads[responseKey] = { questId: idQuest, label: labelOpsi, text };
    await this.save();
    return result;
  }

  async closeCard(idSesi: string, idPoi: string): Promise<ClosedCard> {
    await delay();
    this.findPoi(idPoi);
    const state: MockState = await this.load();
    state.closed[`${idSesi}:${idPoi}`] = true;
    await this.save();
    return closedCardSchema.parse({ idPoi, statusKartu: "ditutup" });
  }

  restore(): Promise<RestoredVisit | null> {
    return Promise.resolve(null);
  }

  private async load(): Promise<MockState> {
    if (this.state !== null) return this.state;
    const empty: MockState = { verifiedUntil: {}, attempts: {}, completed: {}, failed: {}, responses: {}, closed: {}, payloads: {} };
    try {
      const raw: string | null = await AsyncStorage.getItem(MOCK_STATE_KEY);
      this.state = raw === null ? empty : { ...empty, ...(JSON.parse(raw) as Partial<MockState>) };
    } catch (cause: unknown) {
      console.warn("gea_mock_state_read_failed", { error: String(cause) });
      this.state = empty;
    }
    return this.state;
  }

  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(MOCK_STATE_KEY, JSON.stringify(this.state));
    } catch (cause: unknown) {
      console.warn("gea_mock_state_save_failed", { error: String(cause) });
    }
  }

  private findPoi(idPoi: string): PoiDetail {
    const poi: PoiDetail | undefined = mockPoiDetails.find((item: PoiDetail): boolean => item.id_poi === idPoi);
    if (poi === undefined) {
      throw new GeaServiceError(404, "POI_NOT_FOUND", "Koleksi tidak ditemukan.");
    }
    return poi;
  }
}

/** E7/E20: sumber data asli. Aturan QR, penilaian, dan hint diputuskan backend. */
export class ApiStoriesSource implements StoriesSource {
  readonly kind = "api" as const;

  constructor(private readonly api: GeaApi) {}

  startQrVisit(idSesi: string, token: string, profile: Profile): Promise<Visit> {
    return this.api.startQrVisit(idSesi, token, profile);
  }

  pois(): Promise<readonly PoiSummary[]> {
    return this.api.pois();
  }

  poiDetail(idPoi: string, language: Language, profile: Profile): Promise<PoiDetail> {
    return this.api.poiDetail(idPoi, language, profile);
  }

  verifyPoiQr(idSesi: string, token: string, language: Language, profile: Profile): Promise<PoiVerification> {
    return this.api.verifyPoiQr(idSesi, token, language, profile);
  }

  verifyPoiGps(idSesi: string, idPoi: string, location: DeviceLocation, language: Language, profile: Profile): Promise<PoiVerification> {
    return this.api.verifyPoiGps(idSesi, idPoi, location, language, profile);
  }

  answerQuest(
    idSesi: string,
    idQuest: string,
    requestId: string,
    labelOpsi: OptionLabel | null,
    extra?: QuestAnswerExtra,
  ): Promise<AnswerResult> {
    return this.api.answerQuest(idSesi, idQuest, requestId, labelOpsi, extra);
  }

  closeCard(idSesi: string, idPoi: string): Promise<ClosedCard> {
    return this.api.closeCard(idSesi, idPoi);
  }

  /** Memulihkan poin, lencana, dan progres langsung dari satu respons resmi Supabase. */
  async restore(idSesi: string): Promise<RestoredVisit> {
    return restoreServerVisit(await this.api.progress(idSesi));
  }
}

/** Aktifkan dengan EXPO_PUBLIC_STORIES_SOURCE=mock di .env (hanya untuk pengembangan). */
export const storiesMockEnabled: boolean = process.env.EXPO_PUBLIC_STORIES_SOURCE === "mock";
