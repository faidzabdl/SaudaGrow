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
