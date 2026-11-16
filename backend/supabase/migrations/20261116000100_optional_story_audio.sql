-- Rilis cerita teks dan gambar; audio dapat ditambahkan tanpa menerbitkan ulang POI.
-- Pasangan path/durasi dan rentang durasi tetap dijaga constraint konten yang sudah ada.
drop trigger check_published_content_audio on public.konten;
drop function private.check_published_content_audio();

create or replace function private.check_poi_publication()
returns trigger language plpgsql set search_path = '' as $$
declare
  quest_rec public.quest;
  variant public.konten;
  expected_options integer;
begin
  if not new.is_published then return new; end if;
  if new.path_foto is null or new.denah_x is null or new.denah_y is null
    or new.prioritas is null or new.estimasi_durasi is null then
    raise sqlstate 'PT409' using message = 'POI_DETAILS_INCOMPLETE';
  end if;

  select * into quest_rec from public.quest where id_poi = new.id_poi;
  if not found or not exists (select 1 from public.konten where id_poi = new.id_poi) then
    raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
  end if;

  expected_options := case
    when quest_rec.tipe_quest in ('pilgan', 'cocokkan') then 4
    when quest_rec.tipe_quest = 'benar_salah' then 2
    else 0 end;
  if expected_options > 0 and (
    (select count(*) from public.quest_opsi where id_quest = quest_rec.id_quest) <> expected_options or
    (select count(*) from public.quest_opsi where id_quest = quest_rec.id_quest and is_correct) <> 1
  ) then
    raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
  end if;

  for variant in select * from public.konten where id_poi = new.id_poi loop
    -- Profil anak tetap dapat membaca cerita ketika quest non-foto dinonaktifkan.
    if variant.profil = 'anak' and quest_rec.tipe_quest <> 'foto' then continue; end if;
    if not exists (select 1 from public.quest_teks where id_quest = quest_rec.id_quest
      and bahasa = variant.bahasa and profil = variant.profil) then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    end if;
    if expected_options > 0 and (
      select count(*) from public.quest_opsi_text
      where id_quest = quest_rec.id_quest and bahasa = variant.bahasa
    ) <> expected_options then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    end if;
  end loop;
  return new;
end $$;

revoke all on function private.check_poi_publication() from public, anon, authenticated;
grant execute on function private.check_poi_publication() to service_role;
