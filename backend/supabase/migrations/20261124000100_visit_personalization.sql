alter table public.sesi_kunjungan
  add column personalization jsonb,
  add column route_codes text[],
  add column route_minutes integer,
  add column planned_end_at timestamptz,
  add column closing_limited boolean;

-- Menyimpan jawaban dan snapshot rute tanpa mengubah waktu mulai atau progres sesi.
create function public.simpan_personalisasi(
  p_user_id uuid, p_id_sesi uuid, p_preferences jsonb, p_wings text
) returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  selected_age text := p_preferences->>'age';
  selected_duration text := p_preferences->>'duration';
  selected_topics jsonb := p_preferences->'topics';
  chosen_minutes integer;
  closing_at timestamptz;
  deadline timestamptz;
  budget integer;
  picked text[] := array[]::text[];
  total integer := 0;
  candidate record;
  walk_order text[] := array['P10','P04','P03','P02','P01','P09','P08','P07','P06','P05','P11','P12','P13','P14','P15','P16','P17','P18','P19','P20'];
begin
  visit := private.require_session(p_user_id, p_id_sesi);
  if jsonb_typeof(p_preferences) is distinct from 'object'
    or selected_age is null or selected_age not in ('7-12 Tahun','13-17 Tahun','18-24 Tahun','>24 Tahun')
    or selected_duration is null or selected_duration not in ('< 30 menit','30-45 Menit','45 menit-1.5 Jam','> 1.5 jam')
    or jsonb_typeof(selected_topics) is distinct from 'array'
    or p_wings is null or p_wings not in ('left','both') then
    raise sqlstate 'PT400' using message = 'PERSONALIZATION_INVALID';
  end if;
  if jsonb_array_length(selected_topics) not between 1 and 5
    or exists (select 1 from jsonb_array_elements_text(selected_topics) t(label)
      where label not in ('Gunung Api & Gempa','Batuan & Mineral','Bentang Alam & Gua','Asal-usul Bumi','Fosil & Hewan Purba'))
    or (select count(distinct label) from jsonb_array_elements_text(selected_topics) t(label)) <> jsonb_array_length(selected_topics) then
    raise sqlstate 'PT400' using message = 'PERSONALIZATION_TOPICS_INVALID';
  end if;
  chosen_minutes := case selected_duration when '< 30 menit' then 30
    when '30-45 Menit' then 45 when '45 menit-1.5 Jam' then 90 else null end;
  -- Jam tutup 16:00 WIB adalah konfigurasi yang saat ini dipakai aplikasi.
  closing_at := ((visit.start_time at time zone 'Asia/Jakarta')::date + time '16:00') at time zone 'Asia/Jakarta';
  deadline := greatest(visit.start_time, least(closing_at, visit.start_time + chosen_minutes * interval '1 minute'));
  budget := floor(extract(epoch from (deadline - visit.start_time)) / 60)::integer;
  for candidate in
    with available as (
      select replace(p.kode_poi,'POI-','P') as code, p.estimasi_durasi as minutes
      from public.poi p where p.is_published and p.kode_poi ~ '^POI-(0[1-9]|1[0-9]|20)$'
        and (p_wings = 'both' or substring(p.kode_poi from 5)::integer <= 11)
    ), scored as (
      select a.*, (select count(*) from jsonb_array_elements_text(selected_topics) t(label)
        where a.code = any(case label
          when 'Gunung Api & Gempa' then array['P03','P08','P04']
          when 'Batuan & Mineral' then array['P07','P10','P11','P06']
          when 'Bentang Alam & Gua' then array['P02','P04','P06','P21']
          when 'Asal-usul Bumi' then array['P09','P05','P12','P13']
          when 'Fosil & Hewan Purba' then array['P01','P14','P15','P16','P17','P18'] end)) * 2
        - case when substring(a.code from 2)::integer > 11 then 100 else 0 end as score
      from available a
    ) select * from scored order by score desc, array_position(walk_order,code)
  loop
    if total + candidate.minutes <= budget then
      picked := array_append(picked, candidate.code);
      total := total + candidate.minutes;
    end if;
  end loop;
  select coalesce(array_agg(code order by array_position(walk_order,code)), array[]::text[])
    into picked from unnest(picked) t(code);
  update public.sesi_kunjungan set
    personalization = jsonb_build_object('age',selected_age,'duration',selected_duration,'topics',selected_topics),
    profil = case when selected_age = '7-12 Tahun' then 'anak' else 'dewasa' end,
    route_codes = picked, route_minutes = total, planned_end_at = deadline,
    closing_limited = chosen_minutes is null or closing_at < visit.start_time + chosen_minutes * interval '1 minute'
    where id_sesi = p_id_sesi returning * into visit;
  return to_jsonb(visit) - 'user_id';
end $$;

revoke all on function public.simpan_personalisasi from public, anon, authenticated;
grant execute on function public.simpan_personalisasi to service_role;
