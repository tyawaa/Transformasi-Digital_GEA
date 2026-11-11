-- Profil konten mengikuti kelompok usia dari preferensi aplikasi:
--   anak (7-12 tahun), remaja (13-17 tahun), dewasa (18+ tahun).
-- Data lama dipetakan: 'umum' -> 'dewasa', 'pelajar' -> 'anak'.
-- Teks yang belum punya versi usia tertentu memakai versi 'dewasa' (lihat gea-api/stories.ts
-- dan hint di jawab_quest di bawah).

alter table public.konten drop constraint konten_profil_check;
alter table public.quest_teks drop constraint quest_teks_profil_check;
alter table public.sesi_kunjungan drop constraint sesi_kunjungan_profil_check;

update public.konten set profil = case profil when 'pelajar' then 'anak' else 'dewasa' end
  where profil in ('umum', 'pelajar');
update public.quest_teks set profil = case profil when 'pelajar' then 'anak' else 'dewasa' end
  where profil in ('umum', 'pelajar');
update public.sesi_kunjungan set profil = case profil when 'pelajar' then 'anak' else 'dewasa' end
  where profil in ('umum', 'pelajar');

alter table public.konten add constraint konten_profil_check
  check (profil in ('anak', 'remaja', 'dewasa'));
alter table public.quest_teks add constraint quest_teks_profil_check
  check (profil in ('anak', 'remaja', 'dewasa'));
alter table public.sesi_kunjungan add constraint sesi_kunjungan_profil_check
  check (profil in ('anak', 'remaja', 'dewasa'));

-- Hint quest: varian usia sesi bila ada, selain itu versi 'dewasa'.
-- Selain baris hint, fungsi identik dengan migrasi 20261103000100.
create or replace function public.jawab_quest(
  p_user_id uuid, p_id_sesi uuid, p_id_quest uuid, p_label_opsi text, p_request_id uuid
) returns jsonb language plpgsql set search_path = '' as $$
declare
  visit public.sesi_kunjungan; attempt private.quest_attempts; progress public.mengerjakan;
  question public.quest; correct boolean; hint_text text; result jsonb;
begin
  visit := private.require_session(p_user_id, p_id_sesi);
  select * into attempt from private.quest_attempts
    where id_sesi = p_id_sesi and request_id = p_request_id;
  if found then
    if attempt.id_quest <> p_id_quest or attempt.label_opsi <> p_label_opsi then
      raise sqlstate 'PT409' using message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return attempt.response;
  end if;
  select q.* into question from public.quest q join public.poi p using (id_poi)
    where q.id_quest = p_id_quest and p.is_published;
  if not found then raise sqlstate 'PT404' using message = 'QUEST_NOT_FOUND'; end if;
  if not exists (select 1 from private.poi_verification
    where id_sesi = p_id_sesi and id_poi = question.id_poi and expires_at > now()) then
    raise sqlstate 'PT403' using message = 'CHECKPOINT_VERIFICATION_REQUIRED';
  end if;
  select is_correct into correct from public.quest_opsi
    where id_quest = p_id_quest and label_opsi = p_label_opsi;
  if not found then raise sqlstate 'PT400' using message = 'OPTION_NOT_FOUND'; end if;
  select * into progress from public.mengerjakan
    where id_sesi = p_id_sesi and id_quest = p_id_quest;
  if found and progress.answer_correct then
    raise sqlstate 'PT409' using message = 'QUEST_ALREADY_COMPLETED';
  end if;
  select hint into hint_text from public.quest_teks
    where id_quest = p_id_quest and bahasa = visit.bahasa and profil in (visit.profil, 'dewasa')
    order by (profil = visit.profil) desc
    limit 1;
  if not found then raise sqlstate 'PT409' using message = 'QUEST_VARIANT_NOT_AVAILABLE'; end if;
  insert into public.mengerjakan
    (id_sesi, id_quest, jumlah_percobaan, hint_dipakai, answer_correct, label_opsi_terakhir)
    values (p_id_sesi, p_id_quest, 1, not correct, correct, p_label_opsi)
    on conflict (id_sesi, id_quest) do update set
      jumlah_percobaan = public.mengerjakan.jumlah_percobaan + 1,
      hint_dipakai = public.mengerjakan.hint_dipakai or not correct,
      answer_correct = correct, label_opsi_terakhir = p_label_opsi
    returning * into progress;
  result := jsonb_build_object('idQuest', p_id_quest, 'idPoi', question.id_poi,
    'answerCorrect', correct, 'attemptCount', progress.jumlah_percobaan,
    'completed', correct, 'hint', case when correct then null else hint_text end);
  insert into private.quest_attempts (id_sesi, request_id, id_quest, label_opsi, response)
    values (p_id_sesi, p_request_id, p_id_quest, p_label_opsi, result);
  return result;
end $$;

revoke all on function public.jawab_quest(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.jawab_quest(uuid, uuid, uuid, text, uuid) to service_role;
