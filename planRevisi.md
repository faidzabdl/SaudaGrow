# planRevisi.md — Rencana Pengerjaan MVP (Hackathon LOGICODIX 2026)

> Dokumen serah-terima untuk seluruh anggota tim dan AI coding agent.
> Dibuat: Sabtu, 7 November 2026. Baca bagian 1–4 dulu sebelum menyentuh kode.

---

## 1. Konteks singkat

- **Lomba:** LOGICODIX 2026 Hackathon. *LOGICODIX adalah nama lomba, BUKAN nama aplikasi kita.*
- **Subtema:** Local MSME & Creative Economy.
- **Produk:** platform discovery UMKM F&B berbasis video vertikal pendek. Alur user: scroll → temukan makanan → lihat info → Pesan (lewat GoFood/GrabFood/ShopeeFood/WhatsApp) atau lihat di Maps. Aplikasi **tidak** memproses transaksi sendiri.
- **Masalah:** UMKM kecil sulit mendapat exposure karena bersaing dengan brand besar; user bingung mau makan apa dan harus mencari lewat banyak platform.
- **Pembeda:** GoFood/GrabFood hanya untuk memesan. Kita untuk *menemukan dan melihat dulu* makanannya. TikTok/Instagram penuh distraksi, kita khusus kuliner UMKM.
- **Tim:** 2 orang, platform Android (dipilih saat pendaftaran), React Native (Expo).
- **Nama produk:** belum ditetapkan. Pakai satu konstanta `APP_NAME` (lihat bagian 6) agar mudah diganti nanti.

## 2. Tenggat dan aturan lomba (dari guidebook)

| Tanggal | Kegiatan |
|---|---|
| Sab 7 Nov | Mentoring dan technical meeting; mulai pengerjaan |
| **Sab 14 Nov** | **Last submission** (kode GitHub + video demo) |
| Sab 21 Nov | Pengumuman 8 finalis |
| Min 22 Nov | Technical meeting finalis |
| Min 29 Nov | Final luring dan seminar |

Aturan yang memengaruhi pengerjaan:

1. Kode dikumpulkan lewat **repository GitHub**. **Dilarang mengubah kode setelah batas submission.** Yang dinilai adalah versi terakhir sebelum batas.
2. **Video demo 3–5 menit**, produk berfungsi, **tanpa suara narasi**, harus menampilkan **fitur integrasi AI**.
3. Final: presentasi dan **live demo via localhost di laptop**. 15 menit total: 1 persiapan, **7 presentasi + demo**, 3 Q&A, 4 penilaian.
4. Karya harus orisinal. Tim bertanggung jawab atas **kode, data, dan aset** (gambar, video, ikon, lisensi).
5. Wajib memperhatikan etika AI, perlindungan data, dan efisiensi sumber daya.

Bobot penilaian: Problem-Solution Fit 25%, Inovasi dan Teknologi (AI nilai tambah) 25%, Rekayasa Perangkat Lunak (fungsionalitas MVP, kualitas kode, arsitektur, **dokumentasi**) 25%, UI/UX 15%, Green IT dan Etika 10%.

## 3. Keputusan yang sudah diambil tim

| # | Keputusan |
|---|---|
| 1 | Backend: **Supabase** (Auth, Postgres, Storage). |
| 2 | Fitur dibagi **Tingkat A / B / C** (bagian 5). |
| 3 | Login: **Google**. Email+password disiapkan sebagai cadangan (lihat risiko R1). |
| 4 | Komentar melekat pada **produk** (bukan per video). |
| 5 | Data contoh: **dummy** buatan sendiri. |
| 6 | Smart Search sebagai fitur AI: **dikerjakan belakangan**, setelah Tingkat A stabil. |
| 7 | Nama produk: bebas dulu (placeholder). |
| 8 | Fokus awal: **stabil dulu**, APK dan AI menyusul. |
| 10 | Tombol **Pesan wajib login**; guest diarahkan ke layar login (`order_clicks.user_id` tidak boleh kosong). Menutup pertanyaan terbuka no. 7. |
| 11 | Penyedia model AI untuk Smart Search: **Gemini** (dipanggil lewat Supabase Edge Function, kunci disimpan sebagai secret server). Menutup pertanyaan terbuka no. 4 (tinggal membuat API key). |
| 9 | Hal yang akan ditanyakan ke panitia: apakah APK wajib dikumpulkan, apa maksud "localhost" (apakah backend cloud boleh), jam tenggat 14 Nov, dan repo GitHub yang ditentukan. |

> Asumsi yang dipakai di dokumen ini (mohon dikoreksi bila salah): **fitur Simpan menyimpan produk** (sama seperti prototype), bukan video; komentar per produk menggantikan komentar per video dari dokumen konsep.

## 4. Kondisi repo saat ini (prototype.zip)

Stack: Expo SDK 57, React Native 0.86, Expo Router, TypeScript strict.

```
app/
  _layout.tsx            Stack + AppProvider
  (tabs)/
    _layout.tsx          Tab: Home, Cari, Tersimpan, Profil
    index.tsx            Feed vertikal (masih gambar statis)
    search.tsx           Cari + filter kategori/harga
    saved.tsx            Produk tersimpan
    profile.tsx          Profil + role switcher (demo)
  product/[id].tsx       Detail produk + tombol pesan + maps
  umkm-dashboard.tsx     Tambah/ubah produk dan video
  admin.tsx              Verifikasi UMKM (hanya tampilan)
context/AppContext.tsx   State in-memory (hilang saat app ditutup)
data/mockData.ts         Data contoh (6 UMKM, 12 produk, 12 video)
```

Masalah yang sudah teridentifikasi (berdasarkan pembacaan kode, belum dijalankan):

- Seluruh data mock dan in-memory; tidak ada backend, login, atau penyimpanan.
- `app/(tabs)/index.tsx`: `renderItem` memakai `useCallback` dengan dependency `[likedVideoIds, savedProductIds]` tetapi membaca `products`. Produk baru/ubahan bisa tampil usang di feed.
- `app/product/[id].tsx`: `openLink` memakai `Linking.canOpenURL(url).then(...)` tanpa memeriksa hasilnya, dan fallback menampilkan pesan "Simulasi".
- Tombol komentar, bagikan, edit profil, alamat, notifikasi, bantuan, tentang: `onPress` kosong.
- Dashboard UMKM tidak dibatasi per UMKM. Panel admin tidak mengubah status verifikasi di tempat lain.
- Feed setinggi layar penuh sehingga tertutup tab bar. Ada peringatan `SafeAreaView deprecated`.
- Nama **LOGICODIX** dipakai sebagai nama aplikasi (`app.json`, top bar, profil, "Tentang"). **Wajib diganti.**
- `LICENSE` masih bawaan template Expo (hak cipta 650 Industries). Ganti.
- Gambar dari Unsplash dan ui-avatars (internet, status lisensi tidak jelas untuk lomba).
- Belum ada `README`, `eas.json`, `android.package`.
- Folder `.expo/` ikut ter-commit (hapus, pastikan ada di `.gitignore`).
- `AGENTS.md` menyebut route di `src/app/`, padahal folder sebenarnya `app/`.

**Yang dipertahankan:** struktur layar, gaya visual gelap dengan aksen oranye `#FF6B35`, dan alur navigasi. **Yang diganti:** seluruh lapisan data (AppContext + mockData) menjadi Supabase.

## 5. Cakupan fitur

### Tingkat A — WAJIB (target stabil + demo bisa jalan)

- [ ] **A1. Akun dan peran.** Login Google (email+password sebagai cadangan). Tabel `profiles` dengan peran `user | umkm | admin`. Admin ditetapkan manual di database, bukan lewat aplikasi.
- [ ] **A2. Pendaftaran UMKM.** User mendaftar sebagai UMKM (nama pemilik, nama UMKM, email/HP, alamat, GPS, logo; legalitas opsional) dengan status `pending`.
- [ ] **A3. Verifikasi admin satu kali.** Admin menyetujui/menolak. `approved` bisa memakai fitur UMKM, `rejected` tidak aktif. Setelah approved tidak perlu persetujuan lagi untuk edit profil, produk, video, atau link pesan.
- [ ] **A4. Produk.** CRUD produk milik UMKM sendiri (nama, deskripsi, harga, kategori, tag, foto).
- [ ] **A5. Link pesan per produk.** Satu produk punya beberapa link (GoFood, GrabFood, ShopeeFood, WhatsApp, lainnya).
- [ ] **A6. Video.** Upload video vertikal 9:16, **maksimal 60 detik**, ke Supabase Storage, terkait ke satu produk (satu produk boleh banyak video). Nama, harga, dan kategori di video **selalu diambil dari data produk** (ubah harga di produk, semua video ikut berubah).
- [ ] **A7. Feed video asli.** Full-screen vertikal, swipe atas/bawah, putar otomatis video yang terlihat, jeda yang tidak terlihat. Urutan sementara: terbaru.
- [ ] **A8. Pesan.** Tombol Pesan membuka link platform yang dipilih dan **mencatat klik** (`user → produk → platform → waktu`).
- [ ] **A9. Maps.** Tombol "Lihat di Maps" membuka Google Maps dari koordinat/alamat UMKM.
- [ ] **A10. Like dan Simpan** tersimpan di database dan bertahan setelah app ditutup.
- [ ] **A11. Perbaikan stabilitas** dari daftar masalah di bagian 4 (bug feed, tombol kosong, tab bar, SafeAreaView).
- [ ] **A12. Branding dan kebersihan repo.** Ganti nama aplikasi dan LICENSE, hapus `.expo/`, tambah README.
- [ ] **A13. Build APK** yang bisa diinstal dan dijalankan di Android.

### Tingkat B — kalau waktu cukup

- [ ] **B1. Lokasi.** GPS sebagai default, pilih manual, cari berdasarkan kota/radius. Jika GPS ditolak, aplikasi tetap bisa dipakai.
- [ ] **B2. Komentar per produk.**
- [ ] **B3. Rating produk** (1–5, review teks opsional) **hanya setelah user pernah klik Pesan** untuk produk tersebut. Rating UMKM = agregat rating seluruh produknya (tidak ada rating toko langsung).
- [ ] **B4. Share** link video ke platform lain dan catat aksinya.
- [ ] **B5. Follow UMKM** (hanya disimpan; belum perlu halaman Following).
- [ ] **B6. Watch time** dicatat berapa pun durasinya.

### Tingkat C — terakhir

- [ ] **C1. Smart Search sebagai fitur AI** (lihat bagian 8). Ini **wajib tampil di video demo**, jadi jadwalkan sebelum hari terakhir.
- [ ] **C2. Skor rekomendasi.** Guest: lokasi, jarak, popularitas, kesegaran. Login: tambah watch time, like, save, follow, share, klik Pesan, preferensi jenis makanan dan harga.
- [ ] **C3. Diversifikasi feed.** Jangan menampilkan video dari UMKM yang sama berturut-turut. UMKM berbeda dengan produk sama boleh.

## 6. Rancangan teknis

### 6.1 Struktur data (Supabase / Postgres)

Hubungan: `UMKM → Produk → Video`.

```sql
-- Peran dan status
create type user_role as enum ('user', 'umkm', 'admin');
create type umkm_status as enum ('pending', 'approved', 'rejected');
create type order_platform as enum ('gofood', 'grabfood', 'shopeefood', 'whatsapp', 'other');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role user_role not null default 'user',
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table umkm (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references profiles(id),  -- 1 akun = 1 UMKM
  owner_name text not null,
  name text not null,
  contact text not null,                 -- email / nomor HP
  address text not null,
  city text,
  lat double precision not null,
  lng double precision not null,
  logo_url text not null,
  legal_id text,                         -- opsional
  status umkm_status not null default 'pending',
  created_at timestamptz default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references umkm(id) on delete cascade,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  category text,
  tags text[] default '{}',
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table order_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  platform order_platform not null,
  url text not null
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  storage_path text not null,
  thumbnail_url text,
  caption text,                          -- opsional; data lain diambil dari produk
  duration_sec integer check (duration_sec <= 60),
  created_at timestamptz default now()
);

-- Interaksi (Tingkat A: likes, saves, order_clicks)
create table likes   (user_id uuid references profiles(id), video_id uuid references videos(id),   created_at timestamptz default now(), primary key (user_id, video_id));
create table saves   (user_id uuid references profiles(id), product_id uuid references products(id), created_at timestamptz default now(), primary key (user_id, product_id));
create table order_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),  -- boleh null untuk guest bila diputuskan
  product_id uuid not null references products(id),
  platform order_platform not null,
  created_at timestamptz default now()
);

-- Tingkat B
create table comments (id uuid primary key default gen_random_uuid(), product_id uuid not null references products(id) on delete cascade, user_id uuid not null references profiles(id), body text not null, created_at timestamptz default now());
create table ratings  (user_id uuid references profiles(id), product_id uuid references products(id), rating smallint not null check (rating between 1 and 5), review text, created_at timestamptz default now(), primary key (user_id, product_id));
create table follows  (user_id uuid references profiles(id), umkm_id uuid references umkm(id), created_at timestamptz default now(), primary key (user_id, umkm_id));
create table shares   (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), video_id uuid references videos(id), created_at timestamptz default now());
create table watch_events (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id), video_id uuid references videos(id), seconds numeric not null, created_at timestamptz default now());

-- Rating agregat (tanpa tabel rating toko)
create view product_rating as
  select product_id, avg(rating)::numeric(3,2) as avg_rating, count(*) as rating_count
  from ratings group by product_id;
create view umkm_rating as
  select p.umkm_id, avg(r.rating)::numeric(3,2) as avg_rating, count(*) as rating_count
  from ratings r join products p on p.id = r.product_id group by p.umkm_id;
```

Catatan RLS (**wajib diaktifkan di semua tabel**):

- `profiles`, `likes`, `saves`, `follows`, `comments`, `ratings`: user hanya bisa menulis baris miliknya (`user_id = auth.uid()`).
- `umkm`, `products`, `order_links`, `videos`: hanya pemilik (`umkm.owner_id = auth.uid()`) dan hanya jika `umkm.status = 'approved'` yang bisa menulis. Semua orang boleh membaca data produk/video dari UMKM yang `approved`.
- Perubahan `umkm.status`: hanya admin (`profiles.role = 'admin'`).
- `ratings` insert: hanya jika ada baris `order_clicks` milik user untuk produk tersebut (policy `with check exists (...)`).
- Storage: bucket `videos` (publik baca, tulis hanya pemilik UMKM approved), bucket `images`.
- **`service_role` key tidak boleh ada di aplikasi maupun repo.** Hanya `anon` key yang dipakai di klien.

### 6.2 Struktur kode yang disarankan

```
app/                 (route Expo Router, tetap)
src/
  lib/supabase.ts    klien Supabase (sesi disimpan AsyncStorage)
  config.ts          APP_NAME, batas video, dll.
  services/          fungsi akses data per domain (products, videos, auth, orders, ...)
  hooks/             useAuth, useFeed, ...
  components/        komponen bersama
supabase/
  schema.sql         skema + RLS (satu sumber kebenaran)
  seed.sql           data dummy
.env.example         EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (kunci publik; kode memakai nama ini)
```

- `APP_NAME` disimpan di **satu tempat** (`src/config.ts` dan `app.json`) dan dipakai di seluruh UI.
- Layar tidak boleh memanggil Supabase langsung; lewat `services/`.
- Semua file baru: TypeScript strict, tanpa `any` yang tidak perlu.

### 6.3 Catatan teknis penting

- Dokumentasi Expo berubah antar SDK. Sesuai `AGENTS.md`: **cek versi `expo` di `package.json` (saat ini ~57) dan baca dokumentasi versi tersebut** sebelum memakai API Expo/RN. Jangan mengandalkan ingatan.
- Pasang paket dengan `npx expo install <paket>` (bukan `npm install`), supaya versinya cocok dengan SDK.
- Pemutar video: `expo-video` (verifikasi di dokumentasi SDK 57). Pilih/rekam video: `expo-image-picker` (batasi durasi dan kualitas saat memilih). Lokasi: `expo-location`.
- Unggah video dan gambar ke Supabase Storage dengan ukuran dibatasi (hemat server dan sesuai prinsip Green IT).
- Jarak/radius: simpan `lat`/`lng`; hitung dengan rumus Haversine di fungsi SQL (RPC), PostGIS tidak wajib untuk MVP.
- Sebelum menyatakan selesai: jalankan `npx expo lint` dan `npx tsc --noEmit`, dan `npx expo-doctor` bila ada perubahan dependensi.

## 7. Risiko dan penanganannya

| # | Risiko | Penanganan |
|---|---|---|
| R1 | **Login Google di Expo** biasanya butuh konfigurasi OAuth (Google Cloud Console, redirect/deep link, dan untuk jalur native perlu development build, bukan Expo Go). Bisa memakan waktu. | Kerjakan **email+password dulu** (30 menit), lalu Google. Jangan biarkan Google memblokir Tingkat A. Cek dokumentasi Supabase + Expo SDK 57 untuk cara yang berlaku. |
| R2 | Upload dan putar video lambat/berat. | Batas 60 detik, kompres/pilih kualitas rendah saat pilih video, siapkan 6–10 video pendek sebagai data contoh. |
| R3 | Backend cloud vs aturan "localhost" saat final. | **Tanya panitia.** Cadangan: siapkan data dan video contoh yang bisa dipakai tanpa internet bila memungkinkan, atau jalankan Supabase lokal (Supabase CLI + Docker). |
| R4 | Cakupan terlalu besar untuk 2 orang dalam 7 hari. | Tingkat A dulu. Tingkat B/C hanya setelah acceptance test Tingkat A lolos. |
| R5 | Kode dibuat dengan AI tetapi tim harus bisa menjelaskannya di Q&A. | README, komentar singkat di logika penting, dan satu sesi saling menjelaskan alur utama sebelum submission. |
| R6 | Kode tidak boleh berubah setelah tenggat. | Bekukan kode **Jumat 13 Nov malam**; Sabtu 14 Nov hanya untuk cadangan dan submit. Konfirmasi jam tenggat ke panitia. |
| R7 | Aset dengan lisensi tidak jelas. | Ganti Unsplash/ui-avatars dengan foto dan video buatan sendiri (atau AI/berlisensi jelas dan dicatat sumbernya di README). |

## 8. Rencana fitur AI (Tingkat C1 — Smart Search)

Tujuan: memahami kalimat seperti **"makanan pedas murah dekat sini"** menjadi filter terstruktur.

1. Klien mengirim teks ke **Supabase Edge Function** (kunci API LLM disimpan sebagai secret di server, **bukan** di aplikasi).
2. Fungsi memanggil LLM dengan instruksi mengembalikan JSON: `{ kategori, tag[], harga_maks, urut, gunakan_lokasi }`.
3. Klien menerapkan JSON itu pada query yang sudah ada (kategori, tag, harga, jarak). Bila AI gagal/timeout, otomatis kembali ke pencarian kata kunci biasa.
4. UI memberi label jelas bahwa pencarian ini **dibantu AI** (transparansi).
5. Hanya teks pencarian yang dikirim; tidak mengirim data pribadi.
6. Tampilkan di video demo (wajib).

Pilihan penyedia model (API berbayar/gratis atau open-source) **belum diputuskan**; putuskan sebelum hari ke-5.

## 9. Etika, privasi, dan Green IT (10% nilai)

- Data seminimal mungkin. Izin lokasi diminta dengan penjelasan; menolak GPS tetap bisa memakai aplikasi.
- Jelaskan di README data apa yang dicatat (klik Pesan, watch time, like/save/follow/share) dan untuk apa (rekomendasi), serta siapa yang bisa melihatnya.
- Aktifkan RLS; tidak ada rahasia di repo (`.env` di `.gitignore`).
- Transparansi AI: label di UI dan penjelasan di README.
- Efisiensi: batas durasi/ukuran video, kompres gambar, muat data berhalaman (pagination) di feed.

## 10. Jadwal kerja (internal)

| Hari | Fokus |
|---|---|
| Sab 7 Nov | Repo GitHub, proyek Supabase, `schema.sql` + RLS, `seed.sql`, ganti branding, bersihkan repo |
| Min 8 Nov | A1–A3: login, peran, daftar UMKM, verifikasi admin |
| Sen 9 Nov | A4–A6: produk, link pesan, upload video |
| Sel 10 Nov | A7–A10: feed video asli, klik Pesan tercatat, Maps, like/simpan |
| Rab 11 Nov | A11–A13: stabilisasi dan **build APK**; tes di perangkat Android |
| Kam 12 Nov | **Smart Search AI (C1)** minimal; lalu Tingkat B yang sempat (B1, B2, B3 diprioritaskan) |
| Jum 13 Nov | README, video demo (3–5 menit, tanpa narasi), uji instal bersih, **bekukan kode malam hari** |
| Sab 14 Nov | Cadangan dan **submit** |

Bila A1–A10 belum lolos acceptance test di akhir Selasa, hentikan penambahan fitur dan selesaikan stabilitas lebih dulu. Fitur AI tetap perlu masuk karena wajib di video demo dan bernilai 25%, jadi pertahankan versi paling sederhana.

## 11. Acceptance test Tingkat A

Dari instalasi bersih (HP/emulator Android, tanpa data tersisa):

1. Login dengan Google (atau email) berhasil dan sesi bertahan setelah aplikasi ditutup.
2. User mendaftar sebagai UMKM, status `pending`. Admin menyetujui. UMKM bisa mengelola produknya.
3. UMKM menambah produk, menambah 2 link pesan, mengunggah video ≤ 60 detik.
4. Video muncul di feed pengguna lain; ubah harga produk, harga di video ikut berubah.
5. User menyukai dan menyimpan produk; tutup dan buka aplikasi, data tetap ada.
6. Tekan Pesan: link terbuka dan satu baris tercatat di `order_clicks`.
7. Tekan Lihat di Maps: Google Maps terbuka di lokasi UMKM.
8. UMKM A tidak bisa mengubah produk UMKM B (uji RLS).
9. Tidak ada tombol yang tidak berfungsi, tidak ada tulisan "Simulasi", dan tidak ada nama "LOGICODIX" di UI.
10. `npx tsc --noEmit` dan `npx expo lint` bersih.

## 12. Daftar periksa submission

- [ ] Repo GitHub sesuai yang ditentukan panitia; README lengkap (cara jalan lokal, env, arsitektur, data yang dicatat, label AI, sumber aset)
- [ ] `.env` tidak ikut ter-commit; `.env.example` ada; `.expo/` tidak ter-commit
- [ ] LICENSE diganti atas nama tim
- [ ] Video demo 3–5 menit, tanpa narasi, menampilkan alur utama **dan fitur AI**
- [ ] Aplikasi bisa dijalankan di laptop final (uji dari clone bersih)
- [ ] APK (bila diminta panitia)
- [ ] Kode dibekukan sebelum tenggat

## 13. Pertanyaan terbuka

1. Apakah APK wajib dikumpulkan saat submission? (tanya panitia)
2. Apa arti "localhost" saat final; apakah backend cloud (Supabase) diperbolehkan? (tanya panitia)
3. Jam berapa tenggat 14 November dan repo GitHub mana yang ditentukan? (tanya panitia)
4. Penyedia model AI dan API key yang akan dipakai untuk Smart Search.
5. Nama produk final dan tagline.
6. Pembagian kerja dua orang, misalnya Orang A: Supabase, autentikasi, upload; Orang B: layar dan integrasi UI (sesuaikan).
7. Apakah guest boleh melihat feed dan mengklik Pesan tanpa login (menentukan `order_clicks.user_id` boleh kosong atau tidak)?
