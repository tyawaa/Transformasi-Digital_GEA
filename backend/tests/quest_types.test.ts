import { equal, ok, rejects } from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

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
    await database.query("insert into auth.users(id) values ($1), ($2) on conflict do nothing", [userIdAdult, userIdChild]);
    await database.query(
      `insert into public.sesi_kunjungan(id_sesi, user_id, id_zona, bahasa, profil, verification_method)
       values ($1, $2, $3, 'id', 'dewasa', 'entrance_qr'),
              ($4, $5, $3, 'id', 'anak', 'entrance_qr')`,
      [visitIdAdult, userIdAdult, zoneId, visitIdChild, userIdChild],
    );

    // Setup Quest 2 menjadi tipe 'foto'
    await database.query("update public.quest set tipe_quest = 'foto' where id_quest = $1", [questFotoId]);
    await database.query(
      "update public.quest_teks set target_foto = 'Foto cangkang kura-kura raksasa' where id_quest = $1",
      [questFotoId],
    );

    // Setup Quest 3 menjadi tipe 'isian_singkat'
    await database.query("update public.quest set tipe_quest = 'isian_singkat' where id_quest = $1", [questIsianId]);
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
        await database.query("update public.quest set tipe_quest = $1 where id_quest = $2", [valid, questPilganId]);
      }
      await database.query("update public.quest set tipe_quest = 'pilgan' where id_quest = $1", [questPilganId]);

      // Tipe invalid ditolak
      await rejects(
        database.query("update public.quest set tipe_quest = 'tebak_gambar' where id_quest = $1", [questPilganId]),
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

    await test.step("foto: menyelesaikan quest dan mendapatkan poin", async (): Promise<void> => {
      const resFoto = await database.query<{ result: QuestAnswer }>(
        "select public.jawab_quest($1, $2, $3, null, $4, null, true) as result",
        [userIdAdult, visitIdAdult, questFotoId, crypto.randomUUID()],
      );
      const foto = resFoto.rows[0]!.result;
      equal(foto.answerCorrect, true);
      equal(foto.completed, true);
      equal(foto.pointsAwarded, 10);
    });

    await test.step("aturan profil anak: quest foto aktif dan dapat diselesaikan", async (): Promise<void> => {
      // Anak mengerjakan quest FOTO -> BERHASIL
      const resChildFoto = await database.query<{ result: QuestAnswer }>(
        "select public.jawab_quest($1, $2, $3, null, $4, null, true) as result",
        [userIdChild, visitIdChild, questFotoId, crypto.randomUUID()],
      );
      const childFoto = resChildFoto.rows[0]!.result;
      equal(childFoto.answerCorrect, true);
      equal(childFoto.completed, true);
      equal(childFoto.pointsAwarded, 10);
    });

    await test.step("progres_kunjungan menyertakan totalPoints, badges, dan poiProgress", async (): Promise<void> => {
      const resProg = await database.query<{ result: SessionProgress }>(
        "select public.progres_kunjungan($1, $2) as result",
        [userIdAdult, visitIdAdult],
      );
      const prog = resProg.rows[0]!.result;
      ok(prog.totalPoints >= 20, "Total poin harus terakumulasi");
      ok(Array.isArray(prog.poiProgress), "poiProgress harus berupa array");
      ok(Array.isArray(prog.badges), "badges harus berupa array");
    });
  } finally {
    await database.close();
  }
});
