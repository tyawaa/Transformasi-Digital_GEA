# Backend GEA

Backend sprint Stories menggunakan Supabase PostgreSQL, Edge Functions TypeScript/Deno, Supabase
Auth anonim, dan Supabase Storage. Aplikasi yang direncanakan adalah Expo/React Native. Tidak perlu
Express atau server hosting tambahan. Project tujuan: `rjlihrvudakfhehbkncw`
(`https://rjlihrvudakfhehbkncw.supabase.co`).

Database cloud memiliki skema GEA (16 tabel public/private), bucket `gea-media`, Auth
anonim aktif, dan fungsi `gea-api` terdeploy. Endpoint health:
`https://rjlihrvudakfhehbkncw.supabase.co/functions/v1/gea-api/health`. Pengujian cloud
memverifikasi Auth/API/geofence dan penolakan akses langsung ke kunci. Dataset published masih
kosong dan konfigurasi area museum belum diisi; ini bukan data demo.

Backend ini menyediakan skema ERD, API Stories, sesi, QR, jawaban, progres, dan evaluasi geofence.
Frontend awal Expo tersedia di `../frontend` untuk landing, GPS, QR pintu masuk, dan daftar POI.
Master 20 POI dan sepuluh cerita final tersimpan sebagai draft; file media, kelengkapan kuis, koordinat museum,
dan uji lapangan belum tersedia. Draft dapat dilengkapi bertahap sebelum dipublikasikan.
Keputusan penggunaan Supabase sudah disetujui dalam pengerjaan ini; handoff teknologi aplikasi tetap
perlu dicocokkan dengan C3.

## Menjalankan dan memeriksa

Node.js >=22 dan npm diperlukan untuk memasang alat proyek; Deno dan Supabase CLI terpasang sebagai
dev dependency, bukan global.

```powershell
cd backend
npm ci
npm run check
npm run lint
npm test
npm run demo:geofence
```

Tes tidak memerlukan museum, Docker, akun cloud, ataupun data produksi. PGlite menjalankan migrasi
dan operasi SQL pada PostgreSQL WASM sementara; fixture enam POI hanya ada di
`tests/fixtures/stories.sql`. Ini bukan pengganti uji runtime Auth/Storage/Edge Supabase.

Untuk stack Supabase lokal, nyalakan Docker Desktop, lalu:

```powershell
npm run start
Copy-Item .env.example .env
npm run serve
```

`supabase start` menerapkan migrasi ke database lokal baru. `npm run db:reset` hanya untuk database
lokal yang datanya memang boleh dihapus. Jangan gunakan reset pada project cloud. Seed otomatis
sengaja dimatikan agar konten simulasi tidak masuk deployment.

## Deploy ke project tim

Login dilakukan pengguna di terminal agar access token tidak dikirim melalui chat.

```powershell
npx supabase login
npx supabase link --project-ref rjlihrvudakfhehbkncw
npm run db:push
npm run deploy:function
```

Pada Windows dengan CA jaringan yang sudah tepercaya di certificate store sistem, jalankan
`$env:NODE_USE_SYSTEM_CA = '1'` sebelum perintah CLI bila muncul `Transport error`. Ini memakai CA
sistem untuk koneksi CLI, tanpa mematikan validasi TLS. Login tersimpan lokal; access token tidak
perlu ditaruh dalam source code atau dikirim melalui chat.

CLI dapat meminta password database saat link/push; masukkan hanya ke prompt lokal. Sebelum migrasi,
periksa schema project tujuan: migrasi ini membuat tabel GEA baru dan tidak menghapus tabel lain.
Bila tabel bernama sama sudah ada, rekonsiliasi skema dahulu; jangan hapus data tim.

CLI dipin ke versi 3: `db:push` memakai `--remote` secara eksplisit. Deployment fungsi memakai
`--use-api`, sehingga tidak membutuhkan Docker. Docker hanya diperlukan stack lokal.

Di Dashboard > Authentication > Sign In / Providers, aktifkan Anonymous Sign-Ins. Akun anonim
dipakai hanya sebagai identitas teknis pemilik sesi, tanpa form akun/password. Simpan dan pulihkan
sesi Auth pada aplikasi. Jika token anonim hilang, progres tidak otomatis bisa dipindahkan ke
identitas baru.

Runtime Supabase menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`.
Service-role key hanya dibaca di Edge Function. Jangan memakai prefix `NEXT_PUBLIC_` atau
`EXPO_PUBLIC_` untuk secret admin. Publishable key yang diberikan tim dipakai hanya untuk koneksi
aplikasi/Auth.

Salin `.env.example` ke `.env`, isi konfigurasi museum setelah verifikasi PM, lalu:

```powershell
npx supabase secrets set --env-file .env
```

Fungsi masih dapat melayani QR tanpa konfigurasi GPS museum. Parameter museum yang kosong tidak
pernah otomatis mengizinkan akses GPS. Parameter yang lengkap tetapi salah membuat startup gagal
dengan pesan konfigurasi yang jelas.

`verify_jwt=false` pada config **bukan** API tanpa autentikasi: setiap endpoint data memvalidasi
bearer token lewat Auth `/user`, agar mendukung signing keys Supabase. Hanya `/health` dan preflight
CORS yang tidak membutuhkan token. Semua tabel dan RPC GEA ditolak untuk role
`anon`/`authenticated`; Edge memakai service role dan mengambil user ID dari Auth, bukan body.

## Kontrak API

Base URL cloud: `https://rjlihrvudakfhehbkncw.supabase.co/functions/v1/gea-api`. Sukses:
`{ "data": ... }`. Gagal: `{ "error": { "code": "...", "message": "..." }, "requestId": "..." }`.
Kirim `Authorization: Bearer <access_token>` dan `Content-Type: application/json` untuk POST.
Publishable key bukan pengganti access token pengunjung.

| Method | Path                                      | Input penting                                                                     |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/health`                                 | Tidak membutuhkan token; pemeriksaan proses, bukan seluruh layanan                |
| POST   | `/geofence/evaluate`                      | `location` berupa koordinat+akurasi, atau `null`                                  |
| GET    | `/pois`                                   | Daftar POI published, urut prioritas                                              |
| GET    | `/pois/{id}?language=id&profile=umum`     | Varian wajib eksplisit; tidak ada fallback terjemahan                             |
| POST   | `/sessions`                               | `idSesi`, `language`, `profile`, `location`; GPS wajib inside                     |
| POST   | `/sessions/qr`                            | `idSesi`, `language`, `profile`, `token` QR pintu masuk                           |
| POST   | `/sessions/{id}/verify-qr`                | `token` QR koleksi, `language`, `profile`; mengembalikan POI dan bukti verifikasi |
| POST   | `/sessions/{id}/quests/{questId}/answers` | `requestId` UUID dan `labelOpsi` A-D                                              |
| POST   | `/sessions/{id}/pois/{poiId}/close`       | Menyimpan kartu ditutup pada sesi ini                                             |
| GET    | `/sessions/{id}/progress`                 | Sesi, kartu, dan hasil quest milik pengunjung                                     |

Bahasa: `id`/`en`. Profil: `umum`/`pelajar`. Detail POI mengembalikan `cards` dengan jenis
`description` dan `audio`, ditambah satu `quest` dengan empat opsi. Kunci jawaban dan hint tidak
dikirim di detail; hint hanya dikirim setelah jawaban salah. Field domain mengikuti nama ERD
(`id_poi`, `id_zona`, dsb); objek request dan keputusan menggunakan camelCase seperti tabel di atas.

Contoh lokasi adalah **SIMULASI**, bukan koordinat museum:

```json
{ "location": { "latitude": 0, "longitude": 0, "accuracyMeters": 20 } }
```

Contoh keputusan tanpa konfigurasi museum:

```json
{
  "data": {
    "status": "not_configured",
    "accessAllowed": false,
    "distanceMeters": null,
    "accuracyMeters": 20,
    "fallback": "entrance_qr",
    "reasonCode": "MUSEUM_AREA_NOT_CONFIGURED"
  }
}
```

Contoh jawaban:

```json
{ "requestId": "60000000-0000-4000-8000-000000000001", "labelOpsi": "B" }
```

```json
{
  "data": {
    "idQuest": "40000000-0000-4000-8000-000000000001",
    "idPoi": "30000000-0000-4000-8000-000000000001",
    "answerCorrect": false,
    "attemptCount": 1,
    "completed": false,
    "hint": "Petunjuk sesuai konten museum."
  }
}
```

Gunakan UUID `idSesi` yang sama untuk mengulang pembuatan sesi. Setiap **percobaan baru** memakai
`requestId` baru; retry transport memakai request ID yang sama. Pemakaian ulang ID dengan payload
berbeda menghasilkan 409, sehingga retry tidak menggandakan jumlah percobaan. Jawaban benar
menyelesaikan quest; pengiriman baru setelah selesai menghasilkan 409. Penilaian dan pencatatan
percobaan berlangsung atomik dalam transaksi SQL yang mengunci sesi.

Contoh PowerShell/curl (gunakan `curl.exe`, bukan alias Invoke-WebRequest):

```powershell
$base = 'https://rjlihrvudakfhehbkncw.supabase.co/functions/v1/gea-api'
curl.exe "$base/health"
# $token adalah access token pengunjung, hasil signInAnonymously(), bukan publishable key.
curl.exe "$base/pois" -H "Authorization: Bearer $token"
curl.exe "$base/geofence/evaluate" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data-raw '{"location":null}'
```

Dalam aplikasi, buat/pulihkan identitas lewat `supabase.auth.signInAnonymously()` sebelum API.
Gunakan sesi Auth yang sama untuk melanjutkan sesi kunjungan. Jangan mengirim user ID, boolean
`isCorrect`, atau boolean `qrVerified` dari aplikasi sebagai bukti yang dipercaya server.

Setelah deploy dan mengaktifkan Auth anonim, jalankan pengujian cloud sungguhan:

```powershell
$env:GEA_PROJECT_URL = 'https://rjlihrvudakfhehbkncw.supabase.co'
$env:GEA_PUBLISHABLE_KEY = '<publishable key project>'
$env:DENO_TLS_CA_STORE = 'system'
npm run smoke
```

Smoke membuat satu identitas anonim pengujian, memeriksa health/API/geofence/validasi, dan
memastikan Data API menolak akses kunci. Tidak mengunggah POI, media, atau lokasi simulasi.

## A3: geofence dan gating landing

Representasi museum adalah lingkaran pusat+radius dalam meter, usulan teknis sesuai Haversine. PM
masih perlu mengesahkan batasnya berdasarkan survei/peta gedung. Konfigurasi melalui secret
`GEA_MUSEUM_LATITUDE`, `GEA_MUSEUM_LONGITUDE`, `GEA_MUSEUM_RADIUS_METERS`, dan `GEA_MUSEUM_ZONE_ID`
yang merujuk zona dalam DB. Koordinat memakai derajat geografis WGS84. Zona/checkpoint pada ERD
berbeda dari batas seluruh museum. Radius checkpoint 15 m dan ambang akurasi GPS 20 m tidak boleh
dijadikan radius museum secara otomatis.

| Kondisi                             | Status backend         | Perilaku aplikasi                                                 |
| ----------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| Akurasi 0..20 m, jarak <= radius    | `inside`               | Boleh membuat sesi GPS dan melewati landing                       |
| Akurasi 0..20 m, jarak > radius     | `outside`              | Tampilkan belum berada di museum                                  |
| Akurasi >20 m                       | `low_accuracy`         | Jangan simpulkan outside; tawarkan QR pintu masuk                 |
| GPS tidak tersedia, `location:null` | `location_unavailable` | Tawarkan QR pintu masuk                                           |
| Konfigurasi belum lengkap           | `not_configured`       | Tolak akses GPS; QR yang benar-benar valid tetap jalur independen |
| Koordinat/akurasi tidak valid       | HTTP 400               | Perbaiki payload; jangan ubah menjadi lokasi unavailable          |

Izin lokasi dan pembacaan GPS tetap dikerjakan Expo Location. Jika izin ditolak, aplikasi
menjelaskan alasannya, mengirim `location:null`, dan menawarkan QR jika kamera tersedia. Pemilihan
ruang manual dari brief belum dipakai sebagai bukti lokasi. PM perlu memutuskan jalur izin
lokasi+kamera ditolak; backend tidak menerbitkan akses terverifikasi berdasarkan pilihan manual
saja.

Endpoint evaluasi tidak menerbitkan izin sesi. Endpoint pembuatan sesi mengevaluasi ulang input,
sehingga boolean izin dari client tidak dipercaya. Koordinat client tetap dapat dipalsukan; ini
validasi geofence untuk prototipe, bukan sistem anti-spoofing GPS.

## A9: dataset 20 POI dan format QR

Scope saat ini adalah POI-01 sampai POI-20: 11 koleksi Left Wing dan 9 koleksi Right Wing. POI-21
dikeluarkan. Sumber data checkpoint adalah `data/checkpoints.json`; koordinat desimal WGS84 sudah
dikonfirmasi pemilik data. Nilai koordinat asal dan folder foto referensi disimpan untuk
penelusuran. Radius tiap POI adalah 15 m, terpisah dari batas museum dan radius zona. Koordinat
POI-10 adalah `-6.900649, 107.621063`; POI-11 adalah `-6.900694, 107.621056`.
Pemilik data mengonfirmasi seluruh POI sudah disurvei pada 10 November 2026. Status
tersebut disimpan sebagai `surveyCompleted: true`. Akurasi GPS dan nama surveyor yang belum dicatat
tetap `null` dan tidak menentukan status penyelesaian survei.

```powershell
cd backend
npm run checkpoints:check
```

Perintah ini memeriksa kode/UUID unik, relasi zona, rentang koordinat, dan radius. Hasilnya
menampilkan titik bersama dan status survei yang telah dikonfirmasi. A9 menyediakan data untuk
E10/C3 dan mapping ID untuk B6/C2; pemicu kartu GPS koleksi belum tersedia di API.

Master cloud disimpan di `public.poi`: `kode_poi`, `nama`, `nama_asli`, `id_zona`,
`latitude`, `longitude`, dan `radius` (meter). Migrasi `20261112000400_poi_checkpoint_fields.sql`
menambah kolom checkpoint; `20261112000500_checkpoint_master.sql` mengisi dua zona dan 20 POI.
Pengisian master memperbarui identitas/koordinat dengan UUID tetap, mempertahankan cerita, media,
denah, kuis, serta status publikasi. Koordinat GPS zona dan poligon museum tetap terpisah.
Untuk pembaruan master berikutnya, `npm run checkpoints:prepare -- output.sql` menghasilkan
SQL dari dataset yang sudah divalidasi, untuk diterapkan sebagai migrasi baru.

QR berisi token acak 32 byte dalam bentuk 64 karakter hex. Database hanya menyimpan hash SHA-256,
target entrance/POI, masa berlaku, dan pencabutan. Token tidak tersedia dari API daftar/detail. QR
koleksi menerbitkan verifikasi server untuk sesi+POI selama paling lama 15 menit (usulan untuk
dikonfirmasi PM), dibatasi juga expiry QR. QR statis masih dapat disalin; token ini bukan bukti
anti-replay kehadiran fisik.

```powershell
New-Item -ItemType Directory -Path .local -Force
npm run qr:create -- entrance LEFT_WING 2026-12-01T00:00:00Z .local/entrance
npm run qr:create -- poi POI-01 2026-12-01T00:00:00Z .local/poi-01
```

Target boleh berupa kode dataset atau UUID terdaftar. Contoh tanggal adalah masa berlaku QR, bukan
tanggal survei, dan harus diganti sesuai keputusan tim. Jalankan SQL hasil `qr:create` sebagai admin
setelah data target tersedia di database. Untuk mencabut token, isi `revoked_at`. Token tidak
dicetak ke log dan folder `.local` diabaikan Git.

```powershell
npm run qr:sheet
```

Perintah C3 ini membaca `.local/*.token.txt` dan menghasilkan PNG serta `lembar-qr.html` di
`.local/qr/` untuk dicetak. Nama file `POI-01.token.txt` dan `P01.token.txt` sama-sama dikenali.
Label dan nama koleksi diambil dari dataset A9 sehingga POI-21 ditolak.

Kontrak QR terintegrasi: `GEA1:POI:P01:<token64hex>` untuk koleksi, `GEA1:ENTRANCE:-:<token64hex>`
untuk pintu masuk, dan `GEA1:ZONE:ZL|ZR:<token64hex>` untuk label zona. Frontend mengenali label
secara offline dan tetap menerima token 64 hex polos. Hanya token dikirim ke backend; keabsahan
token dan `idPoi` ditentukan respons backend. Label zona saja tidak memberikan bukti verifikasi
quest.

## B6: seed konten 20 POI

Cerita final Indonesia/profil umum untuk POI-01, POI-02, dan POI-04–11 tersimpan di
`data/approved-stories.json`; demo frontend dan generator seed memakai sumber yang sama untuk
judul, cerita, fakta, dan koleksi sorotan. Nama checkpoint, media, dan soal tetap dari dataset/input
masing-masing. Teks lampiran dipertahankan apa adanya. Terapkan migrasi `20261112000100_story_metadata.sql`
sebelum memakai respons API dengan metadata tersebut. Untuk database yang sudah berisi varian
konten, `npm run stories:prepare -- .local/approved-stories-update.sql` menyiapkan SQL
pembaruan teks. Jalankan SQL itu setelah diperiksa; seluruh pembaruan dibatalkan jika ada varian
yang belum tersedia. Perintah ini hanya menghasilkan file, tidak mengubah cloud.

Database kosong dapat menerima 10 cerita terlebih dahulu sebagai draft. Migrasi
`20261112000200_partial_story_drafts.sql` mengizinkan data yang belum tersedia disimpan sebagai
`NULL`; migrasi `20261112000300_approved_story_drafts.sql` mengisi zona yang dipakai, identitas
10 POI, dan varian cerita `id/umum` dari sumber final. Jalankan `npm run db:push` untuk menerapkan
migrasi yang belum ada di cloud. Koordinat zona, foto, denah, prioritas, estimasi, audio, dan quest
yang belum tersedia tetap kosong. Cerita terlihat oleh admin di tabel `poi`/`konten`; API pengunjung
tetap hanya menampilkan POI dengan `is_published=true`. Publikasi memerlukan detail POI, media,
dan kuis lengkap. Pembaruan kolom POI atau audio yang membuat paket terpublikasi tidak lengkap
ditolak; kosongkan status publikasi dahulu jika perlu mengeditnya sebagai draft.

Untuk cerita final berikutnya, `npm run stories:drafts -- output.sql` menyiapkan SQL penambahan
draft dari dataset final. Perintah ini menambahkan identitas yang belum ada dan memperbarui teks
varian yang sama, tanpa mengganti media, detail POI, status publikasi, atau soal yang sudah ada.
Tambahan cerita dapat diterapkan lewat migrasi data baru; generator tidak mengubah database.

Isi `data/poi-template.json` bersama PM/PD2. Nama, UUID POI/quest dan relasi dua zona sudah diisi
untuk 20 POI. Enam UUID awal dipertahankan. Nilai `null` menandai konten, media, posisi denah,
estimasi durasi, serta pusat/radius zona yang belum tersedia. Koordinat POI di dataset A9 tidak
boleh dijadikan pusat/radius zona secara otomatis. Tabel `poi` menyimpan koordinat/radius checkpoint
terpisah dari posisi denah. Generator
menghasilkan seed awal satu varian bahasa/profil, bukan pengubah data yang sudah ada. Varian
tambahan ditambahkan lewat migrasi data sesuai PK komposit ERD.

```powershell
npm run seed:prepare -- data/poi-approved.json supabase/migrations/20261112000600_approved_pois.sql
```

Generator seed awal ini hanya untuk database kosong, sebelum draft dimasukkan. Sesudah draft ada,
lengkapi baris yang sama lewat pembaruan data, bukan mengulang seed awal. Generator mewajibkan
20 POI dan dua zona serta menolak `approved:false`, kolom kosong, deskripsi
lebih dari 100 kata, audio di luar 30-90 detik, atau opsi yang bukan empat label A-D dengan tepat
satu kunci. Media harus diunggah ke bucket `gea-media` dengan object path `images/...` dan
`audio/...`. Bucket ini **publik** hanya untuk foto/narasi museum yang disetujui, maksimal 10 MiB
per file; bukan untuk foto pengunjung. Admin mengunggah media; client tidak memiliki izin upload.
Sebelum menyebut B6 selesai, periksa seluruh URL media dan cocokkan durasi file sebenarnya, bukan
hanya metadata JSON.

## Handoff dan batas selesai

- C2: review skema, SQL/RLS, akses project, dan deployment; cocokkan nama/tipe ERD final.
- C3: lanjutkan frontend awal dengan dua kartu, audio player, jawaban pilgan, dan pemulihan sesi
  kunjungan.
- PD1: landing inside/outside/GPS lemah/izin ditolak/belum dikonfigurasi.
- PM: koordinat/radius museum, aturan manual, expiry QR, batas percobaan, varian konten wajib.
- PM/PD2: lengkapi foto, teks, audio, soal dan kunci untuk 20 koleksi pada template B6.

Percobaan salah saat ini boleh diulang tanpa batas; poin, lencana, quest foto, pergantian preferensi
sesi, dan GPS spesifik koleksi belum termasuk API sprint ini. Geofence museum bukan bukti
checkpoint. QR koleksi adalah jalur verifikasi quest yang tersedia; GPS koleksi memerlukan koordinat
koleksi yang diverifikasi, sedangkan ERD saat ini hanya punya posisi denah.

Pembacaan GPS dan gating landing awal tersedia di aplikasi Expo. E3 masih memerlukan uji mock
location/perangkat dan integrasi cloud yang berhasil. E7/E8 memerlukan frontend Stories lengkap. B3
belum selesai sebelum konten asli dan media terunggah serta URL diperiksa.
