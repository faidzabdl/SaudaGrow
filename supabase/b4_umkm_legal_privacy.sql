-- =====================================================================
-- B4 (keamanan): tutup kebocoran nomor legalitas UMKM (legal_id)
-- Untuk database yang SUDAH menjalankan schema.sql versi lama. Aman dijalankan ulang.
-- Database baru tidak perlu file ini: isinya sudah ada di schema.sql (bagian "Hak kolom").
-- Jalankan di Supabase SQL Editor.
--
-- Masalah: policy umkm_select membuka SEMUA kolom baris UMKM approved ke anon, sehingga
--   GET /rest/v1/umkm?select=legal_id dapat dibaca siapa pun yang memegang kunci publik.
-- Perbaikan: cabut SELECT tabel, beri kembali hanya kolom publik; legal_id dibaca lewat fungsi
--   get_umkm_legal_ids() (pemilik: miliknya sendiri, admin: semua).
-- =====================================================================

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

-- ---------- Cara menguji (SQL Editor, peran diganti lewat dropdown "Role") ----------
--   * Role anon:           select legal_id from public.umkm;          -> ERROR permission denied for column legal_id
--   * Role anon:           select id, name from public.umkm;          -> berhasil (hanya UMKM approved)
--   * Role authenticated (akun biasa): select * from public.get_umkm_legal_ids();  -> kosong / hanya miliknya
--   * Role authenticated (akun admin): select * from public.get_umkm_legal_ids();  -> semua yang terisi
-- Dari aplikasi: layar Admin tetap menampilkan "Legalitas: ..." dan pendaftaran UMKM tetap berjalan.
