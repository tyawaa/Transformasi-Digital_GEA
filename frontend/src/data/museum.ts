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
  readonly en: { readonly name: string; readonly intro: string };
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
    en: {
      name: "Left Wing · Geology of Indonesia",
      intro: "Welcome to the left wing! Discover how Earth formed, why Indonesia has so many volcanoes, and what rocks lie beneath your feet.",
    },
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
    en: {
      name: "Right Wing · History of Life",
      intro: "Welcome to the right wing! Follow the story of life on Earth, from single-celled organisms through the age of dinosaurs to early humans who lived on Java.",
    },
    latitude: -6.90078,
    longitude: 107.62192,
    radiusMeters: 10,
  },
];

type EnglishStory = Pick<StoryContent, "judul" | "cerita" | "fakta"> & { readonly status: "Draft" };

export type StoryContent = {
  readonly en?: Readonly<Record<"umum" | "anak", EnglishStory>>;
  readonly cerita: string;
  // Sesuai sheet ada dua kategori: `cerita` = Umum (profil "dewasa", 13 tahun ke atas) dan
  // `ceritaAnak` = Anak-anak (Konten_Cerita_Anak). Tanpa teks anak, anak melihat versi Umum.
  /** Anak-anak 7–12 (Konten_Cerita_Anak). */
  readonly ceritaAnak?: string;
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
    en: {
      "umum": {
        "judul": "Traces of Ancient Fauna in Indonesia",
        "cerita": "Millions of years ago, Indonesia was home to many unique prehistoric animals. There was Megalochelys, a giant tortoise. There was also Elephas celebensis, a tiny ancient elephant from Sulawesi. Together with Elephas maximus and Sinomastodon bumiayuensis, these fossils are witnesses to the rich variety of animal life in the past. Take a closer look, and spot the differences!",
        "fakta": "Elephas celebensis is known as one of the small-bodied ancient elephants that once lived in Sulawesi.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Meet Indonesia's Ancient Animals!",
        "cerita": "Long, long ago, Indonesia was home to many amazing ancient animals. There was Megalochelys, a giant tortoise. There was also Elephas celebensis, a tiny ancient elephant from Sulawesi. These fossils show us which animals lived here in the past. Take a look, and spot the differences!",
        "fakta": "Did you know? Elephas celebensis was a small ancient elephant that lived in Sulawesi.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-01"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 5,
    fotoKedua: 0,
    durasiMenit: 7,
    judulAnak: "Yuk, Kenalan dengan Hewan Purba Indonesia!",
    ceritaAnak:
      "Dulu sekali, Indonesia punya banyak hewan purba yang unik. Ada Megalochelys, si kura-kura raksasa. Ada juga Elephas celebensis, gajah purba yang bertubuh mungil dari Sulawesi. Fosil-fosil ini menunjukkan hewan apa saja yang pernah hidup di masa lalu. Ayo, amati dan temukan bedanya!",
    faktaAnak: "Tahukah kamu? Elephas celebensis adalah gajah purba yang bertubuh kecil, dan pernah hidup di Sulawesi.",
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
    en: {
      "umum": {
        "judul": "Secrets of Indonesia's Karst World",
        "cerita": "Have you ever seen a cave with stone decorations hanging from its ceiling? That is one of the wonders of karst regions, such as Gunung Sewu. Karst forms when limestone slowly dissolves over a very long time. Take a look at the stalactites, limestone sinter, ginger stones, different kinds of rock, and coral reefs, and discover the beauty of how nature is shaped!",
        "fakta": "Stalactites form from calcite minerals that slowly build up from water dripping from a cave ceiling.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Secrets of Caves and Karst",
        "cerita": "Have you ever seen a cave with rocks hanging from the roof? How cool! Caves like that are found in karst areas, such as Gunung Sewu. Karst forms when limestone slowly dissolves over a very long time. Come and look at the cave rocks and the corals here!",
        "fakta": "Did you know? The rock hanging from a cave roof is called a stalactite, and it forms from dripping water that slowly leaves minerals behind.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-02"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 9,
    fotoKedua: 13,
    durasiMenit: 9,
    judulAnak: "Rahasia Gua dan Karst",
    ceritaAnak:
      "Pernah lihat gua dengan batu yang menjuntai dari atapnya? Keren sekali! Gua seperti itu ada di daerah karst, misalnya Gunung Sewu. Karst terbentuk dari batu kapur yang larut pelan-pelan, selama waktu yang sangat lama. Ayo amati batu-batu gua dan terumbu karang di sini!",
    faktaAnak: "Tahukah kamu? Batu yang menjuntai dari atap gua bernama stalaktit, dan terbentuk dari tetesan air yang pelan-pelan menumpuk mineral.",
    instruksi: "Tetesan dari Langit-Langit Gua",
    pertanyaan: "Di gua karst, tetesan air kaya kalsit perlahan membentuk hiasan batu yang menjuntai dari langit-langit gua. Perhatikan koleksi di POI ini, lalu pilih: apa nama hiasan batu tersebut?",
    opsi: ["Stalagmit", "Stalaktit", "Rijang", "Geode"],
    kunci: "B",
    hint: "Ia tumbuh ke bawah dari langit-langit gua, bukan naik dari lantai.",
    penjelasan: "Stalaktit terbentuk dari endapan mineral kalsit yang menumpuk perlahan dari tetesan air di langit-langit gua.",
  },
  3: {
    en: {
      "umum": {
        "judul": "Indonesia on the Ring of Fire",
        "cerita": "Indonesia sits along the meeting zone of tectonic plates known as the Pacific Ring of Fire. This is what formed the chain of volcanoes stretching from Sumatra to Maluku. Take a look at the map in front of you, and find the volcano closest to Bandung!",
        "fakta": "The Pacific Ring of Fire stretches along the edges of the Pacific Ocean, and Indonesia is part of it.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Indonesia on the Ring of Fire",
        "cerita": "Indonesia is on the Pacific Ring of Fire. There, the Earth's plates push against each other. That meeting makes volcanoes, from Sumatra all the way to Maluku. Look at the map in front of you, and find the volcano closest to Bandung!",
        "fakta": "Did you know? The Pacific Ring of Fire stretches along the edges of the Pacific Ocean, and Indonesia is part of it.",
        "status": "Draft"
      }
    },
    // Sumber: workbook Template_..._Anak (15 Nov 2026): Konten_Cerita, Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 4,
    fotoKedua: 2,
    durasiMenit: 7,
    judul: "Indonesia di Cincin Api",
    cerita:
      "Indonesia berada di jalur pertemuan lempeng yang disebut Cincin Api Pasifik. Pertemuan lempeng inilah yang membentuk deretan gunung api, dari Sumatra sampai Maluku. Coba perhatikan peta di hadapanmu, dan temukan gunung api yang paling dekat dengan Bandung!",
    fakta: "Cincin Api Pasifik membentang di sepanjang tepian Samudra Pasifik, dan Indonesia termasuk di dalamnya.",
    judulAnak: "Indonesia di Cincin Api",
    ceritaAnak:
      "Indonesia berada di jalur Cincin Api Pasifik. Di sana, lempeng-lempeng bumi saling bertemu. Pertemuan itu membentuk gunung api, dari Sumatra sampai Maluku. Ayo lihat peta di depanmu, lalu cari gunung api yang paling dekat dengan Bandung!",
    faktaAnak: "Tahukah kamu? Cincin Api Pasifik membentang di sepanjang tepian Samudra Pasifik, dan Indonesia ada di dalamnya.",
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
    en: {
      "umum": {
        "judul": "The Story of Indonesia's Landscape",
        "cerita": "Did you know that Indonesia's landscape took millions of years to form? The movement and pressure of the Earth's plates create many rock structures, such as folds and faults. Take a look at the gneiss, biotite schist, and examples of geological structures, and see how the Earth keeps changing!",
        "fakta": "Folds form when layers of rock are pressed until they bend without breaking.",
        "status": "Draft"
      },
      "anak": {
        "judul": "An Ever-Changing Earth",
        "cerita": "Indonesia's landscape took millions of years to form. The Earth's plates move and push against each other. That pushing can bend rocks, or break them. Come and look at gneiss, biotite schist, and examples of folds and faults. See how our Earth keeps changing!",
        "fakta": "Did you know? A fold forms when layers of rock are pushed until they bend, without breaking.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-04"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 3,
    fotoKedua: 2,
    durasiMenit: 5,
    judulAnak: "Bumi yang Terus Berubah",
    ceritaAnak:
      "Muka bumi Indonesia terbentuk lewat proses yang sangat lama, yaitu jutaan tahun. Lempeng bumi bergerak dan saling menekan. Tekanan itu bisa membuat batuan melengkung, atau patah. Ayo amati genes, sekis biotit, dan contoh lipatan dan sesar. Lihat, bumi kita terus berubah!",
    faktaAnak: "Tahukah kamu? Lipatan terjadi ketika lapisan batuan ditekan sampai melengkung, tanpa patah.",
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
    en: {
      "umum": {
        "judul": "The Journey of Indonesia's Islands",
        "cerita": "Have you ever wondered how Indonesia's thousands of islands were formed? Through this animation, you can follow the journey. The islands were shaped by the movement of tectonic plates, volcanic activity, and geological processes over millions of years. Watch how land that was once separated eventually became the Indonesia we know today!",
        "fakta": "The shape of Indonesia's archipelago keeps changing because of tectonic activity, even today.",
        "status": "Draft"
      },
      "anak": {
        "judul": "The Birth of Indonesia's Islands",
        "cerita": "How did Indonesia's thousands of islands appear? Let's watch the animation! The islands formed because the Earth's plates moved, volcanoes erupted, and nature kept working for millions of years. See how land that was once far apart became the Indonesia we know today!",
        "fakta": "Did you know? The shape of Indonesia's islands is still changing today.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-05"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 1,
    fotoKedua: 2,
    durasiMenit: 4,
    judulAnak: "Lahirnya Kepulauan Indonesia",
    ceritaAnak:
      "Bagaimana ribuan pulau di Indonesia bisa terbentuk? Ayo tonton animasinya! Pulau-pulau itu terbentuk karena lempeng bumi bergerak, gunung api meletus, dan alam terus bekerja selama jutaan tahun. Lihat bagaimana daratan yang tadinya terpisah, akhirnya menjadi Indonesia seperti sekarang!",
    faktaAnak: "Tahukah kamu? Bentuk kepulauan Indonesia masih terus berubah sampai sekarang.",
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
    en: {
      "umum": {
        "judul": "How Was the Face of the Earth Formed?",
        "cerita": "The shape of the Earth's surface that we see today was formed by natural processes over thousands to millions of years. Three processes are at work. Weathering breaks rocks apart, erosion moves the material, and deposition piles it up in a new place. Take a look at these examples of landforms, and find out how these three processes reshape Indonesia's landscape!",
        "fakta": "Eroded material can be carried by water, wind, or ice before it finally settles somewhere else.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Three Shapers of the Earth",
        "cerita": "The face of the Earth can change! Three things are at work. Weathering breaks rocks into pieces. Erosion carries those pieces away. Deposition piles them up in a new place. Come and look at the landforms here!",
        "fakta": "Did you know? Broken rock can be carried by water, wind, or ice before it finally settles down.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-06"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 2,
    fotoKedua: 0,
    durasiMenit: 8,
    judulAnak: "Tiga Pembentuk Wajah Bumi",
    ceritaAnak:
      "Wajah bumi bisa berubah, lho! Ada tiga proses yang bekerja. Pelapukan membuat batuan hancur. Erosi memindahkan hancuran batuan itu. Pengendapan menumpuknya di tempat yang baru. Ayo amati contoh bentuk muka bumi di sini!",
    faktaAnak: "Tahukah kamu? Hancuran batuan bisa terbawa oleh air, angin, atau es, sebelum akhirnya mengendap.",
    instruksi: "Trio Pembentuk Lanskap",
    pertanyaan: "Tiga proses bekerja mengubah wajah bumi: 1) Pelapukan, 2) Erosi, 3) Pengendapan. Peran mereka: A) memindahkan material lewat air, angin, atau es; B) menumpuk material di tempat baru; C) menghancurkan batuan. Pilih pasangan yang tepat!",
    opsi: ["1-C, 2-A, 3-B", "1-A, 2-B, 3-C", "1-B, 2-C, 3-A", "1-C, 2-B, 3-A"],
    kunci: "A",
    hint: "Urutan kerjanya: batuan hancur dulu, lalu berpindah, lalu menetap.",
    penjelasan: "Pelapukan menghancurkan batuan, erosi memindahkan material hasil pelapukan lewat air, angin, atau es, dan pengendapan menumpuknya di tempat baru.",
  },
  7: {
    en: {
      "umum": {
        "judul": "Discovering Earth's Treasures: Rocks and Minerals",
        "cerita": "The Earth holds a wide variety of minerals and rocks, each with its own color, shape, and character. There is lapis lazuli, famous for its deep blue color, and geodes, which hide crystals inside. Take a look at the mineral collection, and learn the three main groups of rock: igneous, sedimentary, and metamorphic!",
        "fakta": "A geode can look like an ordinary rock from the outside, but its inside may be filled with beautiful crystals.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Earth's Treasures: Rocks and Minerals",
        "cerita": "The Earth holds lots of colorful rocks and minerals. There is lapis lazuli, a deep blue stone. There are also geodes, rocks that are full of crystals inside. Rocks come in three groups: igneous, sedimentary, and metamorphic. Come and look at the collection!",
        "fakta": "Did you know? A geode looks like an ordinary rock from the outside, but inside it can be full of beautiful crystals.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-07"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 4,
    fotoKedua: 1,
    durasiMenit: 13,
    judulAnak: "Harta Karun Bumi: Batuan dan Mineral",
    ceritaAnak:
      "Bumi menyimpan banyak batu dan mineral yang berwarna-warni. Ada lapis lazuli, batu yang berwarna biru tua. Ada juga geodes, batu yang di dalamnya penuh kristal. Batuan ada tiga kelompok, yaitu beku, sedimen, dan metamorf. Ayo amati koleksinya!",
    faktaAnak: "Tahukah kamu? Geodes terlihat seperti batu biasa dari luar, tetapi di dalamnya bisa penuh kristal yang indah.",
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
    en: {
      "umum": {
        "judul": "The Hidden Power Inside the Earth",
        "cerita": "The ground we stand on is always moving! Tectonic force comes from the movement of the Earth's plates, and it can build mountains, folds, and faults. Take a look at the mica schist, peridotite, and basalt lava, and learn more about the processes that shape our planet!",
        "fakta": "Peridotite is a rock that makes up much of the Earth's upper mantle.",
        "status": "Draft"
      },
      "anak": {
        "judul": "The Earth That Never Rests",
        "cerita": "The ground we stand on is moving, very slowly! The movement of the Earth's plates can build mountains, folds, and faults. This power is called tectonic force. Come and look at the mica schist, peridotite, and basalt lava here!",
        "fakta": "Did you know? Peridotite is a rock that makes up much of the Earth's upper mantle.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-08"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 3,
    fotoKedua: 0,
    durasiMenit: 7,
    judulAnak: "Bumi yang Tidak Pernah Diam",
    ceritaAnak:
      "Tanah yang kita pijak ternyata terus bergerak, pelan sekali! Gerakan lempeng bumi bisa membentuk gunung, lipatan, dan patahan. Kekuatan itu disebut tenaga tektonik. Ayo amati sekis mika, peridotit, dan lava basal di sini!",
    faktaAnak: "Tahukah kamu? Peridotit adalah batuan yang banyak menyusun mantel atas bumi.",
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
    en: {
      "umum": {
        "judul": "From the Big Bang to the Birth of Earth",
        "cerita": "Have you ever wondered how the universe and planet Earth were formed? According to the Big Bang theory, the universe began in an extremely hot and dense state, and has been expanding ever since. Over time, Earth took shape and changed until it became the planet we know today. Follow Earth's long journey through the collection and illustrations in front of you!",
        "fakta": "The Earth has four main layers: the crust, the mantle, the outer core, and the inner core.",
        "status": "Draft"
      },
      "anak": {
        "judul": "From the Big Bang to Planet Earth",
        "cerita": "How were the universe and planet Earth formed? According to the Big Bang theory, the universe was once extremely hot and dense, and it has been growing ever since. Over time, Earth took shape and became the planet we live on. Follow Earth's long journey through the collection and pictures in front of you!",
        "fakta": "Did you know? The Earth has four layers: the crust, the mantle, the outer core, and the inner core.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-09"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 1,
    fotoKedua: 0,
    durasiMenit: 6,
    judulAnak: "Dari Big Bang sampai Bumi Terbentuk",
    ceritaAnak:
      "Bagaimana alam semesta dan planet Bumi terbentuk? Menurut teori Big Bang, alam semesta dulu sangat panas dan padat, lalu terus mengembang sampai sekarang. Lama-lama, Bumi terbentuk dan berubah menjadi planet yang kita tinggali. Ayo ikuti perjalanan panjang Bumi lewat koleksi dan gambar di depanmu!",
    faktaAnak: "Tahukah kamu? Bumi punya empat lapisan, yaitu kerak, mantel, inti luar, dan inti dalam.",
    instruksi: "Menembus Lapisan Bumi",
    pertanyaan: "Bumi punya empat lapisan utama. Perhatikan ilustrasi penampang struktur Bumi, lalu pilih urutan lapisan dari yang paling luar sampai paling dalam.",
    opsi: ["Kerak - Mantel - Inti luar - Inti dalam", "Mantel - Kerak - Inti dalam - Inti luar", "Kerak - Inti luar - Mantel - Inti dalam", "Inti dalam - Inti luar - Mantel - Kerak"],
    kunci: "A",
    hint: "Kerak adalah \"kulit\" bumi tempat kita berpijak.",
    penjelasan: "Bumi memiliki empat lapisan utama, yaitu kerak, mantel, inti luar, dan inti dalam.",
  },
  10: {
    en: {
      "umum": {
        "judul": "The Variety of Rocks from the Archipelago",
        "cerita": "Indonesia has many kinds of rock, formed through different geological processes. There is black limestone, biotite schist, chert, peridotite, and granite. Every rock holds a story about how our planet was formed. Take a look at the colors and textures of the collection, and spot the differences!",
        "fakta": "Granite forms from magma that cools slowly beneath the Earth's surface, so its crystals are clearly visible.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Rocks from the Archipelago",
        "cerita": "Indonesia has many kinds of rocks, and each one was made in a different way. There is black limestone, biotite schist, chert, peridotite, and granite. Look closely at their colors and textures, and spot the differences!",
        "fakta": "Did you know? Granite forms when magma cools slowly underground, so its crystals are easy to see.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-10"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 3,
    fotoKedua: 5,
    durasiMenit: 10,
    judulAnak: "Batuan dari Nusantara",
    ceritaAnak:
      "Indonesia punya banyak jenis batuan, dan masing-masing terbentuk dengan cara yang berbeda. Ada batugamping hitam, sekis biotit, rijang, peridotit, dan granit. Ayo amati warna dan teksturnya, lalu temukan bedanya!",
    faktaAnak: "Tahukah kamu? Granit terbentuk dari magma yang mendingin pelan-pelan di bawah tanah, jadi kristalnya terlihat jelas.",
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
    en: {
      "umum": {
        "judul": "Indonesia's Natural Wealth",
        "cerita": "Indonesia holds an abundance of geological riches. There are metallic minerals, non-metallic minerals, and gemstones, such as amethyst from Solok in West Sumatra. There are also coal, oil and natural gas, geothermal energy, and water resources, all used in our everyday lives. Discover these natural resources, and how people make use of them!",
        "fakta": "Indonesia has great geothermal potential because it lies in an area of high volcanic activity.",
        "status": "Draft"
      },
      "anak": {
        "judul": "Indonesia's Treasures",
        "cerita": "Indonesia has so much natural wealth! There are metals, and gemstones such as amethyst from Solok in West Sumatra. There are also coal, oil and gas, geothermal energy, and water. People use all of these every day. Let's get to know our natural treasures!",
        "fakta": "Did you know? Indonesia has great geothermal energy, because there are so many volcanoes here.",
        "status": "Draft"
      }
    },
    ...approvedStoryContent("POI-11"),
    // Cerita umum: approved-stories.json. Sisanya dari workbook Template_..._Anak (15 Nov 2026):
    // Konten_Cerita_Anak, Quest, Quest_Anak,
    // POI_Preference. Status: Draft.
    fotoUtama: 0,
    fotoKedua: 3,
    durasiMenit: 7,
    judulAnak: "Harta Kekayaan Indonesia",
    ceritaAnak:
      "Indonesia punya kekayaan alam yang melimpah! Ada logam, dan ada batu mulia seperti ametis dari Solok, Sumatera Barat. Ada juga batubara, minyak dan gas bumi, panas bumi, dan air. Semua itu dipakai manusia setiap hari. Ayo kenali kekayaan alam kita!",
    faktaAnak: "Tahukah kamu? Indonesia punya panas bumi yang besar, karena banyak gunung api di sini.",
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
