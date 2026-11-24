import { deepStrictEqual, equal, ok, rejects } from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

Deno.test("A8: audit skema Supabase dan tabel Sprint 2", async (test): Promise<void> => {
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

    const userId = "10000000-0000-4000-8000-000000000001";
    const visitId = "50000000-0000-4000-8000-000000000001";
    const zoneId = "20000000-0000-4000-8000-000000000001";
    const poiId = "30000000-0000-4000-8000-000000000001";

    // Siapkan user dan sesi kunjungan aktif untuk pengujian
    await database.query("insert into auth.users(id) values ($1) on conflict do nothing", [userId]);
    await database.query(
      `insert into public.sesi_kunjungan(id_sesi, user_id, id_zona, bahasa, profil, verification_method)
       values ($1, $2, $3, 'id', 'dewasa', 'entrance_qr')`,
      [visitId, userId, zoneId],
    );

    await test.step("semua tabel dan view A8 terdaftar", async (): Promise<void> => {
      const tablesResult = await database.query<{ table_name: string }>(
        `select table_name from information_schema.tables 
         where table_schema = 'public' and table_type in ('BASE TABLE', 'VIEW')`
      );
      const tableNames = new Set(tablesResult.rows.map((r) => r.table_name));

      ok(tableNames.has("points"), "tabel points harus ada");
      ok(tableNames.has("badge"), "tabel badge harus ada");
      ok(tableNames.has("user_badge"), "tabel user_badge harus ada");
      ok(tableNames.has("poi_progress"), "tabel poi_progress harus ada");
      ok(tableNames.has("session"), "view session harus ada");
      ok(tableNames.has("quest_attempt"), "view quest_attempt harus ada");
      ok(tableNames.has("checkpoint"), "view checkpoint harus ada");
    });

    await test.step("master badge mengikuti sheet Badge_Poin Sprint 3", async (): Promise<void> => {
      const badges = await database.query<{ kode_badge: string; bonus_poin: number; is_active: boolean }>(
        "select kode_badge, bonus_poin, is_active from public.badge order by kode_badge"
      );
      equal(badges.rows.length, 15); // BD-01 s.d. BD-15

      const activeCodes = badges.rows.filter((b) => b.is_active).map((b) => b.kode_badge);
      // Sheet acuan rekaman (24 Nov 2026): semua lencana BD-01 s.d. BD-15 aktif.
      deepStrictEqual(activeCodes, badges.rows.map((b) => b.kode_badge));
    });

    await test.step("unique key anti-poin ganda (session, POI, komponen) bekerja", async (): Promise<void> => {
      // Insert pertama poin kuis berhasil
      await database.query(
        "insert into public.points(id_sesi, id_poi, komponen, nilai_poin) values ($1, $2, 'kuis', 20)",
        [visitId, poiId],
      );

      // Insert kedua dengan sesi, poi, dan komponen yang sama harus DITOLAK
      await rejects(
        database.query(
          "insert into public.points(id_sesi, id_poi, komponen, nilai_poin) values ($1, $2, 'kuis', 10)",
          [visitId, poiId],
        ),
        /unique constraint|duplicate key/,
        "Poin ganda pada sesi dan POI yang sama harus ditolak oleh unique constraint",
      );

      // Insert poin untuk komponen berbeda atau POI berbeda tetap diizinkan
      const poiId2 = "30000000-0000-4000-8000-000000000002";
      await database.query(
        "insert into public.points(id_sesi, id_poi, komponen, nilai_poin) values ($1, $2, 'kuis', 10)",
        [visitId, poiId2],
      );

      // Insert poin badge dengan kode_badge
      await database.query(
        "insert into public.points(id_sesi, kode_badge, komponen, nilai_poin) values ($1, 'BD-01', 'badge', 50)",
        [visitId],
      );

      // Insert badge yang sama untuk sesi yang sama harus ditolak
      await rejects(
        database.query(
          "insert into public.points(id_sesi, kode_badge, komponen, nilai_poin) values ($1, 'BD-01', 'badge', 50)",
          [visitId],
        ),
        /unique constraint|duplicate key/,
      );
    });

    await test.step("user_badge mencegah pemberian lencana ganda ke sesi yang sama", async (): Promise<void> => {
      await database.query(
        "insert into public.user_badge(id_sesi, kode_badge) values ($1, 'BD-01')",
        [visitId],
      );

      await rejects(
        database.query(
          "insert into public.user_badge(id_sesi, kode_badge) values ($1, 'BD-01')",
          [visitId],
        ),
        /unique constraint|duplicate key/,
      );
    });

    await test.step("poi_progress memvalidasi status belum / sebagian / selesai", async (): Promise<void> => {
      // Status 'belum'
      await database.query(
        "insert into public.poi_progress(id_sesi, id_poi, status) values ($1, $2, 'belum')",
        [visitId, poiId],
      );

      // Update status ke 'sebagian'
      await database.query(
        "update public.poi_progress set status = 'sebagian', kartu_ditutup = true where id_sesi = $1 and id_poi = $2",
        [visitId, poiId],
      );

      // Update status ke 'selesai'
      await database.query(
        "update public.poi_progress set status = 'selesai', kuis_selesai = true, poin_kuis = 20 where id_sesi = $1 and id_poi = $2",
        [visitId, poiId],
      );

      // Status invalid harus ditolak check constraint
      await rejects(
        database.query(
          "update public.poi_progress set status = 'selesai_semua' where id_sesi = $1 and id_poi = $2",
          [visitId, poiId],
        ),
        /check constraint/,
      );
    });

    await test.step("RLS aktif pada semua tabel baru", async (): Promise<void> => {
      await database.exec("set role authenticated");
      await rejects(database.query("select * from public.points"), /permission denied/);
      await rejects(database.query("select * from public.badge"), /permission denied/);
      await rejects(database.query("select * from public.user_badge"), /permission denied/);
      await rejects(database.query("select * from public.poi_progress"), /permission denied/);
      await database.exec("reset role; set role service_role");
    });
  } finally {
    await database.close();
  }
});
