import { supabase } from '../lib/supabase';
import type { OrderPlatform } from '../types';

export async function fetchMyEngagement(
  userId: string
): Promise<{ likedVideoIds: string[]; savedProductIds: string[] }> {
  const [likes, saves] = await Promise.all([
    supabase.from('likes').select('video_id').eq('user_id', userId),
    supabase.from('saves').select('product_id').eq('user_id', userId),
  ]);
  return {
    likedVideoIds: ((likes.data ?? []) as { video_id: string }[]).map(r => r.video_id),
    savedProductIds: ((saves.data ?? []) as { product_id: string }[]).map(r => r.product_id),
  };
}

// Duplikat (23) dianggap berhasil: user sudah menyukai/menyimpan.
export async function setLike(userId: string, videoId: string, on: boolean): Promise<{ error: string | null }> {
  const res = on
    ? await supabase.from('likes').insert({ user_id: userId, video_id: videoId })
    : await supabase.from('likes').delete().eq('user_id', userId).eq('video_id', videoId);
  if (res.error && res.error.code !== '23505') return { error: res.error.message };
  return { error: null };
}

export async function setSave(userId: string, productId: string, on: boolean): Promise<{ error: string | null }> {
  const res = on
    ? await supabase.from('saves').insert({ user_id: userId, product_id: productId })
    : await supabase.from('saves').delete().eq('user_id', userId).eq('product_id', productId);
  if (res.error && res.error.code !== '23505') return { error: res.error.message };
  return { error: null };
}

// Dasar statistik "klik Pesan" untuk dashboard UMKM. Gagal mencatat tidak boleh menghalangi pesanan.
export async function logOrderClick(
  userId: string,
  productId: string,
  platform: OrderPlatform
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('order_clicks').insert({ user_id: userId, product_id: productId, platform });
  return { error: error ? error.message : null };
}
