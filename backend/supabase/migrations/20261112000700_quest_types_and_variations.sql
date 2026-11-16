-- Migration Sprint 2: Penyesuaian Tipe Quest, Variasi Jawaban, dan Aturan Profil Anak
-- Mendukung tipe: pilgan, foto, isian_singkat, benar_salah, cocokkan.
-- Menyediakan kolom target_foto, kunci_isian, variasi_jawaban pada quest_teks.
-- Memperbarui check_poi_publication, jawab_quest, dan evaluasi lencana.

-- 1. Perluas constraint tipe_quest pada public.quest
alter table public.quest drop constraint if exists quest_tipe_quest_check;
alter table public.quest add constraint quest_tipe_quest_check
  check (tipe_quest in ('pilgan', 'foto', 'isian_singkat', 'benar_salah', 'cocokkan'));

-- 2. Tambah kolom pendukung pada public.quest_teks
alter table public.quest_teks
  add column if not exists target_foto text,
  add column if not exists kunci_isian text,
  add column if not exists variasi_jawaban text[],
  add column if not exists penjelasan text;

-- 3. Izinkan label_opsi_terakhir nullable pada public.mengerjakan (untuk quest foto & isian)
alter table public.mengerjakan alter column label_opsi_terakhir drop not null;
alter table public.mengerjakan add column if not exists jawaban_teks_terakhir text;

-- 4. Izinkan label_opsi nullable pada private.quest_attempts
alter table private.quest_attempts alter column label_opsi drop not null;
alter table private.quest_attempts add column if not exists jawaban_teks text;
alter table private.quest_attempts add column if not exists photo_taken boolean not null default false;

-- 5. Perbarui fungsi validasi publikasi POI berdasarkan tipe quest
create or replace function private.check_poi_publication()
returns trigger language plpgsql set search_path = '' as $$
declare
  quest_rec record;
  variant public.konten;
begin
  if not new.is_published then return new; end if;

  if new.path_foto is null or new.denah_x is null or new.denah_y is null
    or new.prioritas is null or new.estimasi_durasi is null then
    raise sqlstate 'PT409' using message = 'POI_DETAILS_INCOMPLETE';
  end if;

  select * into quest_rec from public.quest where id_poi = new.id_poi;
  if quest_rec.id_quest is null or not exists (select 1 from public.konten where id_poi = new.id_poi) then
    raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
  end if;

  -- Validasi jumlah opsi berdasarkan tipe quest
  if quest_rec.tipe_quest in ('pilgan', 'cocokkan') then
    if (select count(*) from public.quest_opsi where id_quest = quest_rec.id_quest) <> 4 or
       (select count(*) from public.quest_opsi where id_quest = quest_rec.id_quest and is_correct) <> 1 then
      raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
    end if;
  elsif quest_rec.tipe_quest = 'benar_salah' then
    if (select count(*) from public.quest_opsi where id_quest = quest_rec.id_quest) <> 2 or
       (select count(*) from public.quest_opsi where id_quest = quest_rec.id_quest and is_correct) <> 1 then
      raise sqlstate 'PT409' using message = 'POI_STORIES_INCOMPLETE';
    end if;
  end if;

  -- Validasi teks per varian bahasa & profil
  for variant in select * from public.konten where id_poi = new.id_poi loop
    if variant.path_audio is null or variant.durasi_audio is null then
      raise sqlstate 'PT409' using message = 'POI_AUDIO_INCOMPLETE';
    end if;

    if not exists (select 1 from public.quest_teks where id_quest = quest_rec.id_quest
      and bahasa = variant.bahasa and profil = variant.profil) then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    end if;

    if quest_rec.tipe_quest in ('pilgan', 'cocokkan') and
       (select count(*) from public.quest_opsi_text where id_quest = quest_rec.id_quest and bahasa = variant.bahasa) <> 4 then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    elsif quest_rec.tipe_quest = 'benar_salah' and
       (select count(*) from public.quest_opsi_text where id_quest = quest_rec.id_quest and bahasa = variant.bahasa) <> 2 then
      raise sqlstate 'PT409' using message = 'POI_VARIANT_INCOMPLETE';
    end if;
  end loop;

  return new;
end $$;

-- 6. Fungsi Evaluasi Lencana (BD-01, BD-02, BD-04, BD-05)
create or replace function private.evaluasi_lencana(p_id_sesi uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan;
  total_active_pois int;
  left_active_pois int;
  right_active_pois int;
  completed_all int;
  completed_left int;
  completed_right int;
  perfect_all int;
  new_badges text[] := '{}';
begin
  select * into visit from public.sesi_kunjungan where id_sesi = p_id_sesi;
  if not found then return '[]'::jsonb; end if;

  -- Hitung total POI terpublikasi per zona
  select
    count(*),
    count(*) filter (where id_zona = '20000000-0000-4000-8000-000000000001'),
    count(*) filter (where id_zona = '20000000-0000-4000-8000-000000000002')
  into total_active_pois, left_active_pois, right_active_pois
  from public.poi where is_published;

  -- Hitung POI yang selesai dikerjakan pada sesi ini
  select
    count(*),
    count(*) filter (where p.id_zona = '20000000-0000-4000-8000-000000000001'),
    count(*) filter (where p.id_zona = '20000000-0000-4000-8000-000000000002'),
    count(*) filter (where m.answer_correct and m.jumlah_percobaan = 1)
  into completed_all, completed_left, completed_right, perfect_all
  from public.mengerjakan m
  join public.quest q using (id_quest)
  join public.poi p using (id_poi)
  where m.id_sesi = p_id_sesi and p.is_published and (m.answer_correct or m.jumlah_percobaan >= 3);

  -- Evaluasi BD-01: Penjelajah Sayap Kiri
  if left_active_pois > 0 and completed_left >= left_active_pois then
    if not exists (select 1 from public.user_badge where id_sesi = p_id_sesi and kode_badge = 'BD-01') then
      insert into public.user_badge (id_sesi, kode_badge) values (p_id_sesi, 'BD-01') on conflict do nothing;
      insert into public.points (id_sesi, kode_badge, komponen, nilai_poin)
        values (p_id_sesi, 'BD-01', 'badge', 50) on conflict do nothing;
      new_badges := array_append(new_badges, 'BD-01');
    end if;
  end if;

  -- Evaluasi BD-02: Penjelajah Sayap Kanan
  if right_active_pois > 0 and completed_right >= right_active_pois then
    if not exists (select 1 from public.user_badge where id_sesi = p_id_sesi and kode_badge = 'BD-02') then
      insert into public.user_badge (id_sesi, kode_badge) values (p_id_sesi, 'BD-02') on conflict do nothing;
      insert into public.points (id_sesi, kode_badge, komponen, nilai_poin)
        values (p_id_sesi, 'BD-02', 'badge', 50) on conflict do nothing;
      new_badges := array_append(new_badges, 'BD-02');
    end if;
  end if;

  -- Evaluasi BD-04: Otak Geologi (Semua kuis benar di percobaan ke-1)
  if total_active_pois > 0 and perfect_all >= total_active_pois then
    if not exists (select 1 from public.user_badge where id_sesi = p_id_sesi and kode_badge = 'BD-04') then
      insert into public.user_badge (id_sesi, kode_badge) values (p_id_sesi, 'BD-04') on conflict do nothing;
      insert into public.points (id_sesi, kode_badge, komponen, nilai_poin)
        values (p_id_sesi, 'BD-04', 'badge', 40) on conflict do nothing;
      new_badges := array_append(new_badges, 'BD-04');
    end if;
  end if;

  -- Evaluasi BD-05: Geolog Sejati (Selesaikan semua POI aktif)
  if total_active_pois > 0 and completed_all >= total_active_pois then
    if not exists (select 1 from public.user_badge where id_sesi = p_id_sesi and kode_badge = 'BD-05') then
      insert into public.user_badge (id_sesi, kode_badge) values (p_id_sesi, 'BD-05') on conflict do nothing;
      insert into public.points (id_sesi, kode_badge, komponen, nilai_poin)
        values (p_id_sesi, 'BD-05', 'badge', 100) on conflict do nothing;
      new_badges := array_append(new_badges, 'BD-05');
    end if;
  end if;

  return to_jsonb(new_badges);
end $$;

-- 7. Perbarui RPC public.jawab_quest dengan dukungan pilgan, isian, foto
drop function if exists public.jawab_quest(uuid, uuid, uuid, text, uuid);

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
  user_input_text text;
  newly_badges jsonb;
  is_failed boolean := false;
begin
  visit := private.require_session(p_user_id, p_id_sesi);

  -- Idempotency check
  select * into attempt from private.quest_attempts
    where id_sesi = p_id_sesi and request_id = p_request_id;
  if found then
    if attempt.id_quest <> p_id_quest or (attempt.label_opsi is distinct from p_label_opsi) then
      raise sqlstate 'PT409' using message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return attempt.response;
  end if;

  -- Validasi keberadaan quest dan POI aktif
  select q.* into question from public.quest q join public.poi p using (id_poi)
    where q.id_quest = p_id_quest and p.is_published;
  if not found then raise sqlstate 'PT404' using message = 'QUEST_NOT_FOUND'; end if;

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
  if found and progress.jumlah_percobaan >= 3 then
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
  elsif question.tipe_quest = 'foto' then
    -- Quest foto: foto terverifikasi bila photo_taken true atau diberikan bukti
    if p_photo_taken or (p_label_opsi is not null and length(btrim(p_label_opsi)) > 0) then
      correct := true;
    else
      raise sqlstate 'PT400' using message = 'PHOTO_PROOF_REQUIRED';
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

  -- Hitung poin jika benar (Aturan Sprint 2: 20/10/5/0 untuk kuis/isian, 10 untuk foto)
  if correct then
    if question.tipe_quest = 'foto' then
      earned_point := 10;
    else
      earned_point := case progress.jumlah_percobaan
        when 1 then 20
        when 2 then 10
        when 3 then 5
        else 0
      end;
    end if;

    -- Simpan poin dengan proteksi anti-ganda
    insert into public.points (id_sesi, id_poi, komponen, nilai_poin)
      values (p_id_sesi, question.id_poi, case when question.tipe_quest = 'foto' then 'foto' else 'kuis' end, earned_point)
      on conflict (id_sesi, id_poi, komponen) do nothing;
  else
    if progress.jumlah_percobaan >= 3 then
      is_failed := true;
    end if;
  end if;

  -- Update poi_progress
  insert into public.poi_progress (
    id_sesi, id_poi, status, qr_terverifikasi, kuis_selesai, kuis_gagal,
    jumlah_percobaan, poin_kuis, updated_at
  ) values (
    p_id_sesi, question.id_poi,
    case when correct or is_failed then 'selesai' else 'sebagian' end,
    true, correct, is_failed, progress.jumlah_percobaan, earned_point, now()
  )
  on conflict (id_sesi, id_poi) do update set
    status = case when correct or is_failed then 'selesai' else 'sebagian' end,
    kuis_selesai = public.poi_progress.kuis_selesai or correct,
    kuis_gagal = is_failed,
    jumlah_percobaan = progress.jumlah_percobaan,
    poin_kuis = greatest(public.poi_progress.poin_kuis, earned_point),
    updated_at = now();

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

-- 8. Perbarui progres_kunjungan agar mengembalikan totalPoints, badges, dan poiProgress
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
    'quests', coalesce((select jsonb_agg(to_jsonb(m)) from public.mengerjakan m where m.id_sesi = p_id_sesi), '[]'::jsonb),
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

-- Hak akses service_role
grant execute on function public.jawab_quest to service_role;
grant execute on function public.progres_kunjungan to service_role;
grant execute on function private.evaluasi_lencana to service_role;
grant execute on function private.check_poi_publication to service_role;

revoke all on function public.jawab_quest from public, anon, authenticated;
revoke all on function public.progres_kunjungan from public, anon, authenticated;
revoke all on function private.evaluasi_lencana from public, anon, authenticated;
revoke all on function private.check_poi_publication from public, anon, authenticated;
