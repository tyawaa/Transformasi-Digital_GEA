import { z } from "zod";

export const locationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracyMeters: z.number().finite().nonnegative(),
});
export type DeviceLocation = z.infer<typeof locationSchema>;

export const accessDecisionSchema = z.object({
  status: z.enum([
    "inside",
    "outside",
    "low_accuracy",
    "location_unavailable",
    "not_configured",
  ]),
  accessAllowed: z.boolean(),
  distanceMeters: z.number().finite().nonnegative().nullable(),
  accuracyMeters: z.number().finite().nonnegative().nullable(),
  fallback: z.enum(["entrance_qr"]).nullable(),
  reasonCode: z.string(),
});
export type AccessDecision = z.infer<typeof accessDecisionSchema>;

export const healthSchema = z.object({
  service: z.literal("gea-api"),
  museumConfigured: z.boolean(),
});
export type BackendHealth = z.infer<typeof healthSchema>;

/** Kategori pengunjung sesuai sheet: anak = Anak-anak (7–12), dewasa = Umum (13 tahun ke atas). */
export const profileSchema = z.enum(["anak", "dewasa"]);
export type Profile = z.infer<typeof profileSchema>;

/**
 * Profil dari server / penyimpanan. Nilai lama "umum" dan "remaja" dibaca sebagai "dewasa" (Umum),
 * "pelajar" sebagai "anak" (kunjungan lama yang tersimpan di HP atau server yang belum dimigrasi).
 */
const storedProfileSchema = z
  .enum(["anak", "remaja", "dewasa", "umum", "pelajar"])
  .transform((value): Profile => (value === "anak" || value === "pelajar" ? "anak" : "dewasa"));

export const visitSchema = z.object({
  id_sesi: z.uuid(),
  bahasa: z.enum(["id", "en"]),
  profil: storedProfileSchema,
  verification_method: z.enum(["gps", "entrance_qr"]),
  status: z.literal("aktif"),
});
export type Visit = z.infer<typeof visitSchema>;

export const poiSchema = z.object({
  id_poi: z.uuid(),
  nama: z.string(),
  photoUrl: z.url(),
  estimasi_durasi: z.number().int().positive(),
});
export const poiListSchema = z.array(poiSchema);
export type PoiSummary = z.infer<typeof poiSchema>;

export const languageSchema = z.enum(["id", "en"]);
export type Language = z.infer<typeof languageSchema>;
export const optionLabelSchema = z.enum(["A", "B", "C", "D"]);
export type OptionLabel = z.infer<typeof optionLabelSchema>;

// Bentuk respons GET /pois/{id}. Kunci jawaban dan hint sengaja tidak ada di sini.
export const descriptionCardSchema = z.object({
  type: z.literal("description"),
  text: z.string().min(1),
  photoUrl: z.url(),
  secondPhotoUrl: z.url(),
  title: z.string().min(1).nullable().optional(),
  fact: z.string().min(1).nullable().optional(),
  highlights: z.string().min(1).nullable().optional(),
});
export const audioCardSchema = z.object({
  type: z.literal("audio"),
  audioUrl: z.url(),
  durationSeconds: z.number().int().min(30).max(90),
});
export const questOptionSchema = z.object({
  label_opsi: optionLabelSchema,
  teks_opsi: z.string().min(1),
});
export const questTypeSchema = z.enum([
  "pilgan",
  "foto",
  "isian_singkat",
  "benar_salah",
  "cocokkan",
]);
export type QuestType = z.infer<typeof questTypeSchema>;

export const questSchema = z.object({
  idQuest: z.uuid(),
  type: questTypeSchema.default("pilgan"),
  instruksi: z.string().min(1),
  pertanyaan: z.string().min(1),
  options: z.array(questOptionSchema).default([]),
  target_foto: z.string().nullable().optional(),
  penjelasan: z.string().nullable().optional(),
  isDisabled: z.boolean().optional(),
});
export const poiDetailSchema = z.object({
  id_poi: z.uuid(),
  id_zona: z.uuid(),
  nama: z.string().min(1),
  path_foto: z.string().min(1),
  denah_x: z.number(),
  denah_y: z.number(),
  prioritas: z.number().int(),
  estimasi_durasi: z.number().int().positive(),
  language: languageSchema,
  profile: storedProfileSchema,
  cards: z.tuple([descriptionCardSchema, audioCardSchema]),
  photoChallenges: z.array(z.object({
    sequence: z.number().int().min(3),
    photoUrl: z.url(),
    instruction: z.string().min(1),
  })),
  quest: questSchema,
});
export type DescriptionCard = z.infer<typeof descriptionCardSchema>;
export type AudioCard = z.infer<typeof audioCardSchema>;
export type QuestOption = z.infer<typeof questOptionSchema>;
export type Quest = z.infer<typeof questSchema>;
export type PoiDetail = z.infer<typeof poiDetailSchema>;

// POST /sessions/{id}/verify-qr
export const poiVerificationSchema = z.object({
  idPoi: z.uuid(),
  verified: z.literal(true),
  expiresAt: z.string().min(1),
  poi: poiDetailSchema,
});
export type PoiVerification = z.infer<typeof poiVerificationSchema>;

// POST /sessions/{id}/quests/{questId}/answers
export const answerResultSchema = z.object({
  idQuest: z.uuid(),
  idPoi: z.uuid(),
  answerCorrect: z.boolean(),
  attemptCount: z.number().int().positive(),
  completed: z.boolean(),
  hint: z.string().nullable(),
  // Sprint 2 (E12, C-2). Opsional agar backend Sprint 1 tetap terbaca.
  failed: z.boolean().optional(),
  pointsAwarded: z.number().int().nonnegative().optional(),
});
export type AnswerResult = z.infer<typeof answerResultSchema>;

// POST /sessions/{id}/pois/{poiId}/close
export const closedCardSchema = z.object({
  idPoi: z.uuid(),
  statusKartu: z.literal("ditutup"),
});
export type ClosedCard = z.infer<typeof closedCardSchema>;

// GET /sessions/{id}/progress: baris tabel menampilkan_kartu dan mengerjakan milik sesi.
export const visitProgressSchema = z.object({
  session: visitSchema,
  cards: z.array(z.object({
    id_poi: z.uuid(),
    status_kartu: z.enum(["sedang_tampil", "ditutup"]),
    waktu_ditutup: z.string().nullable(),
  })),
  quests: z.array(z.object({
    id_quest: z.uuid(),
    jumlah_percobaan: z.number().int().positive(),
    hint_dipakai: z.boolean(),
    answer_correct: z.boolean(),
  })),
});
export type VisitProgress = z.infer<typeof visitProgressSchema>;

export type DecisionMessage = {
  readonly title: string;
  readonly description: string;
};

export function decisionMessage(decision: AccessDecision): DecisionMessage {
  switch (decision.status) {
    case "inside":
      return {
        title: "Kamu berada di area museum",
        description: "Lokasi berhasil diperiksa. Kunjunganmu bisa dimulai.",
      };
    case "outside":
      return {
        title: "Belum berada di area museum",
        description: "Datang ke area museum, lalu periksa lokasimu kembali.",
      };
    case "low_accuracy":
      return {
        title: "Lokasi belum cukup akurat",
        description:
          "GPS belum bisa memastikan posisimu. Gunakan QR di pintu masuk.",
      };
    case "location_unavailable":
      return {
        title: "Lokasi belum tersedia",
        description:
          "Aktifkan lokasi perangkat atau gunakan QR di pintu masuk.",
      };
    case "not_configured":
      return {
        title: "Pengecekan lokasi belum tersedia",
        description:
          "Batas area museum belum ditetapkan. Gunakan QR pintu masuk yang diterbitkan museum.",
      };
  }
}
