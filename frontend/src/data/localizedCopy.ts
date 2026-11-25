import type { Language } from "../domain/contracts.ts";

const englishCopy: Readonly<Record<string, string>> = {
  "Belum diperiksa": "Not checked", "Layanan belum tersedia": "Service unavailable", "Layanan terhubung": "Service connected",
  "Batas area museum sedang disiapkan. QR pintu masuk tetap bisa digunakan jika sudah tersedia.": "The museum boundary is being configured. You can still use an available entrance QR code.",
  "Selamat datang di museum": "Welcome to the museum", "QR pintu masuk berhasil diverifikasi. Kunjunganmu sudah aktif.": "Entrance QR code verified. Your visit is now active.",
  "Buka pengaturan izin": "Open permission settings", "Aktifkan lokasi HP": "Enable device location",
  "Cari label Megalochelys sp. dengan keterangan tulang lengan (humerus).": "Look for the Megalochelys sp. label describing an upper arm bone (humerus).",
  "Megalochelys adalah kura-kura raksasa purba. Fosilnya menjadi salah satu bukti beragamnya fauna purba Indonesia.": "Megalochelys was a prehistoric giant tortoise. Its fossils reveal the diversity of Indonesia's ancient fauna.",
  "Hebat! Megalochelys adalah kura-kura raksasa dari zaman purba. Fosilnya jadi bukti hewan apa saja yang pernah hidup di Indonesia.": "Great! Megalochelys was a prehistoric giant tortoise. Its fossils show which animals once lived in Indonesia.",
  "Abaikan karang yang bercabang atau pipih. Cari yang bentuknya bulat dan padat.": "Ignore branching or flat corals. Look for a round, solid shape.",
  "Head coral adalah jenis karang dengan koloni membulat seperti kepala, dan menjadi salah satu koleksi terumbu karang di POI ini.": "Head coral forms rounded colonies shaped like a head. It is part of this POI's coral collection.",
  "Jangan pilih karang yang bercabang atau pipih. Cari yang bulat!": "Skip branching or flat corals. Find a round one!",
  "Keren! Head coral adalah karang yang bentuknya bulat seperti kepala.": "Well done! Head coral is rounded like a head.",
  "Cari batu yang hitam, licin, dan mengilap seperti kaca.": "Look for a black, smooth rock that shines like glass.",
  "Obsidian terbentuk ketika lava membeku sangat cepat, sehingga tidak sempat membentuk kristal dan tampak seperti kaca.": "Obsidian forms when lava cools so quickly that crystals cannot grow, giving it a glassy appearance.",
  "Cari batu yang hitam, licin, dan berkilau seperti kaca!": "Find a black, smooth rock that sparkles like glass!",
  "Hore, ketemu! Obsidian terbentuk dari lava yang membeku sangat cepat, jadi tampak seperti kaca.": "You found it! Obsidian forms from lava that cools very quickly, so it looks like glass.",
  "Sesar itu patahan. Struktur yang melengkung punya nama lain.": "A fault is a fracture. Bent rock layers have another name.",
  "Salah. Batuan yang melengkung tanpa terpecah disebut lipatan, sedangkan sesar terbentuk ketika batuan patah dan bergeser.": "False. Rock layers bent without breaking are folds. Faults form when rocks break and move.",
  "Dengarkan narasi tentang lempeng bumi yang terus bergerak.": "Listen to the narration about Earth's moving plates.",
  "Pergerakan lempeng tektonik, aktivitas gunung api, dan proses geologi selama jutaan tahun membentuk Kepulauan Indonesia, dan bentuknya masih terus berubah hingga kini.": "Tectonic plate movement, volcanic activity, and millions of years of geological processes shaped the Indonesian islands, which continue to change today.",
  "Urutan kerjanya: batuan hancur dulu, lalu berpindah, lalu menetap.": "The order is: rock breaks down, moves, and then settles.",
  "Pelapukan menghancurkan batuan, erosi memindahkan material hasil pelapukan lewat air, angin, atau es, dan pengendapan menumpuknya di tempat baru.": "Weathering breaks down rocks, erosion carries material by water, wind, or ice, and deposition leaves it in a new place.",
  "Cari label yang bertuliskan Dasit di antara koleksi batuan.": "Look for the Dasit label in the rock collection.",
  "Dasit adalah batuan beku vulkanik, yang terbentuk dari lava gunung api yang membeku.": "Dacite is a volcanic igneous rock formed from cooled lava.",
  "Cari label yang bertuliskan Dasit!": "Find the label marked Dasit!",
  "Mantap! Dasit adalah batuan beku yang berasal dari lava gunung api.": "Excellent! Dacite is an igneous rock formed from volcanic lava.",
  "Ia berasal dari lapisan di bawah kerak bumi. Cek label koleksinya!": "It comes from the layer beneath Earth's crust. Check the collection label!",
  "Peridotit merupakan batuan yang banyak menyusun bagian mantel atas bumi.": "Peridotite makes up much of Earth's upper mantle.",
  "Cari label yang bertuliskan Meteorit Namibia.": "Look for the label marked Meteorit Namibia.",
  "Meteorit adalah benda dari luar angkasa yang jatuh sampai ke permukaan Bumi. Koleksi ini membantu para ilmuwan mempelajari asal-usul tata surya dan planet Bumi.": "A meteorite is an object from space that reaches Earth's surface. This collection helps scientists study the origins of the solar system and Earth.",
  "Cari label yang bertuliskan Meteorit Namibia!": "Find the label marked Meteorit Namibia!",
  "Wow, hebat! Meteorit adalah benda dari luar angkasa yang jatuh sampai ke Bumi.": "Amazing! A meteorite is an object from space that reaches Earth.",
  "Rijang berbutir sangat halus. Cari label yang bertuliskan Rijang.": "Chert is very fine-grained. Look for the Rijang label.",
  "Rijang adalah batuan sedimen yang tersusun dari silika, bertekstur halus, dan sangat keras. Ia menjadi salah satu ragam batuan di Indonesia.": "Chert is a fine-grained, very hard sedimentary rock made of silica. It is one of Indonesia's many rock types.",
  "Rijang halus dan keras. Cari label yang bertuliskan Rijang!": "Chert is fine-grained and hard. Find the label marked Rijang!",
  "Mantap! Rijang adalah batu keras yang terbuat dari silika.": "Great! Chert is a hard rock made of silica.",
  "Cari label yang bertuliskan Nikel di antara koleksi mineral logam.": "Look for the Nikel label among the metallic minerals.",
  "Nikel adalah logam yang banyak dipakai untuk baja tahan karat dan baterai, dan Indonesia termasuk penghasil nikel terbesar di dunia.": "Nickel is widely used in stainless steel and batteries. Indonesia is one of the world's largest nickel producers.",
  "Cari label yang bertuliskan Nikel!": "Find the label marked Nikel!",
  "Keren! Indonesia termasuk penghasil nikel terbesar di dunia.": "Great! Indonesia is one of the world's largest nickel producers.",
  "Ia tumbuh ke bawah dari langit-langit gua, bukan naik dari lantai.": "It grows down from a cave ceiling, not up from the floor.",
  "Stalaktit terbentuk dari endapan mineral kalsit yang menumpuk perlahan dari tetesan air di langit-langit gua.": "Stalactites form as calcite slowly builds up from water dripping from a cave ceiling.",
  "Kerak adalah kulit bumi tempat kita berpijak.": "The crust is Earth's outer layer, where we stand.",
  "Bumi memiliki empat lapisan utama, yaitu kerak, mantel, inti luar, dan inti dalam.": "Earth has four main layers: the crust, mantle, outer core, and inner core.",
  "Daerah asalnya berada di Pulau Sumatra.": "Its place of origin is on the island of Sumatra.",
  "Ametis adalah batu mulia yang berasal dari Solok, Sumatera Barat, bagian dari kekayaan geologi Indonesia.": "This amethyst comes from Solok, West Sumatra, and is part of Indonesia's geological wealth.",
  "Kamu berada di area museum": "You are at the museum", "Lokasi berhasil diperiksa. Kunjunganmu bisa dimulai.": "Location verified. Your visit can begin.",
  "Belum berada di area museum": "You are outside the museum area", "Datang ke area museum, lalu periksa lokasimu kembali.": "Go to the museum area, then check your location again.",
  "Lokasi belum cukup akurat": "Location is not accurate enough", "GPS belum bisa memastikan posisimu. Gunakan QR di pintu masuk.": "GPS could not confirm your position. Use the entrance QR code.",
  "Lokasi belum tersedia": "Location unavailable", "Aktifkan lokasi perangkat atau gunakan QR di pintu masuk.": "Enable device location or use the entrance QR code.",
  "Pengecekan lokasi belum tersedia": "Location checking is unavailable", "Batas area museum belum ditetapkan. Gunakan QR pintu masuk yang diterbitkan museum.": "The museum boundary has not been configured. Use the museum's entrance QR code.",
  "Izin lokasi belum diberikan": "Location access not granted", "Izinkan lokasi saat aplikasi digunakan untuk memeriksa area museum. Tekan Periksa lokasi saya untuk mencoba lagi, atau gunakan QR pintu masuk.": "Allow location access while using the app to check the museum area. Tap Check my location to retry, or use the entrance QR code.",
  "Izinkan lokasi di pengaturan": "Allow location access in settings", "Dialog izin tidak bisa ditampilkan lagi. Buka pengaturan aplikasi, izinkan lokasi saat digunakan, lalu kembali dan periksa lokasi lagi. Kamu juga bisa memakai QR pintu masuk.": "Open app settings, allow location access while using the app, then return and check again. You can also use the entrance QR code.",
  "Lokasi HP belum aktif": "Device location is off", "Aktifkan Layanan Lokasi melalui Pengaturan → Privasi & Keamanan → Layanan Lokasi. Setelah kembali, tekan Periksa lokasi saya lagi, atau gunakan QR pintu masuk.": "Enable Location Services in Settings → Privacy & Security → Location Services, then return and check again or use the entrance QR code.",
  "Aktifkan lokasi HP melalui pengaturan, lalu kembali dan tekan Periksa lokasi saya lagi. Kamu juga bisa memakai QR pintu masuk.": "Enable device location in settings, then return and tap Check my location again. You can also use the entrance QR code.",
  "Browser atau perangkat belum bisa membaca posisi. Buka lewat localhost atau HTTPS, periksa izin lokasi, lalu coba lagi.": "Your browser or device could not read your position. Use localhost or HTTPS, check location permissions, and try again.",
  "Akurasi lokasi belum tersedia": "Location accuracy unavailable", "GPS belum memberikan informasi akurasi. Coba lagi di tempat dengan sinyal GPS lebih baik, atau gunakan QR pintu masuk.": "GPS has not reported its accuracy. Try somewhere with a stronger GPS signal, or use the entrance QR code.",
  "Posisi GPS belum ditemukan": "GPS position not found", "Pencarian posisi belum berhasil dalam 15 detik. Coba lagi di tempat dengan sinyal GPS lebih baik, atau gunakan QR pintu masuk.": "A position could not be found within 15 seconds. Try somewhere with a stronger GPS signal, or use the entrance QR code.",
  "Berapa usiamu sekarang?": "How old are you?",
  "Pilih salah satu.": "Choose one option.",
  "Berapa lama kamu ingin menjelajah?": "How long would you like to explore?",
  "Topik apa yang menarik minatmu?": "Which topics interest you?",
  "Boleh pilih lebih dari satu.": "You can choose more than one.",
  "Mau menjelajah dengan cara apa?": "How would you like to explore?",
  "Bisa diganti nanti lewat tombol speaker di peta.": "You can change this later in the map settings.",
  "Mode biasa": "Normal mode",
  "Mode tanpa layar": "Eyes free mode",
  "Baca cerita dan kerjakan quest di layar, pindai QR koleksi.": "Read stories, complete quests on screen, and scan collection QR codes.",
  "HP bergetar dan rekaman cerita diputar otomatis saat tiba. Layar boleh dikunci.": "Your phone vibrates and plays stories when you arrive. Background guidance requires a supported mobile app and location permission.",
  "7-12 Tahun": "7–12 years", "13-17 Tahun": "13–17 years", "18-24 Tahun": "18–24 years", ">24 Tahun": "Over 24 years",
  "< 30 menit": "Under 30 minutes", "30-45 Menit": "30–45 minutes", "45 menit-1.5 Jam": "45 minutes–1.5 hours", "> 1.5 jam": "Over 1.5 hours",
  "Gunung Api & Gempa": "Volcanoes & Earthquakes", "Batuan & Mineral": "Rocks & Minerals", "Bentang Alam & Gua": "Landforms & Caves", "Asal-usul Bumi": "Origins of Earth", "Fosil & Hewan Purba": "Fossils & Prehistoric Animals",
  "Penjelajah Sayap Kiri": "Left Wing Explorer", "Pemburu Foto": "Photo Hunter", "Otak Geologi": "Geology Brain", "Geolog Sejati": "True Geologist", "Penjelajah Sayap Kanan": "Right Wing Explorer",
  "Langkah Pertama": "First Steps", "Pembaca Gerak Bumi": "Earth Movement Explorer", "Pengelana Lorong Waktu": "Time Traveller", "Jejak Manusia Purba": "Early Human Tracker", "Kolektor Batuan": "Rock Collector",
  "Rajin Berkunjung": "Regular Visitor", "Si Teliti": "Sharp Observer", "Penakluk Tantangan Sulit": "Challenge Master", "Fotografer Cilik": "Young Photographer", "Penjelajah Cilik": "Young Explorer", "Penjelajah Bumi": "Earth Explorer",
  "Check-in di semua POI sayap kiri (POI-01 s.d. POI-11).": "Check in at every left wing POI (POI-01 to POI-11).",
  "Selesaikan semua quest tipe Foto.": "Complete every photo quest.", "Jawab benar semua kuis tanpa salah.": "Answer every quiz correctly without a mistake.", "Selesaikan semua POI.": "Complete every POI.",
  "Check-in di semua POI sayap kanan (POI-12 s.d. POI-20).": "Check in at every right wing POI (POI-12 to POI-20).",
  "Selesaikan quest pertamamu di POI mana pun.": "Complete your first quest at any POI.",
  "Selesaikan quest di POI-03, POI-04, POI-05, dan POI-08.": "Complete quests at POI-03, POI-04, POI-05, and POI-08.",
  "Selesaikan quest di POI-12 s.d. POI-17.": "Complete quests at POI-12 to POI-17.",
  "Selesaikan quest di POI-18, POI-19, dan POI-20.": "Complete quests at POI-18, POI-19, and POI-20.",
  "Selesaikan quest di POI-07, POI-10, dan POI-11.": "Complete quests at POI-07, POI-10, and POI-11.",
  "Selesaikan minimal 1 quest pada 3 hari kunjungan yang berbeda.": "Complete at least one quest on three different visit days.",
  "Jawab benar pada percobaan pertama di 5 quest kuis.": "Answer five quiz quests correctly on your first attempt.",
  "Selesaikan semua quest tingkat Sulit (POI-06 dan POI-10).": "Complete every difficult quest (POI-06 and POI-10).",
  "Selesaikan semua quest foto anak-anak.": "Complete every children's photo quest.",
  "Selesaikan quest anak-anak di minimal 2 POI berbeda.": "Complete children's quests at two or more different POIs.",
  "Check-in lokasi": "Location check-in", "Cerita selesai dibaca": "Story completed", "Benar di percobaan pertama": "Correct on the first attempt", "POI tuntas": "POI completed",
  "Tulang lengan Megalochelys": "Megalochelys arm bone", "Head coral": "Head coral", "Obsidian": "Obsidian", "Dasit": "Dacite", "Meteorit Namibia": "Namibian meteorite", "Rijang": "Chert", "Nikel": "Nickel", "Batu kecubung": "Amethyst", "Kecubung": "Amethyst",
  "Hadap utara": "Face north", "Hadap timur": "Face east", "Hadap selatan": "Face south", "Hadap barat": "Face west",
};

const englishPoiNames: Readonly<Record<string, string>> = {
  P01: "Palaeogeography & Fauna Distribution of Indonesia", P02: "Karst of Indonesia", P03: "Volcanoes of Indonesia", P04: "Landforms of Indonesia", P05: "Geology of Indonesia Animation", P06: "Weathering, Erosion & Deposition", P07: "Rocks & Minerals", P08: "Tectonic Forces", P09: "The Universe & Formation of Earth", P10: "Rock Diversity in Indonesia", P11: "Geological Resources", P12: "Introduction to the History of Life", P13: "Precambrian", P14: "Palaeozoic", P15: "Mesozoic", P16: "Cenozoic: Tertiary", P17: "Quaternary Vertebrates", P18: "Hominids", P19: "Hominid Diorama", P20: "Artefacts",
};

/** Translate catalog labels without changing the canonical values used for storage and scoring. */
export function localizeCopy(value: string, language: Language): string {
  if (language === "id") return value;
  const translated: string | undefined = englishCopy[value];
  if (translated === undefined) throw new RangeError(`Terjemahan label belum tersedia: language=${language}, value=${value}`);
  return translated;
}

export function localizedPoiName(poi: { readonly code: string; readonly name: string }, language: Language): string {
  if (language === "id") return poi.name;
  const translated: string | undefined = englishPoiNames[poi.code];
  if (translated === undefined) throw new RangeError(`Terjemahan nama POI belum tersedia: language=${language}, code=${poi.code}`);
  return translated;
}

export function localizedDuration(value: string, language: Language): string {
  if (language === "id") return value;
  return value.replace(/\bjam\b/gi, "hr").replace(/\b(menit|mnt)\b/gi, "min");
}

export function localizedSuggestionReason(value: string, language: Language): string {
  if (language === "id") return value;
  if (value === "Koleksi yang belum selesai di dekat posisimu.") return "An unfinished collection near your location.";
  if (value === "Koleksi yang belum kamu selesaikan.") return "A collection you have not completed yet.";
  const prefix: string = "Sesuai minatmu: ";
  if (!value.startsWith(prefix)) throw new RangeError(`Terjemahan rekomendasi belum tersedia: value=${value}`);
  const interests: readonly string[] = value.slice(prefix.length).replace(/\.$/, "").split(", ");
  return `Matches your interests: ${interests.map((interest: string): string => localizeCopy(interest, language)).join(", ")}.`;
}

export function localizedGpsTestLabel(value: string, language: Language): string {
  if (language === "id") return value;
  if (value === "Pakai GPS asli") return "Use actual GPS";
  if (value === "Di luar museum") return "Outside the museum";
  if (value === "GPS lemah (35 m)") return "Weak GPS (35 m)";
  if (value === "Masuk Sayap Kiri") return "Enter Left Wing";
  if (value === "Masuk Sayap Kanan") return "Enter Right Wing";
  if (/^Di dekat P\d+$/.test(value)) return value.replace("Di dekat ", "Near ");
  throw new RangeError(`Terjemahan uji lokasi belum tersedia: value=${value}`);
}
