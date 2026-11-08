import { supabase } from '../lib/supabase';
import type { SmartFilter, SortMode } from '../types';

const TIMEOUT_MS = 10000;
const URUT: Exclude<SortMode, 'default'>[] = ['termurah', 'terdekat', 'terpopuler', 'terbaru'];

// Validasi sekali lagi di sisi aplikasi: jangan percaya bentuk data dari jaringan begitu saja.
function parseFilter(raw: unknown): SmartFilter | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return {
    kategori: typeof r.kategori === 'string' && r.kategori ? r.kategori : null,
    tag: Array.isArray(r.tag) ? r.tag.filter((t): t is string => typeof t === 'string').slice(0, 5) : [],
    harga_maks: typeof r.harga_maks === 'number' && r.harga_maks > 0 ? r.harga_maks : null,
    urut: URUT.includes(r.urut as Exclude<SortMode, 'default'>) ? (r.urut as Exclude<SortMode, 'default'>) : null,
    gunakan_lokasi: r.gunakan_lokasi === true,
    kata_kunci: typeof r.kata_kunci === 'string' && r.kata_kunci ? r.kata_kunci : null,
  };
}

// Hanya teks pencarian serta daftar kategori/tag katalog yang dikirim; tanpa id pengguna atau lokasi.
// Gagal/lambat -> filter null; pemanggil memakai pencarian kata kunci biasa.
export async function askSmartSearch(
  query: string,
  vocab: { categories: string[]; tags: string[] }
): Promise<{ filter: SmartFilter | null; error: string | null }> {
  try {
    const call = supabase.functions.invoke('smart-search', {
      body: { query: query.trim().slice(0, 200), categories: vocab.categories, tags: vocab.tags },
    });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS));
    const { data, error } = await Promise.race([call, timeout]);
    if (error) return { filter: null, error: error.message };
    const d = data as { ok?: boolean; filter?: unknown } | null;
    if (!d || d.ok !== true) return { filter: null, error: 'ai_unavailable' };
    const filter = parseFilter(d.filter);
    return filter ? { filter, error: null } : { filter: null, error: 'invalid_response' };
  } catch (e) {
    return { filter: null, error: e instanceof Error ? e.message : 'ai_unavailable' };
  }
}
