-- Sprint 3: master lencana mengikuti sheet Badge_Poin (workbook _Anak, 15 Nov 2026), BD-01 s.d. BD-15.
-- Kode lama Sprint 2 berubah arti (mis. BD-02 dulu Sayap Kanan, sekarang Pemburu Foto), jadi semua baris
-- ditimpa sesuai sheet. Prioritas rendah (bergantung POI-12 s.d. POI-21): BD-05, BD-08, BD-09 non-aktif
-- dulu. BD-14 (Fotografer Cilik) non-aktif karena anak tidak mengerjakan quest foto.
-- Logika perolehan lencana saat ini dihitung aplikasi (frontend/src/domain/points.ts).

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
