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
  /** Quest non-pilihan-ganda dari sheet Quest: dikerjakan setelah "Kisah Selesai" (pengunjung umum). */
  readonly tantangan?: Tantangan;
  // Sprint 3: satu quest per POI di sheet Quest; versi anak di Konten_Cerita_Anak dan Quest_Anak.
  /** true = sheet Quest tidak punya kuis pilihan ganda untuk POI ini, jadi Mini Quiz dilewati. */
  readonly tanpaKuis?: boolean;
  /** Judul dan fakta versi anak (Konten_Cerita_Anak). */
  readonly judulAnak?: string;
  readonly faktaAnak?: string;
  /** Quest anak (Quest_Anak): hanya tipe foto. Anak tidak mengerjakan Mini Quiz atau quest lain. */
  readonly tantanganAnak?: Tantangan;
  /** Estimasi lama kunjungan POI dalam menit (POI_Preference, kolom Estimated_Duration). */
  readonly durasiMenit?: number;
};

/**
 * Tantangan per POI dari sheet Quest. Dinilai di aplikasi (belum ada di backend):
 * - foto: cari objek lalu foto bersama labelnya (target = apa yang harus terlihat).
 * - benarSalah: jawaban = ["Benar"] atau ["Salah"].
 * - isian: jawaban = semua variasi yang diterima (huruf besar/kecil diabaikan).
 * - cariObjek: cari objek di museum memakai peta + posisi GPS. QR di samping objek belum ada,
 *   jadi SEMENTARA dibuktikan dengan foto.
 */
export type Tantangan = {
  readonly tipe: "foto" | "benarSalah" | "isian" | "cariObjek";
  readonly judul: string;
  readonly instruksi: string;
  readonly target?: string;
  readonly jawaban?: readonly string[];
  /** Quest foto dengan pertanyaan pembuka (mis. P01): pilihan jawaban dan kunci "A"–"D". */
  readonly opsi?: readonly string[];
  readonly kunci?: string;
  readonly hint?: string;
  readonly penjelasan?: string;
  readonly poin: number;
  readonly batasPercobaan: number;
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
  [10, "Keanekaragaman Batuan di Indonesia", "left", -6.900649, 107.621063, { x: 0, y: 0, w: 78, h: 47 }],
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
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 5,
    fotoKedua: 0,
    durasiMenit: 7,
    judul: "Debaran Fauna Purba Indonesia",
    cerita:
      "Jutaan tahun lalu, Indonesia dihuni berbagai hewan purba berukuran unik! Ada Megalochelys sp., kura-kura raksasa, hingga Elephas celebensis, gajah purba mungil dari Sulawesi. Bersama Elephas maximus dan Sinomastodon bumiayuensis, fosil-fosil ini menjadi saksi beragamnya kehidupan fauna di masa lalu. Yuk, amati dan temukan perbedaannya!",
    judulAnak: "Yuk, Kenalan dengan Hewan Purba Indonesia!",
    ceritaAnak:
      "Jutaan tahun lalu, Indonesia dihuni banyak hewan purba yang unik! Ada Megalochelys sp., si kura-kura raksasa. Ada juga Elephas celebensis, gajah purba mungil dari Sulawesi. Bersama Elephas maximus dan Sinomastodon bumiayuensis, fosil-fosil ini menjadi saksi beragamnya hewan di masa lalu. Ayo amati dan temukan perbedaannya!",
    faktaAnak: "Tahukah kamu? Elephas celebensis adalah salah satu gajah purba berukuran kecil yang pernah hidup di Sulawesi.",
    ceritaRemaja:
      "Jutaan tahun lalu, Indonesia dihuni hewan purba dengan ukuran yang unik. Ada Megalochelys sp., kura-kura raksasa, dan Elephas celebensis, gajah purba mungil dari Sulawesi. Bersama Elephas maximus dan Sinomastodon bumiayuensis, fosil-fosil ini membuktikan bahwa fauna Indonesia di masa lalu sangat beragam. Coba amati dan temukan perbedaannya!",
    fakta: "Elephas celebensis dikenal sebagai salah satu gajah purba berukuran kecil yang pernah hidup di Sulawesi.",
    sorotan: "Megalochelys sp., Elephas celebensis, Elephas maximus, Sinomastodon bumiayuensis",
    tanpaKuis: true,
    instruksi: "Gajah Mungil dari Sulawesi",
    pertanyaan: "Fosil gajah purba berukuran kecil dari Sulawesi yang dipamerkan di sini bernama...",
    opsi: ["Elephas maximus", "Sinomastodon bumiayuensis", "Elephas celebensis", "Megalochelys sp."],
    kunci: "C",
    hint: "Nama spesiesnya mengandung nama pulau asalnya.",
    penjelasan: "Elephas celebensis dikenal sebagai salah satu gajah purba berukuran kecil yang pernah hidup di Sulawesi.",
    tantangan: {
      tipe: "foto",
      judul: "Serpihan kura-kura raksasa",
      instruksi: "Sebutkan ada binatang apa saja yang terdapat fosilnya",
      target: "Terdapat bagian dari kura-kura raksasa disini,cari dan foto",
      opsi: ["Kura-kura raksasa (Megalochelys sp.)", "Gajah sumatera", "Kudanil", "hiu"],
      kunci: "A",
      hint: "Fosilnya merupakan cangkang",
      penjelasan: "Cangkang kura-kura raksasa seperti Megalochelys sp. adalah salah satu bukti beragamnya fauna purba Indonesia yang dipamerkan di POI ini.",
      poin: 10,
      batasPercobaan: 2,
    },
    tantanganAnak: {
      tipe: "foto",
      judul: "Cari Cangkang Kura-Kura Raksasa!",
      instruksi: "Hewan apa saja yang fosilnya ada di sini? Pilih jawabanmu, lalu cari dan foto fosil kura-kura raksasa!",
      target: "Bagian fosil kura-kura raksasa (cangkang) terlihat jelas di dalam foto",
      opsi: ["Kura-kura raksasa (Megalochelys sp.)", "Gajah sumatera", "Kudanil", "Hiu"],
      kunci: "A",
      hint: "Cari fosil berbentuk cangkang, ya!",
      penjelasan: "Hebat! Cangkang kura-kura raksasa seperti Megalochelys sp. adalah bukti beragamnya hewan purba Indonesia yang dipamerkan di sini.",
      poin: 10,
      batasPercobaan: 3,
    },
  },
  2: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 9,
    fotoKedua: 13,
    durasiMenit: 9,
    judul: "Rahasia Dunia Karst Indonesia",
    cerita:
      "Pernah melihat gua dengan hiasan batu yang menjuntai dari langit-langitnya? Itulah salah satu keunikan kawasan karst, seperti Gunung Sewu, yang terbentuk melalui proses pelarutan batuan kapur selama waktu yang sangat lama. Yuk, amati stalaktit, sinter kapur, batu jahe, hingga berbagai jenis batuan dan terumbu karang untuk mengenal keindahan proses pembentukan alam!",
    judulAnak: "Rahasia Gua dan Karst",
    ceritaAnak:
      "Pernah melihat gua dengan hiasan batu yang menjuntai dari langit-langitnya? Itu salah satu keunikan kawasan karst, seperti Gunung Sewu! Karst terbentuk saat batuan kapur larut perlahan selama waktu yang sangat lama. Ayo amati stalaktit, sinter kapur, batu jahe, berbagai jenis batuan, dan terumbu karang!",
    faktaAnak: "Tahukah kamu? Stalaktit terbentuk dari endapan mineral kalsit yang menumpuk sedikit demi sedikit dari tetesan air di langit-langit gua.",
    ceritaRemaja:
      "Pernah melihat gua dengan hiasan batu yang menjuntai dari langit-langit? Itu salah satu keunikan kawasan karst, seperti Gunung Sewu. Karst terbentuk karena batuan kapur larut oleh air sedikit demi sedikit selama waktu yang sangat lama. Amati stalaktit, sinter kapur, batu jahe, serta berbagai batuan dan terumbu karang di sini untuk melihat hasil proses alam ini!",
    fakta: "Stalaktit terbentuk dari endapan mineral kalsit yang menumpuk perlahan dari tetesan air di langit-langit gua.",
    sorotan: "Karst Gunung Sewu, stalaktit kalsit, batugamping, batu jahe, sinter kapur, marmer, amfibolit, hasil karstifikasi, hard coral, plate coral, branching coral, head coral",
    instruksi: "Tetesan dari Langit-Langit Gua",
    pertanyaan: "Di gua karst, tetesan air kaya kalsit perlahan membentuk hiasan batu yang menjuntai dari langit-langit gua. Perhatikan koleksi di POI ini, lalu pilih: apa nama hiasan batu tersebut?",
    opsi: ["Stalagmit", "Stalaktit", "Rijang", "Geode"],
    kunci: "B",
    hint: "Ia tumbuh ke bawah dari langit-langit gua, bukan naik dari lantai.",
    penjelasan: "Stalaktit terbentuk dari endapan mineral kalsit yang menumpuk perlahan dari tetesan air di langit-langit gua.",
  },
  3: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 4,
    fotoKedua: 2,
    durasiMenit: 7,
    judul: "Indonesia di Cincin Api",
    cerita:
      "Indonesia berada di jalur pertemuan lempeng yang disebut Cincin Api Pasifik. Pertemuan lempeng inilah yang membentuk deretan gunung api dari Sumatra sampai Maluku. Coba perhatikan peta di hadapanmu dan temukan gunung api yang paling dekat dengan Bandung!",
    judulAnak: "Indonesia di Cincin Api",
    ceritaAnak:
      "Tahukah kamu? Indonesia berada di jalur pertemuan lempeng yang disebut Cincin Api Pasifik. Pertemuan lempeng ini membentuk deretan gunung api dari Sumatra sampai Maluku. Ayo lihat peta di depanmu, lalu temukan gunung api yang paling dekat dengan Bandung!",
    faktaAnak: "Deretan gunung api dari Sumatra sampai Maluku terbentuk karena pertemuan lempeng di jalur Cincin Api Pasifik.",
    ceritaRemaja:
      "Indonesia berada di Cincin Api Pasifik, jalur tempat lempeng-lempeng Bumi saling bertemu. Pertemuan lempeng inilah yang membentuk deretan gunung api dari Sumatra sampai Maluku. Perhatikan peta di hadapanmu, lalu temukan gunung api yang paling dekat dengan Bandung!",
    sorotan: "Peta sebaran gunung api",
    tanpaKuis: true,
    instruksi: "Tebak Jalur Api",
    pertanyaan: "Deretan gunung api dari Sumatra sampai Maluku terbentuk karena Indonesia berada di...",
    opsi: ["Jalur pertemuan lempeng Cincin Api Pasifik", "Tengah satu lempeng yang tidak bergerak", "Bekas tempat jatuhnya meteor", "Dasar laut yang mengering"],
    kunci: "A",
    hint: "Judul ceritanya memberi petunjuk.",
    penjelasan: "Indonesia berada di Cincin Api Pasifik. Pertemuan lempeng di jalur ini membentuk deretan gunung api dari Sumatra sampai Maluku.",
    tantangan: {
      tipe: "foto",
      judul: "Cari Gunung Api Terdekat Bandung",
      instruksi: "Indonesia berada di Cincin Api Pasifik, jalur pertemuan lempeng yang melahirkan deretan gunung api dari Sumatra sampai Maluku. Temukan peta sebaran gunung api, lalu foto bagian peta yang menunjukkan gunung api paling dekat dengan Bandung!",
      target: "Peta sebaran gunung api terlihat jelas, dengan area Pulau Jawa di dalam bingkai",
      hint: "Fokuskan pandanganmu ke Pulau Jawa, lalu cari titik gunung api di sekitar Bandung.",
      penjelasan: "Pertemuan lempeng di jalur Cincin Api Pasifik membentuk deretan gunung api dari Sumatra sampai Maluku.",
      poin: 20,
      batasPercobaan: 3,
    },
    tantanganAnak: {
      tipe: "foto",
      judul: "Cari Gunung Api Terdekat dari Bandung!",
      instruksi: "Ayo cari peta sebaran gunung api! Lalu foto bagian peta yang menunjukkan gunung api paling dekat dengan Bandung, ya!",
      target: "Peta sebaran gunung api terlihat jelas, dengan area Pulau Jawa di dalam foto",
      hint: "Lihat Pulau Jawa dulu, lalu cari titik gunung api di sekitar Bandung.",
      penjelasan: "Keren! Pertemuan lempeng di jalur Cincin Api Pasifik membentuk deretan gunung api dari Sumatra sampai Maluku.",
      poin: 15,
      batasPercobaan: 4,
    },
  },
  4: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 3,
    fotoKedua: 2,
    durasiMenit: 5,
    judul: "Kisah Terbentuknya Muka Bumi Indonesia",
    cerita:
      "Tahukah kamu bahwa bentuk muka bumi Indonesia terbentuk melalui proses geologi selama jutaan tahun? Pergerakan dan tekanan lempeng bumi menghasilkan berbagai struktur batuan, seperti lipatan dan sesar. Yuk, amati koleksi genes, sekis biotit, serta contoh struktur geologi untuk melihat bagaimana bumi terus berubah!",
    judulAnak: "Bumi yang Terus Berubah",
    ceritaAnak:
      "Tahukah kamu? Bentuk muka bumi Indonesia terbentuk lewat proses geologi selama jutaan tahun! Pergerakan dan tekanan lempeng bumi menghasilkan struktur batuan, seperti lipatan dan sesar. Yuk, amati genes, sekis biotit, dan contoh struktur geologi untuk melihat bagaimana bumi terus berubah!",
    faktaAnak: "Lipatan terbentuk saat lapisan batuan ditekan sampai melengkung, tanpa terpecah.",
    ceritaRemaja:
      "Bentuk muka bumi Indonesia terbentuk melalui proses geologi selama jutaan tahun. Pergerakan dan tekanan lempeng bumi menghasilkan struktur batuan seperti lipatan, saat lapisan batuan melengkung, dan sesar, saat batuan patah lalu bergeser. Amati koleksi genes, sekis biotit, dan contoh struktur geologi di sini untuk melihat bagaimana bumi terus berubah!",
    fakta: "Lipatan terbentuk ketika lapisan batuan mendapat tekanan hingga melengkung tanpa terpecah.",
    sorotan: "Genes, sekis biotit, lipatan, sesar",
    tanpaKuis: true,
    instruksi: "Lapisan yang Melengkung",
    pertanyaan: "Struktur geologi yang terbentuk ketika lapisan batuan tertekan hingga melengkung tanpa terpecah disebut...",
    opsi: ["Sesar", "Lipatan", "Erosi", "Pengendapan"],
    kunci: "B",
    hint: "Batuannya tidak patah, hanya melengkung.",
    penjelasan: "Lipatan terbentuk ketika lapisan batuan mendapat tekanan hingga melengkung tanpa terpecah. Kalau batuannya patah dan bergeser, itu disebut sesar.",
    tantangan: {
      tipe: "benarSalah",
      judul: "Lipatan atau Sesar?",
      instruksi: "Amati contoh struktur geologi di POI ini, lalu jawab: Benar atau Salah? \"Batuan yang melengkung tanpa terpecah akibat tekanan disebut sesar.\"",
      jawaban: ["Salah"],
      hint: "Sesar itu patahan. Struktur yang melengkung punya nama lain.",
      penjelasan: "Salah. Batuan yang melengkung tanpa terpecah disebut lipatan, sedangkan sesar terbentuk ketika batuan patah dan bergeser.",
      poin: 10,
      batasPercobaan: 2,
    },
  },
  5: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 1,
    fotoKedua: 2,
    durasiMenit: 4,
    judul: "Perjalanan Lahirnya Kepulauan Indonesia",
    cerita:
      "Pernah penasaran bagaimana ribuan pulau di Indonesia terbentuk? Melalui animasi ini, kamu bisa mengikuti perjalanan terbentuknya Kepulauan Indonesia akibat pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi selama jutaan tahun. Yuk, saksikan bagaimana daratan yang awalnya terpisah akhirnya membentuk Indonesia seperti yang kita kenal sekarang!",
    judulAnak: "Lahirnya Kepulauan Indonesia",
    ceritaAnak:
      "Pernah penasaran bagaimana ribuan pulau di Indonesia terbentuk? Lewat animasi ini, kamu bisa mengikuti perjalanannya! Pulau-pulau itu terbentuk karena pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi selama jutaan tahun. Yuk, saksikan bagaimana daratan yang awalnya terpisah akhirnya membentuk Indonesia seperti sekarang!",
    faktaAnak: "Bentuk kepulauan Indonesia masih terus berubah sampai sekarang karena aktivitas tektonik.",
    ceritaRemaja:
      "Pernah penasaran bagaimana ribuan pulau di Indonesia terbentuk? Animasi ini memperlihatkan perjalanan terbentuknya Kepulauan Indonesia akibat pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi lain selama jutaan tahun. Saksikan bagaimana daratan yang awalnya terpisah akhirnya membentuk Indonesia seperti sekarang!",
    fakta: "Bentuk kepulauan Indonesia terus mengalami perubahan akibat aktivitas tektonik hingga saat ini.",
    sorotan: "Video animasi pembentukan Kepulauan Indonesia",
    tanpaKuis: true,
    instruksi: "Lahirnya Kepulauan Indonesia",
    pertanyaan: "Menurut animasi, apa yang membentuk ribuan pulau di Indonesia?",
    opsi: ["Hujan dan angin saja", "Pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi", "Endapan sungai saja", "Kegiatan manusia"],
    kunci: "B",
    hint: "Tonton lagi bagian awal animasi.",
    penjelasan: "Kepulauan Indonesia terbentuk akibat pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi selama jutaan tahun.",
    tantangan: {
      tipe: "isian",
      judul: "Menonton Kelahiran Nusantara",
      instruksi: "Tonton animasi terbentuknya Kepulauan Indonesia sampai selesai. Lalu lengkapi kalimat ini dengan satu kata: \"Pergerakan lempeng ..... bersama aktivitas gunung api membentuk ribuan pulau di Indonesia.\"",
      jawaban: ["tektonik", "lempeng tektonik"],
      hint: "Dengarkan narasi tentang lempeng bumi yang terus bergerak.",
      penjelasan: "Pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi selama jutaan tahun membentuk Kepulauan Indonesia, dan bentuknya masih terus berubah hingga kini.",
      poin: 10,
      batasPercobaan: 2,
    },
  },
  6: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 2,
    fotoKedua: 0,
    durasiMenit: 8,
    judul: "Bagaimana Wajah Bumi Terbentuk?",
    cerita:
      "Bentuk permukaan bumi yang kita lihat sekarang terbentuk melalui proses alam selama ribuan hingga jutaan tahun. Pelapukan menghancurkan batuan, erosi memindahkan material, sedangkan pengendapan menumpuknya di tempat baru. Yuk, amati contoh bentukan muka bumi dan cari tahu bagaimana ketiga proses ini mengubah lanskap Indonesia!",
    judulAnak: "Tiga Pembentuk Wajah Bumi",
    ceritaAnak:
      "Bentuk permukaan bumi yang kita lihat sekarang terbentuk lewat proses alam selama ribuan hingga jutaan tahun. Ada tiga proses yang bekerja. Pelapukan menghancurkan batuan, erosi memindahkan material, dan pengendapan menumpuknya di tempat baru. Yuk, amati contoh bentukan muka bumi dan lihat bagaimana ketiganya mengubah lanskap Indonesia!",
    faktaAnak: "Material hasil erosi bisa terbawa air, angin, atau es sebelum akhirnya mengendap di tempat lain.",
    ceritaRemaja:
      "Bentuk permukaan bumi yang kita lihat sekarang terbentuk lewat proses alam selama ribuan hingga jutaan tahun. Pelapukan menghancurkan batuan, erosi memindahkan materialnya, lalu pengendapan menumpuknya di tempat baru. Amati contoh bentukan muka bumi di sini dan cari tahu bagaimana ketiga proses ini mengubah lanskap Indonesia!",
    fakta: "Material hasil erosi dapat terbawa air, angin, maupun es sebelum akhirnya mengendap di tempat lain.",
    sorotan: "Sembulan bentukan morfologi muka bumi, pelapukan, erosi, dan pengendapan",
    instruksi: "Trio Pembentuk Lanskap",
    pertanyaan: "Tiga proses bekerja mengubah wajah bumi: 1) Pelapukan, 2) Erosi, 3) Pengendapan. Peran mereka: A) memindahkan material lewat air, angin, atau es; B) menumpuk material di tempat baru; C) menghancurkan batuan. Pilih pasangan yang tepat!",
    opsi: ["1-C, 2-A, 3-B", "1-A, 2-B, 3-C", "1-B, 2-C, 3-A", "1-C, 2-B, 3-A"],
    kunci: "A",
    hint: "Urutan kerjanya: batuan hancur dulu, lalu berpindah, lalu menetap.",
    penjelasan: "Pelapukan menghancurkan batuan, erosi memindahkan material hasil pelapukan lewat air, angin, atau es, dan pengendapan menumpuknya di tempat baru.",
  },
  7: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 4,
    fotoKedua: 1,
    durasiMenit: 13,
    judul: "Mengenal Harta Karun Bumi: Batuan dan Mineral",
    cerita:
      "Bumi menyimpan beragam mineral dan batuan dengan warna, bentuk, serta karakteristik yang berbeda! Ada lapis lazuli yang terkenal dengan warna biru pekatnya, hingga geodes yang menyimpan kristal di bagian dalamnya. Yuk, amati berbagai koleksi mineral dan kenali tiga kelompok utama batuan: beku, sedimen, dan metamorf!",
    judulAnak: "Harta Karun Bumi: Batuan dan Mineral",
    ceritaAnak:
      "Bumi menyimpan banyak mineral dan batuan dengan warna dan bentuk yang berbeda-beda! Ada lapis lazuli yang terkenal dengan warna biru pekatnya. Ada juga geodes yang menyimpan kristal di bagian dalamnya. Yuk, amati koleksi mineralnya dan kenali tiga kelompok utama batuan: beku, sedimen, dan metamorf!",
    faktaAnak: "Geodes bisa terlihat seperti batu biasa dari luar, tetapi bagian dalamnya bisa dipenuhi kristal yang indah.",
    ceritaRemaja:
      "Bumi menyimpan beragam mineral dan batuan dengan warna, bentuk, dan sifat yang berbeda. Ada lapis lazuli dengan warna biru pekatnya, dan geodes yang menyimpan kristal di bagian dalamnya. Amati koleksi mineral di sini dan kenali tiga kelompok utama batuan: beku, sedimen, dan metamorf!",
    fakta: "Geodes dapat terlihat seperti batu biasa dari luar, tetapi bagian dalamnya bisa dipenuhi kristal yang indah.",
    sorotan: "Lapis lazuli, mineral hidroksida, oksida, silikat, karbonat, borat dan nitrat, unsur asli (native elements), sulfida, fosfat, sulfat, batuan beku, batuan sedimen, batuan metamorf, geodes",
    tanpaKuis: true,
    instruksi: "Kristal Tersembunyi",
    pertanyaan: "Batuan yang dari luar tampak seperti batu biasa, tetapi bagian dalamnya dipenuhi kristal, disebut...",
    opsi: ["Lapis lazuli", "Geodes", "Marmer", "Batubara"],
    kunci: "B",
    hint: "Cari koleksi yang dibelah dua dan berkilau di dalamnya.",
    penjelasan: "Geodes dapat terlihat seperti batu biasa dari luar, tetapi bagian dalamnya bisa dipenuhi kristal yang indah.",
    tantangan: {
      tipe: "foto",
      judul: "Temukan Si Biru Pekat",
      instruksi: "Di antara koleksi mineral, ada batu dengan warna biru pekat yang terkenal: lapis lazuli. Temukan dan foto koleksinya bersama label namanya!",
      target: "Koleksi lapis lazuli (biru pekat) dengan label nama terbaca",
      hint: "Cari batu berwarna biru tua yang mencolok di etalase mineral.",
      penjelasan: "Lapis lazuli terkenal dengan warna biru pekatnya dan menjadi salah satu koleksi mineral di POI ini.",
      poin: 20,
      batasPercobaan: 3,
    },
    tantanganAnak: {
      tipe: "foto",
      judul: "Temukan Si Biru Tua!",
      instruksi: "Yuk, cari batu biru tua bernama lapis lazuli di antara koleksi mineral! Foto batunya bersama label namanya, ya!",
      target: "Lapis lazuli (biru pekat) terlihat jelas bersama label nama yang bisa dibaca",
      hint: "Cari batu berwarna biru tua yang mencolok di etalase mineral.",
      penjelasan: "Hore, ketemu! Lapis lazuli terkenal dengan warna biru pekatnya dan menjadi salah satu koleksi mineral di sini.",
      poin: 15,
      batasPercobaan: 4,
    },
  },
  8: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 3,
    fotoKedua: 0,
    durasiMenit: 7,
    judul: "Kekuatan Tersembunyi di Dalam Bumi",
    cerita:
      "Permukaan bumi yang kita pijak ternyata terus bergerak! Tenaga tektonik berasal dari pergerakan lempeng bumi yang dapat membentuk pegunungan, lipatan, hingga patahan. Yuk, amati koleksi sekis mika, peridotit, dan lava basal untuk mengenal lebih jauh proses yang membentuk bumi!",
    judulAnak: "Bumi yang Tidak Pernah Diam",
    ceritaAnak:
      "Tahukah kamu? Permukaan bumi yang kita pijak ternyata terus bergerak! Tenaga tektonik berasal dari pergerakan lempeng bumi, yang bisa membentuk pegunungan, lipatan, dan patahan. Yuk, amati sekis mika, peridotit, dan lava basal untuk mengenal proses yang membentuk bumi!",
    faktaAnak: "Peridotit adalah batuan yang banyak menyusun bagian mantel atas bumi.",
    ceritaRemaja:
      "Permukaan bumi yang kita pijak ternyata terus bergerak. Tenaga tektonik berasal dari pergerakan lempeng bumi, dan tenaga ini dapat membentuk pegunungan, lipatan, hingga patahan. Amati koleksi sekis mika, peridotit, dan lava basal di sini untuk mengenal proses yang membentuk bumi!",
    fakta: "Peridotit merupakan batuan yang banyak menyusun bagian mantel atas bumi.",
    sorotan: "Proses terjadinya tenaga tektonik, sekis mika, peridotit, lava basal",
    tanpaKuis: true,
    instruksi: "Batuan dari Mantel",
    pertanyaan: "Batuan yang banyak menyusun bagian mantel atas bumi adalah...",
    opsi: ["Lava basal", "Sekis mika", "Peridotit", "Granit"],
    kunci: "C",
    hint: "Lihat lagi tiga koleksi yang disebut di cerita.",
    penjelasan: "Peridotit merupakan batuan yang banyak menyusun bagian mantel atas bumi.",
    tantangan: {
      tipe: "isian",
      judul: "Penghuni Mantel Bumi",
      instruksi: "Tenaga tektonik berasal dari pergerakan lempeng bumi. Di antara sekis mika, peridotit, dan lava basal, batuan manakah yang banyak menyusun bagian mantel atas bumi?",
      jawaban: ["Peridotit", "batuan peridotit"],
      hint: "Ia berasal dari lapisan di bawah kerak bumi. Cek label koleksinya!",
      penjelasan: "Peridotit merupakan batuan yang banyak menyusun bagian mantel atas bumi.",
      poin: 20,
      batasPercobaan: 3,
    },
  },
  9: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 1,
    fotoKedua: 0,
    durasiMenit: 6,
    judul: "Dari Big Bang hingga Terbentuknya Bumi",
    cerita:
      "Pernah membayangkan bagaimana alam semesta dan planet Bumi terbentuk? Menurut teori Big Bang, alam semesta bermula dari kondisi yang sangat panas dan padat, lalu terus mengembang hingga sekarang. Seiring waktu, Bumi terbentuk dan mengalami perubahan struktur serta bentuk hingga menjadi planet yang kita kenal saat ini. Yuk, ikuti perjalanan panjang Bumi melalui koleksi dan ilustrasi di hadapanmu!",
    judulAnak: "Dari Big Bang sampai Bumi Terbentuk",
    ceritaAnak:
      "Pernah membayangkan bagaimana alam semesta dan planet Bumi terbentuk? Menurut teori Big Bang, alam semesta bermula dari kondisi yang sangat panas dan padat, lalu terus mengembang sampai sekarang. Seiring waktu, Bumi terbentuk dan berubah hingga menjadi planet yang kita kenal. Yuk, ikuti perjalanan panjang Bumi lewat koleksi dan ilustrasi di depanmu!",
    faktaAnak: "Bumi punya empat lapisan utama, yaitu kerak, mantel, inti luar, dan inti dalam.",
    ceritaRemaja:
      "Pernah membayangkan bagaimana alam semesta dan Bumi terbentuk? Menurut teori Big Bang, alam semesta bermula dari kondisi yang sangat panas dan padat, lalu terus mengembang hingga sekarang. Seiring waktu, Bumi terbentuk, lalu struktur dan bentuknya berubah hingga menjadi planet yang kita kenal. Ikuti perjalanan panjang itu lewat koleksi dan ilustrasi di hadapanmu!",
    fakta: "Bumi memiliki empat lapisan utama, yaitu kerak, mantel, inti luar, dan inti dalam.",
    sorotan: "Teori Big Bang, hamparan luas alam semesta, proses terbentuknya planet Bumi, penampang struktur Bumi, perkembangan bentuk Bumi",
    instruksi: "Menembus Lapisan Bumi",
    pertanyaan: "Bumi punya empat lapisan utama. Perhatikan ilustrasi penampang struktur Bumi, lalu pilih urutan lapisan dari yang paling luar sampai paling dalam.",
    opsi: ["Kerak - Mantel - Inti luar - Inti dalam", "Mantel - Kerak - Inti dalam - Inti luar", "Kerak - Inti luar - Mantel - Inti dalam", "Inti dalam - Inti luar - Mantel - Kerak"],
    kunci: "A",
    hint: "Kerak adalah \"kulit\" bumi tempat kita berpijak.",
    penjelasan: "Bumi memiliki empat lapisan utama, yaitu kerak, mantel, inti luar, dan inti dalam.",
  },
  10: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 3,
    fotoKedua: 5,
    durasiMenit: 10,
    judul: "Ragam Batuan dari Nusantara",
    cerita:
      "Indonesia memiliki beragam jenis batuan yang terbentuk melalui proses geologi yang berbeda-beda. Mulai dari batugamping hitam, sekis biotit, rijang, peridotit, hingga granit, setiap batuan menyimpan cerita tentang proses pembentukan bumi. Yuk, amati warna dan tekstur koleksinya, lalu temukan perbedaannya!",
    judulAnak: "Batuan dari Nusantara",
    ceritaAnak:
      "Indonesia punya banyak jenis batuan yang terbentuk lewat proses geologi yang berbeda-beda. Ada batugamping hitam, sekis biotit, rijang, peridotit, dan granit. Setiap batuan menyimpan cerita tentang proses pembentukan bumi. Yuk, amati warna dan tekstur koleksinya, lalu temukan perbedaannya!",
    faktaAnak: "Granit terbentuk dari magma yang mendingin perlahan di bawah permukaan bumi, sehingga kristalnya terlihat jelas.",
    ceritaRemaja:
      "Indonesia memiliki beragam jenis batuan yang terbentuk lewat proses geologi yang berbeda-beda. Batugamping hitam, sekis biotit, rijang, peridotit, hingga granit masing-masing menyimpan cerita tentang pembentukan bumi. Amati warna dan tekstur koleksinya, lalu temukan perbedaannya!",
    fakta: "Granit terbentuk dari magma yang mendingin secara perlahan di bawah permukaan bumi sehingga kristalnya dapat terlihat jelas.",
    sorotan: "Batugamping hitam, sekis biotit, rijang, peridotit, batuan granit",
    tanpaKuis: true,
    instruksi: "Rahasia Kristal Granit",
    pertanyaan: "Mengapa kristal pada batuan granit dapat terlihat jelas?",
    opsi: ["Magmanya mendingin perlahan di bawah permukaan bumi", "Magmanya membeku cepat di udara terbuka", "Terbentuk dari tumpukan cangkang hewan laut", "Terbentuk dari endapan es"],
    kunci: "A",
    hint: "Semakin lama mendingin, semakin besar kristalnya.",
    penjelasan: "Granit terbentuk dari magma yang mendingin perlahan di bawah permukaan bumi, sehingga kristalnya sempat tumbuh besar dan terlihat jelas.",
    tantangan: {
      tipe: "foto",
      judul: "Detektif Tekstur Batuan",
      instruksi: "Setiap batuan punya warna dan tekstur sendiri. Temukan dua batuan berbeda di etalase (misalnya granit dan batugamping hitam), lalu foto keduanya dalam satu bingkai sehingga perbedaan warna dan teksturnya terlihat!",
      target: "Dua koleksi batuan berbeda dalam satu foto, label nama terbaca",
      hint: "Granit memiliki kristal yang terlihat jelas. Bandingkan dengan batuan berwarna gelap.",
      penjelasan: "Granit terbentuk dari magma yang mendingin perlahan di bawah permukaan bumi sehingga kristalnya terlihat jelas. Tiap batuan menyimpan cerita pembentukan yang berbeda.",
      poin: 30,
      batasPercobaan: 3,
    },
    tantanganAnak: {
      tipe: "foto",
      judul: "Detektif Cilik: Warna dan Tekstur Batuan",
      instruksi: "Setiap batuan punya warna dan tekstur sendiri. Ayo cari dua batuan berbeda di etalase, misalnya granit dan batugamping hitam! Foto keduanya dalam satu foto, ya, supaya beda warna dan teksturnya kelihatan!",
      target: "Dua batuan berbeda terlihat dalam satu foto, dengan label nama yang bisa dibaca",
      hint: "Granit punya kristal yang terlihat jelas. Bandingkan dengan batuan yang warnanya gelap!",
      penjelasan: "Mantap! Granit terbentuk dari magma yang mendingin perlahan di bawah permukaan bumi, jadi kristalnya terlihat jelas. Setiap batuan punya cerita pembentukan yang berbeda.",
      poin: 25,
      batasPercobaan: 4,
    },
  },
  11: {
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 0,
    fotoKedua: 3,
    durasiMenit: 7,
    judul: "Kekayaan Indonesia",
    cerita:
      "Indonesia menyimpan kekayaan geologi yang melimpah, mulai dari mineral logam, mineral non-logam, hingga batu mulia seperti ametis dari Solok, Sumatera Barat. Selain itu, ada batubara, minyak dan gas bumi, panas bumi, serta sumber daya air yang dimanfaatkan untuk kehidupan sehari-hari. Yuk, kenali berbagai potensi alam ini dan bagaimana manusia memanfaatkannya!",
    judulAnak: "Harta Kekayaan Indonesia",
    ceritaAnak:
      "Indonesia menyimpan kekayaan geologi yang melimpah! Ada mineral logam, mineral non-logam, dan batu mulia seperti ametis dari Solok, Sumatera Barat. Ada juga batubara, minyak dan gas bumi, panas bumi, serta sumber daya air yang dimanfaatkan untuk kehidupan sehari-hari. Yuk, kenali kekayaan alam ini dan bagaimana manusia memanfaatkannya!",
    faktaAnak: "Indonesia punya potensi panas bumi yang besar karena berada di kawasan dengan aktivitas vulkanik yang tinggi.",
    ceritaRemaja:
      "Indonesia menyimpan kekayaan geologi yang melimpah: mineral logam, mineral non-logam, hingga batu mulia seperti ametis dari Solok, Sumatera Barat. Ada juga batubara, minyak dan gas bumi, panas bumi, serta sumber daya air yang kita manfaatkan sehari-hari. Kenali berbagai potensi alam ini dan bagaimana manusia memanfaatkannya!",
    fakta: "Indonesia memiliki potensi panas bumi yang besar karena berada di kawasan dengan aktivitas vulkanik tinggi.",
    sorotan: "Batubara, mineral logam, mineral non-logam, batu mulia (ametis), minyak dan gas bumi, panas bumi (geothermal), sumber daya air dan cekungan air tanah",
    instruksi: "Ametis dari Tanah Minang",
    pertanyaan: "Indonesia kaya sumber daya geologi, termasuk batu mulia berwarna ungu. Berdasarkan cerita pameran, ametis berasal dari daerah mana?",
    opsi: ["Solok, Sumatera Barat", "Martapura, Kalimantan Selatan", "Cilacap, Jawa Tengah", "Ternate, Maluku Utara"],
    kunci: "A",
    hint: "Daerah asalnya berada di Pulau Sumatra.",
    penjelasan: "Ametis adalah batu mulia yang berasal dari Solok, Sumatera Barat, bagian dari kekayaan geologi Indonesia.",
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
