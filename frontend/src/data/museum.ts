// Dataset lokal Museum Geologi lantai 1.
// Sumber: Template_Scratch_Data_Museum_Geologi.xlsx (sheet POI_Master, Konten_Cerita, Quest,
// Badge_Poin) dan denah di "Survey Docs". ID, nama, zona dan koordinat memakai dataset A9
// di backend/data/checkpoints.json; 20 POI sudah disurvei pada 10 November 2026.
//
// Cerita final memakai backend/data/approved-stories.json. Cerita lainnya dan seluruh soal
// masih DRAFT dan perlu diperiksa ke kurator / papan informasi museum (B4).
// Saat mode API, konten diambil dari database; file ini tetap dipakai untuk denah dan QR offline.

import approvedStories from "../../../backend/data/approved-stories.json" with { type: "json" };
import checkpoints from "../../../backend/data/checkpoints.json" with { type: "json" };
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
  // `cerita` di atas = versi dewasa (18+). Versi usia lain DRAFT, cek ke kurator;
  // kosong = pengunjung usia itu melihat versi dewasa.
  /** Anak 7–12: kalimat pendek, istilah dijelaskan dengan kata sehari-hari. */
  readonly ceritaAnak?: string;
  /** Remaja 13–17: istilah ilmiah tetap dipakai dan dijelaskan singkat. */
  readonly ceritaRemaja?: string;
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
  readonly idPoi: string;
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

type SurveyCheckpoint = (typeof checkpoints.pois)[number];

const rooms: { readonly [poiCode: string]: RoomBox } = {
  "POI-01": { x: 240, y: 0, w: 107, h: 54 },
  "POI-02": { x: 185, y: 0, w: 55, h: 54 },
  "POI-03": { x: 133, y: 0, w: 52, h: 54 },
  "POI-04": { x: 82, y: 0, w: 51, h: 54 },
  "POI-05": { x: 82, y: 90, w: 51, h: 52 },
  "POI-06": { x: 133, y: 90, w: 52, h: 52 },
  "POI-07": { x: 185, y: 90, w: 55, h: 52 },
  "POI-08": { x: 240, y: 90, w: 53, h: 52 },
  "POI-09": { x: 293, y: 90, w: 54, h: 52 },
  "POI-10": { x: 0, y: 0, w: 78, h: 47 },
  "POI-11": { x: 0, y: 55, w: 78, h: 47 },
  "POI-12": { x: 0, y: 72, w: 44, h: 70 },
  "POI-13": { x: 0, y: 0, w: 62, h: 48 },
  "POI-14": { x: 62, y: 0, w: 78, h: 48 },
  "POI-15": { x: 140, y: 0, w: 77, h: 48 },
  "POI-16": { x: 217, y: 0, w: 86, h: 48 },
  "POI-17": { x: 44, y: 84, w: 168, h: 58 },
  "POI-18": { x: 212, y: 72, w: 91, h: 70 },
  "POI-19": { x: 257, y: 142, w: 46, h: 53 },
  "POI-20": { x: 212, y: 142, w: 45, h: 53 },
};

function approvedStoryContent(
  code: string,
): Pick<StoryContent, "judul" | "cerita" | "fakta" | "sorotan"> {
  const story: (typeof approvedStories.stories)[number] | undefined = approvedStories.stories.find(
    (story: (typeof approvedStories.stories)[number]): boolean => story.poiCode === code,
  );
  if (story === undefined) throw new RangeError(`Cerita final ${code} belum terdaftar.`);
  return {
    judul: story.title,
    cerita: story.description,
    fakta: story.fact,
    sorotan: story.highlights,
  };
}

// Konten untuk P01–P14; cerita final disatukan dengan soal dan pilihan foto draft.
// Konten P15–P20 belum diisi, jadi tampil "segera hadir" di peta.
const contents: { readonly [n: number]: StoryContent } = {
  1: {
    ...approvedStoryContent("POI-01"),
    // Disusun dari foto survei 10 Nov 2026: panel "Paleogeografi dan Sebaran Fauna di Indonesia",
    // panel "Sebaran Fauna di Indonesia", dan label vitrin. Status: Draft, cek ke kurator.
    fotoUtama: 5,
    fotoKedua: 0,
    ceritaAnak:
      "Dulu, saat zaman es, banyak air laut membeku jadi es di kutub. Akibatnya laut jadi lebih dangkal, turun lebih dari 100 meter! Dasar laut di barat Indonesia pun muncul jadi daratan, namanya Paparan Sunda. Daratan ini seperti jembatan yang menyambungkan Sumatra, Jawa, dan Kalimantan dengan Asia. Hewan dari Asia, seperti kerabat gajah, berjalan melewatinya ke Nusantara. Buktinya ada di vitrin: rahang Sinomastodon dari Bumiayu dan gading gajah purba dari Sangihe.",
    ceritaRemaja:
      "Saat zaman es, banyak air laut membeku di kutub sehingga muka air laut turun lebih dari 100 meter. Dasar laut dangkal di barat Indonesia pun muncul menjadi daratan luas bernama Paparan Sunda. Daratan ini menjadi jembatan yang menyambungkan Sumatra, Jawa, dan Kalimantan dengan Asia. Hewan dari Asia bermigrasi lewat jembatan ini dalam tiga gelombang: sekitar 2,6 juta, 0,8 juta, dan 250 ribu tahun lalu. Buktinya ada di vitrin: rahang Sinomastodon dari Bumiayu dan gading Elephas celebensis dari Sangihe.",
    instruksi: "Temukan fosil rahang bawah berwarna cokelat di dalam vitrin, lalu baca label hitam di bawahnya.",
    pertanyaan: "Dari mana fosil rahang Sinomastodon bumiayuensis ditemukan?",
    opsi: ["Bumiayu, Jawa Tengah", "Sangihe, Sulawesi Utara", "Cipeundeuy, Jawa Barat", "Trinil, Jawa Timur"],
    kunci: "A",
    hint: "Nama spesiesnya mirip dengan nama tempat ia ditemukan.",
    penjelasan:
      "Sinomastodon bumiayuensis adalah kerabat gajah dari Pliosen akhir, sekitar 3,6 juta tahun lalu. Rahangnya ditemukan di Bumiayu, Jawa Tengah.",
  },
  2: {
    ...approvedStoryContent("POI-02"),
    // Disusun dari foto survei 10 Nov 2026: panel "Kars Indonesia", "Karstifikasi dan Hasilnya",
    // "Kars Gunung Sewu", "Fenomena Kars Indonesia", dan label vitrin karang. Status: Draft.
    fotoUtama: 9,
    fotoKedua: 13,
    ceritaAnak:
      "Tahukah kamu, batugamping kebanyakan berasal dari kerangka hewan laut, misalnya terumbu karang? Karang tumbuh di laut hangat Indonesia. Lalu gerakan Bumi mengangkatnya jadi daratan. Air hujan pelan-pelan melarutkan batugamping itu. Proses ini disebut karstifikasi. Hasilnya ada bukit-bukit kars di permukaan, dan gua serta sungai bawah tanah di dalamnya. Contohnya Kars Gunung Sewu dan Maros-Pangkep. Karang di vitrin ini adalah bahan dasar kars!",
    ceritaRemaja:
      "Batugamping sebagian besar terbentuk dari cangkang dan kerangka hewan laut, terutama terumbu karang di laut hangat Indonesia. Gerakan tektonik kemudian mengangkat batugamping itu menjadi daratan. Air hujan yang sedikit asam lalu melarutkannya perlahan, proses yang disebut karstifikasi. Hasilnya bentang alam kars: bukit dan lembah di permukaan, serta gua, sungai bawah tanah, dan stalaktit di dalamnya. Contohnya Kars Gunung Sewu, Maros-Pangkep, dan Gombong. Karang di vitrin ini adalah bahan dasar kars!",
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
    ceritaAnak:
      "Indonesia berada di Cincin Api Pasifik, tempat lempeng-lempeng Bumi bertemu. Lempeng adalah potongan besar kulit Bumi. Pertemuan lempeng inilah yang membuat banyak gunung api, dari Sumatra sampai Maluku. Saat meletus, gunung api menghasilkan batu yang berbeda-beda. Lava yang cepat dingin jadi obsidian, batu hitam mengilap seperti kaca. Batuapung punya banyak lubang dari gelembung gas, jadi sangat ringan. Gumpalan lava yang terlempar lalu membeku disebut bom gunung api.",
    ceritaRemaja:
      "Indonesia berada di Cincin Api Pasifik, jalur tempat lempeng-lempeng Bumi saling bertemu. Pertemuan lempeng inilah yang membentuk deretan gunung api dari Sumatra sampai Maluku. Saat meletus, gunung api menghasilkan batuan yang beragam. Lava yang membeku sangat cepat menjadi obsidian, kaca vulkanik yang hitam mengilap. Gas yang terperangkap meninggalkan banyak rongga, seperti pada batuapung dan basalt vesikuler. Gumpalan lava yang terlempar ke udara lalu membeku sebelum jatuh disebut bom gunung api.",
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
    ...approvedStoryContent("POI-04"),
    // Disusun dari foto survei 10 Nov 2026: vitrin "Sesar" dan "Lipatan", genes dan sekis biotit
    // Donggala, panel "Gunung Batu, Sesar Lembang". Status: Draft. Foto belum dipasang.
    fotoUtama: 3,
    fotoKedua: 2,
    ceritaAnak:
      "Muka Bumi Indonesia terus berubah karena ada tenaga dari dalam Bumi. Kalau batuan ditekan pelan-pelan, lapisannya bisa melengkung. Ini disebut lipatan. Kalau tekanannya terlalu kuat, batuan patah lalu bergeser. Ini disebut sesar. Gesekan sesar bisa membuat permukaan batu jadi halus seperti cermin, namanya cermin sesar. Dekat Bandung juga ada sesar, lho: Sesar Lembang, panjangnya lebih dari 22 km!",
    ceritaRemaja:
      "Muka Bumi Indonesia terus berubah karena tenaga dari dalam Bumi. Saat batuan ditekan perlahan, lapisannya melengkung membentuk lipatan, seperti sekis terlipat dari Pegunungan Cyclop, Papua. Jika tekanannya melebihi kekuatan batuan, batuan patah dan bergeser membentuk sesar. Gesekan di bidang sesar bisa menghasilkan permukaan licin yang disebut cermin sesar, sementara pecahan batuan yang menyatu kembali disebut breksi sesar. Bandung juga punya sesar aktif: Sesar Lembang, yang panjangnya lebih dari 22 km.",
    instruksi: "Temukan vitrin berlabel \"Sesar\", lalu baca keterangan batu nomor 1.",
    pertanyaan: "Apa nama bidang batuan yang halus akibat pergerakan sesar?",
    opsi: ["Cermin sesar", "Breksi sesar", "Sekis terlipat", "Genes"],
    kunci: "A",
    hint: "Namanya mirip benda yang permukaannya halus dan bisa memantulkan bayangan.",
    penjelasan:
      "Cermin sesar terbentuk saat dua blok batuan saling bergesekan ketika sesar bergerak, sehingga permukaannya menjadi halus dan mengilap.",
  },
  5: {
    ...approvedStoryContent("POI-05"),
    // Disusun dari foto survei 10 Nov 2026: layar "Morfologi Indonesia" dan "Animasi Robert Hall",
    // panel "Kapan Kepulauan Indonesia Terbentuk?". Status: Draft. Foto belum dipasang.
    fotoUtama: 1,
    fotoKedua: 2,
    ceritaAnak:
      "Di ruang animasi ini kamu bisa menonton bagaimana Kepulauan Indonesia terbentuk. Animasinya dibuat Robert Hall, geolog dari Inggris. Geolog adalah ilmuwan yang mempelajari Bumi dan batuan. Animasi ini memutar ulang waktu sampai puluhan juta tahun lalu. Kamu akan melihat pulau-pulau bergeser sedikit demi sedikit, karena lempeng Bumi terus bergerak. Sampai sekarang Indonesia masih diapit tiga lempeng: Eurasia, Indo-Australia, dan Pasifik.",
    ceritaRemaja:
      "Ruang animasi ini memperlihatkan bagaimana Kepulauan Indonesia terbentuk. Animasinya dibuat oleh Robert Hall, geolog asal Inggris yang meneliti geologi Indonesia. Animasi ini memutar ulang waktu hingga puluhan juta tahun lalu. Kamu bisa melihat pulau-pulau bergeser sedikit demi sedikit karena lempeng-lempeng Bumi terus bergerak dan bertumbukan. Sampai sekarang Indonesia masih diapit tiga lempeng besar: Eurasia, Indo-Australia, dan Pasifik. Hasilnya adalah negara kepulauan dengan garis pantai yang sangat panjang.",
    instruksi: "Tonton animasi di layar besar dan perhatikan judul di pojok kiri atasnya.",
    pertanyaan: "Siapa geolog dari Inggris yang membuat animasi pembentukan Kepulauan Indonesia di ruangan ini?",
    opsi: ["Robert Hall", "Alfred Russel Wallace", "Eugène Dubois", "Max Weber"],
    kunci: "A",
    hint: "Namanya tertulis di bagian atas layar, setelah kata \"Animasi\".",
    penjelasan:
      "Robert Hall dikenal lewat rekonstruksi pergerakan lempeng di Asia Tenggara. Animasinya memperlihatkan pulau-pulau Indonesia berpindah posisi selama jutaan tahun.",
  },
  6: {
    ...approvedStoryContent("POI-06"),
    // Disusun dari foto survei 10 Nov 2026: panel "Pelapukan, Erosi, dan Pengendapan",
    // "Sembilan Bentukan Morfologi Muka Bumi", panel gumuk pasir Parangtritis, label batugamping
    // dan batupasir. Status: Draft. Foto belum dipasang.
    fotoUtama: 2,
    fotoKedua: 0,
    ceritaAnak:
      "Batu ternyata bisa berubah, walau sangat pelan! Panas, hujan, akar tumbuhan, dan hewan membuat batu rapuh lalu hancur jadi tanah. Ini disebut pelapukan. Lalu air, angin, dan es membawa butiran itu ke tempat lain. Ini disebut erosi. Saat berhenti, butiran itu menumpuk dan membentuk daratan baru. Ini disebut pengendapan. Coba lihat batugamping dari Wonogiri: lubang-lubangnya terbentuk karena batu larut oleh air.",
    ceritaRemaja:
      "Batuan yang terangkat ke permukaan tidak bertahan selamanya. Panas, hujan, akar tumbuhan, dan hewan perlahan menghancurkannya menjadi tanah. Proses ini disebut pelapukan. Air, angin, dan es lalu mengikis dan memindahkan material itu, yang disebut erosi. Ketika tenaga pengangkutnya habis, material diendapkan dan membentuk muka Bumi yang baru. Panel di sini menunjukkan sembilan bentukan muka Bumi, dari vulkanik, sungai, pantai, angin, sampai es. Rongga pada batugamping Wonogiri terbentuk karena batuan larut oleh air.",
    instruksi: "Temukan batugamping berlubang di vitrin, lalu baca keterangan pada labelnya.",
    pertanyaan: "Rongga-rongga pada batugamping di vitrin ini terbentuk karena apa?",
    opsi: ["Pelarutan oleh air", "Letusan gunung api", "Gigitan hewan", "Pembekuan lava"],
    kunci: "A",
    hint: "Batugamping mudah larut oleh air hujan, sama seperti di kawasan kars.",
    penjelasan:
      "Air hujan yang sedikit asam melarutkan batugamping sedikit demi sedikit sehingga terbentuk rongga. Inilah contoh pelapukan kimia.",
  },
  7: {
    ...approvedStoryContent("POI-07"),
    // Disusun dari foto survei 10 Nov 2026: panel "Mineral" dan "Batuan", label vitrin mineral.
    // Status: Draft. Foto belum dipasang.
    fotoUtama: 4,
    fotoKedua: 1,
    ceritaAnak:
      "Semua batu tersusun dari mineral. Mineral adalah bahan padat dari alam yang punya bentuk kristal khas. Di vitrin ini ada emas, pirit yang berkilau seperti emas, dan banyak lagi. Warnanya juga cantik: ametis berwarna ungu, lapis lazuli biru tua, dan rhodochrosite merah muda. Mineral bergabung jadi tiga jenis batuan. Batuan beku berasal dari magma, batuan sedimen dari endapan, dan batuan metamorf berubah karena panas dan tekanan.",
    ceritaRemaja:
      "Semua batuan tersusun dari mineral, yaitu benda padat alami dengan susunan kimia tertentu dan bentuk kristal yang khas. Vitrin ini menampilkan mineral dari berbagai kelompok: unsur murni seperti emas, sulfida seperti pirit, sampai silikat. Warnanya beragam, misalnya ungu pada ametis, biru tua pada lapis lazuli, dan merah muda pada rhodochrosite. Mineral membentuk tiga jenis batuan: batuan beku dari magma yang membeku, batuan sedimen dari endapan, dan batuan metamorf yang berubah karena panas dan tekanan.",
    instruksi: "Temukan agate, batu berlapis-lapis berwarna kebiruan, lalu baca labelnya.",
    pertanyaan: "Mineral di vitrin ini datang dari banyak negara. Dari mana asal agate yang dipamerkan?",
    opsi: ["Sukabumi, Jawa Barat", "Brasil", "Afghanistan", "Afrika Selatan"],
    kunci: "A",
    hint: "Agate ini berasal dari Indonesia sendiri.",
    penjelasan:
      "Agate adalah kalsedon, sejenis kuarsa yang berlapis-lapis. Lapisannya terbentuk saat larutan kaya silika mengendap sedikit demi sedikit di dalam rongga batuan.",
  },
  8: {
    ...approvedStoryContent("POI-08"),
    // Disusun dari foto survei 10 Nov 2026: panel "Terjadinya Tenaga Tektonik" dan "Tenaga Tektonik",
    // label peridotit, lava basal, sekis mika. Status: Draft. Foto belum dipasang.
    fotoUtama: 3,
    fotoKedua: 0,
    ceritaAnak:
      "Di dalam Bumi sangat panas. Panas ini membuat magma bergerak berputar, seperti air mendidih di panci. Gerakan itu menyeret kulit Bumi sehingga terpecah jadi lempeng-lempeng. Lempeng bergerak sekitar 7 cm setiap tahun. Lempeng bisa saling mendekat, saling menjauh, atau saling berpapasan. Akibatnya muncul lipatan, patahan, gempa bumi, dan gunung api. Peridotit dari Ciletuh di depanmu dulunya batu dari dalam Bumi.",
    ceritaRemaja:
      "Inti Bumi menyimpan panas yang memicu arus konveksi, yaitu aliran berputar di dalam lapisan Bumi yang panas. Arus ini menyeret kerak Bumi sehingga terpecah menjadi lempeng-lempeng yang bergerak sekitar 7 cm per tahun. Lempeng bisa saling mendekat (konvergen), saling menjauh (divergen), atau saling berpapasan (transform). Akibatnya terbentuk lipatan, patahan, gempa bumi, dan gunung api. Peridotit dari Ciletuh di depanmu berasal dari kedalaman Bumi dan terangkat ke permukaan karena tenaga tektonik.",
    instruksi: "Temukan batu hitam mengilap bergaris kekuningan di bawah panel, lalu baca labelnya.",
    pertanyaan: "Dari mana peridotit di bawah panel tenaga tektonik ini berasal?",
    opsi: ["Ciletuh, Jawa Barat", "Karang Asem, Bali", "Palu, Sulawesi Tengah", "Donggala, Sulawesi Tengah"],
    kunci: "A",
    hint: "Tempat ini terkenal sebagai geopark di Sukabumi.",
    penjelasan:
      "Peridotit adalah batuan dari mantel Bumi yang kaya mineral olivin. Di Ciletuh, batuan ini tersingkap ke permukaan karena tumbukan lempeng.",
  },
  9: {
    ...approvedStoryContent("POI-09"),
    // Disusun dari foto survei 10 Nov 2026: panel "Alam Semesta & Pembentukan Planet Bumi",
    // vitrin meteorit batu, meteorit besi, meteorit Namibia, dan tektit. Status: Draft. Foto belum dipasang.
    fotoUtama: 1,
    fotoKedua: 0,
    ceritaAnak:
      "Menurut Teori Big Bang, alam semesta berawal dari ledakan besar sekitar 13,7 miliar tahun lalu. Tata surya lalu terbentuk dari awan raksasa berisi gas dan debu yang berputar. Dulu Bumi masih panas membara, lalu pelan-pelan mendingin dan mengeras. Kadang ada batu dari luar angkasa yang jatuh ke Bumi. Batu itu disebut meteorit. Di vitrin ada meteorit batu, meteorit besi, dan meteorit besar dari Namibia.",
    ceritaRemaja:
      "Menurut Teori Big Bang, alam semesta berawal dari ledakan dahsyat sekitar 13,7 miliar tahun lalu. Tata surya kemudian terbentuk dari kabut raksasa berisi gas dan debu yang berputar, sesuai Teori Kabut dari Kant dan Laplace. Awalnya Bumi masih berpijar, lalu permukaannya perlahan mendingin dan memadat. Batu dari luar angkasa yang jatuh ke Bumi disebut meteorit. Di vitrin ada meteorit batu, meteorit besi, dan meteorit Namibia yang berukuran besar.",
    instruksi: "Temukan vitrin \"Meteorit Besi\", lalu cocokkan nomor 1 dengan daftar di labelnya.",
    pertanyaan: "Meteorit besi nomor 1 di vitrin ini ditemukan di mana?",
    opsi: ["Prambanan, Jawa Tengah", "Texas, USA", "Henbury, Australia", "Namibia, Afrika"],
    kunci: "A",
    hint: "Tempatnya terkenal dengan candi besar di Jawa Tengah.",
    penjelasan:
      "Meteorit besi tersusun terutama dari logam besi dan nikel, sehingga jauh lebih berat daripada batu biasa yang seukuran.",
  },
  10: {
    ...approvedStoryContent("POI-10"),
    // Disusun dari foto survei 10 Nov 2026: label rijang, batugamping hitam, sekis biotit, peridotit,
    // panel "Batuan Granit" (granit pembawa timah Bangka Belitung). Status: Draft. Foto belum dipasang.
    fotoUtama: 3,
    fotoKedua: 5,
    ceritaAnak:
      "Batuan di Indonesia sangat beragam karena sejarah Buminya panjang. Di ruang ini ada rijang dari Karangsambung, batugamping hitam dari Bayah, dan peridotit dari Ciletuh. Ada juga granit, batu yang butirannya besar-besar. Granit di Bangka Belitung membawa timah. Saat granit hancur dan terbawa air, timahnya ikut terbawa. Timah itu lalu mengumpul lagi di tempat lain. Itulah endapan timah yang ditambang di sana.",
    ceritaRemaja:
      "Indonesia memiliki batuan yang sangat beragam karena sejarah geologinya panjang dan rumit. Di ruang ini ada rijang dari Karangsambung, batugamping hitam dari Bayah, sekis biotit dari Sigi, dan peridotit dari Ciletuh. Ada juga granit, batuan beku berbutir kasar yang terkenal di Bangka Belitung karena membawa timah. Saat granit lapuk dan tererosi, timahnya ikut terbawa air lalu mengendap di tempat lain. Endapan inilah yang disebut endapan timah sekunder.",
    instruksi: "Temukan batu cokelat bergaris-garis putih berlabel \"Rijang\", lalu baca asalnya.",
    pertanyaan: "Rijang di ruangan ini berasal dari mana?",
    opsi: ["Karangsambung, Jawa Tengah", "Bayah, Banten", "Sigi, Sulawesi Tengah", "Ciletuh, Sukabumi"],
    kunci: "A",
    hint: "Lokasinya di Jawa Tengah dan terkenal sebagai cagar alam geologi.",
    penjelasan:
      "Rijang adalah batuan yang sangat keras dan kaya silika. Di Karangsambung, rijang ditemukan bersama batuan dasar samudra purba yang terangkat ke daratan.",
  },
  11: {
    ...approvedStoryContent("POI-11"),
    // Disusun dari foto survei 10 Nov 2026: panel "Kekayaan Sumber Daya Geologi", label bijih besi,
    // batubara, bijih tembaga, bijih timbal. Status: Draft. Foto belum dipasang.
    fotoUtama: 0,
    fotoKedua: 3,
    ceritaAnak:
      "Karena proses Bumi selama jutaan tahun, Indonesia punya banyak harta di bawah tanah. Lihat peta di panel: ada minyak dan gas di Riau, batubara di Sumatra Selatan, dan panas bumi di Kamojang, Jawa Barat. Di vitrin ada batubara, bijih besi, dan bijih tembaga dari Papua. Bijih adalah batuan yang mengandung logam. Kita harus memakainya dengan bijak, karena butuh jutaan tahun untuk terbentuk lagi.",
    ceritaRemaja:
      "Proses geologi selama jutaan tahun membuat Indonesia kaya sumber daya mineral dan energi. Peta di panel menunjukkan sebarannya: minyak dan gas di Minas, Riau, batubara di Bukit Asam, Sumatra Selatan, dan panas bumi di Kamojang, Jawa Barat. Di vitrin ada batubara dari Ombilin, bijih besi dari Kalimantan Selatan, dan bijih tembaga dari Tembagapura, Papua. Bijih adalah batuan yang mengandung logam. Semua ini harus dikelola dengan bijak karena tidak bisa terbentuk kembali dalam waktu singkat.",
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
    ceritaAnak:
      "Selamat datang di sayap Sejarah Kehidupan! Umur Bumi sekitar 4,6 miliar tahun. Tapi makhluk hidup tidak langsung ada. Makhluk pertama sangat kecil, hanya satu sel, dan hidup di laut. Lalu muncul hewan bercangkang, ikan, tumbuhan, dinosaurus, mamalia, sampai manusia. Ilmuwan membagi perjalanan panjang ini jadi beberapa masa. Jejaknya tersimpan sebagai fosil, yaitu sisa makhluk hidup yang membatu. Yuk telusuri ruangan berikutnya!",
    ceritaRemaja:
      "Selamat datang di sayap Sejarah Kehidupan! Bumi berumur sekitar 4,6 miliar tahun, tetapi kehidupan tidak langsung muncul. Makhluk pertama adalah makhluk bersel satu yang hidup di laut. Perlahan muncul hewan bercangkang, ikan, tumbuhan darat, dinosaurus, mamalia, hingga manusia. Ahli geologi membagi perjalanan ini menjadi beberapa masa: Prakambrium, Paleozoikum, Mesozoikum, dan Kenozoikum. Jejaknya tersimpan sebagai fosil di dalam batuan. Telusuri ruangan berikutnya untuk mengenal tiap masa!",
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
    ceritaAnak:
      "Kurun Prakambrium adalah masa paling awal Bumi, dari 4,5 miliar sampai 541 juta tahun lalu. Awalnya Bumi sangat panas, sekitar 1.000°C, dan belum ada oksigen untuk bernapas. Sekitar 3,5 miliar tahun lalu muncul makhluk bersel satu di laut, seperti ganggang biru-hijau. Mereka membuat oksigen dari sinar matahari. Jejak mereka berupa batu berlapis-lapis bernama stromatolit, ada di vitrin ini.",
    ceritaRemaja:
      "Kurun Prakambrium berlangsung dari sekitar 4,5 miliar sampai 541 juta tahun lalu. Awalnya Bumi sangat panas, sekitar 1.000°C, dan atmosfernya kaya karbon dioksida tanpa oksigen. Sekitar 3,5 miliar tahun lalu muncul makhluk bersel satu di samudra, seperti bakteri dan ganggang biru-hijau. Lewat fotosintesis mereka menghasilkan oksigen, hingga akhirnya terbentuk lapisan ozon. Jejaknya tersimpan sebagai stromatolit, batuan berlapis di vitrin ini. Di akhir kurun ini muncul ubur-ubur, cacing, dan koral.",
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
    ceritaAnak:
      "Masa Paleozoikum terjadi sekitar 540 sampai 245 juta tahun lalu. Di awal masa ini jumlah makhluk hidup bertambah sangat cepat. Laut dihuni trilobit, hewan bercangkang keras seperti baju besi. Lalu muncul ikan purba, kalajengking laut, dan hiu purba. Ada ikan yang mulai punya kaki dan berjalan ke darat! Hutan rawa saat itu kelak berubah jadi batubara. Di akhir masa ini, amonit yang bercangkang spiral hidup di laut.",
    ceritaRemaja:
      "Masa Paleozoikum berlangsung sekitar 540 sampai 245 juta tahun lalu. Di awalnya terjadi ledakan Kambrium, saat jumlah makhluk hidup bertambah sangat pesat. Lautan dihuni trilobit, arthropoda bercangkang keras. Lalu muncul ikan primitif, kalajengking laut Eurypterus, dan hiu purba. Pada zaman Devon, sebagian ikan mulai memiliki kaki dan berjalan ke darat. Zaman Karbon dipenuhi rawa dan pohon yang kelak menjadi batubara. Masa ini ditutup zaman Perem, ketika amonit hidup di laut.",
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

/** Menggabungkan checkpoint A9, denah, cerita final yang tersedia, dan soal draft. */
function museumPoi(checkpoint: SurveyCheckpoint): MuseumPoi {
  const number: number = Number(checkpoint.poiCode.slice(4));
  const room: RoomBox | undefined = rooms[checkpoint.poiCode];
  const zone: (typeof checkpoints.zones)[number] | undefined = checkpoints.zones.find(
    (zone: (typeof checkpoints.zones)[number]): boolean => zone.idZona === checkpoint.idZona,
  );
  if (room === undefined || zone === undefined) {
    throw new Error(`Checkpoint ${checkpoint.poiCode} tidak memiliki denah atau zona yang terdaftar.`);
  }
  return {
    code: poiCode(number),
    idPoi: checkpoint.idPoi,
    number,
    name: checkpoint.name,
    wing: zone.zoneCode === "LEFT_WING" ? "left" : "right",
    latitude: checkpoint.latitude,
    longitude: checkpoint.longitude,
    radiusMeters: checkpoint.radiusMeters,
    room,
    content: contents[number] ?? null,
  };
}

export const museumPois: readonly MuseumPoi[] = checkpoints.pois.map(museumPoi);

export const activePois: readonly MuseumPoi[] = museumPois.filter(
  (poi: MuseumPoi): boolean => poi.content !== null,
);

/** UUID koleksi berasal dari dataset A9 yang juga dipakai penerbit QR backend. */
export function poiIdFor(n: number): string {
  const poi: MuseumPoi | undefined = museumPois.find((poi: MuseumPoi): boolean => poi.number === n);
  if (poi === undefined) throw new RangeError(`Nomor POI ${n} tidak terdaftar dalam dataset A9.`);
  return poi.idPoi;
}

export function questIdFor(n: number): string {
  poiIdFor(n);
  return `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export function museumPoiById(idPoi: string): MuseumPoi | undefined {
  return museumPois.find((poi: MuseumPoi): boolean => poi.idPoi === idPoi);
}

export function museumPoiByCode(code: string): MuseumPoi | undefined {
  return museumPois.find((poi: MuseumPoi): boolean => poi.code === code.toUpperCase().replace(/^POI-/, "P"));
}
