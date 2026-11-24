-- Rilis P01–P11 yang sudah memiliki paket cerita, quest, dan foto museum.
-- Posisi denah dan estimasi menit mengikuti dataset yang digunakan aplikasi.
begin;
do $release$
declare
  ready_count integer;
begin
  select count(*) into ready_count from public.poi where kode_poi between 'POI-01' and 'POI-11';
  if ready_count <> 11 then raise exception 'Rilis memerlukan master POI-01 sampai POI-11.'; end if;
  if exists (
    select 1 from public.poi p where p.kode_poi between 'POI-01' and 'POI-11' and (
      (select count(*) from public.poi_media m where m.id_poi=p.id_poi and m.nomor in (1,2)) <> 2
      or not exists (select 1 from public.poi_media m where m.id_poi=p.id_poi and m.nomor>=3)
      or exists (select 1 from public.poi_media m where m.id_poi=p.id_poi and not exists (
        select 1 from storage.objects o where o.bucket_id='gea-media' and o.name=m.path_foto
      ))
    )
  ) then raise exception 'Foto cerita atau referensi POI belum lengkap di Storage.'; end if;

  update public.poi p set denah_x=n.x, denah_y=n.y, prioritas=n.priority,
    estimasi_durasi=n.minutes,
    path_foto=(select m.path_foto from public.poi_media m where m.id_poi=p.id_poi and m.nomor=1)
  from (values
    ('POI-01',240,0,1,7), ('POI-02',185,0,2,9), ('POI-03',133,0,3,7),
    ('POI-04',82,0,4,5), ('POI-05',82,90,5,4), ('POI-06',133,90,6,8),
    ('POI-07',185,90,7,13), ('POI-08',240,90,8,7), ('POI-09',293,90,9,6),
    ('POI-10',0,0,10,10), ('POI-11',0,55,11,7)
  ) n(code,x,y,priority,minutes) where p.kode_poi=n.code;
  -- Trigger publikasi tetap memeriksa kelengkapan cerita dan variasi quest setiap POI.
  update public.poi set is_published=true where kode_poi between 'POI-01' and 'POI-11';
end;
$release$;
commit;
