import { supabase } from '../lib/supabase';
import type { Umkm, UmkmInput, UmkmStatus } from '../types';

// Kolom yang boleh dibaca langsung dari tabel umkm. Harus sama dengan grant select di supabase/schema.sql:
// legal_id TIDAK termasuk (hak SELECT-nya dicabut); nilainya dibaca lewat fungsi get_umkm_legal_ids().
const UMKM_COLUMNS =
  'id,owner_id,owner_name,name,contact,address,city,lat,lng,logo_url,status,created_at';

type UmkmRow = Omit<Umkm, 'legal_id'>;

// Pemilik hanya mendapat miliknya; admin mendapat semua. Gagal -> kosong (legal_id tampil null).
async function fetchLegalIds(): Promise<Map<string, string>> {
  const { data } = await supabase.rpc('get_umkm_legal_ids');
  const map = new Map<string, string>();
  ((data ?? []) as { umkm_id: string; legal_id: string }[]).forEach(r => map.set(r.umkm_id, r.legal_id));
  return map;
}

export async function fetchMyUmkm(userId: string): Promise<Umkm | null> {
  const { data, error } = await supabase
    .from('umkm')
    .select(UMKM_COLUMNS)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as UmkmRow;
  const legal = await fetchLegalIds();
  return { ...row, legal_id: legal.get(row.id) ?? null };
}

export async function registerUmkm(userId: string, input: UmkmInput): Promise<{ error: string | null }> {
  // RLS mewajibkan owner_id = user login dan status = 'pending'.
  const { error } = await supabase.from('umkm').insert({ ...input, owner_id: userId, status: 'pending' });
  if (!error) return { error: null };
  if (error.code === '23505') return { error: 'Akun ini sudah pernah mendaftarkan UMKM.' };
  return { error: error.message };
}

// Hanya admin yang melihat seluruh UMKM (policy umkm_select).
export async function fetchAllUmkm(): Promise<{ data: Umkm[]; error: string | null }> {
  const { data, error } = await supabase
    .from('umkm')
    .select(UMKM_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  const legal = await fetchLegalIds();
  const rows = ((data ?? []) as unknown as UmkmRow[]).map(r => ({ ...r, legal_id: legal.get(r.id) ?? null }));
  return { data: rows, error: null };
}

// Satu-satunya jalan mengubah status: fungsi set_umkm_status (diperiksa is_admin() di database).
export async function setUmkmStatus(umkmId: string, status: UmkmStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_umkm_status', { p_umkm_id: umkmId, p_status: status });
  return { error: error ? error.message : null };
}
