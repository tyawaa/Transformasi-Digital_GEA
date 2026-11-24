import { equal, ok, rejects } from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { prepareQuests } from "../scripts/prepare-quests.ts";

type QuestAnswer = {
  readonly answerCorrect: boolean;
  readonly attemptCount: number;
  readonly completed: boolean;
  readonly pointsAwarded: number;
};

type SessionProgress = {
  readonly totalPoints: number;
  readonly poiProgress: readonly unknown[];
  readonly badges: readonly unknown[];
};

Deno.test("Quest Types: pilgan, foto, isian_singkat, benar_salah, dan profil anak", async (test): Promise<void> => {
  const database = new PGlite();
  try {
    // Siapkan mock role Supabase untuk lingkungan pengujian PGlite
    await database.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create schema storage;
      create table storage.buckets(id text primary key, name text, public boolean,
        file_size_limit bigint, allowed_mime_types text[]);
      grant usage on schema public to service_role;
    `);

    // Jalankan semua migrasi secara berurutan
    const migrations: string[] = [];
    for await (const entry of Deno.readDir(new URL("../supabase/migrations/", import.meta.url))) {
      if (entry.name.endsWith(".sql")) migrations.push(entry.name);
    }
    for (const migration of migrations.sort()) {
      await database.exec(
        await Deno.readTextFile(new URL(`../supabase/migrations/${migration}`, import.meta.url)),
      );
    }

    // Bersihkan zona/poi sebelum memuat fixture
    await database.exec("delete from public.poi; delete from public.zona;");

    // Load fixture stories untuk session & poi
    await database.exec(
      await Deno.readTextFile(new URL("./fixtures/stories.sql", import.meta.url)),
    );

    const userIdAdult = "10000000-0000-4000-8000-000000000001";
    const userIdChild = "10000000-0000-4000-8000-000000000002";
    const visitIdAdult = "50000000-0000-4000-8000-000000000001";
    const visitIdChild = "50000000-0000-4000-8000-000000000002";
    const zoneId = "20000000-0000-4000-8000-000000000001";

    const poiPilganId = "30000000-0000-4000-8000-000000000001"; // POI 1 (pilgan)
    const questPilganId = "40000000-0000-4000-8000-000000000001";

    const poiFotoId = "30000000-0000-4000-8000-000000000002"; // POI 2 (ubah ke foto)
    const questFotoId = "40000000-0000-4000-8000-000000000002";

    const poiIsianId = "30000000-0000-4000-8000-000000000003"; // POI 3 (ubah ke isian)
    const questIsianId = "40000000-0000-4000-8000-000000000003";

    // Siapkan akun & sesi dewasa dan anak
    await database.query("insert into auth.users(id) values ($1), ($2) on conflict do nothing", [
      userIdAdult,
      userIdChild,
    ]);
    await database.query(
      `insert into public.sesi_kunjungan(id_sesi, user_id, id_zona, bahasa, profil, verification_method)
       values ($1, $2, $3, 'id', 'dewasa', 'entrance_qr'),
              ($4, $5, $3, 'id', 'anak', 'entrance_qr')`,
      [visitIdAdult, userIdAdult, zoneId, visitIdChild, userIdChild],
    );

    // Setup Quest 2 menjadi tipe 'foto'
    await database.query("update public.quest set tipe_quest = 'foto' where id_quest = $1", [
      questFotoId,
    ]);
    await database.query(
      "update public.quest_teks set target_foto = 'Foto cangkang kura-kura raksasa' where id_quest = $1",
      [questFotoId],
    );

    // Setup Quest 3 menjadi tipe 'isian_singkat'
    await database.query(
      "update public.quest set tipe_quest = 'isian_singkat' where id_quest = $1",
      [questIsianId],
    );
    await database.query(
      `update public.quest_teks set 
         kunci_isian = 'tektonik', 
         variasi_jawaban = ARRAY['tektonik', 'lempeng tektonik', 'Tektonik']
       where id_quest = $1`,
      [questIsianId],
    );

    // Berikan verifikasi checkpoint untuk semua POI ke kedua sesi
    const until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    for (const p of [poiPilganId, poiFotoId, poiIsianId]) {
      await database.query(
        "insert into private.poi_verification(id_sesi, id_poi, expires_at) values ($1, $2, $3), ($4, $2, $3)",
        [visitIdAdult, p, until, visitIdChild],
      );
    }

    await test.step("validasi check constraint tipe_quest", async (): Promise<void> => {
      // Tipe valid diterima
      for (const valid of ["pilgan", "foto", "isian_singkat", "benar_salah", "cocokkan"]) {
        await database.query("update public.quest set tipe_quest = $1 where id_quest = $2", [
          valid,
          questPilganId,
        ]);
      }
      await database.query("update public.quest set tipe_quest = 'pilgan' where id_quest = $1", [
        questPilganId,
      ]);

      // Tipe invalid ditolak
      await rejects(
        database.query("update public.quest set tipe_quest = 'tebak_gambar' where id_quest = $1", [
          questPilganId,
        ]),
        /check constraint/,
      );
    });

    await test.step("isian singkat: validasi variasi jawaban dan penilaian case-insensitive", async (): Promise<void> => {
      // Jawaban salah
      const resWrong = await database.query<{ result: QuestAnswer }>(
        "select public.jawab_quest($1, $2, $3, null, $4, 'magma', false) as result",
        [userIdAdult, visitIdAdult, questIsianId, crypto.randomUUID()],
      );
      const wrong = resWrong.rows[0]!.result;
      equal(wrong.answerCorrect, false);
      equal(wrong.attemptCount, 1);
      equal(wrong.pointsAwarded, 0);

      // Jawaban benar (varian case-insensitive)
      const resCorrect = await database.query<{ result: QuestAnswer }>(
        "select public.jawab_quest($1, $2, $3, null, $4, 'LEMPENG TEKTONIK', false) as result",
        [userIdAdult, visitIdAdult, questIsianId, crypto.randomUUID()],
      );
      const correct = resCorrect.rows[0]!.result;
      equal(correct.answerCorrect, true);
      equal(correct.completed, true);
      equal(correct.attemptCount, 2);
      equal(correct.pointsAwarded, 10); // Percobaan ke-2 = 10 poin
    });

    await test.step("foto ditunda: penanda photoTaken tidak menyelesaikan quest atau memberikan poin", async (): Promise<void> => {
      await rejects(
        database.query(
          "select public.jawab_quest($1, $2, $3, null, $4, null, true) as result",
          [userIdAdult, visitIdAdult, questFotoId, crypto.randomUUID()],
        ),
        /PHOTO_QUEST_NOT_AVAILABLE/,
      );
      equal(
        (await database.query("select * from public.mengerjakan where id_quest=$1", [questFotoId]))
          .rows.length,
        0,
      );
    });

    await test.step("foto yang ditunda juga tidak dapat diselesaikan profil anak", async (): Promise<void> => {
      await rejects(
        database.query(
          "select public.jawab_quest($1, $2, $3, null, $4, null, true) as result",
          [userIdChild, visitIdChild, questFotoId, crypto.randomUUID()],
        ),
        /PHOTO_QUEST_NOT_AVAILABLE/,
      );
    });

    await test.step("progres_kunjungan menyertakan totalPoints, badges, dan poiProgress", async (): Promise<void> => {
      const resProg = await database.query<{ result: SessionProgress }>(
        "select public.progres_kunjungan($1, $2) as result",
        [userIdAdult, visitIdAdult],
      );
      const prog = resProg.rows[0]!.result;
      equal(prog.totalPoints, 10, "Hanya poin isian yang masuk; foto belum mendapat poin");
      ok(Array.isArray(prog.poiProgress), "poiProgress harus berupa array");
      ok(Array.isArray(prog.badges), "badges harus berupa array");
    });

    await test.step("sheet terbaru: beberapa quest per POI, PG, isian, batas percobaan dan progres tersimpan", async (): Promise<void> => {
      await database.exec(prepareQuests());
      await database.exec(prepareQuests());
      equal(
        (await database.query("select * from public.quest where id_poi=$1", [poiFotoId])).rows
          .length,
        2,
      );
      const session: string = "50000000-0000-4000-8000-000000000003";
      await database.query(
        "insert into public.sesi_kunjungan(id_sesi,user_id,id_zona,bahasa,profil,verification_method) values($1,$2,$3,'id','dewasa','entrance_qr')",
        [session, userIdAdult, zoneId],
      );
      await database.query(
        "insert into private.poi_verification(id_sesi,id_poi,expires_at) select $1,id_poi,now()+interval '15 minutes' from public.poi",
        [session],
      );
      const pg: string = "40000000-0000-4000-8000-000000000002";
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'B',$4)", [
          userIdAdult,
          session,
          pg,
          crypto.randomUUID(),
        ]),
        /STORY_COMPLETION_REQUIRED/,
      );
      await database.query(
        "insert into public.menampilkan_kartu(id_sesi,id_poi,status_kartu) select $1,id_poi,'ditutup' from public.poi",
        [session],
      );
      const request: string = crypto.randomUUID();
      type SheetAnswer = QuestAnswer & {
        readonly poiCompleted: boolean;
        readonly poiPoints: number;
      };
      const correct = await database.query<{ result: SheetAnswer }>(
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [userIdAdult, session, pg, request],
      );
      equal(correct.rows[0]!.result.pointsAwarded, 10);
      equal(
        correct.rows[0]!.result.poiCompleted,
        false,
        "PG selesai, quest foto POI-02 tetap belum selesai",
      );
      const retry = await database.query<{ result: SheetAnswer }>(
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [userIdAdult, session, pg, request],
      );
      equal(retry.rows[0]!.result.attemptCount, 1);
      const isian: string = "40000000-0000-4000-8000-000000000005";
      const wrongRequest: string = crypto.randomUUID();
      const wrong = await database.query<{ result: SheetAnswer }>(
        "select public.jawab_quest($1,$2,$3,null,$4,'magma',false) as result",
        [userIdAdult, session, isian, wrongRequest],
      );
      equal(wrong.rows[0]!.result.completed, false);
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,null,$4,'tektonik',false)", [
          userIdAdult,
          session,
          isian,
          wrongRequest,
        ]),
        /IDEMPOTENCY_CONFLICT/,
      );
      const accepted = await database.query<{ result: SheetAnswer }>(
        "select public.jawab_quest($1,$2,$3,null,$4,'  LEMPENG TEKTONIK  ',false) as result",
        [userIdAdult, session, isian, crypto.randomUUID()],
      );
      equal(accepted.rows[0]!.result.pointsAwarded, 10, "Poin sheet tetap 10 pada percobaan kedua");
      equal(accepted.rows[0]!.result.poiCompleted, true);
      const tf: string = "40000000-0000-4000-8000-000000000004";
      for (let attempt: number = 1; attempt <= 2; attempt += 1) {
        const result = await database.query<{ result: SheetAnswer & { readonly failed: boolean } }>(
          "select public.jawab_quest($1,$2,$3,'A',$4) as result",
          [userIdAdult, session, tf, crypto.randomUUID()],
        );
        equal(result.rows[0]!.result.failed, attempt === 2);
      }
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'B',$4)", [
          userIdAdult,
          session,
          tf,
          crypto.randomUUID(),
        ]),
        /QUEST_ATTEMPTS_EXCEEDED/,
      );
      const matching: string = "40000000-0000-4000-8000-000000000006";
      const matched = await database.query<{ result: SheetAnswer }>(
        "select public.jawab_quest($1,$2,$3,'A',$4) as result",
        [userIdAdult, session, matching, crypto.randomUUID()],
      );
      equal(matched.rows[0]!.result.pointsAwarded, 30);
      const restored = await database.query<
        {
          result: {
            readonly quests: readonly {
              readonly id_quest: string;
              readonly pointsAwarded: number;
            }[];
            readonly totalPoints: number;
          };
        }
      >("select public.progres_kunjungan($1,$2) as result", [userIdAdult, session]);
      equal(restored.rows[0]!.result.quests.length, 4);
      equal(
        restored.rows[0]!.result.quests.find((quest): boolean => quest.id_quest === matching)
          ?.pointsAwarded,
        30,
      );
      equal(
        (await database.query<{ count: number }>(
          "select count(*)::int as count from private.quest_scores where id_sesi=$1",
          [session],
        )).rows[0]!.count,
        3,
      );
      await database.query(
        "insert into public.menampilkan_kartu(id_sesi,id_poi,status_kartu) values($1,$2,'sedang_tampil')",
        [visitIdChild, poiPilganId],
      );
      await database.query("select public.tutup_kartu($1,$2,$3)", [
        userIdChild,
        visitIdChild,
        poiPilganId,
      ]);
      const childStory = await database.query<{ kartu_ditutup: boolean; kuis_selesai: boolean }>(
        "select kartu_ditutup,kuis_selesai from public.poi_progress where id_sesi=$1 and id_poi=$2",
        [visitIdChild, poiPilganId],
      );
      equal(childStory.rows[0]!.kartu_ditutup, true);
      equal(
        childStory.rows[0]!.kuis_selesai,
        true,
        "POI anak tanpa quest aktif tuntas setelah cerita",
      );
    });
  } finally {
    await database.close();
  }
});
