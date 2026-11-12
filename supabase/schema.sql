-- =====================================================================
-- SaudaGrow — schema.sql (TINGKAT A; B3 rating dan B2 komentar ada di bagian akhir berkas)
-- Jalankan di Supabase Dashboard → SQL Editor (boleh dijalankan ulang).
-- Isi: profil & peran, UMKM, produk, link pesan, video, like, simpan,
--      pencatatan klik Pesan, RLS, bucket Storage.
-- Belum termasuk (Tingkat B/C): follow, share, watch time.
-- =====================================================================

-- ---------- Tipe ----------
do $$ begin
  create type public.user_role as enum ('user', 'umkm', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.umkm_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_platform as enum ('gofood', 'grabfood', 'shopeefood', 'whatsapp', 'other');
exception when duplicate_object then null; end $$;

-- ---------- Tabel ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'user',
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.umkm (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade, -- 1 akun = 1 UMKM
  owner_name text not null,
  name text not null,
  contact text not null,               -- email / nomor HP
  address text not null,
  city text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  logo_url text not null,
  legal_id text,                       -- opsional
  status public.umkm_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  umkm_id uuid not null references public.umkm(id) on delete cascade,
  name text not null,
  description text,
  price integer not null check (price >= 0),
  category text,
  tags text[] not null default '{}',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.order_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  platform public.order_platform not null,
  url text not null
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,          -- path di bucket "videos": {user_id}/{nama-file}
  thumbnail_url text,
  caption text,                        -- opsional; nama/harga/kategori selalu dari produk
  duration_sec integer check (duration_sec is null or (duration_sec > 0 and duration_sec <= 60)),
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.order_clicks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, -- Pesan wajib login
  product_id uuid not null references public.products(id) on delete cascade,
  platform public.order_platform not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_umkm on public.products(umkm_id);
create index if not exists idx_videos_product on public.videos(product_id);
create index if not exists idx_videos_created on public.videos(created_at desc);
create index if not exists idx_order_clicks_product on public.order_clicks(product_id);
create index if not exists idx_order_clicks_user on public.order_clicks(user_id);

-- ---------- Fungsi bantu (security definer agar tidak memicu RLS berulang) ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.owns_approved_umkm(p_umkm_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.umkm
    where id = p_umkm_id
      and owner_id = (select auth.uid())
      and status = 'approved'
  );
$$;

create or replace function public.owns_product(p_product_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    join public.umkm u on u.id = p.umkm_id
    where p.id = p_product_id
      and u.owner_id = (select auth.uid())
      and u.status = 'approved'
  );
$$;

create or replace function public.is_approved_umkm_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.umkm
    where owner_id = (select auth.uid())
      and status = 'approved'
  );
$$;

-- ---------- Profil otomatis saat user mendaftar ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Admin mengubah status UMKM (satu-satunya jalan) ----------
create or replace function public.set_umkm_status(p_umkm_id uuid, p_status public.umkm_status)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengubah status UMKM';
  end if;
  update public.umkm set status = p_status where id = p_umkm_id;
end;
$$;

-- Peran profil mengikuti status UMKM (approved -> umkm, selain itu -> user)
create or replace function public.sync_profile_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'approved' then
    update public.profiles set role = 'umkm' where id = new.owner_id and role = 'user';
  elsif old.status = 'approved' then
    update public.profiles set role = 'user' where id = new.owner_id and role = 'umkm';
  end if;
  return new;
end;
$$;

drop trigger if exists on_umkm_status_change on public.umkm;
create trigger on_umkm_status_change
  after update of status on public.umkm
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_profile_role();

-- ---------- Hak kolom (agar user tidak bisa mengubah peran / status sendiri) ----------
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke update on public.umkm from anon, authenticated;
grant update (owner_name, name, contact, address, city, lat, lng, logo_url, legal_id)
  on public.umkm to authenticated;

-- Privasi nomor legalitas: RLS bekerja per BARIS, bukan per kolom, jadi legal_id (NIB/PIRT) pada UMKM approved
-- tadinya terbaca siapa pun lewat API. Hak SELECT dicabut lalu hanya kolom publik yang diberikan kembali.
-- legal_id hanya bisa dibaca lewat get_umkm_legal_ids() di bawah (pemilik: miliknya; admin: semua).
-- Kolom baru di tabel umkm TIDAK otomatis terbaca publik; tambahkan ke grant ini bila memang perlu dibuka.
revoke select on public.umkm from anon, authenticated;
grant select (id, owner_id, owner_name, name, contact, address, city, lat, lng, logo_url, status, created_at)
  on public.umkm to anon, authenticated;

create or replace function public.get_umkm_legal_ids()
returns table (umkm_id uuid, legal_id text)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.legal_id
  from public.umkm u
  where u.legal_id is not null
    and (public.is_admin() or u.owner_id = (select auth.uid()));
$$;
revoke execute on function public.get_umkm_legal_ids() from public, anon;
grant execute on function public.get_umkm_legal_ids() to authenticated;

-- ---------- Statistik publik (hanya angka, tanpa data pengguna) ----------
create or replace view public.video_stats as
select v.id as video_id,
       (select count(*) from public.likes l where l.video_id = v.id) as like_count
from public.videos v;

create or replace view public.product_stats as
select p.id as product_id,
       (select count(*) from public.saves s where s.product_id = p.id) as save_count,
       (select count(*) from public.order_clicks c where c.product_id = p.id) as order_count
from public.products p;

grant select on public.video_stats, public.product_stats to anon, authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles     enable row level security;
alter table public.umkm         enable row level security;
alter table public.products     enable row level security;
alter table public.order_links  enable row level security;
alter table public.videos       enable row level security;
alter table public.likes        enable row level security;
alter table public.saves        enable row level security;
alter table public.order_clicks enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
-- Profil (nama tampilan, peran) hanya terbaca oleh pemiliknya dan admin. Aplikasi hanya membaca profil
-- miliknya sendiri; nama di tempat lain (mis. nama pemilik UMKM) diambil dari tabel umkm.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- umkm
drop policy if exists umkm_select on public.umkm;
create policy umkm_select on public.umkm
  for select to anon, authenticated
  using (status = 'approved' or owner_id = (select auth.uid()) or public.is_admin());

drop policy if exists umkm_insert_own on public.umkm;
create policy umkm_insert_own on public.umkm
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'pending');

drop policy if exists umkm_update_own on public.umkm;
create policy umkm_update_own on public.umkm
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- products
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to anon, authenticated
  using (
    exists (select 1 from public.umkm u where u.id = products.umkm_id and u.status = 'approved')
    or public.is_admin()
  );

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
  for insert to authenticated
  with check (public.owns_approved_umkm(umkm_id));

drop policy if exists products_update on public.products;
create policy products_update on public.products
  for update to authenticated
  using (public.owns_approved_umkm(umkm_id))
  with check (public.owns_approved_umkm(umkm_id));

drop policy if exists products_delete on public.products;
create policy products_delete on public.products
  for delete to authenticated
  using (public.owns_approved_umkm(umkm_id));

-- order_links
drop policy if exists order_links_select on public.order_links;
create policy order_links_select on public.order_links
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = order_links.product_id));

drop policy if exists order_links_insert on public.order_links;
create policy order_links_insert on public.order_links
  for insert to authenticated with check (public.owns_product(product_id));

drop policy if exists order_links_update on public.order_links;
create policy order_links_update on public.order_links
  for update to authenticated
  using (public.owns_product(product_id)) with check (public.owns_product(product_id));

drop policy if exists order_links_delete on public.order_links;
create policy order_links_delete on public.order_links
  for delete to authenticated using (public.owns_product(product_id));

-- videos
drop policy if exists videos_select on public.videos;
create policy videos_select on public.videos
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = videos.product_id));

drop policy if exists videos_insert on public.videos;
create policy videos_insert on public.videos
  for insert to authenticated with check (public.owns_product(product_id));

drop policy if exists videos_update on public.videos;
create policy videos_update on public.videos
  for update to authenticated
  using (public.owns_product(product_id)) with check (public.owns_product(product_id));

drop policy if exists videos_delete on public.videos;
create policy videos_delete on public.videos
  for delete to authenticated using (public.owns_product(product_id));

-- likes (hanya milik sendiri; angka total lewat view video_stats)
drop policy if exists likes_select_own on public.likes;
create policy likes_select_own on public.likes
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- saves (hanya milik sendiri; angka total lewat view product_stats)
drop policy if exists saves_select_own on public.saves;
create policy saves_select_own on public.saves
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists saves_insert_own on public.saves;
create policy saves_insert_own on public.saves
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists saves_delete_own on public.saves;
create policy saves_delete_own on public.saves
  for delete to authenticated using (user_id = (select auth.uid()));

-- order_clicks (catat sendiri; pemilik produk dan admin boleh membaca)
drop policy if exists order_clicks_insert_own on public.order_clicks;
create policy order_clicks_insert_own on public.order_clicks
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists order_clicks_select on public.order_clicks;
create policy order_clicks_select on public.order_clicks
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.owns_product(product_id)
    or public.is_admin()
  );

-- ---------- Storage ----------
-- Konvensi path: {user_id}/{nama-file}. Batas ukuran dan tipe file untuk hemat server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('videos', 'videos', true, 52428800, array['video/mp4', 'video/quicktime']),
  ('images', 'images', true, 5242880,  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_read_public on storage.objects;
create policy storage_read_public on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('videos', 'images'));

-- Folder sendiri wajib. Bucket images terbuka untuk semua user login (logo saat daftar UMKM,
-- status masih pending); bucket videos hanya untuk pemilik UMKM yang sudah approved.
drop policy if exists storage_insert_own_folder on storage.objects;
create policy storage_insert_own_folder on storage.objects
  for insert to authenticated
  with check (
    (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      bucket_id = 'images'
      or (bucket_id = 'videos' and public.is_approved_umkm_owner())
    )
  );

drop policy if exists storage_update_own_folder on storage.objects;
create policy storage_update_own_folder on storage.objects
  for update to authenticated
  using (
    (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      bucket_id = 'images'
      or (bucket_id = 'videos' and public.is_approved_umkm_owner())
    )
  )
  with check (
    (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      bucket_id = 'images'
      or (bucket_id = 'videos' and public.is_approved_umkm_owner())
    )
  );

drop policy if exists storage_delete_own_folder on storage.objects;
create policy storage_delete_own_folder on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('videos', 'images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------- Menjadikan seseorang admin (jalankan manual di SQL Editor) ----------
-- 1) Login sekali di aplikasi agar profil terbentuk.
-- 2) Ganti UUID di bawah dengan id akun Anda (Authentication → Users), lalu jalankan:
--
--   update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000000';

-- =====================================================================
-- TINGKAT B3: rating dan ulasan produk
-- Aman dijalankan ulang. Jalankan di Supabase SQL Editor SETELAH schema.sql.
--
-- Aturan:
--  * Rating 1-5 (+ ulasan teks opsional, maks. 500 karakter), satu per pengguna per produk.
--  * Hanya pengguna yang pernah menekan "Pesan" pada produk itu yang boleh menilai (policy cek order_clicks).
--    Catatan jujur: ini bukan bukti pembelian, hanya bukti pengguna pernah menuju platform pemesanan.
--  * Pemilik UMKM tidak bisa menilai produknya sendiri.
--  * Rating UMKM = agregat rating seluruh produknya (tidak ada rating toko langsung).
--  * Ulasan tampil anonim ("Pembeli"); tabel ratings hanya terbaca pemiliknya dan admin.
--    Publik membaca lewat view agregat/ulasan yang hanya memuat produk aktif milik UMKM approved.
--  * Moderasi: admin dapat menghapus ulasan yang melanggar (delete from public.ratings where ...).
-- =====================================================================

create table if not exists public.ratings (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  review     text check (review is null or char_length(review) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.ratings enable row level security;

create or replace function public.touch_ratings()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ratings_touch on public.ratings;
create trigger ratings_touch before update on public.ratings
  for each row execute function public.touch_ratings();

drop policy if exists ratings_select on public.ratings;
create policy ratings_select on public.ratings
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists ratings_insert on public.ratings;
create policy ratings_insert on public.ratings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not public.owns_product(product_id)
    and exists (
      select 1 from public.order_clicks c
      where c.user_id = (select auth.uid()) and c.product_id = ratings.product_id
    )
  );

drop policy if exists ratings_update on public.ratings;
create policy ratings_update on public.ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists ratings_delete on public.ratings;
create policy ratings_delete on public.ratings
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Hanya kolom rating dan review yang boleh diubah (bukan pemilik/produk).
revoke all on public.ratings from anon, authenticated;
grant select, insert, delete on public.ratings to authenticated;
grant update (rating, review) on public.ratings to authenticated;

-- ---------- View publik (hanya produk aktif milik UMKM approved) ----------
create or replace view public.product_rating as
  select r.product_id,
         round(avg(r.rating)::numeric, 2) as avg_rating,
         count(*)::int as rating_count
  from public.ratings r
  join public.products p on p.id = r.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  group by r.product_id;

create or replace view public.umkm_rating as
  select p.umkm_id,
         round(avg(r.rating)::numeric, 2) as avg_rating,
         count(*)::int as rating_count
  from public.ratings r
  join public.products p on p.id = r.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  group by p.umkm_id;

create or replace view public.product_reviews as
  select r.product_id,
         r.rating,
         r.review,
         r.created_at,
         (r.user_id = (select auth.uid())) as is_mine
  from public.ratings r
  join public.products p on p.id = r.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  where r.review is not null and btrim(r.review) <> '';

grant select on public.product_rating, public.umkm_rating, public.product_reviews to anon, authenticated;

-- =====================================================================
-- TINGKAT B2: komentar produk dan komentar video
-- Aman dijalankan ulang (juga bila versi sebelumnya yang hanya komentar produk sudah dijalankan).
-- Jalankan di Supabase SQL Editor SETELAH schema.sql
-- (isinya juga sudah ada di akhir schema.sql; database baru cukup menjalankan schema.sql).
--
-- Dua percakapan yang berbeda, karena satu produk bisa punya beberapa video:
--  * KOMENTAR PRODUK (video_id kosong): pertanyaan/cerita seputar produknya; tampil di tab Komentar halaman produk.
--  * KOMENTAR VIDEO (video_id terisi): tanggapan atas satu video; tampil di panel komentar pada feed Home.
--
-- Aturan:
--  * Komentar teks 1-500 karakter pada produk aktif milik UMKM approved. Wajib login; hanya atas nama sendiri.
--  * Komentar video hanya untuk video yang memang milik produk tersebut (dicek di policy).
--  * Komentar tidak bisa diedit. Boleh dihapus oleh penulisnya, pemilik UMKM atas produk itu (moderasi), atau admin.
--  * Batas laju: maksimal 5 komentar per menit per pengguna (anti-spam sederhana).
--  * Publik membaca lewat view (isi, waktu, NAMA TAMPILAN penulis, penanda pemilik). Id pengguna tidak ditampilkan.
--    Nama tampilan diisi pengguna saat mendaftar; aplikasi menampilkannya di atas kotak komentar sebelum dikirim.
--    (Ulasan rating tetap anonim; hanya komentar yang memakai nama.)
-- =====================================================================

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  video_id uuid references public.videos(id) on delete cascade,   -- null = komentar produk
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Untuk database yang sudah punya tabel comments dari versi sebelumnya (hanya komentar produk).
alter table public.comments
  add column if not exists video_id uuid references public.videos(id) on delete cascade;

create index if not exists idx_comments_product on public.comments(product_id, created_at desc);
create index if not exists idx_comments_video on public.comments(video_id, created_at desc) where video_id is not null;
create index if not exists idx_comments_user on public.comments(user_id, created_at desc);

alter table public.comments enable row level security;

-- Boleh dikomentari: produk aktif milik UMKM approved; bila video disebut, video itu harus milik produk tersebut.
create or replace function public.can_comment_on(p_product_id uuid, p_video_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.products p
    join public.umkm u on u.id = p.umkm_id
    where p.id = p_product_id and p.is_active and u.status = 'approved'
  )
  and (
    p_video_id is null
    or exists (select 1 from public.videos v where v.id = p_video_id and v.product_id = p_product_id)
  );
$$;

-- Batas laju: maksimal 5 komentar per menit per pengguna.
create or replace function public.limit_comment_rate()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (
    select count(*) from public.comments
    where user_id = new.user_id and created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'Terlalu banyak komentar. Coba lagi sebentar lagi.';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.limit_comment_rate();

-- SELECT juga dibutuhkan agar DELETE ... WHERE/RETURNING bisa menemukan barisnya, jadi pemilik produk
-- (moderasi) dan admin ikut diberi akses baca, selain penulis.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.owns_product(product_id)
    or public.is_admin()
  );

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_comment_on(product_id, video_id));

-- Fungsi versi lama (satu argumen) tidak dipakai lagi; policy di atas sudah memakai versi baru.
drop function if exists public.can_comment_on(uuid);

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or public.owns_product(product_id)
    or public.is_admin()
  );

-- Komentar tidak bisa diedit (tanpa hak UPDATE).
revoke all on public.comments from anon, authenticated;
grant select, insert, delete on public.comments to authenticated;

-- ---------- View publik (hanya produk aktif milik UMKM approved) ----------
-- Komentar PRODUK (video_id kosong).
create or replace view public.product_comments as
  select c.id,
         c.product_id,
         c.body,
         c.created_at,
         coalesce(nullif(btrim(pr.display_name), ''), 'Pengguna') as author_name,
         (c.user_id = u.owner_id) as is_owner,
         (c.user_id = (select auth.uid())) as is_mine
  from public.comments c
  join public.profiles pr on pr.id = c.user_id
  join public.products p on p.id = c.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  where c.video_id is null;

create or replace view public.product_comment_count as
  select c.product_id,
         count(*)::int as comment_count
  from public.comments c
  join public.products p on p.id = c.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  where c.video_id is null
  group by c.product_id;

-- Komentar VIDEO (video_id terisi).
create or replace view public.video_comments as
  select c.id,
         c.video_id,
         c.product_id,
         c.body,
         c.created_at,
         coalesce(nullif(btrim(pr.display_name), ''), 'Pengguna') as author_name,
         (c.user_id = u.owner_id) as is_owner,
         (c.user_id = (select auth.uid())) as is_mine
  from public.comments c
  join public.profiles pr on pr.id = c.user_id
  join public.products p on p.id = c.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  where c.video_id is not null;

create or replace view public.video_comment_count as
  select c.video_id,
         count(*)::int as comment_count
  from public.comments c
  join public.products p on p.id = c.product_id and p.is_active
  join public.umkm u on u.id = p.umkm_id and u.status = 'approved'
  where c.video_id is not null
  group by c.video_id;

grant select on public.product_comments, public.product_comment_count,
                public.video_comments, public.video_comment_count to anon, authenticated;
