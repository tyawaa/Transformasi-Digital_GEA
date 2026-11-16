-- Migration Sprint 2: A8 - Audit skema Supabase dan migrasi tabel Sprint 2
-- Menyediakan tabel: points, badge, user_badge, poi_progress, serta view kompatibilitas
-- session, quest_attempt, checkpoint.
-- Mengimplementasikan unique key anti-poin ganda (session, POI, komponen).

-- 1. Master Badge (Lencana)
create table if not exists public.badge (
  kode_badge text primary key check (kode_badge ~ '^BD-0[1-5]$'),
  nama text not null check (length(btrim(nama)) > 0),
  deskripsi text not null check (length(btrim(deskripsi)) > 0),
  bonus_poin integer not null check (bonus_poin >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.badge is 'Master lencana Sprint 2 (BD-01, BD-02, BD-04, BD-05; BD-03 foto menyusul Sprint 3).';

-- Seed 4 lencana aktif Sprint 2 + 1 lencana foto non-aktif
insert into public.badge (kode_badge, nama, deskripsi, bonus_poin, is_active) values
  ('BD-01', 'Penjelajah Sayap Kiri', 'Selesaikan semua POI aktif di sayap kiri.', 50, true),
  ('BD-02', 'Penjelajah Sayap Kanan', 'Selesaikan semua POI aktif di sayap kanan.', 50, true),
  ('BD-03', 'Pemburu Foto', 'Ambil foto di semua POI aktif.', 30, false),
  ('BD-04', 'Otak Geologi', 'Jawab benar semua kuis di percobaan pertama.', 40, true),
  ('BD-05', 'Geolog Sejati', 'Selesaikan semua POI aktif.', 100, true)
on conflict (kode_badge) do update set
  nama = excluded.nama,
  deskripsi = excluded.deskripsi,
  bonus_poin = excluded.bonus_poin,
  is_active = excluded.is_active;

-- 2. User Badge (Lencana Pengguna per Sesi)
create table if not exists public.user_badge (
  id_user_badge uuid primary key default gen_random_uuid(),
  id_sesi uuid not null references public.sesi_kunjungan(id_sesi) on delete cascade,
  kode_badge text not null references public.badge(kode_badge) on delete cascade,
  earned_at timestamptz not null default now(),
  constraint user_badge_sesi_kode_unique unique (id_sesi, kode_badge)
);

comment on table public.user_badge is 'Lencana yang diraih pengunjung pada sesi kunjungan tertentu.';

-- 3. Points (Poin Kunjungan dengan Unique Key Anti-Poin Ganda)
create table if not exists public.points (
  id_point uuid primary key default gen_random_uuid(),
  id_sesi uuid not null references public.sesi_kunjungan(id_sesi) on delete cascade,
  id_poi uuid references public.poi(id_poi) on delete cascade,
  kode_badge text references public.badge(kode_badge) on delete cascade,
  komponen text not null check (komponen in ('kuis', 'badge', 'foto')),
  nilai_poin integer not null check (nilai_poin >= 0),
  created_at timestamptz not null default now(),
  constraint points_session_poi_komponen_unique unique (id_sesi, id_poi, komponen),
  constraint points_komponen_referensi check (
    (komponen in ('kuis', 'foto') and id_poi is not null) or
    (komponen = 'badge' and kode_badge is not null)
  )
);

create unique index if not exists points_session_badge_unique
  on public.points (id_sesi, kode_badge)
  where komponen = 'badge';

comment on table public.points is 'Catatan perolehan poin pengunjung dengan proteksi anti-poin ganda.';
comment on constraint points_session_poi_komponen_unique on public.points is 'Unique key anti-poin ganda (session, POI, komponen).';

-- 4. POI Progress (Status Kemajuan POI per Sesi)
create table if not exists public.poi_progress (
  id_sesi uuid not null references public.sesi_kunjungan(id_sesi) on delete cascade,
  id_poi uuid not null references public.poi(id_poi) on delete cascade,
  status text not null default 'belum' check (status in ('belum', 'sebagian', 'selesai')),
  kartu_ditutup boolean not null default false,
  qr_terverifikasi boolean not null default false,
  kuis_selesai boolean not null default false,
  kuis_gagal boolean not null default false,
  jumlah_percobaan integer not null default 0 check (jumlah_percobaan >= 0 and jumlah_percobaan <= 3),
  poin_kuis integer not null default 0 check (poin_kuis >= 0),
  updated_at timestamptz not null default now(),
  primary key (id_sesi, id_poi)
);

comment on table public.poi_progress is 'Agregasi status kemajuan pengunjung per POI: belum, sebagian, atau selesai.';

-- 5. Views Kompatibilitas untuk session, quest_attempt, checkpoint, serta alias bahasa Indonesia
create or replace view public.session as
  select
    id_sesi,
    user_id,
    id_zona,
    bahasa,
    profil,
    eyes_free_aktif,
    verification_method,
    status,
    start_time,
    end_time
  from public.sesi_kunjungan;

create or replace view public.quest_attempt as
  select
    id_sesi,
    request_id,
    id_quest,
    label_opsi,
    response,
    created_at
  from private.quest_attempts;

create or replace view public.checkpoint as
  select
    id_poi as id_checkpoint,
    id_poi,
    id_zona,
    nama,
    nama_asli,
    kode_poi,
    latitude,
    longitude,
    radius,
    is_published
  from public.poi
  where latitude is not null and longitude is not null;

create or replace view public.lencana as select * from public.badge;
create or replace view public.user_lencana as select * from public.user_badge;
create or replace view public.poin as select * from public.points;

-- 6. Row Level Security & Hak Akses
alter table public.badge enable row level security;
alter table public.user_badge enable row level security;
alter table public.points enable row level security;
alter table public.poi_progress enable row level security;

do $$
declare target text;
begin
  foreach target in array array['badge', 'user_badge', 'points', 'poi_progress']
  loop
    execute format('revoke all on public.%I from public, anon, authenticated', target);
    execute format('grant all on public.%I to service_role', target);
  end loop;
end $$;

grant select on public.session to service_role;
grant select on public.quest_attempt to service_role;
grant select on public.checkpoint to service_role;
grant select on public.lencana to service_role;
grant select on public.user_lencana to service_role;
grant select on public.poin to service_role;

revoke all on public.session from public, anon, authenticated;
revoke all on public.quest_attempt from public, anon, authenticated;
revoke all on public.checkpoint from public, anon, authenticated;
revoke all on public.lencana from public, anon, authenticated;
revoke all on public.user_lencana from public, anon, authenticated;
revoke all on public.poin from public, anon, authenticated;
