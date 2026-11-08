-- =====================================================================
-- Saudagrow — seed.sql (data dummy untuk pengembangan & demo)
-- Jalankan SETELAH schema.sql, di Supabase Dashboard -> SQL Editor.
--
-- Sebelum dijalankan:
--   1) Ubah v_base di bawah menjadi URL publik Storage project Anda:
--        https://<project-ref>.supabase.co/storage/v1/object/public
--   2) Unggah media buatan sendiri (lihat daftar nama file di bagian bawah file ini).
--
-- Aman dijalankan ulang: seed lama (user dengan email @seed.saudagrow.test) dihapus dulu
-- lalu dibuat ulang. Hati-hati: like/simpan/klik Pesan milik user lain pada produk seed
-- ikut terhapus. JANGAN dijalankan di database produksi.
--
-- Akun seed tidak punya password, jadi tidak bisa dipakai login. UMKM #5 sengaja
-- berstatus 'pending' agar alur verifikasi admin bisa didemokan.
-- =====================================================================

do $seed$
declare
  v_base text := 'https://GANTI-DENGAN-PROJECT-REF.supabase.co/storage/v1/object/public';
begin
  -- Bersihkan seed lama (cascade ke profiles, umkm, produk, video, link pesan).
  delete from auth.users where email like '%@seed.saudagrow.test';

  -- ---------- Akun pemilik UMKM (profil dibuat otomatis oleh trigger) ----------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select '00000000-0000-0000-0000-000000000000', s.id::uuid, 'authenticated', 'authenticated', s.email, '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', s.full_name),
    now(), now(), '', '', '', ''
  from (values
    ('00000000-0000-4000-8000-0000000000a1', 'seed-umkm-1@seed.saudagrow.test', 'Sari Rahayu'),
    ('00000000-0000-4000-8000-0000000000a2', 'seed-umkm-2@seed.saudagrow.test', 'Joko Susilo'),
    ('00000000-0000-4000-8000-0000000000a3', 'seed-umkm-3@seed.saudagrow.test', 'Acong Wijaya'),
    ('00000000-0000-4000-8000-0000000000a4', 'seed-umkm-4@seed.saudagrow.test', 'Rina Kusuma'),
    ('00000000-0000-4000-8000-0000000000a5', 'seed-umkm-5@seed.saudagrow.test', 'Udin Harahap'),
    ('00000000-0000-4000-8000-0000000000a6', 'seed-umkm-6@seed.saudagrow.test', 'Hartono')
  ) as s(id, email, full_name);

  -- ---------- UMKM ----------
  insert into public.umkm (id, owner_id, owner_name, name, contact, address, city, lat, lng, logo_url, status) values
    ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a1', 'Sari Rahayu', 'Warung Nasi Uduk Bu Sari', '+6281234567890', 'Jl. Kemanggisan No. 12', 'Jakarta Barat', -6.1783, 106.7915, v_base || '/images/seed/logo-umkm-1.jpg', 'approved'),
    ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a2', 'Joko Susilo', 'Bakso Malang Pak Joko', '+6281234567891', 'Jl. Sudirman No. 45', 'Malang', -7.9666, 112.6326, v_base || '/images/seed/logo-umkm-2.jpg', 'approved'),
    ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-0000000000a3', 'Acong Wijaya', 'Martabak Manis Koh Acong', '+6281234567892', 'Jl. Mangga Besar No. 7', 'Jakarta Pusat', -6.1507, 106.827, v_base || '/images/seed/logo-umkm-3.jpg', 'approved'),
    ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-0000000000a4', 'Rina Kusuma', 'Ayam Geprek Mbak Rina', '+6281234567893', 'Jl. Gejayan No. 23', 'Yogyakarta', -7.7647, 110.3902, v_base || '/images/seed/logo-umkm-4.jpg', 'approved'),
    ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-0000000000a5', 'Udin Harahap', 'Mie Aceh Bang Udin', '+6281234567894', 'Jl. Benhil No. 88', 'Jakarta Selatan', -6.209, 106.813, v_base || '/images/seed/logo-umkm-5.jpg', 'pending'),
    ('00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-0000000000a6', 'Hartono', 'Soto Lamongan Cak Har', '+6281234567895', 'Jl. Rajawali No. 5', 'Surabaya', -7.2575, 112.7521, v_base || '/images/seed/logo-umkm-6.jpg', 'approved');

  -- Pemilik UMKM yang sudah approved berperan 'umkm' (trigger hanya aktif pada UPDATE status).
  update public.profiles p set role = 'umkm'
  from public.umkm u where u.owner_id = p.id and u.status = 'approved'
    and u.owner_id::text like '00000000-0000-4000-8000-%';

  -- ---------- Produk ----------
  insert into public.products (id, umkm_id, name, description, price, category, tags, image_url) values
    ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-0000000000b1', 'Nasi Uduk Komplit', 'Nasi uduk harum dengan lauk ayam goreng, tempe orek, tahu balado, telur, dan sambal kacang. Disajikan hangat dengan kerupuk.', 25000, 'Nasi & Lauk', array['nasi','betawi','sarapan','komplit'], v_base || '/images/seed/produk-1.jpg'),
    ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-0000000000b1', 'Nasi Uduk + Ayam Bakar', 'Nasi uduk dengan ayam bakar bumbu kecap, lalapan segar, dan sambal terasi. Cocok untuk makan siang.', 32000, 'Nasi & Lauk', array['nasi','ayam bakar','betawi'], v_base || '/images/seed/produk-2.jpg'),
    ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-0000000000b2', 'Bakso Urat Super', 'Bakso urat besar dengan isian daging sapi cincang, kuah kaldu gurih, mie, bihun, dan pelengkap. Porsi jumbo!', 28000, 'Bakso & Mie', array['bakso','urat','kuah','sapi'], v_base || '/images/seed/produk-3.jpg'),
    ('00000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-0000000000b2', 'Bakso Keju Mozarella', 'Inovasi bakso dengan isian keju mozarella yang meleleh. Perpaduan unik bakso Malang dan keju premium.', 35000, 'Bakso & Mie', array['bakso','keju','mozzarella','fusion'], v_base || '/images/seed/produk-4.jpg'),
    ('00000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-0000000000b3', 'Martabak Nutella Keju', 'Martabak manis tebal dengan topping Nutella, keju parut melimpah, dan meses coklat. Ukuran besar cukup untuk 4 orang.', 55000, 'Kue & Snack', array['martabak','nutella','keju','manis'], v_base || '/images/seed/produk-5.jpg'),
    ('00000000-0000-4000-8000-00000000c006', '00000000-0000-4000-8000-0000000000b3', 'Martabak Telur Spesial', 'Martabak telur gurih dengan isian daging sapi cincang, telur, daun bawang, dan bumbu rempah. Dilengkapi acar.', 45000, 'Kue & Snack', array['martabak','telur','daging','gurih'], v_base || '/images/seed/produk-6.jpg'),
    ('00000000-0000-4000-8000-00000000c007', '00000000-0000-4000-8000-0000000000b4', 'Ayam Geprek Level 10', 'Ayam crispy digeprek dengan sambal bawang 10 cabai rawit. Untuk pecinta pedas sejati! Tersedia pilihan dada atau paha.', 22000, 'Ayam & Bebek', array['ayam','geprek','pedas','crispy'], v_base || '/images/seed/produk-7.jpg'),
    ('00000000-0000-4000-8000-00000000c008', '00000000-0000-4000-8000-0000000000b4', 'Ayam Geprek Keju', 'Ayam geprek crispy dengan tambahan lelehan keju cheddar yang gurih. Kombinasi pedas dan asin yang sempurna.', 27000, 'Ayam & Bebek', array['ayam','geprek','keju','crispy'], v_base || '/images/seed/produk-8.jpg'),
    ('00000000-0000-4000-8000-00000000c009', '00000000-0000-4000-8000-0000000000b5', 'Mie Aceh Goreng Seafood', 'Mie Aceh goreng dengan campuran udang, cumi, dan kepiting. Bumbu rempah khas Aceh yang kaya aroma.', 45000, 'Mie & Pasta', array['mie','aceh','seafood','goreng'], v_base || '/images/seed/produk-9.jpg'),
    ('00000000-0000-4000-8000-00000000c010', '00000000-0000-4000-8000-0000000000b5', 'Mie Aceh Kuah Daging', 'Mie Aceh kuah dengan daging sapi empuk dalam kuah rempah kental. Disajikan dengan emping dan acar bawang.', 42000, 'Mie & Pasta', array['mie','aceh','daging','kuah'], v_base || '/images/seed/produk-10.jpg'),
    ('00000000-0000-4000-8000-00000000c011', '00000000-0000-4000-8000-0000000000b6', 'Soto Lamongan Spesial', 'Soto Lamongan dengan kuah bening kuning, ayam suwir, koya khas, telur rebus, dan kerupuk udang. Segar dan lezat.', 20000, 'Soto & Sup', array['soto','lamongan','kuah','ayam'], v_base || '/images/seed/produk-11.jpg'),
    ('00000000-0000-4000-8000-00000000c012', '00000000-0000-4000-8000-0000000000b6', 'Soto Lamongan + Sate Kerang', 'Paket lengkap soto Lamongan dengan sate kerang bumbu kacang. Kombinasi laut dan daratan yang sempurna.', 32000, 'Soto & Sup', array['soto','lamongan','sate','kerang'], v_base || '/images/seed/produk-12.jpg');

  -- ---------- Link pesan (placeholder: ganti dengan link asli bila ada) ----------
  insert into public.order_links (product_id, platform, url) values
    ('00000000-0000-4000-8000-00000000c001', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c001', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c001', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c001', 'whatsapp', 'https://wa.me/6281234567890'),
    ('00000000-0000-4000-8000-00000000c002', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c002', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c002', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c002', 'whatsapp', 'https://wa.me/6281234567890'),
    ('00000000-0000-4000-8000-00000000c003', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c003', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c003', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c003', 'whatsapp', 'https://wa.me/6281234567891'),
    ('00000000-0000-4000-8000-00000000c004', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c004', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c004', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c004', 'whatsapp', 'https://wa.me/6281234567891'),
    ('00000000-0000-4000-8000-00000000c005', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c005', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c005', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c005', 'whatsapp', 'https://wa.me/6281234567892'),
    ('00000000-0000-4000-8000-00000000c006', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c006', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c006', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c006', 'whatsapp', 'https://wa.me/6281234567892'),
    ('00000000-0000-4000-8000-00000000c007', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c007', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c007', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c007', 'whatsapp', 'https://wa.me/6281234567893'),
    ('00000000-0000-4000-8000-00000000c008', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c008', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c008', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c008', 'whatsapp', 'https://wa.me/6281234567893'),
    ('00000000-0000-4000-8000-00000000c009', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c009', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c009', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c009', 'whatsapp', 'https://wa.me/6281234567894'),
    ('00000000-0000-4000-8000-00000000c010', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c010', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c010', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c010', 'whatsapp', 'https://wa.me/6281234567894'),
    ('00000000-0000-4000-8000-00000000c011', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c011', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c011', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c011', 'whatsapp', 'https://wa.me/6281234567895'),
    ('00000000-0000-4000-8000-00000000c012', 'gofood', 'https://gofood.co.id'),
    ('00000000-0000-4000-8000-00000000c012', 'grabfood', 'https://food.grab.com'),
    ('00000000-0000-4000-8000-00000000c012', 'shopeefood', 'https://shopee.co.id/food'),
    ('00000000-0000-4000-8000-00000000c012', 'whatsapp', 'https://wa.me/6281234567895');

  -- ---------- Video (file di bucket 'videos', path: {id-pemilik}/{nama-file}) ----------
  insert into public.videos (id, product_id, storage_path, thumbnail_url, caption, duration_sec) values
    ('00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-0000000000a1/seed-video-1.mp4', v_base || '/images/seed/video-1-thumb.jpg', 'Nasi uduk pagi hari, bikin semangat! Rempah Betawi asli 🍚✨', 24),
    ('00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-0000000000a2/seed-video-2.mp4', v_base || '/images/seed/video-2-thumb.jpg', 'Bakso urat jumbo, satu gigitan langsung nagih! 🥩🍜', 31),
    ('00000000-0000-4000-8000-00000000d003', '00000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-0000000000a3/seed-video-3.mp4', v_base || '/images/seed/video-3-thumb.jpg', 'Martabak Nutella keju meleleh... surga di mulut! 🧀🍫', 18),
    ('00000000-0000-4000-8000-00000000d004', '00000000-0000-4000-8000-00000000c007', '00000000-0000-4000-8000-0000000000a4/seed-video-4.mp4', v_base || '/images/seed/video-4-thumb.jpg', 'Level 10 buat yang berani! Siapa mau tantangan? 🔥🌶️', 42),
    ('00000000-0000-4000-8000-00000000d005', '00000000-0000-4000-8000-00000000c009', '00000000-0000-4000-8000-0000000000a5/seed-video-5.mp4', v_base || '/images/seed/video-5-thumb.jpg', 'Mie Aceh seafood, rempah Aceh yang bikin ketagihan 🦐🍜', 27),
    ('00000000-0000-4000-8000-00000000d006', '00000000-0000-4000-8000-00000000c011', '00000000-0000-4000-8000-0000000000a6/seed-video-6.mp4', v_base || '/images/seed/video-6-thumb.jpg', 'Soto Lamongan sejuk dan segar, sarapan terbaik! ☀️🍲', 35),
    ('00000000-0000-4000-8000-00000000d007', '00000000-0000-4000-8000-00000000c004', '00000000-0000-4000-8000-0000000000a2/seed-video-7.mp4', v_base || '/images/seed/video-7-thumb.jpg', 'Bakso keju mozarella, pecah saat digigit! 🧀💥', 22),
    ('00000000-0000-4000-8000-00000000d008', '00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-0000000000a1/seed-video-8.mp4', v_base || '/images/seed/video-8-thumb.jpg', 'Ayam bakar Bu Sari, resep rahasia sejak 1995 🍗🔥', 29),
    ('00000000-0000-4000-8000-00000000d009', '00000000-0000-4000-8000-00000000c008', '00000000-0000-4000-8000-0000000000a4/seed-video-9.mp4', v_base || '/images/seed/video-9-thumb.jpg', 'Ayam geprek keju, combo juara! Mau? 🍗🧀', 38),
    ('00000000-0000-4000-8000-00000000d010', '00000000-0000-4000-8000-00000000c012', '00000000-0000-4000-8000-0000000000a6/seed-video-10.mp4', v_base || '/images/seed/video-10-thumb.jpg', 'Paket soto + sate kerang, kenyang dan happy! 🍲🦀', 20),
    ('00000000-0000-4000-8000-00000000d011', '00000000-0000-4000-8000-00000000c006', '00000000-0000-4000-8000-0000000000a3/seed-video-11.mp4', v_base || '/images/seed/video-11-thumb.jpg', 'Martabak telur spesial, isi daging penuh! 🥚🥩', 33),
    ('00000000-0000-4000-8000-00000000d012', '00000000-0000-4000-8000-00000000c010', '00000000-0000-4000-8000-0000000000a5/seed-video-12.mp4', v_base || '/images/seed/video-12-thumb.jpg', 'Kuah rempah Mie Aceh bikin hangat seharian 🌿🍜', 26);
end
$seed$;

-- =====================================================================
-- Berkas media yang perlu Anda unggah (buatan sendiri / lisensi jelas; catat sumbernya di README)
--
-- Bucket 'images' (publik), folder seed/:
--   seed/logo-umkm-1.jpg ... seed/logo-umkm-6.jpg      (logo, 6 file)
--   seed/produk-1.jpg    ... seed/produk-12.jpg        (foto produk, 12 file)
--   seed/video-1-thumb.jpg ... seed/video-12-thumb.jpg (thumbnail video, opsional)
--
-- Bucket 'videos' (publik), path persis seperti kolom storage_path, mis.:
--   00000000-0000-4000-8000-0000000000a1/seed-video-1.mp4
--   (folder = id pemilik UMKM; lihat daftar lengkapnya dengan query di bawah)
--
--   select storage_path from public.videos order by created_at, storage_path;
--
-- Video: vertikal 9:16, maksimal 60 detik, mp4, kurang dari 50 MB.
-- Mengunggah lewat dashboard Supabase tidak terkena policy folder, jadi path bebas diatur.
-- =====================================================================
