-- Draft menyimpan nilai yang belum tersedia sebagai NULL, tanpa media/koordinat buatan.
alter table public.zona
  alter column latitude drop not null,
  alter column longitude drop not null,
  alter column radius drop not null,
  add constraint zona_gps_lengkap check (
    (latitude is null and longitude is null and radius is null) or
    (latitude is not null and longitude is not null and radius is not null)
  );

alter table public.poi
  alter column path_foto drop not null,
  alter column denah_x drop not null,
  alter column denah_y drop not null,
  alter column prioritas drop not null,
  alter column estimasi_durasi drop not null;

alter table public.konten
  alter column path_audio drop not null,
  alter column durasi_audio drop not null,
  add constraint konten_audio_lengkap check (
    (path_audio is null and durasi_audio is null) or
    (path_audio is not null and durasi_audio is not null)
  );

create or replace function private.check_poi_publication()
returns trigger language plpgsql set search_path = '' as $$
declare quest_id uuid; variant public.konten;
begin
  if not new.is_published then return new; end if;
  if new.path_foto is null or new.denah_x is null or new.denah_y is null
    or new.prioritas is null or new.estimasi_durasi is null then
    raise sqlstate 'PT409' using message = 'POI_DETAILS_INCOMPLETE';
  end if;
  select id_quest into quest_id from public.quest where id_poi = new.id_poi;
  if quest_id is null or
    (select count(*) from public.quest_opsi where id_quest = quest_id) <> 4 or
    (select count(*) from public.quest_opsi where id_quest = quest_id and is_correct) <> 1 or
    not exists (select 1 from public.konten where id_poi = new.id_poi) then
    raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
  end if;
  for variant in select * from public.konten where id_poi = new.id_poi loop
    if variant.path_audio is null or variant.durasi_audio is null then
      raise sqlstate 'PT409' using message = 'POI_AUDIO_INCOMPLETE';
    end if;
    if not exists (select 1 from public.quest_teks where id_quest = quest_id
      and bahasa = variant.bahasa and profil = variant.profil) or
      (select count(*) from public.quest_opsi_text where id_quest = quest_id
        and bahasa = variant.bahasa) <> 4 then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    end if;
  end loop;
  return new;
end $$;

drop trigger check_poi_publication on public.poi;
create trigger check_poi_publication before insert or update on public.poi
  for each row execute function private.check_poi_publication();

create function private.check_published_content_audio()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.path_audio is null or new.durasi_audio is null) and
    exists (select 1 from public.poi where id_poi = new.id_poi and is_published) then
    raise sqlstate 'PT409' using message = 'POI_AUDIO_INCOMPLETE';
  end if;
  return new;
end $$;
create trigger check_published_content_audio after insert or update on public.konten
  for each row execute function private.check_published_content_audio();
revoke all on function private.check_published_content_audio() from public, anon, authenticated;
grant execute on function private.check_published_content_audio() to service_role;
