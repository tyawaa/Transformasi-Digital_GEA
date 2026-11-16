-- Koordinat checkpoint WGS84 terpisah dari posisi denah dan pusat GPS zona.
alter table public.poi
  add column kode_poi text unique check (kode_poi ~ '^POI-(0[1-9]|1[0-9]|20)$'),
  add column nama_asli text check (length(btrim(nama_asli)) > 0),
  add column latitude double precision check (latitude between -90 and 90),
  add column longitude double precision check (longitude between -180 and 180),
  add column radius double precision check (radius > 0 and radius < 'Infinity'::float8),
  add constraint poi_checkpoint_lengkap check (
    (latitude is null and longitude is null and radius is null) or
    (latitude is not null and longitude is not null and radius is not null)
  );
comment on column public.poi.latitude is 'Latitude WGS84 dalam derajat desimal; bukan posisi denah.';
comment on column public.poi.longitude is 'Longitude WGS84 dalam derajat desimal; bukan posisi denah.';
comment on column public.poi.radius is 'Radius checkpoint dalam meter; bukan radius zona atau batas museum.';
