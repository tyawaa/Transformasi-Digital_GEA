create function public.verifikasi_gps_poi(
  p_user_id uuid, p_id_sesi uuid, p_id_poi uuid,
  p_latitude double precision, p_longitude double precision, p_accuracy_meters double precision
) returns jsonb language plpgsql set search_path = '' as $$
declare
  checkpoint public.poi;
  distance_meters double precision;
  valid_until timestamptz;
begin
  perform private.require_session(p_user_id, p_id_sesi);
  if p_latitude is null or not (p_latitude between -90 and 90)
    or p_longitude is null or not (p_longitude between -180 and 180)
    or p_accuracy_meters is null or not (p_accuracy_meters >= 0)
  then
    raise sqlstate 'PT400' using message = 'LOCATION_INVALID';
  end if;
  if not (p_accuracy_meters <= 20) then
    raise sqlstate 'PT403' using message = 'GPS_ACCURACY_EXCEEDS_20_METERS';
  end if;
  select * into checkpoint from public.poi where id_poi = p_id_poi and is_published;
  if not found then raise sqlstate 'PT404' using message = 'POI_NOT_FOUND'; end if;
  if checkpoint.latitude is null or checkpoint.longitude is null or checkpoint.radius is null then
    raise sqlstate 'PT409' using message = 'POI_LOCATION_NOT_CONFIGURED';
  end if;
  distance_meters := 6371008.8 * 2 * asin(sqrt(least(1.0, greatest(0.0,
    power(sin(radians(p_latitude - checkpoint.latitude) / 2), 2)
    + cos(radians(checkpoint.latitude)) * cos(radians(p_latitude))
      * power(sin(radians(p_longitude - checkpoint.longitude) / 2), 2)
  ))));
  if distance_meters > checkpoint.radius then
    raise sqlstate 'PT403' using message = 'OUTSIDE_POI_AREA';
  end if;
  valid_until := now() + interval '15 minutes';
  insert into private.poi_verification(id_sesi, id_poi, expires_at)
    values (p_id_sesi, p_id_poi, valid_until)
    on conflict (id_sesi, id_poi) do update set expires_at = excluded.expires_at;
  return jsonb_build_object('idPoi', p_id_poi, 'verified', true, 'expiresAt', valid_until);
end $$;

revoke all on function public.verifikasi_gps_poi(uuid, uuid, uuid, double precision, double precision, double precision)
  from public, anon, authenticated;
grant execute on function public.verifikasi_gps_poi(uuid, uuid, uuid, double precision, double precision, double precision)
  to service_role;
comment on function public.verifikasi_gps_poi(uuid, uuid, uuid, double precision, double precision, double precision)
  is 'Verifikasi checkpoint utama melalui GPS <=20 m dan radius POI; QR menjadi jalur alternatif.';
