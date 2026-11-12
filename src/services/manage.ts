import { supabase } from '../lib/supabase';
import { STORAGE_BUCKETS } from '../config';
import type {
  DashboardStats, ManagedProduct, OrderLink, OrderPlatform, Product, ProductInput, Video,
} from '../types';

export const PLATFORMS: { key: OrderPlatform; label: string; placeholder: string }[] = [
  { key: 'gofood', label: 'GoFood', placeholder: 'https://gofood.link/...' },
  { key: 'grabfood', label: 'GrabFood', placeholder: 'https://food.grab.com/...' },
  { key: 'shopeefood', label: 'ShopeeFood', placeholder: 'https://shopee.co.id/...' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '08123456789 atau https://wa.me/...' },
];

export function emptyStats(): DashboardStats {
  return {
    products: 0, videos: 0, likes: 0, saves: 0, orders: 0,
    byPlatform: { gofood: 0, grabfood: 0, shopeefood: 0, whatsapp: 0 },
  };
}

// Merapikan isian link. Untuk WhatsApp, nomor HP biasa (0812...) diubah menjadi https://wa.me/62812...
export function normalizeLink(platform: OrderPlatform, raw: string): { url: string | null; error: string | null } {
  const v = raw.trim();
  if (!v) return { url: null, error: null };
  if (platform === 'whatsapp' && /^[+\d][\d\s-]*$/.test(v)) {
    let digits = v.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = '62' + digits.slice(1);
    return { url: `https://wa.me/${digits}`, error: null };
  }
  if (!/^https?:\/\/\S+\.\S+/i.test(v)) {
    const label = PLATFORMS.find(p => p.key === platform)?.label ?? platform;
    return { url: null, error: `Link ${label} harus diawali https:// (atau isi nomor HP untuk WhatsApp).` };
  }
  return { url: v, error: null };
}

interface ProductRow extends Product { order_links: OrderLink[] | null; videos: Video[] | null }
interface ProductStat { product_id: string; save_count: number | string; order_count: number | string }
interface VideoStat { video_id: string; like_count: number | string }
interface ClickRow { product_id: string; platform: OrderPlatform }
interface RatingRow { product_id: string; avg_rating: number | string; rating_count: number | string }

// Semua produk milik satu UMKM (termasuk yang nonaktif), beserta statistiknya.
export async function fetchMyProducts(
  umkmId: string
): Promise<{ data: ManagedProduct[]; stats: DashboardStats; error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .select('*, order_links(platform,url), videos(*)')
    .eq('umkm_id', umkmId)
    .order('created_at', { ascending: false });
  if (error) return { data: [], stats: emptyStats(), error: error.message };

  const rows = (data ?? []) as unknown as ProductRow[];
  if (rows.length === 0) return { data: [], stats: emptyStats(), error: null };

  const productIds = rows.map(r => r.id);
  const videoIds = rows.flatMap(r => (r.videos ?? []).map(v => v.id));

  const [ps, vs, oc, rt] = await Promise.all([
    supabase.from('product_stats').select('product_id, save_count, order_count').in('product_id', productIds),
    videoIds.length > 0
      ? supabase.from('video_stats').select('video_id, like_count').in('video_id', videoIds)
      : Promise.resolve({ data: [] as VideoStat[] }),
    supabase.from('order_clicks').select('product_id, platform').in('product_id', productIds),
    supabase.from('product_rating').select('product_id, avg_rating, rating_count').in('product_id', productIds),
  ]);
  const ratings = new Map<string, { avg: number; n: number }>();
  ((rt.data ?? []) as RatingRow[]).forEach(s => ratings.set(s.product_id, { avg: Number(s.avg_rating), n: Number(s.rating_count) }));

  const pStats = new Map<string, { save: number; order: number }>();
  ((ps.data ?? []) as ProductStat[]).forEach(s =>
    pStats.set(s.product_id, { save: Number(s.save_count), order: Number(s.order_count) })
  );
  const vStats = new Map<string, number>();
  ((vs.data ?? []) as VideoStat[]).forEach(s => vStats.set(s.video_id, Number(s.like_count)));

  const stats = emptyStats();
  ((oc.data ?? []) as ClickRow[]).forEach(c => {
    if (c.platform in stats.byPlatform) stats.byPlatform[c.platform] += 1;
  });

  const products: ManagedProduct[] = rows.map(r => ({
    ...r,
    order_links: r.order_links ?? [],
    videos: (r.videos ?? [])
      .map(v => ({ ...v, like_count: vStats.get(v.id) ?? 0 }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    save_count: pStats.get(r.id)?.save ?? 0,
    order_count: pStats.get(r.id)?.order ?? 0,
    avg_rating: ratings.get(r.id)?.avg ?? null,
    rating_count: ratings.get(r.id)?.n ?? 0,
  }));

  stats.products = products.length;
  products.forEach(p => {
    stats.videos += p.videos.length;
    stats.saves += p.save_count;
    stats.orders += p.order_count;
    p.videos.forEach(v => (stats.likes += v.like_count));
  });
  return { data: products, stats, error: null };
}

// Link pesan diganti seluruhnya (hapus lalu isi ulang) agar sama dengan isi formulir.
async function saveOrderLinks(productId: string, links: ProductInput['links']): Promise<string | null> {
  const del = await supabase.from('order_links').delete().eq('product_id', productId);
  if (del.error) return del.error.message;
  const rows = PLATFORMS.filter(p => links[p.key]).map(p => ({
    product_id: productId,
    platform: p.key,
    url: links[p.key] as string,
  }));
  if (rows.length === 0) return null;
  const ins = await supabase.from('order_links').insert(rows);
  return ins.error ? ins.error.message : null;
}

function productColumns(input: ProductInput) {
  return {
    name: input.name,
    description: input.description || null,
    price: input.price,
    category: input.category || null,
    tags: input.tags,
    image_url: input.image_url,
    is_active: input.is_active,
  };
}

export async function createProduct(umkmId: string, input: ProductInput): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('products')
    .insert({ umkm_id: umkmId, ...productColumns(input) })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Gagal menyimpan produk.' };
  return { error: await saveOrderLinks((data as { id: string }).id, input.links) };
}

export async function updateProduct(productId: string, input: ProductInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').update(productColumns(input)).eq('id', productId);
  if (error) return { error: error.message };
  return { error: await saveOrderLinks(productId, input.links) };
}

export async function setProductActive(productId: string, active: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').update({ is_active: active }).eq('id', productId);
  return { error: error ? error.message : null };
}

async function removeVideoFiles(paths: string[]): Promise<void> {
  if (paths.length > 0) await supabase.storage.from(STORAGE_BUCKETS.videos).remove(paths); // best effort
}

export async function deleteProduct(product: ManagedProduct): Promise<{ error: string | null }> {
  const { error } = await supabase.from('products').delete().eq('id', product.id); // video & link ikut terhapus (cascade)
  if (error) return { error: error.message };
  await removeVideoFiles(product.videos.map(v => v.storage_path));
  return { error: null };
}

export async function addVideoRow(
  productId: string,
  storagePath: string,
  durationSec: number | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('videos')
    .insert({ product_id: productId, storage_path: storagePath, duration_sec: durationSec });
  return { error: error ? error.message : null };
}

export async function deleteVideo(video: Video): Promise<{ error: string | null }> {
  const { error } = await supabase.from('videos').delete().eq('id', video.id);
  if (error) return { error: error.message };
  await removeVideoFiles([video.storage_path]);
  return { error: null };
}

export { removeVideoFiles };
