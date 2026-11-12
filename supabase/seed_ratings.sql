-- =====================================================================
-- SaudaGrow: seed_ratings.sql (rating contoh untuk demo B3)
-- Jalankan SETELAH seed.sql dan b3_ratings.sql. Aman dijalankan ulang; JANGAN di database produksi.
-- Membuat 4 akun pembeli contoh (tanpa password, tidak bisa login), klik Pesan, dan rating contoh.
-- Produk 9 dan 12 sengaja dibiarkan tanpa rating.
-- =====================================================================

do $seed$
begin
  delete from auth.users where email like 'seed-buyer-%@seed.saudagrow.test';

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select '00000000-0000-0000-0000-000000000000', s.id::uuid, 'authenticated', 'authenticated', s.email, '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', s.full_name),
    now(), now(), '', '', '', ''
  from (values
    ('00000000-0000-4000-8000-0000000000e1', 'seed-buyer-1@seed.saudagrow.test', 'Rani'),
    ('00000000-0000-4000-8000-0000000000e2', 'seed-buyer-2@seed.saudagrow.test', 'Dimas'),
    ('00000000-0000-4000-8000-0000000000e3', 'seed-buyer-3@seed.saudagrow.test', 'Sekar'),
    ('00000000-0000-4000-8000-0000000000e4', 'seed-buyer-4@seed.saudagrow.test', 'Fajar')
  ) as s(id, email, full_name);

  -- Klik Pesan (syarat rating) untuk setiap rating contoh
  insert into public.order_clicks (user_id, product_id, platform)
  select r.user_id::uuid, r.product_id::uuid, 'whatsapp'
  from (values
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c001'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c001'),
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c002'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c002'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c002'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c003'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c003'),
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c004'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c004'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c005'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c006'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c006'),
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c007'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c007'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c008'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c010'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c011')
  ) as r(user_id, product_id);

  insert into public.ratings (user_id, product_id, rating, review) values
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c001', 5, 'Rasanya enak, pasti pesan lagi.'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c001', 4, 'Pengemasan rapi dan masih hangat.'),
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c002', 5, 'Rasa konsisten, sudah beberapa kali pesan.'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c002', 5, null),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c002', 4, 'Porsinya pas dan harganya terjangkau.'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c003', 5, 'Rasanya enak, pasti pesan lagi.'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c003', 4, null),
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c004', 4, 'Porsinya pas dan harganya terjangkau.'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c004', 3, 'Lumayan, tapi porsinya bisa lebih banyak.'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c005', 5, 'Rasa konsisten, sudah beberapa kali pesan.'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c006', 4, 'Pengemasan rapi dan masih hangat.'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c006', 5, null),
    ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-00000000c007', 5, 'Rasanya enak, pasti pesan lagi.'),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c007', 4, 'Porsinya pas dan harganya terjangkau.'),
    ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-00000000c008', 5, 'Rasa konsisten, sudah beberapa kali pesan.'),
    ('00000000-0000-4000-8000-0000000000e4', '00000000-0000-4000-8000-00000000c010', 4, null),
    ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-00000000c011', 5, 'Pengemasan rapi dan masih hangat.');
end
$seed$;
