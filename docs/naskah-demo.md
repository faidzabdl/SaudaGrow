# Naskah video demo SaudaGrow (3-5 menit, tanpa narasi suara)

Syarat panitia: durasi 3-5 menit, produk berfungsi, **tanpa suara narasi**, dan **harus menampilkan fitur AI**.
Karena tanpa suara, setiap adegan memakai **teks di layar** (takarir singkat, 1-2 baris, tampil minimal 3 detik).
Target total: sekitar 4 menit 40 detik, memberi cadangan waktu 20 detik.

## Persiapan sebelum merekam
- [ ] APK versi final terpasang; internet stabil; GPS menyala; notifikasi dimatikan (mode jangan ganggu); baterai > 50%.
- [ ] Data siap: `seed.sql`, media seed, `b3_ratings.sql`, `seed_ratings.sql` sudah dijalankan.
- [ ] Akun siap (catat di tempat aman, jangan di repo): **user biasa** (belum pernah menekan Pesan di produk target), **UMKM approved**, **admin**, dan satu akun baru untuk didaftarkan sebagai UMKM selama video.
- [ ] Izin lokasi di HP **belum diberikan** untuk SaudaGrow, agar dialog izin tampil di video (transparansi).
- [ ] Smart Search sudah dicoba sekali (Edge Function hangat, tidak lambat di video).
- [ ] Perekam layar 1080p (perekam bawaan HP atau `scrcpy --record`); rekam vertikal dan jangan diputar.
- [ ] Siapkan 2 perangkat/jendela bila ingin menampilkan admin menyetujui secara langsung (HP + emulator/web); atau rekam terpisah lalu sambung.

## Alur adegan

| Waktu | Adegan | Yang ditampilkan | Takarir di layar |
|---|---|---|---|
| 0:00-0:12 | Judul | Logo/nama SaudaGrow di latar gelap | "SaudaGrow: temukan UMKM kuliner lewat video pendek" |
| 0:12-0:40 | Feed | Geser 3 video; ketuk untuk jeda; geser bilah putar; like dan simpan (login dulu bila perlu) | "Feed video vertikal. Jeda, geser waktu, suka, simpan." |
| 0:40-0:58 | Refresh, rekomendasi, dan FYP Terdekat | Tarik layar dari video pertama; urutan berubah; lalu ketuk tab **Terdekat** (izin lokasi, jarak tampil di tiap video) | "Untuk Anda: ranking acak berbobot. Terdekat: jarak + ranking." |
| 0:58-1:55 | **Smart Search (AI)** | Tab Cari, ketik "makanan pedas murah dekat sini"; dialog izin lokasi; badge **Dibantu AI** dan chip; hasil beserta jarak; hapus satu chip dan hasil berubah; coba "bakso di bawah 25 ribu" | "Smart Search (Gemini): kalimat bebas menjadi filter. Lokasi tidak dikirim ke AI." |
| 1:55-2:08 | Cadangan AI | (opsional) mode pesawat, cari lagi: muncul pesan "memakai pencarian kata kunci biasa" | "Bila AI tidak tersedia, pencarian biasa tetap jalan." |
| 2:08-2:30 | Tentang UMKM | Ketuk akun UMKM di feed; tab Tentang UMKM; ketuk **Lihat di Maps**; kembali ke Info Produk dan ketuk thumbnail video untuk memutarnya | "Profil UMKM dan lokasi di Google Maps." |
| 2:30-3:00 | Pesan dan rating | Tekan Pesan via WhatsApp/GoFood; kembali; beri 5 bintang dengan ulasan; rata-rata berubah | "Pesan lewat platform yang sudah ada. Rating hanya setelah menekan Pesan." |
| 3:00-3:50 | UMKM | Akun baru: Daftar sebagai UMKM (logo, GPS) lalu status menunggu; **admin menyetujui**; akun UMKM membuka Dashboard; tambah produk (foto, link) dan unggah video | "UMKM mendaftar, admin memverifikasi, UMKM mengelola produk dan video sendiri." |
| 3:50-4:15 | Statistik | Dashboard: suka, simpan, klik Pesan per platform, rating | "Statistik nyata untuk pemilik UMKM." |
| 4:15-4:40 | Etika dan data | Layar Profil atau slide: daftar data yang dicatat | "Data minimal, RLS di semua tabel, ulasan anonim, lokasi hanya di perangkat." |
| 4:40-4:50 | Penutup | Kartu nama tim dan teknologi | "Expo - React Native - Supabase - Gemini" |

## Tips
- Satu pengambilan per adegan, lalu sambung. Jangan menunggu loading; potong bagian diam.
- Takarir: font besar, kontras tinggi, di bagian atas atau bawah layar yang tidak menutupi tombol.
- Hindari menampilkan email, nomor HP, atau kunci. Bila perlu, sensor.
- Periksa durasi akhir **di bawah 5:00**; unggah dan putar ulang untuk memastikan berkas tidak rusak.
- Simpan salinan video di dua tempat sebelum mengirim.
