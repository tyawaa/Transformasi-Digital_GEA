import { equal, ok, rejects } from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";

type VisitRow = {
  readonly status: string;
  readonly planned_end_at: string;
  readonly closing_at: string;
  readonly end_time: string | null;
  readonly ended_reason: string | null;
};

Deno.test("siklus kunjungan: tambah waktu idempoten, jam tutup, pemilik dan ringkasan tersimpan", async (test): Promise<void> => {
  const database: PGlite = new PGlite();
  const owner: string = "10000000-0000-4000-8000-000000000001";
  const other: string = "10000000-0000-4000-8000-000000000002";
  const session: string = "50000000-0000-4000-8000-000000000001";
  const request: string = "60000000-0000-4000-8000-000000000001";
  try {
    await database.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,
        file_size_limit bigint,allowed_mime_types text[]);
      grant usage on schema public to service_role;`);
    const migrations: string[] = [];
    for await (const entry of Deno.readDir(new URL("../supabase/migrations/", import.meta.url))) {
      if (entry.name.endsWith(".sql")) migrations.push(entry.name);
    }
    for (const name of migrations.sort()) {
      await database.exec(await Deno.readTextFile(new URL(`../supabase/migrations/${name}`, import.meta.url)));
    }
    await database.exec("delete from public.poi; delete from public.zona;");
    await database.exec(await Deno.readTextFile(new URL("fixtures/stories.sql", import.meta.url)));
    await database.query("insert into auth.users values($1),($2) on conflict do nothing", [owner, other]);
    await database.query(`insert into public.sesi_kunjungan(id_sesi,user_id,id_zona,bahasa,profil,verification_method,start_time,planned_end_at)
      values($1,$2,'20000000-0000-4000-8000-000000000001','id','dewasa','entrance_qr',
        ((now() at time zone 'Asia/Jakarta')::date+2+time '10:00') at time zone 'Asia/Jakarta',
        ((now() at time zone 'Asia/Jakarta')::date+2+time '10:30') at time zone 'Asia/Jakarta')`, [session, owner]);
    const read = async (): Promise<VisitRow> => {
      const result = await database.query<VisitRow>("select * from public.sesi_kunjungan where id_sesi=$1", [session]);
      const visit: VisitRow | undefined = result.rows[0];
      if (visit === undefined) throw new Error("Sesi pengujian tidak ditemukan.");
      return visit;
    };
    await test.step("tambahan hanya sekali walau permintaan dikirim ulang", async (): Promise<void> => {
      const before: VisitRow = await read();
      const extend = (): Promise<unknown> => database.query("select public.tambah_waktu_kunjungan($1,$2,$3,10)", [owner, session, request]);
      await extend();
      equal(Date.parse((await read()).planned_end_at) - Date.parse(before.planned_end_at), 600_000);
      await extend();
      equal(Date.parse((await read()).planned_end_at) - Date.parse(before.planned_end_at), 600_000);
      await rejects(database.query("select public.tambah_waktu_kunjungan($1,$2,$3,20)", [owner, session, request]), /VISIT_EXTENSION_CONFLICT/);
      await rejects(database.query("select public.tambah_waktu_kunjungan($1,$2,$3,10)", [other, session, request]), /SESSION_NOT_FOUND/);
      await rejects(database.query("select public.tambah_waktu_kunjungan($1,$2,$3,11)", [owner, session, request]), /VISIT_EXTENSION_INVALID/);
    });
    await test.step("jadwal khusus backend membatasi tambahan dan menyisakan lima menit keluar", async (): Promise<void> => {
      await database.exec(`insert into private.museum_calendar values((now() at time zone 'Asia/Jakarta')::date+2,time '12:00')`);
      await database.query("select public.status_kunjungan($1,$2)", [owner, session]);
      const updated: VisitRow = await read();
      equal(new Date(updated.closing_at).getUTCHours(), 5);
      await database.query("update public.sesi_kunjungan set planned_end_at=closing_at-interval '10 minutes' where id_sesi=$1", [session]);
      await rejects(database.query("select public.tambah_waktu_kunjungan($1,$2,$3,10)", [owner, session, "60000000-0000-4000-8000-000000000002"]), /VISIT_EXTENSION_TOO_LATE/);
    });
    await test.step("durasi pribadi habis tidak mengakhiri sesi", async (): Promise<void> => {
      await database.query("update public.sesi_kunjungan set planned_end_at=now()-interval '1 minute' where id_sesi=$1", [session]);
      await database.query("select public.status_kunjungan($1,$2)", [owner, session]);
      equal((await read()).status, "aktif");
      await database.query("select public.tambah_waktu_kunjungan($1,$2,$3,10)", [owner, session, "60000000-0000-4000-8000-000000000003"]);
      ok(Date.parse((await read()).planned_end_at) > Date.now());
    });
    await test.step("jam tutup memblokir aktivitas dan menutup sesi tanpa menghapus ringkasan", async (): Promise<void> => {
      await database.query(`insert into public.menampilkan_kartu(id_sesi,id_poi,status_kartu) values($1,'30000000-0000-4000-8000-000000000001','ditutup')`, [session]);
      await database.exec(`insert into private.museum_calendar values((now() at time zone 'Asia/Jakarta')::date,time '00:00')`);
      await database.query("update public.sesi_kunjungan set start_time=now()-interval '1 minute' where id_sesi=$1", [session]);
      await rejects(database.query("select private.require_session($1,$2)", [owner, session]), /MUSEUM_CLOSED/);
      await database.query("select public.status_kunjungan($1,$2)", [owner, session]);
      equal((await read()).status, "selesai");
      equal((await read()).ended_reason, "closing");
      const progress = await database.query<{ result: { cards: readonly unknown[] } }>("select public.progres_kunjungan($1,$2) as result", [owner, session]);
      equal(progress.rows[0]?.result.cards.length, 1);
      await rejects(database.query("select public.selesaikan_kunjungan($1,$2)", [other, session]), /SESSION_NOT_FOUND/);
      await database.query("select public.selesaikan_kunjungan($1,$2)", [owner, session]);
      equal((await read()).ended_reason, "closing");
    });
    await test.step("pengunjung tidak mendapat akses tulis jadwal atau RPC internal", async (): Promise<void> => {
      await database.exec("set role authenticated");
      await rejects(database.exec("select * from private.museum_hours"), /permission denied/);
      await rejects(database.query("select public.tambah_waktu_kunjungan($1,$2,$3,10)", [owner, session, request]), /permission denied/);
      await database.exec("reset role");
    });
  } finally { await database.close(); }
});
