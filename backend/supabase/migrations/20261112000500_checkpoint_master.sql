-- DIBUAT oleh npm run checkpoints:prepare dari data/checkpoints.json.
-- Master POI; kolom zona GPS dan kelengkapan Stories tidak diubah.
do $checkpoint_seed$
begin
insert into public.zona(id_zona,nama) values ('20000000-0000-4000-8000-000000000001','Left Wing')
on conflict (id_zona) do update set nama=excluded.nama;

insert into public.zona(id_zona,nama) values ('20000000-0000-4000-8000-000000000002','Right Wing')
on conflict (id_zona) do update set nama=excluded.nama;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Paleogeografi & Sebaran Fauna Indonesia','POI-01','Paleogra & Sebaran Fauna Indonesia',-6.900722,107.621361,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','Kars Indonesia','POI-02','Kars Indonesia',-6.900667,107.621306,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','Gunung Api Indonesia','POI-03','Gunung api indonesia',-6.900694,107.621278,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','Rona Muka Bumi Indonesia','POI-04','Roman Muka Bumi Indonesia',-6.900694,107.621139,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000001','Animasi Geologi Indonesia','POI-05','Animasi Geologi Indonesia',-6.900722,107.621167,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000006','20000000-0000-4000-8000-000000000001','Pelapukan, Erosi & Pengendapan','POI-06','Pelapukan erosi & pengendapan',-6.90075,107.621222,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000007','20000000-0000-4000-8000-000000000001','Batuan & Mineral','POI-07','Batuan & Mineral',-6.90075,107.621306,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000008','20000000-0000-4000-8000-000000000001','Terjadinya Tenaga Tektonik','POI-08','Terjadinya tenaga tektonik',-6.900778,107.621333,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000009','20000000-0000-4000-8000-000000000001','Alam Semesta & Pembentukan Bumi','POI-09','Alam semesta & Pembentukan bumi',-6.900787,107.621402,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000010','20000000-0000-4000-8000-000000000001','Keanekaragaman Batuan di Indonesia','POI-10','Keanekaragaman Batuan di Indonesia',-6.900649,107.621063,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000001','Kekayaan Sumber Daya Geologi','POI-11','Kekayaan Sumber Daya Geologi',-6.900694,107.621056,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000002','Introduksi Sejarah Kehidupan','POI-12','Intrudksi Sejarah Kehdiupan',-6.900667,107.621667,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000013','20000000-0000-4000-8000-000000000002','Prakambrium','POI-13','PraKambium',-6.900639,107.621694,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000014','20000000-0000-4000-8000-000000000002','Paleozoikum','POI-14','Palaezoikum',-6.900612,107.621731,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000015','20000000-0000-4000-8000-000000000002','Mesozoikum','POI-15','Mesozoikum',-6.900639,107.621722,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000016','20000000-0000-4000-8000-000000000002','Kenozoikum Tersier','POI-16','Kenozoikum Tersier',-6.900667,107.621833,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000017','20000000-0000-4000-8000-000000000002','Vertebrata Kuarter','POI-17','Vatebrata Kuarter',-6.900667,107.621778,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000018','20000000-0000-4000-8000-000000000002','Hominid','POI-18','Hominid',-6.900694,107.621861,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000019','20000000-0000-4000-8000-000000000002','Diorama Hominid','POI-19','Diorama Hominid',-6.900722,107.621917,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

insert into public.poi(id_poi,id_zona,nama,kode_poi,nama_asli,latitude,longitude,radius,is_published)
values ('30000000-0000-4000-8000-000000000020','20000000-0000-4000-8000-000000000002','Artefak','POI-20','Artefak',-6.900722,107.621833,15,false)
on conflict (id_poi) do update set id_zona=excluded.id_zona,nama=excluded.nama,kode_poi=excluded.kode_poi,nama_asli=excluded.nama_asli,latitude=excluded.latitude,longitude=excluded.longitude,radius=excluded.radius;

  if (select count(*) from public.poi where id_poi in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000008','30000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000010','30000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000014','30000000-0000-4000-8000-000000000015','30000000-0000-4000-8000-000000000016','30000000-0000-4000-8000-000000000017','30000000-0000-4000-8000-000000000018','30000000-0000-4000-8000-000000000019','30000000-0000-4000-8000-000000000020')
    and kode_poi is not null and latitude is not null and longitude is not null and radius is not null) <> 20 then
    raise exception 'MASTER_POI_INCOMPLETE: pengisian checkpoint belum lengkap';
  end if;
  raise notice 'GEA_MASTER_POI_OK: 20 checkpoint tersimpan';
end;
$checkpoint_seed$;
