-- Sheet terbaru (20 Nov 2026): fokus sayap kiri dulu.
-- 1. Typo fakta POI-07: "eodes" -> "Geodes".
-- 2. Lencana aktif hanya BD-01 s.d. BD-04 (yang ada di sheet terbaru). BD-05 s.d. BD-15 dari sheet lama
--    tidak dihapus, hanya dinonaktifkan sampai dipakai lagi.

update public.konten
set fakta_menarik = 'G' || fakta_menarik
where fakta_menarik like 'eodes dapat terlihat%';

update public.badge
set is_active = (kode_badge in ('BD-01', 'BD-02', 'BD-03', 'BD-04'));
