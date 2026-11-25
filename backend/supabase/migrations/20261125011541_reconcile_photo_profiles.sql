-- Selaraskan profil anak dari sheet rekaman dengan bukti foto tepercaya dan label opsional.
create or replace function public.prepare_photo_quest(
  p_user_id uuid,p_id_sesi uuid,p_id_quest uuid,p_request_id uuid,p_photo_sha256 text
) returns jsonb language plpgsql set search_path='' as $$
declare
  visit public.sesi_kunjungan;
  question public.quest;
  evaluation private.photo_evaluations;
  progress public.mengerjakan;
begin
  visit := private.require_session(p_user_id,p_id_sesi);
  perform 1 from public.sesi_kunjungan where id_sesi=p_id_sesi for update;
  if p_request_id is null or p_photo_sha256 is null or p_photo_sha256 !~ '^[a-f0-9]{64}$' then
    raise sqlstate 'PT400' using message='PHOTO_REQUEST_INVALID';
  end if;
  select * into evaluation from private.photo_evaluations where id_sesi=p_id_sesi and request_id=p_request_id;
  if found then
    if evaluation.id_quest<>p_id_quest or evaluation.photo_sha256<>p_photo_sha256 then
      raise sqlstate 'PT409' using message='IDEMPOTENCY_CONFLICT';
    end if;
    if evaluation.response is not null then return jsonb_build_object('replay',evaluation.response); end if;
  end if;
  if exists(select 1 from private.quest_attempts where id_sesi=p_id_sesi and request_id=p_request_id) then
    raise sqlstate 'PT409' using message='IDEMPOTENCY_CONFLICT';
  end if;
  select q.* into question from public.quest q join public.poi p using(id_poi)
    where q.id_quest=p_id_quest and p.is_published;
  if not found then raise sqlstate 'PT404' using message='QUEST_NOT_FOUND'; end if;
  if question.tipe_quest<>'foto' or question.kode_quest is null or question.kode_quest not in
    ('Q-001','Q-003','Q-005','Q-009','Q-011','Q-012','Q-013') then
    raise sqlstate 'PT409' using message='PHOTO_QUEST_NOT_CONFIGURED';
  end if;
  if not exists(select 1 from public.menampilkan_kartu where id_sesi=p_id_sesi
    and id_poi=question.id_poi and status_kartu='ditutup') then
    raise sqlstate 'PT403' using message='STORY_COMPLETION_REQUIRED';
  end if;
  if not exists(select 1 from private.poi_verification where id_sesi=p_id_sesi
    and id_poi=question.id_poi and expires_at>now()) then
    raise sqlstate 'PT403' using message='CHECKPOINT_VERIFICATION_REQUIRED';
  end if;
  select * into progress from public.mengerjakan where id_sesi=p_id_sesi and id_quest=p_id_quest;
  if found and progress.answer_correct then raise sqlstate 'PT409' using message='QUEST_ALREADY_COMPLETED'; end if;
  if found and progress.jumlah_percobaan>=question.batas_percobaan then
    raise sqlstate 'PT409' using message='QUEST_ATTEMPTS_EXCEEDED';
  end if;
  return jsonb_build_object('idQuest',p_id_quest,'idPoi',question.id_poi);
end $$;
revoke all on function public.prepare_photo_quest(uuid,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_photo_quest(uuid,uuid,uuid,uuid,text) to service_role;

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
  if visit.profil='anak' and question.tipe_quest<>'foto' then
    raise sqlstate 'PT403' using message='QUEST_NOT_FOR_PROFILE';
  end if;
  if question.tipe_quest = 'foto' then
    if not exists(select 1 from private.photo_evaluations where id_sesi=p_id_sesi
      and id_quest=p_id_quest and request_id=p_request_id and decision='accepted') then
      raise sqlstate 'PT403' using message='PHOTO_VALIDATION_REQUIRED';
    end if;
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
  if question.tipe_quest = 'foto' then
    correct := true;
  elsif question.tipe_quest in ('pilgan', 'benar_salah', 'cocokkan') then
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
    select p_id_sesi,question.id_poi,case when question.tipe_quest='foto' then 'foto' else 'kuis' end,coalesce(sum(s.nilai_poin),0)
    from private.quest_scores s join public.quest q using(id_quest)
    where s.id_sesi=p_id_sesi and q.id_poi=question.id_poi and (q.tipe_quest='foto')=(question.tipe_quest='foto')
    on conflict (id_sesi,id_poi,komponen) do update set nilai_poin=excluded.nilai_poin;
  end if;

  select count(*),count(*) filter(where m.answer_correct),
    count(*) filter(where m.answer_correct or m.jumlah_percobaan >= q.batas_percobaan),
    coalesce(max(m.jumlah_percobaan),0),coalesce(sum(s.nilai_poin),0)
  into total_quests,correct_quests,resolved_quests,poi_attempts,poi_points
  from public.quest q
  left join public.mengerjakan m on m.id_quest=q.id_quest and m.id_sesi=p_id_sesi
  left join private.quest_scores s on s.id_quest=q.id_quest and s.id_sesi=p_id_sesi
  where q.id_poi=question.id_poi and not (visit.profil='anak' and q.tipe_quest<>'foto');

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




update public.quest_teks set instruksi='Cari Tulang Lengan Kura-Kura Raksasa!',
  pertanyaan='Ayo cari fosil tulang lengan (humerus) kura-kura raksasa bernama Megalochelys! Foto fosilnya dengan jelas, ya!',
  target_foto='Fosil tulang lengan (humerus) Megalochelys sp. terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Cari label Megalochelys sp. dengan keterangan tulang lengan (humerus).',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000001' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Karang yang Bulat Seperti Kepala!',
  pertanyaan='Di sini ada banyak karang. Ada yang bercabang, ada yang pipih, dan ada yang bulat. Ayo cari karang yang bulat seperti kepala, namanya head coral. Foto karangnya dengan jelas, ya!',
  target_foto='Head coral (karang membulat seperti kepala) terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Jangan pilih karang yang bercabang atau pipih. Cari yang bulat!',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000024' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Batu Hitam yang Mengilap!',
  pertanyaan='Lava dari gunung api yang membeku sangat cepat bisa jadi batu hitam yang mengilap seperti kaca. Namanya obsidian. Ayo cari obsidian, lalu foto dengan jelas, ya!',
  target_foto='Obsidian (batuan hitam mengilap seperti kaca) terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Cari batu yang hitam, licin, dan berkilau seperti kaca!',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000003' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Batu Dasit!',
  pertanyaan='Dasit adalah batu yang terbentuk dari lava gunung api yang membeku. Ayo cari batu dasit di antara koleksi batuan! Foto batunya dengan jelas, ya!',
  target_foto='Batuan dasit terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Cari label yang bertuliskan Dasit!',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000007' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Batu dari Luar Angkasa!',
  pertanyaan='Tahukah kamu, ada batu yang jatuh dari luar angkasa? Namanya meteorit! Ayo cari meteorit dari Namibia, lalu foto dengan jelas, ya!',
  target_foto='Meteorit dari Namibia terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Cari label yang bertuliskan Meteorit Namibia!',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000025' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Si Batu Rijang!',
  pertanyaan='Rijang adalah batu yang sangat keras. Ayo cari rijang di antara koleksi batuan! Foto batunya dengan jelas, ya!',
  target_foto='Batu rijang terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Rijang halus dan keras. Cari label yang bertuliskan Rijang!',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000010' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Si Nikel!',
  pertanyaan='Nikel adalah logam yang dipakai untuk membuat baterai dan baja. Ayo cari nikel di antara koleksi, lalu foto dengan jelas, ya!',
  target_foto='Koleksi nikel terlihat jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.',
  hint='Cari label yang bertuliskan Nikel!',
  kriteria_foto='Lolos jika objek koleksi sesuai dengan target quest dan terlihat jelas. Label nama bersifat opsional sebagai bukti tambahan. Foto buram, gelap, atau kecocokan objek yang belum dapat dipastikan diminta ulang.'
where id_quest='40000000-0000-4000-8000-000000000026' and bahasa='id' and profil='anak';
