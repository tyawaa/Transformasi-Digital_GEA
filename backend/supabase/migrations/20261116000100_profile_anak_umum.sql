-- Sheet Sprint 3 (Konten_Cerita / Konten_Cerita_Anak, Quest / Quest_Anak) hanya membedakan dua kategori
-- pengunjung: Anak-anak (7-12 tahun) dan Umum. Profil 'remaja' dari migrasi 20261111000100 dihapus:
-- 'anak' = Anak-anak, 'dewasa' = Umum (13 tahun ke atas). Data 'remaja' dipindah ke 'dewasa'.

-- Varian remaja yang punya pasangan dewasa dihapus (versi dewasa = Umum dipakai); sisanya dipindah.
delete from public.konten k using public.konten d
  where k.profil = 'remaja' and d.profil = 'dewasa' and d.id_poi = k.id_poi and d.bahasa = k.bahasa;
update public.konten set profil = 'dewasa' where profil = 'remaja';
delete from public.quest_teks q using public.quest_teks d
  where q.profil = 'remaja' and d.profil = 'dewasa' and d.id_quest = q.id_quest and d.bahasa = q.bahasa;
update public.quest_teks set profil = 'dewasa' where profil = 'remaja';
update public.sesi_kunjungan set profil = 'dewasa' where profil = 'remaja';

alter table public.konten drop constraint konten_profil_check;
alter table public.quest_teks drop constraint quest_teks_profil_check;
alter table public.sesi_kunjungan drop constraint sesi_kunjungan_profil_check;
alter table public.konten add constraint konten_profil_check check (profil in ('anak', 'dewasa'));
alter table public.quest_teks add constraint quest_teks_profil_check check (profil in ('anak', 'dewasa'));
alter table public.sesi_kunjungan add constraint sesi_kunjungan_profil_check check (profil in ('anak', 'dewasa'));

-- Seed lama: 'umum' dan 'remaja' menjadi 'dewasa' (Umum), 'pelajar' menjadi 'anak'.
create or replace function private.normalize_legacy_story_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.profil in ('umum', 'remaja') then new.profil := 'dewasa';
  elsif new.profil = 'pelajar' then new.profil := 'anak';
  end if;
  return new;
end $$;
