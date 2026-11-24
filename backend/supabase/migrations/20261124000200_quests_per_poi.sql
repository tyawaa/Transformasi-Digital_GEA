-- Daftar quest per POI setelah cerita. Foto disiapkan sebagai slot, belum dapat dinilai.
alter table public.quest drop constraint quest_id_poi_key;
alter table public.quest
  add column kode_quest text unique,
  add column poin integer check(poin >= 0),
  add column batas_percobaan integer not null default 3 check(batas_percobaan between 1 and 3),
  add column wajib_badge boolean not null default true,
  add column urutan integer not null default 1;
alter table public.quest_teks add column kriteria_foto text;
create index quest_poi_urutan on public.quest(id_poi,urutan,id_quest);

create table private.quest_scores (
  id_sesi uuid not null references public.sesi_kunjungan on delete cascade,
  id_quest uuid not null references public.quest on delete cascade,
  nilai_poin integer not null check(nilai_poin >= 0),
  primary key(id_sesi,id_quest)
);
revoke all on private.quest_scores from public,anon,authenticated;
grant all on private.quest_scores to service_role;
-- Catat poin lama sebelum POI mendapat beberapa quest; poin sesi yang sudah ada tetap dipertahankan.
insert into private.quest_scores(id_sesi,id_quest,nilai_poin)
select p.id_sesi,q.id_quest,p.nilai_poin from public.points p join public.quest q using(id_poi)
where p.komponen in ('kuis','foto');

create or replace function public.tutup_kartu(p_user_id uuid,p_id_sesi uuid,p_id_poi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  story_only boolean;
begin
  visit := private.require_session(p_user_id,p_id_sesi);
  if not exists(select 1 from public.poi where id_poi=p_id_poi and is_published) then
    raise sqlstate 'PT404' using message='POI_NOT_FOUND';
  end if;
  insert into public.menampilkan_kartu(id_sesi,id_poi,status_kartu,waktu_ditutup)
  values(p_id_sesi,p_id_poi,'ditutup',now())
  on conflict(id_sesi,id_poi) do update set status_kartu='ditutup',
    waktu_ditutup=coalesce(public.menampilkan_kartu.waktu_ditutup,excluded.waktu_ditutup);
  story_only := not exists(select 1 from public.quest q where q.id_poi=p_id_poi
    and not(visit.profil='anak' and q.tipe_quest='foto'));
  insert into public.poi_progress(id_sesi,id_poi,kartu_ditutup,status,kuis_selesai)
  values(p_id_sesi,p_id_poi,true,case when story_only then 'selesai' else 'sebagian' end,story_only)
  on conflict(id_sesi,id_poi) do update set kartu_ditutup=true,
    kuis_selesai=public.poi_progress.kuis_selesai or excluded.kuis_selesai,
    status=case when story_only then 'selesai' else public.poi_progress.status end,updated_at=now();
  perform private.evaluasi_lencana(p_id_sesi);
  return jsonb_build_object('idPoi',p_id_poi,'statusKartu','ditutup');
end $$;

-- Setiap syarat dihitung dari quest masing-masing; beberapa quest pada satu POI tidak menambah jumlah POI.
create or replace function private.evaluasi_lencana(p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  new_badges text[] := '{}';
  badge_code text;
begin
  select * into visit from public.sesi_kunjungan where id_sesi=p_id_sesi;
  if not found then return '[]'::jsonb; end if;
  if exists(select 1 from public.poi where is_published and id_zona='20000000-0000-4000-8000-000000000001')
    and not exists(select 1 from public.poi p where p.is_published and p.id_zona='20000000-0000-4000-8000-000000000001'
      and not exists(select 1 from private.poi_verification v where v.id_sesi=p_id_sesi and v.id_poi=p.id_poi)) then
    new_badges := array_append(new_badges,'BD-01');
  end if;
  if visit.profil <> 'anak' and exists(select 1 from public.quest q join public.poi p using(id_poi) where p.is_published and q.tipe_quest='foto' and q.wajib_badge)
    and not exists(select 1 from public.quest q join public.poi p using(id_poi)
      left join public.mengerjakan m on m.id_quest=q.id_quest and m.id_sesi=p_id_sesi
      where p.is_published and q.tipe_quest='foto' and q.wajib_badge and not coalesce(m.answer_correct,false)) then
    new_badges := array_append(new_badges,'BD-02');
  end if;
  if exists(select 1 from public.quest q join public.poi p using(id_poi) where p.is_published and q.tipe_quest<>'foto' and q.wajib_badge)
    and not exists(select 1 from public.quest q join public.poi p using(id_poi)
      left join public.mengerjakan m on m.id_quest=q.id_quest and m.id_sesi=p_id_sesi
      where p.is_published and q.tipe_quest<>'foto' and q.wajib_badge
        and not coalesce(m.answer_correct and m.jumlah_percobaan=1,false)) then
    new_badges := array_append(new_badges,'BD-03');
  end if;
  if exists(select 1 from public.poi where is_published)
    and not exists(select 1 from public.poi p where p.is_published and (
      not exists(select 1 from public.menampilkan_kartu k where k.id_sesi=p_id_sesi and k.id_poi=p.id_poi and k.status_kartu='ditutup')
      or exists(select 1 from public.quest q left join public.mengerjakan m on m.id_quest=q.id_quest and m.id_sesi=p_id_sesi
        where q.id_poi=p.id_poi and not(visit.profil='anak' and q.tipe_quest='foto')
          and not coalesce(m.answer_correct or m.jumlah_percobaan>=q.batas_percobaan,false)))) then
    new_badges := array_append(new_badges,'BD-04');
  end if;
  foreach badge_code in array new_badges loop
    if not private.beri_lencana(p_id_sesi,badge_code) then
      new_badges := array_remove(new_badges,badge_code);
    end if;
  end loop;
  return to_jsonb(new_badges);
end $$;

create or replace function public.jawab_quest(
  p_user_id uuid,
  p_id_sesi uuid,
  p_id_quest uuid,
  p_label_opsi text default null,
  p_request_id uuid default null,
  p_jawaban_teks text default null,
  p_photo_taken boolean default false
) returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  attempt private.quest_attempts;
  progress public.mengerjakan;
  question public.quest;
  q_text public.quest_teks;
  correct boolean := false;
  hint_text text;
  result jsonb;
  earned_point int := 0;
  total_pts int := 0;
  total_quests int;
  correct_quests int;
  resolved_quests int;
  poi_points int;
  poi_attempts int;
  user_input_text text;
  newly_badges jsonb;
  is_failed boolean := false;
begin
  visit := private.require_session(p_user_id, p_id_sesi);

  -- Serialisasi jawaban satu sesi agar retry dan jawaban beberapa quest tidak menggandakan poin.
  perform 1 from public.sesi_kunjungan where id_sesi = p_id_sesi for update;
  -- Idempotency check
  select * into attempt from private.quest_attempts
    where id_sesi = p_id_sesi and request_id = p_request_id;
  if found then
    if attempt.id_quest <> p_id_quest or (attempt.label_opsi is distinct from p_label_opsi)
      or (attempt.jawaban_teks is distinct from p_jawaban_teks)
      or (attempt.photo_taken is distinct from p_photo_taken) then
      raise sqlstate 'PT409' using message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return attempt.response;
  end if;

  -- Validasi keberadaan quest dan POI aktif
  select q.* into question from public.quest q join public.poi p using (id_poi)
    where q.id_quest = p_id_quest and p.is_published;
  if not found then raise sqlstate 'PT404' using message = 'QUEST_NOT_FOUND'; end if;

  if question.kode_quest is not null and not exists (
    select 1 from public.menampilkan_kartu where id_sesi = p_id_sesi and id_poi = question.id_poi and status_kartu = 'ditutup'
  ) then
    raise sqlstate 'PT403' using message = 'STORY_COMPLETION_REQUIRED';
  end if;
  if question.tipe_quest = 'foto' then
    raise sqlstate 'PT503' using message = 'PHOTO_QUEST_NOT_AVAILABLE';
  end if;

  -- Verifikasi checkpoint wajib aktif
  if not exists (select 1 from private.poi_verification
    where id_sesi = p_id_sesi and id_poi = question.id_poi and expires_at > now()) then
    raise sqlstate 'PT403' using message = 'CHECKPOINT_VERIFICATION_REQUIRED';
  end if;

  -- Cek apakah quest sudah selesai sebelumnya
  select * into progress from public.mengerjakan
    where id_sesi = p_id_sesi and id_quest = p_id_quest;
  if found and progress.answer_correct then
    raise sqlstate 'PT409' using message = 'QUEST_ALREADY_COMPLETED';
  end if;
  if found and progress.jumlah_percobaan >= question.batas_percobaan then
    raise sqlstate 'PT409' using message = 'QUEST_ATTEMPTS_EXCEEDED';
  end if;

  -- Ambil teks quest & hint sesuai bahasa dan profil
  select * into q_text from public.quest_teks
    where id_quest = p_id_quest and bahasa = visit.bahasa and profil in (visit.profil, 'dewasa')
    order by (profil = visit.profil) desc limit 1;
  if not found then raise sqlstate 'PT409' using message = 'QUEST_VARIANT_NOT_AVAILABLE'; end if;
  hint_text := q_text.hint;

  -- Evaluasi kebenaran jawaban berdasarkan tipe quest
  if question.tipe_quest in ('pilgan', 'benar_salah', 'cocokkan') then
    if p_label_opsi is null then
      raise sqlstate 'PT400' using message = 'OPTION_LABEL_REQUIRED';
    end if;
    select is_correct into correct from public.quest_opsi
      where id_quest = p_id_quest and label_opsi = p_label_opsi;
    if not found then raise sqlstate 'PT400' using message = 'OPTION_NOT_FOUND'; end if;
  elsif question.tipe_quest = 'isian_singkat' then
    user_input_text := lower(btrim(coalesce(p_jawaban_teks, p_label_opsi, '')));
    if length(user_input_text) = 0 then
      raise sqlstate 'PT400' using message = 'TEXT_ANSWER_REQUIRED';
    end if;
    -- Cocokkan dengan kunci isian atau variasi jawaban
    correct := (user_input_text = lower(btrim(coalesce(q_text.kunci_isian, ''))));
    if not correct and q_text.variasi_jawaban is not null then
      correct := exists (
        select 1 from unnest(q_text.variasi_jawaban) as v
        where lower(btrim(v)) = user_input_text
      );
    end if;

  end if;

  -- Catat pengerjaan
  insert into public.mengerjakan (
    id_sesi, id_quest, jumlah_percobaan, hint_dipakai, answer_correct,
    label_opsi_terakhir, jawaban_teks_terakhir, photo_taken, waktu_foto
  ) values (
    p_id_sesi, p_id_quest, 1, not correct, correct,
    p_label_opsi, p_jawaban_teks,
    case when question.tipe_quest = 'foto' and correct then true else false end,
    case when question.tipe_quest = 'foto' and correct then now() else null end
  )
  on conflict (id_sesi, id_quest) do update set
    jumlah_percobaan = public.mengerjakan.jumlah_percobaan + 1,
    hint_dipakai = public.mengerjakan.hint_dipakai or not correct,
    answer_correct = correct,
    label_opsi_terakhir = coalesce(excluded.label_opsi_terakhir, public.mengerjakan.label_opsi_terakhir),
    jawaban_teks_terakhir = coalesce(excluded.jawaban_teks_terakhir, public.mengerjakan.jawaban_teks_terakhir),
    photo_taken = public.mengerjakan.photo_taken or excluded.photo_taken,
    waktu_foto = coalesce(excluded.waktu_foto, public.mengerjakan.waktu_foto)
  returning * into progress;

  -- Nilai per quest dari sheet; quest lama tanpa metadata mempertahankan aturan sebelumnya.
  earned_point := case when not correct then 0 else coalesce(question.poin,
    case progress.jumlah_percobaan when 1 then 20 when 2 then 10 when 3 then 5 else 0 end) end;
  is_failed := not correct and progress.jumlah_percobaan >= question.batas_percobaan;
  if correct then
    insert into private.quest_scores(id_sesi,id_quest,nilai_poin)
    values (p_id_sesi,p_id_quest,earned_point) on conflict do nothing;
    insert into public.points(id_sesi,id_poi,komponen,nilai_poin)
    select p_id_sesi,question.id_poi,'kuis',coalesce(sum(s.nilai_poin),0)
    from private.quest_scores s join public.quest q using(id_quest)
    where s.id_sesi=p_id_sesi and q.id_poi=question.id_poi and q.tipe_quest <> 'foto'
    on conflict (id_sesi,id_poi,komponen) do update set nilai_poin=excluded.nilai_poin;
  end if;

  select count(*),count(*) filter(where m.answer_correct),
    count(*) filter(where m.answer_correct or m.jumlah_percobaan >= q.batas_percobaan),
    coalesce(max(m.jumlah_percobaan),0),coalesce(sum(s.nilai_poin),0)
  into total_quests,correct_quests,resolved_quests,poi_attempts,poi_points
  from public.quest q
  left join public.mengerjakan m on m.id_quest=q.id_quest and m.id_sesi=p_id_sesi
  left join private.quest_scores s on s.id_quest=q.id_quest and s.id_sesi=p_id_sesi
  where q.id_poi=question.id_poi and not (visit.profil='anak' and q.tipe_quest='foto');

  insert into public.poi_progress(id_sesi,id_poi,status,qr_terverifikasi,kuis_selesai,kuis_gagal,jumlah_percobaan,poin_kuis,updated_at)
  values(p_id_sesi,question.id_poi,case when resolved_quests=total_quests then 'selesai' else 'sebagian' end,
    true,correct_quests=total_quests,resolved_quests=total_quests and correct_quests<total_quests,poi_attempts,poi_points,now())
  on conflict(id_sesi,id_poi) do update set status=excluded.status,kuis_selesai=excluded.kuis_selesai,
    kuis_gagal=excluded.kuis_gagal,jumlah_percobaan=excluded.jumlah_percobaan,poin_kuis=excluded.poin_kuis,updated_at=now();

  -- Evaluasi lencana yang terbuka
  newly_badges := private.evaluasi_lencana(p_id_sesi);

  -- Hitung total poin akumulasi sesi
  select coalesce(sum(nilai_poin)::int, 0) into total_pts from public.points where id_sesi = p_id_sesi;

  result := jsonb_build_object(
    'idQuest', p_id_quest,
    'idPoi', question.id_poi,
    'type', question.tipe_quest,
    'answerCorrect', correct,
    'attemptCount', progress.jumlah_percobaan,
    'completed', correct,
    'failed', is_failed,
    'hint', case when correct or is_failed then null else hint_text end,
    'pointsAwarded', earned_point,
    'poiCompleted', correct_quests=total_quests,
    'poiFailed', resolved_quests=total_quests and correct_quests<total_quests,
    'poiPoints', poi_points,
    'totalPoints', total_pts,
    'newBadges', newly_badges
  );

  insert into private.quest_attempts (
    id_sesi, request_id, id_quest, label_opsi, jawaban_teks, photo_taken, response
  ) values (
    p_id_sesi, p_request_id, p_id_quest, p_label_opsi, p_jawaban_teks, p_photo_taken, result
  );

  return result;
end $$;


create or replace function public.progres_kunjungan(p_user_id uuid, p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  total_pts int;
begin
  visit := private.require_session(p_user_id, p_id_sesi);
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

  if not exists(select 1 from public.quest where id_poi=new.id_poi) or not exists (select 1 from public.konten where id_poi = new.id_poi) then
    raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
  end if;

  for quest_rec in select * from public.quest where id_poi=new.id_poi loop
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
  end loop;
  return new;
end $$;

