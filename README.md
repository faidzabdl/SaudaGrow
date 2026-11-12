# SaudaGrow

Platform *discovery* UMKM kuliner berbasis video vertikal pendek. Pengguna menemukan makanan lewat feed, melihat informasinya, lalu **Pesan** (lewat GoFood / GrabFood / ShopeeFood / WhatsApp) atau **Lihat di Maps**. Aplikasi tidak memproses transaksi sendiri.

Dibuat untuk Logicodix 2026 Hackathon (subtema *Local MSME & Creative Economy*).

> Status: **MVP lengkap (Tingkat A, Smart Search AI, ranking feed, rating)**. Seluruh fitur memakai Supabase. Rincian cakupan, risiko, dan acceptance test ada di `planRevisi.md`; panduan video demo ada di `docs/naskah-demo.md`.

## Teknologi

Expo (React Native) · Expo Router · TypeScript · Supabase (Auth, Postgres, Storage)

## Menjalankan secara lokal

1. Pasang dependensi dasar (pakai `expo install` agar versinya cocok dengan SDK):

   ```bash
   npm install
   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-image-picker expo-location expo-video
   ```

2. Buat proyek di [Supabase](https://supabase.com), lalu salin `.env.example` menjadi `.env` dan isi:

   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

   Gunakan **hanya kunci publik** (publishable / anon). Jangan memasukkan secret / `service_role` key ke aplikasi atau repo.

3. Buka **SQL Editor** di Supabase, tempel isi `supabase/schema.sql`, lalu **Run**.

   Bila database Anda dibuat dari `schema.sql` versi lama (sebelum perlindungan `legal_id`), jalankan juga `supabase/b4_umkm_legal_privacy.sql` satu kali.

   (Opsional, untuk data contoh) Ubah `v_base` di `supabase/seed.sql`, unggah media sesuai daftar di bagian bawah file itu, lalu jalankan di SQL Editor. Jangan dipakai di database produksi.

4. Jalankan aplikasi:

   ```bash
   npx expo start
   ```

   Buka lewat Expo Go di HP Android (scan QR) atau tekan `a` untuk emulator.

5. (Opsional) Cek kesehatan proyek: `npm run typecheck`, `npx expo lint` (pertama kali akan memasang dan membuat konfigurasi ESLint), `npx expo-doctor`.

## Pengaturan Auth di Supabase (untuk pengembangan)

Authentication → Providers → Email: matikan **Confirm email** agar pendaftaran langsung bisa masuk (jika dibiarkan aktif, aplikasi menampilkan pesan untuk cek email). Login Google menyusul.

## Smart Search (AI, Gemini)

Kotak pencarian bisa memahami kalimat bebas, mis. "makanan pedas murah dekat sini". Tombol petir di kotak pencarian (atau tombol *search* di keyboard) mengirim kalimat itu ke Supabase Edge Function `smart-search`, yang meminta Gemini mengubahnya menjadi filter terstruktur (kategori, tag, harga maksimum, urutan, pakai lokasi). Aplikasi menerapkan filter itu pada pencarian biasa dan menampilkannya sebagai chip yang bisa dihapus satu per satu.

**Transparansi dan privasi**
- Yang dikirim ke AI: hanya teks pencarian dan daftar kategori/tag katalog. Tidak ada id pengguna, email, ataupun lokasi. Teks pencarian tidak disimpan dan tidak ditulis ke log.
- Lokasi perangkat hanya dipakai di perangkat untuk menghitung jarak. Izin diminta saat fitur jarak dipakai.
- UI memberi label "Dibantu AI" dan penjelasan singkat; hasil AI bisa keliru sehingga pengguna dapat mengubahnya lewat chip.
- Kunci API hanya ada sebagai secret server, tidak di aplikasi dan tidak di repo.
- Keluaran model divalidasi di server dan di aplikasi; nilai di luar daftar kategori/tag/rentang harga dibuang.

**Cadangan**: bila AI gagal, lambat (batas 8 detik di server, 10 detik di aplikasi), atau kuota habis, aplikasi otomatis memakai pencarian kata kunci biasa dan memberi tahu pengguna.

**Pemasangan (Supabase Dashboard)**
1. Buat API key di Google AI Studio.
2. Dashboard -> Edge Functions -> *Deploy a new function* -> *Via Editor*, nama `smart-search`, tempel isi `supabase/functions/smart-search/index.ts`, lalu Deploy.
3. Edge Functions -> Secrets: tambah `GEMINI_API_KEY` (wajib) dan `GEMINI_MODEL` (opsional, bawaan `gemini-3.5-flash-lite`; bila Google menjawab 404 untuk nama model, fungsi otomatis mencoba `gemini-3.1-flash-lite` lalu `gemini-2.5-flash-lite`).
4. Pengaturan fungsi: matikan *Verify JWT* (kunci `publishable` bukan JWT). Fungsi punya batas panjang masukan dan pembatas laju sendiri.
5. Uji tanpa aplikasi (PowerShell), ganti `<project-ref>`:
   `Invoke-RestMethod -Method Post -Uri "https://<project-ref>.supabase.co/functions/v1/smart-search" -ContentType "application/json" -Body '{"query":"ayam pedas murah dekat sini","categories":["Nasi & Lauk"],"tags":["pedas","ayam"]}'`
   Hasil yang benar: `ok: True` dan objek `filter`.

## Rating dan ulasan (B3)

Pada halaman produk, pengguna dapat memberi rating 1-5 dengan ulasan teks opsional (maks. 500 karakter), mengubah, atau menghapusnya.

- **Syarat**: hanya pengguna yang pernah menekan **Pesan** pada produk itu. Ini dipaksa oleh policy database (tidak hanya di aplikasi). Jujur dinyatakan: ini bukan bukti pembelian, karena aplikasi tidak memproses transaksi.
- Pemilik UMKM tidak dapat menilai produknya sendiri. Rating UMKM = agregat rating seluruh produknya (tidak ada rating toko langsung).
- Ulasan tampil **anonim**. Tabel `ratings` hanya terbaca pemiliknya dan admin; publik membaca lewat view `product_rating`, `umkm_rating`, dan `product_reviews` yang hanya memuat produk aktif milik UMKM yang sudah disetujui.
- **Moderasi**: admin dapat menghapus ulasan yang melanggar lewat SQL Editor: `delete from public.ratings where user_id = '<id>' and product_id = '<id>';`.
- Rating dipakai sebagai sinyal kualitas pada ranking feed (lihat di atas) dan tampil di kartu Cari, halaman produk, tab Tentang UMKM, dan dashboard UMKM.

**Pemasangan**: jalankan `supabase/b3_ratings.sql` di SQL Editor (aman diulang; isinya juga sudah ada di akhir `schema.sql`). Opsional untuk demo: jalankan `supabase/seed_ratings.sql` setelahnya (4 akun pembeli contoh dan 17 rating; produk 9 dan 12 sengaja tanpa rating).

**Uji**: (1) akun biasa membuka produk yang belum pernah ditekan Pesan: formulir menjelaskan syaratnya; (2) tekan Pesan, kembali ke aplikasi: formulir bintang muncul tanpa membuka ulang halaman; (3) kirim rating: rata-rata dan jumlah di halaman produk dan kartu Cari ikut berubah; (4) ubah lalu hapus rating; (5) akun pemilik UMKM tidak bisa menilai produknya sendiri.

## Komentar (B2): komentar produk dan komentar video

Satu produk bisa punya beberapa video, jadi ada dua percakapan yang sengaja dipisah:

| | Komentar **video** | Komentar **produk** |
|---|---|---|
| Untuk | tanggapan atas satu video | pertanyaan dan cerita seputar produknya |
| Dibuka dari | ikon komentar di Home (panel di bawah video) | tab **Komentar** di halaman produk |
| Hitungan | per video (angka di ikon komentar, dan di thumbnail video pada halaman produk) | per produk (angka di tab) |
| Data | `comments.video_id` terisi; view `video_comments`, `video_comment_count` | `comments.video_id` kosong; view `product_comments`, `product_comment_count` |

Aturan yang sama untuk keduanya: membaca terbuka untuk semua, menulis wajib login.

- Komentar teks 1-500 karakter, atas nama sendiri, tidak bisa diedit. Dihapus oleh penulisnya, **pemilik UMKM** atas produk itu (moderasi), atau admin. Komentar pemilik diberi label *Pemilik*, jadi UMKM bisa menjawab.
- Komentar video hanya diterima untuk video yang memang milik produk itu (dicek di policy database).
- Batas laju: maksimal 5 komentar per menit per pengguna (trigger database).
- Berbeda dengan ulasan rating yang anonim, komentar menampilkan **nama tampilan** penulis (diisi saat mendaftar). Aplikasi menunjukkan nama itu di atas kotak komentar sebelum dikirim. Id pengguna tidak ditampilkan; tabel `comments` hanya terbaca penulis, pemilik produk, dan admin, sedangkan publik membaca lewat view (hanya produk aktif milik UMKM approved).
- Aturan ditegakkan di database (RLS dan trigger), bukan hanya di aplikasi. Panel komentar video punya tautan ke komentar produk, dan sebaliknya tab produk menjelaskan bahwa komentar video ada di videonya.

**Pemasangan**: jalankan `supabase/b2_comments.sql` di SQL Editor (aman diulang, juga bila versi lama yang hanya komentar produk sudah pernah dijalankan; isinya juga sudah ada di akhir `schema.sql`). Tanpa itu aplikasi tetap berjalan, tetapi komentar tidak bisa dimuat dan jumlahnya tampil 0. Opsional untuk demo: jalankan `supabase/seed_comments.sql` setelah `seed.sql` dan `seed_ratings.sql` (8 komentar produk dan 8 komentar video, termasuk balasan pemilik UMKM). Menjalankan ulang kedua seed itu menghapus komentar contoh, jadi jalankan `seed_comments.sql` lagi sesudahnya.

**Uji**: (1) di Home ketuk ikon komentar: panel komentar **video** terbuka dan hanya berisi komentar video itu; (2) buka produk yang sama lewat video lain (bila punya dua video): komentar video tidak tercampur; (3) tab Komentar di halaman produk hanya berisi komentar produk; (4) tamu bisa membaca, kotak tulis diganti ajakan masuk; (5) akun biasa menulis komentar: muncul dengan label *Kamu* dan hitungan ikut bertambah setelah feed dimuat ulang; (6) lebih dari 5 komentar dalam semenit ditolak dengan pesan; (7) akun UMKM approved melihat tombol hapus pada komentar orang lain di produknya sendiri, akun UMKM lain tidak.

## Uji dashboard UMKM (Gelombang 3b)

1. Masuk dengan akun UMKM yang sudah disetujui → Profil → **Dashboard UMKM**.
2. **Produk**: tambah produk (nama, harga, kategori, foto, tag, link pemesanan), ubah, nonaktifkan, dan hapus. Perubahan langsung terlihat di Home dan Cari.
3. **Video**: pada kartu produk, "Tambah video" lalu pilih video MP4/MOV (maks. 60 detik dan 50 MB). Video muncul di Home.
4. **Statistik**: jumlah suka, simpan, dan klik Pesan (total dan per platform) berasal dari data nyata; coba tekan Pesan dari akun lain lalu tarik layar dashboard ke bawah.

## Uji feed dan interaksi (Gelombang 3a)

1. Jalankan `supabase/seed.sql` (ubah `v_base` dulu) agar ada data. Tanpa seed, Home menampilkan "Belum ada video".
2. Home menampilkan video dari UMKM berstatus approved. Video yang file-nya belum diunggah tetap menampilkan poster, tanpa crash.
3. Sebagai tamu: like, simpan, dan Pesan mengarahkan ke login, lalu kembali ke layar asal setelah masuk.
4. Sebagai user: like dan simpan tersimpan di database (tetap ada setelah aplikasi dibuka ulang); Tersimpan menampilkan produknya; tombol Pesan membuka link dan menambah baris di tabel `order_clicks`.

## Alur yang bisa diuji

1. Daftar akun baru di aplikasi (Profil → Masuk / Daftar). Sesi bertahan setelah aplikasi ditutup.
2. Profil → **Daftar sebagai UMKM**: isi formulir, unggah logo, ambil lokasi (atau isi koordinat manual). Status awal `pending`.
3. Jadikan akun lain admin (bagian di bawah), masuk dengan akun itu → Profil → **Panel Admin** → setujui. Perubahan status dilakukan oleh fungsi database `set_umkm_status`.
4. Kembali ke akun pendaftar: setelah Profil dibuka ulang, peran berubah menjadi UMKM dan menu **Dashboard UMKM** muncul. (Isi dashboard masih data contoh sampai tahap berikutnya.)

## Menjadikan akun admin

Setelah login sekali, buka Supabase → Authentication → Users, salin `id` akun Anda, lalu jalankan di SQL Editor:

```sql
update public.profiles set role = 'admin' where id = '<id-akun-anda>';
```

## Data yang dicatat

| Data | Isi | Siapa yang bisa membaca |
|---|---|---|
| Akun (`profiles`) | nama tampilan, peran | pemilik akun; admin |
| Daftar UMKM (`umkm`) | data yang diisi saat mendaftar (termasuk nomor legalitas opsional) | UMKM yang sudah disetujui dapat dibaca publik lewat API, **kecuali nomor legalitas** (NIB/PIRT): kolom `legal_id` hanya terbaca pemiliknya dan admin (hak SELECT kolom + fungsi `get_umkm_legal_ids()`). UMKM yang belum disetujui hanya terbaca pemilik dan admin |
| Like dan simpan (`likes`, `saves`) | pengguna, video/produk, waktu | pemilik akun; UMKM dan publik hanya melihat jumlah (view statistik) |
| Klik Pesan (`order_clicks`) | pengguna, produk, platform, waktu | pemilik akun, admin, dan pemilik UMKM atas produknya (aplikasi hanya menampilkan jumlah) |
| Komentar produk dan video (`comments`) | pengguna, produk, video (kosong bila komentar produk), isi komentar, waktu | publik lewat view `product_comments`: isi, waktu, dan **nama tampilan** penulis (id pengguna tidak ditampilkan); tabelnya hanya terbaca penulis, pemilik produk, dan admin |
| Rating dan ulasan (`ratings`) | bintang 1-5, ulasan teks opsional, waktu; satu per pengguna per produk | tabel hanya terbaca pemiliknya dan admin; publik hanya melihat rata-rata dan ulasan **anonim** ("Pembeli") lewat view |
| Pencarian AI | **tidak disimpan**; teks hanya diteruskan ke Gemini untuk ditafsirkan | tidak ada |
| Lokasi perangkat | **tidak dikirim ke server**; dipakai di perangkat untuk jarak dan urutan feed | tidak ada |

Semua tabel memakai Row Level Security; pengguna hanya dapat menulis data miliknya sendiri. Like dan simpan dapat dibatalkan pengguna. Penghapusan akun belum tersedia di aplikasi (admin dapat menghapus akun lewat dashboard Supabase). Data lain (komentar) ditambahkan di tahap berikutnya dan didokumentasikan di sini.

## Rekomendasi feed

Urutan feed dihitung di perangkat dengan skor sederhana yang bisa dijelaskan (`src/lib/feedRank.ts`):

- **popularitas** (suka + 2 x simpan + 3 x klik Pesan, skala log),
- **kesegaran** video (meluruh sekitar 10 hari),
- **jarak** (hanya bila izin lokasi sudah diberikan),
- **kualitas**: rating produk (rata-rata Bayesian dengan prior 3,5 bernilai 3 rating, sehingga satu rating bintang 5 tidak langsung mengalahkan produk yang punya banyak rating), hanya bila produk sudah punya rating,
- **kecocokan kategori** (hanya pengguna yang punya riwayat suka/simpan),
- **penalti sudah ditonton**: video yang sudah tampil di sesi ini dikalikan 0,35 (diturunkan, tidak disembunyikan; riwayat tontonan hanya di memori selama aplikasi terbuka).

Sinyal yang tidak tersedia dibuang dan bobot sisanya dinormalkan ulang. Urutan akhir memakai **acak berbobot** (*weighted random sampling*): video berskor tinggi cenderung di depan, tetapi urutannya berbeda setiap refresh. Setelah itu feed didiversifikasi agar tidak menampilkan UMKM yang sama berturut-turut.

Urutan hanya dihitung ulang saat aplikasi dibuka atau saat refresh (seed acak baru), bukan setiap kali pengguna menyukai sesuatu atau saat riwayat selesai dimuat, agar feed tidak berubah saat sedang digulir. Tidak ada penelusuran perilaku di luar tabel di atas.

**Dua halaman FYP**: tab **Untuk Anda** memakai ranking di atas (diacak berbobot setiap refresh). Tab **Terdekat** mengurutkan dengan **jarak sebagai bobot dominan (50%)** lalu ranking (popularitas, kesegaran, rating, kecocokan) sebagai pembeda antar UMKM yang berdekatan, tanpa pengacakan sehingga yang terdekat benar-benar di depan. Izin lokasi baru diminta saat tab Terdekat dibuka; bila ditolak, halaman menjelaskan alasannya dan tombol untuk mencoba lagi. Lokasi tidak dikirim ke server; jarak ditampilkan pada setiap video bila lokasi diketahui.

**Kontrol feed**: ketuk video untuk jeda/putar; bilah tipis di bawah video bisa diketuk atau digeser untuk maju/mundur; ketuk tab Home yang sudah aktif, ketuk logo SaudaGrow, atau tarik layar dari video pertama untuk refresh (konten diacak ulang); ketuk akun UMKM untuk membuka halaman produk di tab "Tentang UMKM". Video tegak (sekitar 9:16) memenuhi layar, video persegi/landscape tampil utuh dengan ruang hitam. Di halaman produk, ketuk thumbnail pada "Video Produk" untuk memutarnya layar penuh (geser untuk video berikutnya, kontrol sama dengan di feed).

## Green IT

- Batas video 60 detik dan 50 MB; foto dikompres saat dipilih (kualitas 0,5-0,6).
- Feed hanya memasang satu pemutar video (slide yang sedang terlihat); daftar divirtualisasi, dan pemuatan dibatasi 50 video.
- Lokasi hanya dibaca saat diperlukan (lokasi terakhir yang diketahui, tanpa menyalakan GPS di latar belakang); pencarian AI hanya dipanggil atas permintaan pengguna.

## Sumber aset dan lisensi

- Kode aplikasi: lisensi MIT (`LICENSE`).
- Foto, logo, dan video contoh di `supabase/seed.sql` adalah **karya sendiri** yang dibuat dengan skrip (gradien dan bentuk sederhana, ditandai "GAMBAR CONTOH"), tanpa foto atau musik dari pihak lain. Ikon: Feather (`@expo/vector-icons`, lisensi MIT). Pustaka pihak ketiga memakai lisensi masing-masing (Expo, React Native, Supabase).
- Konten nyata yang diunggah UMKM menjadi tanggung jawab pengunggahnya.

## Build APK (EAS)

`.env` tidak ikut diunggah ke EAS (di-gitignore), jadi variabel publik harus dibuat di EAS. Kunci `publishable` memang dirancang untuk tertanam di aplikasi, jadi aman sebagai `plaintext`; **jangan pernah** memasukkan `secret`/`service_role`.

```bash
npx eas login
npx eas init
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://<project-ref>.supabase.co --visibility plaintext
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <kunci-publishable> --visibility plaintext
npx eas build --platform android --profile preview
```

Profil `preview` menghasilkan APK yang bisa diunduh dari tautan di dashboard Expo.

## Struktur singkat

```
app/            layar (Expo Router)
context/        AppContext: katalog, like, simpan (membaca Supabase)
src/config.ts   nama aplikasi dan konstanta bersama
src/lib/        klien Supabase, dialog, jarak (geo), filter pencarian, ranking feed
src/services/   akses data (auth, katalog, interaksi, kelola produk, storage, lokasi, smart search)
src/context/    AuthContext (sesi dan peran)
src/components/ RequireRole, RemoteImage, ProductForm, FeedVideo, RatingSection, CommentSection, ProductVideoModal
src/types.ts    tipe bersama
supabase/       schema.sql (skema + RLS), b3_ratings.sql, b2_comments.sql, b4_umkm_legal_privacy.sql, seed.sql, seed_ratings.sql, seed_comments.sql, functions/smart-search (Edge Function AI)
eas.json        profil build (preview = APK)
planRevisi.md   rencana, cakupan fitur, jadwal
```

## Menjalankan untuk penilai

Backend memakai Supabase cloud, jadi aplikasi butuh internet. Tiga jalur, dari yang paling mudah:

1. **APK Android** (disarankan): pasang APK rilis yang disertakan tim di HP atau emulator Android. Tidak perlu Metro, Node, ataupun `.env`.
2. **Expo Go versi SDK 57**: proyek memakai Expo SDK 57. Expo Go terbaru dari Play Store (SDK 58) **tidak bisa** membukanya; pasang Expo Go SDK 57 dari expo.dev/go. Lalu `npm install`, salin `.env.example` menjadi `.env` dan isi, kemudian `npx expo start -c` dan pindai QR.
3. **Web** (untuk melihat tata letak saja): `npx expo start --web`. Upload video, GPS, dan gestur geser bisa berbeda dari Android.

Akun uji (pengguna, UMKM, admin) disampaikan terpisah dari repositori ini; admin dibuat dengan SQL pada bagian "Menjadikan akun admin".

## Pengujian

- `npm run typecheck`, `npx expo lint`, dan `npx expo-doctor` harus bersih.
- `npm run test:logic`: 14 uji logika murni (ranking feed, filter pencarian, jarak) dengan test runner Node (butuh Node 22.6+). Skrip `scripts/test-logic.mjs` menyiapkan salinan sementara karena impor proyek tanpa ekstensi. Bila belum ada skrip di `package.json`: `npm pkg set scripts.test:logic="node scripts/test-logic.mjs"`.
- Uji manual (acceptance test) mengikuti bagian "Alur yang bisa diuji" dan `planRevisi.md`. Aturan RLS diuji di SQL Editor (contoh ada di bagian rating).

## Batasan yang diketahui

- Login hanya email dan kata sandi (tanpa Google). Pengaturan "Confirm email" dimatikan untuk pengembangan; untuk produksi sebaiknya diaktifkan.
- Rating dibatasi pada pengguna yang pernah menekan **Pesan**; itu bukan bukti pembelian karena aplikasi tidak memproses transaksi.
- Penghapusan akun belum tersedia di aplikasi. Share dan follow belum ada (komentar produk dan video sudah, lihat bagian Komentar).
- Smart Search butuh internet dan kuota Gemini. Endpoint dapat dipanggil tamu (dibatasi panjang teks dan 12 permintaan per menit per IP). Bila gagal, aplikasi memakai pencarian kata kunci.
- Feed memuat maksimal 50 video per pemuatan (tanpa pagination bertahap karena ranking dihitung atas seluruh kandidat). Daftar divirtualisasi dan hanya satu pemutar aktif.
- Video yang diunggah tidak dibuatkan thumbnail otomatis; poster memakai foto produk.
- Logika murni diuji otomatis; layar dan integrasi Supabase diuji manual.

## Lisensi

MIT. Lihat `LICENSE`.
