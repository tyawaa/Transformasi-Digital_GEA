import assert from "node:assert/strict";
import { test } from "node:test";
import { localizedQuestsForPoi, normalizeLocalQuestAnswer, questCatalog, questsForPoi } from "../src/data/quests.ts";
import { earnedBadges } from "../src/domain/points.ts";
import { devicePhotoPoints, emptyProgress, mergeServerProgress, recordQuestAnswer, restoreServerVisit } from "../src/features/stories/progress.ts";
import { withDevicePhotoQuests } from "../src/services/devicePhotoPlan.ts";

const poiId = "30000000-0000-4000-8000-000000000002";
const plan = questsForPoi(poiId, "dewasa");
const pg = plan.find((quest) => quest.type === "pilgan");
const response = {
  idPoi: poiId, idQuest: pg.idQuest, completed: true, answerCorrect: true,
  failed: false, attemptCount: 1, pointsAwarded: 10, hint: null,
};

test("bahasa Inggris mempertahankan identitas quest, penilaian, dan aturan profil", () => {
  for (const id of new Set(questCatalog.map((quest) => quest.idPoi))) {
    for (const profile of ["anak", "dewasa"]) {
      const original = questsForPoi(id, profile);
      const translated = localizedQuestsForPoi(id, profile, "en");
      assert.deepEqual(
        translated.map(({ idQuest, code, type, points, maxAttempts, requiredForBadge, isDisabled, options }) =>
          ({ idQuest, code, type, points, maxAttempts, requiredForBadge, isDisabled, labels: options.map((option) => option.label_opsi) })),
        original.map(({ idQuest, code, type, points, maxAttempts, requiredForBadge, isDisabled, options }) =>
          ({ idQuest, code, type, points, maxAttempts, requiredForBadge, isDisabled, labels: options.map((option) => option.label_opsi) })),
      );
      for (const quest of translated.filter((quest) => !quest.isDisabled)) {
        assert.notEqual(quest.pertanyaan, original.find((item) => item.idQuest === quest.idQuest).pertanyaan);
      }
    }
  }
});

test("jawaban isian Inggris tetap cocok dengan kunci penilaian katalog", () => {
  for (const [code, answer] of [["Q-007", " TECTONIC "], ["Q-010", "peridotite"]]) {
    const quest = questCatalog.find((quest) => quest.code === code);
    const normalized = normalizeLocalQuestAnswer(code, answer).trim().toLowerCase();
    assert.ok([quest.answer, ...quest.acceptedAnswers].some((accepted) => accepted.toLowerCase() === normalized));
  }
  assert.equal(normalizeLocalQuestAnswer("Q-007", "jawaban salah"), "jawaban salah");
});

test("POI-02, 09 dan 11 memiliki kartu foto dan PG sesuai sheet", () => {
  for (const number of [2, 9, 11]) {
    const quests = questsForPoi(`30000000-0000-4000-8000-${String(number).padStart(12, "0")}`, "dewasa");
    assert.deepEqual(quests.map((quest) => quest.type), ["foto", "pilgan"]);
  }
  assert.equal(questsForPoi("30000000-0000-4000-8000-000000000005", "dewasa")[0].maxAttempts, 2);
});

test("menyelesaikan PG mempertahankan foto belum selesai dan retry tidak menambah poin", () => {
  const original = { ...emptyProgress, closed: true };
  const next = recordQuestAnswer(original, response, plan);
  assert.equal(next.completed, false);
  assert.equal(next.failed, false);
  assert.equal(next.pointsAwarded, 10);
  assert.equal(recordQuestAnswer(next, response, plan).pointsAwarded, 10);
  assert.equal(original.quests, undefined);
  const refs = [{ id: poiId, wing: "left", code: "P02", quests: plan }];
  assert.equal(earnedBadges(refs, { [poiId]: next }, {}).includes("BD-02"), false);
  assert.equal(earnedBadges(refs, { [poiId]: next }, {}).includes("BD-04"), false);
  assert.equal(earnedBadges(refs, { [poiId]: next }, {}).includes("BD-03"), true);
});

test("profil anak hanya mendapat quest foto versi anak (Quest_Anak)", () => {
  const childPlan = questsForPoi(poiId, "anak").filter((quest) => !quest.isDisabled);
  assert.deepEqual(childPlan.map((quest) => quest.type), ["foto"]);
  assert.equal(childPlan[0].title, "Cari Karang yang Bulat Seperti Kepala!");
  assert.notEqual(childPlan[0].pertanyaan, questsForPoi(poiId, "dewasa")[0].pertanyaan);
  // POI tanpa quest foto (mis. POI-04 benar/salah) tidak punya quest untuk anak.
  assert.equal(questsForPoi("30000000-0000-4000-8000-000000000004", "anak").every((quest) => quest.isDisabled), true);
});

test("progres server mengembalikan centang quest dan poin setelah aplikasi dibuka ulang", () => {
  const restored = restoreServerVisit({
    session: { id_sesi: "50000000-0000-4000-8000-000000000001", bahasa: "id", profil: "dewasa", status: "aktif", verification_method: "entrance_qr" },
    totalPoints: 10, badges: [],
    cards: [{ id_poi: poiId, status_kartu: "ditutup", waktu_ditutup: null }],
    poiProgress: [{ id_poi: poiId, kartu_ditutup: true, kuis_selesai: false, kuis_gagal: false, jumlah_percobaan: 1, poin_kuis: 10 }],
    quests: [{ id_quest: pg.idQuest, id_poi: poiId, type: "pilgan", answer_correct: true, jumlah_percobaan: 1, hint_dipakai: false, failed: false, pointsAwarded: 10 }],
  });
  const merged = mergeServerProgress({}, restored.progress, "dewasa")[poiId];
  assert.equal(merged.quests[pg.idQuest].completed, true);
  assert.equal(merged.pointsAwarded, 10);
  assert.equal(merged.completed, false);
});

test("hasil foto APK bertahan saat progres API dipulihkan dan tidak dihitung ganda", () => {
  const photo = plan.find((quest) => quest.type === "foto");
  const photoAnswer = {
    ...response, idQuest: photo.idQuest, pointsAwarded: photo.points,
    photoDecision: "accepted", evaluationSource: "device",
  };
  const local = recordQuestAnswer({ ...emptyProgress, closed: true }, photoAnswer, plan);
  const server = recordQuestAnswer({ ...emptyProgress, closed: true }, response, plan);
  const merged = mergeServerProgress({ [poiId]: local }, { [poiId]: server }, "dewasa");
  assert.equal(merged[poiId].completed, true);
  assert.equal(merged[poiId].pointsAwarded, response.pointsAwarded + photo.points);
  assert.equal(devicePhotoPoints(merged), photo.points);
  assert.deepEqual(mergeServerProgress(merged, { [poiId]: server }, "dewasa"), merged);
  const official = recordQuestAnswer(server, { ...photoAnswer, evaluationSource: undefined }, plan);
  const reconciled = mergeServerProgress(merged, { [poiId]: official }, "dewasa");
  assert.equal(devicePhotoPoints(reconciled), 0);
  assert.equal(reconciled[poiId].pointsAwarded, official.pointsAwarded);
  assert.equal(local.quests[pg.idQuest], undefined);
});

test("foto anak tetap tuntas setelah pemulihan API tanpa menunggu PG dewasa", () => {
  const childPlan = questsForPoi(poiId, "anak").filter((quest) => !quest.isDisabled);
  const photo = childPlan[0];
  const answer = { ...response, idQuest: photo.idQuest, pointsAwarded: photo.points, evaluationSource: "device" };
  const local = recordQuestAnswer({ ...emptyProgress, closed: true }, answer, childPlan);
  const merged = mergeServerProgress({ [poiId]: local }, { [poiId]: { ...emptyProgress, closed: true } }, "anak");
  assert.equal(merged[poiId].completed, true);
  assert.equal(devicePhotoPoints(merged), photo.points);
  const overlay = withDevicePhotoQuests({ id_poi: poiId, quests: plan }, "anak");
  assert.deepEqual(overlay.quests.filter((quest) => !quest.isDisabled).map((quest) => quest.type), ["foto"]);
});
