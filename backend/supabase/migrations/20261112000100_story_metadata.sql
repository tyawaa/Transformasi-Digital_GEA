-- Metadata cerita mengikuti varian bahasa/profil yang sama dengan teks dan narasi.
alter table public.konten
  add column judul_cerita text check (length(btrim(judul_cerita)) > 0),
  add column fakta_menarik text check (length(btrim(fakta_menarik)) > 0),
  add column koleksi_sorotan text check (length(btrim(koleksi_sorotan)) > 0);
