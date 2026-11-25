# GEA — Jelajah Museum Geologi

Aplikasi kunjungan museum dengan peta koleksi, cerita, audio, QR/GPS, kuis, dan
quest foto. Frontend menggunakan Expo/React Native dan TypeScript; backend
menggunakan Supabase dan Deno. Model foto Android dibundel terpisah ke APK.

Panduan ini untuk menyiapkan proyek di laptop baru. Contoh perintah memakai
**PowerShell di Windows**. Nama folder dan lokasi instalasi boleh berbeda di
setiap laptop; tidak perlu mengikuti path milik pembuat proyek.

## 1. Download proyek

Dengan Git:

```powershell
git clone https://github.com/tyawaa/Transformasi-Digital_GEA.git
cd Transformasi-Digital_GEA
```

Atau buka [repository GEA](https://github.com/tyawaa/Transformasi-Digital_GEA),
pilih **Code → Download ZIP**, ekstrak, lalu buka terminal di folder hasil
ekstrak yang berisi `frontend` dan `backend`. Akses repository diperlukan jika
repository bersifat privat. ZIP tidak menyertakan riwayat Git dan tidak bisa
diperbarui dengan `git pull`.

Download seluruh proyek: frontend juga membaca dataset dari `backend/data`.
Jangan hanya menyalin folder `frontend`.

## 2. Siapkan alat dan pilih cara menjalankan

Pasang [Node.js](https://nodejs.org/en/download) beserta npm. Untuk seri Node 22,
gunakan **22.13.0 atau lebih baru** sesuai persyaratan React Native yang terkunci
di proyek. Periksa instalasi:

```powershell
node --version
npm --version
```

| Kebutuhan | Tambahan yang diperlukan |
| --- | --- |
| Mencoba tampilan di browser | Browser; Python 3 jika memakai `npm run demo` atau skrip server statis |
| Menjalankan di HP lewat Expo Go | Expo Go yang cocok dengan Expo SDK 57 proyek ini; HP dan laptop dapat saling terhubung |
| Memakai backend cloud tim | URL project dan publishable key dari tim; internet |
| Menjalankan backend di laptop sendiri | Docker Desktop yang sudah berjalan; dependency backend |
| Membuat APK dengan model foto | Windows, PowerShell 7 (`pwsh`), Python 3.11–3.13, JDK 17, Android SDK dan alat build native |

`npm ci` dijalankan di folder aplikasi yang digunakan, bukan hanya di root.
Folder root bukan npm workspace dan tidak memasang dependency frontend/backend
secara otomatis. Versi dependency mengikuti masing-masing `package-lock.json`.

## 3. Konfigurasi frontend

Dari root repository:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
```

Langkah salin cukup sekali saat setup awal. Buka `frontend/.env` di editor dan
ganti placeholder URL serta key dengan konfigurasi project dari tim:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ISI_PUBLISHABLE_KEY_DARI_TIM
EXPO_PUBLIC_STORIES_SOURCE=mock
EXPO_PUBLIC_MAP_WINGS=both
```

URL dan key harus berasal dari **project yang sama**. Gunakan publishable key
frontend, bukan `service_role`, secret key, password database, atau access token
CLI. Semua nilai `EXPO_PUBLIC_*` ikut masuk ke bundle aplikasi.

| Variabel | Nilai dan kegunaan |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Base URL project, tanpa `/functions/v1/gea-api`; URL API dibentuk oleh aplikasi |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Key publik untuk client Supabase |
| `EXPO_PUBLIC_STORIES_SOURCE` | `mock` memakai cerita/quest simulasi; kosongkan untuk backend API |
| `EXPO_PUBLIC_MAP_WINGS` | `both` untuk dua sayap; `left` untuk sayap kiri |
| `EXPO_PUBLIC_ONBOARDING` | Opsional: `always` mengulang onboarding dan preferensi setiap aplikasi dibuka |

**Mode mock tetap membutuhkan URL dan key terisi** karena konfigurasi Supabase
divalidasi saat aplikasi dimuat. Mock memakai alur simulasi, tetapi media yang
mengarah ke Supabase Storage masih membutuhkan jaringan dan project yang sesuai.
Mock bukan pengujian backend atau AI foto.

Setelah mengganti `.env`, hentikan server dengan `Ctrl+C`, lalu jalankan ulang:

```powershell
npm start -- --clear
```

Build web statis dan APK harus dibuat ulang agar perubahan `.env` ikut masuk.

## 4. Jalankan aplikasi

Semua perintah pada bagian ini dijalankan dari `frontend`.

### Browser untuk pengembangan

```powershell
npm run web
```

Buka URL yang dicetak terminal. Gunakan mode `mock` untuk mencoba alur dari luar
museum. Browser tidak menjalankan model foto Android; gunakan tombol mode uji
yang tersedia untuk simulasi QR/GPS.

### Demo browser dalam bingkai HP (Windows)

Pastikan `python --version` tersedia, lalu:

```powershell
npm run demo
```

Buka [demo lokal](http://localhost:8081/demo.html). Perintah ini membuat build
mock di `frontend/dist/demo`, lalu menjalankan server Python. Build demo selalu
memakai `mock`, termasuk jika `.env` disetel ke API. Server hanya berjalan selama
terminal terbuka; hentikan dengan `Ctrl+C`. Jalankan ulang setelah kode berubah.

### HP lewat Expo Go

```powershell
npm start
```

Sambungkan HP dan laptop ke Wi-Fi yang sama, lalu scan QR dari terminal melalui
Expo Go/kamera sesuai perangkat. QR ini membuka aplikasi; QR koleksi museum
dipindai dari dalam aplikasi. Berikan izin kamera dan lokasi saat menguji QR/GPS.

Jika jaringan LAN tidak dapat diakses, tersedia:

```powershell
npm run start:tunnel
```

Tunnel memerlukan internet di kedua perangkat. Tunnel Expo hanya menyediakan
akses ke server aplikasi; backend yang masih memakai alamat lokal laptop tetap
harus dapat dijangkau HP. Penilaian foto di perangkat memerlukan APK GEA dan
tidak tersedia di Expo Go.

## 5. Mode API: backend cloud atau backend lokal

### Frontend lokal + backend cloud tim

Pakai URL dan publishable key project tim, lalu kosongkan variabel berikut di
`frontend/.env`:

```dotenv
EXPO_PUBLIC_STORIES_SOURCE=
```

Restart server atau buat ulang build. Docker dan server backend di laptop tidak
diperlukan untuk jalur ini. Backend cloud harus sudah memiliki fungsi `gea-api`,
Auth anonim aktif, konten yang dipublikasikan, serta konfigurasi lokasi/QR yang
sesuai. Mode API memeriksa lokasi sebenarnya; berada di luar museum dapat
menyebabkan akses ditolak sesuai aturan aplikasi.

### Frontend lokal + backend lokal

Jalur ini untuk mengembangkan backend dengan database sendiri. Dari root repo,
nyalakan Docker Desktop, lalu:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run start
```

Gunakan URL API dan key publik/anon lokal yang ditampilkan CLI untuk
`frontend/.env`, lalu kosongkan `EXPO_PUBLIC_STORIES_SOURCE`. Nama variabel
frontend tetap `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, termasuk jika CLI lokal
menampilkan key dengan label `anon`.

Isi `backend/.env` sesuai lingkungan uji. Nilai geofence museum yang kosong
menolak akses GPS; isi berdasarkan konfigurasi museum yang sudah diverifikasi.
Setelah stack siap, jalankan fungsi dan biarkan terminalnya terbuka:

```powershell
npm run serve
```

Jalankan frontend dari terminal lain. Alamat standar dalam konfigurasi repo:

| Layanan | Alamat dari laptop |
| --- | --- |
| Supabase API | `http://127.0.0.1:54321` |
| Supabase Studio | `http://127.0.0.1:54323` |
| Health fungsi | `http://127.0.0.1:54321/functions/v1/gea-api/health` |

Migrasi diterapkan pada stack lokal baru. Seed otomatis dinonaktifkan dan data,
media Storage, pengguna, serta token QR cloud **tidak disalin** ke laptop.
Siapkan konten dan QR lokal sesuai [panduan backend](backend/README.md).

Untuk browser, `GEA_ALLOWED_ORIGINS` di `backend/.env` harus cocok dengan origin
frontend; contoh bawaan `http://localhost:8081`. Jika origin/port berubah,
sesuaikan konfigurasi lalu restart fungsi. Panduan runtime lokal tersedia di
[dokumentasi Supabase](https://supabase.com/docs/guides/local-development/cli/getting-started).

### Alamat localhost berbeda di setiap perangkat

`localhost` dan `127.0.0.1` menunjuk perangkat yang membuka aplikasi. Dari HP,
alamat tersebut menunjuk HP, bukan laptop. Untuk backend lokal yang diakses HP,
gunakan IP LAN laptop, misalnya `http://192.168.1.10:54321`, dan pastikan port
tersebut dapat diakses melalui jaringan/firewall. IP ini contoh, bukan nilai
yang harus disalin. Di Windows, lihat alamat IPv4 adaptor Wi-Fi dengan `ipconfig`.

Untuk layanan model Python yang diakses **dari container Supabase** di Windows,
gunakan `http://host.docker.internal:7860`, sesuai contoh backend. Alamat ini
berbeda dari URL yang dipakai frontend di HP.

## 6. File lokal yang tidak ikut download

| File/folder | Cara menyiapkan di laptop baru |
| --- | --- |
| `frontend/.env`, `backend/.env` | Salin `.env.example` masing-masing lalu isi konfigurasi sendiri |
| `node_modules` | Jalankan `npm ci` pada frontend/backend yang dibutuhkan |
| `backend/.local` | Buat ulang environment Python, cache model, artefak, dan konfigurasi alat yang diperlukan |
| `frontend/assets/poi`, `frontend/src/data/poiPhotos.local.ts` | Buat dengan skrip sinkronisasi foto di bawah jika membutuhkan foto lokal |
| Aset ONNX di `frontend/modules/gea-photo-model/android/src/main/assets/gea_photo` | Ekspor dengan `npm run photo:mobile` setelah model dibangun |
| `frontend/android`, `frontend/ios`, `.cxx` | Hasil pembuatan/build native; jangan mengandalkan folder dari laptop lain |
| `frontend/dist` termasuk APK | Buat ulang build atau minta artefak APK dari tim |
| Login CLI, Android SDK, JDK, dan sertifikat lokal | Pasang/konfigurasi di laptop sendiri; path dan kredensial tidak ikut Git |

Foto referensi di `backend/assets` sudah dilacak Git. Untuk membuat salinan foto
lokal frontend dari sumber tersebut, jalankan dari `frontend` di Windows:

```powershell
.\scripts\sync-poi-photos.ps1 -Source "..\backend\assets"
```

Jika memakai folder survei terpisah, ganti `-Source` dengan path folder yang
berisi subfolder `P01`, `P02`, dan seterusnya. Sumber bawaan skrip adalah folder
`POI` di sebelah root repo; folder itu tidak otomatis ada pada laptop baru.

## 7. Membuat APK Android dengan model foto (opsional)

Bagian ini diperlukan untuk penilaian foto di perangkat. Pastikan dependency
frontend dan backend sudah terpasang. Pasang PowerShell 7, JDK 17, dan Android
SDK beserta platform/build tools serta NDK/CMake yang diminta build Gradle.
`JAVA_HOME` harus menunjuk instalasi JDK yang benar di laptop sendiri.

Dari `backend`, buat environment Python dengan versi 3.11–3.13:

```powershell
python --version
python -m venv .local/photohunt-venv
.\.local\photohunt-venv\Scripts\python.exe -m pip install -e 'photo-model[dev,mobile]'
npm run photo:build
npm run photo:mobile
```

Unduhan dependency/bobot pertama membutuhkan internet dan ruang disk untuk
model serta cache. `photo:build` harus selesai sebelum `photo:mobile`; keduanya
membuat artefak yang tidak disimpan di Git.

Kemudian dari `frontend`:

```powershell
npm run apk -- -AndroidSdkPath "$env:LOCALAPPDATA/Android/Sdk" -Architectures arm64-v8a
```

Ganti path SDK jika Android Studio memakai lokasi lain. Hasilnya berada di
`frontend/dist/apk/GEA-photo-offline.apk`. Salin ke HP Android dan izinkan instalasi
dari sumber yang digunakan untuk membuka APK. Ini APK uji dengan kunci
development lokal. Jika pembaruan ditolak karena tanda tangan berbeda, gunakan
APK dengan kunci yang sama; uninstall menghapus progres lokal.

`arm64-v8a` untuk perangkat ARM64; gunakan `x86_64` untuk emulator x86_64 atau
`'arm64-v8a,x86_64'` untuk keduanya. Model foto berjalan di perangkat, sedangkan
sesi, cerita, dan sinkronisasi kuis mode API tetap membutuhkan backend/internet.
Mengubah model atau konfigurasi frontend memerlukan build APK ulang.

## 8. Perbedaan Windows, macOS, dan Linux

Perintah Git, `npm ci`, `npm start`, `npm run web`, serta pemeriksaan TypeScript
dapat dipakai lintas sistem. Di macOS/Linux, salin konfigurasi dengan
`cp .env.example .env` dari folder terkait.

Skrip demo dan APK saat ini memakai PowerShell/perintah Windows. Untuk demo di
macOS/Linux, dari `frontend` jalankan:

```bash
npm run export:demo
python3 -m http.server 8081 --bind 127.0.0.1 --directory dist/demo
```

Skrip npm model Python menggunakan path `Scripts/python.exe`; path environment
macOS/Linux adalah `bin/python`. Build APK otomatis di repo ini ditujukan untuk
Windows. `npm run ios` memerlukan simulator iOS di macOS; APK hanya untuk Android.

## 9. Pemeriksaan dan kendala umum

Dari `frontend`:

```powershell
npm run typecheck
npm test
npm run doctor
```

Dari `backend` setelah `npm ci`:

```powershell
npm run check
npm run lint
npm test
```

| Kendala | Yang diperiksa |
| --- | --- |
| Error konfigurasi saat aplikasi dibuka | Pastikan file bernama `.env`, bukan `.env.txt`, berada di `frontend`, dan URL/key sudah diisi; restart dengan cache bersih |
| Tampilan/data berbeda dari laptop lain | Cocokkan versi kode, `.env`, mode mock/API, sayap peta, foto lokal, dan progres tersimpan; build statis/APK perlu dibuat ulang |
| Masih tampil mode uji setelah beralih API | `npm run demo` selalu mock; gunakan `npm start`/`npm run web` dengan variabel sumber kosong |
| HP tidak bisa membuka aplikasi/API | Periksa Wi-Fi, IP LAN, firewall, serta perbedaan alamat server Expo dan backend |
| Expo Go menolak SDK | Cocokkan Expo Go dengan SDK 57 proyek; tunnel tidak mengubah versi SDK |
| `python` atau `pwsh` tidak ditemukan | Pasang alat sesuai jalur yang dipakai dan buka ulang terminal; skrip `npm run demo` memanggil `python` |
| Port 8081 dipakai | Hentikan server lama melalui terminalnya; untuk Expo pilih port lain dengan `npm start -- --port 8082` dan sesuaikan CORS backend jika memakai web/API |
| Error CORS | Cocokkan origin browser dengan `GEA_ALLOWED_ORIGINS`; `localhost` dan `127.0.0.1` adalah origin berbeda |
| Quest foto menyebut APK diperlukan | Instal APK GEA yang menyertakan model; model native tidak dimuat di Expo Go/web |
| Aset model belum lengkap saat build APK | Jalankan `photo:build` lalu `photo:mobile` di backend sebelum build APK |
| Error path native terlalu panjang di Windows | Gunakan lokasi checkout pendek, misalnya `C:\dev\gea`, lalu build ulang |
| Error sertifikat/TLS | Periksa proxy dan CA tepercaya pada laptop/jaringan sendiri; konfigurasi CA mesin lama tidak ikut repo |

Detail alur aplikasi ada di [README frontend](frontend/README.md); kontrak API,
pengelolaan konten/QR, deployment, serta layanan foto Python ada di
[README backend](backend/README.md).
