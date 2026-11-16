-- Nomor file adalah kontrak editorial: 1–2 cerita, 3+ referensi tantangan foto.
create table public.poi_media (
  id_poi uuid not null references public.poi on delete cascade,
  nomor integer not null check (nomor > 0),
  path_foto text not null check (
    path_foto ~ '^images/poi/P[0-9]{2}/[1-9][0-9]*-[a-f0-9]{16}\.jpg$'
  ),
  instruksi text,
  primary key (id_poi, nomor),
  unique (path_foto),
  check (
    (nomor <= 2 and instruksi is null) or
    (nomor >= 3 and instruksi is not null and length(btrim(instruksi)) between 1 and 2000)
  )
);
alter table public.poi_media enable row level security;
revoke all on public.poi_media from public, anon, authenticated;
grant all on public.poi_media to service_role;
