import assert from "node:assert/strict";
import { test } from "node:test";
import { localizedQuestsForPoi, normalizeLocalQuestAnswer, questCatalog, questsForPoi } from "../src/data/quests.ts";
import { availableBadges, badgeProgress, earnedBadges } from "../src/domain/points.ts";
import { questKind, questPlan } from "../src/features/stories/questPlan.ts";
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
        assert.notEqual(quest.hint, original.find((item) => item.idQuest === quest.idQuest).hint);
        assert.notEqual(quest.penjelasan, original.find((item) => item.idQuest === quest.idQuest).penjelasan);
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
  assert.equal(childPlan[0].points, 15);
  assert.equal(childPlan[0].maxAttempts, 4);
  assert.equal(childPlan[0].requiredForBadge, false);
  // POI tanpa quest foto (mis. POI-04 benar/salah) tidak punya quest untuk anak.
  assert.equal(questsForPoi("30000000-0000-4000-8000-000000000004", "anak").every((quest) => quest.isDisabled), true);
});

test("Fotografer Cilik hanya memerlukan empat POI acuan, termasuk POI-10", () => {
  const refs = [...new Set(questCatalog.map((quest) => quest.idPoi))].map((id) => ({
    id, code: `P${id.slice(-2)}`, wing: "left", quest: questKind(id, "anak"), quests: questPlan(id, "anak"),
  }));
  const required = refs.filter((poi) => poi.quests.some((quest) => quest.requiredForBadge));
  assert.deepEqual(required.map((poi) => poi.code), ["P01", "P03", "P07", "P10"]);
  const states = Object.fromEntries(required.map((poi) => [poi.id,
    recordQuestAnswer({ ...emptyProgress, closed: true }, {
      ...response, idPoi: poi.id, idQuest: poi.quests[0].idQuest, pointsAwarded: poi.quests[0].points,
    }, poi.quests),
  ]));
  assert.deepEqual(badgeProgress(refs, states, { kid: true })["BD-14"], { current: 4, target: 4 });
  assert.ok(earnedBadges(refs, states, { kid: true }).includes("BD-14"));
  const withoutRijang = Object.fromEntries(Object.entries(states).filter(([id]) => !id.endsWith("000000000010")));
  assert.ok(!earnedBadges(refs, withoutRijang, { kid: true }).includes("BD-14"));
  assert.ok(!earnedBadges(refs.filter((poi) => poi.code !== "P10"), states, { kid: true }).includes("BD-14"));
});

test("semua badge yang ditampilkan kepada anak dapat diraih dengan quest anak dan cerita", () => {
  const refs = [...new Set(questCatalog.map((quest) => quest.idPoi))].map((id) => ({
    id, code: `P${id.slice(-2)}`, wing: "left", quest: questKind(id, "anak"), quests: questPlan(id, "anak"),
  }));
  const states = Object.fromEntries(refs.map((poi) => [poi.id,
    poi.quests.reduce((state, quest) => recordQuestAnswer(state, {
      ...response, idPoi: poi.id, idQuest: quest.idQuest, pointsAwarded: quest.points,
    }, poi.quests), { ...emptyProgress, checkedIn: true, closed: true, completed: poi.quests.length === 0 }),
  ]));
  const ctx = { kid: true, questDays: 3 };
  assert.deepEqual(earnedBadges(refs, states, ctx), availableBadges(ctx).map((badge) => badge.id));
  for (const id of ["BD-02", "BD-03", "BD-07", "BD-12", "BD-13"]) {
    assert.ok(!availableBadges(ctx).some((badge) => badge.id === id));
  }
  assert.equal(badgeProgress(refs, {}, ctx)["BD-15"].current, 0);
  const stories = Object.fromEntries(refs.filter((poi) => poi.quests.length === 0).map((poi) => [poi.id, states[poi.id]]));
  assert.equal(badgeProgress(refs, stories, ctx)["BD-15"].current, 0);
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
