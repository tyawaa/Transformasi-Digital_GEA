# Aplikasi GEA untuk Expo Go

Proyek Expo SDK 57 dan TypeScript, mengikuti SDK Expo Go yang tersedia saat
setup. Folder ini terpisah dari backend Deno/Supabase. Tidak ada secret admin
dalam aplikasi.

## Membuka di HP

```powershell
cd frontend
npm ci
# .env sudah diisi untuk project GEA pada mesin ini.
# Untuk checkout baru: salin .env.example ke .env dan isi publishable key.
npm start
```

Pasang Expo Go di HP, sambungkan HP dan laptop ke Wi-Fi yang sama, lalu scan QR
dari terminal. Pada Android, scan melalui Expo Go. Pada iPhone, ikuti instruksi
Expo Go dan gunakan akun Expo yang sama dengan CLI jika diminta. QR server Expo
untuk membuka aplikasi berbeda dari QR museum yang dipindai di dalam aplikasi.
Pengujian kamera dan GPS dilakukan pada HP fisik.

Jika HP tidak dapat menjangkau koneksi LAN, gunakan tunnel ngrok yang sudah
menjadi dev dependency lokal proyek:

```powershell
npm run start:tunnel
```

Tunnel memerlukan internet di laptop dan HP; keduanya tidak harus berada pada
Wi-Fi yang sama. Scan QR baru dari terminal. Tidak perlu menambahkan kata
`ngrok` pada command atau menginstalnya secara global. Jika port 8081 masih
dipakai server lain, gunakan `npm run start:tunnel -- --port 8082`, atau
hentikan server lama melalui terminalnya sendiri. Tunnel mengubah jalur koneksi,
bukan versi SDK. Jika Expo Go menampilkan SDK mismatch, versi SDK perlu
disesuaikan berdasarkan pesan tersebut.

`npm run android` membuka emulator/perangkat Android yang sudah disiapkan.
`npm run ios` memerlukan simulator iOS di macOS; pengguna Windows tetap dapat
memakai iPhone dengan Expo Go. `npm run web` membuka versi browser untuk
memeriksa tampilan. Kamera/lokasi browser mengikuti izin browser dan persyaratan
secure context.

Pada mesin Windows ini, log ngrok menunjukkan
`x509: certificate signed by unknown authority`. Paket lokal dan executable
ngrok berfungsi, tetapi tunnel belum berhasil terhubung. Konfigurasi profil Expo
di `C:\Users\Tyara\.expo\ngrok.yml` menggunakan CA bawaan ngrok; validasi TLS
tetap aktif. Pengujian CA Windows juga belum dapat memverifikasi sertifikat yang
diterima. Periksa sertifikat/jalur jaringan sebelum menambahkan CA apa pun.
Salinan konfigurasi asal ada di `.expo/ngrok.original.yml`; file profil dan
backup dapat berisi kredensial ngrok sehingga tidak boleh dimasukkan Git.

## Coba di browser tanpa `expo start`

Jika `expo start` macet, buat build web lalu sajikan secara statis di PowerShell:

```powershell
cd frontend
.\scripts\serve-web.ps1          # build ulang lalu buka http://localhost:8082
.\scripts\serve-web.ps1 -NoBuild # pakai build terakhir
```

Di layar lebar (>600 px) aplikasi otomatis dibuka di bingkai HP (`demo.html`); tambahkan
`?full` ke URL untuk melewatinya. Server hanya hidup selama jendela terminal itu terbuka (Ctrl+C untuk berhenti). Setelah kode
diubah, jalankan lagi tanpa `-NoBuild`. Kamera tidak tersedia di browser; pakai menu "Mode uji".
Refresh melanjutkan progres yang tersimpan. Pada mode mock, tombol **Ulangi demo** di bawah
bingkai HP menghapus progres, poin, percobaan kuis, dan status onboarding lokal setelah konfirmasi,
lalu memuat ulang aplikasi dari awal. Konten cerita dan database Supabase tetap tersimpan.

## Alur aplikasi (Sprint 2, C-3)

Onboarding → **peta lantai 1** → scan QR → cerita POI → Kisah Selesai → Side Quest → kuis →
hasil poin. Progres (poin, lencana) bisa dilihat dari tombol poin di peta.

- **Peta** (`src/features/map`): denah P01–P20 dengan identitas dan koordinat dari dataset A9. Warna ruangan = status POI
  (belum/sebagian/selesai), abu-abu = belum ada konten. Sayap aktif diambil dari QR zona atau QR
  koleksi terakhir. Hi-fi peta (D3) belum ada, jadi tampilan masih memakai token design system.
- **QR scanner bersama (E13)** (`src/features/qr`, `ScanQrScreen`): dipakai untuk QR pintu masuk,
  zona, dan koleksi; ada tombol "Mulai tanpa scan" (cerita boleh dibaca, quest tetap terkunci).
- **Quest (E14)**: terkunci sampai QR koleksi terverifikasi, maksimal 3 percobaan, hint setelah
  salah, poin 20/10/5/0. Aturan ada di `src/domain/points.ts` dan diuji dengan `npm test`.
- **Progres tersimpan (E20)**: sesi kunjungan dan progres disimpan di AsyncStorage, lalu
  dicocokkan dengan `GET /sessions/{id}/progress` saat app dibuka lagi.
- Layar "Kisah Selesai" dan "Side Quest" ada di `StoryEndScreens.tsx` dan masih **sementara**
  (desain belum final). Ilustrasi ikan belum diekspor dari Figma.

### Foto survei POI (tidak masuk Git)

Foto asli disimpan di folder `POI/P01 … P14` (di luar repo). Untuk memakainya di aplikasi:

```powershell
cd frontend
.\scripts\sync-poi-photos.ps1                  # sumber bawaan: ..\..\POI
.\scripts\sync-poi-photos.ps1 -Source "D:\POI"  # sumber lain
```

Skrip memperkecil foto (maks. 1200 px) ke `assets/poi/` dan membuat
`src/data/poiPhotos.local.ts`. Keduanya ada di `.gitignore`. Tanpa keduanya aplikasi tetap
bisa di-build dan memakai ilustrasi sementara. Foto ditentukan dengan nomor urut nama file:
`fotoUtama` (layar ringkasan) dan `fotoKedua` (layar isi cerita) di `src/data/museum.ts`.

### Dua versi peta

- `EXPO_PUBLIC_MAP_WINGS=left`: hanya Sayap Kiri (P01–P11), denah lebih besar, Sayap
  Kanan ditandai "segera hadir". Lencana Penjelajah Sayap Kanan disembunyikan, dan QR koleksi
  sayap kanan ditolak dengan pesan yang jelas.
- `EXPO_PUBLIC_MAP_WINGS=both` (bawaan): Sayap Kiri + Sayap Kanan.
- Versi web bisa diganti tanpa build ulang: `http://localhost:8082/?wings=both` atau `?wings=left`.

### Data POI

`src/data/museum.ts` membaca 20 POI yang sudah disurvei dari `../backend/data/checkpoints.json`.
ID, nama, zona, koordinat dan radius 15 m berasal dari sumber yang sama dengan penerbit QR backend.
Kode tampilan `P01` dan kode dataset `POI-01` mengarah ke UUID yang sama. POI-21 tidak digunakan.
Posisi denah dan konten draft tetap di frontend; 14 POI memiliki cerita/soal draft, sementara
konten P15–P20 belum dimasukkan. Mode API mengambil konten dan media dari backend/Storage.
Mode mock (`EXPO_PUBLIC_STORIES_SOURCE=mock`) hanya untuk pengembangan dengan data draft.
Konfigurasi lokal integrasi memakai API dan dua sayap.

### Yang dibutuhkan dari tim

- **C-1 (A9/B6/D5)**: pakai ID stabil per kode POI saat seed, `30000000-0000-4000-8000-0000000000NN`
  (NN = nomor POI) dan quest `40000000-...NN`, agar peta mencocokkan POI dari database lewat
  UUID dataset A9. Isi QR cetak berlabel:
  `GEA1:POI:P03:<token64hex>`, `GEA1:ZONE:ZL:<token>`, `GEA1:ENTRANCE:-:<token>`. Token 64 hex
  polos juga tetap diterima. Yang dikirim ke backend tetap hanya token.
- **C-2 (E11/E12)**: backend sekarang belum membatasi 3 percobaan dan belum punya poin/lencana.
  Aplikasi sudah membaca field opsional `failed` dan `pointsAwarded` pada respons jawaban, dan
  sementara menghitung poin dari jumlah percobaan. Mohon jawaban ke-4 ditolak dengan kode
  `QUEST_ATTEMPTS_EXHAUSTED` (409).
- **Data**: per 9 Nov, `GET /pois` di cloud masih kosong, jadi mode API menampilkan "Data
  koleksi belum tersedia". Kosongkan `EXPO_PUBLIC_STORIES_SOURCE` setelah B6 selesai.

## Koneksi Supabase dan database

Environment aplikasi menggunakan `EXPO_PUBLIC_SUPABASE_URL` dan
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keduanya bukan akses admin dan tidak
bisa menjalankan migrasi. `.env` tidak masuk Git. Setelah mengganti environment,
restart Metro dengan `npm start -- --clear`.

Database GEA, bucket media, dan fungsi backend sudah dideploy ke project cloud.
Anonymous Sign-Ins sudah aktif. Tombol "Cek layanan" sekarang dapat memeriksa
endpoint cloud. Konfigurasi batas museum dan konten POI belum diisi, sehingga
akses GPS belum diizinkan dan daftar published masih kosong. Panduan pengelolaan
migrasi serta Auth ada di `../backend/README.md`.

Jika fungsi backend belum dideploy, tombol "Cek layanan" menampilkan layanan
belum tersedia. Jika Anonymous Sign-Ins belum aktif, pembuatan identitas
pengunjung ditolak. Jika batas museum belum ditetapkan, pengecekan geofence
tidak mengizinkan masuk. Jika belum ada konten approved, daftar POI akan kosong.
Kondisi tersebut tidak digantikan data museum buatan.

## Pemeriksaan

```powershell
npm run typecheck
npm test
npm run doctor
npm run export:android
npm run export:web
```

Export membuktikan bundle dapat dibuat, bukan membuktikan GPS/kamera sudah diuji
di perangkat. Gunakan build Expo Go di HP untuk memeriksa izin ditolak, GPS
lemah, QR invalid, dan keberhasilan gating setelah backend cloud siap. Detail
error HTTP dicatat sebagai field terstruktur di log Metro; token Auth tidak
dicetak.

Audit dependency SDK 57 dan tooling tunnel masih melaporkan 15 temuan transitif
(3 high). Versi Zod yang dipakai kode aplikasi adalah 4.6.7; temuan Zod lama
berasal dari tooling Expo. Saran `npm audit fix
--force` memindahkan Expo ke SDK
58, sehingga tidak diterapkan pada target Expo Go SDK 57 ini.

## Geofence GPS (E10)

Selama kunjungan aktif, aplikasi memantau GPS (±1 detik) bila izin lokasi sudah diberikan
(`src/hooks/useGeofence.ts`, logika di `src/domain/geofence.ts`, uji di `tests/geofence.test.mjs`).

- Masuk radius koleksi: kartu "Kamu di dekat" muncul ≤3 detik; tidak berulang selama tetap di dalam.
- Keluar lalu masuk lagi: kartu muncul lagi. Kartu yang ditutup (✕) tidak muncul lagi di kunjungan itu.
- Akurasi > 20 m: banner merah "GPS lemah" (ketuk untuk scan QR); posisi tidak dipakai.
- "Saya di sini" di judul sayap: pilih ruang manual bila GPS tidak membantu.
- Mode mock: tombol "Uji GPS ▾" di peta untuk simulasi posisi (luar museum, GPS lemah, zona, P01–P14).
