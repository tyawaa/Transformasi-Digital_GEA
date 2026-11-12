-- Seed cerita yang sudah diterapkan memakai 'umum'; migrasi profil usia berjalan lebih awal
-- pada database baru. Normalisasi input seed lama mengikuti pemetaan migrasi usia tanpa
-- mengubah file migrasi yang sudah pernah dijalankan atau melonggarkan profil tersimpan.
create function private.normalize_legacy_story_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.profil = 'umum' then new.profil := 'dewasa';
  elsif new.profil = 'pelajar' then new.profil := 'anak';
  end if;
  return new;
end $$;
create trigger normalize_legacy_story_profile before insert or update of profil on public.konten
  for each row execute function private.normalize_legacy_story_profile();
revoke all on function private.normalize_legacy_story_profile() from public, anon, authenticated;
grant execute on function private.normalize_legacy_story_profile() to service_role;
