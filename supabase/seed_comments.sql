-- =====================================================================
-- SaudaGrow: seed_comments.sql (komentar contoh untuk demo B2)
-- Jalankan SETELAH seed.sql dan seed_ratings.sql (memakai akun pembeli contoh dan pemilik UMKM dari kedua berkas itu)
-- dan b2_comments.sql. Aman dijalankan ulang; JANGAN di database produksi.
-- Catatan: menjalankan ulang seed.sql atau seed_ratings.sql menghapus akun contoh beserta komentarnya,
-- jadi jalankan berkas ini lagi setelahnya.
-- Dua jenis: komentar PRODUK (video_id kosong; tab Komentar di halaman produk) dan komentar VIDEO (video_id terisi;
-- panel komentar di feed Home). Pemilik UMKM membalas pertanyaan, sehingga label "Pemilik" terlihat di demo.
-- =====================================================================

do $seed$
begin
  delete from public.comments
  where user_id::text like '00000000-0000-4000-8000-0000000000e%'
     or user_id::text like '00000000-0000-4000-8000-0000000000a%';

  -- Komentar produk (tanpa video_id)
  insert into public.comments (product_id, video_id, user_id, body, created_at) values
    ('00000000-0000-4000-8000-00000000c001', null, '00000000-0000-4000-8000-0000000000e1', 'Buka mulai jam berapa ya?',                           now() - interval '9 days'),
    ('00000000-0000-4000-8000-00000000c001', null, '00000000-0000-4000-8000-0000000000a1', 'Kami buka mulai jam 6 pagi setiap hari, Kak.',         now() - interval '9 days' + interval '20 minutes'),
    ('00000000-0000-4000-8000-00000000c003', null, '00000000-0000-4000-8000-0000000000e2', 'Ada pilihan bakso urat tidak?',                       now() - interval '6 days'),
    ('00000000-0000-4000-8000-00000000c003', null, '00000000-0000-4000-8000-0000000000a2', 'Ada, bisa pilih bakso urat atau bakso halus.',         now() - interval '6 days' + interval '1 hour'),
    ('00000000-0000-4000-8000-00000000c005', null, '00000000-0000-4000-8000-0000000000e3', 'Bisa pesan dalam jumlah banyak untuk acara?',          now() - interval '4 days'),
    ('00000000-0000-4000-8000-00000000c005', null, '00000000-0000-4000-8000-0000000000a3', 'Bisa, Kak. Hubungi lewat WhatsApp H-1 ya.',            now() - interval '4 days' + interval '2 hours'),
    ('00000000-0000-4000-8000-00000000c007', null, '00000000-0000-4000-8000-0000000000e4', 'Level pedasnya bisa diatur, kan?',                    now() - interval '2 days'),
    ('00000000-0000-4000-8000-00000000c011', null, '00000000-0000-4000-8000-0000000000e1', 'Kuahnya pakai koya atau tidak?',                      now() - interval '1 day');

  -- Komentar video (video_id terisi; video harus milik produknya: d001=c001, d002=c003, d003=c005, d004=c007)
  insert into public.comments (product_id, video_id, user_id, body, created_at) values
    ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000e2', 'Videonya bikin lapar. Itu porsi yang mana, Kak?',   now() - interval '8 days'),
    ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000a1', 'Itu porsi komplit, Kak: nasi uduk, telur, dan tempe.', now() - interval '8 days' + interval '30 minutes'),
    ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000d001', '00000000-0000-4000-8000-0000000000e4', 'Sambal kacangnya kelihatan kental, mantap.',         now() - interval '7 days'),
    ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000e1', 'Kuahnya terlihat segar, pakai kaldu apa?',          now() - interval '5 days'),
    ('00000000-0000-4000-8000-00000000c003', '00000000-0000-4000-8000-00000000d002', '00000000-0000-4000-8000-0000000000a2', 'Kaldu tulang sapi yang direbus 8 jam, Kak.',         now() - interval '5 days' + interval '45 minutes'),
    ('00000000-0000-4000-8000-00000000c005', '00000000-0000-4000-8000-00000000d003', '00000000-0000-4000-8000-0000000000e4', 'Bisa dibuat versi mini tidak?',                     now() - interval '3 days'),
    ('00000000-0000-4000-8000-00000000c007', '00000000-0000-4000-8000-00000000d004', '00000000-0000-4000-8000-0000000000e3', 'Sambalnya dijual terpisah?',                        now() - interval '2 days'),
    ('00000000-0000-4000-8000-00000000c007', '00000000-0000-4000-8000-00000000d004', '00000000-0000-4000-8000-0000000000a4', 'Dijual, Kak, botol 150 ml.',                        now() - interval '2 days' + interval '1 hour');
end
$seed$;
