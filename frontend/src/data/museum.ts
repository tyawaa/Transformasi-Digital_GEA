// Dataset lokal Museum Geologi lantai 1.
// Sumber: Template_Scratch_Data_Museum_Geologi.xlsx (sheet POI_Master, Konten_Cerita, Quest,
// Badge_Poin) dan denah di "Survey Docs". Koordinat masih "Belum disurvey" di Excel.
//
// Teks cerita dan soal di bawah berstatus DRAFT: ditulis dari pengetahuan umum geologi dan
// wajib dicek ke kurator / papan informasi museum (B4) sebelum dipakai sebagai konten final.
// Saat mode API, konten diambil dari database; file ini tetap dipakai untuk denah dan QR offline.

import type { OptionLabel } from "../domain/contracts";

export type Wing = "left" | "right";

export type ZoneInfo = {
  readonly code: "ZL" | "ZR";
  readonly wing: Wing;
  readonly name: string;
  readonly intro: string;
  /** Titik zona dari keputusan A7 (QR jalur utama, GPS bonus). */
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
};

export const zones: readonly ZoneInfo[] = [
  {
    code: "ZL",
    wing: "left",
    name: "Sayap Kiri · Geologi Indonesia",
    intro:
      "Selamat datang di sayap kiri! Di sini kamu akan mengenal bagaimana Bumi terbentuk, kenapa Indonesia punya banyak gunung api, dan batuan apa saja yang ada di bawah kakimu.",
    latitude: -6.90078,
    longitude: 107.62147,
    radiusMeters: 10,
  },
  {
    code: "ZR",
    wing: "right",
    name: "Sayap Kanan · Sejarah Kehidupan",
    intro:
      "Selamat datang di sayap kanan! Ikuti perjalanan kehidupan di Bumi, dari makhluk bersel satu, zaman dinosaurus, sampai manusia purba yang pernah hidup di Jawa.",
    latitude: -6.90078,
    longitude: 107.62192,
    radiusMeters: 10,
  },
];

export type StoryContent = {
  readonly cerita: string;
  readonly instruksi: string;
  readonly pertanyaan: string;
  readonly opsi: readonly [string, string, string, string];
  readonly kunci: OptionLabel;
  readonly hint: string;
  // Kolom tambahan dari sheet Konten_Cerita / Quest (opsional).
  /** Judul Cerita. */
  readonly judul?: string;
  /** Fakta Menarik (1 kalimat). */
  readonly fakta?: string;
  /** Koleksi / Objek yang Disorot. */
  readonly sorotan?: string;
  /** Penjelasan setelah Menjawab. */
  readonly penjelasan?: string;
  /** Nomor foto survei (urutan nama file di folder POI/Pxx) untuk layar ringkasan dan isi cerita. */
  readonly fotoUtama?: number;
  readonly fotoKedua?: number;
};

/** Kotak ruangan di denah, satuan bebas (lebar sayap kiri ≈ 347). */
export type RoomBox = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type MuseumPoi = {
  /** Kode POI pada survei/QR: P01–P21. */
  readonly code: string;
  readonly number: number;
  readonly name: string;
  readonly wing: Wing;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
  readonly room: RoomBox;
  /** null = belum ada konten; tampil di peta sebagai "segera hadir". */
  readonly content: StoryContent | null;
};

type Row = readonly [number, string, Wing, number, number, RoomBox];

// Koordinat Excel tersimpan sebagai bilangan bulat ×10^6 (mis. -6900722 = -6.900722).
const rows: readonly Row[] = [
  [1, "Paleogeografi & Sebaran Fauna Indonesia", "left", -6.900722, 107.621361, { x: 240, y: 0, w: 107, h: 54 }],
  [2, "Kars Indonesia", "left", -6.900667, 107.621306, { x: 185, y: 0, w: 55, h: 54 }],
  [3, "Gunung Api Indonesia", "left", -6.900694, 107.621278, { x: 133, y: 0, w: 52, h: 54 }],
  [4, "Rona Muka Bumi Indonesia", "left", -6.900694, 107.621139, { x: 82, y: 0, w: 51, h: 54 }],
  [5, "Animasi Geologi Indonesia", "left", -6.900722, 107.621167, { x: 82, y: 90, w: 51, h: 52 }],
  [6, "Pelapukan, Erosi & Pengendapan", "left", -6.90075, 107.621222, { x: 133, y: 90, w: 52, h: 52 }],
  [7, "Batuan & Mineral", "left", -6.90075, 107.621306, { x: 185, y: 90, w: 55, h: 52 }],
  [8, "Terjadinya Tenaga Tektonik", "left", -6.900778, 107.621333, { x: 240, y: 90, w: 53, h: 52 }],
  [9, "Alam Semesta & Pembentukan Bumi", "left", -6.900787, 107.621402, { x: 293, y: 90, w: 54, h: 52 }],
  [10, "Keanekaragaman Batuan di Indonesia", "left", -6.900694, 107.621056, { x: 0, y: 0, w: 78, h: 47 }],
  [11, "Kekayaan Sumber Daya Geologi", "left", -6.900694, 107.621056, { x: 0, y: 55, w: 78, h: 47 }],
  [12, "Introduksi Sejarah Kehidupan", "right", -6.900667, 107.621667, { x: 0, y: 72, w: 44, h: 70 }],
  [13, "Prakambrium", "right", -6.900639, 107.621694, { x: 0, y: 0, w: 62, h: 48 }],
  [14, "Paleozoikum", "right", -6.900612, 107.621731, { x: 62, y: 0, w: 78, h: 48 }],
  [15, "Mesozoikum", "right", -6.900639, 107.621722, { x: 140, y: 0, w: 77, h: 48 }],
  [16, "Kenozoikum Tersier", "right", -6.900667, 107.621833, { x: 217, y: 0, w: 86, h: 48 }],
  [17, "Vertebrata Kuarter", "right", -6.900667, 107.621778, { x: 44, y: 84, w: 168, h: 58 }],
  [18, "Hominid", "right", -6.900694, 107.621861, { x: 212, y: 72, w: 91, h: 70 }],
  [19, "Diorama Hominid", "right", -6.900722, 107.621917, { x: 257, y: 142, w: 46, h: 53 }],
  [20, "Artefak", "right", -6.900722, 107.621833, { x: 212, y: 142, w: 45, h: 53 }],
  // Excel: longitude tertulis 107.62175 dan sayapnya "(konfirmasi)". Denah survei: sayap kanan.
  [21, "Cekungan Bandung", "right", -6.900694, 107.62175, { x: 159, y: 142, w: 53, h: 53 }],
];

// Konten DRAFT untuk POI aktif (P01–P14, dari foto survei 10 Nov 2026).
// P15–P21 belum disurvei/kosong, jadi tampil "segera hadir" di peta.
const contents: { readonly [n: number]: StoryContent } = {
  1: {
    // Disusun dari foto survei 10 Nov 2026: panel "Paleogeografi dan Sebaran Fauna di Indonesia",
    // panel "Sebaran Fauna di Indonesia", dan label vitrin. Status: Draft, cek ke kurator.
    fotoUtama: 5,
    fotoKedua: 0,
    judul: "Jembatan Darat Zaman Es",
    cerita:
      "Saat zaman es, air laut membeku di kutub sehingga muka air laut turun lebih dari 100 meter. Dasar laut dangkal di barat Indonesia muncul menjadi daratan luas, Paparan Sunda, yang menyambungkan Sumatra, Jawa, dan Kalimantan dengan Asia. Lewat jembatan darat ini, hewan dari Asia bermigrasi ke Nusantara dalam tiga tahap: sekitar 2,6 juta, 0,8 juta, dan 250 ribu tahun lalu. Buktinya ada di vitrin: rahang Sinomastodon dari Bumiayu, gading Elephas celebensis dari Sangihe, dan gigi Elephas maximus dari Cipeundeuy.",
    fakta:
      "Garis Wallace adalah garis khayal antara Bali–Lombok dan Kalimantan–Sulawesi yang memisahkan fauna bercorak Asia di barat dan fauna bercorak Australia di timur.",
    sorotan: "Rahang bawah Sinomastodon bumiayuensis, gading Elephas celebensis, gigi Elephas maximus, panel peta glasiasi",
    instruksi: "Temukan fosil rahang bawah berwarna cokelat di dalam vitrin, lalu baca label hitam di bawahnya.",
    pertanyaan: "Dari mana fosil rahang Sinomastodon bumiayuensis ditemukan?",
    opsi: ["Bumiayu, Jawa Tengah", "Sangihe, Sulawesi Utara", "Cipeundeuy, Jawa Barat", "Trinil, Jawa Timur"],
    kunci: "A",
    hint: "Nama spesiesnya mirip dengan nama tempat ia ditemukan.",
    penjelasan:
      "Sinomastodon bumiayuensis adalah kerabat gajah dari Pliosen akhir, sekitar 3,6 juta tahun lalu. Rahangnya ditemukan di Bumiayu, Jawa Tengah.",
  },
  2: {
    // Disusun dari foto survei 10 Nov 2026: panel "Kars Indonesia", "Karstifikasi dan Hasilnya",
    // "Kars Gunung Sewu", "Fenomena Kars Indonesia", dan label vitrin karang. Status: Draft.
    fotoUtama: 9,
    fotoKedua: 13,
    judul: "Dari Terumbu Karang Menjadi Bukit Kars",
    cerita:
      "Batugamping sebagian besar berasal dari cangkang dan kerangka hewan laut, seperti terumbu karang yang tumbuh di laut hangat Indonesia. Gerakan tektonik lalu mengangkat terumbu dan batugamping itu menjadi daratan. Di sana air hujan perlahan melarutkannya, proses yang disebut karstifikasi. Di permukaan terbentuk bukit dan lembah kars, sedangkan di bawah tanah terbentuk gua, sungai bawah tanah, dan stalaktit. Contohnya Kars Gunung Sewu, Maros-Pangkep, dan Gombong. Karang di vitrin ini adalah bahan dasar kars!",
    fakta:
      "Kars Gunung Sewu membentang dari Pantai Parangtritis sampai Teluk Pacitan, luasnya sekitar 100 × 40 km².",
    sorotan:
      "Branching Coral (Acropora sp.), Head Coral (Meandrina sp.), Plate Coral (Fungia sp., Halomitra sp.), stalaktit kalsit Gua Inten, batu jahe, sinter kapur, batugamping Wonogiri",
    instruksi: "Cari karang bercabang seperti ranting di vitrin karang, lalu baca label di depannya.",
    pertanyaan: "Apa nama ilmiah karang bercabang (Branching Coral) di vitrin ini?",
    opsi: ["Meandrina sp.", "Fungia sp.", "Acropora sp.", "Halomitra sp."],
    kunci: "C",
    hint: "Karang lain di vitrin berbentuk kepala atau piring. Cari yang bentuknya seperti ranting.",
    penjelasan:
      "Acropora adalah karang pembentuk terumbu. Kerangka kapurnya yang menumpuk selama jutaan tahun menjadi batugamping, bahan dasar kawasan kars.",
  },
  3: {
    // Judul dan kalimat pembuka dari Konten_Cerita ST-001; koleksi dari foto survei 10 Nov 2026
    // (label vitrin batuan gunung api). Status: Draft. Foto belum dipasang.
    fotoUtama: 4,
    fotoKedua: 2,
    judul: "Indonesia di Cincin Api",
    cerita:
      "Indonesia berada di jalur pertemuan lempeng yang disebut Cincin Api Pasifik. Pertemuan lempeng inilah yang membentuk deretan gunung api dari Sumatra sampai Maluku. Saat meletus, gunung api menghasilkan beragam batuan. Lava yang membeku sangat cepat menjadi obsidian, kaca vulkanik yang hitam mengilap. Gas yang terperangkap meninggalkan banyak lubang, seperti pada batuapung dan basalt vesikuler. Gumpalan lava yang terlempar ke udara lalu membeku disebut bom gunung api.",
    fakta: "Batuapung penuh rongga udara sehingga sangat ringan, bahkan bisa mengapung di air.",
    sorotan:
      "Obsidian (Bukit Rejeng, Garut), batuapung (G. Galunggung, Tasikmalaya), basalt vesikuler (Subang), bom kerak roti (Purwokerto), bom gunung api (Magelang), aliran lava",
    instruksi: "Temukan batu hitam yang mengilap seperti kaca, lalu baca label di depannya.",
    pertanyaan: "Dari mana obsidian di vitrin ini berasal?",
    opsi: ["Bukit Rejeng, Garut", "G. Galunggung, Tasikmalaya", "Subang, Jawa Barat", "Magelang, Jawa Tengah"],
    kunci: "A",
    hint: "Batuapung berasal dari gunung di Tasikmalaya. Obsidian dari tempat lain di Jawa Barat.",
    penjelasan:
      "Obsidian terbentuk saat lava membeku sangat cepat sehingga mineralnya tidak sempat menjadi kristal. Hasilnya kaca vulkanik yang mengilap.",
  },
  4: {
    // Disusun dari foto survei 10 Nov 2026: vitrin "Sesar" dan "Lipatan", genes dan sekis biotit
    // Donggala, panel "Gunung Batu, Sesar Lembang". Status: Draft. Foto belum dipasang.
    fotoUtama: 3,
    fotoKedua: 2,
    judul: "Bumi yang Retak dan Terlipat",
    cerita:
      "Rona muka Bumi Indonesia terus berubah karena tenaga dari dalam Bumi. Saat batuan ditekan perlahan, lapisannya bisa melengkung menjadi lipatan, seperti sekis terlipat dari Pegunungan Cyclop, Papua. Jika tekanannya terlalu besar, batuan patah dan bergeser menjadi sesar. Gesekannya meninggalkan bidang halus yang disebut cermin sesar, sedangkan pecahan batuan yang menyatu kembali disebut breksi sesar. Di dekat Bandung pun ada sesar: Sesar Lembang di Gunung Batu, yang retakannya memanjang lebih dari 22 km.",
    fakta:
      "Genes dan sekis biotit dari Donggala, Sulawesi Tengah, adalah batuan metamorf, yaitu batuan yang berubah karena panas dan tekanan tinggi di dalam Bumi.",
    sorotan:
      "Sekis terlipat (Pegunungan Cyclop, Papua; Palu, Sulawesi Tengah), cermin sesar, breksi sesar pada batugamping, genes dan sekis biotit (Donggala)",
    instruksi: "Temukan vitrin berlabel \"Sesar\", lalu baca keterangan batu nomor 1.",
    pertanyaan: "Apa nama bidang batuan yang halus akibat pergerakan sesar?",
    opsi: ["Cermin sesar", "Breksi sesar", "Sekis terlipat", "Genes"],
    kunci: "A",
    hint: "Namanya mirip benda yang permukaannya halus dan bisa memantulkan bayangan.",
    penjelasan:
      "Cermin sesar terbentuk saat dua blok batuan saling bergesekan ketika sesar bergerak, sehingga permukaannya menjadi halus dan mengilap.",
  },
  5: {
    // Disusun dari foto survei 10 Nov 2026: layar "Morfologi Indonesia" dan "Animasi Robert Hall",
    // panel "Kapan Kepulauan Indonesia Terbentuk?". Status: Draft. Foto belum dipasang.
    fotoUtama: 1,
    fotoKedua: 2,
    judul: "Menonton Kepulauan Indonesia Lahir",
    cerita:
      "Di ruang animasi ini kamu bisa melihat bagaimana Kepulauan Indonesia terbentuk. Animasi buatan Robert Hall, geolog dari Inggris yang tertarik pada geologi Indonesia, memutar ulang waktu hingga puluhan juta tahun lalu. Pulau-pulau bergeser sedikit demi sedikit karena lempeng-lempeng Bumi terus bergerak dan bertumbukan. Sampai sekarang Indonesia masih diapit lempeng Eurasia, Indo-Australia, dan Pasifik. Hasilnya adalah negeri kepulauan dengan garis pantai yang sangat panjang.",
    fakta:
      "Tayangan di ruangan ini menyebut garis pantai Indonesia sepanjang 80.791 km, kira-kira dua kali keliling Bumi.",
    sorotan: "Layar animasi Robert Hall, layar morfologi Indonesia, panel perkembangan Kepulauan Indonesia, peta relief bercahaya",
    instruksi: "Tonton animasi di layar besar dan perhatikan judul di pojok kiri atasnya.",
    pertanyaan: "Siapa geolog dari Inggris yang membuat animasi pembentukan Kepulauan Indonesia di ruangan ini?",
    opsi: ["Robert Hall", "Alfred Russel Wallace", "Eugène Dubois", "Max Weber"],
    kunci: "A",
    hint: "Namanya tertulis di bagian atas layar, setelah kata \"Animasi\".",
    penjelasan:
      "Robert Hall dikenal lewat rekonstruksi pergerakan lempeng di Asia Tenggara. Animasinya memperlihatkan pulau-pulau Indonesia berpindah posisi selama jutaan tahun.",
  },
  6: {
    // Disusun dari foto survei 10 Nov 2026: panel "Pelapukan, Erosi, dan Pengendapan",
    // "Sembilan Bentukan Morfologi Muka Bumi", panel gumuk pasir Parangtritis, label batugamping
    // dan batupasir. Status: Draft. Foto belum dipasang.
    fotoUtama: 2,
    fotoKedua: 0,
    judul: "Batu yang Pelan-Pelan Berubah",
    cerita:
      "Batuan yang terangkat menjadi daratan tidak abadi. Panas, hujan, akar tumbuhan, dan hewan pelan-pelan melapukkannya hingga menjadi tanah. Air, angin, dan es lalu mengikis serta membawa material itu ke tempat lain. Saat tenaganya habis, material diendapkan dan membentuk roman muka Bumi yang baru. Panel di sini menunjukkan sembilan bentukan muka Bumi, dari vulkanik, sungai, pantai, angin, sampai es. Lihat batugamping dari Wonogiri: rongganya terbentuk karena batuan larut oleh air.",
    fakta:
      "Gumuk pasir Parangtritis, Yogyakarta, satu-satunya di Asia Tenggara, ditetapkan sebagai kawasan cagar alam geologi pada Oktober 2014.",
    sorotan:
      "Batugamping berongga (Wonogiri, Jawa Tengah), batupasir bentukan erosi air laut (Bayah, Banten), panel sembilan bentukan muka Bumi",
    instruksi: "Temukan batugamping berlubang di vitrin, lalu baca keterangan pada labelnya.",
    pertanyaan: "Rongga-rongga pada batugamping di vitrin ini terbentuk karena apa?",
    opsi: ["Pelarutan oleh air", "Letusan gunung api", "Gigitan hewan", "Pembekuan lava"],
    kunci: "A",
    hint: "Batugamping mudah larut oleh air hujan, sama seperti di kawasan kars.",
    penjelasan:
      "Air hujan yang sedikit asam melarutkan batugamping sedikit demi sedikit sehingga terbentuk rongga. Inilah contoh pelapukan kimia.",
  },
  7: {
    // Disusun dari foto survei 10 Nov 2026: panel "Mineral" dan "Batuan", label vitrin mineral.
    // Status: Draft. Foto belum dipasang.
    fotoUtama: 4,
    fotoKedua: 1,
    judul: "Pelangi di Dalam Batu",
    cerita:
      "Semua batuan tersusun dari mineral, yaitu bahan padat alami dengan susunan kimia tertentu dan bentuk kristal yang khas. Vitrin di sini memamerkan mineral dari berbagai kelompok, dari unsur murni seperti emas, sulfida seperti pirit, hingga silikat. Warnanya pun beragam: ungu pada kristal ametis, biru tua pada lapis lazuli, dan merah muda pada rhodochrosite. Mineral bergabung membentuk tiga jenis batuan: batuan beku dari magma, batuan sedimen dari endapan, dan batuan metamorf yang berubah karena panas dan tekanan.",
    fakta:
      "Batuan terus berputar dalam siklus batuan: batuan beku, sedimen, dan metamorf bisa berubah satu menjadi yang lain selama jutaan tahun.",
    sorotan:
      "Kristal ametis dan geode ametis (Brasil), lapis lazuli (Afghanistan), agate (Sukabumi, Jawa Barat), rhodochrosite (Afrika Selatan), panel batuan beku, sedimen, metamorf",
    instruksi: "Temukan agate, batu berlapis-lapis berwarna kebiruan, lalu baca labelnya.",
    pertanyaan: "Mineral di vitrin ini datang dari banyak negara. Dari mana asal agate yang dipamerkan?",
    opsi: ["Sukabumi, Jawa Barat", "Brasil", "Afghanistan", "Afrika Selatan"],
    kunci: "A",
    hint: "Agate ini berasal dari Indonesia sendiri.",
    penjelasan:
      "Agate adalah kalsedon, sejenis kuarsa yang berlapis-lapis. Lapisannya terbentuk saat larutan kaya silika mengendap sedikit demi sedikit di dalam rongga batuan.",
  },
  8: {
    // Disusun dari foto survei 10 Nov 2026: panel "Terjadinya Tenaga Tektonik" dan "Tenaga Tektonik",
    // label peridotit, lava basal, sekis mika. Status: Draft. Foto belum dipasang.
    fotoUtama: 3,
    fotoKedua: 0,
    judul: "Mesin Panas di Perut Bumi",
    cerita:
      "Inti Bumi menyimpan energi panas yang memunculkan arus konveksi di dalam magma. Arus ini menyeret kerak Bumi di atasnya sehingga kulit Bumi terkoyak menjadi lempeng-lempeng yang bergerak sekitar 7 cm per tahun. Lempeng bisa saling mendekat (konvergen), saling menjauh (divergen), atau saling berpapasan (transform). Akibatnya muncul lipatan, patahan, gempa bumi, dan gunung api. Peridotit dari Ciletuh di depanmu adalah batuan dari kedalaman yang terangkat ke permukaan karena tenaga tektonik.",
    fakta:
      "Meski hanya sekitar 7 cm per tahun, gerakan lempeng selama ratusan juta tahun sanggup menggeser benua sejauh ribuan kilometer.",
    sorotan:
      "Peridotit (Ciletuh, Jawa Barat), lava basal (Karang Asem, Bali), sekis mika (Palu, Sulawesi Tengah), panel lapisan Bumi dan sebaran lempeng tektonik",
    instruksi: "Temukan batu hitam mengilap bergaris kekuningan di bawah panel, lalu baca labelnya.",
    pertanyaan: "Dari mana peridotit di bawah panel tenaga tektonik ini berasal?",
    opsi: ["Ciletuh, Jawa Barat", "Karang Asem, Bali", "Palu, Sulawesi Tengah", "Donggala, Sulawesi Tengah"],
    kunci: "A",
    hint: "Tempat ini terkenal sebagai geopark di Sukabumi.",
    penjelasan:
      "Peridotit adalah batuan dari mantel Bumi yang kaya mineral olivin. Di Ciletuh, batuan ini tersingkap ke permukaan karena tumbukan lempeng.",
  },
  9: {
    // Disusun dari foto survei 10 Nov 2026: panel "Alam Semesta & Pembentukan Planet Bumi",
    // vitrin meteorit batu, meteorit besi, meteorit Namibia, dan tektit. Status: Draft. Foto belum dipasang.
    fotoUtama: 1,
    fotoKedua: 0,
    judul: "Batu Tamu dari Luar Angkasa",
    cerita:
      "Menurut Teori Big Bang di panel ini, alam semesta berawal dari ledakan dahsyat sekitar 13,7 miliar tahun lalu. Tata surya lalu terbentuk dari kabut raksasa berisi gas dan debu yang berputar, sesuai Teori Kabut dari Kant dan Laplace. Bumi awalnya masih berpijar, lalu permukaannya perlahan mendingin dan memadat. Batu dari luar angkasa yang jatuh ke Bumi disebut meteorit. Di vitrin ada meteorit batu, meteorit besi, dan meteorit Namibia yang berukuran besar.",
    fakta:
      "Sejak 2006 para ahli tidak lagi menggolongkan Pluto sebagai planet, karena garis edarnya sangat berbeda dengan planet-planet lain.",
    sorotan:
      "Meteorit batu (Cilimus, Menes, Wonotirto, Wellman), meteorit besi (Prambanan, Texas, Henbury), meteorit Namibia, tektit, panel Big Bang dan Teori Kabut",
    instruksi: "Temukan vitrin \"Meteorit Besi\", lalu cocokkan nomor 1 dengan daftar di labelnya.",
    pertanyaan: "Meteorit besi nomor 1 di vitrin ini ditemukan di mana?",
    opsi: ["Prambanan, Jawa Tengah", "Texas, USA", "Henbury, Australia", "Namibia, Afrika"],
    kunci: "A",
    hint: "Tempatnya terkenal dengan candi besar di Jawa Tengah.",
    penjelasan:
      "Meteorit besi tersusun terutama dari logam besi dan nikel, sehingga jauh lebih berat daripada batu biasa yang seukuran.",
  },
  10: {
    // Disusun dari foto survei 10 Nov 2026: label rijang, batugamping hitam, sekis biotit, peridotit,
    // panel "Batuan Granit" (granit pembawa timah Bangka Belitung). Status: Draft. Foto belum dipasang.
    fotoUtama: 3,
    fotoKedua: 5,
    judul: "Batuan Nusantara yang Beragam",
    cerita:
      "Indonesia menyimpan batuan yang sangat beragam karena sejarah geologinya panjang dan rumit. Di ruang ini ada rijang dari Karangsambung, batugamping hitam dari Bayah, sekis biotit dari Sigi, dan peridotit dari Ciletuh. Ada juga granit, batuan beku berbutir kasar yang terkenal di Bangka Belitung. Granit di sana membawa timah. Saat granit lapuk dan tererosi, timahnya ikut terbawa lalu mengendap kembali menjadi endapan timah sekunder.",
    fakta: "Granit Bangka Belitung termasuk jalur granit timah Asia Tenggara.",
    sorotan:
      "Rijang (Karangsambung, Jawa Tengah), batugamping hitam (Bayah, Banten), sekis biotit (Sigi, Sulawesi Tengah), peridotit (Ciletuh, Sukabumi), panel granit pembawa timah",
    instruksi: "Temukan batu cokelat bergaris-garis putih berlabel \"Rijang\", lalu baca asalnya.",
    pertanyaan: "Rijang di ruangan ini berasal dari mana?",
    opsi: ["Karangsambung, Jawa Tengah", "Bayah, Banten", "Sigi, Sulawesi Tengah", "Ciletuh, Sukabumi"],
    kunci: "A",
    hint: "Lokasinya di Jawa Tengah dan terkenal sebagai cagar alam geologi.",
    penjelasan:
      "Rijang adalah batuan yang sangat keras dan kaya silika. Di Karangsambung, rijang ditemukan bersama batuan dasar samudra purba yang terangkat ke daratan.",
  },
  11: {
    // Disusun dari foto survei 10 Nov 2026: panel "Kekayaan Sumber Daya Geologi", label bijih besi,
    // batubara, bijih tembaga, bijih timbal. Status: Draft. Foto belum dipasang.
    fotoUtama: 0,
    fotoKedua: 3,
    judul: "Harta Karun di Bawah Tanah",
    cerita:
      "Proses geologi yang berlangsung jutaan tahun membuat Indonesia kaya sumber daya mineral dan energi. Peta di panel menunjukkan sebarannya: minyak dan gas di Minas, Riau, batubara di Bukit Asam, Sumatra Selatan, hingga panas bumi di Kamojang, Jawa Barat. Di vitrin ada batubara dari Ombilin, bijih besi dari Kalimantan Selatan, dan bijih tembaga dari Tembagapura, Papua. Sumber daya ini harus dikelola dengan bijak karena tidak bisa terbentuk kembali dalam waktu singkat.",
    fakta: "Bijih tembaga dari Tembagapura di vitrin ini mengandung tembaga sekitar 15%.",
    sorotan:
      "Batubara (Ombilin, Sumatera Barat), bijih besi (Harujan, Kalimantan Selatan), bijih tembaga (Tembagapura, Papua), bijih timbal pembawa emas dan perak (Bogor, Jawa Barat), panel peta sumber daya",
    instruksi: "Temukan batu hitam mengilap berlabel \"Batubara\", lalu baca asalnya.",
    pertanyaan: "Batubara di vitrin ini berasal dari mana?",
    opsi: ["Ombilin, Sumatera Barat", "Harujan, Kalimantan Selatan", "Tembagapura, Papua", "Bogor, Jawa Barat"],
    kunci: "A",
    hint: "Tempatnya di Sumatera Barat dan terkenal sebagai kawasan tambang tua.",
    penjelasan:
      "Batubara terbentuk dari sisa tumbuhan yang tertimbun jutaan tahun lalu, lalu terkena panas dan tekanan sehingga berubah menjadi batuan yang bisa dibakar.",
  },
  12: {
    // Display di lokasi KOSONG saat survei 10 Nov 2026 (hanya dinding melengkung). Konten dibuat
    // sebagai pengantar sayap kanan dan quest-nya berbasis cerita, bukan objek. Ganti bila display
    // sudah terpasang. Status: Draft.
    fotoUtama: 0,
    judul: "Awal Perjalanan Kehidupan",
    cerita:
      "Selamat datang di sayap Sejarah Kehidupan! Bumi berumur sekitar 4,6 miliar tahun, tetapi kehidupan tidak langsung muncul. Makhluk pertama berupa makhluk bersel satu yang hidup di laut. Perlahan muncul hewan bercangkang, ikan, tumbuhan darat, dinosaurus, mamalia, hingga manusia. Ahli geologi membagi perjalanan panjang ini menjadi beberapa masa: Prakambrium, Paleozoikum, Mesozoikum, dan Kenozoikum. Jejaknya tersimpan sebagai fosil di dalam batuan. Ikuti ruangan berikutnya untuk menelusuri tiap masa!",
    fakta: "Fosil adalah sisa atau jejak makhluk hidup purba yang terawetkan di dalam batuan.",
    sorotan: "Ruang pengantar sejarah kehidupan (display kosong saat survei 10 Nov 2026)",
    instruksi: "Baca kembali cerita pengantar ini, lalu perhatikan urutan masa kehidupan di Bumi.",
    pertanyaan: "Masa manakah yang paling tua dalam sejarah kehidupan Bumi?",
    opsi: ["Prakambrium", "Paleozoikum", "Mesozoikum", "Kenozoikum"],
    kunci: "A",
    hint: "Masa ini disebut paling awal dalam cerita.",
    penjelasan:
      "Prakambrium adalah masa tertua dan terpanjang, dari terbentuknya Bumi hingga sekitar 541 juta tahun lalu. Setelahnya berturut-turut Paleozoikum, Mesozoikum, dan Kenozoikum.",
  },
  13: {
    // Disusun dari foto survei 10 Nov 2026: panel "Kurun Prakambrium", "Pemadatan Bumi",
    // "Makhluk Hidup Pertama", vitrin stromatolit dan batuan Prakambrium. Status: Draft. Foto belum dipasang.
    fotoUtama: 2,
    fotoKedua: 3,
    judul: "Ketika Bumi Masih Membara",
    cerita:
      "Kurun Prakambrium berlangsung dari sekitar 4,5 miliar sampai 541 juta tahun lalu. Awalnya Bumi sangat panas, sekitar 1.000°C, dan udaranya kaya karbon dioksida tanpa oksigen. Sekitar 3,5 miliar tahun lalu muncul makhluk bersel satu di samudra, seperti bakteri dan ganggang biru-hijau (sianofit). Mereka berfotosintesis dan menghasilkan oksigen, sampai akhirnya terbentuk lapisan ozon. Jejak mereka tersimpan sebagai stromatolit, batuan berlapis-lapis di vitrin ini. Di akhir kurun ini barulah muncul ubur-ubur, cacing, dan koral.",
    fakta:
      "Prakambrium dibagi menjadi dua masa: Arkean (4,6–2,5 miliar tahun lalu) dan Proterozoikum (2,5 miliar–540 juta tahun lalu).",
    sorotan:
      "Stromatolit, genes hornblende, genes, sekis biotit dan itabirit (Liberia), granit Prakambrium, batupasir berlapis (Australia)",
    instruksi: "Cari batuan berlapis-lapis bergelombang di vitrin, lalu baca labelnya.",
    pertanyaan: "Fosil jejak mikroorganisme awal kehidupan yang dipamerkan di sini disebut apa?",
    opsi: ["Stromatolit", "Trilobit", "Amonit", "Itabirit"],
    kunci: "A",
    hint: "Namanya diawali kata \"stroma\" yang berarti lapisan.",
    penjelasan:
      "Stromatolit terbentuk dari lapisan lendir mikroorganisme yang memerangkap butiran sedimen, menumpuk lapis demi lapis selama ribuan tahun.",
  },
  14: {
    // Disusun dari foto survei 10 Nov 2026: panel "Masa Paleozoikum" (Kambrium–Perem), layar
    // Eurypterus, model Coelacanth, fosil amonoid & nautiloid. Status: Draft. Foto belum dipasang.
    fotoUtama: 5,
    fotoKedua: 1,
    judul: "Lautan Penuh Kehidupan",
    cerita:
      "Masa Paleozoikum berlangsung sekitar 540 sampai 245 juta tahun lalu. Di awal masa ini terjadi ledakan Kambrium: jumlah makhluk hidup bertambah sangat pesat, dan lautan dihuni arthropoda berlapis baja seperti trilobit. Lalu muncul ikan primitif, kalajengking laut Eurypterus, dan hiu purba. Pada zaman Devon, ikan mulai berkaki dan berjalan ke darat. Zaman Karbon dipenuhi rawa dan pohon yang kelak menjadi batubara. Masa ini ditutup zaman Perem, ketika amonit hidup di laut.",
    fakta:
      "Coelacanth, ikan purba yang muncul sekitar 380 juta tahun lalu, masih hidup sampai sekarang. Salah satu jenisnya, Latimeria manadoensis, ditemukan di perairan Manado, Sulawesi.",
    sorotan:
      "Model Coelacanth (Latimeria), fosil amonoid dan nautiloid (Maroko), fosil trilobit, fosil tumbuhan, layar Eurypterus",
    instruksi: "Temukan model ikan besar berbintik putih bernama Coelacanth, lalu baca papan informasinya.",
    pertanyaan: "Coelacanth jenis Latimeria manadoensis ditemukan di perairan mana?",
    opsi: ["Manado, Sulawesi", "Kepulauan Komoro", "Bali", "Papua"],
    kunci: "A",
    hint: "Nama jenisnya mirip nama kota tempat ia ditemukan.",
    penjelasan:
      "Coelacanth sempat dikira sudah punah jutaan tahun lalu. Ikan ini hidup di kedalaman 100–400 meter dengan suhu air 12–18°C.",
  },
};

export function poiCode(n: number): string {
  return `P${String(n).padStart(2, "0")}`;
}

export const museumPois: readonly MuseumPoi[] = rows.map(
  ([number, name, wing, latitude, longitude, room]: Row): MuseumPoi => ({
    code: poiCode(number),
    number,
    name,
    wing,
    latitude,
    longitude,
    radiusMeters: 15,
    room,
    content: contents[number] ?? null,
  }),
);

export const activePois: readonly MuseumPoi[] = museumPois.filter(
  (poi: MuseumPoi): boolean => poi.content !== null,
);

// ID stabil per kode POI (pola sama dengan fixture backend). C-1 dipersilakan memakai ID ini
// saat seed (B6) agar denah bisa mencocokkan POI dari database tanpa kolom tambahan.
function uuidFor(prefix: string, n: number): string {
  return `${prefix}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
export const poiIdFor = (n: number): string => uuidFor("30000000", n);
export const questIdFor = (n: number): string => uuidFor("40000000", n);

export function museumPoiById(idPoi: string): MuseumPoi | undefined {
  return museumPois.find((poi: MuseumPoi): boolean => poiIdFor(poi.number) === idPoi);
}

export function museumPoiByCode(code: string): MuseumPoi | undefined {
  return museumPois.find((poi: MuseumPoi): boolean => poi.code === code.toUpperCase());
}

/** Cocokkan POI dari backend ke ruangan denah: lewat ID stabil, lalu nama. */
export function museumPoiFor(idPoi: string, nama: string): MuseumPoi | undefined {
  const byId: MuseumPoi | undefined = museumPoiById(idPoi);
  if (byId !== undefined) return byId;
  const clean = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  return museumPois.find((poi: MuseumPoi): boolean => clean(poi.name) === clean(nama));
}
