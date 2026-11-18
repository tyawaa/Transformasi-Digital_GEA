-- Sprint 3: master lencana mengikuti sheet Badge_Poin (workbook _Anak, 15 Nov 2026), BD-01 s.d. BD-15.
-- Kode lama Sprint 2 berubah arti (mis. BD-02 dulu Sayap Kanan, sekarang Pemburu Foto), jadi semua baris
-- ditimpa sesuai sheet. Prioritas rendah (bergantung POI-12 s.d. POI-21): BD-05, BD-08, BD-09 non-aktif
-- dulu. BD-14 (Fotografer Cilik) non-aktif karena anak tidak mengerjakan quest foto.
-- Sebagian lencana dinilai server (lihat evaluasi_lencana di bawah); sisanya dihitung aplikasi (points.ts).

alter table public.badge drop constraint if exists badge_kode_badge_check;
alter table public.badge add constraint badge_kode_badge_check check (kode_badge ~ '^BD-(0[1-9]|1[0-5])$');

insert into public.badge (kode_badge, nama, deskripsi, bonus_poin, is_active) values
  ('BD-01', 'Penjelajah Sayap Kiri', 'Check-in di semua POI Left Wing (POI-01 s.d. POI-11).', 50, true),
  ('BD-02', 'Pemburu Foto', 'Selesaikan semua quest tipe Foto.', 30, true),
  ('BD-03', 'Otak Geologi', 'Jawab benar semua kuis tanpa salah.', 40, true),
  ('BD-04', 'Geolog Sejati', 'Selesaikan semua POI.', 100, true),
  ('BD-05', 'Penjelajah Sayap Kanan', 'Check-in di semua POI Right Wing (POI-12 s.d. POI-20).', 50, false),
  ('BD-06', 'Langkah Pertama', 'Selesaikan quest pertamamu di POI mana pun.', 10, true),
  ('BD-07', 'Pembaca Gerak Bumi', 'Selesaikan quest di POI-03, POI-04, POI-05, dan POI-08.', 30, true),
  ('BD-08', 'Pengelana Lorong Waktu', 'Selesaikan quest di POI-12 s.d. POI-17.', 40, false),
  ('BD-09', 'Jejak Manusia Purba', 'Selesaikan quest di POI-18, POI-19, dan POI-20.', 30, false),
  ('BD-10', 'Kolektor Batuan', 'Selesaikan quest di POI-07, POI-10, dan POI-11.', 30, true),
  ('BD-11', 'Rajin Berkunjung', 'Selesaikan minimal 1 quest pada 3 hari kunjungan yang berbeda.', 20, true),
  ('BD-12', 'Si Teliti', 'Jawab benar pada percobaan pertama di 5 quest kuis (pilihan ganda, benar/salah, cocokkan, atau isian).', 25, true),
  ('BD-13', 'Penakluk Tantangan Sulit', 'Selesaikan semua quest ber-tingkat Sulit (POI-06 dan POI-10).', 40, true),
  ('BD-14', 'Fotografer Cilik', 'Selesaikan semua quest foto Anak-anak (Quest_Anak).', 25, false),
  ('BD-15', 'Penjelajah Cilik', 'Selesaikan quest Anak-anak di minimal 2 POI berbeda.', 15, true)
on conflict (kode_badge) do update set
  nama = excluded.nama,
  deskripsi = excluded.deskripsi,
  bonus_poin = excluded.bonus_poin,
  is_active = excluded.is_active;

comment on table public.badge is 'Master lencana Sprint 3 dari sheet Badge_Poin (BD-01 s.d. BD-15).';

-- Evaluasi lencana di server memakai arti kode sheet Badge_Poin. Sebelumnya kode lama Sprint 2 dipakai
-- (BD-02 = Sayap Kanan, BD-04 = Otak Geologi, BD-05 = Geolog Sejati) sehingga lencana yang diberikan salah nama.
-- Aturan yang bisa dihitung dari data server: BD-01 (sayap kiri), BD-03 (semua kuis benar percobaan
-- pertama), BD-04 (semua POI), BD-05 (sayap kanan), BD-06 (quest pertama), BD-12 (5 kuis benar percobaan
-- pertama). Lencana lain (butuh kode POI/tantangan di perangkat) dihitung aplikasi. Bonus diambil dari
-- master lencana dan hanya lencana aktif yang diberikan.
create or replace function private.beri_lencana(p_id_sesi uuid, p_kode text)
returns boolean language plpgsql set search_path = '' as $$
declare
  bonus int;
begin
  select bonus_poin into bonus from public.badge where kode_badge = p_kode and is_active;
  if not found then return false; end if;
  if exists (select 1 from public.user_badge where id_sesi = p_id_sesi and kode_badge = p_kode) then
    return false;
  end if;
  insert into public.user_badge (id_sesi, kode_badge) values (p_id_sesi, p_kode) on conflict do nothing;
  insert into public.points (id_sesi, kode_badge, komponen, nilai_poin)
    values (p_id_sesi, p_kode, 'badge', bonus) on conflict do nothing;
  return true;
end $$;

create or replace function private.evaluasi_lencana(p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  total_active_pois int;
  left_active_pois int;
  right_active_pois int;
  completed_all int;
  completed_left int;
  completed_right int;
  perfect_all int;
  new_badges text[] := '{}';
begin
  if not exists (select 1 from public.sesi_kunjungan where id_sesi = p_id_sesi) then
    return '[]'::jsonb;
  end if;

  select
    count(*),
    count(*) filter (where id_zona = '20000000-0000-4000-8000-000000000001'),
    count(*) filter (where id_zona = '20000000-0000-4000-8000-000000000002')
  into total_active_pois, left_active_pois, right_active_pois
  from public.poi where is_published;

  select
    count(*),
    count(*) filter (where p.id_zona = '20000000-0000-4000-8000-000000000001'),
    count(*) filter (where p.id_zona = '20000000-0000-4000-8000-000000000002'),
    count(*) filter (where m.answer_correct and m.jumlah_percobaan = 1)
  into completed_all, completed_left, completed_right, perfect_all
  from public.mengerjakan m
  join public.quest q using (id_quest)
  join public.poi p using (id_poi)
  where m.id_sesi = p_id_sesi and p.is_published and (m.answer_correct or m.jumlah_percobaan >= 3);

  if left_active_pois > 0 and completed_left >= left_active_pois and private.beri_lencana(p_id_sesi, 'BD-01') then
    new_badges := array_append(new_badges, 'BD-01');
  end if;
  if total_active_pois > 0 and perfect_all >= total_active_pois and private.beri_lencana(p_id_sesi, 'BD-03') then
    new_badges := array_append(new_badges, 'BD-03');
  end if;
  if total_active_pois > 0 and completed_all >= total_active_pois and private.beri_lencana(p_id_sesi, 'BD-04') then
    new_badges := array_append(new_badges, 'BD-04');
  end if;
  if right_active_pois > 0 and completed_right >= right_active_pois and private.beri_lencana(p_id_sesi, 'BD-05') then
    new_badges := array_append(new_badges, 'BD-05');
  end if;
  if completed_all >= 1 and private.beri_lencana(p_id_sesi, 'BD-06') then
    new_badges := array_append(new_badges, 'BD-06');
  end if;
  if perfect_all >= 5 and private.beri_lencana(p_id_sesi, 'BD-12') then
    new_badges := array_append(new_badges, 'BD-12');
  end if;

  return to_jsonb(new_badges);
end $$;

grant execute on function private.beri_lencana to service_role;
grant execute on function private.evaluasi_lencana to service_role;
revoke all on function private.beri_lencana from public, anon, authenticated;
revoke all on function private.evaluasi_lencana from public, anon, authenticated;
