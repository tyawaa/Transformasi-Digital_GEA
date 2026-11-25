-- Jadwal WIB disimpan di backend; tanggal khusus menggantikan jadwal mingguan.
create table private.museum_hours (
  weekday integer primary key check (weekday between 0 and 6),
  closing_time time not null
);
insert into private.museum_hours select day, time '16:00' from generate_series(0,6) day;
create table private.museum_calendar (
  visit_date date primary key,
  closing_time time not null
);
create table private.visit_extensions (
  id_sesi uuid references public.sesi_kunjungan on delete cascade,
  request_id uuid,
  minutes integer not null check (minutes in (10,20,30)),
  primary key (id_sesi, request_id)
);
alter table private.museum_hours enable row level security;
alter table private.museum_calendar enable row level security;
alter table private.visit_extensions enable row level security;
revoke all on private.museum_hours, private.museum_calendar, private.visit_extensions from public, anon, authenticated;
grant all on private.museum_hours, private.museum_calendar, private.visit_extensions to service_role;

alter table public.sesi_kunjungan
  add column closing_at timestamptz,
  add column ended_reason text check (ended_reason in ('visitor','closing'));

create function private.museum_closing_at(p_started_at timestamptz)
returns timestamptz language plpgsql stable set search_path = '' as $$
declare day date := (p_started_at at time zone 'Asia/Jakarta')::date; closing time;
begin
  select closing_time into closing from private.museum_calendar where visit_date=day;
  if not found then
    select closing_time into closing from private.museum_hours where weekday=extract(dow from day)::integer;
  end if;
  if closing is null then raise sqlstate 'PT503' using message='MUSEUM_SCHEDULE_MISSING'; end if;
  return (day + closing) at time zone 'Asia/Jakarta';
end $$;

create function private.set_visit_hours() returns trigger language plpgsql set search_path = '' as $$
begin
  new.closing_at := private.museum_closing_at(new.start_time);
  if new.planned_end_at is not null then
    new.planned_end_at := least(new.planned_end_at, new.closing_at);
  end if;
  return new;
end $$;
create trigger visit_hours before insert or update of start_time on public.sesi_kunjungan
for each row execute function private.set_visit_hours();

create function private.owned_visit(p_user_id uuid, p_id_sesi uuid)
returns public.sesi_kunjungan language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan;
begin
  select * into visit from public.sesi_kunjungan where id_sesi=p_id_sesi and user_id=p_user_id for update;
  if not found then raise sqlstate 'PT404' using message='SESSION_NOT_FOUND'; end if;
  return visit;
end $$;

create or replace function private.require_session(p_user_id uuid, p_id_sesi uuid)
returns public.sesi_kunjungan language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan; closing timestamptz;
begin
  visit := private.owned_visit(p_user_id,p_id_sesi);
  if visit.status <> 'aktif' then raise sqlstate 'PT409' using message='SESSION_FINISHED'; end if;
  closing := private.museum_closing_at(visit.start_time);
  if now() >= closing then raise sqlstate 'PT409' using message='MUSEUM_CLOSED'; end if;
  return visit;
end $$;

-- Semua jawaban tetap melewati require_session; ringkasan boleh dibaca setelah selesai.
create function public.status_kunjungan(p_user_id uuid, p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan; closing timestamptz;
begin
  visit := private.owned_visit(p_user_id,p_id_sesi);
  closing := private.museum_closing_at(visit.start_time);
  update public.sesi_kunjungan set closing_at=closing,
    status=case when status='aktif' and now()>=closing then 'selesai' else status end,
    end_time=case when status='aktif' and now()>=closing then closing else end_time end,
    ended_reason=case when status='aktif' and now()>=closing then 'closing' else ended_reason end,
    planned_end_at=least(planned_end_at,closing)
    where id_sesi=p_id_sesi returning * into visit;
  return jsonb_build_object('visit',to_jsonb(visit)-'user_id','serverNow',now());
end $$;

alter function public.simpan_personalisasi(uuid,uuid,jsonb,text) rename to simpan_personalisasi_base;
alter function public.simpan_personalisasi_base(uuid,uuid,jsonb,text) set schema private;
create function public.simpan_personalisasi(p_user_id uuid,p_id_sesi uuid,p_preferences jsonb,p_wings text)
returns jsonb language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan; result jsonb; minutes integer; closing timestamptz; deadline timestamptz;
begin
  visit := private.require_session(p_user_id,p_id_sesi);
  result := private.simpan_personalisasi_base(p_user_id,p_id_sesi,p_preferences,p_wings);
  closing := private.museum_closing_at(visit.start_time);
  minutes := case p_preferences->>'duration' when '< 30 menit' then 30 when '30-45 Menit' then 45 when '45 menit-1.5 Jam' then 90 else null end;
  deadline := least(closing,visit.start_time+minutes*interval '1 minute');
  -- Mengirim ulang preferensi yang sama tidak menghapus tambahan waktu.
  if visit.personalization=p_preferences and visit.planned_end_at is not null then deadline:=least(visit.planned_end_at,closing); end if;
  update public.sesi_kunjungan set planned_end_at=deadline,closing_at=closing,
    closing_limited=minutes is null or closing < visit.start_time+minutes*interval '1 minute'
    where id_sesi=p_id_sesi returning * into visit;
  return to_jsonb(visit)-'user_id';
end $$;

create function public.tambah_waktu_kunjungan(p_user_id uuid,p_id_sesi uuid,p_request_id uuid,p_minutes integer)
returns jsonb language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan; previous private.visit_extensions; deadline timestamptz; closing timestamptz;
begin
  visit := private.require_session(p_user_id,p_id_sesi);
  if p_minutes is null or p_minutes not in (10,20,30) or p_request_id is null then
    raise sqlstate 'PT400' using message='VISIT_EXTENSION_INVALID';
  end if;
  select * into previous from private.visit_extensions where id_sesi=p_id_sesi and request_id=p_request_id;
  if found then
    if previous.minutes<>p_minutes then raise sqlstate 'PT409' using message='VISIT_EXTENSION_CONFLICT'; end if;
    return to_jsonb(visit)-'user_id';
  end if;
  closing := private.museum_closing_at(visit.start_time);
  if visit.planned_end_at is null then raise sqlstate 'PT409' using message='VISIT_PLAN_REQUIRED'; end if;
  deadline := greatest(visit.planned_end_at,now())+p_minutes*interval '1 minute';
  if deadline>closing-interval '5 minutes' then raise sqlstate 'PT409' using message='VISIT_EXTENSION_TOO_LATE'; end if;
  update public.sesi_kunjungan set planned_end_at=deadline, closing_at=closing,closing_limited=false
    where id_sesi=p_id_sesi returning * into visit;
  insert into private.visit_extensions values(p_id_sesi,p_request_id,p_minutes);
  return to_jsonb(visit)-'user_id';
end $$;

create function public.selesaikan_kunjungan(p_user_id uuid,p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare visit public.sesi_kunjungan; closing timestamptz;
begin
  visit := private.owned_visit(p_user_id,p_id_sesi);
  closing := private.museum_closing_at(visit.start_time);
  if visit.status='aktif' then
    update public.sesi_kunjungan set status='selesai',end_time=least(now(),closing),
      closing_at=closing,ended_reason=case when now()>=closing then 'closing' else 'visitor' end
      where id_sesi=p_id_sesi returning * into visit;
  end if;
  return to_jsonb(visit)-'user_id';
end $$;

revoke all on function public.status_kunjungan, public.simpan_personalisasi, public.tambah_waktu_kunjungan, public.selesaikan_kunjungan from public, anon, authenticated;
grant execute on function public.status_kunjungan, public.simpan_personalisasi, public.tambah_waktu_kunjungan, public.selesaikan_kunjungan to service_role;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;

create or replace function public.progres_kunjungan(p_user_id uuid, p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  total_pts int;
begin
  visit := private.owned_visit(p_user_id, p_id_sesi);
  select coalesce(sum(nilai_poin)::int, 0) into total_pts from public.points where id_sesi = p_id_sesi;

  return jsonb_build_object(
    'session', to_jsonb(visit) - 'user_id',
    'totalPoints', total_pts,
    'cards', coalesce((select jsonb_agg(to_jsonb(k)) from public.menampilkan_kartu k where k.id_sesi = p_id_sesi), '[]'::jsonb),
    'quests', coalesce((select jsonb_agg(to_jsonb(m) || jsonb_build_object(
      'id_poi',q.id_poi,'type',q.tipe_quest,'pointsAwarded',coalesce(s.nilai_poin,0),
      'failed',not m.answer_correct and m.jumlah_percobaan>=q.batas_percobaan
    )) from public.mengerjakan m join public.quest q using(id_quest)
    left join private.quest_scores s on s.id_sesi=m.id_sesi and s.id_quest=m.id_quest
    where m.id_sesi=p_id_sesi), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kodeBadge', b.kode_badge,
        'nama', b.nama,
        'bonusPoin', b.bonus_poin,
        'earnedAt', ub.earned_at
      ))
      from public.user_badge ub join public.badge b using (kode_badge)
      where ub.id_sesi = p_id_sesi
    ), '[]'::jsonb),
    'poiProgress', coalesce((select jsonb_agg(to_jsonb(pp)) from public.poi_progress pp where pp.id_sesi = p_id_sesi), '[]'::jsonb)
  );
end $$;

create or replace function private.simpan_personalisasi_base(
  p_user_id uuid, p_id_sesi uuid, p_preferences jsonb, p_wings text
) returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  selected_age text := p_preferences->>'age';
  selected_duration text := p_preferences->>'duration';
  selected_topics jsonb := p_preferences->'topics';
  chosen_minutes integer;
  configured_close_at timestamptz;
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
  configured_close_at := private.museum_closing_at(visit.start_time);
  deadline := greatest(visit.start_time, least(configured_close_at, visit.start_time + chosen_minutes * interval '1 minute'));
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
    closing_limited = chosen_minutes is null or configured_close_at < visit.start_time + chosen_minutes * interval '1 minute'
    where id_sesi = p_id_sesi returning * into visit;
  return to_jsonb(visit) - 'user_id';
end $$;

