import { deepStrictEqual, equal, ok, rejects, throws } from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { prepareInitialSeed } from "../scripts/prepare-seed.ts";
import { approvedStories, type ApprovedStory } from "../scripts/approved-stories.ts";
import { prepareStoryUpdates } from "../scripts/prepare-story-updates.ts";
import { prepareStoryDrafts } from "../scripts/prepare-story-drafts.ts";
import { prepareCheckpointSeed } from "../scripts/prepare-checkpoint-seed.ts";
import catalog from "../data/checkpoints.json" with { type: "json" };
import { parseCheckpointDataset } from "../scripts/checkpoint-dataset.ts";
import { handleRequest } from "../supabase/functions/gea-api/app.ts";
import {
  type BackendConfig,
  museumAreaFromEnvironment,
} from "../supabase/functions/gea-api/config.ts";
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import {
  evaluateGeofence,
  haversineMeters,
  type Location,
  type MuseumArea,
  parseLocation,
} from "../supabase/functions/gea-api/geofence.ts";
import { type JsonObject, object } from "../supabase/functions/gea-api/validation.ts";

const AREA: MuseumArea = {
  latitude: 0,
  longitude: 0,
  radiusMeters: 100,
  zoneId: "20000000-0000-4000-8000-000000000001",
};
const CENTER: Location = { latitude: 0, longitude: 0, accuracyMeters: 20 };

Deno.test("geofence simulasi: pusat, batas inklusif, luar, dan kualitas GPS", (): void => {
  equal(haversineMeters(AREA, AREA), 0);
  equal(evaluateGeofence(CENTER, AREA).status, "inside");
  const boundary: Location = { latitude: 0, longitude: 0.001, accuracyMeters: 0 };
  const radius: number = haversineMeters(AREA, boundary);
  equal(evaluateGeofence(boundary, { ...AREA, radiusMeters: radius }).accessAllowed, true);
  equal(evaluateGeofence(boundary, { ...AREA, radiusMeters: radius - 0.01 }).status, "outside");
  const poor: Location = { ...boundary, accuracyMeters: 20.001 };
  equal(evaluateGeofence(poor, AREA).status, "low_accuracy");
  equal(evaluateGeofence(poor, AREA).fallback, "entrance_qr");
  equal(evaluateGeofence(poor, AREA).accessAllowed, false);
  equal(evaluateGeofence(null, AREA).status, "location_unavailable");
  equal(evaluateGeofence(CENTER, null).status, "not_configured");
  equal(evaluateGeofence(CENTER, null).accessAllowed, false);
});

Deno.test("input GPS tidak valid berbeda dari lokasi tidak tersedia", (): void => {
  for (
    const value of [
      undefined,
      {},
      { ...CENTER, latitude: 91 },
      { ...CENTER, longitude: -181 },
      { ...CENTER, accuracyMeters: -1 },
      { ...CENTER, accuracyMeters: NaN },
      { ...CENTER, latitude: Infinity },
      { ...CENTER, accuracyMeters: "20" },
    ]
  ) {
    throws((): Location | null => parseLocation(value), ValidationError);
  }
  equal(parseLocation(null), null);
  equal(museumAreaFromEnvironment({}), null);
  equal(museumAreaFromEnvironment({ GEA_MUSEUM_LATITUDE: "0" }), null);
  throws((): MuseumArea | null =>
    museumAreaFromEnvironment({
      GEA_MUSEUM_LATITUDE: "91",
      GEA_MUSEUM_LONGITUDE: "0",
      GEA_MUSEUM_RADIUS_METERS: "100",
      GEA_MUSEUM_ZONE_ID: AREA.zoneId,
    })
  );
});

Deno.test("HTTP: health, CORS, dan token wajib tanpa akses layanan eksternal", async (): Promise<void> => {
  const config: BackendConfig = {
    supabaseUrl: "https://example.invalid",
    anonKey: "test",
    serviceRoleKey: "test",
    museumArea: null,
    allowedOrigins: ["http://localhost:8081"],
  };
  const health: Response = await handleRequest(
    new Request("http://localhost/gea-api/health"),
    config,
  );
  equal(health.status, 200);
  equal(object(object(await health.json(), "health").data, "data").museumConfigured, false);
  const unauthorized: Response = await handleRequest(
    new Request("http://localhost/gea-api/pois"),
    config,
  );
  equal(unauthorized.status, 401);
  const forbidden: Response = await handleRequest(
    new Request("http://localhost/gea-api/health", {
      headers: { origin: "https://untrusted.invalid" },
    }),
    config,
  );
  equal(forbidden.status, 403);
  const preflight: Response = await handleRequest(
    new Request("http://localhost/gea-api/pois", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:8081" },
    }),
    config,
  );
  equal(preflight.status, 204);
  equal(preflight.headers.get("access-control-allow-origin"), "http://localhost:8081");
});

async function resultObject(database: PGlite, sql: string, params: string[]): Promise<JsonObject> {
  const result = await database.query(sql, params);
  return object(object(result.rows[0], "SQL row").result, "SQL result");
}

Deno.test("integrasi SQL: migrasi, enam POI, hak akses, QR, jawaban, idempotensi, progres", async (test: Deno.TestContext): Promise<void> => {
  const database: PGlite = new PGlite();
  try {
    await database.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,
        file_size_limit bigint,allowed_mime_types text[]);
      grant usage on schema public to service_role;
    `);
    const migrations: string[] = [];
    for await (const entry of Deno.readDir(new URL("../supabase/migrations/", import.meta.url))) {
      if (entry.name.endsWith(".sql")) migrations.push(entry.name);
    }
    for (const migration of migrations.sort()) {
      await database.exec(
        await Deno.readTextFile(new URL(`../supabase/migrations/${migration}`, import.meta.url)),
      );
    }
    await test.step("database kosong menerima 10 draft tanpa media, idempoten dan belum terpublikasi", async (): Promise<void> => {
      const result = await database.query(
        "select p.*,k.* from public.poi p join public.konten k using(id_poi)",
      );
      equal(result.rows.length, 10);
      for (const story of approvedStories.stories) {
        const row: JsonObject = object(
          result.rows.find((row): boolean => object(row, "draft").id_poi === story.idPoi),
          "draft",
        );
        equal(row.teks_cerita, story.description);
        equal(row.profil, "dewasa");
        equal(row.judul_cerita, story.title);
        equal(row.fakta_menarik, story.fact);
        equal(row.koleksi_sorotan, story.highlights);
        equal(row.is_published, false);
        equal(row.path_foto, null);
        equal(row.path_audio, null);
        equal(row.durasi_audio, null);
        equal(row.denah_x, null);
        equal(row.estimasi_durasi, null);
      }
      equal(
        object((await database.query("select * from public.zona")).rows[0], "zona").latitude,
        null,
      );
      equal((await database.query("select * from public.quest")).rows.length, 0);
      await database.exec(prepareStoryDrafts(approvedStories, parseCheckpointDataset(catalog)));
      equal((await database.query("select * from public.konten")).rows.length, 10);
      await rejects(
        database.exec("update public.poi set is_published=true"),
        /POI_DETAILS_INCOMPLETE/,
      );
      equal((await database.query("select * from public.poi where is_published")).rows.length, 0);
    });
    // Fixture simulasi terpisah dari draft editorial yang sudah diverifikasi di atas.
    await test.step("master 20 POI: dua zona, koordinat final, dan cerita yang ada tetap utuh", async (): Promise<void> => {
      const before = await database.query(
        "select * from public.konten order by id_poi,bahasa,profil",
      );
      const beforeMaster = await database.query("select * from public.poi order by id_poi");
      equal(beforeMaster.rows.length, 20);
      for (const checkpoint of parseCheckpointDataset(catalog).pois) {
        const row: JsonObject = object(
          beforeMaster.rows.find((row): boolean =>
            object(row, "master").id_poi === checkpoint.idPoi
          ),
          "master",
        );
        equal(row.kode_poi, checkpoint.poiCode);
        equal(row.nama, checkpoint.name);
        equal(row.nama_asli, checkpoint.originalName);
        equal(row.id_zona, checkpoint.idZona);
        equal(row.latitude, checkpoint.latitude);
        equal(row.longitude, checkpoint.longitude);
        equal(row.radius, 15);
        equal(row.is_published, false);
      }
      const zones = await database.query(
        "select id_zona,count(*)::int as count from public.poi group by id_zona order by id_zona",
      );
      deepStrictEqual(zones.rows.map((row): unknown => object(row, "zone count").count), [11, 9]);
      equal((await database.query("select * from public.zona")).rows.length, 2);
      await database.exec(prepareCheckpointSeed(parseCheckpointDataset(catalog)));
      deepStrictEqual(
        (await database.query("select * from public.poi order by id_poi")).rows,
        beforeMaster.rows,
      );
      deepStrictEqual(
        (await database.query("select * from public.konten order by id_poi,bahasa,profil")).rows,
        before.rows,
      );
      await rejects(
        database.exec("update public.poi set latitude=91 where kode_poi='POI-10'"),
        /check constraint/,
      );
      await rejects(
        database.exec("update public.poi set longitude=null where kode_poi='POI-10'"),
        /check constraint/,
      );
    });
    await database.exec("delete from public.poi; delete from public.zona;");
    await database.exec(
      await Deno.readTextFile(new URL("./fixtures/stories.sql", import.meta.url)),
    );
    const userId: string = "10000000-0000-4000-8000-000000000001";
    const otherUserId: string = "10000000-0000-4000-8000-000000000002";
    const visitId: string = "50000000-0000-4000-8000-000000000001";
    const questId: string = "40000000-0000-4000-8000-000000000001";
    const requestId: string = "60000000-0000-4000-8000-000000000001";
    await test.step("cerita final: update atomik, metadata tersimpan, media dan quest tetap", async (): Promise<void> => {
      const firstId: string = "30000000-0000-4000-8000-000000000001";
      const before = await database.query(
        "select * from public.konten where id_poi=$1",
        [firstId],
      );
      await rejects(database.exec(prepareStoryUpdates(approvedStories)), /POI-07.*belum tersedia/);
      deepStrictEqual(
        (await database.query("select * from public.konten where id_poi=$1", [firstId])).rows,
        before.rows,
      );
      await database.exec("begin");
      try {
        for (const story of approvedStories.stories) {
          await database.query(
            `
            insert into public.poi(id_poi,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi)
              select $1,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi
              from public.poi where id_poi=$2 on conflict (id_poi) do nothing;
          `,
            [story.idPoi, firstId],
          );
          await database.query(
            `
            insert into public.konten(id_poi,bahasa,profil,teks_cerita,path_audio,durasi_audio)
              select $1,bahasa,profil,teks_cerita,path_audio,durasi_audio
              from public.konten where id_poi=$2 on conflict (id_poi,bahasa,profil) do nothing;
          `,
            [story.idPoi, firstId],
          );
        }
        await database.exec(prepareStoryUpdates(approvedStories));
        await database.exec(prepareStoryUpdates(approvedStories));
        await database.exec(prepareStoryDrafts(approvedStories, parseCheckpointDataset(catalog)));
        for (const story of approvedStories.stories) {
          const result = await database.query(
            "select * from public.konten where id_poi=$1 and bahasa='id' and profil='dewasa'",
            [story.idPoi],
          );
          const row: JsonObject = object(result.rows[0], "final story");
          equal(row.teks_cerita, story.description);
          equal(row.judul_cerita, story.title);
          equal(row.fakta_menarik, story.fact);
          equal(row.koleksi_sorotan, story.highlights);
          equal(row.path_audio, "simulation/audio.mp3");
          equal(row.durasi_audio, 45);
        }
        const first: ApprovedStory | undefined = approvedStories.stories[0];
        ok(first);
        equal(
          (await database.query<{ nama: string }>("select nama from public.poi where id_poi=$1", [
            first.idPoi,
          ]))
            .rows[0]?.nama,
          "SIMULASI POI 1",
        );
        equal(
          (await database.query<{ count: number }>(
            "select count(*)::int as count from public.quest",
          )).rows[0]?.count,
          6,
        );
        equal(
          (await database.query<{ count: number }>(
            "select count(*)::int as count from public.poi where is_published",
          ))
            .rows[0]?.count,
          6,
        );
      } finally {
        await database.exec("rollback");
      }
    });
    await test.step("master checkpoint melengkapi POI tanpa mengubah media, kuis, dan status publikasi", async (): Promise<void> => {
      await database.exec("begin");
      try {
        const contents = await database.query(
          "select * from public.konten order by id_poi,bahasa,profil",
        );
        const quests = await database.query("select * from public.quest order by id_quest");
        const existingMedia = await database.query(
          "select id_poi,path_foto,denah_x,denah_y,prioritas,estimasi_durasi,is_published from public.poi order by id_poi",
        );
        await database.exec(prepareCheckpointSeed(parseCheckpointDataset(catalog)));
        equal((await database.query("select * from public.poi")).rows.length, 20);
        deepStrictEqual(
          (await database.query("select * from public.konten order by id_poi,bahasa,profil")).rows,
          contents.rows,
        );
        deepStrictEqual(
          (await database.query("select * from public.quest order by id_quest")).rows,
          quests.rows,
        );
        deepStrictEqual(
          (await database.query(
            "select id_poi,path_foto,denah_x,denah_y,prioritas,estimasi_durasi,is_published from public.poi where is_published order by id_poi",
          )).rows,
          existingMedia.rows,
        );
      } finally {
        await database.exec("rollback");
      }
    });
    await test.step("generator seed menolak draft dan SQL hasilnya bisa dimigrasikan", async (): Promise<void> => {
      const template: unknown = JSON.parse(
        await Deno.readTextFile(new URL("../data/poi-template.json", import.meta.url)),
      );
      throws((): string => prepareInitialSeed(template), /belum disetujui/);
      const generated: string = prepareInitialSeed({
        approved: true,
        language: "id",
        profile: "dewasa",
        zones: [1, 2].map((index: number): JsonObject => ({
          idZona: `21000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          name: "SIMULASI",
          latitude: 0,
          longitude: 0,
          radiusMeters: 15,
        })),
        pois: Array.from({ length: 20 }, (_value: unknown, index: number): JsonObject => ({
          idPoi: `31000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          idQuest: `41000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          idZona: index < 11
            ? "21000000-0000-4000-8000-000000000001"
            : "21000000-0000-4000-8000-000000000002",
          name: "SIMULASI 'seed'",
          photoPath: "images/simulation.jpg",
          audioPath: "audio/simulation.mp3",
          audioDurationSeconds: 45,
          denahX: 1,
          denahY: 1,
          priority: index,
          estimatedMinutes: 5,
          description: "Hanya simulasi.",
          question: {
            instruction: "Amati simulasi.",
            prompt: "Pilih A.",
            hint: "Simulasi.",
            options: ["A", "B", "C", "D"].map((label: string): JsonObject => ({
              label,
              text: `Pilihan ${label}`,
              correct: label === "A",
            })),
          },
        })),
      });
      await database.exec("begin");
      try {
        await database.exec(generated);
        const result = await database.query(
          "select count(*)::int as count from public.poi where is_published",
        );
        equal(object(result.rows[0], "count").count, 26);
      } finally {
        await database.exec("rollback");
      }
    });
    await test.step("enam paket Stories lengkap dan media bucket", async (): Promise<void> => {
      const result = await database.query(
        "select count(*)::int as count from public.poi where is_published",
      );
      equal(object(result.rows[0], "count").count, 6);
      await rejects(database.exec("update public.konten set durasi_audio=10"), /check constraint/);
      await rejects(
        database.exec("update public.poi set path_foto=null where is_published"),
        /POI_DETAILS_INCOMPLETE/,
      );
      await rejects(
        database.exec("update public.konten set path_audio=null,durasi_audio=null"),
        /POI_AUDIO_INCOMPLETE/,
      );
      await database.exec("begin");
      try {
        await database.exec("update public.poi set is_published=false;");
        await database.exec("update public.konten set path_audio=null,durasi_audio=null;");
        await rejects(
          database.exec("update public.poi set is_published=true;"),
          /POI_AUDIO_INCOMPLETE/,
        );
      } finally {
        await database.exec("rollback");
      }
      await rejects(
        database.exec("update public.quest_opsi set is_correct=true where label_opsi='B'"),
        /unique constraint/,
      );
      await rejects(
        database.exec(
          `insert into public.poi(id_poi,id_zona,nama,path_foto,denah_x,denah_y,prioritas,estimasi_durasi,is_published)
        values ('30000000-0000-4000-8000-000000000099','20000000-0000-4000-8000-000000000001','Tidak lengkap','x.jpg',0,0,1,5,true)`,
        ),
        /POI_STORIES_INCOMPLETE/,
      );
    });
    await test.step("client tidak dapat membaca kunci atau memanggil RPC internal", async (): Promise<void> => {
      await database.exec("set role authenticated");
      await rejects(database.exec("select * from public.quest_opsi"), /permission denied/);
      await rejects(
        database.query("select public.progres_kunjungan($1,$2)", [userId, visitId]),
        /permission denied/,
      );
      await database.exec("reset role; set role service_role");
    });
    await test.step("QR pintu masuk valid membuka sesi, QR invalid ditolak", async (): Promise<void> => {
      await rejects(
        database.query("select public.buat_sesi_qr($1,$2,$3,'id','dewasa')", [
          userId,
          visitId,
          "invalid",
        ]),
        /ENTRANCE_QR_INVALID/,
      );
      const visit: JsonObject = await resultObject(
        database,
        "select public.buat_sesi_qr($1,$2,$3,'id','dewasa') as result",
        [userId, visitId, "a".repeat(64)],
      );
      equal(visit.id_sesi, visitId);
      equal(visit.verification_method, "entrance_qr");
      equal("user_id" in visit, false);
      const repeated: JsonObject = await resultObject(
        database,
        "select public.buat_sesi_qr($1,$2,$3,'id','dewasa') as result",
        [userId, visitId, "a".repeat(64)],
      );
      deepStrictEqual(repeated, visit);
    });
    await test.step("kepemilikan sesi dan verifikasi checkpoint diwajibkan", async (): Promise<void> => {
      await rejects(
        database.query("select public.progres_kunjungan($1,$2)", [otherUserId, visitId]),
        /SESSION_NOT_FOUND/,
      );
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'B',$4)", [
          userId,
          visitId,
          questId,
          requestId,
        ]),
        /CHECKPOINT_VERIFICATION_REQUIRED/,
      );
      const receipt: JsonObject = await resultObject(
        database,
        "select public.verifikasi_qr_poi($1,$2,$3) as result",
        [userId, visitId, "1".repeat(64)],
      );
      equal(receipt.verified, true);
      await rejects(
        database.query("select public.verifikasi_qr_poi($1,$2,$3)", [
          userId,
          visitId,
          "a".repeat(64),
        ]),
        /POI_QR_INVALID/,
      );
    });
    await test.step("jawaban salah disimpan, request ulang tidak menggandakan hitungan", async (): Promise<void> => {
      const wrong: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [userId, visitId, questId, requestId],
      );
      equal(wrong.answerCorrect, false);
      equal(wrong.attemptCount, 1);
      equal(wrong.hint, "Petunjuk simulasi.");
      const repeated: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [userId, visitId, questId, requestId],
      );
      deepStrictEqual(repeated, wrong);
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'A',$4)", [
          userId,
          visitId,
          questId,
          requestId,
        ]),
        /IDEMPOTENCY_CONFLICT/,
      );
    });
    await test.step("sesi anak tanpa teks anak memakai hint versi dewasa", async (): Promise<void> => {
      const studentVisitId: string = "50000000-0000-4000-8000-000000000002";
      const visit: JsonObject = await resultObject(
        database,
        "select public.buat_sesi_qr($1,$2,$3,'id','anak') as result",
        [otherUserId, studentVisitId, "a".repeat(64)],
      );
      equal(visit.profil, "anak");
      await resultObject(database, "select public.verifikasi_qr_poi($1,$2,$3) as result", [
        otherUserId,
        studentVisitId,
        "1".repeat(64),
      ]);
      const wrong: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'B',$4) as result",
        [otherUserId, studentVisitId, questId, crypto.randomUUID()],
      );
      equal(wrong.answerCorrect, false);
      equal(wrong.hint, "Petunjuk simulasi.");
    });
    await test.step("jawaban benar menyelesaikan quest; percobaan berikutnya ditolak", async (): Promise<void> => {
      const correct: JsonObject = await resultObject(
        database,
        "select public.jawab_quest($1,$2,$3,'A',$4) as result",
        [userId, visitId, questId, crypto.randomUUID()],
      );
      equal(correct.completed, true);
      equal(correct.attemptCount, 2);
      equal(correct.hint, null);
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'B',$4)", [
          userId,
          visitId,
          questId,
          crypto.randomUUID(),
        ]),
        /QUEST_ALREADY_COMPLETED/,
      );
      const result: JsonObject = await resultObject(
        database,
        "select public.progres_kunjungan($1,$2) as result",
        [userId, visitId],
      );
      ok(Array.isArray(result.quests));
      equal(result.quests.length, 1);
      equal(object(result.quests[0], "progress").answer_correct, true);
    });
    await test.step("QR kedaluwarsa dan bukti checkpoint kedaluwarsa ditolak", async (): Promise<void> => {
      await database.exec("update private.qr_tokens set expires_at=now()-interval '1 second'");
      await rejects(
        database.query("select public.verifikasi_qr_poi($1,$2,$3)", [
          userId,
          visitId,
          "1".repeat(64),
        ]),
        /POI_QR_INVALID/,
      );
      await database.exec(
        "update private.poi_verification set expires_at=now()-interval '1 second'",
      );
      await rejects(
        database.query("select public.jawab_quest($1,$2,$3,'A',$4)", [
          userId,
          visitId,
          questId,
          crypto.randomUUID(),
        ]),
        /CHECKPOINT_VERIFICATION_REQUIRED/,
      );
    });
  } finally {
    await database.close();
  }
});
