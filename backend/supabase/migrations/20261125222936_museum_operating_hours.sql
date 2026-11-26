-- Jadwal Museum Geologi: data/museum-hours.json. Kalender libur harus diperbarui tiap tahun.
alter table private.museum_hours
  alter column closing_time drop not null,
  add column opening_time time,
  add column is_closed boolean not null default false;
alter table private.museum_calendar
  alter column closing_time drop not null,
  add column opening_time time,
  add column is_closed boolean not null default false;
update private.museum_calendar set opening_time=time '09:00';
update private.museum_calendar set opening_time=null,closing_time=null,is_closed=true where closing_time=time '00:00';

create table private.museum_calendar_years(year integer primary key check(year between 2000 and 9999));
alter table private.museum_calendar_years enable row level security;
revoke all on private.museum_calendar_years from public,anon,authenticated;
grant all on private.museum_calendar_years to service_role;

-- BEGIN GENERATED MUSEUM HOURS
update private.museum_hours set opening_time='09:00',closing_time='14:00',is_closed=false where weekday=0;
update private.museum_hours set opening_time='09:00',closing_time='16:00',is_closed=false where weekday=1;
update private.museum_hours set opening_time='09:00',closing_time='16:00',is_closed=false where weekday=2;
update private.museum_hours set opening_time='09:00',closing_time='16:00',is_closed=false where weekday=3;
update private.museum_hours set opening_time='09:00',closing_time='16:00',is_closed=false where weekday=4;
update private.museum_hours set opening_time=NULL,closing_time=NULL,is_closed=true where weekday=5;
update private.museum_hours set opening_time='09:00',closing_time='14:00',is_closed=false where weekday=6;
insert into private.museum_calendar_years(year) values (2026),(2027) on conflict do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-01-01',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-01-16',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-02-17',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-19',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-21',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-22',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-04-03',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-04-05',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-05-01',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-05-14',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-05-27',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-05-31',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-06-01',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-06-16',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-08-17',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-08-25',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-12-25',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-01-01',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-01-05',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-02-06',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-08',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-10',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-11',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-26',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-28',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-05-01',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-05-06',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-05-17',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-05-20',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-06-01',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-06-06',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-08-15',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-08-17',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-12-25',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-12-26',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-02-16',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-18',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-20',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-23',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-03-24',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-05-15',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-05-28',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-12-24',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-02-05',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-09',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-12',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-15',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-03-25',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-05-18',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-05-19',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2027-12-24',NULL,NULL,true) on conflict(visit_date) do nothing;
insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values('2026-11-26','06:00','16:00',false) on conflict(visit_date) do update set opening_time=excluded.opening_time,closing_time=excluded.closing_time,is_closed=false;
-- END GENERATED MUSEUM HOURS

alter table private.museum_hours add constraint museum_hours_window check(
  (is_closed and opening_time is null and closing_time is null)
  or (not is_closed and opening_time is not null and closing_time is not null and opening_time<closing_time)
);
alter table private.museum_calendar add constraint museum_calendar_window check(
  (is_closed and opening_time is null and closing_time is null)
  or (not is_closed and opening_time is not null and closing_time is not null and opening_time<closing_time)
);

/** Closed dates have an empty window at midnight WIB, preserving access to historical visit summaries. */
create function private.museum_schedule(p_at timestamptz)
returns table(opening_at timestamptz,closing_at timestamptz,is_closed boolean)
language plpgsql stable set search_path='' as $$
declare day date := (p_at at time zone 'Asia/Jakarta')::date; hours record;
begin
  if p_at is null or not exists(select 1 from private.museum_calendar_years where year=extract(year from day)::integer) then
    raise sqlstate 'PT503' using message='MUSEUM_SCHEDULE_MISSING',detail=format('date=%s',day);
  end if;
  select c.opening_time,c.closing_time,c.is_closed into hours from private.museum_calendar c where c.visit_date=day;
  if not found then
    select h.opening_time,h.closing_time,h.is_closed into hours from private.museum_hours h where h.weekday=extract(dow from day)::integer;
    if not found then raise sqlstate 'PT503' using message='MUSEUM_SCHEDULE_MISSING',detail=format('date=%s',day); end if;
  end if;
  is_closed := hours.is_closed;
  if hours.is_closed then
    opening_at := day::timestamp at time zone 'Asia/Jakarta';
    closing_at := opening_at;
  else
    opening_at := (day+hours.opening_time) at time zone 'Asia/Jakarta';
    closing_at := (day+hours.closing_time) at time zone 'Asia/Jakarta';
  end if;
  return next;
end $$;

create or replace function private.museum_closing_at(p_started_at timestamptz)
returns timestamptz language sql stable set search_path='' as $$
  select closing_at from private.museum_schedule(p_started_at);
$$;

create function private.require_museum_open(p_at timestamptz)
returns void language plpgsql stable set search_path='' as $$
declare hours record;
begin
  select * into hours from private.museum_schedule(p_at);
  if hours.is_closed then raise sqlstate 'PT403' using message='MUSEUM_CLOSED_DAY'; end if;
  if p_at<hours.opening_at then raise sqlstate 'PT403' using message='MUSEUM_NOT_OPEN'; end if;
  if p_at>=hours.closing_at then raise sqlstate 'PT409' using message='MUSEUM_CLOSED'; end if;
end $$;

/** New sessions require open hours; historical visits remain readable and can be closed after hours. */
create or replace function private.set_visit_hours() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' then perform private.require_museum_open(new.start_time); end if;
  new.closing_at := private.museum_closing_at(new.start_time);
  if new.planned_end_at is not null then new.planned_end_at := least(new.planned_end_at,new.closing_at); end if;
  return new;
end $$;

create or replace function private.require_session(p_user_id uuid,p_id_sesi uuid)
returns public.sesi_kunjungan language plpgsql set search_path='' as $$
declare visit public.sesi_kunjungan; closing timestamptz;
begin
  visit := private.owned_visit(p_user_id,p_id_sesi);
  if visit.status<>'aktif' then raise sqlstate 'PT409' using message='SESSION_FINISHED'; end if;
  closing := private.museum_closing_at(visit.start_time);
  if now()>=closing then raise sqlstate 'PT409' using message='MUSEUM_CLOSED'; end if;
  perform private.require_museum_open(now());
  return visit;
end $$;

-- Update deadlines for existing visits without deleting progress or rewards.
update public.sesi_kunjungan v set
  closing_at=private.museum_closing_at(v.start_time),
  planned_end_at=case when v.planned_end_at is null then null else least(v.planned_end_at,private.museum_closing_at(v.start_time)) end
where exists(select 1 from private.museum_calendar_years y where y.year=extract(year from v.start_time at time zone 'Asia/Jakarta')::integer);

revoke all on function private.museum_schedule,private.require_museum_open from public,anon,authenticated;
grant execute on function private.museum_schedule,private.require_museum_open to service_role;
