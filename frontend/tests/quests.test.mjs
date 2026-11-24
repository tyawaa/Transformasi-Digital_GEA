import assert from "node:assert/strict";
import { test } from "node:test";
import { questsForPoi } from "../src/data/quests.ts";
import { earnedBadges } from "../src/domain/points.ts";
import { emptyProgress, mergeServerProgress, recordQuestAnswer, restoreServerVisit } from "../src/features/stories/progress.ts";

const poiId = "30000000-0000-4000-8000-000000000002";
const plan = questsForPoi(poiId, "dewasa");
const pg = plan.find((quest) => quest.type === "pilgan");
const response = {
  idPoi: poiId, idQuest: pg.idQuest, completed: true, answerCorrect: true,
  failed: false, attemptCount: 1, pointsAwarded: 10, hint: null,
};

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
  const merged = mergeServerProgress({}, restored.progress)[poiId];
  assert.equal(merged.quests[pg.idQuest].completed, true);
  assert.equal(merged.pointsAwarded, 10);
  assert.equal(merged.completed, false);
});
