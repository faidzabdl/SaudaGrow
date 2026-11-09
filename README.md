# Saudagrow

Platform *discovery* UMKM kuliner berbasis video vertikal pendek. Pengguna menemukan makanan lewat feed, melihat informasinya, lalu **Pesan** (lewat GoFood / GrabFood / ShopeeFood / WhatsApp) atau **Lihat di Maps**. Aplikasi tidak memproses transaksi sendiri.

Dibuat untuk Logicodix 2026 Hackathon (subtema *Local MSME & Creative Economy*).

> Status: **Tahap 3b**. Auth, daftar UMKM, verifikasi admin, feed video, like/simpan/Pesan, dan dashboard UMKM (produk, link pemesanan, upload video, statistik) sudah memakai Supabase. Sisa pekerjaan (Smart Search, fitur Tingkat B, pembersihan) ada di `planRevisi.md`.

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
| Daftar UMKM (`umkm`) | data yang diisi saat mendaftar (termasuk nomor legalitas opsional) | UMKM yang sudah disetujui dapat dibaca publik lewat API, termasuk nomor legalitas bila diisi (identitas usaha, mis. NIB); aplikasi tidak menampilkannya ke publik. UMKM yang belum disetujui hanya terbaca pemilik dan admin |
| Like dan simpan (`likes`, `saves`) | pengguna, video/produk, waktu | pemilik akun; UMKM dan publik hanya melihat jumlah (view statistik) |
| Klik Pesan (`order_clicks`) | pengguna, produk, platform, waktu | pemilik akun, admin, dan pemilik UMKM atas produknya (aplikasi hanya menampilkan jumlah) |
| Pencarian AI | **tidak disimpan**; teks hanya diteruskan ke Gemini untuk ditafsirkan | tidak ada |
| Lokasi perangkat | **tidak dikirim ke server**; dipakai di perangkat untuk jarak dan urutan feed | tidak ada |

Semua tabel memakai Row Level Security; pengguna hanya dapat menulis data miliknya sendiri. Like dan simpan dapat dibatalkan pengguna. Penghapusan akun belum tersedia di aplikasi (admin dapat menghapus akun lewat dashboard Supabase). Data lain (komentar, rating) ditambahkan di tahap berikutnya dan didokumentasikan di sini.

## Rekomendasi feed

Urutan feed dihitung di perangkat dengan skor sederhana yang bisa dijelaskan (`src/lib/feedRank.ts`): popularitas (suka + 2 x simpan + 3 x klik Pesan, skala log), kesegaran video (meluruh sekitar 10 hari), jarak (hanya bila izin lokasi sudah diberikan), dan, untuk pengguna yang punya riwayat, kecocokan kategori dengan yang pernah disukai atau disimpan. Sinyal yang tidak tersedia dibuang dan bobot sisanya dinormalkan ulang. Setelah itu feed didiversifikasi agar tidak menampilkan UMKM yang sama berturut-turut. Urutan hanya dihitung saat data dimuat, bukan setiap kali pengguna menyukai sesuatu, agar feed tidak berubah saat sedang digulir. Tidak ada penelusuran perilaku di luar tabel di atas.

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
src/components/ RequireRole, RemoteImage, ProductForm
src/types.ts    tipe bersama
supabase/       schema.sql (skema + RLS), seed.sql (data contoh), functions/smart-search (Edge Function AI)
eas.json        profil build (preview = APK)
planRevisi.md   rencana, cakupan fitur, jadwal
```

## Lisensi

MIT. Lihat `LICENSE`.
