import { supabase } from '../lib/supabase';
import type { Umkm, UmkmInput, UmkmStatus } from '../types';

export async function fetchMyUmkm(userId: string): Promise<Umkm | null> {
  const { data, error } = await supabase
    .from('umkm')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) return null;
  return (data as Umkm | null) ?? null;
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
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as Umkm[], error: null };
}

// Satu-satunya jalan mengubah status: fungsi set_umkm_status (diperiksa is_admin() di database).
export async function setUmkmStatus(umkmId: string, status: UmkmStatus): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_umkm_status', { p_umkm_id: umkmId, p_status: status });
  return { error: error ? error.message : null };
}
