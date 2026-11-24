-- Sheet Acuan-sheet-daftar_rekaman (24 Nov 2026): teks cerita, quest anak, dan lencana mengikuti
-- naskah voice over.
-- 1. Cerita umum (Konten_Cerita) dan anak (Konten_Cerita_Anak) POI-01 s.d. POI-11.
-- 2. Quest anak (Quest_Anak): anak hanya mengerjakan quest foto dengan teks versi anak;
--    quest lain dinonaktifkan untuk anak. Poin tetap satu nilai per quest (nilai quest umum).
-- 3. Semua lencana BD-01 s.d. BD-15 aktif kembali.

update public.konten set judul_cerita='Indonesia di Cincin Api',teks_cerita='Indonesia berada di jalur pertemuan lempeng yang disebut Cincin Api Pasifik. Pertemuan lempeng inilah yang membentuk deretan gunung api, dari Sumatra sampai Maluku. Coba perhatikan peta di hadapanmu, dan temukan gunung api yang paling dekat dengan Bandung!',fakta_menarik='Cincin Api Pasifik membentang di sepanjang tepian Samudra Pasifik, dan Indonesia termasuk di dalamnya.',koleksi_sorotan='Peta sebaran gunung api'
  where id_poi='30000000-0000-4000-8000-000000000003' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Debaran Fauna Purba Indonesia',teks_cerita='Jutaan tahun lalu, Indonesia dihuni berbagai hewan purba yang unik. Ada Megalochelys, kura-kura raksasa. Ada juga Elephas celebensis, gajah purba bertubuh mungil dari Sulawesi. Bersama Elephas maximus dan Sinomastodon bumiayuensis, fosil-fosil ini menjadi saksi beragamnya fauna di masa lalu. Yuk, amati dan temukan perbedaannya!',fakta_menarik='Elephas celebensis dikenal sebagai salah satu gajah purba berukuran kecil yang pernah hidup di Sulawesi.',koleksi_sorotan='Megalochelys sp., Elephas celebensis, Elephas maximus, Sinomastodon bumiayuensis'
  where id_poi='30000000-0000-4000-8000-000000000001' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Rahasia Dunia Karst Indonesia',teks_cerita='Pernah melihat gua dengan hiasan batu yang menjuntai dari langit-langitnya? Itulah salah satu keunikan kawasan karst, seperti Gunung Sewu. Karst terbentuk saat batuan kapur larut perlahan selama waktu yang sangat lama. Yuk, amati stalaktit, sinter kapur, batu jahe, berbagai jenis batuan, dan terumbu karang, untuk mengenal keindahan proses pembentukan alam!',fakta_menarik='Stalaktit terbentuk dari endapan mineral kalsit yang menumpuk perlahan dari tetesan air di langit-langit gua.',koleksi_sorotan='Karst Gunung Sewu, stalaktit kalsit, batugamping, batu jahe, sinter kapur, marmer, amfibolit, hasil karstifikasi, hard coral, plate coral, branching coral, head coral'
  where id_poi='30000000-0000-4000-8000-000000000002' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Kisah Terbentuknya Muka Bumi Indonesia',teks_cerita='Tahukah kamu, bentuk muka bumi Indonesia terbentuk lewat proses geologi selama jutaan tahun? Pergerakan dan tekanan lempeng bumi menghasilkan berbagai struktur batuan, seperti lipatan dan sesar. Yuk, amati koleksi genes, sekis biotit, dan contoh struktur geologi, untuk melihat bagaimana bumi terus berubah!',fakta_menarik='Lipatan terbentuk ketika lapisan batuan mendapat tekanan hingga melengkung tanpa terpecah.',koleksi_sorotan='Genes, sekis biotit, lipatan, sesar'
  where id_poi='30000000-0000-4000-8000-000000000004' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Perjalanan Lahirnya Kepulauan Indonesia',teks_cerita='Pernah penasaran bagaimana ribuan pulau di Indonesia terbentuk? Lewat animasi ini, kamu bisa mengikuti perjalanannya. Pulau-pulau itu terbentuk akibat pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi selama jutaan tahun. Yuk, saksikan bagaimana daratan yang awalnya terpisah akhirnya membentuk Indonesia seperti yang kita kenal sekarang!',fakta_menarik='Bentuk kepulauan Indonesia terus berubah akibat aktivitas tektonik, bahkan sampai hari ini.',koleksi_sorotan='video'
  where id_poi='30000000-0000-4000-8000-000000000005' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Bagaimana Wajah Bumi Terbentuk?',teks_cerita='Bentuk permukaan bumi yang kita lihat sekarang terbentuk lewat proses alam selama ribuan hingga jutaan tahun. Ada tiga proses yang bekerja. Pelapukan menghancurkan batuan, erosi memindahkan material, dan pengendapan menumpuknya di tempat baru. Yuk, amati contoh bentukan muka bumi, dan cari tahu bagaimana ketiga proses ini mengubah lanskap Indonesia!',fakta_menarik='Material hasil erosi dapat terbawa air, angin, atau es, sebelum akhirnya mengendap di tempat lain.',koleksi_sorotan='Sembulan bentukan morfologi muka bumi, pelapukan, erosi, dan pengendapan'
  where id_poi='30000000-0000-4000-8000-000000000006' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Mengenal Harta Karun Bumi: Batuan dan Mineral',teks_cerita='Bumi menyimpan beragam mineral dan batuan, dengan warna, bentuk, dan karakter yang berbeda-beda. Ada lapis lazuli yang terkenal dengan warna biru pekatnya. Ada juga geodes, yang menyimpan kristal di bagian dalamnya. Yuk, amati berbagai koleksi mineral, dan kenali tiga kelompok utama batuan: beku, sedimen, dan metamorf!',fakta_menarik='Geodes bisa terlihat seperti batu biasa dari luar, tetapi bagian dalamnya bisa dipenuhi kristal yang indah.',koleksi_sorotan='Lapis lazuli, mineral hidroksida, oksida, silikat, karbonat, borat dan nitrat, unsur asli (native elements), sulfida, fosfat, sulfat, batuan beku, batuan sedimen, batuan metamorf, geodes'
  where id_poi='30000000-0000-4000-8000-000000000007' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Kekuatan Tersembunyi di Dalam Bumi',teks_cerita='Permukaan bumi yang kita pijak ternyata terus bergerak! Tenaga tektonik berasal dari pergerakan lempeng bumi, yang dapat membentuk pegunungan, lipatan, hingga patahan. Yuk, amati koleksi sekis mika, peridotit, dan lava basal, untuk mengenal lebih jauh proses yang membentuk bumi!',fakta_menarik='Peridotit merupakan batuan yang banyak menyusun bagian mantel atas bumi.',koleksi_sorotan='Proses terjadinya tenaga tektonik, sekis mika, peridotit, lava basal'
  where id_poi='30000000-0000-4000-8000-000000000008' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Dari Big Bang hingga Terbentuknya Bumi',teks_cerita='Pernah membayangkan bagaimana alam semesta dan planet Bumi terbentuk? Menurut teori Big Bang, alam semesta bermula dari kondisi yang sangat panas dan padat, lalu terus mengembang hingga sekarang. Seiring waktu, Bumi terbentuk dan mengalami perubahan hingga menjadi planet yang kita kenal saat ini. Yuk, ikuti perjalanan panjang Bumi lewat koleksi dan ilustrasi di hadapanmu!',fakta_menarik='Bumi memiliki empat lapisan utama, yaitu kerak, mantel, inti luar, dan inti dalam.',koleksi_sorotan='Teori Big Bang, hamparan luas alam semesta, proses terbentuknya planet Bumi, penampang struktur Bumi, perkembangan bentuk Bumi'
  where id_poi='30000000-0000-4000-8000-000000000009' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Ragam Batuan dari Nusantara',teks_cerita='Indonesia memiliki beragam jenis batuan, yang terbentuk lewat proses geologi yang berbeda-beda. Ada batugamping hitam, sekis biotit, rijang, peridotit, dan granit. Setiap batuan menyimpan cerita tentang proses pembentukan bumi. Yuk, amati warna dan tekstur koleksinya, lalu temukan perbedaannya!',fakta_menarik='Granit terbentuk dari magma yang mendingin perlahan di bawah permukaan bumi, sehingga kristalnya terlihat jelas.',koleksi_sorotan='Batugamping hitam, sekis biotit, rijang, peridotit, batuan granit'
  where id_poi='30000000-0000-4000-8000-000000000010' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Kekayaan Indonesia',teks_cerita='Indonesia menyimpan kekayaan geologi yang melimpah. Ada mineral logam, mineral non-logam, dan batu mulia, seperti ametis dari Solok, Sumatera Barat. Ada juga batubara, minyak dan gas bumi, panas bumi, serta sumber daya air, yang dimanfaatkan untuk kehidupan sehari-hari. Yuk, kenali berbagai potensi alam ini, dan bagaimana manusia memanfaatkannya!',fakta_menarik='Indonesia memiliki potensi panas bumi yang besar, karena berada di kawasan dengan aktivitas vulkanik yang tinggi.',koleksi_sorotan='Batubara, mineral logam, mineral non-logam, batu mulia (ametis), minyak dan gas bumi, panas bumi (geothermal), sumber daya air dan cekungan air tanah'
  where id_poi='30000000-0000-4000-8000-000000000011' and bahasa='id' and profil='dewasa';
update public.konten set judul_cerita='Yuk, Kenalan dengan Hewan Purba Indonesia!',teks_cerita='Dulu sekali, Indonesia punya banyak hewan purba yang unik. Ada Megalochelys, si kura-kura raksasa. Ada juga Elephas celebensis, gajah purba yang bertubuh mungil dari Sulawesi. Fosil-fosil ini menunjukkan hewan apa saja yang pernah hidup di masa lalu. Ayo, amati dan temukan bedanya!',fakta_menarik='Tahukah kamu? Elephas celebensis adalah gajah purba yang bertubuh kecil, dan pernah hidup di Sulawesi.',koleksi_sorotan='Megalochelys sp., Elephas celebensis, Elephas maximus, Sinomastodon bumiayuensis'
  where id_poi='30000000-0000-4000-8000-000000000001' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Rahasia Gua dan Karst',teks_cerita='Pernah lihat gua dengan batu yang menjuntai dari atapnya? Keren sekali! Gua seperti itu ada di daerah karst, misalnya Gunung Sewu. Karst terbentuk dari batu kapur yang larut pelan-pelan, selama waktu yang sangat lama. Ayo amati batu-batu gua dan terumbu karang di sini!',fakta_menarik='Tahukah kamu? Batu yang menjuntai dari atap gua bernama stalaktit, dan terbentuk dari tetesan air yang pelan-pelan menumpuk mineral.',koleksi_sorotan='Karst Gunung Sewu, stalaktit kalsit, batugamping, batu jahe, sinter kapur, marmer, amfibolit, hasil karstifikasi, hard coral, plate coral, branching coral, head coral'
  where id_poi='30000000-0000-4000-8000-000000000002' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Indonesia di Cincin Api',teks_cerita='Indonesia berada di jalur Cincin Api Pasifik. Di sana, lempeng-lempeng bumi saling bertemu. Pertemuan itu membentuk gunung api, dari Sumatra sampai Maluku. Ayo lihat peta di depanmu, lalu cari gunung api yang paling dekat dengan Bandung!',fakta_menarik='Tahukah kamu? Cincin Api Pasifik membentang di sepanjang tepian Samudra Pasifik, dan Indonesia ada di dalamnya.',koleksi_sorotan='Peta sebaran gunung api'
  where id_poi='30000000-0000-4000-8000-000000000003' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Bumi yang Terus Berubah',teks_cerita='Muka bumi Indonesia terbentuk lewat proses yang sangat lama, yaitu jutaan tahun. Lempeng bumi bergerak dan saling menekan. Tekanan itu bisa membuat batuan melengkung, atau patah. Ayo amati genes, sekis biotit, dan contoh lipatan dan sesar. Lihat, bumi kita terus berubah!',fakta_menarik='Tahukah kamu? Lipatan terjadi ketika lapisan batuan ditekan sampai melengkung, tanpa patah.',koleksi_sorotan='Genes, sekis biotit, lipatan, sesar'
  where id_poi='30000000-0000-4000-8000-000000000004' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Lahirnya Kepulauan Indonesia',teks_cerita='Bagaimana ribuan pulau di Indonesia bisa terbentuk? Ayo tonton animasinya! Pulau-pulau itu terbentuk karena lempeng bumi bergerak, gunung api meletus, dan alam terus bekerja selama jutaan tahun. Lihat bagaimana daratan yang tadinya terpisah, akhirnya menjadi Indonesia seperti sekarang!',fakta_menarik='Tahukah kamu? Bentuk kepulauan Indonesia masih terus berubah sampai sekarang.',koleksi_sorotan='video'
  where id_poi='30000000-0000-4000-8000-000000000005' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Tiga Pembentuk Wajah Bumi',teks_cerita='Wajah bumi bisa berubah, lho! Ada tiga proses yang bekerja. Pelapukan membuat batuan hancur. Erosi memindahkan hancuran batuan itu. Pengendapan menumpuknya di tempat yang baru. Ayo amati contoh bentuk muka bumi di sini!',fakta_menarik='Tahukah kamu? Hancuran batuan bisa terbawa oleh air, angin, atau es, sebelum akhirnya mengendap.',koleksi_sorotan='Bentukan morfologi muka bumi, pelapukan, erosi, dan pengendapan'
  where id_poi='30000000-0000-4000-8000-000000000006' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Harta Karun Bumi: Batuan dan Mineral',teks_cerita='Bumi menyimpan banyak batu dan mineral yang berwarna-warni. Ada lapis lazuli, batu yang berwarna biru tua. Ada juga geodes, batu yang di dalamnya penuh kristal. Batuan ada tiga kelompok, yaitu beku, sedimen, dan metamorf. Ayo amati koleksinya!',fakta_menarik='Tahukah kamu? Geodes terlihat seperti batu biasa dari luar, tetapi di dalamnya bisa penuh kristal yang indah.',koleksi_sorotan='Lapis lazuli, mineral hidroksida, oksida, silikat, karbonat, borat dan nitrat, unsur asli (native elements), sulfida, fosfat, sulfat, batuan beku, batuan sedimen, batuan metamorf, geodes'
  where id_poi='30000000-0000-4000-8000-000000000007' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Bumi yang Tidak Pernah Diam',teks_cerita='Tanah yang kita pijak ternyata terus bergerak, pelan sekali! Gerakan lempeng bumi bisa membentuk gunung, lipatan, dan patahan. Kekuatan itu disebut tenaga tektonik. Ayo amati sekis mika, peridotit, dan lava basal di sini!',fakta_menarik='Tahukah kamu? Peridotit adalah batuan yang banyak menyusun mantel atas bumi.',koleksi_sorotan='Proses terjadinya tenaga tektonik, sekis mika, peridotit, lava basal'
  where id_poi='30000000-0000-4000-8000-000000000008' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Dari Big Bang sampai Bumi Terbentuk',teks_cerita='Bagaimana alam semesta dan planet Bumi terbentuk? Menurut teori Big Bang, alam semesta dulu sangat panas dan padat, lalu terus mengembang sampai sekarang. Lama-lama, Bumi terbentuk dan berubah menjadi planet yang kita tinggali. Ayo ikuti perjalanan panjang Bumi lewat koleksi dan gambar di depanmu!',fakta_menarik='Tahukah kamu? Bumi punya empat lapisan, yaitu kerak, mantel, inti luar, dan inti dalam.',koleksi_sorotan='Teori Big Bang, hamparan luas alam semesta, proses terbentuknya planet Bumi, penampang struktur Bumi, perkembangan bentuk Bumi'
  where id_poi='30000000-0000-4000-8000-000000000009' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Batuan dari Nusantara',teks_cerita='Indonesia punya banyak jenis batuan, dan masing-masing terbentuk dengan cara yang berbeda. Ada batugamping hitam, sekis biotit, rijang, peridotit, dan granit. Ayo amati warna dan teksturnya, lalu temukan bedanya!',fakta_menarik='Tahukah kamu? Granit terbentuk dari magma yang mendingin pelan-pelan di bawah tanah, jadi kristalnya terlihat jelas.',koleksi_sorotan='Batugamping hitam, sekis biotit, rijang, peridotit, batuan granit'
  where id_poi='30000000-0000-4000-8000-000000000010' and bahasa='id' and profil='anak';
update public.konten set judul_cerita='Harta Kekayaan Indonesia',teks_cerita='Indonesia punya kekayaan alam yang melimpah! Ada logam, dan ada batu mulia seperti ametis dari Solok, Sumatera Barat. Ada juga batubara, minyak dan gas bumi, panas bumi, dan air. Semua itu dipakai manusia setiap hari. Ayo kenali kekayaan alam kita!',fakta_menarik='Tahukah kamu? Indonesia punya panas bumi yang besar, karena banyak gunung api di sini.',koleksi_sorotan='Batubara, mineral logam, mineral non-logam, batu mulia (ametis), minyak dan gas bumi, panas bumi (geothermal), sumber daya air dan cekungan air tanah'
  where id_poi='30000000-0000-4000-8000-000000000011' and bahasa='id' and profil='anak';

update public.quest_teks set instruksi='Cari Cangkang Kura-Kura Raksasa!',pertanyaan='Ayo cari fosil kura-kura raksasa bernama Megalochelys! Foto fosilnya bersama label namanya, ya!',hint='Cari fosil yang bentuknya seperti cangkang besar!',target_foto='Fosil Megalochelys sp. (cangkang kura-kura raksasa) terlihat jelas, dan label nama ikut terbaca',penjelasan='Hebat! Megalochelys adalah kura-kura raksasa dari zaman purba. Fosilnya jadi bukti hewan apa saja yang pernah hidup di Indonesia.'
  where id_quest='40000000-0000-4000-8000-000000000001' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Karang yang Bulat Seperti Kepala!',pertanyaan='Di sini ada banyak karang. Ada yang bercabang, ada yang pipih, dan ada yang bulat. Ayo cari karang yang bulat seperti kepala, namanya head coral. Foto karangnya bersama label namanya, ya!',hint='Jangan pilih karang yang bercabang atau pipih. Cari yang bulat!',target_foto='Head coral (karang bulat seperti kepala) terlihat jelas, dan label nama ikut terbaca',penjelasan='Keren! Head coral adalah karang yang bentuknya bulat seperti kepala.'
  where id_quest='40000000-0000-4000-8000-000000000024' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Batu Hitam yang Mengilap!',pertanyaan='Lava dari gunung api yang membeku sangat cepat bisa jadi batu hitam yang mengilap seperti kaca. Namanya obsidian. Ayo cari obsidian, lalu foto bersama label namanya, ya!',hint='Cari batu yang hitam, licin, dan berkilau seperti kaca!',target_foto='Obsidian (batu hitam mengilap seperti kaca) terlihat jelas, dan label nama ikut terbaca',penjelasan='Hore, ketemu! Obsidian terbentuk dari lava yang membeku sangat cepat, jadi tampak seperti kaca.'
  where id_quest='40000000-0000-4000-8000-000000000003' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Batu Dasit!',pertanyaan='Dasit adalah batu yang terbentuk dari lava gunung api yang membeku. Ayo cari batu dasit di antara koleksi batuan! Foto batunya bersama label namanya, ya!',hint='Cari label yang bertuliskan Dasit!',target_foto='Batuan dasit terlihat jelas, dan label nama Dasit terbaca',penjelasan='Mantap! Dasit adalah batuan beku yang berasal dari lava gunung api.'
  where id_quest='40000000-0000-4000-8000-000000000007' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Batu dari Luar Angkasa!',pertanyaan='Tahukah kamu, ada batu yang jatuh dari luar angkasa? Namanya meteorit! Ayo cari meteorit dari Namibia, lalu foto bersama label namanya, ya!',hint='Cari label yang bertuliskan Meteorit Namibia!',target_foto='Meteorit dari Namibia terlihat jelas, dan label nama ikut terbaca',penjelasan='Wow, hebat! Meteorit adalah benda dari luar angkasa yang jatuh sampai ke Bumi.'
  where id_quest='40000000-0000-4000-8000-000000000025' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Si Batu Rijang!',pertanyaan='Rijang adalah batu yang sangat keras. Ayo cari rijang di antara koleksi batuan! Foto batunya bersama label namanya, ya!',hint='Rijang halus dan keras. Cari label yang bertuliskan Rijang!',target_foto='Batu rijang terlihat jelas, dan label nama Rijang terbaca',penjelasan='Mantap! Rijang adalah batu keras yang terbuat dari silika.'
  where id_quest='40000000-0000-4000-8000-000000000010' and bahasa='id' and profil='anak';
update public.quest_teks set instruksi='Cari Si Nikel!',pertanyaan='Nikel adalah logam yang dipakai untuk membuat baterai dan baja. Ayo cari nikel di antara koleksi, lalu foto bersama label namanya, ya!',hint='Cari label yang bertuliskan Nikel!',target_foto='Koleksi nikel terlihat jelas, dan label nama Nikel terbaca',penjelasan='Keren! Indonesia termasuk penghasil nikel terbesar di dunia.'
  where id_quest='40000000-0000-4000-8000-000000000026' and bahasa='id' and profil='anak';

update public.badge set is_active = true;

-- Aturan quest per profil dibalik: anak hanya menghitung quest foto (sebelumnya justru foto yang dilewati).
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
    and not(visit.profil='anak' and q.tipe_quest<>'foto'));
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
        where q.id_poi=p.id_poi and not(visit.profil='anak' and q.tipe_quest<>'foto')
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
  if visit.profil = 'anak' and question.tipe_quest <> 'foto' then
    raise sqlstate 'PT403' using message = 'QUEST_NOT_FOR_PROFILE';
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
  where q.id_poi=question.id_poi and not(visit.profil='anak' and q.tipe_quest<>'foto');

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
