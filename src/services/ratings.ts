import { supabase } from '../lib/supabase';
import type { MyRating, Review } from '../types';

interface ReviewRow { rating: number; review: string; created_at: string; is_mine: boolean }

// Ulasan publik (anonim); hanya yang berisi teks, terbaru dulu.
export async function fetchReviews(productId: string): Promise<Review[]> {
  const { data } = await supabase
    .from('product_reviews')
    .select('rating, review, created_at, is_mine')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20);
  return ((data ?? []) as ReviewRow[]).map(r => ({ ...r, rating: Number(r.rating) }));
}

export async function fetchMyRating(userId: string, productId: string): Promise<MyRating | null> {
  const { data } = await supabase
    .from('ratings')
    .select('rating, review')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();
  if (!data) return null;
  const d = data as { rating: number; review: string | null };
  return { rating: Number(d.rating), review: d.review };
}

// Syarat memberi rating: pengguna pernah menekan Pesan pada produk ini (dicek lagi oleh policy di database).
export async function hasOrdered(userId: string, productId: string): Promise<boolean> {
  const { count } = await supabase
    .from('order_clicks')
    .select('product_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('product_id', productId);
  return (count ?? 0) > 0;
}

// Tanpa upsert: upsert juga mengubah kolom kunci, sedangkan pengguna hanya boleh mengubah rating dan review.
export async function saveRating(
  userId: string,
  productId: string,
  rating: number,
  review: string,
  exists: boolean
): Promise<{ error: string | null }> {
  const text = review.trim() ? review.trim().slice(0, 500) : null;
  const res = exists
    ? await supabase.from('ratings').update({ rating, review: text }).eq('user_id', userId).eq('product_id', productId)
    : await supabase.from('ratings').insert({ user_id: userId, product_id: productId, rating, review: text });
  if (!res.error) return { error: null };
  if (res.error.code === '42501') {
    return { error: 'Rating hanya bisa diberikan setelah kamu menekan Pesan pada produk ini.' };
  }
  return { error: res.error.message };
}

export async function deleteMyRating(userId: string, productId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('ratings').delete().eq('user_id', userId).eq('product_id', productId);
  return { error: error ? error.message : null };
}
