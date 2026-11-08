# Saudagrow

Platform *discovery* UMKM kuliner berbasis video vertikal pendek. Pengguna menemukan makanan lewat feed, melihat informasinya, lalu **Pesan** (lewat GoFood / GrabFood / ShopeeFood / WhatsApp) atau **Lihat di Maps**. Aplikasi tidak memproses transaksi sendiri.

Dibuat untuk Logicodix 2026 Hackathon (subtema *Local MSME & Creative Economy*).

> Status: **Tahap 0** (persiapan dasar). Tampilan masih memakai data contoh (`data/mockData.ts`). Penyambungan ke Supabase dikerjakan bertahap, lihat `planRevisi.md`.

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

Klik **Pesan** (pengguna → produk → platform → waktu), like, dan simpan. Data lain (komentar, rating, follow, share, watch time) akan ditambahkan di tahap berikutnya dan didokumentasikan di sini. Semua tabel memakai Row Level Security; pengguna hanya dapat menulis data miliknya sendiri.

## Struktur singkat

```
app/            layar (Expo Router)
context/        state sementara (akan digantikan Supabase)
data/           data contoh
src/config.ts   nama aplikasi dan konstanta bersama
src/lib/        klien Supabase
src/types.ts    tipe bersama
supabase/       schema.sql (skema + RLS), seed.sql (data contoh)
eas.json        profil build (preview = APK)
planRevisi.md   rencana, cakupan fitur, jadwal
```

## Lisensi

MIT. Lihat `LICENSE`.
