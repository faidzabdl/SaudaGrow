import { supabase } from '../lib/supabase';
import { COMMENT_MAX_CHARS } from '../config';
import type { ProductComment } from '../types';

// Komentar (B2) punya dua percakapan terpisah karena satu produk bisa punya beberapa video:
//  - komentar PRODUK: tanpa videoId, dibaca dari view product_comments (tab Komentar di halaman produk);
//  - komentar VIDEO: dengan videoId, dibaca dari view video_comments (panel komentar di feed Home).
// Pembacaan publik lewat view (agar nama penulis bisa tampil tanpa membuka tabel profiles); penulisan lewat tabel
// comments dan dijaga RLS (lihat supabase/b2_comments.sql).
export interface CommentTarget {
  productId: string;
  videoId?: string; // kosong = komentar produk
}

const PAGE_SIZE = 50;
const COLUMNS = 'id, product_id, body, created_at, author_name, is_owner, is_mine';

export async function fetchComments(target: CommentTarget): Promise<{ data: ProductComment[]; error: string | null }> {
  const query = target.videoId
    ? supabase.from('video_comments').select(COLUMNS).eq('video_id', target.videoId)
    : supabase.from('product_comments').select(COLUMNS).eq('product_id', target.productId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(PAGE_SIZE);
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ProductComment[], error: null };
}

export async function addComment(userId: string, target: CommentTarget, body: string): Promise<{ error: string | null }> {
  const text = body.trim();
  if (!text) return { error: 'Komentar tidak boleh kosong.' };
  if (text.length > COMMENT_MAX_CHARS) return { error: `Komentar maksimal ${COMMENT_MAX_CHARS} karakter.` };
  const { error } = await supabase.from('comments').insert({
    user_id: userId,
    product_id: target.productId,
    video_id: target.videoId ?? null,
    body: text,
  });
  return { error: error ? error.message : null };
}

// RLS yang menentukan siapa boleh menghapus (penulis, pemilik produk, admin). Nol baris terhapus = ditolak.
export async function deleteComment(commentId: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.from('comments').delete().eq('id', commentId).select('id');
  if (error) return { error: error.message };
  if (!Array.isArray(data) || data.length === 0) return { error: 'Komentar ini tidak bisa dihapus.' };
  return { error: null };
}
