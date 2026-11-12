import { supabase } from '../lib/supabase';
import { STORAGE_BUCKETS } from '../config';
import type { CatalogProduct, FeedItem, OrderLink, Product, PublicUmkm, Video } from '../types';

// Kolom UMKM yang boleh tampil ke publik (legal_id dan owner_id sengaja tidak diambil).
const UMKM_COLUMNS = 'id,name,owner_name,contact,address,city,lat,lng,logo_url,status,created_at';
const PRODUCT_SELECT = `*, umkm!inner(${UMKM_COLUMNS}), order_links(platform,url)`;

type ProductRow = Product & { umkm: PublicUmkm; order_links: OrderLink[] };
type VideoRow = Video & { products: ProductRow };
interface ProductStat { product_id: string; save_count: number | string; order_count: number | string }
interface VideoStat { video_id: string; like_count: number | string }
interface ProductRatingRow { product_id: string; avg_rating: number | string; rating_count: number | string }
interface UmkmRatingRow { umkm_id: string; avg_rating: number | string; rating_count: number | string }
interface CommentCountRow { product_id: string; comment_count: number | string }
interface VideoCommentCountRow { video_id: string; comment_count: number | string }

async function withProductStats(rows: ProductRow[]): Promise<CatalogProduct[]> {
  if (rows.length === 0) return [];
  const umkmIds = Array.from(new Set(rows.map(r => r.umkm.id)));
  // Rating (B3) dibaca dari view; bila view belum dibuat, hasilnya kosong dan produk tampil tanpa rating.
  const [ps, pr, ur, cc] = await Promise.all([
    supabase.from('product_stats').select('product_id, save_count, order_count').in('product_id', rows.map(r => r.id)),
    supabase.from('product_rating').select('product_id, avg_rating, rating_count').in('product_id', rows.map(r => r.id)),
    supabase.from('umkm_rating').select('umkm_id, avg_rating, rating_count').in('umkm_id', umkmIds),
    // Komentar (B2): bila view belum dibuat, hasilnya kosong dan jumlah komentar tampil 0.
    supabase.from('product_comment_count').select('product_id, comment_count').in('product_id', rows.map(r => r.id)),
  ]);
  const stats = new Map<string, { save: number; order: number }>();
  ((ps.data ?? []) as ProductStat[]).forEach(s =>
    stats.set(s.product_id, { save: Number(s.save_count), order: Number(s.order_count) })
  );
  const pRating = new Map<string, { avg: number; n: number }>();
  ((pr.data ?? []) as ProductRatingRow[]).forEach(s =>
    pRating.set(s.product_id, { avg: Number(s.avg_rating), n: Number(s.rating_count) })
  );
  const uRating = new Map<string, { avg: number; n: number }>();
  ((ur.data ?? []) as UmkmRatingRow[]).forEach(s =>
    uRating.set(s.umkm_id, { avg: Number(s.avg_rating), n: Number(s.rating_count) })
  );
  const cCount = new Map<string, number>();
  ((cc.data ?? []) as CommentCountRow[]).forEach(s => cCount.set(s.product_id, Number(s.comment_count)));
  return rows.map(r => ({
    ...r,
    order_links: r.order_links ?? [],
    save_count: stats.get(r.id)?.save ?? 0,
    order_count: stats.get(r.id)?.order ?? 0,
    avg_rating: pRating.get(r.id)?.avg ?? null,
    rating_count: pRating.get(r.id)?.n ?? 0,
    umkm_avg_rating: uRating.get(r.umkm.id)?.avg ?? null,
    umkm_rating_count: uRating.get(r.umkm.id)?.n ?? 0,
    comment_count: cCount.get(r.id) ?? 0,
  }));
}

export function videoPublicUrl(storagePath: string): string {
  return supabase.storage.from(STORAGE_BUCKETS.videos).getPublicUrl(storagePath).data.publicUrl;
}

// Semua produk aktif milik UMKM approved (RLS menyaring yang belum approved).
export async function fetchProducts(): Promise<{ data: CatalogProduct[]; error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return { data: [], error: error.message };
  return { data: await withProductStats((data ?? []) as unknown as ProductRow[]), error: null };
}

// Feed = video terbaru dari produk aktif milik UMKM approved.
export async function fetchFeed(): Promise<{ data: FeedItem[]; error: string | null }> {
  const { data, error } = await supabase
    .from('videos')
    .select(`*, products!inner(${PRODUCT_SELECT})`)
    .eq('products.is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []) as unknown as VideoRow[];
  if (rows.length === 0) return { data: [], error: null };

  const uniqueProducts = new Map<string, ProductRow>();
  rows.forEach(r => uniqueProducts.set(r.products.id, r.products));
  const products = await withProductStats([...uniqueProducts.values()]);
  const productById = new Map(products.map(p => [p.id, p]));

  const { data: likeData } = await supabase
    .from('video_stats')
    .select('video_id, like_count')
    .in('video_id', rows.map(r => r.id));
  const likes = new Map<string, number>();
  ((likeData ?? []) as VideoStat[]).forEach(s => likes.set(s.video_id, Number(s.like_count)));

  // Komentar video (B2): bila view belum dibuat, hasilnya kosong dan jumlahnya tampil 0.
  const { data: vcData } = await supabase
    .from('video_comment_count')
    .select('video_id, comment_count')
    .in('video_id', rows.map(r => r.id));
  const videoComments = new Map<string, number>();
  ((vcData ?? []) as VideoCommentCountRow[]).forEach(s => videoComments.set(s.video_id, Number(s.comment_count)));

  const items: FeedItem[] = [];
  rows.forEach(r => {
    const product = productById.get(r.products.id);
    if (!product) return;
    const video: Video = {
      id: r.id,
      product_id: r.product_id,
      storage_path: r.storage_path,
      thumbnail_url: r.thumbnail_url,
      caption: r.caption,
      duration_sec: r.duration_sec,
      created_at: r.created_at,
    };
    items.push({
      video,
      videoUrl: videoPublicUrl(video.storage_path),
      product,
      like_count: likes.get(video.id) ?? 0,
      comment_count: videoComments.get(video.id) ?? 0,
    });
  });
  return { data: items, error: null };
}
