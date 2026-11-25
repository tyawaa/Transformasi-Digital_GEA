import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";
import { questCatalog, questsForPoi } from "../data/quests";
import { answerResultSchema, type AnswerResult, type Profile, type Quest } from "../domain/contracts";
import type { CapturedPhoto } from "./photo";
import { verifyDevicePhoto } from "./photoModel";
import { devicePhotoVerdictSchema, type DevicePhotoVerdict } from "./photoModelTypes";

const receiptSchema = z.object({ requestId: z.uuid(), verdict: devicePhotoVerdictSchema, answer: answerResultSchema });
type PhotoReceipt = z.infer<typeof receiptSchema>;

/** Recover completed photos even if the app closed between receipt storage and UI progress storage. */
export async function restoredDevicePhotoAnswers(idSesi: string): Promise<readonly AnswerResult[]> {
  z.uuid().parse(idSesi);
  const prefix: string = `gea.photo.completed.v1:${idSesi}:`;
  const keys: readonly string[] = (await AsyncStorage.getAllKeys()).filter((key: string): boolean => key.startsWith(prefix));
  const values: readonly [string, string | null][] = await AsyncStorage.multiGet(keys);
  return values.map(([key, value]): AnswerResult => {
    if (value === null) throw new Error(`Hasil foto lokal tidak tersedia: ${key}`);
    const receipt: PhotoReceipt = receiptSchema.parse(JSON.parse(value) as unknown);
    if (receipt.verdict.decision !== "accepted" || receipt.answer.evaluationSource !== "device" ||
      !receipt.answer.completed || receipt.answer.idQuest !== key.slice(prefix.length) ||
      receipt.verdict.questId !== receipt.answer.idQuest) {
      throw new Error(`Hasil foto lokal tidak konsisten: ${key}`);
    }
    return receipt.answer;
  });
}

/** Persist verdict metadata and points locally; these are never presented as server-verified evidence. */
export async function answerDevicePhotoQuest(idSesi: string, idQuest: string, requestId: string, photo: CapturedPhoto, profile: Profile): Promise<AnswerResult> {
  z.uuid().parse(idSesi);
  z.uuid().parse(requestId);
  const entry = questCatalog.find((item): boolean => item.idQuest === idQuest && item.type === "foto");
  if (entry === undefined) throw new Error(`Quest foto tidak terdaftar: ${idQuest}`);
  const quest: Quest | undefined = questsForPoi(entry.idPoi, profile).find((item: Quest): boolean => item.idQuest === idQuest && item.isDisabled !== true);
  if (quest === undefined) throw new RangeError(`Quest foto tidak tersedia untuk profil: idQuest=${idQuest}, profile=${profile}`);
  const requestKey: string = `gea.photo.request.v1:${idSesi}:${requestId}`;
  const completedKey: string = `gea.photo.completed.v1:${idSesi}:${idQuest}`;
  const verdict: DevicePhotoVerdict = await verifyDevicePhoto(photo.uri, idQuest);
  const stored: string | null = await AsyncStorage.getItem(requestKey);
  if (stored !== null) {
    const receipt: PhotoReceipt = receiptSchema.parse(JSON.parse(stored) as unknown);
    if (receipt.verdict.questId !== idQuest || receipt.verdict.imageSha256 !== verdict.imageSha256) {
      throw new Error("ID permintaan foto sudah dipakai untuk foto atau quest berbeda. Ambil ulang foto.");
    }
    return receipt.answer;
  }
  const completed: string | null = await AsyncStorage.getItem(completedKey);
  if (completed !== null) throw new Error("Quest foto ini sudah selesai pada kunjungan ini.");
  const accepted: boolean = verdict.decision === "accepted";
  const answer: AnswerResult = answerResultSchema.parse({
    idQuest, idPoi: entry.idPoi, answerCorrect: accepted, attemptCount: accepted ? 1 : 0,
    completed: accepted, failed: false, hint: accepted ? null : verdict.reason,
    pointsAwarded: accepted ? quest.points : 0,
    photoDecision: verdict.decision, photoMessage: verdict.reason, evaluationSource: "device",
  });
  const receipt: PhotoReceipt = { requestId, verdict, answer };
  const encoded: string = JSON.stringify(receipt);
  const entries: [string, string][] = [[requestKey, encoded]];
  await AsyncStorage.multiSet(accepted ? [...entries, [completedKey, encoded]] : entries);
  return answer;
}
