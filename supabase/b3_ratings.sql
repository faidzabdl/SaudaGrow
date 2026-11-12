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
